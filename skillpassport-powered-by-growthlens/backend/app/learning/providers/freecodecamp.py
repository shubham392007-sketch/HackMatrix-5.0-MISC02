"""
freeCodeCamp Resource Provider Adapter.
Fetches educational articles via freeCodeCamp's official public RSS feed
(https://www.freecodecamp.org/news/rss/).

This is the only officially supported, publicly accessible machine-readable
feed exposed by freeCodeCamp. No scraping, no unofficial API calls, no
authentication required. The RSS feed is publicly documented and linked from
the freeCodeCamp website.

Includes timeout handling, relevance scoring, and graceful degradation.
"""

import xml.etree.ElementTree as ET
from typing import List, Optional
import httpx

from backend.app.core.logging import get_logger
from backend.app.learning.providers.base import (
    BaseResourceProvider,
    NormalizedLearningResource,
    ProviderSearchResult,
    ProviderStatus,
)
from backend.app.learning.providers.validator import (
    is_url_safe,
    compute_topic_relevance,
)

logger = get_logger("learning.providers.freecodecamp")

_FCC_RSS_URL = "https://www.freecodecamp.org/news/rss/"
_NS = {"content": "http://purl.org/rss/1.0/modules/content/"}

# Minimum relevance score — slightly lower than DEV.to because freeCodeCamp
# content is editorially reviewed and consistently educational, so occasional
# lower scores are still high-quality.
_MIN_RELEVANCE = 0.30


class FreeCodeCampProviderAdapter(BaseResourceProvider):
    """
    Isolated adapter for freeCodeCamp news RSS feed.
    Parses the official RSS XML, scores each item for topic relevance,
    and returns up to `limit` relevant articles per request.
    """

    def __init__(self, timeout_seconds: float = 5.0):
        self.timeout_seconds = timeout_seconds
        self._rss_url = _FCC_RSS_URL

    def provider_name(self) -> str:
        return "freecodecamp"

    def is_available(self) -> bool:
        # Always available — no API key required
        return True

    async def fetch_resources(
        self,
        query: str,
        topic_slug: str,
        difficulty: str = "Intermediate",
        limit: int = 5,
        page_token: Optional[str] = None,
    ) -> ProviderSearchResult:
        """
        Fetches and parses the freeCodeCamp RSS feed, filtering items by
        topic relevance. Returns at most `limit` validated resources.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                resp = await client.get(
                    self._rss_url,
                    headers={"User-Agent": "SkillPassport-LearningEngine/1.0"},
                )

                if resp.status_code >= 400:
                    logger.warning(
                        f"freeCodeCamp RSS returned HTTP {resp.status_code}"
                    )
                    return ProviderSearchResult(
                        resources=[],
                        provider=self.provider_name(),
                        status=ProviderStatus.ERROR,
                        error_message=f"HTTP {resp.status_code} from freeCodeCamp RSS",
                    )

                resources = self._parse_rss(
                    xml_text=resp.text,
                    query=query,
                    topic_slug=topic_slug,
                    difficulty=difficulty,
                    limit=limit,
                )

                return ProviderSearchResult(
                    resources=resources,
                    provider=self.provider_name(),
                    status=ProviderStatus.SUCCESS if resources else ProviderStatus.EMPTY,
                )

        except httpx.TimeoutException:
            logger.warning(
                f"freeCodeCamp RSS timed out after {self.timeout_seconds}s for query '{query}'"
            )
            return ProviderSearchResult(
                resources=[],
                provider=self.provider_name(),
                status=ProviderStatus.TIMEOUT,
                error_message="RSS request timed out",
            )
        except Exception as e:
            logger.error(
                f"Unexpected error in freeCodeCamp provider: {e}", exc_info=True
            )
            return ProviderSearchResult(
                resources=[],
                provider=self.provider_name(),
                status=ProviderStatus.ERROR,
                error_message=str(e),
            )

    def _parse_rss(
        self,
        xml_text: str,
        query: str,
        topic_slug: str,
        difficulty: str,
        limit: int,
    ) -> List[NormalizedLearningResource]:
        """
        Parses RSS XML and filters items by relevance score.
        """
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            logger.error(f"freeCodeCamp RSS XML parse error: {e}")
            return []

        channel = root.find("channel")
        if channel is None:
            return []

        resources: List[NormalizedLearningResource] = []

        for item in channel.findall("item"):
            title = (item.findtext("title") or "").strip()
            url = (item.findtext("link") or "").strip()
            desc = (item.findtext("description") or "").strip()
            # Strip any HTML tags from description
            import re
            desc_clean = re.sub(r"<[^>]+>", "", desc)[:250]

            pub_date = item.findtext("pubDate") or ""

            # Extract categories / tags
            categories = [
                (c.text or "").strip().lower()
                for c in item.findall("category")
                if c.text
            ]

            if not url or not title:
                continue

            safe, reason = is_url_safe(url)
            if not safe:
                logger.warning(f"Rejecting unsafe freeCodeCamp URL {url}: {reason}")
                continue

            rel_score = compute_topic_relevance(
                query=query,
                title=title,
                description=desc_clean,
                tags=categories,
                topic_slug=topic_slug,
            )

            if rel_score < _MIN_RELEVANCE:
                logger.info(
                    f"Rejecting irrelevant freeCodeCamp article '{title}' "
                    f"(relevance {rel_score:.2f} < {_MIN_RELEVANCE:.2f})"
                )
                continue

            # Stable ID derived from URL path
            slug = url.rstrip("/").rsplit("/", 1)[-1][:40]
            resources.append(
                NormalizedLearningResource(
                    id=f"res-fcc-{slug}",
                    provider="freecodecamp",
                    resource_type="article",
                    title=title,
                    url=url,
                    deep_link_url=url,
                    description=(
                        desc_clean
                        if desc_clean
                        else f"freeCodeCamp article on {title}"
                    ),
                    duration_minutes=10,
                    difficulty=difficulty,
                    author_or_channel="freeCodeCamp",
                    thumbnail_url=None,
                    relevance_score=rel_score,
                    relevance_derivation=(
                        f"freeCodeCamp RSS article match ({int(rel_score * 100)}%)"
                    ),
                    associated_skills=[topic_slug],
                    learning_objective=f"Understand {query} through a curated tutorial",
                    tags=categories or ["freecodecamp", "programming"],
                    license_type="CC BY-NC-SA 4.0",
                )
            )

            if len(resources) >= limit:
                break

        return resources
