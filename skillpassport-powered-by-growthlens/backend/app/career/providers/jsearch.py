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

logger = get_logger("career.providers.jsearch")


class JSearchAdapter(BaseJobSearchAdapter):
    """
    RapidAPI JSearch adapter with strict credit conservation:
    1 page (up to 10 results) per search. Never requests multi-pages automatically.
    """

    def __init__(self):
        self.settings = get_settings()

    def get_provider_name(self) -> str:
        return "jsearch"

    def is_configured(self) -> bool:
        return bool(self.settings.jsearch_api_key and self.settings.jsearch_api_key.strip())

    def get_provider_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "provider": "jsearch",
            "is_configured": configured,
            "required_env_vars": ["JSEARCH_API_KEY"],
            "host": self.settings.jsearch_api_host,
            "status_message": "Ready" if configured else "Not configured: set JSEARCH_API_KEY in backend/.env",
            "cost_profile": "1 request credit per page (10 results)",
        }

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 50,
        role_families: Optional[List[str]] = None,
        **kwargs,
    ) -> List[JobSearchResult]:
        if not self.is_configured():
            logger.warning("JSearch API called but JSEARCH_API_KEY is not configured.")
            return []

        search_query = query.strip()
        if location and location.strip():
            search_query += f" in {location.strip()}"

        headers = {
            "X-RapidAPI-Key": self.settings.jsearch_api_key.strip(),
            "X-RapidAPI-Host": self.settings.jsearch_api_host.strip(),
        }

        bounded_limit = min(max(1, limit), self.settings.job_search_max_results, 50)
        num_pages_to_fetch = min(5, max(1, (bounded_limit + 9) // 10))
        params = {
            "query": search_query,
            "page": "1",
            "num_pages": str(num_pages_to_fetch),
            "date_posted": "month",
        }
        if remote_only:
            params["remote_jobs_only"] = "true"

        url = f"https://{self.settings.jsearch_api_host.strip()}/search"
        logger.info(f"Calling JSearch API with conservative query: '{search_query}', remote={remote_only}")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, headers=headers, params=params)
            except httpx.TimeoutException:
                logger.error("JSearch API request timed out after 15s")
                raise ProviderException(
                    provider="jsearch",
                    error_type=ProviderErrorType.TIMEOUT,
                    message="JSearch request timed out after 15 seconds.",
                    status_code=504,
                )
            except Exception as e:
                logger.error(f"JSearch API connection failure: {e}")
                raise ProviderException(
                    provider="jsearch",
                    error_type=ProviderErrorType.SERVER_ERROR,
                    message=f"JSearch network connection error: {str(e)}",
                    status_code=502,
                )

        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After", "unknown")
            logger.warning(f"JSearch rate limited (429). Retry-After: {retry_after}")
            raise ProviderException(
                provider="jsearch",
                error_type=ProviderErrorType.RATE_LIMITED,
                message=f"JSearch rate limit reached. Retry after {retry_after}s.",
                status_code=429,
                upstream_status=429,
            )

        if response.status_code in (401, 403):
            logger.error(f"JSearch authentication failure ({response.status_code})")
            raise ProviderException(
                provider="jsearch",
                error_type=ProviderErrorType.AUTHENTICATION_ERROR,
                message=f"JSearch rejected credentials ({response.status_code}). Please verify JSEARCH_API_KEY.",
                status_code=401,
                upstream_status=response.status_code,
            )

        if response.status_code >= 500:
            logger.error(f"JSearch upstream error HTTP {response.status_code}")
            raise ProviderException(
                provider="jsearch",
                error_type=ProviderErrorType.SERVER_ERROR,
                message=f"JSearch upstream server error (HTTP {response.status_code}).",
                status_code=502,
                upstream_status=response.status_code,
            )

        if response.status_code != 200:
            logger.error(f"JSearch returned error HTTP {response.status_code}: {response.text[:200]}")
            raise ProviderException(
                provider="jsearch",
                error_type=ProviderErrorType.UNKNOWN,
                message=f"JSearch returned HTTP {response.status_code}.",
                status_code=400,
                upstream_status=response.status_code,
            )

        try:
            payload = response.json()
        except Exception:
            raise ProviderException(
                provider="jsearch",
                error_type=ProviderErrorType.MALFORMED_RESPONSE,
                message="JSearch returned an invalid or non-JSON response.",
                status_code=502,
            )
        raw_items = payload.get("data", [])
        if not isinstance(raw_items, list):
            return []

        results: List[JobSearchResult] = []
        retrieved_at = datetime.now(timezone.utc).isoformat()

        for item in raw_items[:bounded_limit]:
            if not isinstance(item, dict):
                continue
            
            p_id = str(item.get("job_id") or uuid.uuid4())
            title = (item.get("job_title") or "Untitled Position").strip()
            company = (item.get("employer_name") or "Confidential Employer").strip()
            
            # Location assembly
            loc_parts = []
            if item.get("job_city"):
                loc_parts.append(item["job_city"])
            if item.get("job_state"):
                loc_parts.append(item["job_state"])
            if item.get("job_country"):
                loc_parts.append(item["job_country"])
            loc_text = ", ".join(loc_parts) if loc_parts else None

            is_remote = bool(item.get("job_is_remote"))
            remote_status = "remote" if is_remote else ("hybrid" if "hybrid" in title.lower() else "on_site")

            # Salary extraction
            salary_min = float(item["job_min_salary"]) if item.get("job_min_salary") else None
            salary_max = float(item["job_max_salary"]) if item.get("job_max_salary") else None
            salary_currency = item.get("job_salary_currency")
            salary_period = item.get("job_salary_period")

            dedupe_key = generate_canonical_dedupe_key(title, company, loc_text)

            results.append(
                JobSearchResult(
                    id=f"job-js-{p_id}",
                    provider="jsearch",
                    provider_job_id=p_id,
                    canonical_dedupe_key=dedupe_key,
                    title=title,
                    company_name=company,
                    company_domain=None,
                    location_text=loc_text,
                    remote_status=remote_status,
                    employment_type=item.get("job_employment_type"),
                    seniority=None,
                    salary_min=salary_min,
                    salary_max=salary_max,
                    salary_currency=salary_currency,
                    salary_period=salary_period,
                    description=item.get("job_description"),
                    job_url=item.get("job_apply_link") or item.get("job_google_link"),
                    apply_url=item.get("job_apply_link"),
                    posted_at=item.get("job_posted_at_datetime_utc"),
                    retrieved_at=retrieved_at,
                    raw_metadata={
                        "publisher": item.get("job_publisher"),
                        "highlights": item.get("job_highlights", {}),
                    },
                )
            )

        logger.info(f"JSearch returned {len(results)} valid normalized jobs.")
        return results
