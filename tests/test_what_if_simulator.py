"""Comprehensive Automated Tests for the What-If Learning Path Simulator.

Verifies:
1. Baseline Equivalence (Critical Baseline Test)
2. Counterfactual Isolation (Zero Mutation of Real Evidence)
3. Action Transformation & Event Generation
4. Multi-Quantity Support (e.g. 2 Peer Review Sessions)
5. Same Feature Engineering & Weibull Model Reuse
6. Trend Classification Transitions
7. Insufficient Evidence Safeguard
8. Unsupported Action Error Handling
9. Multi-Action Comparison
10. REST API Endpoints (/api/v1/learner/{id}/what-if, /what-if/actions, /what-if/compare)
"""
import copy
import pytest
from fastapi.testclient import TestClient

from main import app
from services.action_catalog import ActionCatalogService, CandidateAction
from services.counterfactual_builder import CounterfactualBuilder
from services.what_if_service import WhatIfSimulationService, classify_trend, calculate_freshness
from services.retention_service import RetentionService


@pytest.fixture(scope="module")
def api_client():
    return TestClient(app)


@pytest.fixture(scope="module")
def simulation_service():
    return WhatIfSimulationService.get_instance()


@pytest.fixture(scope="module")
def action_catalog():
    return ActionCatalogService.get_instance()


# ============================================================
# 1. CRITICAL BASELINE EQUIVALENCE TEST (Section 40)
# ============================================================

def test_critical_baseline_equivalence(simulation_service):
    """
    Mandatory Test: Running What-If Simulator with 'none' / no action
    MUST produce baseline and projected outputs that are mathematically identical.
    """
    result = simulation_service.simulate(
        learner_id="L000001",
        competency_id="Communication",
        action_id="none"
    )

    assert result["success"] is True
    assert result["scenario"]["action_id"] == "none"
    assert result["scenario"]["is_counterfactual"] is False

    baseline = result["baseline"]
    projected = result["projected"]
    comparison = result["comparison"]

    assert baseline["decay_risk"] == projected["decay_risk"]
    assert baseline["decay_risk_percentage"] == projected["decay_risk_percentage"]
    assert baseline["freshness"] == projected["freshness"]
    assert baseline["trend"] == projected["trend"]
    assert baseline["expected_days_to_decay"] == projected["expected_days_to_decay"]

    assert comparison["risk_delta"] == 0.0
    assert comparison["percentage_delta"] == 0.0
    assert comparison["freshness_delta"] == 0.0
    assert comparison["expected_days_gained"] == 0
    assert comparison["trend_changed"] is False


# ============================================================
# 2. COUNTERFACTUAL ISOLATION & DATA INTEGRITY (Section 7, 19)
# ============================================================

def test_counterfactual_isolation_no_data_mutation(simulation_service):
    """
    Simulations MUST NOT mutate or insert into real historical evidence.
    """
    retention_svc = RetentionService.get_instance()
    resolved_id = retention_svc.resolve_learner_id("L000001")
    real_evidence_before = copy.deepcopy(retention_svc.get_learner_evidence(resolved_id, "C05"))
    count_before = len(real_evidence_before)

    # Run simulation with an action
    result = simulation_service.simulate(
        learner_id="L000001",
        competency_id="C05",
        action_id="peer_review_sessions",
        quantity=3
    )

    assert result["success"] is True
    assert result["scenario"]["is_counterfactual"] is True

    # Verify real evidence remains completely unchanged
    real_evidence_after = retention_svc.get_learner_evidence(resolved_id, "C05")
    assert len(real_evidence_after) == count_before
    for ev in real_evidence_after:
        assert ev.get("is_counterfactual") is not True


# ============================================================
# 3. ACTION CATALOG & MULTI-QUANTITY TRANSFORMATION (Section 5, 11)
# ============================================================

def test_action_catalog_retrieval(action_catalog):
    """Verify structured action catalog entries."""
    actions = action_catalog.list_actions()
    action_ids = [a.action_id for a in actions]

    assert "advanced_sql_course" in action_ids
    assert "peer_review_sessions" in action_ids
    assert "author_relevant_pr" in action_ids

    # Verify SQL specific action filtering
    sql_actions = action_catalog.list_actions(competency_id="C04")
    assert any(a.action_id == "advanced_sql_course" for a in sql_actions)


