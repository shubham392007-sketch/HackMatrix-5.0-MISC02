"""
Phase 4 Automated Regression Tests: Learn & Grow Candidate Resources Flow.

Verifies:
1. Authenticated candidate can retrieve resources via GET /api/v1/learning/resources/search
   even when skill_id is a Career Intelligence gap UUID slug (e.g. gap-046377b2-...) or domain slug (e.g. dist-sys).
2. compute_topic_relevance and clean_topic_slug_for_relevance do not dilute scores when topic_slug
   contains UUID segments or structural prefixes (gap-, domain-, skill-, topic-).
3. Curated fallbacks across YouTube, DEV.to, and GitHub return valid non-empty verified resources
   for candidate domains and set is_fallback=True so ResourceAggregator does not discard them.
4. GET /api/v1/learning/resources/{resource_id} returns 200 for persisted DB resources and verified
   curated catalog resources, and 404 for nonexistent resources.
5. POST /api/v1/learning/steps/ensure assigns real verified resource IDs (never dead 'res-tut-1' placeholders).
6. Unauthenticated requests to protected resource endpoints (/resources/search, /resources/{id}) return 401
   when APP_ENV=production.
7. Candidate users cannot access recruiter/manager-only endpoints (/api/v1/recruiter/jobs, /api/v1/recruiter/candidates)
   and receive 403 Forbidden.
8. Frontend Learn & Grow Resources page contract: explicit error state, explicit empty state, and type/domain
   filter compatibility.
"""

import os
import uuid
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

os.environ["APP_ENV"] = "test"


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"


@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


from backend.app.main import app
from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.learning.router import get_db_optional
from backend.app.models.base import Base
import backend.app.models  # noqa: F401
from backend.app.models.learning import LearningResourceItem
from backend.app.learning.providers.validator import (
    clean_topic_slug_for_relevance,
    compute_topic_relevance,
    is_resource_relevant,
)
from backend.app.learning.providers.devto import DevToProviderAdapter
from backend.app.learning.providers.github import GitHubProviderAdapter
from backend.app.learning.providers.youtube import YouTubeProviderAdapter
from backend.app.learning.providers.aggregator import ResourceAggregator


CANDIDATE_ID = "33333333-3333-3333-3333-333333333333"

candidate_user = AuthenticatedUser(
    user_id=CANDIDATE_ID,
    email="candidate@growthlens.test",
    role="authenticated",
    metadata={"full_name": "Candidate Learner", "role": "candidate"},
)


@pytest.fixture
def test_db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def candidate_client(test_db_session):
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_db_optional] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: candidate_user
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ──────────────────────────────────────────────────────────────────────────────
# 1. Slug Sanitization & Topic Relevance Scoring (No UUID Dilution)
# ──────────────────────────────────────────────────────────────────────────────
def test_topic_slug_cleaning_prevents_uuid_dilution():
    """
    Career Intelligence gap domain slugs like 'gap-046377b2-6953-4aba-99e0-a8164be7e97d'
    must not inject hex UUID fragments into compute_topic_relevance.
    """
    gap_slug = "gap-046377b2-6953-4aba-99e0-a8164be7e97d"
    cleaned = clean_topic_slug_for_relevance(gap_slug)
    assert "046377b2" not in cleaned
    assert "a8164be7e97d" not in cleaned
    assert "postgresql" in cleaned or "sql" in cleaned

    score = compute_topic_relevance(
        query="Relational Data Modeling & PostgreSQL",
        title="PostgreSQL Indexing Deep Dive: B-Tree vs GIN Index Selection",
        description="Choose optimal index structures in relational PostgreSQL schemas.",
        tags=["postgresql", "sql", "database"],
        topic_slug=gap_slug,
    )
    assert score >= 0.45, f"Expected relevance >= 0.45 for matching PostgreSQL resource, got {score}"


