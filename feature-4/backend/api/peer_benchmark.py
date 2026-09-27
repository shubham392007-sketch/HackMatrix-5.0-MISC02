"""API Routes for Enhancement 8.4: Peer-Percentile Growth Benchmarking."""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from ..schemas.benchmark_schema import BenchmarkRequest, BenchmarkResponse
from ..schemas.narrative_schema import EvaluationPeriod
from ..services.benchmark_service import BenchmarkService

router = APIRouter(tags=["8.4 Peer-Percentile Growth Benchmarking"])


def get_benchmark_service() -> BenchmarkService:
    return BenchmarkService()


@router.post("/benchmark", response_model=BenchmarkResponse)
def calculate_peer_benchmark(
    request: BenchmarkRequest,
    service: BenchmarkService = Depends(get_benchmark_service)
):
    """
    Computes privacy-safe growth percentile relative to peers starting at a comparable level.
    Enforces minimum cohort size (k-anonymity) and presents only bucketed cohort sizes.
    """
    try:
        return service.calculate_peer_benchmark(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate peer benchmark: {str(e)}")


@router.get("/benchmark/{learner_id}/{competency_id}", response_model=BenchmarkResponse)
def get_peer_benchmark_quick(
    learner_id: str,
    competency_id: str,
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    service: BenchmarkService = Depends(get_benchmark_service)
):
    """
    Convenience GET endpoint for peer-percentile benchmarking.
    """
    period = None
    if start_date and end_date:
        period = EvaluationPeriod(start_date=start_date, end_date=end_date)

    req = BenchmarkRequest(
        learner_id=learner_id,
        competency_id=competency_id,
        evaluation_period=period
    )
    return service.calculate_peer_benchmark(req)