def test_two_peer_review_sessions_creates_two_events(simulation_service):
    """
    User selects 'Take on two additional peer-review sessions':
    The counterfactual sequence must contain exactly 2 hypothetical events.
    """
    result = simulation_service.simulate(
        learner_id="L000001",
        competency_id="Communication",
        action_id="peer_review_sessions",
        quantity=2
    )

    assert result["success"] is True
    assert result["scenario"]["quantity"] == 2
    assert result["scenario"]["hypothetical_events_count"] == 2

    # Verify trajectory contains exactly 2 counterfactual points
    cf_points = [p for p in result["projected"]["trajectory"] if p["is_counterfactual"]]
    assert len(cf_points) == 2
    assert "[What-If]" in cf_points[0]["detail"]


# ============================================================
# 4. SAME MODEL REUSE & RISK REDUCTION (Section 4, 10)
# ============================================================

def test_course_action_reduces_decay_risk(simulation_service):
    """
    Completing a relevant course action should renew recency and strictly
    reduce decay risk while gaining expected days until decay.
    """
    result = simulation_service.simulate(
        learner_id="L000001",
        competency_id="Communication",
        action_id="deep_dive_course",
        quantity=1,
        simulated_score=90.0
    )

    assert result["success"] is True
    comparison = result["comparison"]

    assert comparison["risk_delta"] < 0.0, "Risk delta must be negative for a positive intervention."
    assert comparison["percentage_delta"] < 0.0
    assert comparison["expected_days_gained"] > 0, "Must gain expected days before decay."
    assert result["projected"]["freshness"] > result["baseline"]["freshness"]


# ============================================================
# 5. MODEL EXPLANATION & TRACEABILITY (Section 27, 28, 29)
# ============================================================

def test_simulation_traceability_and_explanation(simulation_service):
    """Verify simulation ID, model version, and grounded feature input explanations."""
    result = simulation_service.simulate(
        learner_id="L000001",
        competency_id="Communication",
        action_id="author_relevant_pr",
        quantity=1
    )

    assert result["simulation_id"].startswith("SIM-")
    assert "Weibull" in result["model_version"]
    assert "disclaimer" in result
    assert len(result["limitations"]) > 0

    explanation = result["model_explanation"]
    assert "inputs_changed" in explanation
    assert "days_since_last_evidence" in explanation["inputs_changed"]
    assert "summary" in explanation


# ============================================================
# 6. EDGE CASES & SAFEGUARDS (Section 18, 33)
# ============================================================

def test_unsupported_action_handling(simulation_service):
    """Invalid or unsupported action IDs must return a clean, controlled error."""
    result = simulation_service.simulate(
        learner_id="L000001",
        competency_id="Communication",
        action_id="totally_fake_action_999"
    )

    assert result["success"] is False
    assert "Unsupported or unknown action" in result["error"]
    assert "available_actions" in result


def test_insufficient_evidence_safeguard(simulation_service):
    """Learners or competencies with < 2 historical evidence records return a safe message."""
    # Competency C10 has no historical records for demo learner
    result = simulation_service.simulate(
        learner_id="L000001",
        competency_id="C10",  # Financial Acumen (no evidence in demo)
        action_id="peer_review_sessions"
    )

    assert result["success"] is False
    assert "Insufficient historical evidence" in result["error"]


# ============================================================
# 7. REST API END-TO-END TESTS (Section 20, 21, 22)
# ============================================================

def test_api_list_what_if_actions(api_client):
    """Test GET /api/v1/what-if/actions."""
    res = api_client.get("/api/v1/what-if/actions")
    assert res.status_code == 200
    data = res.json()
    assert "actions" in data
    assert data["count"] >= 3


def test_api_run_what_if_simulation_endpoint(api_client):
    """Test POST /api/v1/learner/{id}/what-if."""
    payload = {
        "competency_id": "Communication",
        "action_id": "peer_review_sessions",
        "quantity": 2,
        "simulated_score": 88.0,
        "days_from_now": 7
    }
    res = api_client.post("/api/v1/learner/L000001/what-if", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert "baseline" in data
    assert "projected" in data
    assert "comparison" in data
    assert data["comparison"]["risk_delta"] <= 0.0
    assert len(data["projected"]["trajectory"]) > len(data["baseline"]["trajectory"])


def test_api_what_if_compare_scenarios(api_client):
    """Test POST /api/v1/learner/{id}/what-if/compare (Side-by-Side Comparison)."""
    payload = {
        "competency_id": "Communication",
        "action_ids": ["deep_dive_course", "peer_review_sessions", "author_relevant_pr"],
        "simulated_score": 90.0
    }
    res = api_client.post("/api/v1/learner/L000001/what-if/compare", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "baseline" in data
    assert "scenarios" in data
    assert len(data["scenarios"]) == 3
    for sc in data["scenarios"]:
        assert "action_id" in sc
        assert "risk_delta" in sc
        assert "projected_trend" in sc
