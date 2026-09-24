"""Authentication and Profile Onboarding Endpoints."""
from typing import Any, Dict
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends, Header
from backend.core.auth import hash_password, verify_password, create_access_token, decode_access_token
from backend.core.security import redact_value
from backend.core.logging import get_logger
from backend.db.client import get_supabase_client
from backend.evidence.identity_resolver import IdentityResolver
from backend.schemas.auth import RegisterRequest, LoginRequest, AuthResponse

logger = get_logger("api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication & Onboarding"])


def get_current_employee_id(authorization: str = Header(None)) -> str:
    """Dependency to extract employee_id from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["sub"]


@router.post("/register", response_model=AuthResponse)
async def register_employee(req: RegisterRequest):
    """
    Onboard a new employee with unified profile and credentials:
    1. Creates employee record with encrypted password in Supabase.
    2. Registers GitHub and Jira identities in integration_identities.
    3. Securely stores integration configurations in integrations table.
    4. Issues JWT access token.
    """
    client = get_supabase_client()
    normalized_email = req.email.lower().strip()

    # Check if email is already taken
    existing = client.table("employees").select("id").eq("email", normalized_email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"Employee with email '{normalized_email}' is already registered.")

    # Create employee in Supabase
    emp_id = str(uuid4())
    hashed_pwd = hash_password(req.password)
    
    emp_payload = {
        "id": emp_id,
        "name": req.name.strip(),
        "email": normalized_email,
        "password_hash": hashed_pwd,
        "role": req.role.strip() if req.role else "Software Engineer",
        "department": req.department.strip() if req.department else "Engineering",
    }
    client.table("employees").insert(emp_payload).execute()
    logger.info(f"Registered new employee: {req.name} ({emp_id})")

    resolver = IdentityResolver()
    integrations_summary = {}

    # GitHub Identity & Integration
    if req.github_username or req.github_token:
        username = req.github_username.strip() if req.github_username else req.name.lower().replace(" ", "")
        resolver.map_identity(
            employee_id=emp_id,
            provider="github",
            external_username=username,
            external_email=normalized_email
        )
        gh_config = {
            "token": req.github_token or "",
            "owner": req.github_repository_owner or "",
            "repo": req.github_repository_name or "",
        }
        client.table("integrations").insert({
            "owner_id": emp_id,
            "provider": "github",
            "status": "active" if req.github_token else "pending_token",
            "configuration_metadata": gh_config,
        }).execute()
        integrations_summary["github"] = {
            "username": username,
            "configured": bool(req.github_token),
            "owner": req.github_repository_owner or "",
            "repo": req.github_repository_name or "",
        }

    # Jira Identity & Integration
    if req.jira_email or req.jira_api_token:
        jira_email_norm = req.jira_email.lower().strip() if req.jira_email else normalized_email
        resolver.map_identity(
            employee_id=emp_id,
            provider="jira",
            external_username=jira_email_norm,
            external_email=jira_email_norm
        )
        jira_config = {
            "base_url": req.jira_base_url or "",
            "email": jira_email_norm,
            "token": req.jira_api_token or "",
            "project_key": req.jira_project_key or "",
        }
        client.table("integrations").insert({
            "owner_id": emp_id,
            "provider": "jira",
            "status": "active" if req.jira_api_token else "pending_token",
            "configuration_metadata": jira_config,
        }).execute()
        integrations_summary["jira"] = {
            "base_url": req.jira_base_url or "",
            "email": jira_email_norm,
            "configured": bool(req.jira_api_token),
            "project_key": req.jira_project_key or "",
        }

    # Issue JWT token
    token = create_access_token({"sub": emp_id, "email": normalized_email, "name": req.name})

    clean_emp = {
        "id": emp_id,
        "name": req.name,
        "email": normalized_email,
        "role": emp_payload["role"],
        "department": emp_payload["department"],
    }

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        employee=clean_emp,
        integrations=integrations_summary,
    )


@router.post("/login", response_model=AuthResponse)
async def login_employee(req: LoginRequest):
    """Authenticate registered employee and return their active credentials summary."""
    client = get_supabase_client()
    normalized_email = req.email.lower().strip()

    res = client.table("employees").select("*").eq("email", normalized_email).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    emp = res.data[0]
    stored_hash = emp.get("password_hash")
    if not stored_hash or not verify_password(req.password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    emp_id = emp["id"]

    # Retrieve configured integrations
    integrations_res = client.table("integrations").select("*").eq("owner_id", emp_id).execute()
    integrations_summary = {}
    for integ in integrations_res.data or []:
        prov = integ["provider"]
        meta = integ.get("configuration_metadata", {})
        integrations_summary[prov] = {
            "status": integ.get("status"),
            "owner": meta.get("owner", ""),
            "repo": meta.get("repo", ""),
            "project_key": meta.get("project_key", ""),
            "base_url": meta.get("base_url", ""),
            "configured": bool(meta.get("token")),
        }

    token = create_access_token({"sub": emp_id, "email": normalized_email, "name": emp.get("name")})

    clean_emp = {
        "id": emp_id,
        "name": emp.get("name"),
        "email": normalized_email,
        "role": emp.get("role"),
        "department": emp.get("department"),
    }

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        employee=clean_emp,
        integrations=integrations_summary,
    )


@router.get("/me")
async def get_my_profile(employee_id: str = Depends(get_current_employee_id)):
    """Retrieve authenticated employee profile and active identity mappings."""
    client = get_supabase_client()
    emp_res = client.table("employees").select("id, name, email, role, department, created_at").eq("id", employee_id).execute()
    if not emp_res.data:
        raise HTTPException(status_code=404, detail="Employee not found")

    identities_res = client.table("integration_identities").select("*").eq("employee_id", employee_id).execute()
    integrations_res = client.table("integrations").select("*").eq("owner_id", employee_id).execute()

    return {
        "employee": emp_res.data[0],
        "identities": identities_res.data or [],
        "integrations": integrations_res.data or [],
    }
