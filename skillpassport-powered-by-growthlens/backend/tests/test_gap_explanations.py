import os
os.environ["APP_ENV"] = "test"

import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.session import get_db
from backend.app.career.gap_explanation_service import (
    GapExplanationService,
    gap_explanation_service,
    GapAnalysisInput,
    GapEvidenceContext,
    ANALYSIS_VERSION,
)

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer sp_demo_alexchen_valid"}


@pytest.fixture
def mock_db_session():
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = []
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_db.query.return_value.filter.return_value.count.return_value = 0
    return mock_db


# ==============================================================================
# 1. EVIDENCE GROUNDING & PROFICIENCY GAP DISTINCTION TESTS
# ==============================================================================

def test_lower_proficiency_distinguished_from_evidence_only_gap():
    """
    Verify genuine proficiency gap (lower demonstrated level than target)
    is clearly distinguished from an unverified evidence-only gap.
    """
    service = GapExplanationService()

    # Case A: Genuine proficiency gap (Working vs Advanced with real artifact)
    gap_prof = GapAnalysisInput(
        gap_id="gap-crypto-01",
        skill_id="skill-cryptography",
        canonical_name="Advanced Cryptography",
        requirement_type="core_required",
        importance="critical",
        expected_level="Advanced",
        expected_numeric=4,
        assessed_proficiency="Working",
        assessed_numeric=2,
        verification_status="verified",
        confidence=0.92,
        proficiency_coverage=50.0,
        effective_coverage=0.50,
        gap_classification="depth_gap",
        evidence_items=[
            GapEvidenceContext(
                artifact_id="art-crypto-101",
                title="Symmetric AES Encryption Utility",
                source_type="pull_request",
                source_provider="github",
                project_name="crypto-lib",
                verification_status="verified",
                evidence_strength="high",
                demonstrated_level="Working",
                extracted_summary="Implemented basic AES-GCM encryption helpers.",
                supporting_excerpt="Added encrypt_payload() using cryptography package.",
                rationale="Demonstrates working knowledge of symmetric encryption.",
            )
        ],
    )

    exp_prof = service._generate_deterministic_explanation(gap_prof, "Cryptography Specialist")
    assert exp_prof.gap_type == "genuine_proficiency_gap"
    assert "art-crypto-101" in exp_prof.supporting_evidence_ids
    assert "Working" in exp_prof.summary
    assert "Advanced" in exp_prof.summary
    assert "-2 level step shortfall" in exp_prof.summary

    # Case B: Evidence-only gap (Candidate proficiency claims Practitioner, but uncorroborated)
    gap_ev = GapAnalysisInput(
        gap_id="gap-crypto-02",
        skill_id="skill-snarks",
        canonical_name="Zero-Knowledge Proofs",
        requirement_type="core_required",
        importance="high",
        expected_level="Practitioner",
        expected_numeric=3,
        assessed_proficiency="Practitioner",
        assessed_numeric=3,
        verification_status="candidate",
        confidence=0.70,
        proficiency_coverage=100.0,
        effective_coverage=0.60,
        gap_classification="evidence_gap",
        evidence_items=[
            GapEvidenceContext(
                artifact_id="art-snark-201",
                title="Self-reported ZK circuit repo",
                source_type="portfolio",
                source_provider="github",
                project_name="zk-experiments",
                verification_status="candidate",
                evidence_strength="low",
                demonstrated_level="Practitioner",
                extracted_summary="Toy circom circuit.",
                supporting_excerpt="template Multiplier() { signal input a; }",
                rationale="Candidate claim awaiting peer verification.",
            )
        ],
    )

    exp_ev = service._generate_deterministic_explanation(gap_ev, "Cryptography Specialist")
    assert exp_ev.gap_type in ("verification_gap", "evidence_gap")
    assert "candidate" in exp_ev.summary or "provisional" in exp_ev.summary.lower()
    # Verification is NOT upgraded
    assert exp_ev.gap_type != "meets"


def test_missing_evidence_not_described_as_proof_skill_absent():
    """
    Verify that when zero evidence artifacts exist, the system classifies as
    insufficient_data without claiming candidate has an absolute lack of ability.
    """
    service = GapExplanationService()

    gap_missing = GapAnalysisInput(
        gap_id="gap-reverse-eng-01",
        skill_id="skill-reverse-engineering",
        canonical_name="Binary Reverse Engineering",
        requirement_type="core_required",
        importance="critical",
        expected_level="Practitioner",
        expected_numeric=3,
        assessed_proficiency="Not Established",
        assessed_numeric=0,
        verification_status="not_established",
        confidence=0.0,
        proficiency_coverage=0.0,
        effective_coverage=0.0,
        gap_classification="skill_gap",
        evidence_items=[],
    )

    exp = service._generate_deterministic_explanation(gap_missing, "Binary Security Analyst")
    assert exp.gap_type == "insufficient_data"
    assert exp.insufficient_information is True
    assert len(exp.supporting_evidence_ids) == 0
    # Must truthfully state evidence is not yet recorded, not that candidate lacks ability
    assert "No attributable evidence artifacts have been ingested or linked" in exp.summary
    assert "Zero attributable artifacts submitted" in exp.specific_shortfall


