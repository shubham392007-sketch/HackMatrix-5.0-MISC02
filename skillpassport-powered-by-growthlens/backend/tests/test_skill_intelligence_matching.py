"""
Comprehensive Unit & Integration Test Suite for Milestone B:
Skill Intelligence & Canonical Matching Engine.

Validates:
1. Canonical 6-level scale & legacy mapping harmonization.
2. Normalized scoring formula EffectiveCoverage = min(1.0, Lu / max(1, Lr)) * Vi.
3. 4-Dimension disentanglement (Proficiency, Confidence, Verification, Evidence Quality).
4. Explicit standardized match classifications (meets, partial, below, unverified, not_found, conflicting).
5. Resilient career readiness tri-state (INSUFFICIENT_DATA, PROVISIONAL, COMPLETED) eliminating false 0% penalties.
6. System-calculated gap priorities without manual sliders.
7. Strict topological DAG prerequisite sequencing.
8. User pinned preferences without score corruption.
"""
import uuid
import pytest
from unittest.mock import MagicMock

from backend.app.taxonomy.canonical import (
    PROFICIENCY_SCALE,
    NUMERIC_TO_PROFICIENCY,
    VERIFICATION_FACTORS,
    CANONICAL_PREREQUISITES,
    level_to_numeric,
    numeric_to_level,
    resolve_verification_factor,
)
from backend.app.career.matching_engine import MatchingEngine, matching_engine
from backend.app.career.prioritization_service import PrioritizationService, prioritization_service


# ==============================================================================
# 1. CANONICAL PROFICIENCY SCALE & TAXONOMY HARMONIZATION
# ==============================================================================

def test_canonical_proficiency_scale_ranks():
    """Verify 6-level canonical ordinal scale and Intermediate -> Practitioner tier mapping."""
    assert PROFICIENCY_SCALE["Not Established"] == 0
    assert PROFICIENCY_SCALE["Foundation"] == 1
    assert PROFICIENCY_SCALE["Working"] == 2
    assert PROFICIENCY_SCALE["Practitioner"] == 3
    assert PROFICIENCY_SCALE["Intermediate"] == 3  # Intermediate MUST map to Practitioner (rank 3)
    assert PROFICIENCY_SCALE["Advanced"] == 4
    assert PROFICIENCY_SCALE["Expert"] == 5

    assert NUMERIC_TO_PROFICIENCY[0] == "Not Established"
    assert NUMERIC_TO_PROFICIENCY[1] == "Foundation"
    assert NUMERIC_TO_PROFICIENCY[2] == "Working"
    assert NUMERIC_TO_PROFICIENCY[3] == "Practitioner"
    assert NUMERIC_TO_PROFICIENCY[4] == "Advanced"
    assert NUMERIC_TO_PROFICIENCY[5] == "Expert"


def test_level_numeric_conversions():
    """Verify bidirectional level string and numeric conversion helpers."""
    assert level_to_numeric("Practitioner") == 3
    assert level_to_numeric("intermediate") == 3
    assert level_to_numeric("Advanced") == 4
    assert level_to_numeric("Expert") == 5
    assert level_to_numeric("Unknown") == 0
    assert level_to_numeric(None) == 0

    assert numeric_to_level(3) == "Practitioner"
    assert numeric_to_level(4) == "Advanced"
    assert numeric_to_level(5) == "Expert"
    assert numeric_to_level(0) == "Not Established"
    assert numeric_to_level(99) == "Expert"  # Clamped to 5


# ==============================================================================
# 2. NORMALIZED SCORING FORMULA & VERIFICATION FACTORS
# ==============================================================================

def test_verification_factors_calibration():
    """Verify governance verification factors V_i bounded in [0.0, 1.0]."""
    assert resolve_verification_factor("verified") == 1.00
    assert resolve_verification_factor("candidate") == 0.60
    assert resolve_verification_factor("insufficient_evidence") == 0.50
    assert resolve_verification_factor("conflicting") == 0.35
    assert resolve_verification_factor("rejected") == 0.00
    assert resolve_verification_factor("not_established") == 0.00
    assert resolve_verification_factor("unverified") == 0.00

    # Calibrated candidate factor with confidence clamped within [0.50, 0.75]
    assert resolve_verification_factor("candidate", confidence=0.95) == 0.75
    assert resolve_verification_factor("candidate", confidence=0.40) == 0.50
    assert resolve_verification_factor("candidate", confidence=0.65) == 0.65
    assert resolve_verification_factor("candidate", confidence=95.0) == 0.75  # 0-100 scale input safe


