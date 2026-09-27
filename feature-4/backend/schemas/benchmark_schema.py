"""Schemas for Enhancement 8.4: Peer-Percentile Growth Benchmarking."""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from .narrative_schema import EvaluationPeriod


class BenchmarkRequest(BaseModel):
    learner_id: str
    competency_id: str
    evaluation_period: Optional[EvaluationPeriod] = None


class BenchmarkResponse(BaseModel):
    available: bool
    learner_id: str
    competency_id: str
    competency_name: str
    evaluation_period: Optional[EvaluationPeriod] = None
    starting_level_group: Optional[str] = None
    growth_percentile: Optional[int] = None
    relative_tier: Optional[str] = None
    cohort_size_bucket: Optional[str] = None
    privacy_safe: bool = True
    reason: Optional[str] = None
    methodology: str = "Empirical cumulative distribution over starting-level normalized growth rates in active period."
    disclaimer: str = "Percentile reflects aggregate growth velocity relative to comparable peers during the evaluation window; it is not an employee capability or performance rating."
