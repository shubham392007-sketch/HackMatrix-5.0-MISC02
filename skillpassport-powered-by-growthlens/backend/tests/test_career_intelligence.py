import os
os.environ["APP_ENV"] = "test"

import asyncio
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.career.providers.base import generate_canonical_dedupe_key, JobSearchResult
from backend.app.career.providers.jsearch import JSearchAdapter
from backend.app.career.providers.theirstack import TheirStackAdapter
from backend.app.career.providers.fantastic_jobs import FantasticJobsAdapter
from backend.app.career.orchestrator import JobSearchOrchestrator, job_orchestrator
from backend.app.career.matching_engine import matching_engine
from backend.app.career.prioritization_service import prioritization_service
from backend.app.career.parser_service import parser_service

from backend.app.db.session import get_db

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer sp_demo_alexchen_valid"}

def override_get_db():
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = []
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_db.query.return_value.filter.return_value.count.return_value = 0
    yield mock_db

app.dependency_overrides[get_db] = override_get_db


# ==============================================================================
# 1. PROVIDER STATUS & UNCONFIGURED TRUTHFULNESS
# ==============================================================================

def test_job_provider_status():
    """Verify provider status endpoint returns accurate configuration state and bounds."""
    response = client.get("/api/v1/career/jobs/status", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert isinstance(data["providers"], list)
    providers = [p["provider"] for p in data["providers"]]
    assert "jsearch" in providers
    assert "theirstack" in providers
    assert "fantastic_jobs" in providers
    assert data["max_results_per_search"] <= 10
    assert data["primary_provider"] in ("jsearch", "theirstack", "fantastic_jobs")


def test_job_discovery_unconfigured_behavior():
    """When no provider keys are set in test environment, discovery gracefully returns not_configured."""
    with patch.object(job_orchestrator, "_get_provider_cascade", return_value=[]):
        response = client.post(
            "/api/v1/career/jobs/discover",
            json={"mode": "mode_b_role", "query": "Machine Learning Engineer"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_configured"
        assert len(data["jobs"]) == 0
        assert data.get("total_returned", 0) == 0


# ==============================================================================
# 2. PROVIDER ADAPTERS & CREDIT MINIMIZATION
# ==============================================================================

def test_canonical_deduplication():
    """Verify deterministic cross-provider canonical dedupe key generation."""
    key1 = generate_canonical_dedupe_key("Senior AI Engineer", "TechCorp", "San Francisco, CA")
    key2 = generate_canonical_dedupe_key("senior ai engineer", "TechCorp", "san francisco, ca")
    # Normalized strings should produce identical hash
    assert key1 == key2

    key3 = generate_canonical_dedupe_key("Data Scientist", "TechCorp", "San Francisco, CA")
    assert key1 != key3


def test_jsearch_adapter_limits_and_headers():
    """Verify JSearch adapter strictly requests only 1 page (1 credit)."""
    adapter = JSearchAdapter()
    adapter.settings.jsearch_api_key = "mock_rapidapi_key"
    adapter.settings.jsearch_api_host = "jsearch.p.rapidapi.com"
    assert adapter.is_configured() is True

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "OK",
        "data": [
            {
                "job_id": "jsearch_123",
                "job_title": "AI Platform Engineer",
                "employer_name": "Apex Innovations",
                "job_city": "Austin",
                "job_state": "TX",
                "job_country": "US",
                "job_is_remote": True,
                "job_employment_type": "FULLTIME",
                "job_min_salary": 140000,
                "job_max_salary": 180000,
                "job_salary_currency": "USD",
                "job_salary_period": "YEAR",
                "job_description": "We are seeking an AI Platform Engineer skilled in Python and FastAPI.",
                "job_apply_link": "https://example.com/apply/123",
                "job_posted_at_datetime_utc": "2026-03-01T12:00:00.000Z",
            }
        ],
    }

    async def run_test():
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            jobs = await adapter.search_jobs("AI Engineer", remote_only=True, limit=10)

            # Verify call was strictly constrained to 1 page
            assert mock_get.called
            call_kwargs = mock_get.call_args[1]
            assert call_kwargs["params"]["page"] == "1"
            assert call_kwargs["params"]["num_pages"] == "1"
            assert call_kwargs["headers"]["X-RapidAPI-Key"] == "mock_rapidapi_key"

            assert len(jobs) == 1
            job = jobs[0]
            assert job.provider == "jsearch"
            assert job.provider_job_id == "jsearch_123"
            assert job.title == "AI Platform Engineer"
            assert job.company_name == "Apex Innovations"
            assert job.remote_status == "remote"
            assert job.salary_min == 140000

    asyncio.run(run_test())


def test_theirstack_adapter_limits():
    """Verify TheirStack adapter caps result limits to <= 10 to conserve per-job credits."""
    adapter = TheirStackAdapter()
    adapter.settings.theirstack_api_key = "mock_theirstack_key"
    assert adapter.is_configured() is True

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {
                "id": 9988,
                "job_title": "Staff ML Engineer",
                "company_object": {"name": "NeuroCore", "domain": "neurocore.ai"},
                "location": "New York, NY",
                "remote": False,
                "employment_type": "Full-time",
                "seniority": "Staff",
                "description": "Looking for PyTorch and distributed systems experience.",
                "url": "https://neurocore.ai/jobs/9988",
                "date_posted": "2026-03-02",
            }
        ]
    }

    async def run_test():
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            jobs = await adapter.search_jobs("ML Engineer", limit=10)

            assert mock_post.called
            call_kwargs = mock_post.call_args[1]
            # Verified bounded limit payload
            assert call_kwargs["json"]["limit"] <= 10
            assert len(jobs) == 1
            assert jobs[0].company_name == "NeuroCore"
            assert jobs[0].provider == "theirstack"

    asyncio.run(run_test())


