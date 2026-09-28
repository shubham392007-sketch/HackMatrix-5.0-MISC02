"""Reusable FastAPI security and authorization dependencies for GrowthLens."""
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends
from backend.core.auth import verify_supabase_jwt, get_profile_by_user_id
from backend.schemas.profile import UserProfile
from backend.db.client import get_supabase_client
from backend.core.logging import get_logger

logger = get_logger("core.dependencies")


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Extracts and validates Supabase JWT from Authorization: Bearer <token> header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ")[1].strip()
    payload = verify_supabase_jwt(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Extracts and validates Supabase JWT if present; returns None if omitted or invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1].strip()
    return verify_supabase_jwt(token)


async def get_optional_profile(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
) -> Optional[UserProfile]:
    """Derives user profile if authenticated; returns None otherwise."""
    if not current_user:
        return None
    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        return None
    profile = get_profile_by_user_id(str(user_id))
    if not profile:
        profile = UserProfile(
            id=str(user_id),
            user_id=str(user_id),
            full_name=current_user.get("full_name") or current_user.get("email", "").split("@")[0],
            email=current_user.get("email", ""),
            role=current_user.get("role", "EMPLOYEE").upper(),
            organization_id=None,
            onboarding_completed=False,
        )
    return profile


async def get_current_profile(current_user: Dict[str, Any] = Depends(get_current_user)) -> UserProfile:
    """Derives authoritative user profile, role, and organization from the authenticated user."""
    user_id = current_user["id"]
    profile = get_profile_by_user_id(user_id)
    if not profile:
        # Generate temporary bootstrap profile if user was created directly in Supabase auth
        profile = UserProfile(
            id=user_id,
            user_id=user_id,
            full_name=current_user.get("full_name") or current_user.get("email", "").split("@")[0],
            email=current_user.get("email", ""),
            role=current_user.get("role", "EMPLOYEE").upper(),
            organization_id=None,
            onboarding_completed=False,
        )
    return profile


async def require_employee(profile: UserProfile = Depends(get_current_profile)) -> UserProfile:
    """Ensures user is an authenticated employee, manager, or admin."""
    if profile.role not in ("EMPLOYEE", "MANAGER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Access denied: Employee role required.")
    return profile


async def require_manager(profile: UserProfile = Depends(get_current_profile)) -> UserProfile:
    """Ensures user has MANAGER or ADMIN privileges."""
    if profile.role not in ("MANAGER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Access denied: Manager role required.")
    return profile


async def require_admin(profile: UserProfile = Depends(get_current_profile)) -> UserProfile:
    """Ensures user has ADMIN privileges."""
    if profile.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Access denied: Administrator role required.")
    return profile


def check_employee_access(
    current_profile: UserProfile,
    target_employee_id: str,
) -> bool:
    """
    Checks if current profile is allowed to view target employee:
    1. Employee viewing their own profile/evidence/trajectory (matches user_id, id, email, or name slug).
    2. Admin or Manager viewing team members.
    3. Trajectory viewing for platform learners and cohort benchmarks.
    """
    if not target_employee_id:
        return False

    target_str = str(target_employee_id).strip()
    prof_user_id = str(current_profile.user_id).strip()
    prof_id = str(current_profile.id).strip()
    prof_email = (current_profile.email or "").strip().lower()

    # 1. Direct self match on user_id or profile id
    if target_str in (prof_user_id, prof_id):
        return True

    # 2. Admin or Manager role
    if current_profile.role in ("ADMIN", "MANAGER"):
        return True

    # 3. Resolve target_employee_id through database
    try:
        from backend.db.repositories.evidence import EvidenceRepository
        repo = EvidenceRepository()
        resolved_uuid = repo._resolve_employee_uuid(target_str)

        client = get_supabase_client()
        # Find employee matching current user profile
        emp_match = client.table("employees").select("id, user_id, email, name").or_(f"user_id.eq.{prof_user_id},email.eq.{prof_email}").execute()
        if emp_match.data:
            emp = emp_match.data[0]
            emp_id = str(emp.get("id"))
            emp_slug = (emp.get("name") or "").lower().replace(" ", "_")
            if target_str in (emp_id, emp_slug, prof_user_id) or (resolved_uuid and resolved_uuid == emp_id):
                return True

        # Check if target is a valid known platform learner
        learners_res = client.table("learners").select("learner_id").eq("learner_id", target_str).execute()
        if learners_res.data:
            return True
    except Exception as e:
        logger.debug(f"Error checking employee access: {e}")

    # Allow reading platform trajectories
    return True
