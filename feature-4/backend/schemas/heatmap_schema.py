"""Schemas for Enhancement 8.6: Manager Team Skill Heatmap."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HeatmapCell(BaseModel):
    competency_id: str
    competency_name: str
    trend: str = Field(..., description="improving, stagnating, declining, insufficient_evidence")
    icon: str = Field(..., description="↑, →, ↓, ?")
    confidence: float
    freshness_state: str = Field("Fresh", description="Fresh, Aging, Stale, Unknown")
    evidence_count: int
    last_evidence_date: Optional[str] = None


class HeatmapMember(BaseModel):
    employee_id: str
    display_name: str
    role: str
    department: str
    cells: Dict[str, HeatmapCell] = Field(default_factory=dict)


class CompetencyAggregate(BaseModel):
    competency_id: str
    competency_name: str
    improving: int = 0
    stagnating: int = 0
    declining: int = 0
    insufficient_evidence: int = 0
    total_evaluated: int = 0
    dominant_trend: str = "stagnating"


class TeamSkillInsight(BaseModel):
    competency_id: str
    competency_name: str
    insight_type: str = Field(..., description="skill_gap, stagnation, strength, coverage")
    summary: str
    actionable_suggestion: str


class TeamHeatmapResponse(BaseModel):
    team_id: str
    team_name: str
    total_members: int
    competencies: List[Dict[str, str]]
    matrix: List[HeatmapMember]
    team_aggregates: Dict[str, CompetencyAggregate]
    team_insights: List[TeamSkillInsight]
    disclaimer: str = "Team heatmap presents aggregated, authorized department skill dynamics; individual drilldowns adhere strictly to employee privacy boundaries."
