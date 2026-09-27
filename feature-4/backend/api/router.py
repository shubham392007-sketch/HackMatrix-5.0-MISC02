"""Master API Router for Feature 4: Growth Intelligence & Manager Insights."""
from fastapi import APIRouter

from .growth_narrative import router as narrative_router
from .peer_benchmark import router as benchmark_router
from .confidence_decay import router as confidence_router
from .team_heatmap import router as heatmap_router

feature4_router = APIRouter(prefix="/feature4", tags=["Feature 4 - Growth Intelligence"])

feature4_router.include_router(narrative_router)
feature4_router.include_router(benchmark_router)
feature4_router.include_router(confidence_router)
feature4_router.include_router(heatmap_router)