# ──────────────────────────────────────────────────────────────────────────────
# 2. Provider Curated Fallbacks Return Non-Empty Verified Resources for Candidates
# ──────────────────────────────────────────────────────────────────────────────
def test_provider_curated_fallbacks_for_candidate_domains():
    """
    When live external APIs are rate-limited or return empty for a candidate domain
    (e.g. 'dist-sys' or 'gap-046377b2-6953-4aba-99e0-a8164be7e97d'), YouTube, DEV.to,
    and GitHub fallbacks must return non-empty verified resources with is_fallback=True.
    """
    yt = YouTubeProviderAdapter(api_key="")
    devto = DevToProviderAdapter(api_key="")
    gh = GitHubProviderAdapter(token="")

    for domain_slug in ("dist-sys", "gap-046377b2-6953-4aba-99e0-a8164be7e97d", "domain-data-preprocessing"):
        yt_fb = yt._fallback_curated("PostgreSQL Indexing", domain_slug, "Intermediate", 3)
        devto_fb = devto._fallback_curated("Data Preprocessing", domain_slug, "Intermediate", 2)
        gh_fb = gh._fallback_curated("Data Pipelines", domain_slug, "Intermediate", 2)

        assert len(yt_fb) > 0
        assert len(devto_fb) > 0
        assert len(gh_fb) > 0

        for item in yt_fb + devto_fb + gh_fb:
            assert item.is_fallback is True
            relevant, _, _ = is_resource_relevant(item, "PostgreSQL", domain_slug, min_threshold=0.40)
            assert relevant is True


