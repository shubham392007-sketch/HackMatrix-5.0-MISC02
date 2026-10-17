import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.web_crawl import WebCrawlRecord
from backend.app.models.evidence import EvidenceItem, EvidenceRelationship
from backend.app.models.job import IngestionJob
from backend.app.extraction.website_extractor import website_extractor
from backend.app.extraction.ssrf_validator import SSRFSecurityError, validate_url_safe
from backend.app.extraction.engine import extraction_engine
from backend.app.core.logging import get_logger

logger = get_logger("api.portfolio")
router = APIRouter(prefix="/portfolio", tags=["Portfolio & Web Ingestion"])


class WebPreviewRequest(BaseModel):
    url: str = Field(..., min_length=7, description="Website or portfolio URL to preview")
    title: Optional[str] = Field(None, description="Optional custom title for the evidence")
    related_project: Optional[str] = Field(None, description="Related project name")
    claimed_contribution: Optional[str] = Field(None, description="Specific claimed contribution")
    is_collaborative: Optional[bool] = Field(False, description="Whether project was collaborative")


class WebCrawlRequest(BaseModel):
    url: str = Field(..., min_length=7, description="Public website or portfolio URL to ingest")
    title: Optional[str] = Field(None, description="Optional custom title for the portfolio evidence")
    related_project: Optional[str] = Field(None, description="Related project name")
    claimed_contribution: Optional[str] = Field(None, description="Specific claimed contribution")
    is_collaborative: Optional[bool] = Field(False, description="Whether project was collaborative")
    max_depth: Optional[int] = Field(2, ge=0, le=3, description="Maximum crawl depth")
    max_pages: Optional[int] = Field(10, ge=1, le=20, description="Maximum pages to discover and ingest")


