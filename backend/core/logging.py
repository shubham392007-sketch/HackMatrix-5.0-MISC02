import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

from backend.core.security import redact_dict


class SecureJsonFormatter(logging.Formatter):
    """JSON formatter that redacts secrets from log records."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Add extra fields if present
        if hasattr(record, "run_id"):
            log_data["run_id"] = record.run_id
        if hasattr(record, "source"):
            log_data["source"] = record.source
        if hasattr(record, "employee_id"):
            log_data["employee_id"] = record.employee_id
        if hasattr(record, "processing_stage"):
            log_data["processing_stage"] = record.processing_stage
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "error_category"):
            log_data["error_category"] = record.error_category
        if record.exc_info and record.exc_info[1]:
            log_data["exception"] = str(record.exc_info[1])

        # Redact any secrets
        log_data = redact_dict(log_data)
        return json.dumps(log_data)


def setup_logging(debug: bool = False) -> None:
    """Configure structured logging for the application."""
    level = logging.DEBUG if debug else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(SecureJsonFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Clear existing handlers to avoid duplicates
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger."""
    return logging.getLogger(f"growthlens.{name}")