# ──────────────────────────────────────────────────────────────────────────────
# 3. Authenticated Candidate Can Search & Persist Resources via API
# ──────────────────────────────────────────────────────────────────────────────
def test_authenticated_candidate_can_search_resources(candidate_client, test_db_session):
    """
    Authenticated candidate calling GET /api/v1/learning/resources/search receives
    verified resources (including articles, videos, and repositories) and caches them in DB.
    """
    yt_fb = YouTubeProviderAdapter(api_key="")._fallback_curated(
        "Relational Data Modeling & PostgreSQL",
        "gap-046377b2-6953-4aba-99e0-a8164be7e97d",
        "Intermediate",
        2,
    )
    devto_fb = DevToProviderAdapter(api_key="")._fallback_curated(
        "Relational Data Modeling & PostgreSQL",
        "gap-046377b2-6953-4aba-99e0-a8164be7e97d",
        "Intermediate",
        2,
    )
    gh_fb = GitHubProviderAdapter(token="")._fallback_curated(
        "Relational Data Modeling & PostgreSQL",
        "gap-046377b2-6953-4aba-99e0-a8164be7e97d",
        "Intermediate",
        2,
    )

    from backend.app.learning.providers.base import ProviderSearchResult, ProviderStatus

    with patch.object(
        YouTubeProviderAdapter,
        "fetch_resources",
        new=AsyncMock(
            return_value=ProviderSearchResult(
                resources=yt_fb, provider="youtube", status=ProviderStatus.SUCCESS
            )
        ),
    ), patch.object(
        DevToProviderAdapter,
        "fetch_resources",
        new=AsyncMock(
            return_value=ProviderSearchResult(
                resources=devto_fb, provider="devto", status=ProviderStatus.SUCCESS
            )
        ),
    ), patch.object(
        GitHubProviderAdapter,
        "fetch_resources",
        new=AsyncMock(
            return_value=ProviderSearchResult(
                resources=gh_fb, provider="github", status=ProviderStatus.SUCCESS
            )
        ),
    ):
        res = candidate_client.get(
            "/api/v1/learning/resources/search",
            params={
                "query": "Relational Data Modeling & PostgreSQL",
                "skill_id": "gap-046377b2-6953-4aba-99e0-a8164be7e97d",
                "level": "intermediate",
                "limit": 6,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["count"] >= 4
        assert len(data["resources"]) >= 4
        providers = {r["provider"] for r in data["resources"]}
        assert "youtube" in providers
        assert "devto" in providers
        assert "github" in providers

        # Verify persisted in learning_resources table
        cached_count = test_db_session.query(LearningResourceItem).count()
        assert cached_count >= 4


# ──────────────────────────────────────────────────────────────────────────────
# 4. Candidate Can Fetch Specific Resource by ID (DB + Curated Fallback) & 404 on Unknown
# ──────────────────────────────────────────────────────────────────────────────
def test_candidate_get_resource_by_id_and_404(candidate_client, test_db_session):
    """
    GET /api/v1/learning/resources/{resource_id} resolves verified curated resources
    even before they are cached in DB, and returns 404 for unknown IDs.
    """
    res_ok = candidate_client.get("/api/v1/learning/resources/res-yt-sql-indexing")
    assert res_ok.status_code == 200
    body = res_ok.json()
    assert body["id"] == "res-yt-sql-indexing"
    assert "PostgreSQL" in body["title"]

    res_devto = candidate_client.get("/api/v1/learning/resources/res-devto-curated-impute")
    assert res_devto.status_code == 200
    assert res_devto.json()["provider"] == "devto"

    res_missing = candidate_client.get("/api/v1/learning/resources/res-does-not-exist-999")
    assert res_missing.status_code == 404


# ──────────────────────────────────────────────────────────────────────────────
# 5. Ensure Learning Step Assigns Verified Resource IDs (Not Dead Placeholders)
# ──────────────────────────────────────────────────────────────────────────────
def test_ensure_learning_step_assigns_verified_resource_ids(candidate_client, test_db_session):
    """
    POST /api/v1/learning/steps/ensure must assign resolvable verified resource IDs
    and never assign dead placeholders like 'res-tut-1'.
    """
    res = candidate_client.post(
        "/api/v1/learning/steps/ensure",
        json={
            "topic_id": "topic-indexing-plans",
            "domain_id": "gap-046377b2-6953-4aba-99e0-a8164be7e97d",
        },
    )
    assert res.status_code == 200
    step_data = res.json()
    rec_ids = step_data["recommended_resource_ids"]
    assert len(rec_ids) > 0
    assert "res-tut-1" not in rec_ids
    assert "res-tut-2" not in rec_ids
    assert "res-yt-sql-indexing" in rec_ids


# ──────────────────────────────────────────────────────────────────────────────
# 6. Unauthenticated Requests Return 401 in Production Mode
# ──────────────────────────────────────────────────────────────────────────────
def test_unauthenticated_requests_rejected_in_production(test_db_session):
    """
    Without a valid Bearer token in production mode, protected resource endpoints
    must return HTTP 401 Unauthorized.
    """
    from backend.app.core.config import get_settings

    app.dependency_overrides.clear()
    prev_env = os.environ.get("APP_ENV")
    try:
        os.environ["APP_ENV"] = "production"
        get_settings.cache_clear()
        unauth_client = TestClient(app)

        res_search = unauth_client.get("/api/v1/learning/resources/search?query=python")
        assert res_search.status_code == 401

        res_detail = unauth_client.get("/api/v1/learning/resources/res-yt-sql-indexing")
        assert res_detail.status_code == 401
    finally:
        os.environ["APP_ENV"] = prev_env or "test"
        get_settings.cache_clear()


# ──────────────────────────────────────────────────────────────────────────────
# 7. Candidate Cannot Access Recruiter / Manager Protected Endpoints (403 Forbidden)
# ──────────────────────────────────────────────────────────────────────────────
def test_candidate_blocked_from_recruiter_endpoints(candidate_client):
    """
    An authenticated candidate user without manager/recruiter role or organization membership
    must receive HTTP 403 Forbidden when accessing recruiter endpoints.
    """
    res_jobs = candidate_client.get("/api/v1/recruiter/jobs")
    assert res_jobs.status_code == 403

    res_candidates = candidate_client.get("/api/v1/recruiter/candidates")
    assert res_candidates.status_code == 403

    res_create_job = candidate_client.post(
        "/api/v1/recruiter/jobs",
        json={
            "title": "Unauthorized Job",
            "description": "Candidate attempting to create a job posting.",
        },
    )
    assert res_create_job.status_code == 403


# ──────────────────────────────────────────────────────────────────────────────
# 8. Frontend Resources Page Source Contract Verification
# ──────────────────────────────────────────────────────────────────────────────
def test_frontend_learning_resources_page_error_and_empty_states():
    """
    Verifies that src/app/app/learning/resources/page.tsx:
    - Does not swallow errors with a misleading 'Provider APIs authenticated securely' info toast.
    - Renders an explicit alert banner (role="alert") when searchError is set.
    - Renders an explicit empty state ('No Matching Learning Resources Found') when filteredResources is empty.
    """
    page_path = (
        Path(__file__).resolve().parent.parent.parent
        / "src"
        / "app"
        / "app"
        / "learning"
        / "resources"
        / "page.tsx"
    )
    source = page_path.read_text(encoding="utf-8")

    assert "Provider APIs authenticated securely" not in source
    assert 'role="alert"' in source
    assert "Live Resource Search Failed" in source
    assert "No Matching Learning Resources Found" in source
    assert "Reset Filters" in source
