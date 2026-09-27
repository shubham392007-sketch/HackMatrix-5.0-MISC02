import re
from typing import Any

# Patterns that indicate secret values
_SECRET_FIELD_PATTERNS = [
    re.compile(r"(token|secret|key|password|credential|authorization)", re.IGNORECASE),
]

_SECRET_VALUE_PATTERNS = [
    re.compile(r"^(eyJ[A-Za-z0-9_-]+)"),  # JWT tokens
    re.compile(r"^(ghp_[A-Za-z0-9]+)"),    # GitHub PATs
    re.compile(r"^(xox[bpsa]-[A-Za-z0-9]+)"),  # Slack tokens
]


def redact_value(value: str, visible_chars: int = 4) -> str:
    """Redact a secret value, showing only the first few chars."""
    if not value or len(value) <= visible_chars:
        return "***REDACTED***"
    return value[:visible_chars] + "***REDACTED***"


def is_secret_field(field_name: str) -> bool:
    """Check if a field name likely contains a secret."""
    return any(p.search(field_name) for p in _SECRET_FIELD_PATTERNS)


def redact_dict(data: dict[str, Any], depth: int = 0, max_depth: int = 5) -> dict[str, Any]:
    """Recursively redact secrets from a dictionary."""
    if depth > max_depth:
        return data
    result = {}
    for key, value in data.items():
        if is_secret_field(key) and isinstance(value, str):
            result[key] = redact_value(value)
        elif isinstance(value, dict):
            result[key] = redact_dict(value, depth + 1, max_depth)
        else:
            result[key] = value
    return result


def sanitize_for_llm(text: str) -> str:
    """Remove potential secrets from text before sending to LLM."""
    sanitized = text
    for pattern in _SECRET_VALUE_PATTERNS:
        sanitized = pattern.sub("[REDACTED]", sanitized)
    return sanitized


def _get_fernet_key() -> bytes:
    """Derives a 32-byte URL-safe base64-encoded key from secret settings."""
    import base64
    import hashlib
    from backend.core.config import get_settings
    settings = get_settings()
    secret = (
        getattr(settings, "encryption_key", None)
        or settings.supabase_service_role_key
        or "growthlens_fallback_encryption_key_change_in_prod"
    )
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_credentials(payload: dict[str, Any]) -> str:
    """Encrypts credentials dictionary into a secure ciphertext string."""
    import json
    from cryptography.fernet import Fernet
    key = _get_fernet_key()
    fernet = Fernet(key)
    raw_json = json.dumps(payload).encode("utf-8")
    return fernet.encrypt(raw_json).decode("utf-8")


def decrypt_credentials(ciphertext: str) -> dict[str, Any]:
    """Decrypts ciphertext string back into credentials dictionary."""
    import json
    from cryptography.fernet import Fernet
    key = _get_fernet_key()
    fernet = Fernet(key)
    decrypted_bytes = fernet.decrypt(ciphertext.encode("utf-8"))
    return json.loads(decrypted_bytes.decode("utf-8"))


def mask_token(token: str, visible_start: int = 4, visible_end: int = 4) -> str:
    """Masks secret token showing first and last few characters."""
    if not token or len(token) <= (visible_start + visible_end):
        return "***REDACTED***"
    return f"{token[:visible_start]}...{token[-visible_end:]}"
