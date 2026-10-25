import io
import uuid
import urllib.parse
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.document import UploadedDocument, DocumentChunk
from backend.app.models.evidence import EvidenceItem
from backend.app.models.readme import RepositoryReadmeSnapshot
from backend.app.models.web_crawl import WebCrawlRecord
from backend.app.models.taxonomy import EvidenceCompetencyMapping, CompetencyTaxonomy
from backend.app.models.audit import ReviewAuditEvent
from backend.app.storage.file_storage import storage_manager
from backend.app.core.logging import get_logger

logger = get_logger("api.vault")
router = APIRouter(prefix="/vault", tags=["Evidence Vault"])


@router.get("/summary")
def get_vault_summary(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Computes genuine user-scoped aggregate metrics for the Evidence Vault.
    Strictly queries authorized database rows—no mock totals or fabricated figures.
    """
    user_id = user.id

    # 1. Uploaded Documents count & storage used
    doc_stats = db.query(
        func.count(UploadedDocument.id),
        func.coalesce(func.sum(UploadedDocument.file_size_bytes), 0)
    ).filter(
        UploadedDocument.owner_user_id == user_id,
        UploadedDocument.is_deleted == False,
    ).first()
    uploaded_docs_count = doc_stats[0] if doc_stats else 0
    storage_used_bytes = int(doc_stats[1]) if doc_stats else 0

    # 2. Web Crawl Snapshots count
    web_snapshots_count = db.query(func.count(WebCrawlRecord.id)).filter(
        WebCrawlRecord.owner_user_id == user_id,
    ).scalar() or 0

    # 3. Repository README Snapshots count
    readme_snapshots_count = db.query(func.count(RepositoryReadmeSnapshot.id)).filter(
        RepositoryReadmeSnapshot.owner_user_id == user_id,
    ).scalar() or 0

    # 4. Connected-source records (Jira issues, GitHub PRs/commits)
    connected_records_count = db.query(func.count(EvidenceItem.id)).filter(
        EvidenceItem.owner_user_id == user_id,
        EvidenceItem.is_deleted == False,
        EvidenceItem.source_provider.in_(["github", "jira"]),
    ).scalar() or 0

    # 5. Total accessible artifacts
    total_artifacts = uploaded_docs_count + web_snapshots_count + readme_snapshots_count

    # 6. Processing issues count (failed or insufficient content)
    doc_issues = db.query(func.count(UploadedDocument.id)).filter(
        UploadedDocument.owner_user_id == user_id,
        UploadedDocument.is_deleted == False,
        UploadedDocument.processing_state.in_(["failed", "insufficient_content"]),
    ).scalar() or 0

    evidence_issues = db.query(func.count(EvidenceItem.id)).filter(
        EvidenceItem.owner_user_id == user_id,
        EvidenceItem.is_deleted == False,
        or_(
            EvidenceItem.processing_status.in_(["failed", "insufficient_content"]),
            EvidenceItem.verification_status == "insufficient_evidence",
        ),
    ).scalar() or 0
    processing_issues_count = doc_issues + evidence_issues

    # 7. Last activity timestamp
    latest_doc = db.query(UploadedDocument.created_at).filter(
        UploadedDocument.owner_user_id == user_id
    ).order_by(UploadedDocument.created_at.desc()).first()

    latest_evidence = db.query(EvidenceItem.created_at).filter(
        EvidenceItem.owner_user_id == user_id
    ).order_by(EvidenceItem.created_at.desc()).first()

    dates = [d[0] for d in [latest_doc, latest_evidence] if d and d[0]]
    last_activity_at = max(dates).isoformat() if dates else None

    return {
        "total_artifacts": total_artifacts,
        "uploaded_documents": uploaded_docs_count,
        "web_snapshots": web_snapshots_count,
        "repository_artifacts": readme_snapshots_count,
        "connected_records": connected_records_count,
        "processing_issues": processing_issues_count,
        "storage_used_bytes": storage_used_bytes,
        "last_activity_at": last_activity_at,
    }


@router.get("/artifacts")
def list_vault_artifacts(
    category: Optional[str] = Query(None, description="Filter category: all, documents, certificates, resumes, web_snapshots, github, jira, issues"),
    search: Optional[str] = Query(None, description="Search query across artifact titles, filenames, and URLs"),
    has_original: Optional[bool] = Query(None, description="Filter by availability of stored original binary"),
    has_snapshot: Optional[bool] = Query(None, description="Filter by availability of stored content snapshot"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves a unified, paginated catalog of genuine persisted artifacts for the authenticated user.
    Aggregates UploadedDocuments, WebCrawlRecords, RepositoryReadmeSnapshots, and Connected EvidenceItems.
    """
    user_id = user.id
    artifacts: List[Dict[str, Any]] = []

    # --- A. Uploaded Documents ---
    include_docs = category in [None, "all", "documents", "certificates", "resumes", "issues"]
    if include_docs:
        doc_q = db.query(UploadedDocument).filter(
            UploadedDocument.owner_user_id == user_id,
            UploadedDocument.is_deleted == False,
        )
        if category == "certificates":
            doc_q = doc_q.filter(UploadedDocument.evidence_category == "certificate")
        elif category == "resumes":
            doc_q = doc_q.filter(UploadedDocument.evidence_category == "resume")
        elif category == "issues":
            doc_q = doc_q.filter(UploadedDocument.processing_state.in_(["failed", "insufficient_content"]))

        if search:
            pat = f"%{search}%"
            doc_q = doc_q.filter(
                or_(
                    UploadedDocument.original_filename.ilike(pat),
                    UploadedDocument.extraction_summary.ilike(pat),
                )
            )

        docs = doc_q.order_by(UploadedDocument.created_at.desc()).all()
        for d in docs:
            # Check linked EvidenceItem
            linked_ev = db.query(EvidenceItem.id, EvidenceItem.verification_status, EvidenceItem.title).filter(
                EvidenceItem.owner_user_id == user_id,
                EvidenceItem.is_deleted == False,
                or_(
                    EvidenceItem.document_id == d.id,
                    EvidenceItem.external_record_id == str(d.id),
                    EvidenceItem.content_hash == d.sha256_hash,
                )
            ).first()

            has_file = storage_manager.retrieve_file(d.private_storage_key) is not None
            has_extracted = bool(d.chunks or d.extraction_summary)

            artifacts.append({
                "id": str(d.id),
                "artifact_type": "uploaded_document",
                "title": (d.user_metadata or {}).get("title") or linked_ev[2] if linked_ev else d.original_filename,
                "filename": d.original_filename,
                "mime_type": d.mime_type,
                "file_size_bytes": d.file_size_bytes,
                "category": d.evidence_category,
                "source_provider": "document_upload",
                "source_url": None,
                "observed_at": d.created_at.isoformat() if d.created_at else None,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "processing_state": d.processing_state,
                "has_original_file": has_file,
                "has_snapshot": False,
                "has_extracted_text": has_extracted,
                "extracted_summary": d.extraction_summary,
                "evidence_id": str(linked_ev[0]) if linked_ev else None,
                "verification_status": linked_ev[1] if linked_ev else "unreviewed",
                "provenance": {
                    "sha256": d.sha256_hash,
                    "storage_key": d.private_storage_key,
                    "document_version": d.document_version,
                    "chunk_count": len(d.chunks),
                    **(d.user_metadata or {}),
                },
            })

    # --- B. Web Crawl Snapshots ---
    include_web = category in [None, "all", "web_snapshots", "issues"]
    if include_web:
        crawl_q = db.query(WebCrawlRecord).filter(
            WebCrawlRecord.owner_user_id == user_id,
        )
        if category == "issues":
            crawl_q = crawl_q.filter(WebCrawlRecord.extraction_status.in_(["failed", "insufficient_content"]))

        if search:
            pat = f"%{search}%"
            crawl_q = crawl_q.filter(
                or_(
                    WebCrawlRecord.page_title.ilike(pat),
                    WebCrawlRecord.submitted_url.ilike(pat),
                    WebCrawlRecord.final_url.ilike(pat),
                )
            )

        crawls = crawl_q.order_by(WebCrawlRecord.created_at.desc()).all()
        for c in crawls:
            linked_ev = db.query(EvidenceItem.id, EvidenceItem.verification_status).filter(
                EvidenceItem.owner_user_id == user_id,
                EvidenceItem.is_deleted == False,
                or_(
                    EvidenceItem.external_record_id == str(c.id),
                    EvidenceItem.source_url == c.final_url,
                    EvidenceItem.content_hash == c.content_hash,
                )
            ).first()

            has_snap = bool(c.cleaned_content)
            artifacts.append({
                "id": str(c.id),
                "artifact_type": "web_snapshot",
                "title": c.page_title or c.submitted_url,
                "filename": None,
                "mime_type": "text/html",
                "file_size_bytes": len(c.cleaned_content.encode("utf-8")) if c.cleaned_content else 0,
                "category": "portfolio",
                "source_provider": "portfolio",
                "source_url": c.final_url or c.submitted_url,
                "observed_at": c.created_at.isoformat() if c.created_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "processing_state": c.extraction_status or "completed",
                "has_original_file": False,
                "has_snapshot": has_snap,
                "has_extracted_text": has_snap,
                "extracted_summary": f"Web capture: {len(c.cleaned_content or '')} characters, crawl depth {c.crawl_depth}",
                "evidence_id": str(linked_ev[0]) if linked_ev else None,
                "verification_status": linked_ev[1] if linked_ev else "unreviewed",
                "provenance": {
                    "submitted_url": c.submitted_url,
                    "final_url": c.final_url,
                    "content_hash": c.content_hash,
                    "crawl_depth": c.crawl_depth,
                    "http_status": c.http_status,
                    "headings_count": len((c.extracted_headings or {}).get("headings", [])),
                },
            })

    # --- C. Repository README Snapshots ---
    include_repos = category in [None, "all", "github", "issues"]
    if include_repos:
        repo_q = db.query(RepositoryReadmeSnapshot).filter(
            RepositoryReadmeSnapshot.owner_user_id == user_id,
        )
        if category == "issues":
            repo_q = repo_q.filter(RepositoryReadmeSnapshot.sync_status != "success")

        if search:
            pat = f"%{search}%"
            repo_q = repo_q.filter(
                or_(
                    RepositoryReadmeSnapshot.repo_full_name.ilike(pat),
                    RepositoryReadmeSnapshot.readme_path.ilike(pat),
                    RepositoryReadmeSnapshot.extracted_summary.ilike(pat),
                )
            )

        readmes = repo_q.order_by(RepositoryReadmeSnapshot.retrieval_timestamp.desc()).all()
        for r in readmes:
            linked_ev = db.query(EvidenceItem.id, EvidenceItem.verification_status).filter(
                EvidenceItem.owner_user_id == user_id,
                EvidenceItem.is_deleted == False,
                EvidenceItem.source_provider == "github",
                EvidenceItem.project_name.ilike(f"%{r.repo_full_name}%"),
            ).first()

            has_snap = bool(r.raw_content)
            artifacts.append({
                "id": str(r.id),
                "artifact_type": "repository_readme",
                "title": f"{r.repo_full_name}: {r.readme_path}",
                "filename": r.readme_path,
                "mime_type": "text/markdown",
                "file_size_bytes": len(r.raw_content.encode("utf-8")) if r.raw_content else 0,
                "category": "code_repository",
                "source_provider": "github",
                "source_url": r.html_url or f"https://github.com/{r.repo_full_name}",
                "observed_at": r.retrieval_timestamp.isoformat() if r.retrieval_timestamp else None,
                "created_at": r.retrieval_timestamp.isoformat() if r.retrieval_timestamp else None,
                "processing_state": "completed" if r.sync_status == "success" else "failed",
                "has_original_file": False,
                "has_snapshot": has_snap,
                "has_extracted_text": has_snap,
                "extracted_summary": r.extracted_summary or f"Repository documentation snapshot for {r.repo_full_name}",
                "evidence_id": str(linked_ev[0]) if linked_ev else None,
                "verification_status": linked_ev[1] if linked_ev else "unreviewed",
                "provenance": {
                    "repo_full_name": r.repo_full_name,
                    "blob_sha": r.blob_sha,
                    "html_url": r.html_url,
                    "content_hash": r.content_hash,
                    "sync_status": r.sync_status,
                    "is_current": r.is_current,
                },
            })

    # --- D. Connected Jira / Standalone Source Records ---
    include_jira = category in [None, "all", "jira", "issues"]
    if include_jira:
        jira_q = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.is_deleted == False,
            EvidenceItem.source_provider == "jira",
        )
        if category == "issues":
            jira_q = jira_q.filter(
                or_(
                    EvidenceItem.processing_status.in_(["failed", "insufficient_content"]),
                    EvidenceItem.verification_status == "insufficient_evidence",
                )
            )

        if search:
            pat = f"%{search}%"
            jira_q = jira_q.filter(
                or_(
                    EvidenceItem.title.ilike(pat),
                    EvidenceItem.description.ilike(pat),
                    EvidenceItem.extracted_excerpt.ilike(pat),
                )
            )

        jira_items = jira_q.order_by(EvidenceItem.observed_timestamp.desc()).all()
        for j in jira_items:
            artifacts.append({
                "id": str(j.id),
                "artifact_type": "connected_source_record",
                "title": j.title,
                "filename": None,
                "mime_type": "application/json",
                "file_size_bytes": len((j.description or "").encode("utf-8")),
                "category": j.evidence_category,
                "source_provider": "jira",
                "source_url": j.source_url,
                "observed_at": j.observed_timestamp.isoformat() if j.observed_timestamp else None,
                "created_at": j.ingestion_timestamp.isoformat() if j.ingestion_timestamp else None,
                "processing_state": j.processing_status,
                "has_original_file": False,
                "has_snapshot": False,
                "has_extracted_text": bool(j.extracted_excerpt or j.description),
                "extracted_summary": j.extracted_summary or j.description,
                "evidence_id": str(j.id),
                "verification_status": j.verification_status,
                "provenance": {
                    "source_provider": "jira",
                    "source_name": j.source_name,
                    "external_record_id": j.external_record_id,
                    **(j.provenance or {}),
                },
            })

    # Filter by boolean flags if requested
    if has_original is not None:
        artifacts = [a for a in artifacts if a["has_original_file"] == has_original]
    if has_snapshot is not None:
        artifacts = [a for a in artifacts if a["has_snapshot"] == has_snapshot]

    # Sort descending by date
    artifacts.sort(key=lambda x: x["created_at"] or "", reverse=True)

    # Paginate in-memory over combined authorized user collection
    total_count = len(artifacts)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_items = artifacts[start_idx:end_idx]
    total_pages = max(1, (total_count + page_size - 1) // page_size)

    return {
        "items": paginated_items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/artifacts/{artifact_type}/{artifact_id}")
def get_vault_artifact_detail(
    artifact_type: str,
    artifact_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves full details, extracted structured text chunks, provenance metadata,
    and linked evidence records for a single genuine artifact.
    Strictly verifies ownership—cross-user access returns 404.
    """
    try:
        item_uuid = uuid.UUID(artifact_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact UUID format")

    user_id = user.id

    if artifact_type == "uploaded_document":
        doc = db.query(UploadedDocument).filter(
            UploadedDocument.id == item_uuid,
            UploadedDocument.owner_user_id == user_id,
            UploadedDocument.is_deleted == False,
        ).first()

        if not doc:
            raise HTTPException(status_code=404, detail="Uploaded document not found in private vault")

        has_file = storage_manager.retrieve_file(doc.private_storage_key) is not None

        # Fetch chunks
        chunks = [
            {
                "chunk_index": c.chunk_index,
                "page_or_slide_number": c.page_or_slide_number,
                "section_title": c.section_title,
                "original_text": c.original_text,
                "normalized_text": c.normalized_text,
                "extraction_method": c.extraction_method,
            }
            for c in doc.chunks
        ]

        # Fetch linked EvidenceItem & candidate skills
        linked_ev = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.is_deleted == False,
            or_(
                EvidenceItem.document_id == doc.id,
                EvidenceItem.external_record_id == str(doc.id),
                EvidenceItem.content_hash == doc.sha256_hash,
            )
        ).first()

        candidate_skills = []
        audit_trail = []
        if linked_ev:
            mappings = db.query(EvidenceCompetencyMapping).filter(
                EvidenceCompetencyMapping.evidence_id == linked_ev.id
            ).all()
            for m in mappings:
                tax = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == m.competency_id).first()
                candidate_skills.append({
                    "id": str(m.id),
                    "name": tax.canonical_name if tax else "Competency",
                    "category": tax.category if tax else "General",
                    "proficiency_level": m.proficiency_level,
                    "confidence": m.relevance_score,
                    "supporting_excerpt": m.supporting_excerpt,
                    "rationale": m.rationale,
                    "status": m.status,
                })

            audits = db.query(ReviewAuditEvent).filter(
                ReviewAuditEvent.target_record_id == linked_ev.id
            ).order_by(ReviewAuditEvent.event_timestamp.desc()).all()
            audit_trail = [
                {
                    "id": str(a.id),
                    "event_type": a.event_type,
                    "previous_state": a.previous_state,
                    "new_state": a.new_state,
                    "reason_note": a.reason_note,
                    "timestamp": a.event_timestamp.isoformat() if a.event_timestamp else None,
                }
                for a in audits
            ]

        return {
            "id": str(doc.id),
            "artifact_type": "uploaded_document",
            "title": (doc.user_metadata or {}).get("title") or (linked_ev.title if linked_ev else doc.original_filename),
            "filename": doc.original_filename,
            "mime_type": doc.mime_type,
            "file_size_bytes": doc.file_size_bytes,
            "category": doc.evidence_category,
            "source_provider": "document_upload",
            "source_url": None,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "processing_state": doc.processing_state,
            "has_original_file": has_file,
            "has_snapshot": False,
            "has_extracted_text": len(chunks) > 0 or bool(doc.extraction_summary),
            "extracted_summary": doc.extraction_summary,
            "chunks": chunks,
            "full_extracted_text": "\n\n".join(c["original_text"] for c in chunks) if chunks else doc.extraction_summary,
            "user_metadata": doc.user_metadata or {},
            "provenance": {
                "sha256": doc.sha256_hash,
                "private_storage_key": doc.private_storage_key,
                "storage_bucket": doc.storage_bucket,
                "document_version": doc.document_version,
            },
            "linked_evidence": {
                "id": str(linked_ev.id) if linked_ev else None,
                "title": linked_ev.title if linked_ev else None,
                "evidence_strength": linked_ev.evidence_strength if linked_ev else "medium",
                "verification_status": linked_ev.verification_status if linked_ev else "unreviewed",
                "extraction_confidence": linked_ev.extraction_confidence if linked_ev else 0.85,
                "candidate_skills": candidate_skills,
                "audit_trail": audit_trail,
            } if linked_ev else None,
        }

    elif artifact_type == "web_snapshot":
        crawl = db.query(WebCrawlRecord).filter(
            WebCrawlRecord.id == item_uuid,
            WebCrawlRecord.owner_user_id == user_id,
        ).first()

        if not crawl:
            raise HTTPException(status_code=404, detail="Web snapshot record not found in private vault")

        linked_ev = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.is_deleted == False,
            or_(
                EvidenceItem.external_record_id == str(crawl.id),
                EvidenceItem.source_url == crawl.final_url,
                EvidenceItem.content_hash == crawl.content_hash,
            )
        ).first()

        candidate_skills = []
        if linked_ev:
            mappings = db.query(EvidenceCompetencyMapping).filter(
                EvidenceCompetencyMapping.evidence_id == linked_ev.id
            ).all()
            for m in mappings:
                tax = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == m.competency_id).first()
                candidate_skills.append({
                    "id": str(m.id),
                    "name": tax.canonical_name if tax else "Competency",
                    "category": tax.category if tax else "General",
                    "proficiency_level": m.proficiency_level,
                    "confidence": m.relevance_score,
                    "supporting_excerpt": m.supporting_excerpt,
                    "rationale": m.rationale,
                    "status": m.status,
                })

        return {
            "id": str(crawl.id),
            "artifact_type": "web_snapshot",
            "title": crawl.page_title or crawl.submitted_url,
            "filename": None,
            "mime_type": "text/html",
            "file_size_bytes": len(crawl.cleaned_content.encode("utf-8")) if crawl.cleaned_content else 0,
            "category": "portfolio",
            "source_provider": "portfolio",
            "source_url": crawl.final_url or crawl.submitted_url,
            "created_at": crawl.created_at.isoformat() if crawl.created_at else None,
            "processing_state": crawl.extraction_status or "completed",
            "has_original_file": False,
            "has_snapshot": bool(crawl.cleaned_content),
            "has_extracted_text": bool(crawl.cleaned_content),
            "extracted_summary": f"Web capture: {len(crawl.cleaned_content or '')} characters",
            "full_extracted_text": crawl.cleaned_content,
            "extracted_headings": crawl.extracted_headings or {},
            "discovered_links": crawl.discovered_links or {},
            "provenance": {
                "submitted_url": crawl.submitted_url,
                "final_url": crawl.final_url,
                "content_hash": crawl.content_hash,
                "crawl_depth": crawl.crawl_depth,
                "http_status": crawl.http_status,
                "capture_timestamp": crawl.created_at.isoformat() if crawl.created_at else None,
            },
            "linked_evidence": {
                "id": str(linked_ev.id) if linked_ev else None,
                "title": linked_ev.title if linked_ev else None,
                "verification_status": linked_ev.verification_status if linked_ev else "unreviewed",
                "candidate_skills": candidate_skills,
            } if linked_ev else None,
        }

    elif artifact_type == "repository_readme":
        readme = db.query(RepositoryReadmeSnapshot).filter(
            RepositoryReadmeSnapshot.id == item_uuid,
            RepositoryReadmeSnapshot.owner_user_id == user_id,
        ).first()

        if not readme:
            raise HTTPException(status_code=404, detail="Repository README snapshot not found in private vault")

        linked_ev = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.is_deleted == False,
            EvidenceItem.source_provider == "github",
            EvidenceItem.project_name.ilike(f"%{readme.repo_full_name}%"),
        ).first()

        candidate_skills = []
        if linked_ev:
            mappings = db.query(EvidenceCompetencyMapping).filter(
                EvidenceCompetencyMapping.evidence_id == linked_ev.id
            ).all()
            for m in mappings:
                tax = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == m.competency_id).first()
                candidate_skills.append({
                    "id": str(m.id),
                    "name": tax.canonical_name if tax else "Competency",
                    "category": tax.category if tax else "General",
                    "proficiency_level": m.proficiency_level,
                    "confidence": m.relevance_score,
                    "supporting_excerpt": m.supporting_excerpt,
                    "rationale": m.rationale,
                    "status": m.status,
                })

        return {
            "id": str(readme.id),
            "artifact_type": "repository_readme",
            "title": f"{readme.repo_full_name}: {readme.readme_path}",
            "filename": readme.readme_path,
            "mime_type": "text/markdown",
            "file_size_bytes": len(readme.raw_content.encode("utf-8")) if readme.raw_content else 0,
            "category": "code_repository",
            "source_provider": "github",
            "source_url": readme.html_url or f"https://github.com/{readme.repo_full_name}",
            "created_at": readme.retrieval_timestamp.isoformat() if readme.retrieval_timestamp else None,
            "processing_state": "completed" if readme.sync_status == "success" else "failed",
            "has_original_file": False,
            "has_snapshot": bool(readme.raw_content),
            "has_extracted_text": bool(readme.raw_content),
            "extracted_summary": readme.extracted_summary,
            "full_extracted_text": readme.raw_content,
            "sections_json": readme.sections_json or [],
            "provenance": {
                "repo_full_name": readme.repo_full_name,
                "readme_path": readme.readme_path,
                "blob_sha": readme.blob_sha,
                "html_url": readme.html_url,
                "content_hash": readme.content_hash,
                "sync_status": readme.sync_status,
                "is_current": readme.is_current,
                "retrieval_timestamp": readme.retrieval_timestamp.isoformat() if readme.retrieval_timestamp else None,
            },
            "linked_evidence": {
                "id": str(linked_ev.id) if linked_ev else None,
                "title": linked_ev.title if linked_ev else None,
                "verification_status": linked_ev.verification_status if linked_ev else "unreviewed",
                "candidate_skills": candidate_skills,
            } if linked_ev else None,
        }

    elif artifact_type == "connected_source_record":
        ev = db.query(EvidenceItem).filter(
            EvidenceItem.id == item_uuid,
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.is_deleted == False,
        ).first()

        if not ev:
            raise HTTPException(status_code=404, detail="Connected source record not found in private vault")

        mappings = db.query(EvidenceCompetencyMapping).filter(
            EvidenceCompetencyMapping.evidence_id == ev.id
        ).all()
        candidate_skills = []
        for m in mappings:
            tax = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == m.competency_id).first()
            candidate_skills.append({
                "id": str(m.id),
                "name": tax.canonical_name if tax else "Competency",
                "category": tax.category if tax else "General",
                "proficiency_level": m.proficiency_level,
                "confidence": m.relevance_score,
                "supporting_excerpt": m.supporting_excerpt,
                "rationale": m.rationale,
                "status": m.status,
            })

        return {
            "id": str(ev.id),
            "artifact_type": "connected_source_record",
            "title": ev.title,
            "filename": None,
            "mime_type": "application/json",
            "file_size_bytes": len((ev.description or "").encode("utf-8")),
            "category": ev.evidence_category,
            "source_provider": ev.source_provider,
            "source_url": ev.source_url,
            "created_at": ev.ingestion_timestamp.isoformat() if ev.ingestion_timestamp else None,
            "processing_state": ev.processing_status,
            "has_original_file": False,
            "has_snapshot": False,
            "has_extracted_text": bool(ev.extracted_excerpt or ev.description),
            "extracted_summary": ev.extracted_summary or ev.description,
            "full_extracted_text": ev.extracted_excerpt or ev.description,
            "provenance": {
                "source_provider": ev.source_provider,
                "source_name": ev.source_name,
                "external_record_id": ev.external_record_id,
                "contributor_identity": ev.contributor_identity,
                "attribution_status": ev.attribution_status,
                **(ev.provenance or {}),
            },
            "linked_evidence": {
                "id": str(ev.id),
                "title": ev.title,
                "verification_status": ev.verification_status,
                "candidate_skills": candidate_skills,
            },
        }

    elif artifact_type in ("evidence", "evidence_item"):
        ev = db.query(EvidenceItem).filter(
            EvidenceItem.id == item_uuid,
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.is_deleted == False,
        ).first()

        if not ev:
            raise HTTPException(status_code=404, detail="Evidence artifact not found in private vault")

        mappings = db.query(EvidenceCompetencyMapping).filter(
            EvidenceCompetencyMapping.evidence_id == ev.id
        ).all()
        candidate_skills = []
        for m in mappings:
            tax = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == m.competency_id).first()
            candidate_skills.append({
                "id": str(m.id),
                "name": tax.canonical_name if tax else "Competency",
                "category": tax.category if tax else "General",
                "proficiency_level": m.proficiency_level,
                "confidence": getattr(m, "relevance_score", getattr(m, "confidence_score", 0.85)),
                "supporting_excerpt": m.supporting_excerpt,
                "rationale": m.rationale,
                "status": m.status,
            })

        audits = db.query(ReviewAuditEvent).filter(
            ReviewAuditEvent.target_record_id == ev.id
        ).order_by(ReviewAuditEvent.event_timestamp.desc()).all()
        audit_trail = [
            {
                "id": str(a.id),
                "event_type": a.event_type,
                "previous_state": a.previous_state,
                "new_state": a.new_state,
                "reason_note": a.reason_note,
                "timestamp": a.event_timestamp.isoformat() if a.event_timestamp else None,
            }
            for a in audits
        ]

        doc = None
        if ev.document_id:
            doc = db.query(UploadedDocument).filter(
                UploadedDocument.id == ev.document_id,
                UploadedDocument.owner_user_id == user_id,
                UploadedDocument.is_deleted == False,
            ).first()
        if not doc and ev.content_hash:
            doc = db.query(UploadedDocument).filter(
                UploadedDocument.sha256_hash == ev.content_hash,
                UploadedDocument.owner_user_id == user_id,
                UploadedDocument.is_deleted == False,
            ).first()

        if doc:
            has_file = storage_manager.retrieve_file(doc.private_storage_key) is not None
            chunks = [
                {
                    "chunk_index": c.chunk_index,
                    "page_or_slide_number": c.page_or_slide_number,
                    "section_title": c.section_title,
                    "original_text": c.original_text,
                    "normalized_text": c.normalized_text,
                    "extraction_method": c.extraction_method,
                }
                for c in doc.chunks
            ]
            return {
                "id": str(ev.id),
                "artifact_type": "uploaded_document",
                "evidence_id": str(ev.id),
                "document_id": str(doc.id),
                "title": ev.title or (doc.user_metadata or {}).get("title") or doc.original_filename,
                "filename": doc.original_filename,
                "mime_type": doc.mime_type,
                "file_size_bytes": doc.file_size_bytes,
                "category": ev.evidence_category or doc.evidence_category,
                "source_provider": ev.source_provider or "document_upload",
                "source_url": ev.source_url,
                "created_at": ev.observed_timestamp.isoformat() if ev.observed_timestamp else (doc.created_at.isoformat() if doc.created_at else None),
                "processing_state": ev.processing_status or doc.processing_state,
                "has_original_file": has_file,
                "has_snapshot": False,
                "has_extracted_text": len(chunks) > 0 or bool(ev.extracted_excerpt or doc.extraction_summary),
                "extracted_summary": ev.extracted_summary or doc.extraction_summary or ev.description,
                "chunks": chunks,
                "full_extracted_text": "\n\n".join(c["original_text"] for c in chunks) if chunks else (ev.extracted_excerpt or ev.description or doc.extraction_summary),
                "user_metadata": {**(doc.user_metadata if isinstance(getattr(doc, "user_metadata", None), dict) else {}), **(ev.normalized_metadata if isinstance(getattr(ev, "normalized_metadata", None), dict) else {})},
                "provenance": {
                    "sha256": doc.sha256_hash or ev.content_hash,
                    "private_storage_key": doc.private_storage_key,
                    "storage_bucket": doc.storage_bucket,
                    "document_version": doc.document_version,
                    **(ev.provenance or {}),
                },
                "linked_evidence": {
                    "id": str(ev.id),
                    "title": ev.title,
                    "evidence_strength": ev.evidence_strength if ev.evidence_strength else "medium",
                    "verification_status": ev.verification_status if ev.verification_status else "unreviewed",
                    "extraction_confidence": ev.extraction_confidence if ev.extraction_confidence else 0.85,
                    "candidate_skills": candidate_skills,
                    "audit_trail": audit_trail,
                },
            }

        if ev.source_provider in ("portfolio", "web_crawl") or ev.evidence_category == "portfolio":
            crawl = db.query(WebCrawlRecord).filter(
                WebCrawlRecord.owner_user_id == user_id,
                or_(
                    WebCrawlRecord.final_url == ev.source_url,
                    WebCrawlRecord.submitted_url == ev.source_url,
                    WebCrawlRecord.content_hash == ev.content_hash,
                )
            ).first()

            if crawl:
                return {
                    "id": str(ev.id),
                    "artifact_type": "web_snapshot",
                    "evidence_id": str(ev.id),
                    "title": crawl.page_title or ev.title,
                    "filename": None,
                    "mime_type": "text/html",
                    "file_size_bytes": len(crawl.cleaned_content.encode("utf-8")) if crawl.cleaned_content else 0,
                    "category": "portfolio",
                    "source_provider": "portfolio",
                    "source_url": crawl.final_url or crawl.submitted_url or ev.source_url,
                    "created_at": crawl.created_at.isoformat() if crawl.created_at else None,
                    "processing_state": crawl.extraction_status or "completed",
                    "has_original_file": False,
                    "has_snapshot": bool(crawl.cleaned_content),
                    "has_extracted_text": bool(crawl.cleaned_content),
                    "extracted_summary": f"Web capture: {len(crawl.cleaned_content or '')} characters",
                    "full_extracted_text": crawl.cleaned_content or ev.extracted_excerpt or ev.description,
                    "extracted_headings": crawl.extracted_headings or {},
                    "discovered_links": crawl.discovered_links or {},
                    "provenance": {
                        "submitted_url": crawl.submitted_url,
                        "final_url": crawl.final_url,
                        "content_hash": crawl.content_hash,
                        "crawl_depth": crawl.crawl_depth,
                        "http_status": crawl.http_status,
                        "capture_timestamp": crawl.created_at.isoformat() if crawl.created_at else None,
                        **(ev.provenance or {}),
                    },
                    "linked_evidence": {
                        "id": str(ev.id),
                        "title": ev.title,
                        "verification_status": ev.verification_status,
                        "candidate_skills": candidate_skills,
                        "audit_trail": audit_trail,
                    },
                }

        if ev.source_provider == "github":
            readme = db.query(RepositoryReadmeSnapshot).filter(
                RepositoryReadmeSnapshot.owner_user_id == user_id,
                or_(
                    RepositoryReadmeSnapshot.repo_full_name.ilike(f"%{ev.project_name or ''}%"),
                    RepositoryReadmeSnapshot.content_hash == ev.content_hash,
                )
            ).first()

            if readme:
                return {
                    "id": str(ev.id),
                    "artifact_type": "repository_readme",
                    "evidence_id": str(ev.id),
                    "title": ev.title or f"{readme.repo_full_name}: {readme.readme_path}",
                    "filename": readme.readme_path,
                    "mime_type": "text/markdown",
                    "file_size_bytes": len(readme.raw_content.encode("utf-8")) if readme.raw_content else 0,
                    "category": "code_repository",
                    "source_provider": "github",
                    "source_url": readme.html_url or ev.source_url or f"https://github.com/{readme.repo_full_name}",
                    "created_at": readme.retrieval_timestamp.isoformat() if readme.retrieval_timestamp else None,
                    "processing_state": "completed" if readme.sync_status == "success" else "failed",
                    "has_original_file": False,
                    "has_snapshot": bool(readme.raw_content),
                    "has_extracted_text": bool(readme.raw_content),
                    "extracted_summary": readme.extracted_summary or ev.extracted_summary or ev.description,
                    "full_extracted_text": readme.raw_content or ev.extracted_excerpt or ev.description,
                    "sections_json": readme.sections_json or [],
                    "provenance": {
                        "repo_full_name": readme.repo_full_name,
                        "readme_path": readme.readme_path,
                        "blob_sha": readme.blob_sha,
                        "html_url": readme.html_url,
                        "content_hash": readme.content_hash,
                        "sync_status": readme.sync_status,
                        "is_current": readme.is_current,
                        "retrieval_timestamp": readme.retrieval_timestamp.isoformat() if readme.retrieval_timestamp else None,
                        **(ev.provenance or {}),
                    },
                    "linked_evidence": {
                        "id": str(ev.id),
                        "title": ev.title,
                        "verification_status": ev.verification_status,
                        "candidate_skills": candidate_skills,
                        "audit_trail": audit_trail,
                    },
                }

        return {
            "id": str(ev.id),
            "artifact_type": "connected_source_record",
            "evidence_id": str(ev.id),
            "title": ev.title,
            "filename": None,
            "mime_type": "application/json",
            "file_size_bytes": len((ev.description or "").encode("utf-8")),
            "category": ev.evidence_category,
            "source_provider": ev.source_provider,
            "source_url": ev.source_url,
            "created_at": ev.observed_timestamp.isoformat() if ev.observed_timestamp else (ev.ingestion_timestamp.isoformat() if ev.ingestion_timestamp else None),
            "processing_state": ev.processing_status,
            "has_original_file": False,
            "has_snapshot": False,
            "has_extracted_text": bool(ev.extracted_excerpt or ev.description),
            "extracted_summary": ev.extracted_summary or ev.description,
            "full_extracted_text": ev.extracted_excerpt or ev.description,
            "user_metadata": {**(ev.normalized_metadata if isinstance(getattr(ev, "normalized_metadata", None), dict) else {})},
            "provenance": {
                "source_provider": ev.source_provider,
                "source_name": ev.source_name,
                "external_record_id": ev.external_record_id,
                "contributor_identity": ev.contributor_identity,
                "attribution_status": ev.attribution_status,
                **(ev.provenance or {}),
            },
            "linked_evidence": {
                "id": str(ev.id),
                "title": ev.title,
                "verification_status": ev.verification_status,
                "candidate_skills": candidate_skills,
                "audit_trail": audit_trail,
            },
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported artifact type '{artifact_type}'")


@router.api_route("/artifacts/{artifact_type}/{artifact_id}/preview-file", methods=["GET", "HEAD"])
def preview_vault_file(
    artifact_type: str,
    artifact_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated streaming preview of actual persisted binary or snapshot content.
    Returns appropriate Content-Type with Content-Disposition: inline.
    Guarantees that unauthenticated or cross-tenant access is strictly blocked.
    """
    try:
        item_uuid = uuid.UUID(artifact_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact UUID format")

    user_id = user.id

    if artifact_type == "uploaded_document":
        doc = db.query(UploadedDocument).filter(
            UploadedDocument.id == item_uuid,
            UploadedDocument.owner_user_id == user_id,
            UploadedDocument.is_deleted == False,
        ).first()

        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        file_bytes = storage_manager.retrieve_file(doc.private_storage_key)
        if not file_bytes:
            raise HTTPException(status_code=404, detail="Original document binary is missing from storage vault")

        media_type = doc.mime_type or "application/octet-stream"
        encoded_filename = urllib.parse.quote(doc.original_filename)

        return Response(
            content=file_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}",
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, max-age=300",
            },
        )

    elif artifact_type == "web_snapshot":
        crawl = db.query(WebCrawlRecord).filter(
            WebCrawlRecord.id == item_uuid,
            WebCrawlRecord.owner_user_id == user_id,
        ).first()

        if not crawl:
            raise HTTPException(status_code=404, detail="Web crawl snapshot not found")

        html_content = crawl.cleaned_content or f"<html><body><h1>{crawl.page_title}</h1><p>No content snapshot available.</p></body></html>"
        return Response(
            content=html_content.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": "inline",
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, max-age=300",
            },
        )

    elif artifact_type == "repository_readme":
        readme = db.query(RepositoryReadmeSnapshot).filter(
            RepositoryReadmeSnapshot.id == item_uuid,
            RepositoryReadmeSnapshot.owner_user_id == user_id,
        ).first()

        if not readme:
            raise HTTPException(status_code=404, detail="README snapshot not found")

        md_content = readme.raw_content or f"# {readme.repo_full_name}\n\n*No README content snapshot recorded.*"
        return Response(
            content=md_content.encode("utf-8"),
            media_type="text/markdown; charset=utf-8",
            headers={
                "Content-Disposition": "inline",
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, max-age=300",
            },
        )

    elif artifact_type in ("evidence", "evidence_item"):
        ev = db.query(EvidenceItem).filter(
            EvidenceItem.id == item_uuid,
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.is_deleted == False,
        ).first()

        if not ev:
            raise HTTPException(status_code=404, detail="Evidence artifact not found")

        doc = None
        if ev.document_id:
            doc = db.query(UploadedDocument).filter(
                UploadedDocument.id == ev.document_id,
                UploadedDocument.owner_user_id == user_id,
                UploadedDocument.is_deleted == False,
            ).first()
        if not doc and ev.content_hash:
            doc = db.query(UploadedDocument).filter(
                UploadedDocument.sha256_hash == ev.content_hash,
                UploadedDocument.owner_user_id == user_id,
                UploadedDocument.is_deleted == False,
            ).first()

        if doc:
            file_bytes = storage_manager.retrieve_file(doc.private_storage_key)
            if file_bytes:
                media_type = doc.mime_type or "application/octet-stream"
                encoded_filename = urllib.parse.quote(doc.original_filename)
                return Response(
                    content=file_bytes,
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}",
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "private, max-age=300",
                    },
                )

        if ev.source_provider in ("portfolio", "web_crawl") or ev.evidence_category == "portfolio":
            crawl = db.query(WebCrawlRecord).filter(
                WebCrawlRecord.owner_user_id == user_id,
                or_(
                    WebCrawlRecord.final_url == ev.source_url,
                    WebCrawlRecord.submitted_url == ev.source_url,
                    WebCrawlRecord.content_hash == ev.content_hash,
                )
            ).first()
            if crawl and crawl.cleaned_content:
                return Response(
                    content=crawl.cleaned_content.encode("utf-8"),
                    media_type="text/plain; charset=utf-8",
                    headers={"Content-Disposition": "inline", "X-Content-Type-Options": "nosniff"},
                )

        if ev.source_provider == "github":
            readme = db.query(RepositoryReadmeSnapshot).filter(
                RepositoryReadmeSnapshot.owner_user_id == user_id,
                RepositoryReadmeSnapshot.repo_full_name.ilike(f"%{ev.project_name or ''}%"),
            ).first()
            if readme and readme.raw_content:
                return Response(
                    content=readme.raw_content.encode("utf-8"),
                    media_type="text/markdown; charset=utf-8",
                    headers={"Content-Disposition": "inline", "X-Content-Type-Options": "nosniff"},
                )

        preview_text = ev.extracted_excerpt or ev.extracted_summary or ev.description or "Evidence record snapshot"
        return Response(
            content=preview_text.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": "inline", "X-Content-Type-Options": "nosniff"},
        )

    else:
        raise HTTPException(status_code=400, detail="Preview not available for this artifact type")


