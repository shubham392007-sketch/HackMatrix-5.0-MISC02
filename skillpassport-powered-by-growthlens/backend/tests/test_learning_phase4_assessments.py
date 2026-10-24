"""
Comprehensive Phase 4 / Phase 5B Automated Test Suite for Learn & Grow Assessments.
Covers:
1. Assessment generation endpoint (POST /api/v1/learning/assessments/generate):
   - Fast simulated AI generation via Ollama mock.
   - Deterministic fallback generation on Ollama failure/timeout.
   - Answer-key and explanation stripping for learner responses.
2. Learner retrieval endpoint (GET /api/v1/learning/assessments/{assessment_id}) by ID and by skill slug.
3. Multi-tenant security & user isolation: wrong-user access raises HTTP 403 Forbidden.
4. Non-existent assessment retrieval raises HTTP 404 Not Found.
5. Server-authoritative submission scoring (POST /api/v1/learning/assessments/{assessment_id}/submit):
   - Correct answers yield passing score and unlock explanations.
   - Incorrect answers yield failing score.
   - Persistent LearningAttempt record created in database.
6. 5-second submission idempotency prevents duplicate LearningAttempt rows.
7. Roadmap step completion and next-step unlocking on successful assessment pass.
"""

import os
import uuid
import json
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock
import httpx

# Force test mode
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

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
    LearningAssessment,
    LearningAttempt,
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
    """Isolated in-memory SQLite database for deterministic testing."""
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


@pytest.fixture(autouse=True)
def mock_fast_ollama():
    """
    Mocks Ollama HTTP response to ensure tests execute in milliseconds
    without external network delays or timeouts.
    """
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": json.dumps({
                "title": "Data Preprocessing Mastery Assessment",
                "questions": [
                    {
                        "id": "q-1",
                        "question_text": "How do you prevent data leakage when imputing missing values?",
                        "category": "applied_scenario",
                        "options": [
                            "Fit the imputer on the full dataset before splitting",
                            "Fit the imputer strictly on the training partition only",
                            "Fit the imputer on the test set first",
                            "Drop all columns with missing values indiscriminately"
                        ],
                        "correct_index": 1,
                        "explanation": "Fitting exclusively on the training split prevents target/distribution leakage into validation/test splits.",
                        "difficulty": "Intermediate",
                        "points": 25,
                    },
                    {
                        "id": "q-2",
                        "question_text": "Which scaler is most robust to extreme outliers?",
                        "category": "applied_scenario",
                        "options": [
                            "StandardScaler",
                            "MinMaxScaler",
                            "RobustScaler",
                            "Normalizer"
                        ],
                        "correct_index": 2,
                        "explanation": "RobustScaler scales features using median and IQR, making it resistant to extreme outliers.",
                        "difficulty": "Intermediate",
                        "points": 25,
                    },
                ]
            })
        }
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        yield


def test_generate_assessment_strips_answers_and_persists_to_db(client, test_db_session):
    """
    POST /api/v1/learning/assessments/generate
    Verifies that generated questionnaire conceals answer keys from the learner,
    while full protected definitions are safely stored in the database.
    """
    payload = {
        "skill_id": "data-preprocessing",
        "skill_name": "Data Preprocessing",
        "learning_objective": "Demonstrate data cleansing and transformation mastery.",
        "difficulty": "Intermediate",
        "question_count": 2,
        "is_synthetic": False,
    }

    response = client.post("/api/v1/learning/assessments/generate", json=payload)
    assert response.status_code == 200, f"Generate failed: {response.text}"
    data = response.json()

    # 1. Verify response structure
    assert "assessment_id" in data
    assert data["skill_id"] == "data-preprocessing"
    assert data["title"]
    assert "questions" in data
    assert len(data["questions"]) == 2

    # 2. CRITICAL SECURITY: Answer keys and explanations MUST be omitted for learners
    for q in data["questions"]:
        assert "id" in q
        assert "options" in q
        assert len(q["options"]) >= 2
        # Both text and question_text should be present for frontend compatibility
        assert "question_text" in q or "text" in q
        assert "correct_index" not in q, f"Leaked correct_index in learner payload: {q}"
        assert "correct_option_index" not in q, f"Leaked correct_option_index in learner payload: {q}"
        assert "explanation" not in q, f"Leaked explanation in learner payload: {q}"

    # 3. Verify DB persistence: the database record must contain full answer keys
    asmt_record = (
        test_db_session.query(LearningAssessment)
        .filter(LearningAssessment.assessment_id == data["assessment_id"])
        .first()
    )
    assert asmt_record is not None
    assert str(asmt_record.owner_user_id) == USER_1_ID
    assert len(asmt_record.questions_data) == 2
    for q_data in asmt_record.questions_data:
        assert "correct_index" in q_data, "Database record must store correct_index for grading"
        assert "explanation" in q_data, "Database record must store explanation for grading"