def test_normalized_effective_coverage_never_exceeds_one():
    """Verify EffectiveCoverage = min(1.0, Lu / max(1, Lr)) * Vi is strictly bounded in [0.0, 1.0]."""
    engine = MatchingEngine()

    # Case 1: Overqualified verified candidate (Lu = 5, Lr = 3, Vi = 1.0)
    req = {
        "skill_id": "skill-python",
        "canonical_name": "Python Engineering",
        "requirement_type": "core_required",
        "expected_level": "Practitioner",
        "expected_level_numeric": 3,
    }
    user_skills = {
        "skill-python": {
            "competency_id": "comp-1",
            "canonical_name": "Python Engineering",
            "proficiency_level": "Expert",
            "proficiency_numeric": 5,
            "verification_status": "verified",
            "confidence": 0.99,
            "evidence_ids": ["ev-1", "ev-2"],
            "evidence_items": [{"id": "ev-1"}, {"id": "ev-2"}],
            "aliases": ["python"],
        }
    }
    res = engine.evaluate_requirement(req, user_skills)
    assert res["raw_coverage"] == 1.0  # min(1.0, 5/3) = 1.0
    assert res["effective_coverage"] == 1.0
    assert res["effective_coverage_pct"] == 100.0
    assert res["match_classification"] == "meets"
    assert res["match_status"] == "strong_match"


def test_unverified_candidate_coverage_discount():
    """Verify candidate capability claim is discounted by Vi and never receives full credit."""
    engine = MatchingEngine()
    req = {
        "skill_id": "skill-docker",
        "canonical_name": "Docker & Containerization",
        "requirement_type": "supporting",
        "expected_level": "Working",
        "expected_level_numeric": 2,
    }
    user_skills = {
        "skill-docker": {
            "competency_id": "comp-2",
            "canonical_name": "Docker & Containerization",
            "proficiency_level": "Working",
            "proficiency_numeric": 2,
            "verification_status": "candidate",
            "confidence": 0.80,
            "evidence_ids": ["ev-3"],
            "evidence_items": [{"id": "ev-3"}],
            "aliases": ["docker"],
        }
    }
    res = engine.evaluate_requirement(req, user_skills)
    # raw_cov = 2/2 = 1.0; Vi for candidate with 0.80 conf = 0.75
    assert res["raw_coverage"] == 1.0
    assert res["effective_coverage"] <= 0.75
    assert res["match_classification"] == "unverified"
    assert res["match_status"] == "evidence_gap"


# ==============================================================================
# 3. 4-DIMENSION DISENTANGLEMENT & STANDARDIZED CLASSIFICATIONS
# ==============================================================================

def test_disentangled_dimensions_in_evaluation():
    """Verify assessed_proficiency, model_confidence, verification_status, and evidence are distinct."""
    engine = MatchingEngine()
    req = {
        "skill_id": "skill-ml",
        "canonical_name": "Machine Learning",
        "requirement_type": "core_required",
        "expected_level": "Advanced",
        "expected_level_numeric": 4,
    }
    user_skills = {
        "skill-ml": {
            "competency_id": "comp-3",
            "canonical_name": "Machine Learning",
            "proficiency_level": "Working",
            "proficiency_numeric": 2,
            "verification_status": "verified",
            "confidence": 0.94,
            "evidence_ids": ["ev-4", "ev-5"],
            "evidence_items": [{"id": "ev-4"}, {"id": "ev-5"}],
            "aliases": ["ml"],
        }
    }
    res = engine.evaluate_requirement(req, user_skills)

    # 1. Dimension 1: Assessed Proficiency Lu
    assert res["assessed_proficiency"] == "Working"
    assert res["assessed_numeric"] == 2

    # 2. Dimension 2: Model Extraction Confidence Cm
    assert res["model_confidence"] == 0.94
    assert 0.0 <= res["model_confidence"] <= 1.0

    # 3. Dimension 3: Verification Status Sv
    assert res["verification_status"] == "verified"

    # 4. Dimension 4: Evidence Quality Qe
    assert res["evidence_strength"] == "high"
    assert res["evidence_ids"] == ["ev-4", "ev-5"]

    # Classification: 2 vs 4 is dist 2 -> below
    assert res["match_classification"] == "below"
    assert res["match_status"] == "partial_match"