@router.api_route("/artifacts/{artifact_type}/{artifact_id}/download", methods=["GET", "HEAD"])
def download_vault_file(
    artifact_type: str,
    artifact_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authorized binary download of the original artifact or snapshot.
    Enforces user ownership and emits Content-Disposition: attachment.
    """
    try:
        item_uuid = uuid.UUID(artifact_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact UUID format")

    user_id = user.id

    if artifact_type == "uploaded_document":
        doc = db.query(UploadedDocument).filter(
            UploadedDocument.id == item_uuid,
            UploadedDocument.owner_user_id == user_id,
            UploadedDocument.is_deleted == False,
        ).first()

        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        file_bytes = storage_manager.retrieve_file(doc.private_storage_key)
        if not file_bytes:
            raise HTTPException(status_code=404, detail="Original document binary is missing from storage vault")

        encoded_filename = urllib.parse.quote(doc.original_filename)
        return Response(
            content=file_bytes,
            media_type=doc.mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, no-cache",
            },
        )

    elif artifact_type == "web_snapshot":
        crawl = db.query(WebCrawlRecord).filter(
            WebCrawlRecord.id == item_uuid,
            WebCrawlRecord.owner_user_id == user_id,
        ).first()

        if not crawl:
            raise HTTPException(status_code=404, detail="Web crawl snapshot not found")

        safe_name = urllib.parse.quote(f"{crawl.page_title or 'web_snapshot'}.html")
        content = (crawl.cleaned_content or "").encode("utf-8")
        return Response(
            content=content,
            media_type="text/html; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}",
                "X-Content-Type-Options": "nosniff",
            },
        )

    elif artifact_type == "repository_readme":
        readme = db.query(RepositoryReadmeSnapshot).filter(
            RepositoryReadmeSnapshot.id == item_uuid,
            RepositoryReadmeSnapshot.owner_user_id == user_id,
        ).first()

        if not readme:
            raise HTTPException(status_code=404, detail="README snapshot not found")

        repo_slug = readme.repo_full_name.replace("/", "_")
        safe_name = urllib.parse.quote(f"{repo_slug}_README.md")
        content = (readme.raw_content or "").encode("utf-8")
        return Response(
            content=content,
            media_type="text/markdown; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}",
                "X-Content-Type-Options": "nosniff",
            },
        )

    elif artifact_type in ("evidence", "evidence_item"):
        ev = db.query(EvidenceItem).filter(
            EvidenceItem.id == item_uuid,
            EvidenceItem.owner_user_id == user_id,
            EvidenceItem.is_deleted == False,
        ).first()

        if not ev:
            raise HTTPException(status_code=404, detail="Evidence artifact not found")

        doc = None
        if ev.document_id:
            doc = db.query(UploadedDocument).filter(
                UploadedDocument.id == ev.document_id,
                UploadedDocument.owner_user_id == user_id,
                UploadedDocument.is_deleted == False,
            ).first()
        if not doc and ev.content_hash:
            doc = db.query(UploadedDocument).filter(
                UploadedDocument.sha256_hash == ev.content_hash,
                UploadedDocument.owner_user_id == user_id,
                UploadedDocument.is_deleted == False,
            ).first()

        if doc:
            file_bytes = storage_manager.retrieve_file(doc.private_storage_key)
            if file_bytes:
                encoded_filename = urllib.parse.quote(doc.original_filename)
                return Response(
                    content=file_bytes,
                    media_type=doc.mime_type or "application/octet-stream",
                    headers={
                        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "private, no-cache",
                    },
                )

        if ev.source_provider in ("portfolio", "web_crawl") or ev.evidence_category == "portfolio":
            crawl = db.query(WebCrawlRecord).filter(
                WebCrawlRecord.owner_user_id == user_id,
                or_(
                    WebCrawlRecord.final_url == ev.source_url,
                    WebCrawlRecord.submitted_url == ev.source_url,
                    WebCrawlRecord.content_hash == ev.content_hash,
                )
            ).first()
            if crawl and crawl.cleaned_content:
                safe_name = urllib.parse.quote(f"{crawl.page_title or 'web_snapshot'}.html")
                return Response(
                    content=crawl.cleaned_content.encode("utf-8"),
                    media_type="text/html; charset=utf-8",
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}", "X-Content-Type-Options": "nosniff"},
                )

        if ev.source_provider == "github":
            readme = db.query(RepositoryReadmeSnapshot).filter(
                RepositoryReadmeSnapshot.owner_user_id == user_id,
                RepositoryReadmeSnapshot.repo_full_name.ilike(f"%{ev.project_name or ''}%"),
            ).first()
            if readme and readme.raw_content:
                repo_slug = readme.repo_full_name.replace("/", "_")
                safe_name = urllib.parse.quote(f"{repo_slug}_README.md")
                return Response(
                    content=readme.raw_content.encode("utf-8"),
                    media_type="text/markdown; charset=utf-8",
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}", "X-Content-Type-Options": "nosniff"},
                )

        safe_name = urllib.parse.quote(f"evidence_{str(ev.id)[:8]}.txt")
        content_text = ev.extracted_excerpt or ev.extracted_summary or ev.description or "Evidence record"
        return Response(
            content=content_text.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}", "X-Content-Type-Options": "nosniff"},
        )

    else:
        raise HTTPException(status_code=400, detail="Download not available for this artifact type")
