import logging
import json
import sys
import re
from datetime import datetime, timezone
from typing import Any, Dict


# Patterns to redact
_SECRET_FIELD_REGEX = re.compile(
    r"(token|secret|key|password|credential|authorization|pat|api_token)",
    re.IGNORECASE,
)
_BEARER_TOKEN_REGEX = re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE)
_GITHUB_PAT_REGEX = re.compile(r"(ghp_[A-Za-z0-9_]{36}|github_pat_[A-Za-z0-9_]{82})", re.IGNORECASE)
_JWT_REGEX = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")


def mask_secret(value: str) -> str:
    if not value or not isinstance(value, str):
        return "[EMPTY]"
    if len(value) <= 6:
        return "***"
    return f"{value[:3]}***{value[-3:]}"


def sanitize_data(data: Any, depth: int = 0, max_depth: int = 5) -> Any:
    if depth > max_depth:
        return data
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if _SECRET_FIELD_REGEX.search(str(k)):
                sanitized[k] = mask_secret(str(v))
            else:
                sanitized[k] = sanitize_data(v, depth + 1, max_depth)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_data(item, depth + 1, max_depth) for item in data]
    elif isinstance(data, str):
        text = _BEARER_TOKEN_REGEX.sub("Bearer [REDACTED]", data)
        text = _GITHUB_PAT_REGEX.sub("[GITHUB_PAT_REDACTED]", text)
        text = _JWT_REGEX.sub("[JWT_REDACTED]", text)
        return text
    return data


class StructuredJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": sanitize_data(record.getMessage()),
        }
        if hasattr(record, "run_id"):
            log_payload["run_id"] = record.run_id
        if hasattr(record, "user_id"):
            log_payload["user_id"] = record.user_id
        if hasattr(record, "stage"):
            log_payload["stage"] = record.stage
        if record.exc_info and record.exc_info[1]:
            log_payload["exception"] = str(record.exc_info[1])

        return json.dumps(log_payload)


def setup_logging(debug: bool = False) -> None:
    level = logging.DEBUG if debug else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredJsonFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Silence noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"skillpassport.{name}")
