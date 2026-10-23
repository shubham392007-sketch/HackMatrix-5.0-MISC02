"""
Phase 6 Automated Test Suite: Complete Learn & Grow Data Purge Verification.

Proves:
1. User without an assigned roadmap does not receive a fabricated active roadmap (GET /learning/overview returns active_roadmap: None).
2. Empty backend response produces 0 synthetic steps.
3. Missing assessment history does not create mastery scores (GET /learning/mastery returns average_mastery: 0.0, empty snapshots).
4. Missing baseline does not generate percentage increase (baseline_mastery: 0.0).
5. Missing Career Intelligence data returns empty priorities list (GET /learning/priorities returns priorities: [], count: 0).
6. API failures do not return mock success responses (e.g. 404 for nonexistent resources, 422 for bad input).
7. Project submissions pending evaluation have score: None, passed: None, status: 'submitted'.
8. Strict multi-tenant user isolation: User A's progress cannot enter User B's dashboard.
9. Rendered metrics agree with database records.
10. Canonical blueprints cannot become personal roadmap assignments without explicit creation.
11. Test fixtures / fake identities (e.g. Alex Rivera, hardcoded progress) cannot leak into authenticated routes.
12. Existing authentic Career Intelligence and Learn & Grow workflows remain fully functional.
"""

import os
import uuid
import pytest
from datetime import datetime, timezone
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
from backend.app.models.base import Base
import backend.app.models
from backend.app.models.learning import (
    LearningProjectSubmission,
    LearningAttempt,
    LearningMasterySnapshot,
    LearningRoadmap,
    LearningStep,
)

USER_1_ID = "11111111-1111-1111-1111-111111111111"
USER_2_ID = "22222222-2222-2222-2222-222222222222"

user_1 = AuthenticatedUser(
    user_id=USER_1_ID,
    email="learner1@growthlens.test",
    role="authenticated",
    metadata={"full_name": "Authentic Learner 1"},
)

user_2 = AuthenticatedUser(
    user_id=USER_2_ID,
    email="learner2@growthlens.test",
    role="authenticated",
    metadata={"full_name": "Authentic Learner 2"},
)


@pytest.fixture
def test_db_session():
    """Isolated in-memory SQLite database for deterministic test execution."""
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
def client_user1(test_db_session):
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_1
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def client_user2(test_db_session):
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_2
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


