"""
Skill-Gap Prioritization Module.
Deterministic, configurable prioritization engine implementing Section 5 rules.
Decouples confidence, verification, capability, and missing scores.
Never delegates deficiency decisions to an LLM.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from backend.app.learning.contracts import (
    ProficiencyTier,
    VerificationState,
    ImportanceLevel,
    GapClassification,
    TrajectoryTrend,
    UpstreamGapTrigger,
)


class PrioritizationReasonCode(str, Enum):
    LOW_CONFIDENCE_REVIEW = "LOW_CONFIDENCE_REVIEW"             # Evidence confidence < threshold (default 60%)
    UNVERIFIED_CANDIDATE = "UNVERIFIED_CANDIDATE"               # Skill is suggested/candidate, unverified by governance
    MISSING_ASSESSMENT_DATA = "MISSING_ASSESSMENT_DATA"         # Proficiency or assessment score is missing
    TARGET_ROLE_GAP = "TARGET_ROLE_GAP"                         # Verified skill below target role requirement
    LOW_ASSESSED_PROFICIENCY = "LOW_ASSESSED_PROFICIENCY"       # Assessed at foundational/beginner level
    EVIDENCE_GAP = "EVIDENCE_GAP"                               # Missing verifiable codebase artifacts
    STALE_EVALUATION = "STALE_EVALUATION"                       # Evaluation timestamp older than threshold
    DIFFERENTIATOR = "DIFFERENTIATOR"                           # Preferred/differentiating opportunity


class SuggestedNextAction(str, Enum):
    REQUEST_EVIDENCE = "request_evidence"                       # Solicit codebase/document proof
    RECOMMEND_DIAGNOSTIC = "recommend_diagnostic"               # Calibrate baseline via diagnostic check
    LABEL_PENDING_VERIFICATION = "label_pending_verification"   # Label as pending verification; avoid claiming mastery
    PRIORITIZE_SKILL_GAP_PATH = "prioritize_skill_gap_path"     # Add structured roadmap steps to bridge depth gap
    FOUNDATIONAL_PRACTICE = "foundational_practice"             # Recommend introductory concepts & code challenges
    APPLIED_MINI_PROJECT = "applied_mini_project"               # Produce verifiable capstone evidence
    REQUEST_ASSESSMENT = "request_assessment"                   # Take initial knowledge assessment


class PrioritizationResult(BaseModel):
    """
    Deterministic output schema for skill gap prioritization.
    Preserves original score and source provenance.
    """
    skill_id: str
    canonical_name: str
    priority_rank: int = Field(..., ge=1)
    priority_score: float = Field(..., ge=0.0)
    reason_code: PrioritizationReasonCode
    explanation: str
    suggested_next_action: SuggestedNextAction
    original_confidence: Optional[float] = None
    original_proficiency: Optional[str] = None
    target_proficiency: str
    input_provenance: Dict[str, Any] = Field(default_factory=dict)
    is_mastery_claimed: bool = False # Guaranteed False for unverified or low-confidence skills


class SkillGapPrioritizer:
    """
    Configurable, deterministic skill gap prioritizer.
    Guarantees that low confidence is never penalized as a skill deficiency.
    """

    def __init__(self, confidence_review_threshold: float = 0.60):
        self.confidence_review_threshold = confidence_review_threshold

    def evaluate_item(self, trigger: UpstreamGapTrigger) -> PrioritizationResult:
        """
        Evaluates a single trigger item and generates its prioritization result.
        """
        comp = trigger.competency
        cap = trigger.capability
        gov = trigger.governance
        
        # Provenance snapshot
        provenance = {
            "trigger_id": trigger.trigger_id,
            "role_id": trigger.role.role_id,
            "role_title": trigger.role.role_title,
            "source_confidence": gov.assessment_confidence,
            "source_verification": gov.verification_status.value,
            "supporting_evidence_count": len(gov.supporting_evidence_ids),
            "configured_threshold": self.confidence_review_threshold,
        }

        # Rule 1: Missing or unrecorded assessment data
        # Never invent a score! Request assessment instead.
        if cap.current_proficiency_numeric is None or cap.current_proficiency_level is None:
            return PrioritizationResult(
                skill_id=comp.canonical_skill_id,
                canonical_name=comp.canonical_name,
                priority_rank=trigger.priority_rank,
                priority_score=140.0,
                reason_code=PrioritizationReasonCode.MISSING_ASSESSMENT_DATA,
                explanation="No baseline proficiency score found in canonical passport. Request assessment to establish initial tier.",
                suggested_next_action=SuggestedNextAction.REQUEST_ASSESSMENT,
                original_confidence=gov.assessment_confidence,
                original_proficiency=None,
                target_proficiency=cap.target_proficiency_level.value,
                input_provenance=provenance,
                is_mastery_claimed=False,
            )

        # Rule 2: Low evidence confidence (< configurable threshold)
        # Low confidence -> request more evidence or recommend a diagnostic check.
        # MUST NOT be treated as proof of low skill!
        if gov.assessment_confidence is not None and gov.assessment_confidence < self.confidence_review_threshold:
            action = (
                SuggestedNextAction.REQUEST_EVIDENCE
                if len(gov.supporting_evidence_ids) == 0
                else SuggestedNextAction.RECOMMEND_DIAGNOSTIC
            )
            return PrioritizationResult(
                skill_id=comp.canonical_skill_id,
                canonical_name=comp.canonical_name,
                priority_rank=trigger.priority_rank,
                priority_score=150.0,
                reason_code=PrioritizationReasonCode.LOW_CONFIDENCE_REVIEW,
                explanation=(
                    f"Evidence confidence ({gov.assessment_confidence:.2f}) is below review threshold "
                    f"({self.confidence_review_threshold:.2f}). Uncertainty is high; initiating diagnostic check "
                    "or requesting additional source proof before establishing capability."
                ),
                suggested_next_action=action,
                original_confidence=gov.assessment_confidence,
                original_proficiency=cap.current_proficiency_level.value,
                target_proficiency=cap.target_proficiency_level.value,
                input_provenance=provenance,
                is_mastery_claimed=False,
            )

        # Rule 3: Unverified skill (status != verified)
        # Label as pending verification and avoid claiming confirmed mastery.
        if gov.verification_status != VerificationState.VERIFIED:
            return PrioritizationResult(
                skill_id=comp.canonical_skill_id,
                canonical_name=comp.canonical_name,
                priority_rank=trigger.priority_rank,
                priority_score=130.0,
                reason_code=PrioritizationReasonCode.UNVERIFIED_CANDIDATE,
                explanation=(
                    f"Skill status is '{gov.verification_status.value}'. Candidate claim has not passed "
                    "Trust & Governance citation validation. Labeled as pending verification; confirmed mastery cannot be asserted."
                ),
                suggested_next_action=SuggestedNextAction.LABEL_PENDING_VERIFICATION,
                original_confidence=gov.assessment_confidence,
                original_proficiency=cap.current_proficiency_level.value,
                target_proficiency=cap.target_proficiency_level.value,
                input_provenance=provenance,
                is_mastery_claimed=False,
            )

        # Rule 4: Evidence gap
        if trigger.gap_type == GapClassification.EVIDENCE_GAP:
            return PrioritizationResult(
                skill_id=comp.canonical_skill_id,
                canonical_name=comp.canonical_name,
                priority_rank=trigger.priority_rank,
                priority_score=160.0,
                reason_code=PrioritizationReasonCode.EVIDENCE_GAP,
                explanation="Demonstrated theoretical or self-reported competency, but lacks verifiable codebase/PR proof. Assigning Applied Mini-Project.",
                suggested_next_action=SuggestedNextAction.APPLIED_MINI_PROJECT,
                original_confidence=gov.assessment_confidence,
                original_proficiency=cap.current_proficiency_level.value,
                target_proficiency=cap.target_proficiency_level.value,
                input_provenance=provenance,
                is_mastery_claimed=False,
            )

        # Rule 5: Low assessed proficiency (Foundational or Level 1)
        if cap.current_proficiency_numeric <= 1:
            return PrioritizationResult(
                skill_id=comp.canonical_skill_id,
                canonical_name=comp.canonical_name,
                priority_rank=trigger.priority_rank,
                priority_score=170.0,
                reason_code=PrioritizationReasonCode.LOW_ASSESSED_PROFICIENCY,
                explanation="Verified capability is at introductory/foundational level. Recommending core concepts and guided practice.",
                suggested_next_action=SuggestedNextAction.FOUNDATIONAL_PRACTICE,
                original_confidence=gov.assessment_confidence,
                original_proficiency=cap.current_proficiency_level.value,
                target_proficiency=cap.target_proficiency_level.value,
                input_provenance=provenance,
                is_mastery_claimed=True, # Verified Foundation level is legitimate
            )

        # Rule 6: Verified skill below a target role's required proficiency (Depth Gap)
        # Target: Level 3 or 4; Current: Level 2 -> Prioritize skill-gap path
        level_gap = max(0, cap.target_proficiency_numeric - cap.current_proficiency_numeric)
        if level_gap > 0:
            return PrioritizationResult(
                skill_id=comp.canonical_skill_id,
                canonical_name=comp.canonical_name,
                priority_rank=trigger.priority_rank,
                priority_score=180.0 + (level_gap * 10),
                reason_code=PrioritizationReasonCode.TARGET_ROLE_GAP,
                explanation=(
                    f"Verified at {cap.current_proficiency_level.value} (Level {cap.current_proficiency_numeric}), "
                    f"but target role '{trigger.role.role_title}' requires {cap.target_proficiency_level.value} "
                    f"(Level {cap.target_proficiency_numeric}). Prioritizing depth-gap roadmap."
                ),
                suggested_next_action=SuggestedNextAction.PRIORITIZE_SKILL_GAP_PATH,
                original_confidence=gov.assessment_confidence,
                original_proficiency=cap.current_proficiency_level.value,
                target_proficiency=cap.target_proficiency_level.value,
                input_provenance=provenance,
                is_mastery_claimed=True,
            )

        # Rule 7: Differentiator opportunity
        return PrioritizationResult(
            skill_id=comp.canonical_skill_id,
            canonical_name=comp.canonical_name,
            priority_rank=trigger.priority_rank,
            priority_score=80.0,
            reason_code=PrioritizationReasonCode.DIFFERENTIATOR,
            explanation="Proficiency meets or exceeds target requirement. Strategic differentiator.",
            suggested_next_action=SuggestedNextAction.PRIORITIZE_SKILL_GAP_PATH,
            original_confidence=gov.assessment_confidence,
            original_proficiency=cap.current_proficiency_level.value,
            target_proficiency=cap.target_proficiency_level.value,
            input_provenance=provenance,
            is_mastery_claimed=True,
        )

    def prioritize_batch(self, triggers: List[UpstreamGapTrigger]) -> List[PrioritizationResult]:
        """
        Prioritizes a collection of upstream triggers, sorting by priority score descending.
        """
        results = [self.evaluate_item(t) for t in triggers]
        results.sort(key=lambda r: r.priority_score, reverse=True)
        # Re-assign ordinal ranks
        for idx, res in enumerate(results):
            res.priority_rank = idx + 1
        return results
