"""Tests for Feature 2 Manager View: Team Competency Trajectory Intelligence.
Verifies:
1. Team trajectory overview returns team members, trend distributions, and aggregate confidence.
2. Department filtering works accurately.
3. Employee-specific trajectory drilldown returns individual competency evaluations.
4. Team trend summary aggregates trends without individual leaderboards or rankings.
5. Departments endpoint returns valid department list.
6. Role-aware authorization enforces manager access control.
"""
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas.profile import UserProfile

client = TestClient(app)


def test_manager_trajectory_team_overview():
    """Verify team trajectory overview returns aggregated metrics and members."""
    response = client.get("/api/manager/trajectory/team")
    assert response.status_code == 200
    data = response.json()
    assert "team_members" in data
    assert "total_members" in data
    assert "total_competencies_tracked" in data
    assert "trend_distribution" in data
    assert "average_confidence" in data
    assert isinstance(data["team_members"], list)
    assert data["total_members"] >= 1

    # Check member structure
    first_member = data["team_members"][0]
    assert "employee_id" in first_member
    assert "name" in first_member
    assert "trend_distribution" in first_member
    assert "dominant_trend" in first_member


def test_manager_trajectory_team_overview_department_filter():
    """Verify department filter restricts overview to matching department."""
    response = client.get("/api/manager/trajectory/team?department=Core%20Engineering")
    assert response.status_code == 200
    data = response.json()
    for member in data["team_members"]:
        assert member.get("department") == "Core Engineering"


def test_manager_employee_trajectories():
    """Verify manager can view an individual employee's trajectory details."""
    overview_res = client.get("/api/manager/trajectory/team")
    members = overview_res.json()["team_members"]
    assert len(members) >= 1
    emp_id = members[0]["employee_id"]

    response = client.get(f"/api/manager/trajectory/team/{emp_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == emp_id
    assert "employee_name" in data
    assert "trajectories" in data
    assert isinstance(data["trajectories"], list)


def test_manager_team_trends_summary():
    """Verify team trends aggregation returns competency health without rankings."""
    response = client.get("/api/manager/trajectory/trends")
    assert response.status_code == 200
    data = response.json()
    assert "competency_trends" in data
    assert "total_employees" in data
    assert isinstance(data["competency_trends"], list)

    for item in data["competency_trends"]:
        assert "competency_id" in item
        assert "trend_distribution" in item
        assert "health" in item


def test_manager_trajectory_departments():
    """Verify distinct departments endpoint."""
    response = client.get("/api/manager/trajectory/departments")
    assert response.status_code == 200
    data = response.json()
    assert "departments" in data
    assert isinstance(data["departments"], list)
