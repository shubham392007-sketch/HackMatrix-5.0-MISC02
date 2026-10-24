from datetime import datetime, timezone, timedelta
import uuid
import pytest
import httpx
from unittest.mock import patch, AsyncMock, MagicMock
from backend.app.career.orchestrator import JobSearchOrchestrator, ModeASearchIntent
from backend.app.career.providers.base import JobSearchResult


REGRESSION_SKILLS_FIXTURE = [
    {"id": "skill-crypto", "name": "Advanced Cryptography", "proficiency": "Expert", "verification_status": "verified", "confidence": 0.95},
    {"id": "skill-llm-sec", "name": "LLM / Agent Security", "proficiency": "Advanced", "verification_status": "verified", "confidence": 0.90},
    {"id": "skill-web-exploit", "name": "Web Exploitation", "proficiency": "Advanced", "verification_status": "verified", "confidence": 0.88},
    {"id": "skill-ctf", "name": "Cybersecurity CTF Development", "proficiency": "Working", "verification_status": "verified", "confidence": 0.85},
    {"id": "skill-sec-impl", "name": "Security Implementation", "proficiency": "Advanced", "verification_status": "verified", "confidence": 0.90},
    {"id": "skill-api", "name": "API Integration", "proficiency": "Advanced", "verification_status": "verified", "confidence": 0.90},
    {"id": "skill-ts", "name": "TypeScript Development", "proficiency": "Advanced", "verification_status": "verified", "confidence": 0.92},
    {"id": "skill-devops", "name": "DevOps & Cloud", "proficiency": "Advanced", "verification_status": "verified", "confidence": 0.85},
]


@pytest.fixture
def mock_db():
    db = MagicMock()
    # Cache and posting queries return None by default to test fresh search
    db.query.return_value.filter.return_value.first.return_value = None
    db.query.return_value.filter.return_value.all.return_value = []
    return db


def test_deterministic_fallback_preserves_security_over_typescript():
    """Verify that even without Ollama, TypeScript Development does NOT cause Frontend Engineer fallback."""
    orchestrator = JobSearchOrchestrator()
    intent = orchestrator._deterministic_security_fallback(REGRESSION_SKILLS_FIXTURE)

    assert "frontend" not in intent.primary_domain.lower()
    assert "security" in intent.primary_domain.lower() or "cryptograph" in intent.primary_domain.lower()
    assert any("Security" in rf or "Cryptography" in rf for rf in intent.role_families)
    assert "Frontend Engineer" in intent.exclude_terms