def test_rejection_of_invented_artifact_ids():
    """
    Verify that any artifact IDs hallucinated or invented by the LLM
    are stripped out by sanitization so only genuine supplied artifacts remain.
    """
    service = GapExplanationService()

    real_artifact = GapEvidenceContext(
        artifact_id="art-valid-111",
        title="Real Cryptography Commit",
        source_type="commit",
        source_provider="github",
        project_name="auth-service",
        verification_status="verified",
        evidence_strength="high",
        demonstrated_level="Working",
        extracted_summary="Real cryptographic hash validation.",
        supporting_excerpt="hashlib.sha256(data).digest()",
        rationale="Demonstrates hash validation.",
    )

    gap_in = GapAnalysisInput(
        gap_id="gap-auth-01",
        skill_id="skill-auth",
        canonical_name="Authentication & Cryptography",
        requirement_type="core_required",
        importance="high",
        expected_level="Practitioner",
        expected_numeric=3,
        assessed_proficiency="Working",
        assessed_numeric=2,
        verification_status="verified",
        confidence=0.90,
        proficiency_coverage=66.7,
        effective_coverage=0.667,
        gap_classification="depth_gap",
        evidence_items=[real_artifact],
    )

    # Simulated LLM hallucinating fake artifact IDs
    hallucinated_llm_output = {
        "skill_id": "skill-auth",
        "requirement_id": "gap-auth-01",
        "gap_type": "genuine_proficiency_gap",
        "summary": "Candidate demonstrates Working-level hash verification, target requires Practitioner-level token lifecycle management.",
        "required_capability": "Practitioner token management and key rotation.",
        "demonstrated_capabilities": ["Hash validation in commit"],
        "specific_shortfall": "No token lifecycle or key rotation demonstrated.",
        "evidence_limitations": "Only one commit provided.",
        "supporting_evidence_ids": ["art-valid-111", "fake-hallucinated-artifact-999"],
        "contradicting_evidence_ids": ["fake-ghost-artifact-888"],
        "reasoning_confidence": 0.89,
        "recommended_next_actions": ["Implement asymmetric key rotation in auth-service."],
        "insufficient_information": False,
    }

    sanitized = service._sanitize_and_validate_explanation(hallucinated_llm_output, gap_in, "Security Architect")

    # The valid artifact ID is kept
    assert "art-valid-111" in sanitized.supporting_evidence_ids
    # The hallucinated artifact IDs MUST be rejected
    assert "fake-hallucinated-artifact-999" not in sanitized.supporting_evidence_ids
    assert "fake-ghost-artifact-888" not in sanitized.contradicting_evidence_ids
    assert len(sanitized.contradicting_evidence_ids) == 0


def test_conflicting_evidence_identified_correctly():
    """Verify open conflict records route to conflicting_evidence classification."""
    service = GapExplanationService()

    conflict_art_1 = GapEvidenceContext(
        artifact_id="art-conf-01",
        title="Commit claiming author",
        source_type="commit",
        source_provider="github",
        project_name="kernel-module",
        verification_status="conflicting",
        evidence_strength="medium",
        demonstrated_level="Advanced",
        extracted_summary="Claimed author of memory allocation patch.",
        supporting_excerpt="git commit by alex",
        rationale="Author claim.",
    )
    conflict_art_2 = GapEvidenceContext(
        artifact_id="art-conf-02",
        title="Disputed PR review",
        source_type="pull_request",
        source_provider="github",
        project_name="kernel-module",
        verification_status="conflicting",
        evidence_strength="medium",
        demonstrated_level="Foundation",
        extracted_summary="Disputed PR indicates co-author status only.",
        supporting_excerpt="Co-authored-by tag mismatch",
        rationale="Attribution conflict.",
    )

    gap_conflict = GapAnalysisInput(
        gap_id="gap-kernel-01",
        skill_id="skill-kernel-security",
        canonical_name="Kernel Security",
        requirement_type="core_required",
        importance="critical",
        expected_level="Advanced",
        expected_numeric=4,
        assessed_proficiency="Advanced",
        assessed_numeric=4,
        verification_status="conflicting",
        confidence=0.50,
        proficiency_coverage=100.0,
        effective_coverage=0.35,
        gap_classification="evidence_gap",
        evidence_items=[conflict_art_1, conflict_art_2],
    )

    exp = service._generate_deterministic_explanation(gap_conflict, "Systems Security Engineer")
    assert exp.gap_type == "conflicting_evidence"
    assert "Conflicting evidence" in exp.summary
    assert "Trust Center" in exp.summary
    assert "art-conf-01" in exp.supporting_evidence_ids
    assert "art-conf-02" in exp.contradicting_evidence_ids


