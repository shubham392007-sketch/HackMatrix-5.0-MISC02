import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.core.logging import get_logger
from backend.app.models.evidence import EvidenceItem
from backend.app.models.taxonomy import EvidenceCompetencyMapping, CompetencyTaxonomy
from backend.app.models.ai_governance import (
    VerificationDecision,
    HumanReviewTask,
    HallucinationGuardResult,
    EvidenceConflictRecord,
)
from backend.app.models.audit import ReviewAuditEvent

logger = get_logger("ai.verification_service")

VALID_VERIFICATION_STATES = {
    "unreviewed",
    "candidate",
    "partially_supported",
    "insufficient_evidence",
    "verified",
    "rejected",
}


class VerificationService:
    def review_candidate_skill(
        self,
        db: Session,
        owner_user_id: uuid.UUID,
        candidate_mapping_id: uuid.UUID,
        action: str,  # "verify", "reject", "flag_insufficient", "partially_support"
        rationale: str,
        reviewer_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Executes formal verification review on a candidate mapping.
        Only explicit reviewer actions or deterministic verification rules can set 'verified'.
        """
        mapping = db.query(EvidenceCompetencyMapping).filter(
            EvidenceCompetencyMapping.id == candidate_mapping_id,
            EvidenceCompetencyMapping.owner_user_id == owner_user_id,
        ).first()

        if not mapping:
            raise ValueError(f"Candidate mapping {candidate_mapping_id} not found")

        # Map action to canonical state
        action_state_map = {
            "verify": "verified",
            "reject": "rejected",
            "flag_insufficient": "insufficient_evidence",
            "partially_support": "partially_supported",
        }
        new_state = action_state_map.get(action.lower())
        if not new_state:
            raise ValueError(f"Invalid verification action '{action}'")

        # Check: If attempting to verify, ensure no BLOCK guard result or open conflict
        if new_state == "verified":
            open_conflicts = db.query(EvidenceConflictRecord).filter(
                EvidenceConflictRecord.owner_user_id == owner_user_id,
                EvidenceConflictRecord.status == "open",
                ((EvidenceConflictRecord.evidence_a_id == mapping.evidence_id) | (EvidenceConflictRecord.evidence_b_id == mapping.evidence_id)),
            ).count()

            if open_conflicts > 0:
                raise ValueError("Cannot verify skill: active unresolved evidence conflicts exist for this artifact.")

            blocked_guard = db.query(HallucinationGuardResult).filter(
                HallucinationGuardResult.evidence_id == mapping.evidence_id,
                HallucinationGuardResult.guard_outcome == "BLOCK",
            ).first()

            if blocked_guard:
                raise ValueError(f"Cannot verify skill: Hallucination Guard blocked this evidence ({blocked_guard.reason_codes}).")

        prev_state = mapping.status
        mapping.status = new_state
        db.flush()

        # Persist VerificationDecision
        decision = VerificationDecision(
            id=uuid.uuid4(),
            candidate_mapping_id=mapping.id,
            competency_id=mapping.competency_id,
            owner_user_id=owner_user_id,
            reviewer_user_id=reviewer_id or owner_user_id,
            verification_state=new_state,
            decision_rationale=rationale,
            rule_version="policy-v2026.1",
            supporting_evidence_ids=[str(mapping.evidence_id)],
            conflict_ids=[],
        )
        db.add(decision)

        # Log ReviewAuditEvent
        audit_event = ReviewAuditEvent(
            id=uuid.uuid4(),
            actor_user_id=reviewer_id or owner_user_id,
            target_record_id=mapping.id,
            target_record_type="competency_mapping",
            event_type="verification_granted" if new_state == "verified" else "status_change",
            previous_state=prev_state,
            new_state=new_state,
            reason_note=rationale,
            audit_metadata={"decision_id": str(decision.id), "proficiency": mapping.proficiency_level},
        )
        db.add(audit_event)

        db.commit()
        logger.info(f"Candidate mapping {mapping.id} transitioned from {prev_state} to {new_state} (decision: {decision.id})")

        comp_name = None
        comp_category = None
        if mapping.competency:
            comp_name = mapping.competency.canonical_name
            comp_category = mapping.competency.category
        elif mapping.competency_id:
            comp = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == mapping.competency_id).first()
            if comp:
                comp_name = comp.canonical_name
                comp_category = comp.category

        return {
            "decision_id": str(decision.id),
            "mapping_id": str(mapping.id),
            "previous_state": prev_state,
            "verification_state": new_state,
            "rationale": rationale,
            "created_at": decision.created_at.isoformat() if decision.created_at else None,
            "skill_name": comp_name,
            "category": comp_category,
            "proficiency_level": mapping.proficiency_level,
            "confidence_score": mapping.relevance_score,
            "evidence_id": str(mapping.evidence_id) if mapping.evidence_id else None,
        }

    def create_review_task(
        self,
        db: Session,
        owner_user_id: uuid.UUID,
        task_type: str,
        priority: str,
        title: str,
        description: str,
        evidence_id: Optional[uuid.UUID] = None,
        candidate_mapping_id: Optional[uuid.UUID] = None,
        conflict_id: Optional[uuid.UUID] = None,
    ) -> HumanReviewTask:
        """Creates a pending human review task."""
        task = HumanReviewTask(
            id=uuid.uuid4(),
            owner_user_id=owner_user_id,
            task_type=task_type,
            priority=priority,
            status="pending",
            title=title,
            description=description,
            evidence_id=evidence_id,
            candidate_mapping_id=candidate_mapping_id,
            conflict_id=conflict_id,
        )
        db.add(task)
        db.commit()
        return task

    def action_review_task(
        self,
        db: Session,
        owner_user_id: uuid.UUID,
        task_id: uuid.UUID,
        action: str,  # approve, reject, escalate
        reviewer_notes: str,
        reviewer_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """Resolves a human review task and cascades decisions."""
        task = db.query(HumanReviewTask).filter(
            HumanReviewTask.id == task_id,
            HumanReviewTask.owner_user_id == owner_user_id,
        ).first()

        if not task:
            raise ValueError(f"Review task {task_id} not found")

        status_map = {
            "approve": "approved",
            "reject": "rejected",
            "escalate": "escalated",
        }
        task.status = status_map.get(action.lower(), "approved")
        task.reviewer_action = action
        task.reviewer_notes = reviewer_notes
        task.reviewed_at = datetime.utcnow()
        task.assigned_to = reviewer_id or owner_user_id

        # If task had candidate mapping and was approved, verify candidate
        if task.candidate_mapping_id and action == "approve":
            self.review_candidate_skill(
                db=db,
                owner_user_id=owner_user_id,
                candidate_mapping_id=task.candidate_mapping_id,
                action="verify",
                rationale=f"Approved via human review task {task.id}: {reviewer_notes}",
                reviewer_id=reviewer_id,
            )

        db.commit()
        return {
            "task_id": str(task.id),
            "status": task.status,
            "reviewer_action": task.reviewer_action,
            "reviewed_at": task.reviewed_at.isoformat(),
        }


verification_service = VerificationService()
