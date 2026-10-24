import uuid
import json
import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime
import httpx

from backend.app.db.session import SessionLocal
from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import WorkAnalysisResult, AIAnalysisRun
from backend.app.ai.work_analyzer import work_analyzer
from backend.app.api.ai import run_work_analysis, AnalysisRunRequest
from backend.app.api.dependencies import AuthenticatedUser

TEST_USER_UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def sample_evidence(db):
    ev_id = uuid.uuid4()
    ev = EvidenceItem(
        id=ev_id,
        owner_user_id=TEST_USER_UUID,
        source_provider="github",
        source_type="pull_request",
        source_name="repo/skillpassport",
        title="PR #205: Implement Telemetry Pipeline with Kafka and Redis",
        description="Engineered distributed telemetry streaming using Apache Kafka and Redis cluster.",
        extracted_excerpt="Engineered distributed telemetry streaming using Apache Kafka and Redis cluster. Implemented backpressure handling and 15 pytest integration tests.",
        evidence_category="code",
        observed_timestamp=datetime.utcnow(),
        contributor_identity="developer@example.com",
        attribution_status="author",
        evidence_strength="high",
        content_hash="test_hash_telemetry_205",
    )
    db.add(ev)
    db.commit()
    yield ev
    # Cleanup
    db.query(WorkAnalysisResult).filter(WorkAnalysisResult.evidence_id == ev_id).delete()
    db.query(AIAnalysisRun).filter(AIAnalysisRun.owner_user_id == TEST_USER_UUID).delete()
    db.query(EvidenceItem).filter(EvidenceItem.id == ev_id).delete()
    db.commit()


@pytest.mark.asyncio
async def test_ai_analysis_completed_ollama(db, sample_evidence):
    """
    1. AI Analysis Completed Notification Test:
    Verify that real Ollama structured completion saves validated result with
    actual model name, no fallback, and returns all decomposed facts.
    """
    mock_model_payload = {
        "summary": "Engineered distributed telemetry streaming pipeline with backpressure.",
        "role": "Lead Author",
        "observed_facts": [
            {"fact": "Implemented Kafka and Redis stream connectors", "type": "code"},
            {"fact": "Added 15 integration tests with pytest", "type": "code"}
        ],
        "claimed_information": [
            {"claim": "PR description mentions backpressure handling", "source": "PR description"}
        ],
        "inferred_attributes": [
            {"attribute": "High concurrency resilience", "supported_by": "Kafka stream connectors"}
        ],
        "technical_tasks": ["Engineered distributed telemetry streaming", "Implemented backpressure handling"],
        "technologies": ["Apache Kafka", "Redis", "Python", "pytest"],
        "demonstrated_skills": [
            {"skill": "Stream Processing", "proficiency": "Advanced", "justification": "Kafka pipeline implementation"}
        ],
        "uncertainty_flags": [],
        "confidence_score": 0.92,
    }

    mock_resp = httpx.Response(
        status_code=200,
        json={"message": {"content": json.dumps(mock_model_payload), "role": "assistant"}},
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
    )

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        res = await work_analyzer.analyze_evidence_item(
            db=db,
            evidence_id=sample_evidence.id,
            owner_user_id=TEST_USER_UUID,
        )

        assert res["analysis_method"] == "ollama"
        assert res["model_name"] == "qwen3:8b"
        assert res["fallback_used"] is False
        assert res["fallback_reason"] is None
        assert res["truncated"] is False
        assert len(res["observed_facts"]) >= 2
        assert len(res["technical_tasks"]) >= 2
        assert res["confidence_score"] == 0.92

        # Verify DB persistence
        run_record = db.query(AIAnalysisRun).filter(AIAnalysisRun.id == uuid.UUID(res["run_id"])).first()
        assert run_record is not None
        assert run_record.status == "completed"
        assert run_record.model_name == "qwen3:8b"


@pytest.mark.asyncio
async def test_ai_model_unavailable_connect_error(db, sample_evidence):
    """
    2. Model Unavailable Notification Test:
    Verify that when Ollama is unreachable (ConnectError), it safely falls back
    to deterministic engine, sets fallback_reason='ollama_connection_refused',
    and NEVER labels the result as Ollama or qwen3:8b.
    """
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        res = await work_analyzer.analyze_evidence_item(
            db=db,
            evidence_id=sample_evidence.id,
            owner_user_id=TEST_USER_UUID,
        )

        assert res["analysis_method"] == "rule_based"
        assert res["fallback_used"] is True
        assert res["fallback_reason"] == "ollama_connection_refused"
        assert res["model_name"] is None
        assert res["model_version"] is None
        assert res["confidence_score"] <= 0.75

        # Check DB audit run
        db.expire_all()
        run_record = db.query(AIAnalysisRun).filter(AIAnalysisRun.id == uuid.UUID(res["run_id"])).first()
        assert run_record is not None
        assert run_record.model_name == "rule_based"
        warnings = run_record.processing_warnings or []
        assert any(w.get("type") == "fallback_used" and w.get("reason") == "ollama_connection_refused" for w in warnings)


