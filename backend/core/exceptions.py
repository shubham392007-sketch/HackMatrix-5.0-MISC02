from typing import Any


class GrowthLensError(Exception):
    """Base exception for GrowthLens."""
    def __init__(self, message: str, error_code: str = "internal_error", details: dict[str, Any] | None = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class DatabaseError(GrowthLensError):
    def __init__(self, message: str = "Database operation failed", details: dict[str, Any] | None = None):
        super().__init__(message, "database_unavailable", details)


class IntegrationError(GrowthLensError):
    """Base for external integration errors."""
    pass


class GitHubIntegrationError(IntegrationError):
    def __init__(self, message: str = "GitHub integration failed", details: dict[str, Any] | None = None):
        super().__init__(message, "github_integration_error", details)


class JiraIntegrationError(IntegrationError):
    def __init__(self, message: str = "Jira integration failed", details: dict[str, Any] | None = None):
        super().__init__(message, "jira_integration_error", details)


class LLMServiceError(GrowthLensError):
    def __init__(self, message: str = "LLM service unavailable", details: dict[str, Any] | None = None):
        super().__init__(message, "llm_service_unavailable", details)


class VectorStoreError(GrowthLensError):
    def __init__(self, message: str = "Vector store unavailable", details: dict[str, Any] | None = None):
        super().__init__(message, "vector_store_unavailable", details)


class IdentityMappingError(GrowthLensError):
    def __init__(self, message: str = "Employee mapping required", details: dict[str, Any] | None = None):
        super().__init__(message, "employee_mapping_required", details)


class EvidenceError(GrowthLensError):
    pass


class InsufficientEvidenceError(EvidenceError):
    def __init__(self, message: str = "Insufficient evidence", details: dict[str, Any] | None = None):
        super().__init__(message, "insufficient_evidence", details)


class CrossEmployeeAccessError(GrowthLensError):
    def __init__(self, message: str = "Cross-employee access denied", details: dict[str, Any] | None = None):
        super().__init__(message, "cross_employee_access_denied", details)
