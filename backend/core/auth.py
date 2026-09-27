"""Authentication and security utilities: password hashing, Supabase JWT verification, and profile mapping."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
import jwt
from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.db.client import get_supabase_client
from backend.schemas.profile import UserProfile

logger = get_logger("core.auth")

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7


def get_jwt_secret() -> str:
    settings = get_settings()
    return settings.supabase_service_role_key[:32] if settings.supabase_service_role_key else "growthlens-secret-key-32chars-min"


def hash_password(password: str) -> str:
    """Hash plaintext password with salt using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT access token for testing or local prototype fallback."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=JWT_EXPIRATION_DAYS))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, get_jwt_secret(), algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate signed JWT token."""
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        logger.debug(f"Local JWT decode: {e}")
        return None


def verify_supabase_jwt(token: str) -> Optional[Dict[str, Any]]:
    """
    Authoritative Supabase JWT verification.
    1. Validates token with Supabase Auth via get_user(token).
    2. Falls back to local signature verification if local dev token.
    """
    try:
        client = get_supabase_client()
        user_res = client.auth.get_user(token)
        if user_res and user_res.user:
            u = user_res.user
            meta = getattr(u, "user_metadata", {}) or {}
            return {
                "id": str(u.id),
                "sub": str(u.id),
                "email": u.email,
                "role": meta.get("role", "EMPLOYEE"),
                "full_name": meta.get("full_name") or u.email.split("@")[0],
                "aud": getattr(u, "aud", "authenticated"),
            }
    except Exception as e:
        logger.debug(f"Supabase auth.get_user verification failed, checking local signature: {e}")

    # Fallback to local signed token for unit tests or internal services
    local_payload = decode_access_token(token)
    if local_payload:
        sub = local_payload.get("sub") or local_payload.get("user_id")
        return {
            "id": str(sub),
            "sub": str(sub),
            "email": local_payload.get("email", ""),
            "role": local_payload.get("role", "EMPLOYEE"),
            "full_name": local_payload.get("name") or local_payload.get("full_name", ""),
            "aud": "authenticated",
        }

    return None


def get_profile_by_user_id(user_id: str) -> Optional[UserProfile]:
    """Retrieve profile by user_id from Supabase profiles, with fallback to legacy employees table."""
    try:
        client = get_supabase_client()
        res = client.table("profiles").select("*").eq("user_id", user_id).execute()
        if res.data:
            row = res.data[0]
            return UserProfile(
                id=str(row["id"]),
                user_id=str(row["user_id"]),
                full_name=row.get("full_name", ""),
                email=row.get("email", ""),
                role=row.get("role", "EMPLOYEE"),
                organization_id=str(row["organization_id"]) if row.get("organization_id") else None,
                job_title=row.get("job_title"),
                department=row.get("department"),
                avatar_url=row.get("avatar_url"),
                onboarding_completed=bool(row.get("onboarding_completed", False)),
                created_at=row.get("created_at"),
                updated_at=row.get("updated_at"),
            )

        # Fallback to employees table
        emp_res = client.table("employees").select("*").eq("id", user_id).execute()
        if not emp_res.data:
            emp_res = client.table("employees").select("*").eq("user_id", user_id).execute()

        if emp_res.data:
            emp = emp_res.data[0]
            return UserProfile(
                id=str(emp["id"]),
                user_id=str(emp.get("user_id") or emp["id"]),
                full_name=emp.get("name", ""),
                email=emp.get("email", ""),
                role=emp.get("role", "EMPLOYEE").upper() if emp.get("role") in ("manager", "employee", "admin") else "EMPLOYEE",
                organization_id=str(emp.get("organization_id")) if emp.get("organization_id") else None,
                job_title=emp.get("role"),
                department=emp.get("department"),
                onboarding_completed=True,
                created_at=emp.get("created_at"),
                updated_at=emp.get("updated_at"),
            )

    except Exception as e:
        logger.error(f"Error fetching profile for user_id {user_id}: {e}")

    return None
