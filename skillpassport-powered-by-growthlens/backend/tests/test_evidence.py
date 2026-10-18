import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.evidence import EvidenceItem
from backend.app.ai.extractor import ai_extractor
from backend.app.rag.chroma import chroma_store

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer sp_demo_alexchen_valid"}
DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"


def test_ai_extractor_rule_based_fallback():
    sample_text = """
    Engineered a high-throughput event streaming platform using Apache Kafka and PostgreSQL.
    Configured Kubernetes deployments and automated CI/CD pipelines via GitHub Actions.
    Conducted architectural review of REST API endpoints.
    """
    res = ai_extractor._rule_based_extraction(sample_text, "github_pr")
    assert "competencies" in res
    assert len(res["competencies"]) >= 2
    comp_names = [c["name"] for c in res["competencies"]]
    assert "Distributed Systems & Event Streaming" in comp_names
    assert (
        "Relational Data Modeling & PostgreSQL" in comp_names
        or "Database Optimization & Data Engineering" in comp_names
    )


def test_chroma_indexing_and_search():
    item_id = str(uuid.uuid4())
    test_user_id = f"test-user-{uuid.uuid4().hex[:8]}"
    try:
        indexed = chroma_store.index_evidence_item(
            evidence_id=item_id,
            owner_user_id=test_user_id,
            title="Event Driven Kafka Pipeline",
            description="Scalable microservices event broker",
            excerpt="Implemented partitioned topics in Kafka to support 150k messages per second.",
            source_provider="github",
            category="engineering",
            strength="high",
            verification_status="unreviewed",
        )
        assert indexed is True

        # Search
        search_hits = chroma_store.search_evidence(
            query="Kafka event processing microservices",
            owner_user_id=test_user_id,
            n_results=5,
        )
        assert len(search_hits) >= 1
        found_ids = [h["evidence_id"] for h in search_hits]
        assert item_id in found_ids
    finally:
        chroma_store.delete_evidence_item(item_id)


def test_evidence_list_and_review_flow():
    # 1. Create a test evidence item in DB
    db = SessionLocal()
    item_id = uuid.uuid4()
    try:
        item = EvidenceItem(
            id=item_id,
            owner_user_id=uuid.UUID(DEMO_USER_ID),
            source_provider="github",
            source_type="commit",
            external_record_id="c_9988",
            source_url="https://github.com/org/repo/commit/c_9988",
            source_name="org/repo",
            evidence_category="engineering",
            title="Optimized connection pooling queries",
            description="Reduced p99 query latency from 850ms to 45ms",
            extracted_excerpt="Refactored database query to use composite indexes.",
            observed_timestamp=datetime.now(timezone.utc),
            contributor_identity="alex.chen",
            attribution_status="author",
            project_name="repo",
            evidence_strength="high",
            extraction_confidence=0.91,
            verification_status="unreviewed",
            processing_status="ready_for_review",
            provenance={"repo": "org/repo"},
            content_hash=uuid.uuid4().hex,
        )
        db.add(item)
        db.commit()

        # 2. Query evidence list API
        resp = client.get("/api/v1/evidence", headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert "summary" in data
        assert data["summary"]["totalEvidence"] >= 1

        # 3. Explicit Review: Mark as Verified
        review_resp = client.post(
            f"/api/v1/evidence/{item_id}/review",
            json={
                "verification_status": "verified",
                "reviewer_notes": "Code commit inspected and verified by Senior Lead.",
            },
            headers=AUTH_HEADERS,
        )
        assert review_resp.status_code == 200
        assert review_resp.json()["new_status"] == "verified"

        # 4. Fetch detail and check audit trail
        detail_resp = client.get(f"/api/v1/evidence/{item_id}", headers=AUTH_HEADERS)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["verificationStatus"] == "verified"
        assert len(detail["auditTrail"]) >= 1
        assert detail["auditTrail"][0]["newState"] == "verified"

        # Cleanup
        db.delete(item)
        db.commit()
    finally:
        db.close()


def test_semantic_search_endpoint():
    resp = client.post(
        "/api/v1/evidence/search",
        json={"query": "microservices distributed architecture", "limit": 5},
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200
    assert "results" in resp.json()
    assert "total_hits" in resp.json()


def test_ingestion_runs_list():
    resp = client.get("/api/v1/ingestion-runs", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert "runs" in data
    assert "summary" in data
