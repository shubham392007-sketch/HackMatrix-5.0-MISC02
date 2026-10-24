"""
Learn & Grow Upstream Integration Contracts (Pydantic v2).
Defines the authoritative schemas consumed from Career Intelligence,
Skill Intelligence, Trust & Governance, and Evidence & Workspace.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class ProficiencyTier(str, Enum):
    NOT_ESTABLISHED = "Not Established"
    FOUNDATION = "Foundation"
    WORKING = "Working"
    PRACTITIONER = "Practitioner"
    ADVANCED = "Advanced"
    EXPERT = "Expert"


class RequirementType(str, Enum):
    CORE_REQUIRED = "core_required"
    SUPPORTING = "supporting"
    PREFERRED = "preferred"
    DIFFERENTIATING = "differentiating"


class ImportanceLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class GapClassification(str, Enum):
    SKILL_GAP = "skill_gap"
    DEPTH_GAP = "depth_gap"
    EVIDENCE_GAP = "evidence_gap"
    APPLICATION_GAP = "application_gap"
    DEPENDENCY_GAP = "dependency_gap"
    DIFFERENTIATION_OPPORTUNITY = "differentiation_opportunity"
    FRESHNESS_GAP = "freshness_gap"


class VerificationState(str, Enum):
    VERIFIED = "verified"
    CANDIDATE = "candidate"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    CONFLICTING = "conflicting"
    REJECTED = "rejected"


class TrajectoryTrend(str, Enum):
    IMPROVING = "improving"
    STAGNATING = "stagnating"
    DECLINING = "declining"
    UNTRACKED = "untracked"


# ──────────────────────────────────────────────────────────────────────────────
# A. Skill Intelligence Contract Model (Domain 2)
# ──────────────────────────────────────────────────────────────────────────────

class SkillIntelligenceRecord(BaseModel):
    """
    Representation of competency data available from Domain 2 Skill Intelligence.
    Supports optional proficiency and confidence (never assumed to always exist).
    """
    stable_skill_id: str = Field(..., description="Unique immutable skill identifier (competency_taxonomy.id or slug)")
    canonical_skill_name: str = Field(..., description="Official normalized name from competency_taxonomy")
    taxonomy_category: str = Field(..., description="Domain category (e.g. backend_engineering, ai_and_machine_learning)")
    current_proficiency_level: Optional[ProficiencyTier] = Field(None, description="Demonstrated proficiency tier if established")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Model extraction confidence score if available")
    verification_status: VerificationState = Field(default=VerificationState.CANDIDATE, description="Authoritative state from Trust & Governance")
    evidence_references: List[str] = Field(default_factory=list, description="Linked evidence_items UUIDs")
    last_evaluated_timestamp: Optional[datetime] = Field(None, description="Timestamp of latest verification or extraction")


# ──────────────────────────────────────────────────────────────────────────────
# B. Evidence & Workspace Reference Model (Domain 1)
# ──────────────────────────────────────────────────────────────────────────────

class EvidenceReference(BaseModel):
    """
    Lightweight reference to verifiable work artifacts in Domain 1.
    Never duplicates full commit histories or heavy document payloads.
    """
    evidence_id: str = Field(..., description="UUID matching evidence_items.id")
    evidence_type: str = Field(..., description="Artifact type: pull_request, commit, document, jira_issue")
    source: str = Field(..., description="Ingestion source provider: github, jira, upload, portfolio")
    relevant_skill_associations: List[str] = Field(default_factory=list, description="Associated canonical skill IDs")
    content_summary: Optional[str] = Field(None, description="Sanitized excerpt or summary where permitted")
    access_permissions: str = Field("private", description="Visibility and tenant ownership scope")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Repository URL, branch, commit SHA, PR number")


# ──────────────────────────────────────────────────────────────────────────────
# C. Career Intelligence Ingestion Model
# ──────────────────────────────────────────────────────────────────────────────

class RoleContext(BaseModel):
    role_id: str = Field(..., description="Target role demand model ID")
    role_title: str = Field(..., description="Role display title")
    seniority: str = Field(..., description="Seniority tier")
    context_domain: Optional[str] = Field(None, description="Industry or architectural context")
    role_version: str = Field("v1.0", description="Demand model version")


class CompetencyHeader(BaseModel):
    canonical_skill_id: str = Field(..., description="Matches competency_taxonomy.id or slug")
    canonical_name: str = Field(..., description="Taxonomy standardized name")
    taxonomy_category: str = Field(..., description="Domain category")
    requirement_type: RequirementType = Field(..., description="Core vs Supporting vs Preferred")
    importance: ImportanceLevel = Field(..., description="Criticality to role")


class CapabilityState(BaseModel):
    current_proficiency_level: Optional[ProficiencyTier] = Field(None, description="Current demonstrated tier (None if missing)")
    current_proficiency_numeric: Optional[int] = Field(None, ge=0, le=5, description="Level 0 to 5 (None if missing)")
    target_proficiency_level: ProficiencyTier = Field(..., description="Target role tier")
    target_proficiency_numeric: int = Field(..., ge=1, le=5, description="Target level 1 to 5")
    proficiency_distance: Optional[int] = Field(None, ge=0, description="Numerical gap distance (None if missing score)")

    @field_validator("proficiency_distance", mode="before")
    @classmethod
    def calculate_distance(cls, v: Any, info: Any) -> Optional[int]:
        if v is not None:
            return int(v)
        return None


class GovernanceEvidenceState(BaseModel):
    verification_status: VerificationState = Field(..., description="Verification state from Domain 4")
    assessment_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence in current extraction")
    supporting_evidence_ids: List[str] = Field(default_factory=list, description="UUIDs of linked evidence_items")
    missing_evidence_types: List[str] = Field(default_factory=list, description="Missing artifact categories")
    has_unresolved_conflicts: bool = Field(False, description="Whether conflict tickets are active")


class LongitudinalSignal(BaseModel):
    trend: TrajectoryTrend = Field(TrajectoryTrend.UNTRACKED, description="Longitudinal skill trajectory")
    trend_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence in trajectory trend")
    observation_window_days: Optional[int] = Field(None, description="Days of evaluated historical data")
    decay_risk_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Predicted decay probability")


class CareerIntelligenceGapRecord(BaseModel):
    """
    Adapter contract for gap records emitted by Career Intelligence.
    Explicitly tracks pending vs available fields.
    """
    role_id: str
    role_title: str
    required_skills: List[str]
    skill_importance: ImportanceLevel
    current_proficiency: Optional[ProficiencyTier] = None
    required_proficiency: ProficiencyTier
    gap_type: GapClassification
    role_readiness_score: Optional[float] = None
    pending_integration_fields: List[str] = Field(default_factory=list)


class UpstreamGapTrigger(BaseModel):
    """
    Primary trigger packet emitted by Career Intelligence to initiate
    Learn & Grow domain blueprint selection, diagnostics, or roadmaps.
    """
    contract_version: str = Field("1.0.0", description="Contract schema version")
    trigger_id: str = Field(..., description="Unique trigger idempotency identifier")
    owner_user_id: str = Field(..., description="UUID of the learner/employee")
    triggered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    gap_id: str = Field(..., description="Unique gap identifier from Career Intelligence")
    gap_type: GapClassification = Field(..., description="Structural gap category")
    priority_rank: int = Field(..., ge=1, description="Ordinal priority position (1 = highest)")
    priority_score: float = Field(..., description="Computed composite priority score")
    why_prioritized: str = Field(..., description="Deterministic explanation of why this gap is prioritized")
    gap_diagnosis: str = Field(..., description="Detailed diagnosis of the competency deficiency")
    recommended_direction: Optional[str] = Field(None, description="Directional career advice")

    role: RoleContext
    competency: CompetencyHeader
    capability: CapabilityState
    governance: GovernanceEvidenceState
    trajectory: Optional[LongitudinalSignal] = Field(default_factory=LongitudinalSignal)

    prerequisite_skill_ids: List[str] = Field(default_factory=list, description="Prerequisite canonical skill IDs")


# ──────────────────────────────────────────────────────────────────────────────
# E. Student Learning State Schema
# ──────────────────────────────────────────────────────────────────────────────

class StudentLearningState(BaseModel):
    """
    Schema for persisting learner progression across roadmaps, diagnostics, and mastery.
    Reuses the authenticated user ID without duplicate accounts.
    """
    user_id: str = Field(..., description="Authenticated user ID matching Supabase auth.users")
    selected_learning_goals: List[str] = Field(default_factory=list, description="Target role or competency slugs")
    diagnostic_results: Dict[str, Any] = Field(default_factory=dict, description="Summary of completed diagnostics")
    roadmap_version: str = Field("v1.0", description="Active roadmap version string")
    completed_learning_steps: List[str] = Field(default_factory=list, description="Topic step IDs marked complete")
    assessment_results: Dict[str, Any] = Field(default_factory=dict, description="Scores per topic assessment")
    practice_attempts: List[Dict[str, Any]] = Field(default_factory=list, description="Log of interactive practice submissions")
    mastery_history: List[Dict[str, Any]] = Field(default_factory=list, description="Timestamped history of mastery calculations")
    last_activity_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
