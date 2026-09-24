"""Evidence normalization logic common to all providers."""
import re
from typing import Any

MAX_CONTENT_LENGTH = 1500  # Bound LLM context to prevent flooding Qwen3 with giant blobs


def sanitize_text(text: str | None) -> str:
    """Normalize whitespace and strip control characters."""
    if not text:
        return ""
    # Replace multiple whitespaces/newlines with single equivalents
    cleaned = re.sub(r"[ \t]+", " ", text)
    cleaned = re.sub(r"\n\s*\n+", "\n\n", cleaned)
    return cleaned.strip()


def truncate_content(text: str, max_length: int = MAX_CONTENT_LENGTH) -> str:
    """Truncates text cleanly at word boundaries if it exceeds max_length."""
    cleaned = sanitize_text(text)
    if len(cleaned) <= max_length:
        return cleaned
    truncated = cleaned[:max_length]
    last_space = truncated.rfind(" ")
    if last_space > max_length * 0.8:
        truncated = truncated[:last_space]
    return truncated + " [Content truncated...]"
