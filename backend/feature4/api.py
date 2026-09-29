"""FastAPI Router for Feature 4: Continuous Talent Intelligence & Development Insights."""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.core.dependencies import (
    get_optional_profile,
    check_employee_access,
    require_employee,
    require_manager,
)
from backend.schemas.profile import UserProfile
from backend.core.logging import get_logger
from backend.feature4.schemas import (
    GrowthNarrative,
    PeerBenchmark,
    ConfidenceDecay,
    TeamHeatmap,
)
from backend.feature4.narrative_service import get_narrative_service
from backend.feature4.benchmark_service import get_benchmark_service
from backend.feature4.staleness_service import get_staleness_service
from backend.feature4.team_service import get_team_service
from backend.feature4.what_if_service import get_what_if_service

logger = get_logger("feature4.api")

router = APIRouter(prefix="/feature4/api", tags=["Growth Intelligence & Development Insights"])


class WhatIfApiRequest(BaseModel):
    employee_id: str = Field(..., description="Employee ID or username slug")
    competency_id: str = Field(..., description="Competency identifier (e.g. C01)")
    action_type: str = Field("project_outcome", description="assessment | project_outcome | course_completion")
    simulated_score: float = Field(85.0, ge=0.0, le=100.0)
    days_from_now: int = Field(0, ge=0, le=180)
    simulated_description: Optional[str] = None


@router.get("/narrative/{learner_id}", response_model=GrowthNarrative)
async def get_growth_narrative(
    learner_id: str,
    force_refresh: bool = Query(False, description="Bypass cache and synthesize afresh"),
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> GrowthNarrative:
    """Returns AI-synthesized narrative of longitudinal competency progression grounded in verified evidence."""
    if profile and not check_employee_access(profile, learner_id):
        raise HTTPException(status_code=403, detail="Cross-employee narrative access denied.")

    service = get_narrative_service()
    return await service.get_growth_narrative(learner_id=learner_id, force_refresh=force_refresh)


@router.post("/narrative/{learner_id}", response_model=GrowthNarrative)
async def regenerate_growth_narrative(
    learner_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> GrowthNarrative:
    """Force re-synthesizes an updated growth narrative when fresh evidence arrives."""
    if profile and not check_employee_access(profile, learner_id):
        raise HTTPException(status_code=403, detail="Cross-employee narrative access denied.")

    service = get_narrative_service()
    return await service.get_growth_narrative(learner_id=learner_id, force_refresh=True)


@router.get("/benchmark/{learner_id}/{competency_id}", response_model=PeerBenchmark)
async def get_peer_benchmark(
    learner_id: str,
    competency_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> PeerBenchmark:
    """Returns privacy-safe peer growth percentiles, strictly enforcing k-anonymity."""
    if profile and not check_employee_access(profile, learner_id):
        raise HTTPException(status_code=403, detail="Cross-employee benchmark access denied.")

    service = get_benchmark_service()
    return service.get_peer_benchmark(learner_id=learner_id, competency_id=competency_id)


@router.get("/confidence-decay/{learner_id}/{competency_id}", response_model=ConfidenceDecay)
async def get_confidence_decay(
    learner_id: str,
    competency_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> ConfidenceDecay:
    """Returns evidence freshness score and 180-day confidence decay curve with widening uncertainty."""
    if profile and not check_employee_access(profile, learner_id):
        raise HTTPException(status_code=403, detail="Cross-employee confidence access denied.")

    service = get_staleness_service()
    return service.get_confidence_decay(learner_id=learner_id, competency_id=competency_id)


@router.get("/heatmap/team/{team_id}", response_model=TeamHeatmap)
async def get_team_heatmap(
    team_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> TeamHeatmap:
    """
    Returns aggregated team skill trajectory matrix and systemic pattern callouts.
    Verifies manager authorization server-side.
    """
    # Manager authorization verification
    if profile and profile.role not in ("MANAGER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Access denied: Manager role required to access team heatmap.")

    service = get_team_service()
    return service.get_team_heatmap(team_id=team_id, user_profile=profile)


@router.post("/what-if")
async def simulate_what_if_action(
    req: WhatIfApiRequest,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> Dict[str, Any]:
    """
    Simulates hypothetical development interventions via authoritative Feature 2 ML models.
    Guarantees zero database mutations and isolates counterfactual evidence.
    """
    if profile and not check_employee_access(profile, req.employee_id):
        raise HTTPException(status_code=403, detail="Cross-employee simulation access denied.")

    service = get_what_if_service()
    return service.simulate(
        employee_id=req.employee_id,
        competency_id=req.competency_id,
        action_type=req.action_type,
        simulated_score=req.simulated_score,
        days_from_now=req.days_from_now,
        simulated_description=req.simulated_description,
    )


@router.get("/overview/{learner_id}")
async def get_growth_overview(
    learner_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> Dict[str, Any]:
    """Returns unified Feature 4 intelligence summary for employee home dashboard."""
    if profile and not check_employee_access(profile, learner_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    narrative_svc = get_narrative_service()
    narrative = await narrative_svc.get_growth_narrative(learner_id=learner_id)

    return {
        "learner_id": learner_id,
        "narrative_preview": narrative.narrative[:240] + "..." if len(narrative.narrative) > 240 else narrative.narrative,
        "confidence_level": narrative.confidence_level,
        "evidence_sources": narrative.evidence_sources,
        "competencies_analyzed": narrative.competencies_analyzed,
        "key_improvements": narrative.manager_briefing.key_improvements,
        "suggested_focus": narrative.manager_briefing.suggested_focus,
        "generated_at": narrative.generated_at,
    }
