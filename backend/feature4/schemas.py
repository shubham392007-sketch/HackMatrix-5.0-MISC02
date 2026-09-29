"""Pydantic schemas for Feature 4: Continuous Talent Intelligence & Development Insights."""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class FreshnessLabel(str, Enum):
    FRESH = "Fresh"
    AGING = "Aging"
    STALE = "Stale"


class PatternSeverity(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    WARNING = "warning"
    CRITICAL = "critical"


class ManagerBriefing(BaseModel):
    key_improvements: List[str] = Field(default_factory=list, description="Competencies showing documented gains")
    stagnating_areas: List[str] = Field(default_factory=list, description="Competencies with plateaued velocity")
    suggested_focus: List[str] = Field(default_factory=list, description="Recommended strategic actions for manager 1:1s")


class NarrativeClaim(BaseModel):
    claim: str = Field(..., description="Factual assertion regarding skill progression")
    evidence_ids: List[str] = Field(default_factory=list, description="Citations to verified Feature 1 evidence")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score from Feature 2 trajectory")


class GrowthNarrative(BaseModel):
    learner_id: str
    narrative: str
    manager_briefing: ManagerBriefing
    claims: List[NarrativeClaim] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    evidence_sources: int = Field(default=0)
    competencies_analyzed: int = Field(default=0)
    confidence_level: str = Field(default="MEDIUM")
    cached: bool = Field(default=False)


class PeerBenchmark(BaseModel):
    learner_id: str
    competency_id: str
    competency_name: str
    percentile: Optional[float] = Field(None, description="Percentile rank within privacy cohort (0-100)")
    cohort_size: int = Field(default=0, description="Number of anonymized comparable peers in cohort")
    comparison: str = Field(default="peers in similar competency role tenure")
    time_period: str = Field(default="Last 90 days")
    privacy_safe: bool = Field(default=True, description="Strict k-anonymity guarantee")
    benchmark_available: bool = Field(default=True)
    message: Optional[str] = None


class DecayCurvePoint(BaseModel):
    day: int
    confidence: float
    upper_band: float
    lower_band: float


class ConfidenceDecay(BaseModel):
    learner_id: str
    competency_id: str
    competency_name: str
    current_confidence: float
    freshness_score: float
    freshness_label: str
    days_since_last_evidence: int
    decay_curve: List[DecayCurvePoint] = Field(default_factory=list)


class HeatmapCompetencyStatus(BaseModel):
    trend: str = Field(..., description="improving | stagnating | declining | insufficient_evidence")
    confidence: float = Field(default=0.0)
    score: float = Field(default=0.0)
    freshness: Optional[str] = None


class HeatmapMember(BaseModel):
    learner_id: str
    name: str
    competencies: Dict[str, HeatmapCompetencyStatus] = Field(default_factory=dict)


class TeamPattern(BaseModel):
    competency: str
    observation: str
    severity: str = "neutral"  # positive | neutral | warning | critical
    affected_ratio: Optional[float] = None


class TeamHeatmap(BaseModel):
    team_id: str
    team_name: str
    members: List[HeatmapMember] = Field(default_factory=list)
    competency_names: List[str] = Field(default_factory=list)
    patterns: List[TeamPattern] = Field(default_factory=list)
    summary_stats: Optional[Dict[str, Any]] = None
