from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.retention_service import RetentionService

router = APIRouter(prefix="/api/v1", tags=["Skill Retention & Decay Risk"])

# Request model for What-If Simulation
class SimulationRequest(BaseModel):
    competency_id: Optional[str] = Field(None, description="Competency ID (e.g. C01, C05) or name")
    action_type: str = Field(
        "project_outcome",
        description="Type of intervention: 'assessment', 'project_outcome', or 'course_completion'"
    )
    simulated_score: float = Field(
        85.0,
        ge=0.0,
        le=100.0,
        description="Hypothetical performance score (0-100)"
    )
    days_from_now: int = Field(
        0,
        ge=0,
        le=180,
        description="Simulated timing in days from now (default 0 = immediate)"
    )

@router.get("/learners")
async def get_sample_learners(limit: int = Query(15, ge=1, le=50)):
    """Return a curated list of sample learners from the dataset for testing and demonstration."""
    service = RetentionService.get_instance()
    return {"learners": service.get_sample_learners(limit=limit)}

@router.get("/learner/{learner_id}/competencies")
async def get_learner_competencies(learner_id: str):
    """Retrieve all competencies tracked for a specific learner."""
    service = RetentionService.get_instance()
    competencies = service.get_learner_competencies(learner_id)
    return {
        "learner_id": learner_id,
        "resolved_learner_id": service.resolve_learner_id(learner_id),
        "competencies": competencies
    }

@router.get("/learner/{learner_id}/retention")
async def get_retention_assessment(
    learner_id: str,
    competency_id: Optional[str] = Query(None, description="Optional specific competency ID or name")
):
    """
    Retrieve real-time skill retention risk and decay survival analytics for a learner.
    If competency_id is omitted, defaults to the learner's highest-risk competency and
    includes a cross-competency risk overview.
    """
    service = RetentionService.get_instance()
    assessment = service.get_retention_assessment(learner_id=learner_id, competency_id=competency_id)
    if "error" in assessment and not assessment.get("risk_score"):
        raise HTTPException(status_code=404, detail=assessment["error"])
    return assessment