@router.post("/preview")
async def preview_portfolio_url(
    payload: WebPreviewRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Validates a URL against SSRF constraints and returns a preliminary preview:
    resolved URL, accessible page title, host, HTTP status, and robots.txt crawl clearance.
    """
    try:
        preview_data = await website_extractor.preview_url(payload.url)
    except SSRFSecurityError as e:
        logger.warning(f"Blocked SSRF attempt for preview {payload.url} from user {user.id}: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security constraint: {e.message}",
        )
    except Exception as e:
        logger.error(f"Failed to preview URL {payload.url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to preview website: {str(e)}",
        )

    return {
        "status": "ready",
        "submitted_url": payload.url,
        "final_url": preview_data["final_url"],
        "hostname": preview_data["hostname"],
        "page_title": preview_data["page_title"] or payload.title or preview_data["hostname"],
        "http_status": preview_data["status_code"],
        "content_type": preview_data["content_type"],
        "is_accessible": preview_data["is_accessible"],
        "crawl_permitted": preview_data["crawl_permitted"],
        "user_title": payload.title,
        "related_project": payload.related_project,
        "claimed_contribution": payload.claimed_contribution,
        "is_collaborative": payload.is_collaborative,
    }


@router.post("/scrape")
async def scrape_portfolio_url(
    payload: WebCrawlRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Triggers comprehensive, controlled multi-page crawling and skill extraction
    for a public project or portfolio website.
    Enforces strict SSRF protections, internal link discovery, document extraction,
    PostgreSQL persistence, and ChromaDB vector indexing.
    """
    try:
        # Pre-validate SSRF on seed URL
        validate_url_safe(payload.url)
    except SSRFSecurityError as e:
        logger.warning(f"Blocked SSRF attempt to {payload.url} from user {user.id}: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security violation: {e.message}",
        )

    now = datetime.now(timezone.utc)
    job_id = uuid.uuid4()

    job = IngestionJob(
        id=job_id,
        owner_user_id=user.id,
        job_type="web_crawl",
        status="IN_PROGRESS",
        current_stage="CRAWLING",
        progress_percentage=20,
        idempotency_key=f"crawl-{uuid.uuid4().hex[:12]}",
        started_at=now,
    )
    db.add(job)
    db.commit()

    try:
        # 1. Execute Multi-Page Controlled Crawl
        crawl_result = await website_extractor.crawl_portfolio(
            url=payload.url,
            title=payload.title,
            max_depth=payload.max_depth or 2,
            max_pages=payload.max_pages or 10,
        )
    except SSRFSecurityError as e:
        job.status = "FAILED"
        job.error_code = "SSRF_VIOLATION"
        job.error_message = e.message
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security violation during crawl: {e.message}",
        )
    except Exception as e:
        job.status = "FAILED"
        job.error_code = "CRAWL_FAILED"
        job.error_message = str(e)
        db.commit()
        logger.error(f"Website multi-page crawl failed for {payload.url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to crawl website: {str(e)}",
        )

    crawled_pages = crawl_result.get("crawled_pages", [])
    if not crawled_pages:
        job.status = "FAILED"
        job.error_code = "EMPTY_CRAWL"
        job.error_message = "No accessible pages could be extracted from the provided URL."
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No accessible content found at the provided URL.",
        )

    job.current_stage = "EXTRACTING_TEXT"
    job.progress_percentage = 50
    db.commit()

    root_page = crawl_result.get("root_page") or crawled_pages[0]
    root_title = payload.title or root_page.get("page_title") or "Portfolio Evidence"
    root_crawl_id = uuid.uuid4()

    # Save WebCrawlRecord for each crawled page
    crawl_records = []
    for idx, page in enumerate(crawled_pages):
        cid = root_crawl_id if idx == 0 else uuid.uuid4()
        record = WebCrawlRecord(
            id=cid,
            owner_user_id=user.id,
            job_id=job.id,
            submitted_url=page.get("submitted_url", payload.url),
            final_url=page.get("final_url", payload.url),
            page_title=page.get("page_title", "Untitled Page"),
            content_hash=page.get("content_hash", ""),
            crawl_depth=page.get("depth", 0),
            http_status=page.get("http_status", 200),
            extraction_status=page.get("extraction_status", "extracted"),
            extracted_headings={"headings": page.get("headings", [])},
            cleaned_content=page.get("cleaned_content", ""),
            discovered_links={"source": page.get("discovery_source", "seed")},
        )
        db.add(record)
        crawl_records.append(record)

    # 2. Create Parent EvidenceItem (Project Bundle)
    parent_evidence_id = uuid.uuid4()
    parent_evidence = EvidenceItem(
        id=parent_evidence_id,
        owner_user_id=user.id,
        source_provider="portfolio",
        source_type="website",
        external_record_id=str(root_crawl_id),
        source_url=root_page.get("final_url", payload.url),
        source_name=payload.url,
        evidence_category="portfolio",
        title=root_title,
        description=f"Public web evidence from {payload.url} ({len(crawled_pages)} pages crawled, {crawl_result.get('total_words', 0)} words)",
        extracted_excerpt=root_page.get("excerpt", "")[:500],
        observed_timestamp=now,
        contributor_identity=user.email,
        attribution_status="contributor" if payload.is_collaborative else "author",
        is_collaborative=bool(payload.is_collaborative),
        project_name=payload.related_project or root_title,
        evidence_strength="medium",
        extraction_confidence=0.88,
        verification_status="unreviewed",
        processing_status="ready_for_review",
        provenance={
            "submitted_url": payload.url,
            "final_url": root_page.get("final_url", payload.url),
            "seed_url": payload.url,
            "is_bundle_root": True,
            "total_pages_crawled": len(crawled_pages),
            "total_words": crawl_result.get("total_words", 0),
            "discovered_documents_count": crawl_result.get("total_documents_found", 0),
            "external_links": crawl_result.get("external_links", [])[:15],
            "claimed_contribution": payload.claimed_contribution,
        },
        normalized_metadata={
            "crawled_pages_summary": [
                {
                    "url": p.get("final_url"),
                    "title": p.get("page_title"),
                    "depth": p.get("depth"),
                    "word_count": p.get("word_count"),
                }
                for p in crawled_pages
            ],
            "claimed_contribution": payload.claimed_contribution,
            "is_collaborative": payload.is_collaborative,
        },
        content_hash=root_page.get("content_hash", ""),
    )
    db.add(parent_evidence)

    # 3. Create Child EvidenceItems for substantive child pages (depth >= 1 with word_count >= 60)
    child_evidence_items = []
    for page in crawled_pages[1:]:
        if page.get("word_count", 0) >= 60:
            child_id = uuid.uuid4()
            child_item = EvidenceItem(
                id=child_id,
                owner_user_id=user.id,
                source_provider="portfolio",
                source_type="web_page",
                external_record_id=page.get("page_id"),
                source_url=page.get("final_url"),
                source_name=page.get("final_url"),
                evidence_category="portfolio",
                title=page.get("page_title") or f"{root_title} - Section",
                description=f"Internal project page from {page.get('final_url')} ({page.get('word_count')} words)",
                extracted_excerpt=page.get("excerpt", "")[:500],
                observed_timestamp=now,
                contributor_identity=user.email,
                attribution_status="contributor" if payload.is_collaborative else "author",
                is_collaborative=bool(payload.is_collaborative),
                project_name=payload.related_project or root_title,
                evidence_strength="medium",
                extraction_confidence=0.85,
                verification_status="unreviewed",
                processing_status="ready_for_review",
                provenance={
                    "parent_evidence_id": str(parent_evidence_id),
                    "parent_seed_url": payload.url,
                    "depth": page.get("depth", 1),
                    "discovery_source": page.get("discovery_source", "internal_link"),
                    "is_bundle_child": True,
                },
                normalized_metadata={
                    "headings": [h.get("text") for h in page.get("headings", [])[:5]],
                    "word_count": page.get("word_count", 0),
                },
                content_hash=page.get("content_hash", ""),
            )
            db.add(child_item)
            child_evidence_items.append(child_item)

            # Link child to parent bundle via EvidenceRelationship
            rel = EvidenceRelationship(
                id=uuid.uuid4(),
                owner_user_id=user.id,
                source_evidence_id=child_id,
                target_evidence_id=parent_evidence_id,
                relationship_type="related_project",
                confidence_score=0.95,
                rationale="Internal project page discovered during portfolio crawl",
                is_reviewed=False,
            )
            db.add(rel)

    # 4. Handle Discovered Documents (PDFs, etc.)
    discovered_docs = crawl_result.get("discovered_documents", [])
    for doc in discovered_docs:
        doc_id = uuid.uuid4()
        doc_item = EvidenceItem(
            id=doc_id,
            owner_user_id=user.id,
            source_provider="portfolio",
            source_type="linked_document",
            external_record_id=doc.get("document_id"),
            source_url=doc.get("url"),
            source_name=doc.get("filename"),
            evidence_category="document",
            title=f"{root_title}: {doc.get('filename')}",
            description=f"Linked document discovered on project site: {doc.get('filename')} ({doc.get('word_count')} words)",
            extracted_excerpt=doc.get("extracted_text", "")[:500],
            observed_timestamp=now,
            contributor_identity=user.email,
            attribution_status="contributor" if payload.is_collaborative else "author",
            is_collaborative=bool(payload.is_collaborative),
            project_name=payload.related_project or root_title,
            evidence_strength="high",
            extraction_confidence=0.90,
            verification_status="unreviewed",
            processing_status="ready_for_review",
            provenance={
                "parent_evidence_id": str(parent_evidence_id),
                "parent_seed_url": payload.url,
                "document_url": doc.get("url"),
                "file_type": doc.get("file_type"),
                "is_discovered_document": True,
            },
            normalized_metadata={
                "page_count": doc.get("page_count", 1),
                "word_count": doc.get("word_count", 0),
            },
            content_hash=doc.get("content_hash", ""),
        )
        db.add(doc_item)

        rel = EvidenceRelationship(
            id=uuid.uuid4(),
            owner_user_id=user.id,
            source_evidence_id=doc_id,
            target_evidence_id=parent_evidence_id,
            relationship_type="related_project",
            confidence_score=0.98,
            rationale="Supporting technical document linked directly from project site",
            is_reviewed=False,
        )
        db.add(rel)

    db.commit()

    # 5. Extract Candidate Skills with AI Engine (Qwen3 8B)
    job.current_stage = "EXTRACTING_SKILLS"
    job.progress_percentage = 75
    db.commit()

    # Compile comprehensive content text for skill extraction
    content_parts = []
    if payload.claimed_contribution:
        content_parts.append(f"Author's Claimed Contribution: {payload.claimed_contribution}")
    if payload.related_project:
        content_parts.append(f"Project Name: {payload.related_project}")

    content_parts.append(f"=== Main Page: {root_page.get('page_title')} ===\n{root_page.get('cleaned_content', '')}")

    for cp in crawled_pages[1:6]:
        if cp.get("cleaned_content"):
            content_parts.append(f"=== Internal Page: {cp.get('page_title')} ===\n{cp.get('cleaned_content')[:1500]}")

    for doc in discovered_docs[:2]:
        if doc.get("extracted_text"):
            content_parts.append(f"=== Supporting Document: {doc.get('filename')} ===\n{doc.get('extracted_text')[:1500]}")

    full_crawl_text = "\n\n".join(content_parts)

    evidence_data = await extraction_engine.process_and_persist_evidence(
        db=db,
        evidence_item=parent_evidence,
        content_text=full_crawl_text,
        source_provider="portfolio",
        category="portfolio",
        user_id=user.id,
    )

    job.status = "COMPLETED"
    job.current_stage = "READY_FOR_REVIEW"
    job.progress_percentage = 100
    job.completed_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "status": "success",
        "crawl_id": str(root_crawl_id),
        "evidence_id": str(parent_evidence.id),
        "job_id": str(job.id),
        "page_title": root_title,
        "total_pages": len(crawled_pages),
        "total_documents": len(discovered_docs),
        "total_words": crawl_result.get("total_words", 0),
        "pages_crawled": [
            {
                "page_id": p.get("page_id"),
                "submitted_url": p.get("submitted_url"),
                "final_url": p.get("final_url"),
                "title": p.get("page_title"),
                "depth": p.get("depth"),
                "word_count": p.get("word_count"),
                "http_status": p.get("http_status"),
                "discovery_source": p.get("discovery_source"),
                "excerpt": p.get("excerpt"),
            }
            for p in crawled_pages
        ],
        "documents_found": [
            {
                "filename": d.get("filename"),
                "url": d.get("url"),
                "word_count": d.get("word_count"),
                "file_type": d.get("file_type"),
            }
            for d in discovered_docs
        ],
        "candidateSkills": evidence_data.get("candidateSkills", []),
        "evidence": evidence_data,
    }


