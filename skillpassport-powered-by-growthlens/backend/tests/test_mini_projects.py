"""
Test Suite for Learn & Grow Mini-Project Generation, Persistence, Submission, and Candidate Evidence Ingestion (Phase 11).

Validates:
1. Generation produces real, domain-specific project specifications from user skill gap / blueprint.
2. Specifications contain substantive content (milestones, deliverables, rubrics, problem statements).
3. Projects are persisted to database with truthful provenance.
4. Idempotency: repeated requests retrieve cached projects without duplicate records.
5. Explicit regeneration produces fresh projects while preserving previous submissions.
6. Domain/gap isolation: projects for one domain are not returned for another.
7. Project detail retrieval and unauthorized access rejection.
8. Submission creates real candidate evidence in Domain 1 (Evidence Workspace) routed to human review.
9. Submission does NOT fabricate numerical scores or automatically mark skills as verified.
10. Server-authoritative evaluation updates mastery telemetry truthfully.
"""

import os
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

os.environ["APP_ENV"] = "test"

# Provide SQLite compilation for PostgreSQL types during test runs
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

from backend.app.main import app
from backend.app.db.session import get_db
from backend.app.models.base import Base
import backend.app.models
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.learning import (
    LearningMiniProject,
    LearningProjectSubmission,
    LearningRoadmap,
    LearningStep,
)
from backend.app.models.evidence import EvidenceItem
from backend.app.db.reliability import circuit_breaker

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
OTHER_USER_ID = "00000000-0000-0000-0000-000000000002"

active_test_user = TEST_USER_ID


@pytest.fixture
def test_db_session():
    """Isolated in-memory SQLite database for deterministic unit testing."""
    circuit_breaker.reset()
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
    circuit_breaker.reset()