@router.post("/learner/{learner_id}/retention/simulate")
async def simulate_retention_intervention(
    learner_id: str,
    req: SimulationRequest
):
    """
    The 'What-If' Simulation Engine:
    Evaluates hypothetical reinforcement interventions (courses, projects, assessments)
    to calculate counterfactual retention risk, risk delta, and extended proficiency duration.
    """
    service = RetentionService.get_instance()
    resolved_id = service.resolve_learner_id(learner_id)

    # If no competency provided, pick target or primary
    target_cid = req.competency_id
    if not target_cid:
        comps = service.get_learner_competencies(resolved_id)
        if not comps:
            raise HTTPException(status_code=404, detail=f"No competencies found for learner {learner_id}")
        target_cid = comps[0]["competency_id"]

    result = service.simulate_action(
        learner_id=learner_id,
        competency_id=target_cid,
        action_type=req.action_type,
        simulated_score=req.simulated_score,
        days_from_now=req.days_from_now
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# ─────────────────────────────────────────────────────────────
# What-If Learning Path Simulator API Schemas & Endpoints
# ─────────────────────────────────────────────────────────────

class WhatIfRequest(BaseModel):
    competency_id: str = Field(..., description="Target competency ID (e.g. C04) or name (e.g. SQL & Databases)")
    action_id: Optional[str] = Field("advanced_sql_course", description="Catalog action ID or 'none' for baseline verification")
    quantity: int = Field(1, ge=1, le=10, description="Quantity of events (e.g. 2 peer-review sessions)")
    simulated_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Optional override for hypothetical score")
    days_from_now: int = Field(0, ge=0, le=180, description="Simulated days in the future for this intervention")
    scenario_date: Optional[str] = Field(None, description="Optional specific ISO date string for intervention")


class WhatIfCompareRequest(BaseModel):
    competency_id: str = Field(..., description="Target competency ID or name")
    action_ids: List[str] = Field(
        default=["advanced_sql_course", "peer_review_sessions", "author_relevant_pr"],
        description="Candidate actions to compare side-by-side"
    )
    simulated_score: Optional[float] = Field(None, ge=0.0, le=100.0)


@router.get("/what-if/actions")
async def list_what_if_actions(competency_id: Optional[str] = Query(None, description="Optional competency filter")):
    """List all structured candidate development actions from the Action Catalog."""
    from services.action_catalog import ActionCatalogService
    catalog = ActionCatalogService.get_instance()
    actions = catalog.list_actions(competency_id=competency_id)
    return {
        "competency_id": competency_id,
        "count": len(actions),
        "actions": [a.model_dump() for a in actions]
    }


@router.post("/learner/{learner_id}/what-if")
async def run_what_if_simulation(
    learner_id: str,
    req: WhatIfRequest
):
    """
    What-If Learning Path Simulator:
    Simulates a candidate development action against the employee's competency evidence sequence,
    running through the exact same feature engineering and Weibull survival inference pipeline.
    """
    from services.what_if_service import WhatIfSimulationService
    service = WhatIfSimulationService.get_instance()

    result = service.simulate(
        learner_id=learner_id,
        competency_id=req.competency_id,
        action_id=req.action_id,
        quantity=req.quantity,
        simulated_score=req.simulated_score,
        days_from_now=req.days_from_now,
        scenario_date=req.scenario_date
    )

    if not result.get("success", False):
        status_code = 400
        if "Insufficient historical evidence" in result.get("error", ""):
            status_code = 422
        raise HTTPException(status_code=status_code, detail=result.get("error", "Simulation failed"))

    return result


@router.post("/learner/{learner_id}/what-if/compare")
async def compare_what_if_scenarios(
    learner_id: str,
    req: WhatIfCompareRequest
):
    """
    Compare multiple candidate actions side-by-side against the same baseline reality.
    """
    from services.what_if_service import WhatIfSimulationService
    service = WhatIfSimulationService.get_instance()

    scenarios = []
    baseline = None

    for aid in req.action_ids:
        action_def = service.catalog.get_action(aid)
        category = action_def.category if action_def else "learning"

        sim = service.simulate(
            learner_id=learner_id,
            competency_id=req.competency_id,
            action_id=aid,
            quantity=1,
            simulated_score=req.simulated_score
        )
        if sim.get("success"):
            if baseline is None:
                baseline = sim.get("baseline")
            pct_delta = sim["comparison"]["percentage_delta"]
            scenarios.append({
                "action_id": aid,
                "action_name": sim["scenario"]["action_name"],
                "title": sim["scenario"]["action_name"],
                "category": category,
                "projected_trend": sim["projected"]["trend"],
                "projected_decay_risk": sim["projected"]["decay_risk"],
                "projected_decay_risk_percentage": sim["projected"]["decay_risk_percentage"],
                "projected_risk_percentage": sim["projected"]["decay_risk_percentage"],
                "risk_reduction_percentage": abs(pct_delta) if pct_delta < 0 else 0.0,
                "risk_delta": sim["comparison"]["risk_delta"],
                "percentage_delta": pct_delta,
                "freshness_delta": sim["comparison"]["freshness_delta"],
                "expected_days_gained": sim["comparison"]["expected_days_gained"],
                "simulation_id": sim["simulation_id"]
            })

    # Sort scenarios by risk reduction percentage descending
    rankings = sorted(scenarios, key=lambda x: x["risk_reduction_percentage"], reverse=True)

    return {
        "learner_id": learner_id,
        "competency_id": req.competency_id,
        "baseline": baseline,
        "scenarios": scenarios,
        "scenario_rankings": rankings,
        "disclaimer": "This is a model-based scenario projection, not a guaranteed outcome."
    }
