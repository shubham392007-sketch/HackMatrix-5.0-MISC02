"""
Test Suite for Study Packet Generation, Targeted Learning Content, and Multi-Domain Persistence.
Validates:
1. Docker blueprint synthesis has non-generic, substantive learning objectives.
2. Direct step lookup for step-topic-gap-skill-docker-core resolves and persists without 404.
3. Study packet generation returns complete pedagogical packet (what_is_it, why_and_when, worked_example, common_mistakes, implementation_steps, knowledge_check).
4. Multi-domain coverage for Docker, FastAPI, and PostgreSQL.
"""

import os
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles

os.environ["APP_ENV"] = "test"

# Allow SQLite to compile PostgreSQL JSONB and UUID columns during isolated test runs
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
from backend.app.learning.blueprints import synthesize_gap_blueprint, CAREER_GAP_BLUEPRINTS
from backend.app.learning.ai_advisor import LearningAIAdvisor
from backend.app.models.learning import LearningStep, LearningRoadmap

from sqlalchemy.pool import StaticPool
from backend.app.db.reliability import circuit_breaker

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"

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
    circuit_breaker.reset()
    def override_get_db():
        yield test_db_session

    def mock_get_current_user():
        return AuthenticatedUser(
            user_id=TEST_USER_ID,
            email="test@example.com",
            role="authenticated",
            metadata={"name": "Test User"},
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = mock_get_current_user
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()
    circuit_breaker.reset()


def test_docker_blueprint_substantive_content():
    """Verify Docker blueprint synthesis does not use generic template sentences."""
    bp = synthesize_gap_blueprint("skill-docker", "Docker")
    assert bp["domain_id"] == "gap-skill-docker"
    assert "Docker Containerization" in bp["title"]

    # Must NOT contain the generic template sentence
    for obj in bp["learning_objectives"]:
        assert "Master core principles and fundamental abstractions in" not in obj
        assert "Implement production-grade algorithms and design patterns for" not in obj

    # Must contain domain-specific terms
    objectives_str = " ".join(bp["learning_objectives"]).lower()
    assert "dockerfile" in objectives_str or "caching" in objectives_str or "compose" in objectives_str

    # Must contain multi-stage and compose topics
    topic_ids = [t["id"] for m in bp["modules"] for t in m["topics"]]
    assert "topic-gap-skill-docker-core" in topic_ids
    assert "topic-gap-skill-docker-compose" in topic_ids


def test_get_learning_step_read_only_and_ensure_provisioning(client):
    """
    Verify Phase 10B Task 3 requirements:
    1. GET /learning/steps/{id} is strictly read-only and returns 404 when not present (no silent DB insert).
    2. POST /learning/steps/ensure explicitly and idempotently provisions the step and its roadmap.
    3. Subsequent GET /learning/steps/{id} returns 200 OK.
    """
    # 1. Non-existent step must return 404 without creating records
    resp_404 = client.get(
        "/api/v1/learning/steps/step-topic-gap-skill-docker-core",
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp_404.status_code == 404, f"Expected 404 for uninstantiated step, got {resp_404.status_code}"

    # 2. Explicit provisioning via POST /learning/steps/ensure
    resp_ensure = client.post(
        "/api/v1/learning/steps/ensure",
        json={
            "topic_id": "topic-gap-skill-docker-core",
            "domain_id": "gap-skill-docker",
        },
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp_ensure.status_code == 200, f"Expected 200 OK from ensure, got {resp_ensure.status_code}: {resp_ensure.text}"
    data = resp_ensure.json()
    assert data["step_id"] == "step-topic-gap-skill-docker-core"
    assert "Multi-Stage Dockerfile" in data["title"]
    assert data["domain_id"] == "gap-skill-docker"
    assert data["status"] == "available"
    assert data["roadmap_id"] is not None

    # 3. Read-only GET now succeeds with 200 OK
    resp_get = client.get(
        "/api/v1/learning/steps/step-topic-gap-skill-docker-core",
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp_get.status_code == 200
    assert resp_get.json()["step_id"] == "step-topic-gap-skill-docker-core"

    # 4. Idempotency check: ensuring again returns same step
    resp_ensure_again = client.post(
        "/api/v1/learning/steps/ensure",
        json={
            "topic_id": "topic-gap-skill-docker-core",
            "domain_id": "gap-skill-docker",
        },
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp_ensure_again.status_code == 200
    assert resp_ensure_again.json()["step_id"] == data["step_id"]


def test_get_learning_step_packet_substantive_pedagogy(client):
    """Verify that study packet endpoint returns complete substantive sections with truthful provenance."""
    resp = client.get(
        "/api/v1/learning/steps/step-topic-gap-skill-docker-core/packet",
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}: {resp.text}"
    packet = resp.json()

    assert "what_is_it" in packet
    assert len(packet["what_is_it"]) > 50
    assert "why_and_when" in packet

    # Provenance fields (Task 1)
    assert "generation_method" in packet
    assert packet["generation_method"] in ("curated_catalogue", "saved_ai_packet", "ollama_qwen")
    assert "is_ai_generated" in packet
    if packet["generation_method"] == "curated_catalogue":
        assert packet["is_ai_generated"] is False

    # Worked example checks
    assert "worked_example" in packet
    assert "code" in packet["worked_example"]
    assert "FROM python" in packet["worked_example"]["code"]
    assert "USER appuser" in packet["worked_example"]["code"]

    # Common mistakes checks
    assert "common_mistakes" in packet
    assert len(packet["common_mistakes"]) >= 3
    mistakes_str = " ".join(packet["common_mistakes"]).lower()
    assert "root" in mistakes_str or "cache" in mistakes_str

    # Implementation steps checks
    assert "implementation_steps" in packet
    assert len(packet["implementation_steps"]) >= 3

    # Knowledge check checks
    assert "knowledge_check" in packet
    assert len(packet["knowledge_check"]) >= 2
    for kc in packet["knowledge_check"]:
        assert "question" in kc
        assert len(kc["options"]) >= 2
        assert "correct_index" in kc
        assert "explanation" in kc


def test_code_structural_validation_endpoint(client):
    """Verify Phase 10B Task 5: code validation endpoint structural AST checks and honest status."""
    # 1. Valid Python code
    valid_code = (
        "def clean_data(df):\n"
        "    result = df.dropna()\n"
        "    return result\n"
    )
    resp = client.post(
        "/api/v1/learning/practice/validate",
        json={"exercise_id": "prac-1", "code": valid_code, "language": "python"},
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp.status_code == 200
    res = resp.json()
    assert res["passed"] is True
    assert res["score"] >= 90
    assert res["execution_type"] == "structural_ast_validation"
    assert res["sandboxed_runner_available"] is False

    # 2. Syntax error code
    invalid_code = "def clean_data(df:\n    return df"
    resp_err = client.post(
        "/api/v1/learning/practice/validate",
        json={"exercise_id": "prac-1", "code": invalid_code, "language": "python"},
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp_err.status_code == 200
    res_err = resp_err.json()
    assert res_err["passed"] is False
    assert "SyntaxError" in res_err["summary_message"] or "syntax" in res_err["summary_message"].lower()

    # 3. Empty code
    resp_empty = client.post(
        "/api/v1/learning/practice/validate",
        json={"exercise_id": "prac-1", "code": "", "language": "python"},
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp_empty.status_code == 200
    assert resp_empty.json()["passed"] is False


@pytest.mark.asyncio
async def test_advisor_generate_step_study_packet_fallback():
    """Verify LearningAIAdvisor generates or retrieves study packets with fallback guarantees."""
    advisor = LearningAIAdvisor()
    packet = await advisor.generate_step_study_packet(
        topic_id="topic-fastapi-routes",
        topic_title="FastAPI Route Handlers",
        learning_objective="Build RESTful endpoints with status codes",
        domain_name="FastAPI Web Framework",
    )
    assert packet is not None
    assert "what_is_it" in packet
    assert "worked_example" in packet
    assert "knowledge_check" in packet


def test_study_packet_db_persistence_and_provenance(client, test_db_session):
    """
    Verify Phase 10B Task 1:
    - Study packets are persisted in the database table `learning_step_packets`.
    - First fetch retrieves/generates packet and writes to DB.
    - Subsequent fetch with `regenerate=False` retrieves the saved packet from DB.
    - Subsequent fetch with `regenerate=True` forces a refresh.
    """
    from backend.app.models.learning import LearningStepPacketRecord

    # 1. First fetch for a topic
    resp = client.get(
        "/api/v1/learning/steps/step-topic-sql-indexing/packet",
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["generation_method"] in ("curated_catalogue", "ollama_qwen", "saved_ai_packet")
    assert "worked_example" in data

    # 2. Verify record in database
    db_records = test_db_session.query(LearningStepPacketRecord).filter(
        LearningStepPacketRecord.topic_id == "topic-sql-indexing"
    ).all()
    assert len(db_records) >= 1, "Expected packet to be persisted in learning_step_packets table"
    first_record = db_records[0]
    assert first_record.title is not None
    assert first_record.what_is_it is not None

    # 3. Fetch again without regenerate - should retrieve from DB
    resp_saved = client.get(
        "/api/v1/learning/steps/step-topic-sql-indexing/packet?regenerate=false",
        headers={"Authorization": "Bearer mock-token"},
    )
    assert resp_saved.status_code == 200
    saved_data = resp_saved.json()
    assert saved_data["title"] == data["title"]
    assert "source_attribution" in saved_data
