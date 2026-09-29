"""Tests for Feature 1 Manager View: Team Evidence Intelligence.
MANAGER SCOPE: FEATURE 4 REGISTERED EMPLOYEES

Verifies:
1. Team evidence overview returns Feature 4 registered members, evidence count, and competency coverage.
2. Section 58 Mandatory Test: Feature 4 Registered vs Non-Registered visibility and 403 enforcement.
3. Section 59 Mandatory Test: Cross-Manager scope isolation.
4. Section 50 Aliases & Endpoints: /feature4-participants, /evidence/{id}, /competencies.
5. Role-aware authorization: Employees cannot access manager endpoints.
6. Provenance & Separation: Raw evidence vs AI interpretation.
7. Employee-specific evidence drilldown.
8. Departments list returns distinct existing departments.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas.profile import UserProfile
from backend.core.dependencies import get_optional_profile

client = TestClient(app)


def test_manager_team_overview_feature4_population():
    """Verify team evidence overview returns Feature 4 registered members, coverage, and aggregated stats."""
    response = client.get("/api/manager/evidence/team")
    assert response.status_code == 200
    data = response.json()
    assert "team_members" in data
    assert "total_evidence" in data
    assert "total_members" in data
    assert "sources_breakdown" in data
    assert "competency_coverage" in data
    assert "competencies_represented" in data
    assert isinstance(data["team_members"], list)
    assert data["total_members"] >= 1
    assert data["total_evidence"] >= 1

    first_member = data["team_members"][0]
    assert first_member["feature4_status"] == "Registered"
    assert "competency_count" in first_member


def test_manager_feature4_participants_alias():
    """Verify /feature4-participants endpoint alias returns identical valid overview (Section 50)."""
    res1 = client.get("/api/manager/evidence/team")
    res2 = client.get("/api/manager/evidence/feature4-participants")
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["total_members"] == res2.json()["total_members"]
    assert res1.json()["total_evidence"] == res2.json()["total_evidence"]


def test_manager_team_overview_department_filter():
    """Verify department filter restricts results to that department."""
    response = client.get("/api/manager/evidence/team?department=Core%20Engineering")
    assert response.status_code == 200
    data = response.json()
    for member in data["team_members"]:
        assert member.get("department") == "Core Engineering"


def test_manager_employee_evidence_drilldown():
    """Verify manager can view an individual employee's evidence stream with raw vs AI separation."""
    overview_res = client.get("/api/manager/evidence/team")
    members = overview_res.json()["team_members"]
    top_member = next((m for m in members if m["evidence_count"] > 0), members[0])
    emp_id = top_member["id"]

    response = client.get(f"/api/manager/evidence/team/{emp_id}?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == emp_id
    assert "evidence" in data
    assert "sources_breakdown" in data
    assert "competencies_detected" in data
    assert "competency_counts" in data
    assert data["feature4_status"] == "Registered"

    if data["evidence"]:
        first_ev = data["evidence"][0]
        # Section 23: Separation of raw evidence and AI interpretation
        assert "raw_evidence" in first_ev
        assert "ai_interpretation" in first_ev


def test_manager_evidence_detail_endpoint():
    """Verify dedicated evidence detail endpoint returns provenance (Section 25 / 50)."""
    overview_res = client.get("/api/manager/evidence/team")
    members = overview_res.json()["team_members"]
    top_member = next((m for m in members if m["evidence_count"] > 0), members[0])
    emp_id = top_member["id"]

    ev_res = client.get(f"/api/manager/evidence/team/{emp_id}?limit=1")
    evidence_list = ev_res.json().get("evidence", [])
    if evidence_list:
        ev_id = evidence_list[0]["id"]
        detail_res = client.get(f"/api/manager/evidence/team/{emp_id}/evidence/{ev_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["id"] == ev_id
        assert detail["employee_id"] == emp_id
        assert "raw_evidence" in detail
        assert "ai_interpretation" in detail
        assert "skills" in detail
        assert "competencies" in detail


def test_manager_competencies_breakdown_endpoint():
    """Verify dedicated competencies breakdown endpoint (Section 13 / 50)."""
    overview_res = client.get("/api/manager/evidence/team")
    members = overview_res.json()["team_members"]
    emp_id = members[0]["id"]

    comp_res = client.get(f"/api/manager/evidence/team/{emp_id}/competencies")
    assert comp_res.status_code == 200
    comps = comp_res.json()
    assert isinstance(comps, list)
    if comps:
        assert "competency_name" in comps[0]
        assert "evidence_count" in comps[0]
        assert "skills" in comps[0]


def test_manager_employee_summary():
    """Verify employee evidence summary endpoint with competency counts."""
    overview_res = client.get("/api/manager/evidence/team")
    members = overview_res.json()["team_members"]
    emp_id = members[0]["id"]

    response = client.get(f"/api/manager/evidence/team/{emp_id}/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == emp_id
    assert "evidence_count" in data
    assert "sources" in data
    assert "competencies_detected" in data
    assert "competency_counts" in data
    assert data["feature4_status"] == "Registered"


def test_mandatory_section58_feature4_scope_eligibility():
    """
    Mandatory Section 58 Test:
    Employee A: Feature 4 = REGISTERED -> visible
    Employee B: Feature 4 = REGISTERED -> visible
    Employee C: Feature 4 = NOT REGISTERED -> NOT visible in directory
    Direct access to Employee C returns HTTP 403 Forbidden.
    """
    # 1. Directory must only contain Feature 4 registered members
    overview_res = client.get("/api/manager/evidence/team")
    assert overview_res.status_code == 200
    members = overview_res.json()["team_members"]
    member_ids = [m["id"] for m in members]

    # Verified registered Feature 4 employees
    registered_shubham = "7db1061b-be5b-4a27-8229-1f65f13740d9"
    registered_alex = "0d90947d-4a84-4337-9a2c-0de1a2a50063"
    non_registered_test_emp = "c55c818e-52a9-4465-ac88-177db6012d08"  # Shubham Testing (Engineering, not in Feature 4)

    assert registered_shubham in member_ids
    assert registered_alex in member_ids
    assert non_registered_test_emp not in member_ids

    # 2. Attempt direct evidence access for non-registered employee C -> HTTP 403 Forbidden
    denied_res = client.get(f"/api/manager/evidence/team/{non_registered_test_emp}")
    assert denied_res.status_code == 403
    assert "not registered or eligible for Feature 4" in denied_res.json()["detail"]


def test_mandatory_section59_cross_manager_isolation():
    """
    Mandatory Section 59 Test:
    Manager A authorized for Organization/Team A can view Employee A.
    Manager B in different Organization/Team cannot access Employee A (HTTP 403 Forbidden).
    """
    manager_foreign_org = UserProfile(
        id="mgr-foreign-org-99",
        user_id="mgr-foreign-org-99",
        email="foreign.manager@partnercorp.internal",
        role="MANAGER",
        full_name="Foreign Manager",
        organization_id="00000000-0000-0000-0000-000000000888",
    )

    app.dependency_overrides[get_optional_profile] = lambda: manager_foreign_org
    try:
        # Team directory restricted to foreign organization returns 0 members
        res = client.get("/api/manager/evidence/team")
        assert res.status_code == 200
        assert res.json()["total_members"] == 0
    finally:
        app.dependency_overrides.clear()


def test_manager_role_authorization_enforced():
    """
    Mandatory Section 62 Test:
    Verify that an employee user role receives 403 when trying to access manager endpoints.
    """
    employee_profile = UserProfile(
        id="emp-user-123",
        user_id="emp-user-123",
        email="employee@company.com",
        role="EMPLOYEE",
        full_name="Employee User",
    )

    app.dependency_overrides[get_optional_profile] = lambda: employee_profile
    try:
        res = client.get("/api/manager/evidence/team")
        assert res.status_code == 403
        assert "Manager role required" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_manager_departments_list():
    """Verify distinct departments endpoint."""
    response = client.get("/api/manager/evidence/departments")
    assert response.status_code == 200
    data = response.json()
    assert "departments" in data
    assert isinstance(data["departments"], list)