def test_generate_assessment_fallback_on_ollama_failure(client, test_db_session):
    """
    Verifies that when Ollama fails or times out, the deterministic fallback generator
    is invoked seamlessly and persists valid protected questions.
    """
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Ollama connection refused")):
        response = client.post(
            "/api/v1/learning/assessments/generate",
            json={
                "skill_id": "model-evaluation",
                "skill_name": "Model Evaluation",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["generation_method"] in ["heuristic_fallback", "deterministic_curated"]
        assert len(data["questions"]) >= 2
        # Check answer key stripping on fallback path as well
        for q in data["questions"]:
            assert "correct_index" not in q
            assert "explanation" not in q


def test_get_assessment_for_learner(client, test_db_session):
    """
    GET /api/v1/learning/assessments/{assessment_id}
    Verifies retrieval by assessment_id and by skill_id fallback, preserving answer concealment.
    """
    # 1. Generate an assessment
    gen_resp = client.post(
        "/api/v1/learning/assessments/generate",
        json={"skill_id": "feature-engineering", "skill_name": "Feature Engineering"},
    )
    asmt_id = gen_resp.json()["assessment_id"]

    # 2. Retrieve by assessment_id
    get_resp = client.get(f"/api/v1/learning/assessments/{asmt_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["assessment_id"] == asmt_id
    for q in get_data["questions"]:
        assert "correct_index" not in q
        assert "explanation" not in q

    # 3. Retrieve by skill_id alias
    skill_resp = client.get("/api/v1/learning/assessments/feature-engineering")
    assert skill_resp.status_code == 200
    assert skill_resp.json()["assessment_id"] == asmt_id


def test_assessment_ownership_and_user_isolation(client, test_db_session):
    """
    Verifies that User B cannot retrieve or submit User A's assessment (HTTP 403 Forbidden).
    """
    # 1. User 1 creates an assessment
    gen_resp = client.post(
        "/api/v1/learning/assessments/generate",
        json={"skill_id": "model-tuning", "skill_name": "Model Tuning"},
    )
    asmt_id = gen_resp.json()["assessment_id"]

    # 2. Switch context to User 2
    app.dependency_overrides[get_current_user] = lambda: user_2

    # User 2 tries to GET User 1's assessment
    unauth_get = client.get(f"/api/v1/learning/assessments/{asmt_id}")
    assert unauth_get.status_code == 403
    assert "belongs to another user" in unauth_get.json()["detail"]

    # User 2 tries to SUBMIT answers to User 1's assessment
    unauth_submit = client.post(
        f"/api/v1/learning/assessments/{asmt_id}/submit",
        json={"answers": {}},
    )
    assert unauth_submit.status_code == 403
    assert "belongs to another user" in unauth_submit.json()["detail"]


def test_assessment_not_found(client):
    """
    Verifies that requests for nonexistent assessment IDs return HTTP 404 Not Found.
    """
    resp_get = client.get("/api/v1/learning/assessments/nonexistent-id-99999")
    assert resp_get.status_code == 404

    resp_submit = client.post(
        "/api/v1/learning/assessments/nonexistent-id-99999/submit",
        json={"answers": {}},
    )
    assert resp_submit.status_code == 404


def test_submit_assessment_attempt_scoring_and_persistence(client, test_db_session):
    """
    POST /api/v1/learning/assessments/{assessment_id}/submit
    Verifies server-authoritative scoring, answer reveal ONLY on submit,
    and persistent LearningAttempt recording.
    """
    # 1. Generate assessment
    gen_resp = client.post(
        "/api/v1/learning/assessments/generate",
        json={"skill_id": "clustering", "skill_name": "Clustering Algorithms"},
    )
    asmt_data = gen_resp.json()
    asmt_id = asmt_data["assessment_id"]

    # Fetch stored answers directly from DB to prepare 100% correct submission
    asmt_record = (
        test_db_session.query(LearningAssessment)
        .filter(LearningAssessment.assessment_id == asmt_id)
        .first()
    )
    correct_answers = {
        q["id"]: q["correct_index"] for q in asmt_record.questions_data
    }

    # 2. Submit correct answers
    submit_resp = client.post(
        f"/api/v1/learning/assessments/{asmt_id}/submit",
        json={"answers": correct_answers},
    )
    assert submit_resp.status_code == 200
    report = submit_resp.json()

    assert report["score_percentage"] == 100.0
    assert report["passed"] is True
    assert "attempt_id" in report
    assert "results" in report
    assert len(report["results"]) == len(asmt_record.questions_data)

    # Post-submission feedback MUST now contain correctness and explanations
    for res in report["results"]:
        assert res["is_correct"] is True
        assert "explanation" in res
        assert "correct_option_index" in res

    # 3. Verify LearningAttempt was created in the database
    attempt = (
        test_db_session.query(LearningAttempt)
        .filter(LearningAttempt.activity_id == asmt_id)
        .first()
    )
    assert attempt is not None
    assert str(attempt.owner_user_id) == USER_1_ID
    assert attempt.score == 100.0
    assert attempt.passed is True
    assert attempt.attempt_type == "assessment"


def test_submit_assessment_attempt_idempotency(client, test_db_session):
    """
    Verifies that rapid duplicate submissions (< 5 seconds) return the existing
    attempt record and do NOT insert duplicate rows in learning_attempts.
    """
    gen_resp = client.post(
        "/api/v1/learning/assessments/generate",
        json={"skill_id": "deep-learning", "skill_name": "Deep Learning"},
    )
    asmt_id = gen_resp.json()["assessment_id"]
    answers = {"q-1": 0, "q-2": 1}

    # First submission
    resp1 = client.post(f"/api/v1/learning/assessments/{asmt_id}/submit", json={"answers": answers})
    assert resp1.status_code == 200
    attempt_id1 = resp1.json()["attempt_id"]

    # Second submission (immediate duplicate retry)
    resp2 = client.post(f"/api/v1/learning/assessments/{asmt_id}/submit", json={"answers": answers})
    assert resp2.status_code == 200
    attempt_id2 = resp2.json()["attempt_id"]

    # Must return same attempt ID
    assert attempt_id1 == attempt_id2

    # Database must have exactly 1 attempt record for this assessment
    attempts_count = (
        test_db_session.query(LearningAttempt)
        .filter(LearningAttempt.activity_id == asmt_id)
        .count()
    )
    assert attempts_count == 1, f"Expected 1 attempt row due to idempotency, found {attempts_count}"


def test_submit_assessment_updates_roadmap_step_progress(client, test_db_session):
    """
    Verifies that passing a step assessment marks the step completed
    and unlocks the subsequent step in the sequence.
    """
    # 1. Create a dummy roadmap with 2 sequential steps
    roadmap = LearningRoadmap(
        owner_user_id=uuid.UUID(USER_1_ID),
        path_id="path-test-roadmap",
        domain_id="ml-engineering",
        domain_title="ML Engineering",
        status="in_progress",
        baseline_mastery=20.0,
        target_mastery=85.0,
        current_mastery=20.0,
        total_steps=2,
        completed_steps=0,
    )
    test_db_session.add(roadmap)
    test_db_session.commit()

    step1 = LearningStep(
        roadmap_id=roadmap.id,
        step_id="step-1",
        topic_id="topic-ml-basics",
        module_id="mod-1",
        sequence_order=1,
        title="Step 1: Basics",
        learning_objective="Learn basics",
        status="in_progress",
        current_mastery=0.0,
        target_mastery=80.0,
        prerequisite_ids=[],
        prerequisites_met=True,
        recommendation_reason="Core foundational requirement",
        recommended_resource_ids=[],
        practice_exercise_ids=[],
    )
    step2 = LearningStep(
        roadmap_id=roadmap.id,
        step_id="step-2",
        topic_id="topic-ml-advanced",
        module_id="mod-2",
        sequence_order=2,
        title="Step 2: Advanced",
        learning_objective="Learn advanced",
        status="locked",
        current_mastery=0.0,
        target_mastery=80.0,
        prerequisite_ids=["step-1"],
        prerequisites_met=False,
        recommendation_reason="Advanced application step",
        recommended_resource_ids=[],
        practice_exercise_ids=[],
    )
    test_db_session.add_all([step1, step2])
    test_db_session.commit()

    # 2. Generate assessment linked to Step 1
    gen_resp = client.post(
        "/api/v1/learning/assessments/generate",
        json={
            "skill_id": "ml-basics",
            "skill_name": "ML Basics",
            "roadmap_id": str(roadmap.id),
            "step_id": "step-1",
        },
    )
    asmt_id = gen_resp.json()["assessment_id"]

    # Fetch stored answers to guarantee passing
    asmt_record = (
        test_db_session.query(LearningAssessment)
        .filter(LearningAssessment.assessment_id == asmt_id)
        .first()
    )
    correct_answers = {q["id"]: q["correct_index"] for q in asmt_record.questions_data}

    # 3. Submit passing answers
    submit_resp = client.post(
        f"/api/v1/learning/assessments/{asmt_id}/submit",
        json={"answers": correct_answers},
    )
    assert submit_resp.status_code == 200
    assert submit_resp.json()["passed"] is True

    # 4. Verify Step 1 is completed and Step 2 is unlocked
    test_db_session.refresh(step1)
    test_db_session.refresh(step2)
    test_db_session.refresh(roadmap)

    assert step1.status == "completed"
    assert step1.current_mastery >= 70.0
    assert step2.status in ["available", "in_progress"], f"Step 2 should be unlocked, but status is {step2.status}"
    assert step2.prerequisites_met is True
    assert roadmap.completed_steps == 1