# ──────────────────────────────────────────────────────────────────────────────
# 1. User without an assigned roadmap does not receive a fabricated active roadmap
# ──────────────────────────────────────────────────────────────────────────────
def test_user_without_assigned_roadmap_returns_none(client_user1, test_db_session):
    """
    When a user has no assigned roadmaps in the database, GET /learning/overview
    must return active_roadmap: None. Never fabricate a fallback active roadmap.
    """
    res = client_user1.get("/api/v1/learning/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == USER_1_ID
    assert data["active_roadmap"] is None, "Expected active_roadmap to be None for user without roadmap"


# ──────────────────────────────────────────────────────────────────────────────
# 2. Empty backend response produces 0 synthetic steps
# ──────────────────────────────────────────────────────────────────────────────
def test_empty_backend_response_produces_zero_synthetic_steps(client_user1, test_db_session):
    """
    When no roadmaps exist, GET /learning/roadmaps returns empty list []
    and zero steps are produced or synthesized.
    """
    res = client_user1.get("/api/v1/learning/roadmaps")
    assert res.status_code == 200
    data = res.json()
    assert "roadmaps" in data
    assert len(data["roadmaps"]) == 0

    steps = test_db_session.query(LearningStep).all()
    assert len(steps) == 0, "No synthetic steps should exist in the database"


# ──────────────────────────────────────────────────────────────────────────────
# 3. Missing assessment history does not create mastery scores
# ──────────────────────────────────────────────────────────────────────────────
def test_missing_assessment_history_does_not_create_mastery_scores(client_user1, test_db_session):
    """
    GET /learning/mastery must return average_mastery: 0.0 and empty snapshots
    when the user has no assessment or practice history.
    """
    res = client_user1.get("/api/v1/learning/mastery")
    assert res.status_code == 200
    data = res.json()
    assert data["average_mastery"] == 0.0
    assert data["snapshot_count"] == 0
    assert data["recent_snapshots"] == []
    assert data["recent_attempts"] == []


# ──────────────────────────────────────────────────────────────────────────────
# 4. Missing baseline does not generate percentage increase
# ──────────────────────────────────────────────────────────────────────────────
def test_missing_baseline_does_not_generate_percentage_increase(client_user1, test_db_session):
    """
    When a roadmap is generated without prior diagnostic, baseline_mastery is 0.0
    and current_mastery is 0.0. No fabricated delta (e.g. +14%, +16%) is assigned.
    """
    owner_uuid = uuid.UUID(USER_1_ID)
    roadmap = LearningRoadmap(
        owner_user_id=owner_uuid,
        path_id="path-clean-baseline-01",
        domain_id="domain-data-preprocessing",
        domain_title="Data Preprocessing & Cleaning Pipelines",
        status="active",
        current_mastery=0.0,
        baseline_mastery=0.0,
        target_mastery=80.0,
        total_steps=4,
        completed_steps=0,
    )
    test_db_session.add(roadmap)
    test_db_session.commit()

    res = client_user1.get("/api/v1/learning/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["active_roadmap"] is not None
    assert data["active_roadmap"]["baseline_mastery"] == 0.0
    assert data["active_roadmap"]["current_mastery"] == 0.0


# ──────────────────────────────────────────────────────────────────────────────
# 5. Missing Career Intelligence data returns empty priorities list
# ──────────────────────────────────────────────────────────────────────────────
def test_missing_career_intelligence_data_returns_empty_priorities(client_user1, test_db_session):
    """
    When no Career Intelligence gap snapshots exist in the database,
    GET /learning/priorities must return count: 0 and priorities: [].
    """
    res = client_user1.get("/api/v1/learning/priorities")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 0
    assert data["priorities"] == []


# ──────────────────────────────────────────────────────────────────────────────
# 6. API failures do not return mock success responses
# ──────────────────────────────────────────────────────────────────────────────
def test_api_failures_do_not_return_mock_success_responses(client_user1, test_db_session):
    """
    Nonexistent entities must return HTTP 404, not fallback mock objects.
    Malformed requests must return HTTP 422, not synthetic success.
    """
    res_404_roadmap = client_user1.get("/api/v1/learning/roadmaps/nonexistent-roadmap-999")
    assert res_404_roadmap.status_code == 404

    res_404_resource = client_user1.get("/api/v1/learning/resources/nonexistent-resource-999")
    assert res_404_resource.status_code == 404

    # Invalid project submission payload
    res_422 = client_user1.post("/api/v1/learning/projects/submit", json={"invalid_field": 123})
    assert res_422.status_code == 422


# ──────────────────────────────────────────────────────────────────────────────
# 7. Project submissions pending evaluation have score: None, passed: None, status: 'submitted'
# ──────────────────────────────────────────────────────────────────────────────
def test_project_submissions_pending_evaluation_have_score_none(client_user1, test_db_session):
    """
    Submitting a project repository without an evaluator run records
    score: None, passed: None, status: 'submitted'.
    """
    payload = {
        "project_id": "proj-outlier-pipeline",
        "github_repo_url": "https://github.com/learner1/outlier-pipeline",
        "summary_notes": "Implemented pure Scikit-learn transformer.",
    }
    res = client_user1.post("/api/v1/learning/projects/submit", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "submitted"
    assert data["score"] is None
    assert data["passed"] is None
    assert data["evaluation_status"] == "pending_evaluation"

    # Invariant: LearningAttempt and LearningMasterySnapshot must remain 0
    assert test_db_session.query(LearningAttempt).count() == 0
    assert test_db_session.query(LearningMasterySnapshot).count() == 0


# ──────────────────────────────────────────────────────────────────────────────
# 8. Strict multi-tenant user isolation: User A's progress cannot enter User B's dashboard
# ──────────────────────────────────────────────────────────────────────────────
def test_tenant_isolation_user_a_progress_isolated_from_user_b(client_user1, client_user2, test_db_session):
    """
    Data belonging to User 1 (roadmap, attempts, submissions) must NEVER be
    visible or included in User 2's responses.
    """
    owner_1 = uuid.UUID(USER_1_ID)
    owner_2 = uuid.UUID(USER_2_ID)

    # Populate User 1 data
    roadmap1 = LearningRoadmap(
        owner_user_id=owner_1,
        path_id="path-u1-01",
        domain_id="domain-data-preprocessing",
        domain_title="User 1 Preprocessing",
        status="in_progress",
        current_mastery=45.0,
        baseline_mastery=20.0,
        target_mastery=80.0,
        total_steps=4,
        completed_steps=2,
    )
    test_db_session.add(roadmap1)

    snap1 = LearningMasterySnapshot(
        owner_user_id=owner_1,
        domain_id="domain-data-preprocessing",
        skill_id="skill-prep-01",
        canonical_name="Data Cleaning",
        mastery_score=60.0,
        knowledge_signal=60.0,
        practice_signal=60.0,
        assessment_signal=60.0,
        project_signal=60.0,
    )
    test_db_session.add(snap1)

    sub1 = LearningProjectSubmission(
        owner_user_id=owner_1,
        project_id="proj-u1",
        github_repo_url="https://github.com/u1/repo",
        summary_notes="U1 submission",
        status="submitted",
    )
    test_db_session.add(sub1)
    test_db_session.commit()

    # User 2 queries
    res_u2_overview = client_user2.get("/api/v1/learning/overview")
    assert res_u2_overview.status_code == 200
    assert res_u2_overview.json()["active_roadmap"] is None

    res_u2_mastery = client_user2.get("/api/v1/learning/mastery")
    assert res_u2_mastery.status_code == 200
    assert res_u2_mastery.json()["average_mastery"] == 0.0
    assert res_u2_mastery.json()["snapshot_count"] == 0

    res_u2_subs = client_user2.get("/api/v1/learning/projects/submissions")
    assert res_u2_subs.status_code == 200
    assert len(res_u2_subs.json()) == 0


# ──────────────────────────────────────────────────────────────────────────────
# 9. Rendered metrics agree with database records
# ──────────────────────────────────────────────────────────────────────────────
def test_rendered_metrics_agree_with_database_records(client_user1, test_db_session):
    """
    Overview and mastery endpoints report values that match the database exactly.
    """
    owner_1 = uuid.UUID(USER_1_ID)
    roadmap = LearningRoadmap(
        owner_user_id=owner_1,
        path_id="path-metric-check",
        domain_id="domain-data-preprocessing",
        domain_title="Data Preprocessing",
        status="active",
        current_mastery=35.0,
        baseline_mastery=15.0,
        target_mastery=85.0,
        total_steps=5,
        completed_steps=2,
    )
    test_db_session.add(roadmap)

    snapshot = LearningMasterySnapshot(
        owner_user_id=owner_1,
        domain_id="domain-data-preprocessing",
        skill_id="skill-prep-02",
        canonical_name="Feature Engineering",
        mastery_score=72.5,
        knowledge_signal=80.0,
        practice_signal=70.0,
        assessment_signal=75.0,
        project_signal=65.0,
    )
    test_db_session.add(snapshot)
    test_db_session.commit()

    res_ov = client_user1.get("/api/v1/learning/overview")
    assert res_ov.status_code == 200
    active = res_ov.json()["active_roadmap"]
    assert active["current_mastery"] == 35.0
    assert active["baseline_mastery"] == 15.0
    assert active["total_steps"] == 5
    assert active["completed_steps"] == 2

    res_m = client_user1.get("/api/v1/learning/mastery")
    assert res_m.status_code == 200
    assert res_m.json()["average_mastery"] == 72.5
    assert res_m.json()["snapshot_count"] == 1


# ──────────────────────────────────────────────────────────────────────────────
# 10. Canonical blueprints cannot become personal roadmap assignments
# ──────────────────────────────────────────────────────────────────────────────
def test_canonical_blueprints_cannot_become_personal_roadmap_assignments(client_user1, test_db_session):
    """
    Querying GET /learning/blueprints provides pedagogical domain references,
    but does NOT write or assign personal LearningRoadmap records for the user.
    """
    res = client_user1.get("/api/v1/learning/blueprints")
    assert res.status_code == 200
    blueprints = res.json()
    assert len(blueprints) > 0

    # Ensure zero roadmaps exist for user in DB
    user_roadmaps = (
        test_db_session.query(LearningRoadmap)
        .filter(LearningRoadmap.owner_user_id == uuid.UUID(USER_1_ID))
        .all()
    )
    assert len(user_roadmaps) == 0


# ──────────────────────────────────────────────────────────────────────────────
# 11. Test fixtures / fake identities cannot leak into authenticated routes
# ──────────────────────────────────────────────────────────────────────────────
def test_test_fixtures_cannot_leak_into_authenticated_routes(client_user1, test_db_session):
    """
    Verify that hardcoded identities (e.g. 'Alex Rivera') or mock history artifacts
    do not appear anywhere in the authenticated responses.
    """
    res_overview = client_user1.get("/api/v1/learning/overview")
    content_str = res_overview.text
    assert "Alex Rivera" not in content_str
    assert "hist-01" not in content_str
    assert "art-initial-01" not in content_str

    res_mastery = client_user1.get("/api/v1/learning/mastery")
    content_m_str = res_mastery.text
    assert "Alex Rivera" not in content_m_str
    assert "hist-01" not in content_m_str


# ──────────────────────────────────────────────────────────────────────────────
# 12. Existing authentic Career Intelligence and Learn & Grow workflows remain functional
# ──────────────────────────────────────────────────────────────────────────────
def test_authentic_workflows_remain_functional(client_user1, test_db_session):
    """
    End-to-end workflow verification:
    1. Generate a genuine roadmap from an educational blueprint.
    2. Record an authentic practice attempt.
    3. Verify deterministic mastery updates in DB and telemetry.
    """
    from unittest.mock import patch, AsyncMock
    from backend.app.learning.providers.base import AggregationResult
    from backend.app.learning.ai_advisor import LearningPathRecommendation, LearningStageRecommendation

    mock_search = AggregationResult(
        resources=[],
        provider_statuses={},
        total_found=0,
        warnings=[],
    )

    mock_rec = LearningPathRecommendation(
        skill_id="5873a582-0487-4035-bf6d-30a06b5a301f",
        canonical_name="Distributed Systems",
        recommended_stages=[
            LearningStageRecommendation(
                stage_number=1,
                stage_title="Consensus Fundamentals",
                focus_objective="Understand Raft basics",
                recommended_resource_ids=[],
                pedagogical_rationale="Foundation",
            ),
            LearningStageRecommendation(
                stage_number=2,
                stage_title="Event Streaming",
                focus_objective="Implement consumer groups",
                recommended_resource_ids=[],
                pedagogical_rationale="Applied practice",
            ),
        ],
        estimated_total_hours=4,
        generation_method="heuristic_fallback",
    )

    with patch("backend.app.learning.router.aggregator.search_all", new=AsyncMock(return_value=mock_search)), \
         patch("backend.app.learning.router.advisor.recommend_learning_path", new=AsyncMock(return_value=mock_rec)):

        # 1. Generate roadmap
        gen_res = client_user1.post(
            "/api/v1/learning/roadmaps/generate",
            json={"domain_id": "dist-sys", "step_count": 2, "force_regenerate": True},
        )
        assert gen_res.status_code == 200
        roadmap_data = gen_res.json()
        assert roadmap_data["domain_id"] == "dist-sys"
        assert len(roadmap_data["steps"]) == 2
        roadmap_id = roadmap_data["id"]
        step_id = roadmap_data["steps"][0]["step_id"]

        # 2. Record authentic attempt
        attempt_res = client_user1.post(
            "/api/v1/learning/attempts",
            json={
                "step_id": step_id,
                "roadmap_id": roadmap_id,
                "attempt_type": "practice",
                "activity_id": "prac-act-01",
                "score": 90.0,
                "signals": {"practice": 90.0, "knowledge": 85.0},
            },
        )
        assert attempt_res.status_code == 200
        attempt_data = attempt_res.json()
        assert attempt_data["score"] == 90.0
        assert attempt_data["passed"] is True
        assert attempt_data["computed_mastery"] > 0

        # 3. Query overview to confirm real progress is reflected
        ov_res = client_user1.get("/api/v1/learning/overview")
        assert ov_res.status_code == 200
        active = ov_res.json()["active_roadmap"]
        assert active is not None
        assert active["id"] == roadmap_id
        assert active["current_mastery"] > 0
