import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.document import UploadedDocument, DocumentChunk
from backend.app.models.connection import ConnectedSource
from backend.app.models.evidence import EvidenceItem, EvidenceRelationship
from backend.app.models.taxonomy import EvidenceCompetencyMapping, CompetencyTaxonomy
from backend.app.models.audit import ReviewAuditEvent
from backend.app.models.ai_governance import (
    WorkAnalysisResult,
    EvidenceQualityAssessment,
    HallucinationGuardResult,
    EvidenceConflictRecord,
    PromptInjectionFinding,
    HumanReviewTask,
)
from backend.app.models.job import IngestionJob
from backend.app.storage.file_storage import storage_manager
from backend.app.rag.chroma import chroma_store
from backend.app.extraction.document_extractor import document_extractor
from backend.app.extraction.engine import extraction_engine
from backend.app.ingestion.pipeline import queue_manager
from backend.app.core.logging import get_logger

logger = get_logger("api.documents")
router = APIRouter(prefix="/documents", tags=["Document Upload & Extraction"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".txt", ".md", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("other"),
    title: Optional[str] = Form(None),
    source_provider: Optional[str] = Form(None),
    connection_id: Optional[str] = Form(None),
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts resume, certificate, project report, slides, or research papers.
    Calculates SHA-256 for deduplication, stores bytes in private storage vault,
    extracts structured text with PyMuPDF/docx/pptx, and registers normalized EvidenceItem.
    """
    filename = file.filename or "uploaded_document"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 50MB limit")

    sha256 = storage_manager.calculate_sha256(file_bytes)

    # Check for existing document with same hash for this user
    existing_doc = db.query(UploadedDocument).filter(
        UploadedDocument.owner_user_id == user.id,
        UploadedDocument.sha256_hash == sha256,
        UploadedDocument.is_deleted == False,
    ).first()

    if existing_doc:
        logger.info(f"Existing document check for user {user.id} (SHA256: {sha256[:12]})")
        ev_item = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user.id,
            EvidenceItem.is_deleted == False,
            or_(
                EvidenceItem.content_hash == sha256,
                EvidenceItem.external_record_id == str(existing_doc.id),
                EvidenceItem.document_id == existing_doc.id,
            )
        ).first()

        if not ev_item:
            logger.info(f"Existing document {existing_doc.id} found without active EvidenceItem. Cleaning up orphan to re-process cleanly.")
            db.query(DocumentChunk).filter(DocumentChunk.document_id == existing_doc.id).delete(synchronize_session=False)
            storage_manager.delete_file(existing_doc.private_storage_key)
            db.delete(existing_doc)
            db.commit()
            existing_doc = None
        else:
            mappings = db.query(EvidenceCompetencyMapping).filter(
                EvidenceCompetencyMapping.evidence_id == ev_item.id
            ).all()
            candidate_skills = []
            for m in mappings:
                tax = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == m.competency_id).first()
                candidate_skills.append({
                    "id": str(m.id),
                    "name": tax.canonical_name if tax else "Skill",
                    "category": tax.category if tax else "General",
                    "confidence": m.relevance_score,
                    "proficiencyLevel": m.proficiency_level,
                    "supportingExcerpt": m.supporting_excerpt,
                    "rationale": m.rationale,
                    "status": m.status,
                })
            evidence_payload = {
                "id": str(ev_item.id),
                "title": ev_item.title,
                "description": ev_item.description,
                "category": ev_item.evidence_category,
                "provider": ev_item.source_provider,
                "candidateSkills": candidate_skills,
                "strength": ev_item.evidence_strength,
                "confidence": ev_item.extraction_confidence,
                "verificationStatus": ev_item.verification_status,
                "processingStatus": ev_item.processing_status,
                "extractedExcerpt": ev_item.extracted_excerpt,
                "provenance": ev_item.provenance or {},
            }
            return {
                "status": "already_exists",
                "message": "This document has already been uploaded and indexed.",
                "document_id": str(existing_doc.id),
                "evidence_id": str(ev_item.id),
                "filename": existing_doc.original_filename,
                "category": existing_doc.evidence_category,
                "title": ev_item.title,
                "evidence": evidence_payload,
                "candidateSkills": candidate_skills,
            }

    # Persist in storage vault
    storage_res = await storage_manager.save_file(
        file_bytes=file_bytes,
        original_filename=filename,
        mime_type=file.content_type or "application/octet-stream",
        user_id=str(user.id),
    )

    # Extract structured text and chunks with OCR awareness
    try:
        extraction = await document_extractor.extract_async(
            file_bytes=file_bytes,
            filename=filename,
            mime_type=file.content_type or "",
        )
    except Exception as e:
        logger.error(f"Extraction failed for {filename}: {e}")
        extraction = {
            "title": filename,
            "page_count": 1,
            "char_count": 0,
            "word_count": 0,
            "chunks": [],
            "full_text": "",
            "excerpt": f"Extraction error: {str(e)}",
            "ocr_pages_detected": 0,
            "ocr_pages_processed": 0,
            "ocr_error": str(e),
            "extraction_quality": "insufficient_content",
            "quality_reason": f"Extraction exception: {str(e)}",
            "extractor": "failed",
        }

    is_verified = extraction.get("extraction_quality") == "verified_content"
    doc_id = uuid.uuid4()
    doc_record = UploadedDocument(
        id=doc_id,
        owner_user_id=user.id,
        original_filename=filename,
        mime_type=file.content_type or "application/octet-stream",
        file_size_bytes=len(file_bytes),
        sha256_hash=sha256,
        evidence_category=category,
        storage_bucket=storage_res["storage_bucket"],
        private_storage_key=storage_res["private_storage_key"],
        processing_state="completed" if is_verified else "insufficient_content",
        extraction_summary=extraction.get("excerpt"),
        user_metadata={
            "extractor": extraction.get("extractor"),
            "title": title or extraction.get("title"),
            "extraction_quality": extraction.get("extraction_quality"),
            "quality_reason": extraction.get("quality_reason"),
            "ocr_pages_detected": extraction.get("ocr_pages_detected"),
            "ocr_pages_processed": extraction.get("ocr_pages_processed"),
            "ocr_error": extraction.get("ocr_error"),
            "word_count": extraction.get("word_count"),
        },
    )
    db.add(doc_record)

    # Add chunks
    for chunk in extraction.get("chunks", []):
        db_chunk = DocumentChunk(
            id=uuid.uuid4(),
            document_id=doc_id,
            page_or_slide_number=chunk["page_or_slide_number"],
            section_title=chunk.get("section_title"),
            chunk_index=chunk["chunk_index"],
            original_text=chunk["original_text"],
            normalized_text=chunk["normalized_text"],
            extraction_method=chunk.get("extraction_method", "parser"),
            chunk_hash=chunk["chunk_hash"],
        )
        db.add(db_chunk)

    # Create normalized EvidenceItem with honest initial values (no fake clamping or fabricated strength)
    now = datetime.now(timezone.utc)
    ev_provider = source_provider if source_provider in ("leetcode", "hackerrank", "github", "jira") else "document_upload"
    ev_source_type = "coding_platform_evidence" if source_provider in ("leetcode", "hackerrank") else "document"
    ev_attribution = "self_reported" if source_provider in ("leetcode", "hackerrank") else "author"

    # Check for connected source linkage
    source_profile_url = None
    connected_username = None
    if source_provider in ("leetcode", "hackerrank"):
        conn_query = db.query(ConnectedSource).filter(
            ConnectedSource.owner_user_id == user.id,
            ConnectedSource.provider == source_provider,
            ConnectedSource.connection_status != "disconnected",
        )
        if connection_id:
            try:
                conn_query = conn_query.filter(ConnectedSource.id == uuid.UUID(connection_id))
            except ValueError:
                pass
        matched_conn = conn_query.first()
        if matched_conn:
            connected_username = matched_conn.account_identity
            source_profile_url = (matched_conn.connection_metadata or {}).get("profile_url")

    desc = (
        f"Supporting evidence for {source_provider.capitalize()} profile ({connected_username or 'User'}): {filename} ({extraction.get('page_count', 1)} pages)"
        if source_provider in ("leetcode", "hackerrank")
        else f"Uploaded {category.replace('_', ' ')}: {filename} ({extraction.get('page_count', 1)} pages, {extraction.get('word_count', 0)} words)"
    )

    evidence_item = EvidenceItem(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        source_provider=ev_provider,
        source_type=ev_source_type,
        external_record_id=str(doc_id),
        source_url=source_profile_url or storage_res["private_storage_key"],
        source_name=filename,
        evidence_category=category,
        title=title or extraction.get("title", filename),
        description=desc,
        extracted_excerpt=extraction.get("excerpt", "")[:500],
        observed_timestamp=now,
        contributor_identity=user.email,
        attribution_status=ev_attribution,
        project_name=title or (f"{source_provider.capitalize()} Evidence" if source_provider in ("leetcode", "hackerrank") else filename),
        evidence_strength="insufficient" if not is_verified else "medium",
        extraction_confidence=0.0,
        verification_status="insufficient_evidence" if not is_verified else "unreviewed",
        processing_status="insufficient_content" if not is_verified else "ready_for_review",
        provenance={
            "original_filename": filename,
            "sha256": sha256,
            "file_size": len(file_bytes),
            "page_count": extraction.get("page_count", 1),
            "extractor": extraction.get("extractor"),
            "extraction_quality": extraction.get("extraction_quality"),
            "quality_reason": extraction.get("quality_reason"),
            "ocr_pages_detected": extraction.get("ocr_pages_detected"),
            "ocr_pages_processed": extraction.get("ocr_pages_processed"),
            "ocr_error": extraction.get("ocr_error"),
            "source_provider": ev_provider,
            "profile_url": source_profile_url,
            "account_identity": connected_username,
            "user_provided_supporting_evidence": True,
            "ownership_verified": False,
        },
        normalized_metadata={
            "category": category,
            "page_count": extraction.get("page_count", 1),
            "word_count": extraction.get("word_count", 0),
            "extraction_quality": extraction.get("extraction_quality"),
            "quality_reason": extraction.get("quality_reason"),
            "source_provider": ev_provider,
            "profile_url": source_profile_url,
        },
        content_hash=sha256,
    )
    db.add(evidence_item)

    # Register ingestion job
    job = IngestionJob(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        job_type="document_parse",
        status="COMPLETED" if is_verified else "INSUFFICIENT_CONTENT",
        current_stage="READY_FOR_REVIEW" if is_verified else "INSUFFICIENT_CONTENT",
        progress_percentage=100,
        idempotency_key=f"doc-{doc_id}",
    )
    db.add(job)
    db.commit()
    db.refresh(doc_record)

    # Execute Domain 1 candidate skill extraction and vector indexing
    full_content = extraction.get("full_text") or extraction.get("excerpt") or filename
    evidence_data = await extraction_engine.process_and_persist_evidence(
        db=db,
        evidence_item=evidence_item,
        content_text=full_content,
        source_provider=ev_provider,
        category=category,
        user_id=user.id,
    )

    candidate_skills = evidence_data.get("candidateSkills", [])
    if candidate_skills and extraction.get("extraction_quality") != "verified_content":
        extraction["extraction_quality"] = "verified_content"
        extraction["quality_reason"] = f"Successfully extracted {extraction.get('word_count', 0)} words and {len(candidate_skills)} candidate competencies."
        doc_record.processing_state = "completed"
        job.status = "COMPLETED"
        job.current_stage = "READY_FOR_REVIEW"
        db.commit()

    return {
        "status": "success",
        "document_id": str(doc_id),
        "evidence_id": str(evidence_item.id),
        "job_id": str(job.id),
        "filename": filename,
        "category": category,
        "title": evidence_item.title,
        "page_count": extraction.get("page_count", 1),
        "word_count": extraction.get("word_count", 0),
        "chunks_extracted": len(extraction.get("chunks", [])),
        "excerpt_preview": extraction.get("excerpt"),
        "extraction_quality": extraction.get("extraction_quality"),
        "quality_reason": extraction.get("quality_reason"),
        "evidence": evidence_data,
        "candidateSkills": evidence_data.get("candidateSkills", []),
    }


@router.get("")
def list_documents(
    category: Optional[str] = None,
    limit: int = 50,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists uploaded documents for the authenticated user."""
    query = db.query(UploadedDocument).filter(
        UploadedDocument.owner_user_id == user.id,
        UploadedDocument.is_deleted == False,
    )
    if category:
        query = query.filter(UploadedDocument.evidence_category == category)

    docs = query.order_by(UploadedDocument.created_at.desc()).limit(limit).all()

    results = []
    for d in docs:
        results.append({
            "id": str(d.id),
            "filename": d.original_filename,
            "category": d.evidence_category,
            "mime_type": d.mime_type,
            "file_size_bytes": d.file_size_bytes,
            "processing_state": d.processing_state,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "summary": d.extraction_summary,
            "chunk_count": len(d.chunks),
        })

    return {"documents": results, "total": len(results)}


@router.get("/{document_id}")
def get_document(
    document_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves single document with its extracted chunks."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document UUID")

    doc = db.query(UploadedDocument).filter(
        UploadedDocument.id == doc_uuid,
        UploadedDocument.owner_user_id == user.id,
        UploadedDocument.is_deleted == False,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks_data = [
        {
            "chunk_index": c.chunk_index,
            "page_or_slide_number": c.page_or_slide_number,
            "section_title": c.section_title,
            "normalized_text": c.normalized_text,
            "extraction_method": c.extraction_method,
        }
        for c in doc.chunks
    ]

    return {
        "id": str(doc.id),
        "filename": doc.original_filename,
        "category": doc.evidence_category,
        "file_size_bytes": doc.file_size_bytes,
        "sha256_hash": doc.sha256_hash,
        "processing_state": doc.processing_state,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "summary": doc.extraction_summary,
        "chunks": chunks_data,
    }


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes document, cleans up storage binary, and removes associated
    EvidenceItems, ChromaDB vector embeddings, and competency mappings.
    Ensures immediate re-upload readiness.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document UUID")

    doc = db.query(UploadedDocument).filter(
        UploadedDocument.id == doc_uuid,
        UploadedDocument.owner_user_id == user.id,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc.original_filename
    doc_hash = doc.sha256_hash
    storage_key = doc.private_storage_key

    # Find and delete all associated EvidenceItems
    associated_items = db.query(EvidenceItem).filter(
        EvidenceItem.owner_user_id == user.id,
        or_(
            EvidenceItem.document_id == doc.id,
            EvidenceItem.external_record_id == str(doc.id),
            EvidenceItem.content_hash == doc_hash,
        )
    ).all()

    for item in associated_items:
        try:
            chroma_store.delete_evidence_item(str(item.id))
        except Exception as e:
            logger.warning(f"Error removing {item.id} from ChromaDB: {e}")

        try:
            db.query(EvidenceCompetencyMapping).filter(EvidenceCompetencyMapping.evidence_id == item.id).delete(synchronize_session=False)
            db.query(WorkAnalysisResult).filter(WorkAnalysisResult.evidence_id == item.id).delete(synchronize_session=False)
            db.query(EvidenceQualityAssessment).filter(EvidenceQualityAssessment.evidence_id == item.id).delete(synchronize_session=False)
            db.query(HallucinationGuardResult).filter(HallucinationGuardResult.evidence_id == item.id).delete(synchronize_session=False)
            db.query(EvidenceConflictRecord).filter(
                or_(
                    EvidenceConflictRecord.evidence_a_id == item.id,
                    EvidenceConflictRecord.evidence_b_id == item.id,
                )
            ).delete(synchronize_session=False)
            db.query(PromptInjectionFinding).filter(PromptInjectionFinding.evidence_id == item.id).delete(synchronize_session=False)
            db.query(HumanReviewTask).filter(HumanReviewTask.evidence_id == item.id).delete(synchronize_session=False)
            db.query(EvidenceRelationship).filter(
                or_(
                    EvidenceRelationship.source_evidence_id == item.id,
                    EvidenceRelationship.target_evidence_id == item.id,
                )
            ).delete(synchronize_session=False)
            db.query(ReviewAuditEvent).filter(ReviewAuditEvent.target_record_id == item.id).delete(synchronize_session=False)
        except Exception as e:
            logger.warning(f"Error cleaning up relational artifacts for evidence {item.id}: {e}")

        db.delete(item)

    # Delete chunks
    db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete(synchronize_session=False)

    # Delete ingestion jobs
    db.query(IngestionJob).filter(
        IngestionJob.owner_user_id == user.id,
        IngestionJob.idempotency_key == f"doc-{doc.id}",
    ).delete(synchronize_session=False)

    # Delete storage binary
    storage_manager.delete_file(storage_key)

    # Delete document record
    db.delete(doc)
    db.commit()

    logger.info(f"Successfully deleted document {document_id} ('{filename}') and all associated evidence records for user {user.id}")

    return {"status": "deleted", "message": f"Document {filename} and associated evidence records removed"}


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-executes document extraction, OCR, grounded competency mapping,
    and vector indexing for an existing uploaded document.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document UUID")

    doc = db.query(UploadedDocument).filter(
        UploadedDocument.id == doc_uuid,
        UploadedDocument.owner_user_id == user.id,
        UploadedDocument.is_deleted == False,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_bytes = storage_manager.retrieve_file(doc.private_storage_key)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Document binary not found in storage vault")

    # Re-extract with OCR awareness
    extraction = await document_extractor.extract_async(
        file_bytes=file_bytes,
        filename=doc.original_filename,
        mime_type=doc.mime_type or "",
    )

    # Replace chunks
    db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
    for chunk in extraction.get("chunks", []):
        db_chunk = DocumentChunk(
            id=uuid.uuid4(),
            document_id=doc.id,
            page_or_slide_number=chunk["page_or_slide_number"],
            section_title=chunk.get("section_title"),
            chunk_index=chunk["chunk_index"],
            original_text=chunk["original_text"],
            normalized_text=chunk["normalized_text"],
            extraction_method=chunk.get("extraction_method", "parser"),
            chunk_hash=chunk["chunk_hash"],
        )
        db.add(db_chunk)

    is_verified = extraction.get("extraction_quality") == "verified_content"
    doc.extraction_summary = extraction.get("excerpt")
    doc.processing_state = "completed" if is_verified else "insufficient_content"
    doc.user_metadata = {
        **(doc.user_metadata or {}),
        "extraction_quality": extraction.get("extraction_quality"),
        "quality_reason": extraction.get("quality_reason"),
        "ocr_pages_detected": extraction.get("ocr_pages_detected"),
        "ocr_pages_processed": extraction.get("ocr_pages_processed"),
        "ocr_error": extraction.get("ocr_error"),
        "word_count": extraction.get("word_count"),
    }

    # Find or link EvidenceItem
    ev_item = db.query(EvidenceItem).filter(
        EvidenceItem.owner_user_id == user.id,
        EvidenceItem.external_record_id == str(doc.id),
    ).first()

    if not ev_item:
        ev_item = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user.id,
            EvidenceItem.content_hash == doc.sha256_hash,
        ).first()

    if not ev_item:
        now = datetime.now(timezone.utc)
        ev_item = EvidenceItem(
            id=uuid.uuid4(),
            owner_user_id=user.id,
            source_provider=ev_provider,
            source_type="document",
            external_record_id=str(doc.id),
            source_url=doc.private_storage_key,
            source_name=doc.original_filename,
            evidence_category=doc.evidence_category,
            title=extraction.get("title") or doc.original_filename,
            description=f"Uploaded {doc.evidence_category.replace('_', ' ')}: {doc.original_filename} ({extraction.get('page_count', 1)} pages, {extraction.get('word_count', 0)} words)",
            extracted_excerpt=extraction.get("excerpt", "")[:500],
            observed_timestamp=now,
            contributor_identity=user.email,
            attribution_status="author",
            project_name=doc.original_filename,
            evidence_strength="insufficient" if not is_verified else "medium",
            extraction_confidence=0.0,
            verification_status="insufficient_evidence" if not is_verified else "unreviewed",
            processing_status="insufficient_content" if not is_verified else "ready_for_review",
            provenance={
                "original_filename": doc.original_filename,
                "sha256": doc.sha256_hash,
                "file_size": doc.file_size_bytes,
                "page_count": extraction.get("page_count", 1),
            },
            content_hash=doc.sha256_hash,
        )
        db.add(ev_item)
        db.flush()

    evidence_data = None
    if ev_item:
        ev_item.title = extraction.get("title") or ev_item.title or doc.original_filename
        ev_item.description = f"Uploaded {doc.evidence_category.replace('_', ' ')}: {doc.original_filename} ({extraction.get('page_count', 1)} pages, {extraction.get('word_count', 0)} words)"
        ev_item.extracted_excerpt = extraction.get("excerpt", "")[:500]
        ev_item.provenance = {
            **(ev_item.provenance or {}),
            "extraction_quality": extraction.get("extraction_quality"),
            "quality_reason": extraction.get("quality_reason"),
            "ocr_pages_detected": extraction.get("ocr_pages_detected"),
            "ocr_pages_processed": extraction.get("ocr_pages_processed"),
            "ocr_error": extraction.get("ocr_error"),
            "word_count": extraction.get("word_count"),
        }
        ev_item.normalized_metadata = {
            **(ev_item.normalized_metadata or {}),
            "extraction_quality": extraction.get("extraction_quality"),
            "quality_reason": extraction.get("quality_reason"),
            "word_count": extraction.get("word_count"),
        }

        full_content = extraction.get("full_text") or extraction.get("excerpt") or doc.original_filename
        evidence_data = await extraction_engine.process_and_persist_evidence(
            db=db,
            evidence_item=ev_item,
            content_text=full_content,
            source_provider=ev_provider,
            category=doc.evidence_category,
            user_id=user.id,
        )

    db.commit()

    return {
        "status": "success",
        "document_id": str(doc.id),
        "evidence_id": str(ev_item.id) if ev_item else None,
        "processing_state": doc.processing_state,
        "extraction_quality": extraction.get("extraction_quality"),
        "quality_reason": extraction.get("quality_reason"),
        "word_count": extraction.get("word_count"),
        "evidence": evidence_data,
        "candidateSkills": evidence_data.get("candidateSkills", []) if evidence_data else [],
    }
