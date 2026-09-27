"""Unit and integration tests for Enhancement 8.6: Manager Team Skill Heatmap."""
import pytest
from fastapi.testclient import TestClient

from backend.services.heatmap_service import HeatmapService
from backend.repositories.heatmap_repository import HeatmapRepository
from backend.utils.evidence_utils import get_trend_icon
import main

client = TestClient(main.app)


def test_trend_icon_mapping():
    """Verify accessible directional icons for each trend state."""
    assert get_trend_icon("improving") == "↑"
    assert get_trend_icon("declining") == "↓"
    assert get_trend_icon("stagnating") == "→"
    assert get_trend_icon("unknown") == "?"


def test_heatmap_matrix_structure():
    """Verify team member x competency matrix construction."""
    service = HeatmapService()
    heatmap = service.generate_team_heatmap("Engineering")

    assert heatmap.team_name.lower() == "engineering"
    assert len(heatmap.matrix) > 0
    assert len(heatmap.competencies) >= 4

    # Check first member
    member = heatmap.matrix[0]
    assert member.employee_id is not None
    assert member.role is not None

    for comp in heatmap.competencies:
        cid = comp["competency_id"]
        assert cid in member.cells
        cell = member.cells[cid]
        assert cell.trend in ["improving", "stagnating", "declining", "insufficient_evidence"]
        assert cell.icon in ["↑", "→", "↓", "?"]
        assert 0.0 <= cell.confidence <= 1.0


def test_heatmap_aggregates_and_insights():
    """Verify team-level aggregations and actionable skill gap insights."""
    service = HeatmapService()
    heatmap = service.generate_team_heatmap("Engineering")

    assert len(heatmap.team_aggregates) == len(heatmap.competencies)
    for cid, agg in heatmap.team_aggregates.items():
        assert agg.total_evaluated == len(heatmap.matrix)
        assert agg.dominant_trend in ["improving", "stagnating", "declining", "insufficient_evidence"]

    # Check actionable team insights
    assert len(heatmap.team_insights) > 0
    for insight in heatmap.team_insights:
        assert insight.insight_type in ["skill_gap", "stagnation", "strength", "coverage"]
        assert len(insight.actionable_suggestion) > 10


def test_heatmap_api_endpoints():
    """Verify /api/v1/feature4/team-heatmap and /api/v1/feature4/teams endpoints."""
    # 1. Teams list
    r_teams = client.get("/api/v1/feature4/teams")
    assert r_teams.status_code == 200
    teams_data = r_teams.json()
    assert isinstance(teams_data, list)
    assert len(teams_data) > 0

    # 2. Team Heatmap
    r_heatmap = client.get("/api/v1/feature4/team-heatmap?team_id=Engineering")
    assert r_heatmap.status_code == 200
    heatmap_data = r_heatmap.json()
    assert heatmap_data["total_members"] > 0
    assert "matrix" in heatmap_data
    assert "team_insights" in heatmap_data