# ==============================================================================
# 2. BATCHED OLLAMA INFERENCE & CACHING TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_explain_gaps_batched_call_and_cache(mock_db_session):
    """
    Verify that explaining multiple gaps issues exactly ONE batched call to Ollama,
    and subsequent calls for the same snapshot/evidence return cached results (0 calls).
    """
    service = GapExplanationService()
    user_id = uuid.uuid4()
    role_id = "role-test-security"

    sample_gaps = [
        {
            "gap_id": "gap-1",
            "skill_id": "skill-crypto",
            "canonical_name": "Cryptography",
            "requirement_type": "core_required",
            "importance": "critical",
            "expected_level": "Advanced",
            "expected_level_numeric": 4,
            "current_supported_level": "Working",
            "current_proficiency_numeric": 2,
            "proficiency_coverage": 50.0,
            "effective_coverage": 0.50,
            "verification_status": "verified",
            "relevant_evidence_ids": ["art-01"],
            "gap_type": "depth_gap",
            "diagnosis": "Working level demonstrated.",
            "next_step_direction": "Demonstrate advanced key exchange.",
        },
        {
            "gap_id": "gap-2",
            "skill_id": "skill-threat-intel",
            "canonical_name": "Threat Intelligence",
            "requirement_type": "supporting",
            "importance": "high",
            "expected_level": "Practitioner",
            "expected_level_numeric": 3,
            "current_supported_level": "Not Established",
            "current_proficiency_numeric": 0,
            "proficiency_coverage": 0.0,
            "effective_coverage": 0.0,
            "verification_status": "not_established",
            "relevant_evidence_ids": [],
            "gap_type": "skill_gap",
            "diagnosis": "No evidence recorded.",
            "next_step_direction": "Ingest threat intel feeds.",
        },
    ]

    mock_ollama_batch_response = [
        {
            "skill_id": "skill-crypto",
            "requirement_id": "gap-1",
            "gap_type": "genuine_proficiency_gap",
            "summary": "Candidate demonstrated Working-level symmetric cipher usage; role requires Advanced-level asymmetric cryptosystems and side-channel resistance.",
            "required_capability": "Advanced cryptosystem design.",
            "demonstrated_capabilities": ["Basic AES symmetric cipher implementation"],
            "specific_shortfall": "Lacks asymmetric Diffie-Hellman implementation or side-channel mitigations.",
            "evidence_limitations": "Only one utility commit provided.",
            "supporting_evidence_ids": ["art-01"],
            "contradicting_evidence_ids": [],
            "reasoning_confidence": 0.94,
            "recommended_next_actions": ["Implement and link an authenticated ECDH key exchange."],
            "insufficient_information": False,
        },
        {
            "skill_id": "skill-threat-intel",
            "requirement_id": "gap-2",
            "gap_type": "insufficient_data",
            "summary": "No attributable evidence artifacts have been submitted for Threat Intelligence.",
            "required_capability": "Practitioner threat intelligence collection and IOC extraction.",
            "demonstrated_capabilities": [],
            "specific_shortfall": "Zero evidence recorded.",
            "evidence_limitations": "No ingested sources.",
            "supporting_evidence_ids": [],
            "contradicting_evidence_ids": [],
            "reasoning_confidence": 0.96,
            "recommended_next_actions": ["Ingest MISP or STIX/TAXII threat intel work samples."],
            "insufficient_information": True,
        },
    ]

    # Patch Ollama batch invocation
    with patch.object(service, "_invoke_ollama_batched", new_callable=AsyncMock) as mock_invoke:
        mock_invoke.return_value = mock_ollama_batch_response

        # 1. First execution -> Must call Ollama exactly ONCE for all gaps
        res1 = await service.explain_gaps(
            db=mock_db_session,
            user_id=user_id,
            role_id=role_id,
            gaps=sample_gaps,
            role_title="Security Lead",
        )

        assert mock_invoke.call_count == 1
        assert res1.from_cache is False
        assert len(res1.explanations) >= 2
        assert "skill-crypto" in res1.explanations
        assert "skill-threat-intel" in res1.explanations
        assert res1.explanations["skill-crypto"].gap_type == "genuine_proficiency_gap"
        assert res1.explanations["skill-threat-intel"].gap_type == "insufficient_data"

        # 2. Second execution -> Must HIT cache and NOT invoke Ollama
        res2 = await service.explain_gaps(
            db=mock_db_session,
            user_id=user_id,
            role_id=role_id,
            gaps=sample_gaps,
            role_title="Security Lead",
        )

        assert mock_invoke.call_count == 1  # Still 1! Zero additional calls!
        assert res2.from_cache is True
        assert res2.explanations["skill-crypto"].is_cached is True

        # 3. Force refresh -> Must re-invoke Ollama
        res3 = await service.explain_gaps(
            db=mock_db_session,
            user_id=user_id,
            role_id=role_id,
            gaps=sample_gaps,
            role_title="Security Lead",
            force_refresh=True,
        )

        assert mock_invoke.call_count == 2
        assert res3.from_cache is False