def test_standardized_match_classifications():
    """Verify explicit match classifications: meets, partial, below, unverified, not_found, conflicting."""
    engine = MatchingEngine()

    def eval_scenario(num, exp, v_status, ev_count):
        req = {
            "skill_id": "skill-test",
            "canonical_name": "Test Skill",
            "requirement_type": "core_required",
            "expected_level_numeric": exp,
            "expected_level": numeric_to_level(exp),
        }
        if num == 0:
            return engine.evaluate_requirement(req, {})

        skills = {
            "skill-test": {
                "competency_id": "comp-test",
                "canonical_name": "Test Skill",
                "proficiency_level": numeric_to_level(num),
                "proficiency_numeric": num,
                "verification_status": v_status,
                "confidence": 0.90,
                "evidence_ids": [f"ev-{i}" for i in range(ev_count)],
                "evidence_items": [{"id": f"ev-{i}"} for i in range(ev_count)],
                "aliases": [],
            }
        }
        return engine.evaluate_requirement(req, skills)

    # 1. Meets: Lu >= Lr, verified, evidence > 0
    m1 = eval_scenario(3, 3, "verified", 1)
    assert m1["match_classification"] == "meets"

    # 2. Partial: 0 < Lu < Lr with 1 level gap
    m2 = eval_scenario(2, 3, "verified", 1)
    assert m2["match_classification"] == "partial"

    # 3. Below: 0 < Lu < Lr with >1 level gap
    m3 = eval_scenario(1, 4, "verified", 1)
    assert m3["match_classification"] == "below"

    # 4. Unverified: candidate or insufficient_evidence
    m4 = eval_scenario(3, 3, "candidate", 1)
    assert m4["match_classification"] == "unverified"

    # 5. Not Found: Lu == 0 or not demonstrated
    m5 = eval_scenario(0, 3, "not_established", 0)
    assert m5["match_classification"] == "not_found"

    # 6. Conflicting: open conflict
    m6 = eval_scenario(3, 3, "conflicting", 1)
    assert m6["match_classification"] == "conflicting"


# ==============================================================================
# 4. RESILIENT CAREER READINESS TRI-STATE
# ==============================================================================

def test_resilient_readiness_insufficient_data_cold_start():
    """Verify that unassessed/cold-start role evaluation returns INSUFFICIENT_DATA and None index."""
    engine = MatchingEngine()
    mock_db = MagicMock()
    mock_db.query.return_value.join.return_value.outerjoin.return_value.filter.return_value.all.return_value = []
    mock_db.query.return_value.filter.return_value.all.return_value = []

    # Mock role model where user has zero matching evidence
    role_model = MagicMock()
    role_model.role_id = "role-crypto-specialist"
    role_model.title = "Cryptography Specialist"
    role_model.version = "v1.0"
    role_model.seniority = "Senior"
    role_model.competencies = [
        {
            "skill_id": "skill-zero-knowledge",
            "canonical_name": "Zero-Knowledge Proofs",
            "requirement_type": "core_required",
            "expected_level": "Advanced",
            "expected_level_numeric": 4,
        },
        {
            "skill_id": "skill-elliptic-curves",
            "canonical_name": "Elliptic Curve Cryptography",
            "requirement_type": "core_required",
            "expected_level": "Practitioner",
            "expected_level_numeric": 3,
        },
    ]

    # Patch load_user_capabilities to return empty dict (cold start)
    original_load = engine.load_user_capabilities
    engine.load_user_capabilities = lambda db, uid: {}
    try:
        res = engine.evaluate_role_match(mock_db, uuid.uuid4(), role_model)
        readiness = res["readiness"]

        assert res["readiness_status"] == "INSUFFICIENT_DATA"
        assert res["is_provisional"] is False
        assert res["readiness_index"] is None  # NO FALSE 0%
        assert res["readiness_tier"] == "Insufficient Data"  # NO FALSE "Early Stage"
        assert readiness["required_supported_pct"] is None
        assert len(readiness["major_uncertainties"]) > 0
    finally:
        engine.load_user_capabilities = original_load


