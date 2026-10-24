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

logger = get_logger("career.providers.fantastic_jobs")


class FantasticJobsAdapter(BaseJobSearchAdapter):
    """
    Fantastic.jobs API adapter with conservative limit enforcement.
    """

    def __init__(self):
        self.settings = get_settings()

    def get_provider_name(self) -> str:
        return "fantastic_jobs"

    def is_configured(self) -> bool:
        return bool(self.settings.fantastic_jobs_api_key and self.settings.fantastic_jobs_api_key.strip())

    def get_provider_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "provider": "fantastic_jobs",
            "is_configured": configured,
            "required_env_vars": ["FANTASTIC_JOBS_API_KEY"],
            "status_message": "Ready" if configured else "Not configured: set FANTASTIC_JOBS_API_KEY in backend/.env",
            "cost_profile": "Request quota and job credits — bounded to max 50 jobs",
        }

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 50,
    ) -> List[JobSearchResult]:
        if not self.is_configured():
            logger.warning("Fantastic.jobs API called but FANTASTIC_JOBS_API_KEY is not configured.")
            return []

        bounded_limit = min(max(1, limit), self.settings.job_search_max_results, 50)

        # Support RapidAPI active-jobs-db or direct Fantastic Jobs
        is_rapidapi = "rapidapi" in getattr(self.settings, "fantastic_jobs_api_host", "").lower() or len(self.settings.fantastic_jobs_api_key.strip()) == 50

        if is_rapidapi:
            headers = {
                "x-rapidapi-key": self.settings.fantastic_jobs_api_key.strip(),
                "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
            }
            params: Dict[str, Any] = {
                "title": f'"{query.strip()}"' if query.strip() else '"Engineer"',
                "limit": bounded_limit,
                "offset": 0,
                "time_frame": "30d",
                "description_format": "text",
            }
            if location and location.strip():
                params["location"] = f'"{location.strip()}"'
            url = "https://active-jobs-db.p.rapidapi.com/active-ats"
        else:
            api_key = self.settings.fantastic_jobs_api_key.strip()
            headers = {
                "Authorization": f"Bearer {api_key}",
                "X-API-KEY": api_key,
                "Accept": "application/json",
            }
            params = {
                "query": query.strip(),
                "limit": bounded_limit,
            }
            if location and location.strip():
                params["location"] = location.strip()
            if remote_only:
                params["remote"] = "true"
            url = "https://api.fantastic.jobs/v1/jobs"

        logger.info(f"Calling Fantastic.jobs ({'RapidAPI' if is_rapidapi else 'Direct Bearer'}) with limit={bounded_limit}, query='{query}'")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, headers=headers, params=params)
            except httpx.TimeoutException:
                logger.error("Fantastic.jobs API timed out after 15s")
                raise ProviderException(
                    provider="fantastic_jobs",
                    error_type=ProviderErrorType.TIMEOUT,
                    message="Fantastic.jobs request timed out after 15 seconds.",
                    status_code=504,
                )
            except Exception as e:
                logger.error(f"Fantastic.jobs connection error: {e}")
                raise ProviderException(
                    provider="fantastic_jobs",
                    error_type=ProviderErrorType.SERVER_ERROR,
                    message=f"Fantastic.jobs network connection error: {str(e)}",
                    status_code=502,
                )

        if response.status_code == 429:
            logger.warning("Fantastic.jobs quota/rate limit reached (429)")
            raise ProviderException(
                provider="fantastic_jobs",
                error_type=ProviderErrorType.RATE_LIMITED,
                message="Fantastic.jobs rate limit or monthly quota exceeded.",
                status_code=429,
                upstream_status=429,
            )

        if response.status_code == 401:
            logger.error("Fantastic.jobs authentication failed (401)")
            raise ProviderException(
                provider="fantastic_jobs",
                error_type=ProviderErrorType.AUTHENTICATION_ERROR,
                message="Fantastic.jobs rejected credentials (401). Please verify FANTASTIC_JOBS_API_KEY.",
                status_code=401,
                upstream_status=401,
            )

        if response.status_code == 403:
            logger.error("Fantastic.jobs access forbidden (403)")
            raise ProviderException(
                provider="fantastic_jobs",
                error_type=ProviderErrorType.UNAUTHORIZED_PLAN,
                message="Fantastic.jobs access forbidden (403). Active subscription required on account.",
                status_code=403,
                upstream_status=403,
            )

        if response.status_code >= 500:
            logger.error(f"Fantastic.jobs upstream server error ({response.status_code})")
            raise ProviderException(
                provider="fantastic_jobs",
                error_type=ProviderErrorType.SERVER_ERROR,
                message=f"Fantastic.jobs upstream server error (HTTP {response.status_code}).",
                status_code=502,
                upstream_status=response.status_code,
            )

        if response.status_code != 200:
            logger.error(f"Fantastic.jobs unexpected HTTP {response.status_code}")
            raise ProviderException(
                provider="fantastic_jobs",
                error_type=ProviderErrorType.UNKNOWN,
                message=f"Fantastic.jobs returned HTTP {response.status_code}.",
                status_code=400,
                upstream_status=response.status_code,
            )

        try:
            res_data = response.json()
        except Exception:
            raise ProviderException(
                provider="fantastic_jobs",
                error_type=ProviderErrorType.MALFORMED_RESPONSE,
                message="Fantastic.jobs returned an invalid or non-JSON response.",
                status_code=502,
            )
        raw_jobs = res_data.get("jobs", res_data.get("data", []))
        if not isinstance(raw_jobs, list):
            return []

        results: List[JobSearchResult] = []
        retrieved_at = datetime.now(timezone.utc).isoformat()

        for item in raw_jobs[:bounded_limit]:
            if not isinstance(item, dict):
                continue

            p_id = str(item.get("id") or uuid.uuid4())
            title = (item.get("title") or "Technical Position").strip()
            company = (item.get("company") or "Technology Enterprise").strip()
            loc = item.get("location")
            is_remote = bool(item.get("is_remote") or item.get("remote"))
            remote_status = "remote" if is_remote else "on_site"

            dedupe_key = generate_canonical_dedupe_key(title, company, loc)

            results.append(
                JobSearchResult(
                    id=f"job-fj-{p_id}",
                    provider="fantastic_jobs",
                    provider_job_id=p_id,
                    canonical_dedupe_key=dedupe_key,
                    title=title,
                    company_name=company,
                    company_domain=item.get("company_url"),
                    location_text=loc,
                    remote_status=remote_status,
                    employment_type=item.get("job_type"),
                    seniority=item.get("experience_level"),
                    salary_min=item.get("salary_min"),
                    salary_max=item.get("salary_max"),
                    salary_currency=item.get("currency"),
                    salary_period=item.get("salary_period", "yearly"),
                    description=item.get("description"),
                    job_url=item.get("url"),
                    apply_url=item.get("apply_url") or item.get("url"),
                    posted_at=item.get("published_at"),
                    retrieved_at=retrieved_at,
                    raw_metadata={},
                )
            )

        logger.info(f"Fantastic.jobs returned {len(results)} normalized jobs.")
        return results
