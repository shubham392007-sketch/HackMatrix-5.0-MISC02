from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InterventionType(str, Enum):
    MICRO_LEARNING = "micro_learning"
    INTERNAL_MENTORSHIP = "peer_mentorship"
    EVIDENCE_GATHERING = "evidence_gathering"


class DeficiencyLevel(str, Enum):
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"
    INSUFFICIENT = "insufficient"


class RecommendationPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RecommendationStatus(str, Enum):
    GENERATED = "generated"
    VIEWED = "viewed"
    STARTED = "started"
    COMPLETED = "completed"
    DISMISSED = "dismissed"
    EXPIRED = "expired"


class MentorshipStatus(str, Enum):
    PENDING = "pending"
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CatalogRule(BaseModel):
    id: str
    competency_id: str
    competency_name: str
    deficiency_level: DeficiencyLevel
    action_type: InterventionType
    priority: RecommendationPriority
    action_title_template: str
    action_description_template: str
    search_keyword_template: str
    target_topics: List[str] = Field(default_factory=list)


class ResourceDeepLink(BaseModel):
    video_id: str
    video_url: str
    deep_link_url: str
    title: str
    channel_title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[str] = None
    timestamp_seconds: Optional[int] = None
    timestamp_formatted: Optional[str] = None
    matched_topic: Optional[str] = None
    matched_snippet: Optional[str] = None
    timestamp_available: bool = False


class MentorSuggestion(BaseModel):
    mentor_id: str
    mentor_name: str
    mentor_email: Optional[str] = None
    mentor_department: Optional[str] = None
    competency_id: str
    competency_name: str
    mentor_trend: str = "improving"
    mentor_confidence: float = 0.0
    pairing_status: MentorshipStatus = MentorshipStatus.PENDING
    pairing_id: Optional[str] = None


# Alias for backward compatibility
MentorCandidate = MentorSuggestion


class RecommendationExplanation(BaseModel):
    action: str
    action_type: str
    target_gap: str
    reason: str
    expected_benefit: str
    evidence_refs: List[str] = Field(default_factory=list)
    confidence: float = 0.85


class NextActionRecommendation(BaseModel):
    id: str
    employee_id: str
    competency_id: str
    competency_name: str
    trend: str
    confidence: float
    deficiency_level: DeficiencyLevel
    priority: RecommendationPriority
    action: str
    action_type: InterventionType
    status: RecommendationStatus = RecommendationStatus.GENERATED
    justification: Optional[str] = None
    evidence_ref: Optional[str] = None
    evidence_refs: List[str] = Field(default_factory=list)
    supporting_evidence_details: List[Dict[str, Any]] = Field(default_factory=list)
    external_link: Optional[str] = None
    resource: Optional[ResourceDeepLink] = None
    mentor_suggestion: Optional[MentorSuggestion] = None
    ai_explanation: Optional[RecommendationExplanation] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MentorshipRequestCreate(BaseModel):
    mentee_id: str
    mentor_id: str
    competency_id: str
    recommendation_id: Optional[str] = None
    manager_id: Optional[str] = None
    note: Optional[str] = None


class MentorshipStatusUpdate(BaseModel):
    status: MentorshipStatus
    feedback: Optional[str] = None


class RecommendationStatusUpdate(BaseModel):
    status: RecommendationStatus
    user_action_timestamp: Optional[str] = None