def test_resilient_readiness_provisional_with_candidate_skills():
    """Verify that partially verified profile returns PROVISIONAL status with uncertainties."""
    engine = MatchingEngine()
    mock_db = MagicMock()

    role_model = MagicMock()
    role_model.role_id = "role-ai-engineer-test"
    role_model.title = "AI Engineer"
    role_model.version = "v1.0"
    role_model.seniority = "Entry"
    role_model.competencies = [
        {
            "skill_id": "skill-python",
            "canonical_name": "Python Engineering",
            "requirement_type": "core_required",
            "expected_level": "Practitioner",
            "expected_level_numeric": 3,
        },
        {
            "skill_id": "skill-ml",
            "canonical_name": "Machine Learning",
            "requirement_type": "core_required",
            "expected_level": "Practitioner",
            "expected_level_numeric": 3,
        },
    ]

    user_skills = {
        "skill-python": {
            "competency_id": "comp-py",
            "canonical_name": "Python Engineering",
            "proficiency_level": "Practitioner",
            "proficiency_numeric": 3,
            "verification_status": "verified",
            "confidence": 0.95,
            "evidence_ids": ["ev-1"],
            "evidence_items": [{"id": "ev-1"}],
            "aliases": ["python"],
        },
        "skill-ml": {
            "competency_id": "comp-ml",
            "canonical_name": "Machine Learning",
            "proficiency_level": "Working",
            "proficiency_numeric": 2,
            "verification_status": "candidate",  # Pending verification!
            "confidence": 0.70,
            "evidence_ids": ["ev-2"],
            "evidence_items": [{"id": "ev-2"}],
            "aliases": ["ml"],
        },
    }

    original_load = engine.load_user_capabilities
    engine.load_user_capabilities = lambda db, uid: user_skills
    try:
        res = engine.evaluate_role_match(mock_db, uuid.uuid4(), role_model)
        assert res["readiness_status"] == "PROVISIONAL"
        assert res["is_provisional"] is True
        assert res["readiness_index"] is not None
        assert 0 < res["readiness_index"] <= 100
        assert any("Machine Learning" in u for u in res["readiness"]["major_uncertainties"])
    finally:
        engine.load_user_capabilities = original_load


# ==============================================================================
# 5. SYSTEM-CALCULATED PRIORITIES WITHOUT SLIDERS
# ==============================================================================

def test_system_calculated_priorities_ignore_sliders():
    """Verify priority score is objective and unchanged by manual slider inputs."""
    service = PrioritizationService()
    gap = {
        "gap_id": "gap-1",
        "skill_id": "skill-fastapi",
        "canonical_name": "FastAPI Web Framework",
        "requirement_type": "core_required",
        "importance": "high",
        "effective_coverage": 0.20,
        "proficiency_distance": 2,
        "relevant_evidence_ids": ["ev-10"],
        "evidence_status": "incomplete",
    }

    # Execute with default sliders
    res_default = service.prioritize_gaps([gap], focus_mode="default", effort_sensitivity=1.0, leverage_weight=1.0)
    score_default = res_default[0]["priority_score"]

    # Execute with extreme slider manipulation
    res_manipulated = service.prioritize_gaps([gap], focus_mode="default", effort_sensitivity=3.0, leverage_weight=0.5)
    score_manipulated = res_manipulated[0]["priority_score"]

    # System priority MUST be objective and immune to manual slider manipulation
    assert score_default == score_manipulated
    assert 0.0 <= score_default <= 100.0


# ==============================================================================
# 6. TOPOLOGICAL DAG PREREQUISITE SEQUENCING
# ==============================================================================

