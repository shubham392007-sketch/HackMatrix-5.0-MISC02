"""
Resource Provider Aggregator.
Dispatches requests across multiple isolated providers in parallel with fault tolerance,
URL validation, SSRF defense, deduplication, and ranking.
Returns explicit provider statuses and partial results (Section 8 Reliability).
"""

import asyncio
import time
from typing import List, Optional, Dict, Tuple
from backend.app.core.logging import get_logger
from backend.app.learning.providers.base import (
    BaseResourceProvider,
    NormalizedLearningResource,
    ProviderStatus,
    ProviderSearchResult,
    AggregationResult,
)
from backend.app.learning.providers.youtube import YouTubeProviderAdapter
from backend.app.learning.providers.devto import DevToProviderAdapter
from backend.app.learning.providers.github import GitHubProviderAdapter
from backend.app.learning.providers.freecodecamp import FreeCodeCampProviderAdapter
from backend.app.learning.providers.validator import (
    is_url_safe,
    deduplicate_resources,
    rank_resources,
    is_resource_relevant,
)

logger = get_logger("learning.providers.aggregator")


class ResourceAggregator:
    """
    Coordinates multi-provider parallel dispatch.
    Guarantees complete fault isolation: a failure in one provider does not impact others.
    Reports explicit provider health statuses instead of masking failures.
    """

    def __init__(self, providers: Optional[List[BaseResourceProvider]] = None):
        self.providers: List[BaseResourceProvider] = providers or [
            YouTubeProviderAdapter(),
            DevToProviderAdapter(),
            GitHubProviderAdapter(),
            FreeCodeCampProviderAdapter(),
        ]
        self._search_cache: Dict[str, Tuple[float, AggregationResult]] = {}
        self.cache_ttl_seconds: int = 300

    def invalidate_cache(self) -> None:
        self._search_cache.clear()
        logger.info("[ResourceAggregatorCache] In-memory cache cleared")

    def register_provider(self, provider: BaseResourceProvider) -> None:
        self.providers.append(provider)

    async def search_all(
        self,
        query: str,
        skill_ids: Optional[List[str]] = None,
        level: str = "intermediate",
        limit_per_provider: int = 6,
        total_limit: int = 24,
    ) -> AggregationResult:
        """
        Convenience wrapper supporting skill_ids list and query parameters.
        """
        topic_slug = skill_ids[0] if (skill_ids and len(skill_ids) > 0) else "general"
        return await self.aggregate_resources(
            query=query,
            topic_slug=topic_slug,
            difficulty=level.capitalize() if level else "Intermediate",
            limit_per_provider=limit_per_provider,
            total_limit=total_limit,
        )

    async def aggregate_resources(
        self,
        query: str,
        topic_slug: str,
        difficulty: str = "Intermediate",
        limit_per_provider: int = 6,
        total_limit: int = 24,
    ) -> AggregationResult:
        """
        Executes parallel calls to all registered providers with error isolation.
        Returns AggregationResult containing ranked resources and provider statuses.
        Uses in-memory cache to guarantee fast response for repeated queries.
        """
        cache_key = f"{query.strip().lower()}::{topic_slug.strip().lower()}::{difficulty.lower()}::{limit_per_provider}::{total_limit}"
        if cache_key in self._search_cache:
            ts, cached_res = self._search_cache[cache_key]
            if time.time() - ts < self.cache_ttl_seconds:
                logger.debug(f"[ResourceAggregatorCache] HIT for '{cache_key}'")
                return cached_res
            else:
                del self._search_cache[cache_key]

        active_providers = [p for p in self.providers if p.is_available()]
        if not active_providers:
            logger.warning("No active resource providers found.")
            return AggregationResult(
                resources=[],
                provider_statuses={p.provider_name(): ProviderStatus.UNAVAILABLE for p in self.providers},
                total_found=0,
                warnings=["No resource providers are currently active or configured."],
            )

        async def safe_fetch(p: BaseResourceProvider) -> ProviderSearchResult:
            try:
                res = await asyncio.wait_for(
                    p.fetch_resources(
                        query=query,
                        topic_slug=topic_slug,
                        difficulty=difficulty,
                        limit=limit_per_provider,
                    ),
                    timeout=3.5,
                )
                return res
            except asyncio.TimeoutError:
                logger.warning(f"Provider '{p.provider_name()}' timed out after 3.5s")
                return ProviderSearchResult(
                    resources=[],
                    provider=p.provider_name(),
                    status=ProviderStatus.ERROR,
                    error_message="Provider timed out",
                )
            except Exception as e:
                logger.error(f"Provider '{p.provider_name()}' crashed during fetch: {e}", exc_info=True)
                return ProviderSearchResult(
                    resources=[],
                    provider=p.provider_name(),
                    status=ProviderStatus.ERROR,
                    error_message=str(e),
                )

        # Parallel dispatch with asyncio.gather
        tasks = [safe_fetch(p) for p in active_providers]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        combined: List[NormalizedLearningResource] = []
        statuses: Dict[str, ProviderStatus] = {
            p.provider_name(): ProviderStatus.UNAVAILABLE
            for p in self.providers
        }
        warnings: List[str] = []

        for idx, res in enumerate(results):
            provider_obj = active_providers[idx]
            p_name = provider_obj.provider_name()

            if isinstance(res, Exception):
                logger.error(f"Provider {p_name} returned unhandled exception: {res}")
                statuses[p_name] = ProviderStatus.ERROR
                warnings.append(f"Provider {p_name} failed: {res}")
            elif isinstance(res, ProviderSearchResult):
                statuses[p_name] = res.status
                if res.error_message:
                    warnings.append(f"Provider {p_name}: {res.error_message}")

                # Filter for SSRF, valid URLs, and genuine topic relevance
                for item in res.resources:
                    safe, reason = is_url_safe(item.url)
                    if not safe:
                        logger.warning(f"Discarding unsafe resource from {item.provider}: {item.url} ({reason})")
                        continue

                    is_rel, rel_score, rel_reason = is_resource_relevant(item, query=query, topic_slug=topic_slug, min_threshold=0.40)
                    if not is_rel:
                        logger.warning(f"Discarding irrelevant resource from {item.provider}: '{item.title}' ({rel_reason})")
                        continue

                    combined.append(item)
            elif isinstance(res, list):
                # Backward compatibility for direct list return in tests/mocks
                statuses[p_name] = ProviderStatus.SUCCESS if res else ProviderStatus.EMPTY
                for item in res:
                    safe, reason = is_url_safe(item.url)
                    if not safe:
                        continue
                    is_rel, rel_score, rel_reason = is_resource_relevant(item, query=query, topic_slug=topic_slug, min_threshold=0.40)
                    if is_rel:
                        combined.append(item)

        # Deduplicate by canonical path
        deduped = deduplicate_resources(combined)

        # Multi-factor ranking
        ranked = rank_resources(deduped)
        final_resources = ranked[:total_limit]

        result = AggregationResult(
            resources=final_resources,
            provider_statuses=statuses,
            total_found=len(final_resources),
            warnings=warnings,
        )
        self._search_cache[cache_key] = (time.time(), result)
        return result