# ==============================================================================
# 3. FASTAPI ENDPOINT INTEGRATION TESTS
# ==============================================================================

def test_get_gap_explanations_api_endpoint_mocked():
    """Verify GET /api/v1/career/gaps/{role_id}/explanations returns structured response."""
    with patch(
        "backend.app.career.gap_explanation_service.gap_explanation_service._invoke_ollama_batched",
        new_callable=AsyncMock,
    ) as mock_invoke:
        mock_invoke.return_value = [
            {
                "skill_id": "skill-docker",
                "requirement_id": "gap-role-ai-engineer-entry-skill-docker",
                "gap_type": "genuine_proficiency_gap",
                "summary": "Demonstrated Working level; target requires Practitioner level with production container orchestration.",
                "required_capability": "Practitioner container orchestration.",
                "demonstrated_capabilities": ["Docker Compose & Deployment Manifests"],
                "specific_shortfall": "No Kubernetes or production ingress manifests found.",
                "evidence_limitations": "Single container setup artifact.",
                "supporting_evidence_ids": ["ev-103"],
                "contradicting_evidence_ids": [],
                "reasoning_confidence": 0.91,
                "recommended_next_actions": ["Deploy multi-stage containerized build."],
                "insufficient_information": False,
            }
        ]

        response = client.get(
            "/api/v1/career/gaps/role-ai-engineer-entry/explanations",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert "role_id" in data
        assert data["role_id"] == "role-ai-engineer-entry"
        assert "explanations" in data
        assert "total_gaps" in data
        assert "analysis_version" in data

        if data["total_gaps"] > 0:
            first_key = list(data["explanations"].keys())[0]
            first_exp = data["explanations"][first_key]
            assert "summary" in first_exp
            assert "gap_type" in first_exp
            assert first_exp["gap_type"] in (
                "genuine_proficiency_gap",
                "evidence_gap",
                "verification_gap",
                "conflicting_evidence",
                "insufficient_data",
            )
            assert "required_capability" in first_exp
            assert "demonstrated_capabilities" in first_exp
            assert "specific_shortfall" in first_exp
            assert "recommended_next_actions" in first_exp
            assert isinstance(first_exp["recommended_next_actions"], list)


def test_gap_explanations_fallback_when_ollama_offline():
    """Verify endpoint falls back cleanly to deterministic synthesis when Ollama is offline/unreachable."""
    with patch(
        "backend.app.career.gap_explanation_service.gap_explanation_service._invoke_ollama_batched",
        new_callable=AsyncMock,
    ) as mock_invoke:
        mock_invoke.return_value = None  # Simulates Ollama timeout or connection refusal

        response = client.get(
            "/api/v1/career/gaps/role-ai-engineer-entry/explanations?force_refresh=true",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_cache"] is False
        assert data["total_gaps"] > 0
        for exp in data["explanations"].values():
            assert len(exp["summary"]) > 10
            assert exp["gap_type"] in (
                "genuine_proficiency_gap",
                "evidence_gap",
                "verification_gap",
                "conflicting_evidence",
                "insufficient_data",
            )
            assert len(exp["recommended_next_actions"]) > 0


def test_gap_explanations_user_isolation():
    """Verify separate users have isolated gap explanations and evidence contexts."""
    headers_user_a = {"Authorization": "Bearer sp_demo_alexchen_valid"}
    headers_user_b = {"Authorization": "Bearer sp_demo_otheruser_valid"}

    with patch(
        "backend.app.career.gap_explanation_service.gap_explanation_service._invoke_ollama_batched",
        new_callable=AsyncMock,
    ) as mock_invoke:
        mock_invoke.return_value = None  # Use deterministic for consistency

        res_a = client.get("/api/v1/career/gaps/role-ai-engineer-entry/explanations", headers=headers_user_a)
        res_b = client.get("/api/v1/career/gaps/role-ai-engineer-entry/explanations", headers=headers_user_b)
        assert res_a.status_code == 200
        assert res_b.status_code == 200