@pytest.mark.asyncio
async def test_ollama_synthesize_called_exactly_once():
    """Verify that synthesize_mode_a_query_with_ollama issues exactly ONE HTTP POST to Ollama."""
    orchestrator = JobSearchOrchestrator()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": '''{
                "primary_domain": "application_and_ai_security",
                "search_query": "Security Engineer OR Application Security OR Cryptography OR LLM Security",
                "role_families": ["Application Security Engineer", "Product Security Engineer", "LLM Security Engineer", "Offensive Security Engineer", "Cryptography Engineer"],
                "must_include": ["application security", "web exploitation", "LLM security", "cryptography"],
                "supporting_terms": ["API security", "security automation", "red teaming"],
                "exclude_terms": ["Frontend Engineer", "Full Stack Developer", "UI Designer"]
            }'''
        }
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
        intent = await orchestrator.synthesize_mode_a_query_with_ollama(
            skills_data=REGRESSION_SKILLS_FIXTURE,
            location="India",
            remote_only=False,
        )

        assert mock_post.call_count == 1
        assert intent.primary_domain == "application_and_ai_security"
        assert "Frontend Engineer" not in intent.role_families
        assert "Application Security Engineer" in intent.role_families
        assert "Frontend Engineer" in intent.exclude_terms


@pytest.mark.asyncio
async def test_mode_a_discover_jobs_budget_exact_calls(mock_db):
    """
    Verify the strict call budget:
    - Exactly 1 Ollama call
    - Exactly 1 Provider call
    - Local ranking applied without extra calls
    """
    orchestrator = JobSearchOrchestrator()
    test_user_id = uuid.uuid4()

    mock_ollama_resp = MagicMock()
    mock_ollama_resp.status_code = 200
    mock_ollama_resp.json.return_value = {
        "message": {
            "content": '''{
                "primary_domain": "application_and_ai_security",
                "search_query": "Security Engineer OR Application Security OR Cryptography OR LLM Security",
                "role_families": ["Application Security Engineer", "Product Security Engineer", "LLM Security Engineer"],
                "must_include": ["security", "cryptography"],
                "supporting_terms": ["api", "cloud"],
                "exclude_terms": ["Frontend Engineer"]
            }'''
        }
    }

    mock_provider_jobs = [
        JobSearchResult(
            id="job-ts-1",
            provider="theirstack",
            provider_job_id="ts-1",
            canonical_dedupe_key="dedupe-1",
            title="Senior Application Security Engineer",
            company_name="Cyber Corp",
            description="Leading penetration testing, LLM red teaming, and cryptography systems.",
            job_url="https://example.com/job1",
            retrieved_at="2026-10-24T12:00:00Z",
        ),
        JobSearchResult(
            id="job-ts-2",
            provider="theirstack",
            provider_job_id="ts-2",
            canonical_dedupe_key="dedupe-2",
            title="Senior Frontend Engineer (React/TypeScript)",
            company_name="Web Works",
            description="Building client side interfaces in React and Next.js.",
            job_url="https://example.com/job2",
            retrieved_at="2026-10-24T12:00:00Z",
        ),
    ]

    mock_adapter = MagicMock()
    mock_adapter.get_provider_name.return_value = "theirstack"
    mock_adapter.is_configured.return_value = True
    mock_adapter.search_jobs = AsyncMock(return_value=mock_provider_jobs)

    with patch.object(orchestrator, "_get_provider_cascade", return_value=[mock_adapter]):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_ollama_resp) as mock_ollama_post:
            result = await orchestrator.discover_jobs(
                db=mock_db,
                user_id=test_user_id,
                mode="mode_a_skills",
                location="India",
                remote_only=False,
                selected_skills=REGRESSION_SKILLS_FIXTURE,
            )

            # Strict Call Budget Verification
            assert mock_ollama_post.call_count == 1
            assert mock_adapter.search_jobs.call_count == 1

            # Verification of structured output
            assert result["status"] == "success"
            assert result["mode"] == "mode_a_skills"
            assert result["primary_domain"] == "application_and_ai_security"
            assert result["from_cache"] is False

            # Local Ranking Verification: Security Engineer MUST rank above Frontend Engineer
            jobs = result["jobs"]
            assert len(jobs) == 2
            assert jobs[0]["title"] == "Senior Application Security Engineer"
            assert jobs[1]["title"] == "Senior Frontend Engineer (React/TypeScript)"
            assert jobs[0]["local_relevance_score"] > jobs[1]["local_relevance_score"]


@pytest.mark.asyncio
async def test_mode_a_caching_and_invalidation(mock_db):
    """
    Verify caching:
    - Same user + same skills -> cache hit (0 Ollama, 0 provider calls)
    - Different skill selection -> cache invalidated (fresh call)
    """
    orchestrator = JobSearchOrchestrator()
    test_user_id = uuid.uuid4()

    mock_ollama_resp = MagicMock()
    mock_ollama_resp.status_code = 200
    mock_ollama_resp.json.return_value = {
        "message": {
            "content": '''{
                "primary_domain": "application_and_ai_security",
                "search_query": "Security Engineer",
                "role_families": ["Application Security Engineer"],
                "must_include": ["security"],
                "supporting_terms": [],
                "exclude_terms": []
            }'''
        }
    }

    mock_jobs = [
        JobSearchResult(
            id="job-ts-1",
            provider="theirstack",
            provider_job_id="ts-1",
            canonical_dedupe_key="dedupe-1",
            title="Application Security Engineer",
            company_name="Cyber Corp",
            retrieved_at="2026-10-24T12:00:00Z",
        )
    ]

    mock_adapter = MagicMock()
    mock_adapter.get_provider_name.return_value = "theirstack"
    mock_adapter.is_configured.return_value = True
    mock_adapter.search_jobs = AsyncMock(return_value=mock_jobs)

    with patch.object(orchestrator, "_get_provider_cascade", return_value=[mock_adapter]):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_ollama_resp) as mock_ollama_post:
            # 1st search: fresh fetch
            res1 = await orchestrator.discover_jobs(
                db=mock_db,
                user_id=test_user_id,
                mode="mode_a_skills",
                selected_skills=REGRESSION_SKILLS_FIXTURE[:3],
            )
            assert res1["from_cache"] is False
            assert mock_adapter.search_jobs.call_count == 1

            # Simulate DB cache entry found for 2nd search
            mock_cache_entry = MagicMock()
            mock_cache_entry.expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
            mock_cache_entry.result_job_ids = [str(uuid.uuid4())]
            mock_cache_entry.result_count = 1
            mock_cache_entry.provider_used = "theirstack"
            mock_cache_entry.created_at = datetime.now(timezone.utc)
            mock_cache_entry.influencing_skills = ["Advanced Cryptography"]

            mock_db.query.return_value.filter.return_value.first.return_value = mock_cache_entry
            mock_post = MagicMock()
            mock_post.id = uuid.uuid4()
            mock_post.provider = "theirstack"
            mock_post.provider_job_id = "ts-1"
            mock_post.canonical_dedupe_key = "dedupe-1"
            mock_post.title = "Application Security Engineer"
            mock_post.company_name = "Cyber Corp"
            mock_post.company_domain = None
            mock_post.location_text = "India"
            mock_post.remote_status = "remote"
            mock_post.employment_type = "full_time"
            mock_post.seniority = "senior"
            mock_post.salary_min = None
            mock_post.salary_max = None
            mock_post.salary_currency = None
            mock_post.salary_period = None
            mock_post.description = "Security engineer"
            mock_post.job_url = "https://example.com"
            mock_post.apply_url = None
            mock_post.posted_at = datetime.now(timezone.utc)
            mock_post.retrieved_at = datetime.now(timezone.utc)
            mock_post.raw_source_metadata = {"local_relevance_score": 92.0}
            mock_post.extracted_requirements = []
            mock_db.query.return_value.filter.return_value.all.return_value = [mock_post]

            # 2nd search with SAME skills: CACHE HIT (0 provider calls)
            res2 = await orchestrator.discover_jobs(
                db=mock_db,
                user_id=test_user_id,
                mode="mode_a_skills",
                selected_skills=REGRESSION_SKILLS_FIXTURE[:3],
            )
            assert res2["from_cache"] is True
            assert mock_adapter.search_jobs.call_count == 1  # Still 1!

            # Reset cache for 3rd search with DIFFERENT skills
            mock_db.query.return_value.filter.return_value.first.return_value = None

            # 3rd search with DIFFERENT skill selection: CACHE INVALIDATION
            res3 = await orchestrator.discover_jobs(
                db=mock_db,
                user_id=test_user_id,
                mode="mode_a_skills",
                selected_skills=REGRESSION_SKILLS_FIXTURE[3:6],
            )
            assert res3["from_cache"] is False
            assert mock_adapter.search_jobs.call_count == 2  # New search issued!
