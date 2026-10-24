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
    TheirStack Job Search API adapter with multi-key automatic fallback.
    Sequentially tests configured API keys: if a key runs out of credits (402)
    or is rate limited (429) or invalid (401/403), it immediately rolls over
    to the next key in the pool.
    Free tier allows up to 25 results per page (E-020 limitation); handles
    pagination seamlessly for requests up to 50 jobs.
    """

    def __init__(self):
        self.settings = get_settings()

    def get_provider_name(self) -> str:
        return "theirstack"

    @property
    def api_keys(self) -> List[str]:
        keys = getattr(self.settings, "theirstack_keys", [])
        if not keys and self.settings.theirstack_api_key:
            keys = [k.strip() for k in self.settings.theirstack_api_key.split(",") if k.strip()]
        return keys

    def is_configured(self) -> bool:
        return len(self.api_keys) > 0

    def get_provider_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        total_keys = len(self.api_keys)
        return {
            "provider": "theirstack",
            "is_configured": configured,
            "configured_keys_count": total_keys,
            "required_env_vars": ["THEIRSTACK_API_KEY", "THEIRSTACK_API_KEYS"],
            "status_message": (
                f"Ready ({total_keys} API keys configured with automatic sequential fallback)"
                if configured
                else "Not configured: set THEIRSTACK_API_KEY in backend/.env"
            ),
            "cost_profile": "Billed per job returned — bounded to max 25 per page (up to 50 total)",
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
        keys_to_try = self.api_keys
        if not keys_to_try:
            logger.warning("TheirStack API called but THEIRSTACK_API_KEY is not configured.")
            return []

        # Enforce strict bounded limit (TheirStack free tier max is 25 per page)
        bounded_limit = min(max(1, limit), self.settings.job_search_max_results, 50)
        page_size = min(bounded_limit, 25)

        # Build search payload
        payload: Dict[str, Any] = {
            "page": 0,
            "limit": page_size,
            "posted_at_max_age_days": 30,
        }

        patterns: List[str] = []
        if role_families:
            for rf in role_families:
                clean_rf = rf.strip()
                if clean_rf and clean_rf not in patterns:
                    patterns.append(clean_rf)
        if query and query.strip():
            clean_q = query.strip()
            if clean_q not in patterns:
                patterns.append(clean_q)

        if patterns:
            payload["job_title_pattern_or"] = patterns[:5]
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
        last_exception: Optional[ProviderException] = None

        # Iterate sequentially through configured keys (automatic rollover on exhaustion / 402 / 429 / 401)
        for key_idx, current_key in enumerate(keys_to_try):
            headers = {
                "Authorization": f"Bearer {current_key}",
                "Content-Type": "application/json",
            }
            logger.info(
                f"Calling TheirStack API (key {key_idx + 1}/{len(keys_to_try)}) "
                f"with limit={payload['limit']}, query='{query}'"
            )

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    # If free-tier page size limit error E-020 is returned, clamp limit to 25 and retry current key
                    if response.status_code == 403 and "E-020" in response.text:
                        logger.info(f"TheirStack key {key_idx + 1} E-020: clamping limit to 25 and retrying current key...")
                        payload["limit"] = 25
                        response = await client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException:
                logger.error(f"TheirStack API timed out after 15s on key {key_idx + 1}")
                last_exception = ProviderException(
                    provider="theirstack",
                    error_type=ProviderErrorType.TIMEOUT,
                    message="TheirStack request timed out after 15 seconds.",
                    status_code=504,
                )
                continue
            except Exception as e:
                logger.error(f"TheirStack connection error on key {key_idx + 1}: {e}")
                last_exception = ProviderException(
                    provider="theirstack",
                    error_type=ProviderErrorType.SERVER_ERROR,
                    message=f"TheirStack network connection error: {str(e)}",
                    status_code=502,
                )
                continue

            # Detect quota exhaustion (402), rate limits (429), or auth/permission errors (401, 403)
            if response.status_code in (401, 402, 403, 429):
                logger.warning(
                    f"TheirStack key {key_idx + 1}/{len(keys_to_try)} failed with HTTP {response.status_code}: "
                    f"{response.text[:120]}. Falling back to next key..."
                )
                err_type = (
                    ProviderErrorType.RATE_LIMITED
                    if response.status_code in (402, 429)
                    else ProviderErrorType.AUTHENTICATION_ERROR
                )
                last_exception = ProviderException(
                    provider="theirstack",
                    error_type=err_type,
                    message=(
                        f"TheirStack key {key_idx + 1} quota exhausted or unauthorized (HTTP {response.status_code})."
                    ),
                    status_code=response.status_code,
                    upstream_status=response.status_code,
                )
                continue

            if response.status_code >= 500:
                logger.error(f"TheirStack upstream server error ({response.status_code}) on key {key_idx + 1}")
                last_exception = ProviderException(
                    provider="theirstack",
                    error_type=ProviderErrorType.SERVER_ERROR,
                    message=f"TheirStack upstream server error (HTTP {response.status_code}).",
                    status_code=502,
                    upstream_status=response.status_code,
                )
                continue

            if response.status_code != 200:
                logger.error(f"TheirStack error HTTP {response.status_code}: {response.text[:200]}")
                last_exception = ProviderException(
                    provider="theirstack",
                    error_type=ProviderErrorType.UNKNOWN,
                    message=f"TheirStack returned HTTP {response.status_code}.",
                    status_code=400,
                    upstream_status=response.status_code,
                )
                continue

            # Success! Parse JSON response
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

            # Single provider request per search budget satisfied (page 0)

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

            logger.info(f"TheirStack key {key_idx + 1} succeeded: returned {len(results)} normalized jobs.")
            return results

        # If all keys failed, raise the final exception
        if last_exception:
            raise last_exception

        return []
