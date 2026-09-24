import pytest
from backend.rag.schemas import RetrievedEvidenceItem, JustificationResponse
from backend.rag.prompts import build_justification_context
from backend.rag.generator import EvidenceJustificationGenerator


def test_build_justification_context_empty():
    context = build_justification_context("emp-1", "Data Analysis", [])
    assert "No relevant evidence records found" in context


def test_build_justification_context_populated():
    items = [{
        "evidence_id": "ev-101",
        "source": "github",
        "source_type": "commit",
        "title": "Optimize query",
        "content": "Added composite index on occurred_at",
        "occurred_at": "2026-09-24T10:00:00Z",
        "project_name": "CoreService"
    }]
    context = build_justification_context("emp-1", "Database Systems", items, "Review indexing")
    assert "ev-101" in context
    assert "Optimize query" in context
    assert "CoreService" in context


def test_reconcile_response_strips_hallucinated_references():
    generator = EvidenceJustificationGenerator()
    retrieved = [
        RetrievedEvidenceItem(
            evidence_id="ev-real-1",
            source="github",
            source_type="commit",
            source_reference="repo#1",
            title="Real commit",
            content="Real work",
            occurred_at="2026-09-24T10:00:00Z"
        )
    ]
    raw_llm = """{
        "competency": "Backend Engineering",
        "action": "Learn Docker",
        "justification": "Did work on Docker",
        "evidence_refs": ["ev-real-1", "ev-hallucinated-999"],
        "confidence": 0.85,
        "evidence_sufficiency": "sufficient"
    }"""
    res = generator._validate_and_reconcile_response(raw_llm, "Backend Engineering", retrieved)
    # The hallucinated ID must have been stripped!
    assert "ev-real-1" in res.evidence_refs
    assert "ev-hallucinated-999" not in res.evidence_refs


def test_insufficient_evidence_schema():
    res = JustificationResponse(
        competency="Security",
        action=None,
        justification="Insufficient evidence to generate a competency-specific action.",
        evidence_refs=[],
        confidence=0.0,
        evidence_sufficiency="insufficient"
    )
    assert res.action is None
    assert res.evidence_sufficiency == "insufficient"
    assert res.evidence_refs == []
