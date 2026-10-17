import uuid
import json
import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime
import httpx
from fastapi import Response

from backend.app.db.session import SessionLocal
from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import WorkAnalysisResult, AIAnalysisRun
from backend.app.ai.work_analyzer import work_analyzer, WorkAnalysisOutput
from backend.app.api.health import readiness, ai_diagnostic

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
        title="PR #101: Refactor PostgreSQL connection pooling with SQLAlchemy",
        description="Refactored SQL queries and implemented connection pool using SQLAlchemy with 30s timeout.",
        extracted_excerpt="Refactored SQL queries, added Redis cache for session storage, and implemented unit tests using pytest.",
        evidence_category="code",
        observed_timestamp=datetime.utcnow(),
        contributor_identity="developer@example.com",
        attribution_status="author",
        evidence_strength="high",
        content_hash="test_hash_pool_101",
    )
    db.add(ev)
    db.commit()
    yield ev
    # Teardown
    db.query(WorkAnalysisResult).filter(WorkAnalysisResult.evidence_id == ev_id).delete()
    db.query(AIAnalysisRun).filter(AIAnalysisRun.owner_user_id == TEST_USER_UUID).delete()
    db.query(EvidenceItem).filter(EvidenceItem.id == ev_id).delete()
    db.commit()


@pytest.mark.asyncio
async def test_ollama_connection_refused(db, sample_evidence):
    """Verify that when Ollama connection is refused, it falls back to rule-based engine with exact diagnostics."""
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
        assert res["validation_status"] == "valid"

        # Check DB persistence
        persisted = db.query(WorkAnalysisResult).filter(WorkAnalysisResult.id == uuid.UUID(res["analysis_id"])).first()
        assert persisted is not None
        assert persisted.analysis_method == "rule_based"
        assert persisted.fallback_used is True
        assert persisted.fallback_reason == "ollama_connection_refused"
        assert persisted.model_name is None


