"""
Phase 5F Data Integrity Test Suite: Applied Mini-Project Submissions & Mastery Isolation.

Proves:
1. Submitting a project without evaluation creates no numerical result (score=None, passed=None).
2. Pending projects do NOT insert into learning_attempts or learning_mastery_snapshots.
3. Pending projects do NOT increment topic/step mastery or mark steps completed.
4. Idempotent project resubmission updates the existing record rather than duplicating entries.
5. Strict multi-tenant user isolation: User B cannot access or evaluate User A's project.
6. Input validation rejects invalid repository URLs with HTTP 422.
7. Legitimate server evaluation (POST /projects/{id}/evaluate) accurately updates mastery,
   records a valid project_signal, and completes associated learning steps.
8. Existing quiz assessment grading and attempt persistence remain completely unaffected.
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

USER_1_ID = "00000000-0000-0000-0000-000000000001"
USER_2_ID = "00000000-0000-0000-0000-000000000002"

user_1 = AuthenticatedUser(
    user_id=USER_1_ID,
    email="learner1@growthlens.test",
    role="authenticated",
    metadata={"full_name": "Learner One"},
)

user_2 = AuthenticatedUser(
    user_id=USER_2_ID,
    email="learner2@growthlens.test",
    role="authenticated",
    metadata={"full_name": "Learner Two"},
)


@pytest.fixture
def test_db_session():
    """Isolated in-memory SQLite database for deterministic data integrity testing."""
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
def client(test_db_session):
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_1
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_submit_project_unevaluated_has_no_numerical_score(client, test_db_session):
    """
    Submitting a mini-project repository must record status 'submitted' with
    score=None and passed=None. Must NOT insert into learning_attempts or snapshots.
    """
    payload = {
        "project_id": "proj-outlier-pipeline",
        "github_repo_url": "https://github.com/testuser/outlier-pipeline",
        "summary_notes": "Implemented custom PercentileCapper transformer wrapping pandas clip.",
    }

    res = client.post("/api/v1/learning/projects/submit", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["project_id"] == "proj-outlier-pipeline"
    assert data["status"] == "submitted"
    assert data["score"] is None
    assert data["passed"] is None
    assert data["evaluation_status"] == "pending_evaluation"

    # Verify database persistence in learning_project_submissions
    subs = test_db_session.query(LearningProjectSubmission).all()
    assert len(subs) == 1
    sub = subs[0]
    assert sub.project_id == "proj-outlier-pipeline"
    assert sub.score is None
    assert sub.passed is None
    assert sub.status == "submitted"

    # CRITICAL INVARIANT: Zero attempt rows and zero mastery snapshots created
    attempts = test_db_session.query(LearningAttempt).all()
    assert len(attempts) == 0, "Unevaluated project must NOT create a scored LearningAttempt"

    snapshots = test_db_session.query(LearningMasterySnapshot).all()
    assert len(snapshots) == 0, "Unevaluated project must NOT create a LearningMasterySnapshot"


def test_pending_project_does_not_increment_mastery_or_step_completion(client, test_db_session):
    """
    Submitting an unevaluated project for an existing roadmap step must NOT alter
    the step's current_mastery, mark it completed, or affect roadmap completion.
    """
    owner_uuid = uuid.UUID(USER_1_ID)
    roadmap = LearningRoadmap(
        owner_user_id=owner_uuid,
        path_id="roadmap-dist-sys",
        domain_id="dist-sys",
        domain_title="Distributed Systems",
        current_mastery=45.0,
        target_mastery=80.0,
        completed_steps=0,
        total_steps=1,
    )
    test_db_session.add(roadmap)
    test_db_session.flush()

    step = LearningStep(
        roadmap_id=roadmap.id,
        step_id="step-outlier-treatment",
        module_id="mod-01",
        topic_id="topic-outliers",
        title="Outlier Detection Pipeline",
        learning_objective="Implement robust outlier winsorization.",
        recommendation_reason="Targets diagnosed data prep gap.",
        sequence_order=1,
        status="available",
        current_mastery=45.0,
        target_mastery=80.0,
        project_id="proj-outlier-pipeline",
    )
    test_db_session.add(step)
    test_db_session.commit()

    payload = {
        "project_id": "proj-outlier-pipeline",
        "github_repo_url": "https://github.com/testuser/outlier-treatment",
        "summary_notes": "Added tests and transformer.",
        "roadmap_id": str(roadmap.id),
        "step_id": "step-outlier-treatment",
    }

    res = client.post("/api/v1/learning/projects/submit", json=payload)
    assert res.status_code == 200

    # Refresh step and roadmap from DB
    test_db_session.refresh(step)
    test_db_session.refresh(roadmap)

    # Invariants: step mastery remains 45.0, status remains available, roadmap remains 0 completed
    assert step.current_mastery == 45.0
    assert step.status == "available"
    assert roadmap.completed_steps == 0
    assert roadmap.current_mastery == 45.0


def test_idempotent_project_resubmission(client, test_db_session):
    """
    Resubmitting the same project with updated repository URL or notes updates the existing
    submission record without creating duplicate entries.
    """
    payload_1 = {
        "project_id": "proj-idempotent-test",
        "github_repo_url": "https://github.com/testuser/version-1",
        "summary_notes": "First submission notes",
    }
    res1 = client.post("/api/v1/learning/projects/submit", json=payload_1)
    assert res1.status_code == 200
    sub_id_1 = res1.json()["submission_id"]

    payload_2 = {
        "project_id": "proj-idempotent-test",
        "github_repo_url": "https://github.com/testuser/version-2-fixed",
        "summary_notes": "Updated submission with bug fixes",
    }
    res2 = client.post("/api/v1/learning/projects/submit", json=payload_2)
    assert res2.status_code == 200
    sub_id_2 = res2.json()["submission_id"]

    # Same submission ID (updated in place)
    assert sub_id_1 == sub_id_2

    # Exactly 1 row in DB
    subs = test_db_session.query(LearningProjectSubmission).filter(
        LearningProjectSubmission.project_id == "proj-idempotent-test"
    ).all()
    assert len(subs) == 1
    assert subs[0].github_repo_url == "https://github.com/testuser/version-2-fixed"
    assert subs[0].summary_notes == "Updated submission with bug fixes"
    assert subs[0].score is None


def test_user_isolation_on_project_submissions(client, test_db_session):
    """
    Submissions are strictly isolated by owner_user_id. Another user cannot view,
    retrieve, or evaluate another learner's submission.
    """
    # User 1 submits
    payload = {
        "project_id": "proj-isolated-01",
        "github_repo_url": "https://github.com/user1/private-repo",
        "summary_notes": "Confidential submission notes",
    }
    res1 = client.post("/api/v1/learning/projects/submit", json=payload)
    assert res1.status_code == 200

    # User 1 can view it
    res_get_u1 = client.get("/api/v1/learning/projects/submissions/proj-isolated-01")
    assert res_get_u1.status_code == 200
    assert res_get_u1.json()["github_repo_url"] == "https://github.com/user1/private-repo"

    # Switch identity to User 2
    app.dependency_overrides[get_current_user] = lambda: user_2

    # User 2 list: should NOT see User 1's submission
    res_list_u2 = client.get("/api/v1/learning/projects/submissions")
    assert res_list_u2.status_code == 200
    assert len(res_list_u2.json()) == 0

    # User 2 single get: should receive 404 Not Found
    res_get_u2 = client.get("/api/v1/learning/projects/submissions/proj-isolated-01")
    assert res_get_u2.status_code == 404

    # User 2 cannot evaluate User 1's submission
    res_eval_u2 = client.post(
        "/api/v1/learning/projects/proj-isolated-01/evaluate",
        json={"score": 90.0, "feedback": "Attempted cross-user grade"},
    )
    assert res_eval_u2.status_code == 404


def test_invalid_submission_payload_fails_cleanly(client, test_db_session):
    """
    Invalid payloads (e.g. non-URL strings, invalid schemes) fail with HTTP 422
    and do not create ghost rows in the database.
    """
    # Bad URL scheme
    bad_url_payload = {
        "project_id": "proj-bad-url",
        "github_repo_url": "ftp://malicious.site/script",
        "summary_notes": "Invalid scheme",
    }
    res = client.post("/api/v1/learning/projects/submit", json=bad_url_payload)
    assert res.status_code == 422

    # Plain non-URL string
    not_url_payload = {
        "project_id": "proj-bad-url-2",
        "github_repo_url": "not-even-a-url",
    }
    res2 = client.post("/api/v1/learning/projects/submit", json=not_url_payload)
    assert res2.status_code == 422

    # Empty project_id
    empty_id_payload = {
        "project_id": "",
        "github_repo_url": "https://github.com/valid/repo",
    }
    res3 = client.post("/api/v1/learning/projects/submit", json=empty_id_payload)
    assert res3.status_code == 422

    # Confirm zero database records created
    assert test_db_session.query(LearningProjectSubmission).count() == 0


def test_legitimate_server_evaluation_updates_mastery(client, test_db_session):
    """
    When a genuine server evaluation occurs via POST /projects/{project_id}/evaluate,
    status becomes 'evaluated', the numerical score is recorded, project_signal is updated,
    and associated roadmap step mastery is properly calculated.
    """
    owner_uuid = uuid.UUID(USER_1_ID)
    roadmap = LearningRoadmap(
        owner_user_id=owner_uuid,
        path_id="roadmap-data-prep",
        domain_id="domain-data-preprocessing",
        domain_title="Data Preprocessing",
        current_mastery=60.0,
        target_mastery=80.0,
        completed_steps=0,
        total_steps=1,
    )
    test_db_session.add(roadmap)
    test_db_session.flush()

    step = LearningStep(
        roadmap_id=roadmap.id,
        step_id="step-outlier-eval",
        module_id="mod-01",
        topic_id="topic-outliers",
        title="Outlier Treatment Pipeline",
        learning_objective="Implement robust outlier winsorization.",
        recommendation_reason="Targets diagnosed data prep gap.",
        sequence_order=1,
        status="available",
        current_mastery=60.0,
        target_mastery=80.0,
        project_id="proj-eval-test",
    )
    test_db_session.add(step)
    test_db_session.commit()

    # 1. Submit project first (unevaluated)
    client.post("/api/v1/learning/projects/submit", json={
        "project_id": "proj-eval-test",
        "github_repo_url": "https://github.com/learner/robust-pipeline",
        "summary_notes": "Implemented PercentileCapper with scikit-learn compatibility.",
        "roadmap_id": str(roadmap.id),
        "step_id": "step-outlier-eval",
    })

    # 2. Legitimate server evaluation occurs with score 92.0%
    eval_res = client.post("/api/v1/learning/projects/proj-eval-test/evaluate", json={
        "score": 92.0,
        "feedback": "Outstanding test coverage (98%) and robust Scikit-Learn transformer API.",
        "rubric_scores": [
            {"criterion": "Architecture Rigor", "score": 95, "feedback": "Well-designed transformer."},
            {"criterion": "Test Coverage", "score": 90, "feedback": "Pytest verified all edge cases."},
        ],
    })
    assert eval_res.status_code == 200
    eval_data = eval_res.json()

    assert eval_data["status"] == "evaluated"
    assert eval_data["score"] == 92.0
    assert eval_data["passed"] is True
    assert eval_data["step_updated"] is True

    # 3. Verify database state
    sub = test_db_session.query(LearningProjectSubmission).filter(
        LearningProjectSubmission.project_id == "proj-eval-test"
    ).first()
    assert sub.status == "evaluated"
    assert sub.score == 92.0
    assert sub.passed is True

    # 4. Scored attempt created
    attempt = test_db_session.query(LearningAttempt).filter(
        LearningAttempt.activity_id == "proj-eval-test"
    ).first()
    assert attempt is not None
    assert attempt.score == 92.0
    assert attempt.signals["project_signal"] == 92.0

    # 5. Mastery snapshot created with genuine project signal
    snapshot = test_db_session.query(LearningMasterySnapshot).filter(
        LearningMasterySnapshot.owner_user_id == owner_uuid
    ).order_by(LearningMasterySnapshot.recorded_at.desc()).first()
    assert snapshot is not None
    assert snapshot.project_signal == 92.0

    # 6. Step mastery updated and marked completed if threshold reached
    test_db_session.refresh(step)
    test_db_session.refresh(roadmap)
    # Mastery formula: 0.30*60 + 0.25*60 + 0.20*60 + 0.25*92 = 18 + 15 + 12 + 23 = 68.0
    assert step.current_mastery == 68.0
    assert step.status == "in_progress" # 68.0 < 80.0 target


def test_regular_quiz_assessments_remain_unaffected(client, test_db_session):
    """
    Submitting an ordinary quiz or assessment attempt via /api/v1/learning/attempts
    continues to function deterministically with zero regressions.
    """
    payload = {
        "step_id": "step-quiz-01",
        "attempt_type": "assessment",
        "activity_id": "quiz-data-prep-01",
        "score": 85.0,
    }
    res = client.post("/api/v1/learning/attempts", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["step_id"] == "step-quiz-01"
    assert data["score"] == 85.0
    assert data["passed"] is True
    assert data["computed_mastery"] > 0

    # Attempt persisted
    attempts = test_db_session.query(LearningAttempt).filter(
        LearningAttempt.step_id == "step-quiz-01"
    ).all()
    assert len(attempts) == 1
    assert attempts[0].score == 85.0


def test_career_intelligence_ignores_unevaluated_projects(client, test_db_session):
    """
    Pending mini-projects do not create competency mappings or phantom verified skills
    in Career Intelligence.
    """
    from backend.app.models.taxonomy import EvidenceCompetencyMapping
    from backend.app.career.orchestrator import JobSearchOrchestrator

    # 1. Submit unevaluated project
    res = client.post("/api/v1/learning/projects/submit", json={
        "project_id": "proj-career-test",
        "github_repo_url": "https://github.com/learner/unreviewed-repo",
        "summary_notes": "Pending evaluation deliverable.",
    })
    assert res.status_code == 200

    # 2. Invariant: No EvidenceCompetencyMapping rows created
    comp_mappings = test_db_session.query(EvidenceCompetencyMapping).all()
    assert len(comp_mappings) == 0, "Unevaluated project must not inject competency mappings"

    # 3. Career orchestrator extracts 0 skills from user profile
    orchestrator = JobSearchOrchestrator()
    profile_skills = orchestrator.extract_influencing_skills_for_user(test_db_session, uuid.UUID(USER_1_ID))
    assert len(profile_skills) == 0, "Career Intelligence must ignore unevaluated projects"
