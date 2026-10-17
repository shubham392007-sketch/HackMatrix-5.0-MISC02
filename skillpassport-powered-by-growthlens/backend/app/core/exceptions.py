from typing import Any, Dict, Optional


class SkillPassportError(Exception):
    """Base exception for SkillPassport domain operations."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class EntityNotFoundError(SkillPassportError):
    def __init__(self, entity: str, identifier: str):
        super().__init__(
            message=f"{entity} '{identifier}' not found",
            code="NOT_FOUND",
            details={"entity": entity, "id": identifier},
        )


class UnauthorizedAccessError(SkillPassportError):
    def __init__(self, message: str = "Access denied for this resource"):
        super().__init__(message=message, code="UNAUTHORIZED")


class ConnectorAuthError(SkillPassportError):
    def __init__(self, provider: str, reason: str):
        super().__init__(
            message=f"Authentication to {provider} failed: {reason}",
            code="CONNECTOR_AUTH_FAILED",
            details={"provider": provider, "reason": reason},
        )


class InsufficientPermissionsError(SkillPassportError):
    def __init__(self, provider: str, required_scope: str):
        super().__init__(
            message=f"Insufficient permissions for {provider}. Required: {required_scope}",
            code="INSUFFICIENT_PERMISSIONS",
            details={"provider": provider, "required_scope": required_scope},
        )


class FileValidationError(SkillPassportError):
    def __init__(self, reason: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=f"File validation error: {reason}", code="FILE_VALIDATION_FAILED", details=details)


class SSRFSecurityError(SkillPassportError):
    def __init__(self, target_url: str, reason: str):
        super().__init__(
            message=f"SSRF safety check failed: {reason}",
            code="SSRF_SAFETY_VIOLATION",
            details={"url": target_url, "reason": reason},
        )


class PipelineProcessingError(SkillPassportError):
    def __init__(self, stage: str, message: str, retryable: bool = False):
        super().__init__(
            message=f"Pipeline error at stage '{stage}': {message}",
            code="PROCESSING_ERROR",
            details={"stage": stage, "retryable": retryable},
        )


class DatabaseUnavailableError(SkillPassportError):
    def __init__(self, message: str = "Database service unreachable"):
        super().__init__(message=message, code="DATABASE_UNAVAILABLE")


class StorageUnavailableError(SkillPassportError):
    def __init__(self, message: str = "Supabase object storage unreachable"):
        super().__init__(message=message, code="STORAGE_UNAVAILABLE")
