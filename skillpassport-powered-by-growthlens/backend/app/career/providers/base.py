import hashlib
import re
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


from enum import Enum

class ProviderErrorType(str, Enum):
    MISSING_KEY = "missing_api_key"
    AUTHENTICATION_ERROR = "provider_authentication_error"
    UNAUTHORIZED_PLAN = "unauthorized_plan"
    RATE_LIMITED = "rate_limit_exceeded"
    SERVER_ERROR = "provider_server_error"
    TIMEOUT = "network_timeout"
    MALFORMED_RESPONSE = "malformed_response"
    UNKNOWN = "unknown_error"


class ProviderException(Exception):
    """
    Structured typed exception for job provider API failures.
    Preserves error category and HTTP status while preventing secret leakage.
    """
    def __init__(
        self,
        provider: str,
        error_type: ProviderErrorType,
        message: str,
        status_code: int = 400,
        upstream_status: Optional[int] = None,
    ):
        super().__init__(message)
        self.provider = provider
        self.error_type = error_type
        self.message = message
        self.status_code = status_code
        self.upstream_status = upstream_status


class JobSearchResult(BaseModel):
    id: str
    provider: str  # jsearch, theirstack, fantastic_jobs, custom_upload
    provider_job_id: str
    canonical_dedupe_key: str
    title: str
    company_name: str
    company_domain: Optional[str] = None
    location_text: Optional[str] = None
    remote_status: Optional[str] = None  # remote, hybrid, on_site
    employment_type: Optional[str] = None  # full_time, part_time, contract, internship
    seniority: Optional[str] = None  # entry, mid, senior, lead, executive
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    description: Optional[str] = None
    job_url: Optional[str] = None
    apply_url: Optional[str] = None
    posted_at: Optional[str] = None
    retrieved_at: str
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)
    extracted_requirements: List[Dict[str, Any]] = Field(default_factory=list)
    local_relevance_score: Optional[float] = None
    relevance_reasons: Optional[List[str]] = None


def generate_canonical_dedupe_key(title: str, company: str, location: Optional[str]) -> str:
    """
    Computes a deterministic cross-provider hash from normalized title, company, and location.
    Prevents duplicate listings from multiple providers without merging distinct openings.
    """
    def clean(s: Optional[str]) -> str:
        if not s:
            return ""
        s = s.lower().strip()
        s = re.sub(r"[^\w\s]", "", s)
        return re.sub(r"\s+", " ", s)

    norm_title = clean(title)
    norm_comp = clean(company)
    norm_loc = clean(location)
    combined = f"{norm_title}|{norm_comp}|{norm_loc}"
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()[:32]


class BaseJobSearchAdapter(ABC):
    @abstractmethod
    def get_provider_name(self) -> str:
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    def get_provider_status(self) -> Dict[str, Any]:
        """
        Reports provider status without exposing secrets.
        """
        pass

    @abstractmethod
    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 10,
        role_families: Optional[List[str]] = None,
        **kwargs,
    ) -> List[JobSearchResult]:
        pass
