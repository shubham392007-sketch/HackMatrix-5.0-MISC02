"""Schemas for Enhancement 8.5: Evidence Staleness & Confidence Decay Visualization."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ConfidenceTimelinePoint(BaseModel):
    timestamp: str
    score: float
    confidence: float = Field(..., ge=0.0, le=1.0)
    band_upper: float
    band_lower: float
    freshness: float = Field(..., ge=0.0, le=100.0)
    is_observed: bool = True
    staleness_note: Optional[str] = None


class ConfidenceDecayResponse(BaseModel):
    learner_id: str
    competency_id: str
    competency_name: str
    current_trend: str = Field(..., description="improving, stagnating, declining")
    current_confidence: float
    days_since_last_evidence: int
    freshness_percentage: float
    freshness_state: str = Field(..., description="Fresh, Aging, Stale")
    last_evidence_timestamp: Optional[str] = None
    timeline: List[ConfidenceTimelinePoint] = Field(default_factory=list)
    methodology: Dict[str, Any] = Field(default_factory=dict)
    safeguard_note: str = "Confidence decay indicates telemetry staleness due to absence of logged signals; it does not constitute evidence of permanent skill decline."
