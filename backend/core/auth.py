"""Authentication and security utilities: password hashing and JWT issuance."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
import jwt
from backend.core.config import get_settings
from backend.core.logging import get_logger

logger = get_logger("core.auth")

# Secret key used for signing JWTs (derived from Supabase service key or fallback)
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
    """Generate signed JWT access token."""
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
        logger.warning(f"Invalid JWT token: {e}")
        return None