@router.get("/crawls")
def list_crawls(
    limit: int = 50,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists web crawl records for the authenticated user."""
    crawls = db.query(WebCrawlRecord).filter(
        WebCrawlRecord.owner_user_id == user.id,
    ).order_by(WebCrawlRecord.created_at.desc()).limit(limit).all()

    results = []
    for c in crawls:
        results.append({
            "id": str(c.id),
            "submitted_url": c.submitted_url,
            "final_url": c.final_url,
            "page_title": c.page_title,
            "crawl_depth": c.crawl_depth,
            "http_status": c.http_status,
            "extraction_status": c.extraction_status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "content_length": len(c.cleaned_content or ""),
        })

    return {"crawls": results, "total": len(results)}


@router.get("/crawls/{crawl_id}")
def get_crawl_details(
    crawl_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves full crawl record details."""
    try:
        cid = uuid.UUID(crawl_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid crawl ID format")

    crawl = db.query(WebCrawlRecord).filter(
        WebCrawlRecord.id == cid,
        WebCrawlRecord.owner_user_id == user.id,
    ).first()

    if not crawl:
        raise HTTPException(status_code=404, detail="Crawl record not found")

    return {
        "id": str(crawl.id),
        "submitted_url": crawl.submitted_url,
        "final_url": crawl.final_url,
        "page_title": crawl.page_title,
        "crawl_depth": crawl.crawl_depth,
        "http_status": crawl.http_status,
        "extraction_status": crawl.extraction_status,
        "extracted_headings": crawl.extracted_headings,
        "discovered_links": crawl.discovered_links,
        "content_length": len(crawl.cleaned_content or ""),
        "created_at": crawl.created_at.isoformat() if crawl.created_at else None,
    }
