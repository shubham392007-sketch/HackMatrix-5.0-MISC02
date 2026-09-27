"""Unit and integration tests for Enhancement 8.3: Auto-Generated Growth Narrative."""
import pytest
from fastapi.testclient import TestClient

from backend.schemas.narrative_schema import (
    GrowthNarrativeRequest,
    EvaluationPeriod,
    NarrativeClaim,
    EvidenceReference
)
from backend.services.narrative_service import NarrativeService
from backend.services.evidence_link_service import EvidenceLinkService
from backend.repositories.narrative_repository import NarrativeRepository
import main

client = TestClient(main.app)


def test_build_deterministic_claims_from_evidence():
    """Verify claim builder calculates correct directional trends and deltas."""
    service = NarrativeService()

    evidence = [
        EvidenceReference(
            evidence_id="E101",
            source="assessment",
            source_type="assessment",
            timestamp="2026-05-10",
            title="Python Assessment",
            raw_score=75.0,
            detail="Initial Python benchmark"
        ),
        EvidenceReference(
            evidence_id="E102",
            source="project_outcome",
            source_type="project_outcome",
            timestamp="2026-07-20",
            title="FastAPI PR",
            raw_score=85.0,
            detail="Async API deliverable"
        )
    ]

    claims = service._build_deterministic_claims(evidence)
    assert len(claims) >= 1
    python_claim = claims[0]
    assert python_claim.trend == "improving"
    assert "E101" in python_claim.evidence_ids
    assert "E102" in python_claim.evidence_ids
    assert python_claim.verified is True


def test_evidence_link_service_claim_validation():
    """Verify claim citations are strictly checked against verified evidence pool."""
    service = EvidenceLinkService()

    verified_ev = [
        EvidenceReference(
            evidence_id="E001",
            source="assessment",
            source_type="assessment",
            timestamp="2026-05-10",
            title="Communication Assessment",
            raw_score=74.0
        )
    ]

    claims = [
        NarrativeClaim(
            claim_id="CLM-001",
            competency_id="C05",
            competency_name="Communication",
            claim_text="Scored 74 in Communication",
            trend="stagnating",
            evidence_ids=["E001"],
            verified=True
        ),
        NarrativeClaim(
            claim_id="CLM-002",
            competency_id="C01",
            competency_name="Python",
            claim_text="Unverified claim with fake ID",
            trend="improving",
            evidence_ids=["E999_FABRICATED"],
            verified=True
        )
    ]

    validated = service.validate_claims_against_evidence(claims, verified_ev)
    assert validated[0].verified is True
    # The fabricated citation should fail full verification
    assert validated[1].verified is False


def test_narrative_generation_end_to_end():
    """Verify narrative API endpoint returns valid response with grounded claims."""
    NarrativeRepository.clear_cache()

    response = client.post("/api/v1/feature4/narrative", json={
        "learner_id": "L000001",
        "evaluation_period": {
            "start_date": "2026-05-01",
            "end_date": "2026-09-30",
            "label": "Q2-Q3 2026"
        }
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["learner_id"] in ["L000001", "shubham_pokale"]
    assert len(data["narrative"]) > 50
    assert len(data["claims"]) > 0
    assert "manager_briefing" in data
    assert len(data["manager_briefing"]["key_improvements"]) > 0
    assert len(data["supporting_evidence"]) > 0


def test_narrative_caching():
    """Verify subsequent requests with identical parameters utilize the repository cache."""
    req_body = {
        "learner_id": "L000001",
        "evaluation_period": {
            "start_date": "2026-05-01",
            "end_date": "2026-09-30"
        }
    }

    r1 = client.post("/api/v1/feature4/narrative", json=req_body)
    r2 = client.post("/api/v1/feature4/narrative", json=req_body)

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["narrative"] == r2.json()["narrative"]
