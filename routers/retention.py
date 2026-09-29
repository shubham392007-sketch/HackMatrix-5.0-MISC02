from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from services.retention_service import RetentionService
from backend.core.dependencies import require_employee, check_employee_access, get_optional_profile
from backend.schemas.profile import UserProfile

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
def get_sample_learners(
    limit: int = Query(15, ge=1, le=50),
    profile: Optional[UserProfile] = Depends(get_optional_profile)
):
    """Return a curated list of sample learners from the dataset for testing and demonstration."""
    service = RetentionService.get_instance()
    return {"learners": service.get_sample_learners(limit=limit)}

@router.get("/learner/{learner_id}/competencies")
def get_learner_competencies(
    learner_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile)
):
    """Retrieve all competencies tracked for a specific learner."""
    if profile and not check_employee_access(profile, learner_id):
        is_sample = str(learner_id).startswith("L00") or learner_id in ("shubham_pokale", "maya_sharma", "alex_rivera")
        if not (profile.role in ("MANAGER", "ADMIN") or is_sample):
            raise HTTPException(status_code=403, detail="Cross-employee competency access denied.")
    service = RetentionService.get_instance()
    competencies = service.get_learner_competencies(learner_id)
    return {
        "learner_id": learner_id,
        "resolved_learner_id": service.resolve_learner_id(learner_id),
        "competencies": competencies
    }

@router.get("/learner/{learner_id}/retention")
def get_retention_assessment(
    learner_id: str,
    competency_id: Optional[str] = Query(None, description="Optional specific competency ID or name"),
    profile: Optional[UserProfile] = Depends(get_optional_profile)
):
    """
    Retrieve real-time skill retention risk and decay survival analytics for a learner.
    If competency_id is omitted, defaults to the learner's highest-risk competency and
    includes a cross-competency risk overview.
    """
    if profile and not check_employee_access(profile, learner_id):
        is_sample = str(learner_id).startswith("L00") or learner_id in ("shubham_pokale", "maya_sharma", "alex_rivera")
        if not (profile.role in ("MANAGER", "ADMIN") or is_sample):
            raise HTTPException(status_code=403, detail="Cross-employee retention assessment access denied.")
    service = RetentionService.get_instance()
    assessment = service.get_retention_assessment(learner_id=learner_id, competency_id=competency_id)
    if "error" in assessment and not assessment.get("risk_score"):
        raise HTTPException(status_code=404, detail=assessment["error"])
    return assessment

@router.post("/learner/{learner_id}/retention/simulate")
def simulate_retention_intervention(
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

    # Provide frontend compatibility wrapper
    if "baseline" not in result:
        orig_risk = float(result.get("original_risk", 0.5))
        result["baseline"] = {
            "trend": "stagnating" if orig_risk > 0.4 else "improving",
            "risk_score": orig_risk,
            "risk_level": "HIGH" if orig_risk > 0.6 else ("MEDIUM" if orig_risk > 0.3 else "LOW"),
            "half_life_days": int(result.get("original_expected_days", 45)),
        }
    if "projected" not in result:
        new_risk = float(result.get("new_risk", 0.3))
        surv_probs = result.get("simulated_survival_probabilities", [0.95, 0.88, 0.80, 0.72, 0.60, 0.48, 0.35])
        days = [15, 30, 45, 60, 90, 120, 180]
        curve = [{"day": d, "probability": p} for d, p in zip(days, surv_probs)]
        result["projected"] = {
            "trend": "improving" if new_risk < float(result.get("original_risk", 0.5)) else "stagnating",
            "risk_score": new_risk,
            "risk_level": result.get("new_risk_level", "LOW"),
            "half_life_days": int(result.get("new_expected_days_to_decay", 60)),
            "projected_curve": curve,
        }

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


@router.get("/learner/{learner_id}/retention/explain")
@router.get("/learner/{learner_id}/competency/{competency_id}/explain")
async def explain_retention_trajectory(
    learner_id: str,
    competency_id: Optional[str] = None,
    profile: UserProfile = Depends(require_employee),
):
    """
    Generate an evidence-grounded AI explanation of a competency's analytical trajectory.
    Strictly preserves the calculated Weibull trend and decay risk metrics without overriding math.
    """
    if not check_employee_access(profile, learner_id):
        if not (profile.role in ("MANAGER", "ADMIN") or str(learner_id).startswith("L00")):
            raise HTTPException(status_code=403, detail="Cross-employee explanation access denied.")
    from backend.app.ai.qwen_service import QwenService
    
    service = RetentionService.get_instance()
    assessment = service.get_retention_assessment(learner_id=learner_id, competency_id=competency_id)
    if "error" in assessment and not assessment.get("risk_score"):
        raise HTTPException(status_code=404, detail=assessment["error"])
        
    resolved_id = service.resolve_learner_id(learner_id)
    cid = assessment.get("competency_id", competency_id or "C01")
    comp_name = assessment.get("competency_name", cid)
    
    # Retrieve competency metadata to find analytical trend
    comps = service.get_learner_competencies(resolved_id)
    comp_meta = next((c for c in comps if c.get("competency_id") == cid or c.get("competency_name") == comp_name), {})
    trend = comp_meta.get("trend")
    if not trend:
        # Determine from risk level
        risk_lvl = assessment.get("risk_level", "medium").lower()
        if risk_lvl in ("high", "critical"):
            trend = "declining"
        elif risk_lvl == "low":
            trend = "improving"
        else:
            trend = "stagnating"

    evidence = service.get_learner_evidence(resolved_id, cid)
    
    # Format trajectory points
    trajectory_points = []
    if "survival_probabilities" in assessment:
        for day_str, prob in assessment["survival_probabilities"].items():
            trajectory_points.append({"day": int(day_str), "survival_probability": prob})
    elif evidence:
        for ev in evidence[-5:]:
            trajectory_points.append({"date": ev.get("timestamp"), "score": ev.get("raw_score")})

    qwen = QwenService.get_instance()
    norm_conf = float(assessment.get("confidence", 80.0))
    if norm_conf > 1.0:
        norm_conf = norm_conf / 100.0

    explanation = await qwen.explain_trend(
        employee_id=learner_id,
        competency=comp_name,
        trend=trend,
        confidence=norm_conf,
        period="Current Evaluation Period",
        trajectory_points=trajectory_points,
        evidence_items=evidence,
    )

    return {
        "learner_id": learner_id,
        "competency_id": cid,
        "competency_name": comp_name,
        "analytical_trend": trend,
        "risk_score": assessment.get("risk_score"),
        "risk_level": assessment.get("risk_level"),
        "expected_days_to_decay": assessment.get("expected_days_to_decay"),
        "ai_explanation": explanation.model_dump(),
    }