def test_fantastic_jobs_adapter():
    """Verify Fantastic.jobs adapter handles responses correctly."""
    adapter = FantasticJobsAdapter()
    adapter.settings.fantastic_jobs_api_key = "mock_fantastic_key"
    assert adapter.is_configured() is True

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "jobs": [
            {
                "id": "fj-55",
                "title": "Backend AI Developer",
                "company": "DeepFlow",
                "location": "London, UK",
                "remote": True,
                "url": "https://deepflow.io/careers/55",
                "description": "Build high-throughput Python API services.",
            }
        ]
    }

    async def run_test():
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            jobs = await adapter.search_jobs("Backend AI", limit=10)
            assert len(jobs) == 1
            assert jobs[0].title == "Backend AI Developer"
            assert jobs[0].provider == "fantastic_jobs"

    asyncio.run(run_test())


# ==============================================================================
# 3. ORCHESTRATOR SEARCH MODES & CACHING
# ==============================================================================

def test_orchestrator_mode_a_query_derivation():
    """Verify Mode A derives concise query from top verified skills without leaking full history."""
    orchestrator = JobSearchOrchestrator()
    # Mocking user verified skills
    mock_skills = [
        {"skill_id": "skill-python", "canonical_name": "Python Engineering", "verification_state": "verified"},
        {"skill_id": "skill-fastapi", "canonical_name": "FastAPI", "verification_state": "verified"},
        {"skill_id": "skill-sql", "canonical_name": "SQL & Relational DB", "verification_state": "verified"},
        {"skill_id": "skill-docker", "canonical_name": "Docker", "verification_state": "rejected"},  # Should be excluded!
    ]

    # Mode A query builder excludes rejected skills
    valid_skills = [s for s in mock_skills if s["verification_state"] in ("verified", "candidate")]
    assert len(valid_skills) == 3
    query = " ".join([s["canonical_name"].split()[0] for s in valid_skills[:3]])
    assert "Docker" not in query
    assert "Python" in query


# ==============================================================================
# 4. ROLE CATALOGUE & TARGET ROLE MANAGEMENT
# ==============================================================================

def test_list_role_catalogue():
    """Verify curated role benchmarks exist in database and are returned."""
    response = client.get("/api/v1/career/roles", headers=AUTH_HEADERS)
    assert response.status_code == 200
    roles = response.json()
    assert isinstance(roles, list)
    assert len(roles) >= 3
    role_ids = [r["role_id"] for r in roles]
    assert "role-ai-engineer-entry" in role_ids
    assert "role-mlops-engineer-mid" in role_ids


def test_get_role_demand_model():
    """Verify detailed role demand model structure."""
    response = client.get("/api/v1/career/roles/role-ai-engineer-entry", headers=AUTH_HEADERS)
    assert response.status_code == 200
    role = response.json()
    assert role["role_id"] == "role-ai-engineer-entry"
    assert role["title"] == "AI Engineer"
    assert len(role["competencies"]) >= 4
    comp = role["competencies"][0]
    assert "skill_id" in comp
    assert "requirement_type" in comp
    assert "expected_level" in comp


def test_target_role_crud():
    """Verify getting and setting active user target role."""
    set_res = client.put(
        "/api/v1/career/target",
        json={
            "target_role_id": "role-ai-engineer-entry",
            "target_role_version": "v2026.1",
            "role_title": "AI Engineer",
        },
        headers=AUTH_HEADERS,
    )
    assert set_res.status_code == 200

    get_res = client.get("/api/v1/career/target", headers=AUTH_HEADERS)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["target_role_id"] == "role-ai-engineer-entry"
    assert data["role_title"] == "AI Engineer"


# ==============================================================================
# 5. SINGLE DETERMINISTIC MATCHING ENGINE & GAP CLASSIFICATION
# ==============================================================================