def test_topological_dag_prerequisites_strictly_precede_dependents():
    """
    Verify topological DAG prerequisite ordering:
    Even if dependent skill has higher importance/score, its prerequisite MUST precede it.
    """
    service = PrioritizationService()

    # Scenario:
    # 1. FastAPI (dependent) has higher importance ("critical", gap 1.0) -> high base score
    # 2. Python (prerequisite) has lower importance ("medium", gap 0.5) -> lower base score
    # Dependency constraint: FastAPI requires Python!
    gaps = [
        {
            "gap_id": "gap-fastapi",
            "skill_id": "skill-fastapi",
            "canonical_name": "FastAPI Web Framework",
            "requirement_type": "core_required",
            "importance": "critical",
            "effective_coverage": 0.0,
            "proficiency_distance": 2,
            "prerequisite_skill_ids": ["skill-python"],
            "relevant_evidence_ids": [],
        },
        {
            "gap_id": "gap-python",
            "skill_id": "skill-python",
            "canonical_name": "Python Engineering",
            "requirement_type": "supporting",
            "importance": "medium",
            "effective_coverage": 0.40,
            "proficiency_distance": 1,
            "prerequisite_skill_ids": [],
            "relevant_evidence_ids": ["ev-1"],
        },
    ]

    prioritized = service.prioritize_gaps(gaps, focus_mode="default")

    assert len(prioritized) == 2
    # Python MUST be ranked #1 because it is a prerequisite for FastAPI
    assert prioritized[0]["skill_id"] == "skill-python"
    assert prioritized[0]["priority_rank"] == 1

    # FastAPI MUST be ranked #2
    assert prioritized[1]["skill_id"] == "skill-fastapi"
    assert prioritized[1]["priority_rank"] == 2


def test_topological_sort_with_user_pinned_skills():
    """Verify user pinned skills are prioritized among ready nodes without corrupting scores."""
    service = PrioritizationService()

    gaps = [
        {
            "gap_id": "gap-docker",
            "skill_id": "skill-docker",
            "canonical_name": "Docker & Containerization",
            "requirement_type": "supporting",
            "importance": "medium",
            "effective_coverage": 0.30,
            "proficiency_distance": 1,
            "prerequisite_skill_ids": [],
        },
        {
            "gap_id": "gap-git",
            "skill_id": "skill-git",
            "canonical_name": "Git Version Control",
            "requirement_type": "supporting",
            "importance": "medium",
            "effective_coverage": 0.30,
            "proficiency_distance": 1,
            "prerequisite_skill_ids": [],
        },
    ]

    # Pin 'skill-git'
    prioritized = service.prioritize_gaps(gaps, user_pinned_ids=["skill-git"])

    assert prioritized[0]["skill_id"] == "skill-git"
    assert prioritized[0]["is_user_pinned"] is True
    assert prioritized[1]["skill_id"] == "skill-docker"
    assert prioritized[1]["is_user_pinned"] is False


# ==============================================================================
# 8. GENUINE PROFICIENCY EVALUATION & NON-CONTRADICTORY DIAGNOSES
# ==============================================================================

def test_candidate_below_target_proportional_coverage():
    """Working (2) vs Practitioner (3): coverage must scale proportionally (66.7%), not binary 0%."""
    engine = MatchingEngine()
    req = {
        "skill_id": "skill-python",
        "canonical_name": "Python Engineering",
        "requirement_type": "core_required",
        "expected_level": "Practitioner",
        "expected_level_numeric": 3,
    }
    user_skills = {
        "skill-python": {
            "competency_id": "comp-1",
            "canonical_name": "Python Engineering",
            "proficiency_level": "Working",
            "proficiency_numeric": 2,
            "verification_status": "verified",
            "confidence": 0.92,
            "evidence_ids": ["ev-1"],
            "evidence_items": [{"id": "ev-1"}],
            "aliases": ["python"],
        }
    }
    res = engine.evaluate_requirement(req, user_skills)
    assert res["proficiency_coverage"] == 66.7
    assert res["current_proficiency"] == "Working"
    assert res["match_classification"] == "partial"
    assert res["match_status"] == "partial_match"
    assert "-1 level shortfall" in res["gap_explanation"]