@pytest.mark.asyncio
async def test_ollama_request_timeout(db, sample_evidence):
    """Verify that when Ollama times out (empty ReadTimeout args), exception is safely formatted and logged."""
    # httpx.ReadTimeout with empty message replicates str(e) == ""
    timeout_err = httpx.ReadTimeout("")
    with patch("httpx.AsyncClient.post", side_effect=timeout_err):
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
async def test_ollama_http_error(db, sample_evidence):
    """Verify handling of HTTP 500 error from Ollama."""
    mock_resp = httpx.Response(
        status_code=500,
        text="Internal Server Error: model failed to load",
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
        assert res["fallback_reason"] == "ollama_http_500"


@pytest.mark.asyncio
async def test_ollama_empty_response(db, sample_evidence):
    """Verify handling of empty model response."""
    mock_resp = httpx.Response(
        status_code=200,
        json={"message": {"content": "", "role": "assistant"}},
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


@pytest.mark.asyncio
async def test_ollama_malformed_json(db, sample_evidence):
    """Verify handling of malformed non-JSON output from Ollama."""
    mock_resp = httpx.Response(
        status_code=200,
        json={"message": {"content": "This is plain text with no JSON { broken:", "role": "assistant"}},
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


@pytest.mark.asyncio
async def test_pydantic_schema_validation_failure(db, sample_evidence):
    """Verify that if model output violates Pydantic schema, fallback is triggered cleanly."""
    mock_resp = httpx.Response(
        status_code=200,
        json={
            "message": {
                "content": json.dumps({"role": "Author"}),  # missing summary, observed_facts, etc.
                "role": "assistant",
            }
        },
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


@pytest.mark.asyncio
async def test_rule_based_fallback_trust_rules(db, sample_evidence):
    """Verify rule-based fallback never fabricates tasks and includes honest uncertainty flags."""
    res = work_analyzer._rule_based_work_analysis(sample_evidence, sample_evidence.extracted_excerpt)

    assert "PostgreSQL" in res["technologies"] or "Redis" in res["technologies"]
    # Verify tasks come directly from action verbs
    for task in res["technical_tasks"]:
        assert any(w in task.lower() for w in ["refactored", "added", "implemented"])
    # Verify uncertainty flag explicitly identifies fallback
    flag_areas = [u["area"] for u in res["uncertainty_flags"]]
    assert "Analysis Method" in flag_areas
    assert res["confidence_score"] <= 0.70


@pytest.mark.asyncio
async def test_insufficient_evidence_handling(db):
    """Verify that empty or minimal text directly yields insufficient_evidence without fake tasks."""
    sparse_ev = EvidenceItem(
        id=uuid.uuid4(),
        owner_user_id=TEST_USER_UUID,
        source_provider="document",
        source_type="file",
        source_name="empty.txt",
        title="Empty Document",
        description="",
        extracted_excerpt="   ",
        evidence_category="document",
        observed_timestamp=datetime.utcnow(),
        contributor_identity="user",
        attribution_status="recipient",
        evidence_strength="insufficient",
        content_hash="empty_hash",
    )
    db.add(sparse_ev)
    db.commit()

    try:
        res = await work_analyzer.analyze_evidence_item(
            db=db,
            evidence_id=sparse_ev.id,
            owner_user_id=TEST_USER_UUID,
        )

        assert res["analysis_status"] == "insufficient_evidence"
        assert len(res["technical_tasks"]) == 0
        assert len(res["technologies"]) == 0
        assert res["confidence_score"] <= 0.25
    finally:
        db.query(WorkAnalysisResult).filter(WorkAnalysisResult.evidence_id == sparse_ev.id).delete()
        db.query(AIAnalysisRun).filter(AIAnalysisRun.owner_user_id == TEST_USER_UUID).delete()
        db.delete(sparse_ev)
        db.commit()


@pytest.mark.asyncio
async def test_readiness_probe_dependency_states():
    """Verify readiness endpoint distinguishes Ollama connectivity and model states."""
    resp_obj = Response()

    # 1. State: reachable_and_model_available
    with patch("httpx.AsyncClient.get", return_value=httpx.Response(200, json={"models": [{"name": "qwen3:8b"}]})), \
         patch("backend.app.api.health.check_database_connection", return_value={"connected": True}):
        res = await readiness(resp_obj)
        assert res["services"]["ollama"]["state"] == "reachable_and_model_available"
        assert res["services"]["ollama"]["connected"] is True
        assert res["services"]["ollama"]["model_available"] is True

    # 2. State: reachable_model_missing
    with patch("httpx.AsyncClient.get", return_value=httpx.Response(200, json={"models": [{"name": "other-model"}]})), \
         patch("backend.app.api.health.check_database_connection", return_value={"connected": True}):
        res = await readiness(resp_obj)
        assert res["services"]["ollama"]["state"] == "reachable_model_missing"
        assert res["services"]["ollama"]["model_available"] is False
        assert res["status"] == "degraded"

    # 3. State: connection_refused
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("refused")), \
         patch("backend.app.api.health.check_database_connection", return_value={"connected": True}):
        res = await readiness(resp_obj)
        assert res["services"]["ollama"]["state"] == "connection_refused"
        assert res["services"]["ollama"]["connected"] is False

    # 4. State: timeout
    with patch("httpx.AsyncClient.get", side_effect=httpx.ReadTimeout("timeout")), \
         patch("backend.app.api.health.check_database_connection", return_value={"connected": True}):
        res = await readiness(resp_obj)
        assert res["services"]["ollama"]["state"] == "timeout"
        assert res["services"]["ollama"]["connected"] is False


@pytest.mark.asyncio
async def test_live_ollama_qwen_inference(db, sample_evidence):
    """
    Integration test against actual running Ollama service.
    Verifies that with think: False and appropriate timeout,
    qwen3:8b completes structured work analysis without timing out.
    """
    # Check if live Ollama is accessible
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            tag_res = await client.get(f"{work_analyzer.ollama_url}/api/tags")
            if tag_res.status_code != 200:
                pytest.skip("Local Ollama service not responding with 200")
            models = [m.get("name", "") for m in tag_res.json().get("models", [])]
            if not any(work_analyzer.model in m for m in models):
                pytest.skip(f"Configured model {work_analyzer.model} not installed in local Ollama")
    except Exception:
        pytest.skip("Local Ollama not reachable")

    # Run live analysis through WorkAnalyzerService
    res = await work_analyzer.analyze_evidence_item(
        db=db,
        evidence_id=sample_evidence.id,
        owner_user_id=TEST_USER_UUID,
    )

    # Assertions on live Qwen3 8B output
    assert res["analysis_method"] == "ollama", f"Expected ollama method, got {res['analysis_method']}"
    assert res["model_name"] == work_analyzer.model
    assert res["fallback_used"] is False
    assert res["fallback_reason"] is None
    assert len(res["observed_facts"]) > 0
    assert len(res["technical_tasks"]) > 0
    assert res["confidence_score"] >= 0.70
    assert res["validation_status"] == "valid"
