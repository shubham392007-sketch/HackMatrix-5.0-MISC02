import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, func

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.evidence import EvidenceItem, EvidenceRelationship
from backend.app.models.audit import ReviewAuditEvent
from backend.app.models.document import UploadedDocument, DocumentChunk
from backend.app.models.taxonomy import EvidenceCompetencyMapping
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
from backend.app.core.logging import get_logger

logger = get_logger("api.evidence")
router = APIRouter(prefix="/evidence", tags=["Evidence Intelligence & Library"])


class EvidenceReviewRequest(BaseModel):
    verification_status: str = Field(..., description="'verified', 'disputed', or 'unreviewed'")
    reviewer_notes: Optional[str] = Field(None, description="Notes or justification for review decision")


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Natural language search query")
    category: Optional[str] = None
    limit: int = Field(default=10, le=50)


@router.get("")
def list_evidence(
    category: Optional[str] = None,
    provider: Optional[str] = None,
    strength: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists evidence items with filtering and summary metrics.
    Preserves strict separation between evidence ingestion and verification.
    """
    query = db.query(EvidenceItem).filter(
        EvidenceItem.owner_user_id == user.id,
        EvidenceItem.is_deleted == False,
    )

    if category:
        query = query.filter(EvidenceItem.evidence_category == category)
    if provider:
        query = query.filter(EvidenceItem.source_provider == provider)
    if strength:
        query = query.filter(EvidenceItem.evidence_strength == strength)
    if status_filter:
        query = query.filter(EvidenceItem.verification_status == status_filter)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                EvidenceItem.title.ilike(search_pattern),
                EvidenceItem.description.ilike(search_pattern),
                EvidenceItem.extracted_excerpt.ilike(search_pattern),
            )
        )

    total_count = query.count()
    items = (
        query.options(
            selectinload(EvidenceItem.competency_mappings).selectinload(EvidenceCompetencyMapping.competency)
        )
        .order_by(EvidenceItem.observed_timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Calculate summary metrics via single-pass SQL aggregations instead of loading all rows
    status_counts_rows = db.query(
        EvidenceItem.verification_status,
        func.count(EvidenceItem.id)
    ).filter(
        EvidenceItem.owner_user_id == user.id,
        EvidenceItem.is_deleted == False,
    ).group_by(EvidenceItem.verification_status).all()
    status_counts = dict(status_counts_rows)
    verified_count = status_counts.get("verified", 0)
    unreviewed_count = status_counts.get("unreviewed", 0)
    disputed_count = status_counts.get("disputed", 0)
    total_user_items = sum(status_counts.values())

    # Provider breakdown via SQL aggregation
    provider_counts_rows = db.query(
        EvidenceItem.source_provider,
        func.count(EvidenceItem.id)
    ).filter(
        EvidenceItem.owner_user_id == user.id,
        EvidenceItem.is_deleted == False,
    ).group_by(EvidenceItem.source_provider).all()
    provider_counts = dict(provider_counts_rows)

    results = []
    for item in items:
        candidate_skills = []
        if hasattr(item, "competency_mappings") and item.competency_mappings:
            for m in item.competency_mappings:
                candidate_skills.append({
                    "id": str(m.id),
                    "name": m.competency.canonical_name if m.competency else "Competency",
                    "category": m.competency.category if m.competency else "General",
                    "excerpt": m.supporting_excerpt,
                    "associationReason": m.rationale,
                    "status": m.status,
                    "proficiencyLevel": m.proficiency_level,
                })

        results.append({
            "id": str(item.id),
            "externalRecordId": item.external_record_id,
            "title": item.title,
            "description": item.description,
            "category": item.evidence_category,
            "provider": item.source_provider,
            "sourceType": item.source_type,
            "sourceName": item.source_name,
            "sourceUrl": item.source_url,
            "extractedExcerpt": item.extracted_excerpt,
            "extractedSummary": item.extracted_summary or item.description,
            "candidateSkills": candidate_skills,
            "strength": item.evidence_strength,
            "confidence": item.extraction_confidence,
            "verificationStatus": item.verification_status,
            "processingStatus": item.processing_status,
            "attributionStatus": item.attribution_status,
            "observedAt": item.observed_timestamp.isoformat() if item.observed_timestamp else None,
            "provenance": item.provenance or {},
            "metadata": item.normalized_metadata or {},
        })

    return {
        "items": results,
        "total": total_count,
        "page": page,
        "pageSize": page_size,
        "summary": {
            "totalEvidence": total_user_items,
            "verifiedEvidence": verified_count,
            "unreviewedEvidence": unreviewed_count,
            "disputedEvidence": disputed_count,
            "providers": provider_counts,
        },
    }


@router.get("/{evidence_id}")
def get_evidence_detail(
    evidence_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves single evidence item with complete provenance and audit logs."""
    try:
        e_uuid = uuid.UUID(evidence_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evidence UUID")

    item = (
        db.query(EvidenceItem)
        .options(
            selectinload(EvidenceItem.competency_mappings).selectinload(EvidenceCompetencyMapping.competency)
        )
        .filter(
            EvidenceItem.id == e_uuid,
            EvidenceItem.owner_user_id == user.id,
            EvidenceItem.is_deleted == False,
        )
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    # Fetch audit events for this evidence
    audits = db.query(ReviewAuditEvent).filter(
        ReviewAuditEvent.target_record_id == item.id,
    ).order_by(ReviewAuditEvent.event_timestamp.desc()).all()

    audit_trail = [
        {
            "id": str(a.id),
            "eventType": a.event_type,
            "previousState": a.previous_state,
            "newState": a.new_state,
            "reasonNote": a.reason_note,
            "timestamp": a.event_timestamp.isoformat() if a.event_timestamp else None,
        }
        for a in audits
    ]

    candidate_skills = []
    if hasattr(item, "competency_mappings") and item.competency_mappings:
        for m in item.competency_mappings:
            candidate_skills.append({
                "id": str(m.id),
                "name": m.competency.canonical_name if m.competency else "Competency",
                "category": m.competency.category if m.competency else "General",
                "excerpt": m.supporting_excerpt,
                "associationReason": m.rationale,
                "status": m.status,
                "proficiencyLevel": m.proficiency_level,
            })

    return {
        "id": str(item.id),
        "externalRecordId": item.external_record_id,
        "title": item.title,
        "description": item.description,
        "category": item.evidence_category,
        "provider": item.source_provider,
        "sourceType": item.source_type,
        "sourceName": item.source_name,
        "sourceUrl": item.source_url,
        "extractedExcerpt": item.extracted_excerpt,
        "extractedSummary": item.extracted_summary or item.description,
        "candidateSkills": candidate_skills,
        "strength": item.evidence_strength,
        "confidence": item.extraction_confidence,
        "verificationStatus": item.verification_status,
        "processingStatus": item.processing_status,
        "attributionStatus": item.attribution_status,
        "observedAt": item.observed_timestamp.isoformat() if item.observed_timestamp else None,
        "provenance": item.provenance or {},
        "normalizedMetadata": item.normalized_metadata or {},
        "auditTrail": audit_trail,
    }


@router.post("/{evidence_id}/review")
def review_evidence_item(
    evidence_id: str,
    payload: EvidenceReviewRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Explicitly updates verification status of an evidence item.
    Enforces audit logging. Ingestion NEVER verifies skills automatically.
    """
    try:
        e_uuid = uuid.UUID(evidence_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evidence UUID")

    if payload.verification_status not in ["verified", "disputed", "unreviewed"]:
        raise HTTPException(status_code=400, detail="Invalid verification status. Allowed: 'verified', 'disputed', 'unreviewed'")

    item = db.query(EvidenceItem).filter(
        EvidenceItem.id == e_uuid,
        EvidenceItem.owner_user_id == user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    old_status = item.verification_status
    item.verification_status = payload.verification_status
    item.processing_status = "reviewed"
    item.reviewed_at = datetime.now(timezone.utc)
    item.reviewed_by_user_id = uuid.UUID(user.id)
    item.reviewer_notes = payload.reviewer_notes

    # Create immutable audit record
    audit = ReviewAuditEvent(
        id=uuid.uuid4(),
        actor_user_id=user.id,
        target_record_id=item.id,
        target_record_type="evidence_item",
        event_type="verification_status_updated",
        previous_state=old_status,
        new_state=payload.verification_status,
        reason_note=payload.reviewer_notes or f"Status changed to {payload.verification_status}",
    )
    db.add(audit)
    db.commit()

    # Update ChromaDB vector index
    chroma_store.index_evidence_item(
        evidence_id=str(item.id),
        owner_user_id=str(user.id),
        title=item.title,
        description=item.description,
        excerpt=item.extracted_excerpt,
        source_provider=item.source_provider,
        category=item.evidence_category,
        strength=item.evidence_strength,
        verification_status=payload.verification_status,
    )

    return {
        "status": "success",
        "evidence_id": str(item.id),
        "previous_status": old_status,
        "new_status": payload.verification_status,
        "reviewer_notes": payload.reviewer_notes,
    }


@router.post("/search")
def search_evidence_vectors(
    payload: SemanticSearchRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Semantic vector search across indexed evidence items using ChromaDB."""
    results = chroma_store.search_evidence(
        query=payload.query,
        owner_user_id=user.id,
        n_results=payload.limit,
        category=payload.category,
    )
    return {
        "query": payload.query,
        "results": results,
        "total_hits": len(results),
    }


@router.delete("/{evidence_id}")
def delete_evidence_item(
    evidence_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes an evidence record, cleans up vector embeddings in ChromaDB,
    associated skill mappings, AI governance artifacts, and uploaded document binaries
    if no other evidence items reference them.
    Ensures that re-uploading the same artifact will proceed smoothly without hash conflicts.
    """
    try:
        e_uuid = uuid.UUID(evidence_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evidence UUID")

    item = db.query(EvidenceItem).filter(
        EvidenceItem.id == e_uuid,
        EvidenceItem.owner_user_id == user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    title = item.title
    item_content_hash = item.content_hash
    item_external_id = item.external_record_id
    item_doc_id = item.document_id

    # 1. Remove vector embedding from ChromaDB
    try:
        chroma_store.delete_evidence_item(str(item.id))
    except Exception as e:
        logger.warning(f"Error removing {item.id} from ChromaDB: {e}")

    # 2. Clean up associated AI governance & taxonomy relational records
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
        logger.warning(f"Warning during relational cleanup for evidence {item.id}: {e}")

    # 3. Check for associated UploadedDocument
    doc_to_delete = None
    if item_doc_id:
        doc_to_delete = db.query(UploadedDocument).filter(
            UploadedDocument.id == item_doc_id,
            UploadedDocument.owner_user_id == user.id,
        ).first()

    if not doc_to_delete and item_external_id:
        try:
            ext_uuid = uuid.UUID(item_external_id)
            doc_to_delete = db.query(UploadedDocument).filter(
                UploadedDocument.id == ext_uuid,
                UploadedDocument.owner_user_id == user.id,
            ).first()
        except ValueError:
            pass

    if not doc_to_delete and item_content_hash:
        doc_to_delete = db.query(UploadedDocument).filter(
            UploadedDocument.sha256_hash == item_content_hash,
            UploadedDocument.owner_user_id == user.id,
        ).first()

    # If an uploaded document is linked, verify if any OTHER evidence item still uses it
    if doc_to_delete:
        other_evidence = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == user.id,
            EvidenceItem.id != item.id,
            or_(
                EvidenceItem.document_id == doc_to_delete.id,
                EvidenceItem.external_record_id == str(doc_to_delete.id),
                EvidenceItem.content_hash == doc_to_delete.sha256_hash,
            )
        ).first()

        if not other_evidence:
            logger.info(f"Removing associated UploadedDocument {doc_to_delete.id} and storage binary")
            # Delete document chunks
            db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_to_delete.id).delete(synchronize_session=False)
            # Delete ingestion jobs related to this doc
            db.query(IngestionJob).filter(
                IngestionJob.owner_user_id == user.id,
                IngestionJob.idempotency_key == f"doc-{doc_to_delete.id}",
            ).delete(synchronize_session=False)
            # Delete physical file from storage
            storage_manager.delete_file(doc_to_delete.private_storage_key)
            # Delete UploadedDocument row
            db.delete(doc_to_delete)

    # 4. Finally, delete the EvidenceItem itself
    db.delete(item)
    db.commit()

    logger.info(f"Successfully deleted evidence record {evidence_id} ('{title}') for user {user.id}")

    return {
        "status": "deleted",
        "evidence_id": evidence_id,
        "message": f"Evidence record '{title}' successfully deleted.",
    }

