"""API Routes for Enhancement 8.5: Evidence Staleness & Confidence Decay Visualization."""
from fastapi import APIRouter, Depends, HTTPException

from ..schemas.confidence_schema import ConfidenceDecayResponse
from ..services.confidence_decay_service import ConfidenceDecayService

router = APIRouter(tags=["8.5 Evidence Staleness & Confidence Decay"])


def get_confidence_decay_service() -> ConfidenceDecayService:
    return ConfidenceDecayService()


@router.get("/confidence-decay/{learner_id}/{competency_id}", response_model=ConfidenceDecayResponse)
def get_confidence_decay(
    learner_id: str,
    competency_id: str,
    service: ConfidenceDecayService = Depends(get_confidence_decay_service)
):
    """
    Returns telemetry freshness meter, 4-factor confidence model output,
    and longitudinal uncertainty bands reflecting evidence staleness.
    """
    try:
        return service.compute_confidence_decay(learner_id, competency_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute confidence decay: {str(e)}")