def test_candidate_equal_to_target_full_coverage():
    """Practitioner (3) vs Practitioner (3): genuine 100% coverage with verified evidence."""
    engine = MatchingEngine()
    req = {
        "skill_id": "skill-fastapi",
        "canonical_name": "FastAPI Web Framework",
        "requirement_type": "core_required",
        "expected_level": "Practitioner",
        "expected_level_numeric": 3,
    }
    user_skills = {
        "skill-fastapi": {
            "competency_id": "comp-2",
            "canonical_name": "FastAPI Web Framework",
            "proficiency_level": "Practitioner",
            "proficiency_numeric": 3,
            "verification_status": "verified",
            "confidence": 0.95,
            "evidence_ids": ["ev-1", "ev-2"],
            "evidence_items": [{"id": "ev-1"}, {"id": "ev-2"}],
            "aliases": ["fastapi"],
        }
    }
    res = engine.evaluate_requirement(req, user_skills)
    assert res["proficiency_coverage"] == 100.0
    assert res["current_proficiency"] == "Practitioner"
    assert res["match_classification"] == "meets"
    assert res["match_status"] == "strong_match"
    assert "Requirement fully satisfied" in res["gap_explanation"]


def test_candidate_above_target_capped_coverage_with_surplus():
    """Advanced (4) vs Practitioner (3): capped at 100%, surplus clearly diagnosed."""
    engine = MatchingEngine()
    req = {
        "skill_id": "skill-docker",
        "canonical_name": "Docker & Containerization",
        "requirement_type": "supporting",
        "expected_level": "Practitioner",
        "expected_level_numeric": 3,
    }
    user_skills = {
        "skill-docker": {
            "competency_id": "comp-3",
            "canonical_name": "Docker & Containerization",
            "proficiency_level": "Advanced",
            "proficiency_numeric": 4,
            "verification_status": "verified",
            "confidence": 0.94,
            "evidence_ids": ["ev-3"],
            "evidence_items": [{"id": "ev-3"}],
            "aliases": ["docker"],
        }
    }
    res = engine.evaluate_requirement(req, user_skills)
    assert res["proficiency_coverage"] == 100.0
    assert res["exceeds_by"] == 1
    assert res["current_proficiency"] == "Advanced"
    assert res["match_classification"] == "meets"
    assert "+1 level surplus" in res["gap_explanation"]


def test_candidate_unverified_claim_at_target_no_contradiction():
    """Unverified candidate claim: diagnosis MUST NOT say 'Not Established' when level is Advanced."""
    engine = MatchingEngine()
    req = {
        "skill_id": "skill-api-integration",
        "canonical_name": "API Integration & Messaging",
        "requirement_type": "core_required",
        "expected_level": "Practitioner",
        "expected_level_numeric": 3,
    }
    user_skills = {
        "skill-api-integration": {
            "competency_id": "comp-4",
            "canonical_name": "API Integration & Messaging",
            "proficiency_level": "Advanced",
            "proficiency_numeric": 4,
            "verification_status": "candidate",
            "confidence": 0.90,
            "evidence_ids": ["ev-4"],
            "evidence_items": [{"id": "ev-4"}],
            "aliases": ["api integration"],
        }
    }
    res = engine.evaluate_requirement(req, user_skills)
    # Dimensions disentangled
    assert res["current_proficiency"] == "Advanced"
    assert res["verification_status"] == "candidate"
    assert res["confidence"] == 0.90
    assert res["proficiency_coverage"] == 100.0
    assert res["match_classification"] == "unverified"
    assert res["match_status"] == "evidence_gap"
    # Concrete verification: diagnosis MUST reflect Advanced (provisional claim), NEVER 'Not Established'
    assert "Not Established" not in res["gap_explanation"]
    assert "Demonstrated at Advanced (provisional claim)" in res["gap_explanation"]


def test_missing_skill_zero_coverage_no_contradiction():
    """Missing skill: 0% coverage, 0 artifacts, diagnosis reflects missing evidence without fake score."""
    engine = MatchingEngine()
    req = {
        "skill_id": "skill-kubernetes",
        "canonical_name": "Kubernetes Orchestration",
        "requirement_type": "core_required",
        "expected_level": "Practitioner",
        "expected_level_numeric": 3,
    }
    res = engine.evaluate_requirement(req, {})
    assert res["proficiency_coverage"] == 0.0
    assert res["current_proficiency"] == "Not Established"
    assert res["verification_status"] == "not_established"
    assert res["match_classification"] == "not_found"
    assert res["match_status"] == "missing_weak"
    assert len(res["evidence_ids"]) == 0
    assert "Not yet demonstrated in current Skill Passport evidence" in res["gap_explanation"]

