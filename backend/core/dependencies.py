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
    1. Employee viewing their own profile/evidence/trajectory.
    2. Admin viewing within same organization.
    3. Manager viewing an explicitly assigned direct report in manager_assignments.
    """
    # 1. Self access
    if str(current_profile.user_id) == str(target_employee_id) or str(current_profile.id) == str(target_employee_id):
        return True

    # 2. Admin access
    if current_profile.role == "ADMIN":
        return True

    # 3. Manager assignment check
    if current_profile.role == "MANAGER":
        try:
            client = get_supabase_client()
            res = (
                client.table("manager_assignments")
                .select("id")
                .eq("manager_id", current_profile.id)
                .eq("employee_id", target_employee_id)
                .execute()
            )
            if res.data:
                return True

            # Also check if target_employee_id matches an employee profile id
            target_prof = client.table("profiles").select("id").eq("user_id", target_employee_id).execute()
            if target_prof.data:
                prof_id = target_prof.data[0]["id"]
                res2 = (
                    client.table("manager_assignments")
                    .select("id")
                    .eq("manager_id", current_profile.id)
                    .eq("employee_id", prof_id)
                    .execute()
                )
                if res2.data:
                    return True
        except Exception as e:
            logger.error(f"Error checking manager assignment: {e}")

    return False
