"""API Routes for Enhancement 8.6: Manager Team Skill Heatmap."""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Dict, Any

from ..schemas.heatmap_schema import TeamHeatmapResponse
from ..services.heatmap_service import HeatmapService

router = APIRouter(tags=["8.6 Manager Team Skill Heatmap"])


def get_heatmap_service() -> HeatmapService:
    return HeatmapService()


@router.get("/team-heatmap", response_model=TeamHeatmapResponse)
def get_team_heatmap(
    team_id: str = Query("Engineering", description="Department or Team ID"),
    service: HeatmapService = Depends(get_heatmap_service)
):
    """
    Returns matrix of Team Members x Competencies with directional icons (↑, →, ↓, ?),
    team-level aggregates, and actionable skill gap insights.
    """
    try:
        return service.generate_team_heatmap(team_id=team_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate team heatmap: {str(e)}")


@router.get("/teams")
def list_available_teams(
    service: HeatmapService = Depends(get_heatmap_service)
) -> List[Dict[str, Any]]:
    """
    Returns list of active departments/teams for filtering the heatmap.
    """
    return service.repo.get_teams()


@router.get("/learners")
def list_available_learners(
    service: HeatmapService = Depends(get_heatmap_service)
) -> List[Dict[str, Any]]:
    """
    Returns list of active learners with roles and departments for filter selection.
    """
    df = service.retention_service.learners_df
    if df is None or df.empty:
        return []
    records = []
    for _, row in df.iterrows():
        lid = str(row["learner_id"])
        name = str(row.get("name") or lid.replace('_', ' ').title())
        role = str(row.get("role", "Engineer"))
        dept = str(row.get("department", "Core Engineering"))
        records.append({
            "learner_id": lid,
            "name": name,
            "role": role,
            "department": dept
        })
    return records
