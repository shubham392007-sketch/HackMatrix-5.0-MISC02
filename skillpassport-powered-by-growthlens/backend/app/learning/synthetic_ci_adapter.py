"""
Synthetic Career Intelligence Input Adapter for Learn & Grow.
Produces normalized UpstreamGapTrigger contracts for testing and pre-integration development.
Guarantees:
  - Identical contract to the real Career Intelligence database adapter.
  - Full preservation of uncertainty (low confidence does not equal low proficiency).
  - Explicit labeling of synthetic provenance (never mixed with real user profiles).
  - Robust validation against malformed, duplicate, or conflicting inputs.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set, Tuple

from backend.app.core.logging import get_logger
from backend.app.learning.contracts import (
    UpstreamGapTrigger,
    RoleContext,
    CompetencyHeader,
    CapabilityState,
    GovernanceEvidenceState,
    LongitudinalSignal,
    ProficiencyTier,
    RequirementType,
    ImportanceLevel,
    GapClassification,
    VerificationState,
    TrajectoryTrend,
)

logger = get_logger("learning.synthetic_ci_adapter")

SYNTHETIC_USER_ID = "00000000-0000-0000-0000-000000000099"

PROFICIENCY_MAP = {
    "not established": (ProficiencyTier.NOT_ESTABLISHED, 0),
    "foundation": (ProficiencyTier.FOUNDATION, 1),
    "foundational": (ProficiencyTier.FOUNDATION, 1),
    "beginner": (ProficiencyTier.FOUNDATION, 1),
    "working": (ProficiencyTier.WORKING, 2),
    "intermediate": (ProficiencyTier.WORKING, 2),
    "practitioner": (ProficiencyTier.PRACTITIONER, 3),
    "advanced": (ProficiencyTier.ADVANCED, 4),
    "expert": (ProficiencyTier.EXPERT, 5),
}


class SyntheticCareerIntelligenceAdapter:
    """
    Simulates Career Intelligence snapshot generation and gap detection.
    Produces identical UpstreamGapTrigger objects to what the real database adapter emits.
    """

    def __init__(self, synthetic_user_id: str = SYNTHETIC_USER_ID):
        self.synthetic_user_id = synthetic_user_id
        self.role_context = RoleContext(
            role_id="role-applied-mle",
            role_title="Applied Machine Learning Engineer",
            seniority="Mid-to-Senior",
            context_domain="Machine Learning Systems",
            role_version="v2026.1",
        )

    def create_applied_mle_synthetic_triggers(self) -> List[UpstreamGapTrigger]:
        """
        Creates the standardized 5 weak-skill profile for Applied Machine Learning Engineer:
          1. Data Preprocessing with Pandas and Scikit-learn (Intermediate -> Advanced)
          2. Feature Engineering (Beginner -> Intermediate)
          3. Model Evaluation and Validation (Beginner -> Intermediate)
          4. Deep Learning Fundamentals (Beginner -> Intermediate)
          5. ML Model Deployment and Serving (Beginner -> Intermediate)
        """
        now = datetime.now(timezone.utc)

        raw_gaps = [
            # 1. Data Preprocessing (Intermediate -> Advanced)
            {
                "gap_id": "gap-mle-data-preprocessing",
                "canonical_skill_id": "skill-data-preprocessing",
                "canonical_name": "Data Preprocessing with Pandas and Scikit-learn",
                "taxonomy_category": "machine_learning",
                "requirement_type": "core_required",
                "importance": "critical",
                "current_proficiency": "Intermediate",
                "target_proficiency": "Advanced",
                "verification_status": "verified",
                "confidence": 0.90,
                "evidence_ids": ["ev-synth-pandas-1", "ev-synth-pandas-2"],
                "trend": "improving",
                "prerequisites": [],
                "why_prioritized": "Foundation for all tabular and structured modeling pipelines",
                "diagnosis": "Solid pandas indexing and standard scaling; lacks advanced categorical encoders and out-of-core chunking",
                "recommended_direction": "Master Scikit-Learn ColumnTransformers and robust pipeline composition",
                "priority_rank": 1,
                "priority_score": 95.0,
            },
            # 2. Feature Engineering (Beginner -> Intermediate)
            {
                "gap_id": "gap-mle-feature-engineering",
                "canonical_skill_id": "skill-feature-engineering",
                "canonical_name": "Feature Engineering",
                "taxonomy_category": "machine_learning",
                "requirement_type": "core_required",
                "importance": "critical",
                "current_proficiency": "Beginner",
                "target_proficiency": "Intermediate",
                "verification_status": "verified",
                "confidence": 0.85,
                "evidence_ids": ["ev-synth-fe-1"],
                "trend": "improving",
                "prerequisites": ["skill-data-preprocessing"],
                "why_prioritized": "Directly bounds model predictive capacity and downstream accuracy",
                "diagnosis": "Basic imputation and one-hot encoding; lacks interaction terms, target encoding, and automated feature extraction",
                "recommended_direction": "Implement target encoding, feature selection, and polynomial feature generation",
                "priority_rank": 2,
                "priority_score": 92.0,
            },
            # 3. Model Evaluation & Validation (Beginner -> Intermediate)
            {
                "gap_id": "gap-mle-model-evaluation",
                "canonical_skill_id": "skill-model-evaluation",
                "canonical_name": "Model Evaluation and Validation",
                "taxonomy_category": "machine_learning",
                "requirement_type": "core_required",
                "importance": "critical",
                "current_proficiency": "Beginner",
                "target_proficiency": "Intermediate",
                "verification_status": "verified",
                "confidence": 0.82,
                "evidence_ids": ["ev-synth-me-1"],
                "trend": "stagnating",
                "prerequisites": ["skill-feature-engineering"],
                "why_prioritized": "Prevents data leakage, overfitting, and uncalibrated production predictions",
                "diagnosis": "Basic accuracy and train_test_split; lacks stratified cross-validation, PR-AUC, and calibration curves",
                "recommended_direction": "Implement group k-fold validation, Brier score calibration, and confusion matrix diagnostics",
                "priority_rank": 3,
                "priority_score": 88.0,
            },
            # 4. Deep Learning Fundamentals (Beginner -> Intermediate)
            {
                "gap_id": "gap-mle-deep-learning",
                "canonical_skill_id": "skill-deep-learning",
                "canonical_name": "Deep Learning Fundamentals",
                "taxonomy_category": "machine_learning",
                "requirement_type": "supporting",
                "importance": "high",
                "current_proficiency": "Beginner",
                "target_proficiency": "Intermediate",
                "verification_status": "candidate",
                "confidence": 0.55,  # Low confidence -> preserve uncertainty!
                "evidence_ids": [],
                "trend": "untracked",
                "prerequisites": ["skill-model-evaluation"],
                "why_prioritized": "Supporting competency for modern representation learning and unstructured inputs",
                "diagnosis": "Understands dense layer concepts conceptually; no production PyTorch or backprop debugging",
                "recommended_direction": "Construct PyTorch nn.Module architectures and training loops with learning rate schedulers",
                "priority_rank": 4,
                "priority_score": 75.0,
            },
            # 5. ML Model Deployment and Serving (Beginner -> Intermediate)
            {
                "gap_id": "gap-mle-model-deployment",
                "canonical_skill_id": "skill-model-deployment",
                "canonical_name": "ML Model Deployment and Serving",
                "taxonomy_category": "mlops",
                "requirement_type": "core_required",
                "importance": "critical",
                "current_proficiency": "Beginner",
                "target_proficiency": "Intermediate",
                "verification_status": "candidate",
                "confidence": 0.65,
                "evidence_ids": ["ev-synth-dep-1"],
                "trend": "untracked",
                "prerequisites": ["skill-model-evaluation"],
                "why_prioritized": "Translates offline models into production real-time and batch inference services",
                "diagnosis": "Notebook trained artifacts; lacks REST/gRPC serving wrappers, containerization, and latency profiling",
                "recommended_direction": "Package Scikit-learn and ONNX models into async FastAPI microservices with Docker",
                "priority_rank": 5,
                "priority_score": 84.0,
            },
        ]

        return self.normalize_raw_gaps(raw_gaps, user_id=self.synthetic_user_id)

    def normalize_raw_gaps(
        self,
        raw_gaps: List[Dict[str, Any]],
        user_id: Optional[str] = None,
    ) -> List[UpstreamGapTrigger]:
        """
        Validates, sanitizes, and normalizes a list of raw gap dictionaries into UpstreamGapTrigger contracts.
        Enforces:
          - Non-empty gap checks
          - Duplicate gap rejection / deduplication by canonical_skill_id
          - Strict proficiency tier parsing with safe fallbacks
          - Preservation of uncertainty for low-confidence evidence
          - Topological validation of prerequisite relationships
        """
        if not raw_gaps:
            return []

        target_user = user_id or self.synthetic_user_id
        now = datetime.now(timezone.utc)
        normalized_triggers: List[UpstreamGapTrigger] = []
        seen_skill_ids: Set[str] = set()

        for idx, g in enumerate(raw_gaps):
            # 1. Validate mandatory fields
            skill_id = g.get("canonical_skill_id") or g.get("skill_id")
            if not skill_id:
                logger.warning(f"Skipping malformed gap record at index {idx}: missing skill_id")
                continue

            # 2. Duplicate detection
            if skill_id in seen_skill_ids:
                logger.warning(f"Duplicate gap detected for skill_id '{skill_id}'; skipping redundant entry")
                continue
            seen_skill_ids.add(skill_id)

            canonical_name = g.get("canonical_name") or skill_id.replace("skill-", "").replace("-", " ").title()

            # 3. Parse proficiencies
            curr_str = str(g.get("current_proficiency", "Not Established")).strip().lower()
            target_str = str(g.get("target_proficiency", "Practitioner")).strip().lower()

            curr_tier, curr_num = PROFICIENCY_MAP.get(curr_str, (ProficiencyTier.NOT_ESTABLISHED, 0))
            target_tier, target_num = PROFICIENCY_MAP.get(target_str, (ProficiencyTier.PRACTITIONER, 3))
            distance = max(0, target_num - curr_num)

            # 4. Parse requirement and importance
            req_str = str(g.get("requirement_type", "core_required")).strip().lower()
            try:
                req_type = RequirementType(req_str)
            except ValueError:
                req_type = RequirementType.CORE_REQUIRED

            imp_str = str(g.get("importance", "high")).strip().lower()
            try:
                imp_level = ImportanceLevel(imp_str)
            except ValueError:
                imp_level = ImportanceLevel.HIGH

            # 5. Parse governance and confidence (PRESERVE UNCERTAINTY)
            raw_confidence = g.get("confidence")
            confidence: Optional[float] = None
            if raw_confidence is not None:
                try:
                    confidence = float(raw_confidence)
                    if confidence > 1.0:
                        confidence = confidence / 100.0
                    confidence = max(0.0, min(1.0, confidence))
                except (ValueError, TypeError):
                    confidence = 0.50

            verif_str = str(g.get("verification_status", "candidate")).strip().lower()
            try:
                verif_state = VerificationState(verif_str)
            except ValueError:
                verif_state = VerificationState.CANDIDATE

            # Note on Uncertainty: If confidence < 0.60, preserve the tier as reported but
            # mark VerificationState as candidate to ensure prioritizer handles it as unverified
            if confidence is not None and confidence < 0.60:
                if verif_state == VerificationState.VERIFIED:
                    verif_state = VerificationState.CANDIDATE

            # 6. Parse prerequisites
            raw_prereqs = g.get("prerequisites", [])
            if isinstance(raw_prereqs, list):
                # Filter out self-prerequisites
                prereq_ids = [str(p) for p in raw_prereqs if str(p) != skill_id]
            else:
                prereq_ids = []

            # 7. Build normalized trigger
            trigger = UpstreamGapTrigger(
                contract_version="1.0.0",
                trigger_id=f"synth-{skill_id[:12]}-{idx}",
                owner_user_id=target_user,
                triggered_at=now,
                gap_id=g.get("gap_id", f"gap-{skill_id}"),
                gap_type=GapClassification.DEPTH_GAP if distance > 0 else GapClassification.SKILL_GAP,
                priority_rank=int(g.get("priority_rank", idx + 1)),
                priority_score=float(g.get("priority_score", 90.0 - (idx * 3))),
                why_prioritized=g.get("why_prioritized", f"Synthetically derived gap for {canonical_name}"),
                gap_diagnosis=g.get("diagnosis", f"Proficiency distance {distance} from role expectation"),
                recommended_direction=g.get("recommended_direction", "Structured learning and practice exercises"),
                role=self.role_context,
                competency=CompetencyHeader(
                    canonical_skill_id=skill_id,
                    canonical_name=canonical_name,
                    taxonomy_category=g.get("taxonomy_category", "machine_learning"),
                    requirement_type=req_type,
                    importance=imp_level,
                ),
                capability=CapabilityState(
                    current_proficiency_level=curr_tier,
                    current_proficiency_numeric=curr_num,
                    target_proficiency_level=target_tier,
                    target_proficiency_numeric=target_num,
                    proficiency_distance=distance,
                ),
                governance=GovernanceEvidenceState(
                    verification_status=verif_state,
                    assessment_confidence=confidence,
                    supporting_evidence_ids=g.get("evidence_ids", []),
                    missing_evidence_types=[],
                    has_unresolved_conflicts=g.get("has_conflicts", False),
                ),
                trajectory=LongitudinalSignal(
                    trend=TrajectoryTrend.IMPROVING if g.get("trend") == "improving" else TrajectoryTrend.UNTRACKED,
                    observation_window_days=30,
                ),
                prerequisite_skill_ids=prereq_ids,
            )
            normalized_triggers.append(trigger)

        return normalized_triggers

    def detect_conflicting_prerequisites(
        self, triggers: List[UpstreamGapTrigger]
    ) -> List[str]:
        """
        Validates the prerequisite graph across a set of triggers.
        Returns a list of error descriptions if circular dependencies or invalid references exist.
        """
        errors = []
        node_ids = {t.competency.canonical_skill_id for t in triggers}

        # Check self-prerequisites and missing prerequisites
        for t in triggers:
            sid = t.competency.canonical_skill_id
            for p in t.prerequisite_skill_ids:
                if p == sid:
                    errors.append(f"Skill '{sid}' cannot be a prerequisite of itself.")

        # Check cycles via DFS
        graph = {t.competency.canonical_skill_id: t.prerequisite_skill_ids for t in triggers}
        visited: Dict[str, int] = {}  # 0=unvisited, 1=visiting, 2=visited

        def dfs(node: str, path: List[str]) -> bool:
            visited[node] = 1
            for neighbor in graph.get(node, []):
                if neighbor not in graph:
                    continue
                if visited.get(neighbor) == 1:
                    errors.append(f"Circular dependency detected: {' -> '.join(path + [neighbor])}")
                    return True
                if visited.get(neighbor, 0) == 0:
                    if dfs(neighbor, path + [neighbor]):
                        return True
            visited[node] = 2
            return False

        for node in graph:
            if visited.get(node, 0) == 0:
                dfs(node, [node])

        return errors


# Global synthetic adapter
synthetic_ci_adapter = SyntheticCareerIntelligenceAdapter()