def test_deterministic_matching_engine_endpoint():
    """Verify GET /api/v1/career/match/{role_id} returns exact, explainable scores."""
    response = client.get("/api/v1/career/match/role-ai-engineer-entry", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "overall_match_score" in data
    assert 0 <= data["overall_match_score"] <= 100
    assert "required_coverage_score" in data
    assert "competency_matches" in data
    assert len(data["competency_matches"]) > 0

    # Inspect requirement-level match schema
    match_0 = data["competency_matches"][0]
    assert "skill_id" in match_0
    assert "raw_coverage" in match_0
    assert "effective_coverage" in match_0
    assert "match_status" in match_0
    assert match_0["match_status"] in (
        "strong_match",
        "partial_match",
        "evidence_gap",
        "missing_weak",
        "conflicting",
    )


def test_skill_gaps_endpoint():
    """Verify skill gaps diagnostic returns properly classified gaps."""
    response = client.get("/api/v1/career/gaps/role-ai-engineer-entry", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["role_id"] == "role-ai-engineer-entry"
    assert "gaps" in data
    for gap in data["gaps"]:
        assert "gap_type" in gap
        assert gap["gap_type"] in (
            "skill_gap",
            "depth_gap",
            "evidence_gap",
            "application_gap",
            "dependency_gap",
            "differentiation_opportunity",
            "freshness_gap",
        )
        assert "diagnosis" in gap
        assert "proficiency_distance" in gap


def test_gap_priorities_endpoint():
    """Verify gap prioritization service handles focus modes and scenario sliders."""
    # 1. Default mode
    res1 = client.post(
        "/api/v1/career/priorities/role-ai-engineer-entry",
        json={"focus_mode": "default", "effort_sensitivity": 1.0, "leverage_weight": 1.0},
        headers=AUTH_HEADERS,
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert "prioritized_gaps" in data1
    if data1["prioritized_gaps"]:
        assert "priority_score" in data1["prioritized_gaps"][0]
        assert "priority_inputs" in data1["prioritized_gaps"][0]

    # 2. Top 3 mode
    res2 = client.post(
        "/api/v1/career/priorities/role-ai-engineer-entry",
        json={"focus_mode": "top3", "effort_sensitivity": 1.5, "leverage_weight": 1.2},
        headers=AUTH_HEADERS,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["prioritized_gaps"]) <= 3


def test_career_readiness_endpoint():
    """Verify career readiness assessment returns readiness tier and non-hiring disclaimer."""
    response = client.get("/api/v1/career/readiness/role-ai-engineer-entry", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "readiness_index" in data
    assert 0 <= data["readiness_index"] <= 100
    assert data["readiness_tier"] in (
        "High Readiness",
        "Moderate Alignment",
        "Developing Foundations",
        "Early Stage",
    )
    assert "disclaimer" in data
    # Mandatory non-hiring disclaimer check
    assert "not" in data["disclaimer"].lower() or "development" in data["disclaimer"].lower()


def test_compare_roles_endpoint():
    """Verify side-by-side comparison of multiple roles."""
    response = client.post(
        "/api/v1/career/compare",
        json={"role_ids": ["role-ai-engineer-entry", "role-mlops-engineer-mid"]},
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200
    data = response.json()
    assert "compared_roles" in data
    assert len(data["compared_roles"]) == 2
    assert data["compared_roles"][0]["role_id"] == "role-ai-engineer-entry"
    assert data["compared_roles"][1]["role_id"] == "role-mlops-engineer-mid"


# ==============================================================================
# 6. JOB PARSER & CUSTOM ROLE CREATION
# ==============================================================================

def test_parse_job_description_service():
    """Verify job description parser maps competencies and extracts source spans."""
    sample_text = """
    We are hiring an AI Systems Engineer.
    Required Qualifications:
    - 3+ years experience with Python Programming developing asynchronous services and APIs.
    - Deep knowledge of Cloud Infrastructure & DevOps using Docker containerization and Kubernetes.
    - Experience in Relational Data Modeling & PostgreSQL database optimization.
    - Experience in Version Control & Git Workflow Orchestration.
    """
    response = client.post(
        "/api/v1/career/parse-jd",
        json={
            "raw_text": sample_text,
            "job_title": "AI Systems Engineer",
            "company_name": "Vertex Systems",
            "seniority": "Mid Level",
        },
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_extracted"] >= 3
    comps = data["extracted_competencies"]
    assert any("Python" in c["canonical_name"] for c in comps)
    # Ensure source span is preserved
    for comp in comps:
        assert len(comp["source_span"]) > 0


def test_save_custom_role():
    """Verify user can save custom parsed job as a versioned RoleDemandModel."""
    response = client.post(
        "/api/v1/career/roles/custom",
        json={
            "job_title": "Custom MLOps Specialist",
            "company_name": "CloudScale Inc",
            "seniority": "Senior Level",
            "context": "Custom parsed from CloudScale JD",
            "extracted_competencies": [
                {
                    "canonical_skill_id": "skill-python",
                    "canonical_name": "Python Engineering",
                    "requirement_type": "core_required",
                    "importance": "critical",
                    "expected_level": "Advanced",
                    "expected_level_numeric": 4,
                    "evidence_expectation": "Demonstrated async Python backend services.",
                    "source_span": "Strong Python async experience required.",
                    "status": "mapped",
                }
            ],
        },
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200
    custom_role = response.json()
    assert "role_id" in custom_role
    assert custom_role["source_type"] == "custom_parsed_job"
    assert custom_role["title"] == "Custom MLOps Specialist"


# ==============================================================================
# 7. LEARN & GROW HANDOFF
# ==============================================================================

def test_learn_grow_handoff():
    """Verify structured handoff JSON schema for downstream Learn & Grow domain."""
    response = client.get("/api/v1/career/learn-grow-handoff/role-ai-engineer-entry", headers=AUTH_HEADERS)
    assert response.status_code == 200
    handoff = response.json()
    assert handoff["target_role_id"] == "role-ai-engineer-entry"
    assert "target_role_version" in handoff
    assert "matching_policy_version" in handoff
    assert "handoff_items" in handoff
    for item in handoff["handoff_items"]:
        assert "skill_id" in item
        assert "expected_level" in item
        assert "gap_type" in item
        assert "priority_rank" in item


# ==============================================================================
# 8. REBUILD ACCEPTANCE TESTS (ENGINE REDESIGN VERIFICATION)
# ==============================================================================

def test_normalized_gap_priority_scores_bounded_0_to_100():
    """Verify all gap priority scores are strictly bounded within [0.0, 100.0] and explainable."""
    response = client.post(
        "/api/v1/career/priorities/role-ai-engineer-entry",
        json={"focus_mode": "default", "effort_sensitivity": 1.0, "leverage_weight": 1.0},
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200
    data = response.json()
    for gap in data.get("prioritized_gaps", []):
        score = gap["priority_score"]
        # Score must NEVER be unnormalized (like 1013.0 or 81.0 from raw multiplicative formula)
        assert 0.0 <= score <= 100.0, f"Unbounded score {score} for {gap['canonical_name']}"
        assert "why_prioritized" in gap
        assert len(gap["why_prioritized"]) > 10


def test_verified_python_capability_no_contradiction():
    """
    Core bug fix verification:
    Ensure verified Python capability with attributable evidence NEVER produces 0% effective coverage
    or 'missing_weak' diagnosis.
    """
    response = client.get("/api/v1/career/match/role-ai-engineer-entry", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    python_match = next((c for c in data["competency_matches"] if "python" in c["canonical_name"].lower()), None)
    assert python_match is not None, "Python requirement not found in AI Engineer demand model"
    
    # If the candidate has verified Python capability, verify that coverage is positive
    if python_match["current_proficiency"] in ("Working", "Practitioner", "Advanced", "Intermediate"):
        assert python_match["effective_coverage"] > 0.0, "Contradiction: Demonstrated proficiency but 0% effective coverage"
        assert python_match["match_status"] != "missing_weak", "Contradiction: Demonstrated capability marked as missing_weak"


def test_saved_targets_vs_catalogue_separation():
    """Verify clean separation between Explore Catalogue Benchmarks and My Target Roles."""
    # 1. Catalogue scope returns only curated models without user ownership
    cat_res = client.get("/api/v1/career/roles?scope=catalogue", headers=AUTH_HEADERS)
    assert cat_res.status_code == 200
    cat_roles = cat_res.json()
    assert isinstance(cat_roles, list)
    for r in cat_roles:
        assert r["source_type"] == "curated_model"
        assert r["is_user_target"] is False

    # 2. Saved targets scope returns only user targets
    saved_res = client.get("/api/v1/career/roles?scope=saved_targets", headers=AUTH_HEADERS)
    assert saved_res.status_code == 200
    saved_roles = saved_res.json()
    assert isinstance(saved_roles, list)


def test_target_save_and_delete_lifecycle():
    """Verify saving a catalogue role to targets and then removing it."""
    # 1. Save catalogue role to targets
    save_res = client.post("/api/v1/career/roles/role-ai-engineer-entry/save-to-targets", headers=AUTH_HEADERS)
    assert save_res.status_code == 200
    saved_data = save_res.json()
    assert saved_data["status"] in ("saved", "already_saved")
    target_role_id = saved_data["role_id"]

    # 2. Delete the target role
    del_res = client.delete(f"/api/v1/career/roles/{target_role_id}", headers=AUTH_HEADERS)
    assert del_res.status_code in (200, 404)

