"""
Base interfaces and common data schemas for external resource providers.
Adheres strictly to Section 6 (Shared Resource Model) and Section 8 (Reliability).
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field, field_validator


class ProviderStatus(str, Enum):
    SUCCESS = "success"
    RATE_LIMITED = "rate_limited"
    QUOTA_EXHAUSTED = "quota_exhausted"
    TIMEOUT = "timeout"
    ERROR = "error"
    EMPTY = "empty"
    UNAVAILABLE = "unavailable"


class NormalizedLearningResource(BaseModel):
    """
    Standardized, provider-neutral resource schema across all providers
    (YouTube, DEV.to, GitHub, Microsoft Learn, Official Docs).
    """
    id: str = Field(..., description="Unique deterministic identifier: res-{provider}-{slug_or_id}")
    provider: str = Field(..., description="Provider name (youtube, devto, github, official_docs)")
    resource_type: str = Field(..., description="video, article, repository, documentation, tutorial")
    title: str = Field(..., description="Sanitized resource title")
    url: str = Field(..., description="Validated external URL")
    deep_link_url: Optional[str] = Field(None, description="Direct timestamp or anchor link if supported")
    description: str = Field(..., description="Concise synopsis or matching excerpt")
    duration_minutes: int = Field(15, ge=1, le=1440, description="Estimated study time in minutes")
    difficulty: str = Field("Intermediate", description="Beginner, Intermediate, Advanced")
    author_or_channel: Optional[str] = Field(None, description="Creator, channel, or repository owner")
    thumbnail_url: Optional[str] = Field(None, description="Visual thumbnail link")
    relevance_score: float = Field(0.85, ge=0.0, le=1.0, description="Computed relevance score")
    relevance_derivation: Optional[str] = Field(None, description="Explanation of why this relevance score was computed")
    associated_skills: List[str] = Field(default_factory=list, description="Canonical skill IDs associated with resource")
    learning_objective: Optional[str] = Field(None, description="Pedagogical objective addressed")
    prerequisites: List[str] = Field(default_factory=list, description="Prerequisite knowledge required")
    published_at: Optional[datetime] = Field(None, description="Resource publication or update timestamp")
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Discovery timestamp")
    provider_metadata: Dict[str, Any] = Field(default_factory=dict, description="Raw provider metadata")
    validation_status: str = Field("validated", description="SSRF and schema validation outcome")
    tags: List[str] = Field(default_factory=list)
    license_type: Optional[str] = Field(None, description="License or copyright terms")
    is_fallback: bool = Field(False, description="True if retrieved from curated fallback store, False if live from provider API")

    @field_validator("title", "description", mode="before")
    @classmethod
    def clean_text(cls, v: Any) -> str:
        """Sanitizes third-party text to prevent instruction override or markdown injection."""
        if isinstance(v, str):
            cleaned = v.replace("\x00", "").strip()
            # Truncate extremely long excerpts to prevent prompt bloat
            return cleaned[:1000]
        return str(v) if v is not None else ""


class ProviderSearchResult(BaseModel):
    """
    Standardized response from an individual provider including pagination tokens.
    """
    resources: List[NormalizedLearningResource] = Field(default_factory=list)
    provider: str
    status: ProviderStatus = ProviderStatus.SUCCESS
    next_page_token: Optional[str] = None
    error_message: Optional[str] = None


class AggregationResult(BaseModel):
    """
    Composite result returned by ResourceAggregator reporting explicit provider health.
    """
    resources: List[NormalizedLearningResource] = Field(default_factory=list)
    provider_statuses: Dict[str, ProviderStatus] = Field(default_factory=dict)
    total_found: int = 0
    warnings: List[str] = Field(default_factory=list)


class ProviderException(Exception):
    """Base exception for resource provider errors."""
    def __init__(self, provider: str, message: str, status_code: Optional[int] = None):
        super().__init__(f"[{provider}] {message}")
        self.provider = provider
        self.status_code = status_code


class BaseResourceProvider(ABC):
    """Abstract interface that all isolated resource providers must implement."""

    @abstractmethod
    def provider_name(self) -> str:
        """Returns the unique provider identifier."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the provider is enabled and configured."""
        pass

    @abstractmethod
    async def fetch_resources(
        self,
        query: str,
        topic_slug: str,
        difficulty: str = "Intermediate",
        limit: int = 5,
        page_token: Optional[str] = None,
    ) -> ProviderSearchResult:
        """
        Dispatches request to provider, handles rate limits/errors,
        and returns a standardized ProviderSearchResult.
        """
        pass
