"""Schemas for Enhancement 8.3: Auto-Generated Growth Narrative."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class EvaluationPeriod(BaseModel):
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: str = Field(..., description="End date in YYYY-MM-DD format")
    label: Optional[str] = Field(None, description="Descriptive label, e.g. Q2 2026")


class EvidenceReference(BaseModel):
    evidence_id: str
    source: str
    source_type: str
    timestamp: str
    title: str
    raw_score: float
    detail: Optional[str] = None


class NarrativeClaim(BaseModel):
    claim_id: str
    competency_id: str
    competency_name: str
    claim_text: str
    trend: str = Field(..., description="improving, stagnating, declining")
    evidence_ids: List[str] = Field(default_factory=list)
    verified: bool = True


class ManagerBriefing(BaseModel):
    key_improvements: List[str] = Field(default_factory=list)
    stagnating_areas: List[str] = Field(default_factory=list)
    suggested_focus: List[str] = Field(default_factory=list)


class GrowthNarrativeRequest(BaseModel):
    learner_id: str
    evaluation_period: Optional[EvaluationPeriod] = None
    competency_ids: Optional[List[str]] = None
    focus_mode: Optional[str] = Field("learner_growth", description="learner_growth or manager_1on1")


class GrowthNarrativeResponse(BaseModel):
    success: bool = True
    learner_id: str
    learner_name: Optional[str] = None
    evaluation_period: EvaluationPeriod
    narrative: str
    claims: List[NarrativeClaim] = Field(default_factory=list)
    manager_briefing: ManagerBriefing
    confidence_score: float
    evidence_coverage: str = Field("adequate", description="insufficient, limited, adequate, high")
    supporting_evidence: Dict[str, EvidenceReference] = Field(default_factory=dict)
    limitations: List[str] = Field(default_factory=list)
    disclaimer: str = "This growth narrative is model-synthesized strictly from verified telemetry and does not reflect permanent individual capability or character."