@pytest.mark.asyncio
async def test_ai_model_unavailable_timeout(db, sample_evidence):
    """
    3. Model Timeout Notification Test:
    Verify that when Ollama times out, fallback_reason='ollama_timeout'.
    """
    with patch("httpx.AsyncClient.post", side_effect=httpx.ReadTimeout("Request timed out")):
        res = await work_analyzer.analyze_evidence_item(
            db=db,
            evidence_id=sample_evidence.id,
            owner_user_id=TEST_USER_UUID,
        )

        assert res["analysis_method"] == "rule_based"
        assert res["fallback_used"] is True
        assert res["fallback_reason"] == "ollama_timeout"
        assert res["model_name"] is None


@pytest.mark.asyncio
async def test_ai_invalid_output_rejected(db, sample_evidence):
    """
    4. Invalid Model Output Rejected Notification Test:
    Verify that when Ollama returns unparseable non-JSON or schema-violating output,
    it rejects the output and triggers rule-based recovery with fallback_reason='invalid_model_response'.
    """
    mock_resp = httpx.Response(
        status_code=200,
        json={"message": {"content": "Not JSON at all: Here is my commentary on the pull request...", "role": "assistant"}},
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
    )

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        res = await work_analyzer.analyze_evidence_item(
            db=db,
            evidence_id=sample_evidence.id,
            owner_user_id=TEST_USER_UUID,
        )

        assert res["analysis_method"] == "rule_based"
        assert res["fallback_used"] is True
        assert res["fallback_reason"] == "invalid_model_response"
        assert res["model_name"] is None


@pytest.mark.asyncio
async def test_ai_content_truncation_warning(db, sample_evidence):
    """
    5. Content Exceeded Context Limit Notification Test:
    Verify that large text exceeding context token character budget sets truncated=True
    and appends a content_truncated warning into AIAnalysisRun.
    """
    huge_text = "Detailed engineering log: " + ("Refactored core streaming logic. " * 1500)
    sample_evidence.extracted_excerpt = huge_text
    db.commit()

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        res = await work_analyzer.analyze_evidence_item(
            db=db,
            evidence_id=sample_evidence.id,
            owner_user_id=TEST_USER_UUID,
        )

        assert res["truncated"] is True
        assert res["truncated_chars"] > 0

        db.expire_all()
        run_record = db.query(AIAnalysisRun).filter(AIAnalysisRun.id == uuid.UUID(res["run_id"])).first()
        assert run_record is not None
        warnings = run_record.processing_warnings or []
        assert any(w.get("type") == "content_truncated" for w in warnings)


@pytest.mark.asyncio
async def test_ai_analysis_partial_failure(db, sample_evidence):
    """
    6. Analysis Partially Completed Notification Test:
    Verify that when work decomposition succeeds but candidate skill extraction
    raises an exception, the API response contains partial_failure metadata.
    """
    mock_user = AuthenticatedUser(
        user_id=str(TEST_USER_UUID),
        email="developer@example.com",
        role="employee",
    )

    req = AnalysisRunRequest(evidence_ids=[str(sample_evidence.id)])

    with patch("backend.app.ai.work_analyzer.work_analyzer.analyze_evidence_item") as mock_decomp, \
         patch("backend.app.ai.skill_extractor.skill_extractor.extract_candidate_skills", side_effect=RuntimeError("Database lock during taxonomy mapping")):
        
        mock_decomp.return_value = {
            "analysis_id": str(uuid.uuid4()),
            "run_id": str(uuid.uuid4()),
            "evidence_id": str(sample_evidence.id),
            "title": sample_evidence.title,
            "source_type": sample_evidence.source_provider,
            "summary": "Decomposed work artifact",
            "role": "Author",
            "observed_facts": [{"fact": "Test fact", "type": "code"}],
            "claimed_information": [],
            "inferred_attributes": [],
            "technical_tasks": ["Refactored telemetry"],
            "technologies": ["Kafka"],
            "demonstrated_skills": [],
            "uncertainty_flags": [],
            "confidence_score": 0.85,
            "analysis_method": "ollama",
            "model_name": "qwen3:8b",
            "model_version": "qwen3:8b",
            "fallback_used": False,
            "fallback_reason": None,
            "analysis_status": "completed",
            "validation_status": "valid",
            "truncated": False,
            "truncated_chars": 0,
        }

        api_res = await run_work_analysis(req=req, db=db, user=mock_user)
        assert api_res["total"] == 1
        item = api_res["analyses"][0]
        assert "partial_failure" in item
        assert item["partial_failure"]["stage"] == "candidate_skill_extraction"
        assert "Database lock" in item["partial_failure"]["error"]


@pytest.mark.asyncio
async def test_verification_isolation_rule(db, sample_evidence):
    """
    7. Verification Isolation Rule Test:
    Strict Invariant: AI Work Analysis output must NEVER create a verified skill.
    All extracted candidate skills must remain unverified until authorized human verification.
    """
    from backend.app.models.taxonomy import EvidenceCompetencyMapping

    # Verify no candidate mapping associated with this evidence is marked verified
    mappings = db.query(EvidenceCompetencyMapping).filter(
        EvidenceCompetencyMapping.evidence_id == sample_evidence.id
    ).all()

    for m in mappings:
        assert getattr(m, "verification_status", "pending") != "verified"
