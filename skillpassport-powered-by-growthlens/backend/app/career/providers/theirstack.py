import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger
from backend.app.career.providers.base import (
    BaseJobSearchAdapter,
    JobSearchResult,
    ProviderException,
    ProviderErrorType,
    generate_canonical_dedupe_key,
)

logger = get_logger("career.providers.theirstack")


class TheirStackAdapter(BaseJobSearchAdapter):
    """
    TheirStack Job Search API adapter.
    Billed per job returned: strictly bounds limit <= job_search_max_results (default 10)
    to protect API credits.
    """

    def __init__(self):
        self.settings = get_settings()

    def get_provider_name(self) -> str:
        return "theirstack"

    def is_configured(self) -> bool:
        return bool(self.settings.theirstack_api_key and self.settings.theirstack_api_key.strip())

    def get_provider_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "provider": "theirstack",
            "is_configured": configured,
            "required_env_vars": ["THEIRSTACK_API_KEY"],
            "status_message": "Ready" if configured else "Not configured: set THEIRSTACK_API_KEY in backend/.env",
            "cost_profile": "Billed per job returned — strictly bounded to max 10 jobs per search",
        }

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 10,
    ) -> List[JobSearchResult]:
        if not self.is_configured():
            logger.warning("TheirStack API called but THEIRSTACK_API_KEY is not configured.")
            return []

        # Enforce strict bounded limit
        bounded_limit = min(max(1, limit), self.settings.job_search_max_results, 10)

        headers = {
            "Authorization": f"Bearer {self.settings.theirstack_api_key.strip()}",
            "Content-Type": "application/json",
        }

        # Build payload
        payload: Dict[str, Any] = {
            "page": 0,
            "limit": bounded_limit,
            "posted_at_max_age_days": 30,
        }

        if query.strip():
            payload["job_title_pattern_or"] = [query.strip()]
        if location and location.strip():
            clean_loc = location.strip()
            if len(clean_loc) == 2:
                payload["job_country_code_or"] = [clean_loc.upper()]
            else:
                payload["job_location_pattern_or"] = [clean_loc]
        else:
            # TheirStack requires a geographic boundary to prevent global full-table timeout (502)
            payload["job_country_code_or"] = ["US"]
        if remote_only:
            payload["remote"] = True

        url = "https://api.theirstack.com/v1/jobs/search"
        logger.info(f"Calling TheirStack API with limit={bounded_limit}, query='{query}'")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException:
                logger.error("TheirStack API timed out after 15s")
                raise ProviderException(
                    provider="theirstack",
                    error_type=ProviderErrorType.TIMEOUT,
                    message="TheirStack request timed out after 15 seconds.",
                    status_code=504,
                )
            except Exception as e:
                logger.error(f"TheirStack connection error: {e}")
                raise ProviderException(
                    provider="theirstack",
                    error_type=ProviderErrorType.SERVER_ERROR,
                    message=f"TheirStack network connection error: {str(e)}",
                    status_code=502,
                )

        if response.status_code == 429:
            logger.warning("TheirStack quota / rate limit reached (429)")
            raise ProviderException(
                provider="theirstack",
                error_type=ProviderErrorType.RATE_LIMITED,
                message="TheirStack rate limit or monthly search quota exceeded.",
                status_code=429,
                upstream_status=429,
            )

        if response.status_code in (401, 403):
            logger.error(f"TheirStack authentication failed ({response.status_code})")
            raise ProviderException(
                provider="theirstack",
                error_type=ProviderErrorType.AUTHENTICATION_ERROR,
                message=f"TheirStack authentication error ({response.status_code}). Please verify THEIRSTACK_API_KEY.",
                status_code=401,
                upstream_status=response.status_code,
            )

        if response.status_code >= 500:
            logger.error(f"TheirStack upstream server error ({response.status_code})")
            raise ProviderException(
                provider="theirstack",
                error_type=ProviderErrorType.SERVER_ERROR,
                message=f"TheirStack upstream server error (HTTP {response.status_code}).",
                status_code=502,
                upstream_status=response.status_code,
            )

        if response.status_code != 200:
            logger.error(f"TheirStack error HTTP {response.status_code}: {response.text[:200]}")
            raise ProviderException(
                provider="theirstack",
                error_type=ProviderErrorType.UNKNOWN,
                message=f"TheirStack returned HTTP {response.status_code}.",
                status_code=400,
                upstream_status=response.status_code,
            )

        try:
            res_data = response.json()
        except Exception:
            raise ProviderException(
                provider="theirstack",
                error_type=ProviderErrorType.MALFORMED_RESPONSE,
                message="TheirStack returned an invalid or non-JSON response.",
                status_code=502,
            )
        raw_jobs = res_data.get("data", [])
        if not isinstance(raw_jobs, list):
            return []

        results: List[JobSearchResult] = []
        retrieved_at = datetime.now(timezone.utc).isoformat()

        for item in raw_jobs[:bounded_limit]:
            if not isinstance(item, dict):
                continue

            p_id = str(item.get("id") or uuid.uuid4())
            title = (item.get("job_title") or "Engineering Role").strip()
            
            comp_obj = item.get("company_object") or {}
            company = (comp_obj.get("name") or item.get("company") or "Tech Scaleup").strip()
            domain = comp_obj.get("domain")

            loc = item.get("location") or item.get("country")
            is_remote = bool(item.get("remote"))
            remote_status = "remote" if is_remote else "on_site"

            dedupe_key = generate_canonical_dedupe_key(title, company, loc)

            results.append(
                JobSearchResult(
                    id=f"job-ts-{p_id}",
                    provider="theirstack",
                    provider_job_id=p_id,
                    canonical_dedupe_key=dedupe_key,
                    title=title,
                    company_name=company,
                    company_domain=domain,
                    location_text=loc,
                    remote_status=remote_status,
                    employment_type=item.get("employment_type"),
                    seniority=item.get("seniority"),
                    salary_min=item.get("salary_min"),
                    salary_max=item.get("salary_max"),
                    salary_currency=item.get("salary_currency"),
                    salary_period="yearly",
                    description=item.get("description"),
                    job_url=item.get("url"),
                    apply_url=item.get("url"),
                    posted_at=item.get("date_posted"),
                    retrieved_at=retrieved_at,
                    raw_metadata={
                        "technologies": item.get("technologies", []),
                    },
                )
            )

        logger.info(f"TheirStack returned {len(results)} normalized jobs.")
        return results
