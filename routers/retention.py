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
