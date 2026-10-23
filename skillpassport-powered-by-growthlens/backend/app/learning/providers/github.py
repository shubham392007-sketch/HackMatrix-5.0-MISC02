"""
GitHub Resource Provider Adapter.
Queries GitHub REST API to find educational repositories, starter templates,
and reference codebases.
Includes rate limit handling (HTTP 403), authentication support, pagination, and error isolation.
"""

import os
from typing import List, Optional, Dict, Any
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
    is_resource_relevant,
)

logger = get_logger("learning.providers.github")


class GitHubProviderAdapter(BaseResourceProvider):
    """
    Isolated adapter for GitHub REST API v3.
    Retrieves production-grade code templates and algorithms for hands-on practice.
    Reuses existing GITHUB_TOKEN environment variable.
    """

    def __init__(self, token: Optional[str] = None, timeout_seconds: float = 6.0):
        self.token = token or os.environ.get("GITHUB_TOKEN", "")
        self.timeout_seconds = timeout_seconds
        self.base_url = "https://api.github.com"

    def provider_name(self) -> str:
        return "github"

    def is_available(self) -> bool:
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
        Dispatches request to GitHub repositories search endpoint with pagination and topic validation.
        """
        # Formulate provider-specific query avoiding reserved characters (e.g. &) and excessively restrictive qualifiers
        import re
        sanitized = re.sub(r"[^a-zA-Z0-9\s]", " ", query)
        terms = [t for t in sanitized.split() if t.lower() not in ("tutorial", "guide", "architecture", "and")]
        clean_query = " ".join(terms[:3]) if terms else query
        search_query = f"{clean_query} language:python stars:>5"
        page_num = int(page_token) if page_token and page_token.isdigit() else 1

        params = {
            "q": search_query,
            "sort": "stars",
            "order": "desc",
            "page": page_num,
            "per_page": min(limit * 2, 10),
        }

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "SkillPassport-LearningEngine/1.0",
        }
        if self.token:
            headers["Authorization"] = f"token {self.token}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                resp = await client.get(f"{self.base_url}/search/repositories", params=params, headers=headers)

                if resp.status_code == 403:
                    logger.warning("GitHub API rate limit exceeded (HTTP 403). Falling back to curated repositories.")
                    return ProviderSearchResult(
                        resources=self._fallback_curated(query, topic_slug, difficulty, limit),
                        provider=self.provider_name(),
                        status=ProviderStatus.RATE_LIMITED,
                        error_message="Rate limit exceeded (HTTP 403); returning curated repositories",
                    )

                if resp.status_code >= 400:
                    logger.warning(f"GitHub API error HTTP {resp.status_code}: {resp.text[:200]}")
                    return ProviderSearchResult(
                        resources=self._fallback_curated(query, topic_slug, difficulty, limit),
                        provider=self.provider_name(),
                        status=ProviderStatus.ERROR,
                        error_message=f"HTTP {resp.status_code} error from GitHub API",
                    )

                data = resp.json()
                items = data.get("items", [])
                if not items:
                    return ProviderSearchResult(
                        resources=self._fallback_curated(query, topic_slug, difficulty, limit),
                        provider=self.provider_name(),
                        status=ProviderStatus.EMPTY,
                    )

                resources: List[NormalizedLearningResource] = []

                for item in items:
                    url = item.get("html_url", "")
                    safe, reason = is_url_safe(url)
                    if not safe:
                        logger.warning(f"Rejecting unsafe GitHub URL {url}: {reason}")
                        continue

                    full_name = item.get("full_name", "")
                    desc = item.get("description", "") or f"Python codebase repository for {query}"
                    stars = item.get("stargazers_count", 0)
                    license_info = item.get("license") or {}
                    license_name = license_info.get("spdx_id") or license_info.get("name") or "Open Source"
                    owner = item.get("owner", {}).get("login", "GitHub Creator")
                    avatar = item.get("owner", {}).get("avatar_url")
                    item_topics = item.get("topics", [])

                    # Topic relevance validation: reject unrelated repos
                    tags_list = ["github", "repository", "python", topic_slug]
                    if isinstance(item_topics, list):
                        tags_list.extend(item_topics)

                    rel_score = compute_topic_relevance(
                        query=query,
                        title=full_name,
                        description=desc,
                        tags=tags_list,
                        topic_slug=topic_slug,
                    )
                    # 0.40 threshold prevents borderline off-topic repos (finance, game, unrelated) leaking through
                    if rel_score < 0.40:
                        logger.info(f"Rejecting irrelevant GitHub repository '{full_name}' (relevance {rel_score:.2f} < 0.35)")
                        continue

                    resources.append(
                        NormalizedLearningResource(
                            id=f"res-gh-{item.get('id')}",
                            provider="github",
                            resource_type="repository",
                            title=full_name,
                            url=url,
                            deep_link_url=f"{url}#readme",
                            description=f"★ {stars} stars — {desc[:200]}",
                            duration_minutes=30,
                            difficulty=difficulty,
                            author_or_channel=owner,
                            thumbnail_url=avatar,
                            relevance_score=rel_score,
                            relevance_derivation=f"GitHub codebase match ({int(rel_score * 100)}%) with {stars} stars",
                            associated_skills=[topic_slug],
                            learning_objective=f"Study runnable implementation patterns for {query}",
                            tags=tags_list,
                            license_type=license_name,
                            provider_metadata={"stars": stars, "forks": item.get("forks_count", 0)},
                        )
                    )

                next_token = str(page_num + 1) if len(items) >= limit else None
                return ProviderSearchResult(
                    resources=resources[:limit],
                    provider=self.provider_name(),
                    status=ProviderStatus.SUCCESS if resources else ProviderStatus.EMPTY,
                    next_page_token=next_token,
                )

        except httpx.TimeoutException:
            logger.warning(f"GitHub API timed out after {self.timeout_seconds}s for query '{query}'.")
            return ProviderSearchResult(
                resources=self._fallback_curated(query, topic_slug, difficulty, limit),
                provider=self.provider_name(),
                status=ProviderStatus.TIMEOUT,
                error_message="Request timed out; returned curated repositories",
            )
        except Exception as e:
            logger.error(f"Unexpected error in GitHub provider: {e}", exc_info=True)
            return ProviderSearchResult(
                resources=self._fallback_curated(query, topic_slug, difficulty, limit),
                provider=self.provider_name(),
                status=ProviderStatus.ERROR,
                error_message=str(e),
            )

    def _fallback_curated(
        self,
        query: str,
        topic_slug: str,
        difficulty: str,
        limit: int,
    ) -> List[NormalizedLearningResource]:
        """
        Curated high-signal GitHub repositories for Data Preprocessing and Machine Learning.
        Only returns verified entries; never fabricates fake URLs or synthetic titles.
        """
        curated_store = {
            "topic-missing-values": [
                NormalizedLearningResource(
                    id="res-gh-curated-imputation-benchmarks",
                    provider="github",
                    resource_type="repository",
                    title="scikit-learn/scikit-learn",
                    url="https://github.com/scikit-learn/scikit-learn",
                    deep_link_url="https://github.com/scikit-learn/scikit-learn/tree/main/sklearn/impute",
                    description="★ 58,000+ stars — Official Scikit-Learn source code for SimpleImputer and KNNImputer.",
                    duration_minutes=25,
                    difficulty="Intermediate",
                    author_or_channel="scikit-learn",
                    relevance_score=0.95,
                    relevance_derivation="Official reference library codebase",
                    associated_skills=["skill-python", "skill-data-preprocessing"],
                    learning_objective="Inspect production transformer algorithms and parameter validation.",
                    tags=["python", "scikit-learn", "imputation"],
                    license_type="BSD-3-Clause",
                    is_fallback=True,
                )
            ],
            "topic-outlier-iqr": [
                NormalizedLearningResource(
                    id="res-gh-curated-pyod",
                    provider="github",
                    resource_type="repository",
                    title="yzhao062/pyod",
                    url="https://github.com/yzhao062/pyod",
                    deep_link_url="https://github.com/yzhao062/pyod#readme",
                    description="★ 7,500+ stars — Python Outlier Detection (PyOD) comprehensive benchmark library.",
                    duration_minutes=35,
                    difficulty="Advanced",
                    author_or_channel="Yue Zhao",
                    relevance_score=0.92,
                    relevance_derivation="Comprehensive outlier benchmark repository",
                    associated_skills=["skill-machine-learning"],
                    learning_objective="Explore modern anomaly detection methods and empirical benchmarks.",
                    tags=["outliers", "anomaly-detection", "benchmark"],
                    license_type="BSD-2-Clause",
                    is_fallback=True,
                )
            ],
            "topic-pipeline-leakage": [
                NormalizedLearningResource(
                    id="res-gh-curated-ml-pipelines",
                    provider="github",
                    resource_type="repository",
                    title="koaning/scikit-lego",
                    url="https://github.com/koaning/scikit-lego",
                    deep_link_url="https://github.com/koaning/scikit-lego#readme",
                    description="★ 2,100+ stars — Custom scikit-learn transformers and pipelines preventing leakage.",
                    duration_minutes=30,
                    difficulty="Advanced",
                    author_or_channel="Vincent D. Warmerdam",
                    relevance_score=0.94,
                    relevance_derivation="Battle-tested scikit-learn extensions",
                    associated_skills=["skill-data-preprocessing", "skill-machine-learning"],
                    learning_objective="Implement modular transformers that maintain strict train-test separation.",
                    tags=["scikit-learn", "pipeline", "leakage"],
                    license_type="MIT",
                    is_fallback=True,
                )
            ],
        }

        return curated_store.get(topic_slug, [])[:limit]