@pytest.fixture
def client(test_db_session):
    global active_test_user
    active_test_user = TEST_USER_ID

    def override_get_db():
        yield test_db_session

    def mock_get_current_user():
        return AuthenticatedUser(
            user_id=active_test_user,
            email=f"user_{active_test_user[:4]}@example.com",
            role="authenticated",
            metadata={"name": "Test User"},
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = mock_get_current_user
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()
    circuit_breaker.reset()


def test_list_mini_projects_initially_empty_and_isolated(client, test_db_session):
    """GET /learning/projects returns empty list initially and respects user isolation."""
    global active_test_user
    active_test_user = TEST_USER_ID

    # 1. Initially empty for test user
    resp = client.get("/api/v1/learning/projects?domain_id=version-control")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 0
    assert data["projects"] == []

    # 2. Insert project owned by OTHER_USER_ID
    other_proj = LearningMiniProject(
        owner_user_id=uuid.UUID(OTHER_USER_ID),
        project_id="proj-other-secret-123",
        domain_id="version-control",
        domain_title="Version Control",
        title="Other User Secret Project",
        problem_statement="Should not be visible to TEST_USER_ID",
        relevance_to_gap="Gap",
        learning_objectives=["Secret objective"],
        expected_deliverables=["Repo"],
        implementation_requirements=["Reqs"],
        milestones=[],
        acceptance_criteria=[],
        rubric=[],
        submission_instructions="None",
        resources=[],
        generation_method="curated_catalogue",
        is_active=True,
    )
    test_db_session.add(other_proj)
    test_db_session.commit()

    # 3. Querying as TEST_USER_ID still returns 0 projects
    resp2 = client.get("/api/v1/learning/projects?domain_id=version-control")
    assert resp2.status_code == 200
    assert resp2.json()["count"] == 0


def test_generate_mini_projects_substantive_and_persisted(client, test_db_session):
    """POST /learning/projects/generate generates domain-specific specs and persists them."""
    global active_test_user
    active_test_user = TEST_USER_ID

    payload = {
        "domain_id": "version-control",
        "domain_title": "Version Control & Git Workflow Orchestration",
        "gap_id": "gap-skill-version-control-orchestration",
        "count": 3,
        "force_regenerate": False,
    }

    resp = client.post("/api/v1/learning/projects/generate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("generated", "cached")
    assert data["count"] >= 2
    assert len(data["projects"]) >= 2

    first_proj = data["projects"][0]
    # Verify substantive specification fields
    assert len(first_proj["title"]) > 10
    assert len(first_proj["problem_statement"]) > 20
    assert len(first_proj["rubric"]) >= 2
    assert len(first_proj["milestones"]) >= 2
    assert first_proj["status"] == "not_started"
    assert first_proj["submitted_attempt"] is None
    assert first_proj["generation_method"] in ("curated_catalogue", "ollama_qwen", "deterministic_fallback")

    # Verify persistence in DB
    db_records = (
        test_db_session.query(LearningMiniProject)
        .filter(LearningMiniProject.owner_user_id == uuid.UUID(TEST_USER_ID))
        .all()
    )
    assert len(db_records) >= 2


def test_generate_mini_projects_idempotency_and_regeneration(client, test_db_session):
    """Calling generate repeatedly is idempotent; force_regenerate creates new projects without deleting historical data."""
    global active_test_user
    active_test_user = TEST_USER_ID

    payload = {
        "domain_id": "docker",
        "domain_title": "Docker Containerization",
        "count": 3,
        "force_regenerate": False,
    }

    # 1. First generation
    resp1 = client.post("/api/v1/learning/projects/generate", json=payload)
    assert resp1.status_code == 200
    proj_ids_1 = [p["id"] for p in resp1.json()["projects"]]

    # 2. Repeated generation without force_regenerate returns cached without inserting duplicates
    resp2 = client.post("/api/v1/learning/projects/generate", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "cached"
    proj_ids_2 = [p["id"] for p in resp2.json()["projects"]]
    assert proj_ids_1 == proj_ids_2

    total_in_db = (
        test_db_session.query(LearningMiniProject)
        .filter(
            LearningMiniProject.owner_user_id == uuid.UUID(TEST_USER_ID),
            LearningMiniProject.domain_id == "docker",
        )
        .count()
    )
    assert total_in_db == len(proj_ids_1)

    # 3. Explicit regeneration with force_regenerate=True
    payload["force_regenerate"] = True
    resp3 = client.post("/api/v1/learning/projects/generate", json=payload)
    assert resp3.status_code == 200
    assert resp3.json()["status"] == "generated"
    proj_ids_3 = [p["id"] for p in resp3.json()["projects"]]
    # Fresh project IDs generated
    assert proj_ids_3 != proj_ids_1

    # Active projects in DB equals new count
    active_in_db = (
        test_db_session.query(LearningMiniProject)
        .filter(
            LearningMiniProject.owner_user_id == uuid.UUID(TEST_USER_ID),
            LearningMiniProject.domain_id == "docker",
            LearningMiniProject.is_active == True,
        )
        .count()
    )
    assert active_in_db == len(proj_ids_3)


def test_multiple_domains_distinct_projects(client, test_db_session):
    """Projects generated for different domains are strictly segregated."""
    global active_test_user
    active_test_user = TEST_USER_ID

    # Generate for version-control
    client.post(
        "/api/v1/learning/projects/generate",
        json={"domain_id": "version-control", "domain_title": "Version Control"},
    )
    # Generate for postgresql
    client.post(
        "/api/v1/learning/projects/generate",
        json={"domain_id": "postgresql", "domain_title": "PostgreSQL"},
    )

    vc_res = client.get("/api/v1/learning/projects?domain_id=version-control").json()
    pg_res = client.get("/api/v1/learning/projects?domain_id=postgresql").json()

    assert vc_res["count"] > 0
    assert pg_res["count"] > 0
    assert all("Git" in p["title"] or "Branch" in p["title"] or "Release" in p["title"] or "Version" in p["title"] for p in vc_res["projects"])
    assert all("Index" in p["title"] or "PostgreSQL" in p["title"] or "Query" in p["title"] for p in pg_res["projects"])


def test_get_project_detail_and_access_control(client, test_db_session):
    """GET /learning/projects/{project_id} retrieves project; rejects unauthorized users."""
    global active_test_user
    active_test_user = TEST_USER_ID

    gen_resp = client.post(
        "/api/v1/learning/projects/generate",
        json={"domain_id": "version-control", "domain_title": "Version Control"},
    ).json()
    target_project_id = gen_resp["projects"][0]["id"]

    # 1. Successful lookup by owner
    detail_resp = client.get(f"/api/v1/learning/projects/{target_project_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == target_project_id
    assert "problem_statement" in detail_resp.json()

    # 2. 404 for non-existent project
    not_found = client.get("/api/v1/learning/projects/proj-does-not-exist-999")
    assert not_found.status_code == 404

    # 3. 403 Forbidden for another user trying to view this project
    active_test_user = OTHER_USER_ID
    unauth = client.get(f"/api/v1/learning/projects/{target_project_id}")
    assert unauth.status_code == 403


def test_submit_mini_project_creates_evidence_and_no_fake_score(client, test_db_session):
    """Submitting a mini-project registers candidate evidence in Domain 1 without fabricating scores."""
    global active_test_user
    active_test_user = TEST_USER_ID

    # Generate a project first
    gen_resp = client.post(
        "/api/v1/learning/projects/generate",
        json={"domain_id": "version-control", "domain_title": "Version Control"},
    ).json()
    target_proj_id = gen_resp["projects"][0]["id"]

    submit_payload = {
        "project_id": target_proj_id,
        "github_repo_url": "https://github.com/developer/git-workflow-orchestration",
        "summary_notes": "Implemented trunk-based rebase workflow with conventional commit enforcement and branch protection.",
    }

    resp = client.post("/api/v1/learning/projects/submit", json=submit_payload)
    assert resp.status_code == 200
    data = resp.json()

    # INVARIANT: Score is NOT fabricated; status is pending evaluation
    assert data["status"] == "submitted"
    assert data["score"] is None
    assert data["passed"] is None
    assert data["evaluation_status"] == "pending_evaluation"
    assert "generated_artifact_id" in data
    assert data["generated_artifact_id"] is not None

    artifact_uuid = uuid.UUID(data["generated_artifact_id"])

    # INVARIANT: Candidate evidence item is created in Domain 1 (Evidence Workspace)
    evidence = test_db_session.query(EvidenceItem).filter(EvidenceItem.id == artifact_uuid).first()
    assert evidence is not None
    assert evidence.owner_user_id == uuid.UUID(TEST_USER_ID)
    assert evidence.source_provider == "github"
    assert evidence.source_url == "https://github.com/developer/git-workflow-orchestration"
    assert evidence.verification_status == "unreviewed"
    assert evidence.processing_status == "ready_for_review"

    # INVARIANT: LearningMiniProject is updated to 'submitted'
    proj = test_db_session.query(LearningMiniProject).filter(LearningMiniProject.project_id == target_proj_id).first()
    assert proj.status == "submitted"

    # Querying GET /learning/projects/{project_id} now reflects the submitted attempt
    updated_detail = client.get(f"/api/v1/learning/projects/{target_proj_id}").json()
    assert updated_detail["status"] == "submitted"
    assert updated_detail["submitted_attempt"] is not None
    assert updated_detail["submitted_attempt"]["github_repo_url"] == "https://github.com/developer/git-workflow-orchestration"


def test_submit_invalid_repo_url_rejected(client, test_db_session):
    """Submitting an invalid URL is rejected with HTTP 422."""
    global active_test_user
    active_test_user = TEST_USER_ID

    invalid_payload = {
        "project_id": "proj-dummy-123",
        "github_repo_url": "ftp://not-a-valid-http-or-git-url",
        "summary_notes": "Test notes",
    }
    resp = client.post("/api/v1/learning/projects/submit", json=invalid_payload)
    assert resp.status_code == 422


def test_evaluate_mini_project_server_authoritative(client, test_db_session):
    """Server-authoritative evaluation updates score, rubric, and telemetry."""
    global active_test_user
    active_test_user = TEST_USER_ID

    gen_resp = client.post(
        "/api/v1/learning/projects/generate",
        json={"domain_id": "version-control", "domain_title": "Version Control"},
    ).json()
    target_proj_id = gen_resp["projects"][0]["id"]

    client.post(
        "/api/v1/learning/projects/submit",
        json={
            "project_id": target_proj_id,
            "github_repo_url": "https://github.com/developer/git-workflow",
            "summary_notes": "Submission notes",
        },
    )

    # Perform server evaluation
    eval_payload = {
        "score": 88.0,
        "feedback": "Clean rebase history and conventional commit hooks verified.",
        "rubric_scores": [
            {"criterion": "Git History Cleanliness", "score": 90, "feedback": "Linear commit log"},
            {"criterion": "Conflict Resolution Rigor", "score": 85, "feedback": "Rebase handled"},
        ],
    }
    eval_resp = client.post(f"/api/v1/learning/projects/{target_proj_id}/evaluate", json=eval_payload)
    assert eval_resp.status_code == 200
    assert eval_resp.json()["status"] == "evaluated"
    assert eval_resp.json()["score"] == 88.0
    assert eval_resp.json()["passed"] is True
    assert eval_resp.json()["computed_mastery"] > 0

    # Query detail to confirm evaluated state
    detail = client.get(f"/api/v1/learning/projects/{target_proj_id}").json()
    assert detail["status"] == "evaluated"
    assert detail["submitted_attempt"]["total_score"] == 88.0
