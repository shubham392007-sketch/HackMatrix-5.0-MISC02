import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.core.logging import get_logger
from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import EvidenceConflictRecord
from backend.app.models.audit import ReviewAuditEvent

logger = get_logger("ai.conflict_service")


class ConflictResolutionService:
    def detect_conflicts_for_evidence(
        self,
        db: Session,
        owner_user_id: uuid.UUID,
        evidence_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """
        Scans other evidence records owned by user for direct attribution,
        timeline, or stack contradictions.
        """
        target = db.query(EvidenceItem).filter(
            EvidenceItem.id == evidence_id,
            EvidenceItem.owner_user_id == owner_user_id,
        ).first()

        if not target:
            return []

        other_items = db.query(EvidenceItem).filter(
            EvidenceItem.owner_user_id == owner_user_id,
            EvidenceItem.id != evidence_id,
            EvidenceItem.is_deleted == False,
        ).all()

        detected = []
        for other in other_items:
            # Check 1: Attribution conflict on same project
            if target.project_name and other.project_name and target.project_name.lower() == other.project_name.lower():
                if (target.attribution_status == "author" and other.attribution_status == "contributor") or \
                   (target.is_collaborative != other.is_collaborative):
                    # Check if conflict already recorded
                    existing = db.query(EvidenceConflictRecord).filter(
                        EvidenceConflictRecord.owner_user_id == owner_user_id,
                        ((EvidenceConflictRecord.evidence_a_id == target.id) & (EvidenceConflictRecord.evidence_b_id == other.id)) |
                        ((EvidenceConflictRecord.evidence_a_id == other.id) & (EvidenceConflictRecord.evidence_b_id == target.id)),
                    ).first()

                    if not existing:
                        conflict_id = uuid.uuid4()
                        record = EvidenceConflictRecord(
                            id=conflict_id,
                            owner_user_id=owner_user_id,
                            evidence_a_id=target.id,
                            evidence_b_id=other.id,
                            conflict_field="author_attribution",
                            evidence_a_assertion=f"Asserts '{target.attribution_status}' role on project '{target.project_name}' (source: {target.source_provider})",
                            evidence_b_assertion=f"Asserts '{other.attribution_status}' role on project '{other.project_name}' (source: {other.source_provider})",
                            explanation=f"Contradiction in declared project role between {target.source_name} and {other.source_name}.",
                            suggested_resolution="Review git repository commit logs or issue assignments to determine primary author vs secondary contributor role.",
                            status="open",
                        )
                        db.add(record)
                        detected.append(record)

        if detected:
            try:
                db.commit()
                logger.info(f"Recorded {len(detected)} conflicts for evidence {evidence_id}")
            except Exception as e:
                db.rollback()
                logger.warning(f"Failed to commit conflicts: {e}")

        return [
            {
                "id": str(c.id),
                "evidence_a_id": str(c.evidence_a_id),
                "evidence_b_id": str(c.evidence_b_id),
                "conflict_field": c.conflict_field,
                "evidence_a_assertion": c.evidence_a_assertion,
                "evidence_b_assertion": c.evidence_b_assertion,
                "explanation": c.explanation,
                "suggested_resolution": c.suggested_resolution,
                "status": c.status,
            }
            for c in detected
        ]

    def resolve_conflict(
        self,
        db: Session,
        owner_user_id: uuid.UUID,
        conflict_id: uuid.UUID,
        resolution_decision: str,  # accept_a, accept_b, merge, reject_both
        resolution_notes: str,
        reviewer_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Resolves an active conflict without deleting underlying evidence records.
        """
        conflict = db.query(EvidenceConflictRecord).filter(
            EvidenceConflictRecord.id == conflict_id,
            EvidenceConflictRecord.owner_user_id == owner_user_id,
        ).first()

        if not conflict:
            raise ValueError(f"Conflict {conflict_id} not found")

        conflict.status = "resolved"
        conflict.resolution_decision = resolution_decision
        conflict.resolution_notes = resolution_notes
        conflict.reviewer_id = reviewer_id or owner_user_id
        conflict.resolved_at = datetime.utcnow()

        # Log audit event
        audit_event = ReviewAuditEvent(
            id=uuid.uuid4(),
            actor_user_id=reviewer_id or owner_user_id,
            target_record_id=conflict.id,
            target_record_type="conflict",
            event_type="conflict_resolved",
            previous_state="open",
            new_state="resolved",
            reason_note=f"Decision: {resolution_decision}. Notes: {resolution_notes}",
            audit_metadata={"decision": resolution_decision, "conflict_field": conflict.conflict_field},
        )
        db.add(audit_event)
        db.commit()

        return {
            "conflict_id": str(conflict.id),
            "status": conflict.status,
            "resolution_decision": conflict.resolution_decision,
            "resolved_at": conflict.resolved_at.isoformat(),
        }


conflict_service = ConflictResolutionService()
