"""Comprehensive Automated Test Suite for Supabase Auth, Profiles, RLS, and Role-Based Access Control."""
import uuid
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from main import app
from backend.core.auth import create_access_token
from backend.core.dependencies import check_employee_access
from backend.schemas.profile import UserRole, UserProfile, ProfileUpdateRequest, ManagerAssignmentRequest
from backend.db.client import get_supabase_client


client = TestClient(app)


def test_unauthenticated_request_rejected():
    """Verify endpoints requiring authentication reject unauthenticated requests with 401."""
    response = client.get("/api/profile/me")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_malformed_token_rejected():
    """Verify invalid Bearer tokens are rejected with 401."""
    response = client.get(
        "/api/profile/me",
        headers={"Authorization": "Bearer invalid_malformed_token_xyz"}
    )
    assert response.status_code == 401


def test_role_enum_definitions():
    """Verify UserRole enum values are correctly configured."""
    assert UserRole.EMPLOYEE.value == "EMPLOYEE"
    assert UserRole.MANAGER.value == "MANAGER"
    assert UserRole.ADMIN.value == "ADMIN"


def test_employee_profile_workflow():
    """Verify authenticated employee can read and update their profile."""
    sb = get_supabase_client()
    uid = str(uuid.uuid4())[:8]
    test_email = f"test.emp.{uid}@growthlens.test"

    # Create real Supabase Auth user
    user_res = sb.auth.admin.create_user({
        "email": test_email,
        "password": "ValidPassword123!",
        "email_confirm": True,
        "user_metadata": {
            "full_name": "Test Employee",
            "role": "EMPLOYEE"
        }
    })
    auth_user_id = str(user_res.user.id)

    try:
        # Create token
        token = create_access_token({
            "sub": auth_user_id,
            "email": test_email,
            "role": "EMPLOYEE",
        })
        auth_header = {"Authorization": f"Bearer {token}"}

        # 1. Fetch own profile
        res = client.get("/api/profile/me", headers=auth_header)
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == auth_user_id
        assert data["email"] == test_email
        assert data["role"] == "EMPLOYEE"

        # 2. Update profile
        update_res = client.patch(
            "/api/profile/me",
            json={"job_title": "Senior Software Engineer"},
            headers=auth_header
        )
        assert update_res.status_code == 200
        updated_data = update_res.json()
        assert updated_data["job_title"] == "Senior Software Engineer"

    finally:
        try:
            sb.auth.admin.delete_user(auth_user_id)
        except Exception:
            pass


def test_employee_forbidden_from_manager_endpoints():
    """Verify employees receive HTTP 403 when trying to access manager-only endpoints."""
    test_user_id = str(uuid.uuid4())
    test_email = f"emp.{test_user_id[:8]}@growthlens.test"

    token = create_access_token({
        "sub": test_user_id,
        "email": test_email,
        "role": "EMPLOYEE",
        "organization_id": "00000000-0000-0000-0000-000000000001"
    })
    auth_header = {"Authorization": f"Bearer {token}"}

    # /api/profile/team is manager/admin only
    res = client.get("/api/profile/team", headers=auth_header)
    assert res.status_code == 403


def test_manager_access_to_team_endpoints():
    """Verify managers can access team endpoints."""
    sb = get_supabase_client()
    uid = str(uuid.uuid4())[:8]
    test_mgr_email = f"test.mgr.{uid}@growthlens.test"

    user_res = sb.auth.admin.create_user({
        "email": test_mgr_email,
        "password": "ValidPassword123!",
        "email_confirm": True,
        "user_metadata": {
            "full_name": "Test Manager",
            "role": "MANAGER"
        }
    })
    auth_mgr_id = str(user_res.user.id)

    try:
        token = create_access_token({
            "sub": auth_mgr_id,
            "email": test_mgr_email,
            "role": "MANAGER",
        })
        auth_header = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/profile/team", headers=auth_header)
        assert res.status_code == 200
        team = res.json()
        assert isinstance(team, list)

    finally:
        try:
            sb.auth.admin.delete_user(auth_mgr_id)
        except Exception:
            pass


def test_cross_employee_access_enforcement():
    """Verify check_employee_access prevents unauthorized cross-employee data access."""
    emp_user_id = str(uuid.uuid4())
    other_user_id = str(uuid.uuid4())
    org_id = "00000000-0000-0000-0000-000000000001"

    emp_profile = UserProfile(
        id=emp_user_id,
        user_id=emp_user_id,
        organization_id=org_id,
        email="emp@test.internal",
        role=UserRole.EMPLOYEE,
        full_name="Employee One"
    )

    # 1. Employee accessing their own ID -> should return True
    assert check_employee_access(emp_profile, emp_user_id) is True

    # 2. Employee accessing another user's ID -> should return False
    assert check_employee_access(emp_profile, other_user_id) is False

    # 3. Admin accessing any employee -> should return True
    admin_profile = UserProfile(
        id=str(uuid.uuid4()),
        organization_id=org_id,
        email="admin@test.internal",
        role=UserRole.ADMIN,
        full_name="Admin One"
    )
    assert check_employee_access(admin_profile, other_user_id) is True
