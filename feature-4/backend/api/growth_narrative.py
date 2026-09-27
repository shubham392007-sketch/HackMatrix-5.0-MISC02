"""API Routes for Enhancement 8.3: Auto-Generated Growth Narrative."""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from ..schemas.narrative_schema import (
    GrowthNarrativeRequest,
    GrowthNarrativeResponse,
    EvaluationPeriod
)
from ..services.narrative_service import NarrativeService

router = APIRouter(tags=["8.3 Auto-Generated Growth Narrative"])


def get_narrative_service() -> NarrativeService:
    return NarrativeService()


@router.post("/narrative", response_model=GrowthNarrativeResponse)
async def generate_growth_narrative(
    request: GrowthNarrativeRequest,
    service: NarrativeService = Depends(get_narrative_service)
):
    """
    Generates an evidence-grounded Growth Narrative and Manager Briefing
    with strict fact verification against logged evidence.
    """
    try:
        return await service.generate_narrative(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate growth narrative: {str(e)}")


@router.get("/narrative/{learner_id}", response_model=GrowthNarrativeResponse)
async def get_latest_growth_narrative(
    learner_id: str,
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    service: NarrativeService = Depends(get_narrative_service)
):
    """
    Convenience GET endpoint retrieving or generating narrative for learner.
    """
    req = GrowthNarrativeRequest(
        learner_id=learner_id,
        evaluation_period=EvaluationPeriod(
            start_date=start_date or "2026-05-01",
            end_date=end_date or "2026-09-30"
        )
    )
    return await service.generate_narrative(req)
