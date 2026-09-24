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
