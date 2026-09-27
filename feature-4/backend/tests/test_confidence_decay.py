"""Unit and integration tests for Enhancement 8.5: Evidence Staleness & Confidence Decay."""
import pytest
from fastapi.testclient import TestClient

from backend.services.confidence_decay_service import ConfidenceDecayService
from backend.utils.evidence_utils import (
    calculate_freshness,
    classify_freshness_state,
    calculate_confidence_bands
)
import main

client = TestClient(main.app)


def test_freshness_calculation():
    """Verify linear decay of freshness based on elapsed days."""
    assert calculate_freshness(0.0) == 100.0
    assert calculate_freshness(90.0) == 50.0
    assert calculate_freshness(180.0) == 0.0
    assert calculate_freshness(250.0) == 0.0


def test_freshness_state_classification():
    """Verify three-tier freshness state mapping."""
    assert classify_freshness_state(95.0) == "Fresh"
    assert classify_freshness_state(75.0) == "Fresh"
    assert classify_freshness_state(60.0) == "Aging"
    assert classify_freshness_state(40.0) == "Aging"
    assert classify_freshness_state(30.0) == "Stale"
    assert classify_freshness_state(0.0) == "Stale"


def test_uncertainty_band_widening():
    """Verify uncertainty bands widen as confidence drops."""
    high_conf_upper, high_conf_lower = calculate_confidence_bands(80.0, 0.95)
    low_conf_upper, low_conf_lower = calculate_confidence_bands(80.0, 0.40)

    high_conf_spread = high_conf_upper - high_conf_lower
    low_conf_spread = low_conf_upper - low_conf_lower

    # Lower confidence must produce wider uncertainty bands
    assert low_conf_spread > high_conf_spread


def test_confidence_decay_service_output():
    """Verify ConfidenceDecayService constructs timeline with observed and projected points."""
    service = ConfidenceDecayService()
    res = service.compute_confidence_decay("L000001", "C05")

    assert res.learner_id in ["L000001", "shubham_pokale"]
    assert res.competency_id == "C05"
    assert res.current_trend in ["improving", "stagnating", "declining"]
    assert 0.0 <= res.current_confidence <= 1.0
    assert 0.0 <= res.freshness_percentage <= 100.0
    assert res.freshness_state in ["Fresh", "Aging", "Stale"]

    # Verify timeline has both observed and projected points
    observed_pts = [p for p in res.timeline if p.is_observed]
    projected_pts = [p for p in res.timeline if not p.is_observed]
    assert len(observed_pts) >= 1
    assert len(projected_pts) >= 1

    # Verify uncertainty envelope properties
    for pt in res.timeline:
        assert pt.band_lower <= pt.score <= pt.band_upper

    # Verify safeguard text presence
    assert "telemetry staleness" in res.safeguard_note.lower()


def test_confidence_decay_api_endpoint():
    """Verify /api/v1/feature4/confidence-decay endpoint response."""
    response = client.get("/api/v1/feature4/confidence-decay/L000001/C05")
    assert response.status_code == 200
    data = response.json()
    assert "freshness_state" in data
    assert "timeline" in data
    assert len(data["timeline"]) > 0
    assert "safeguard_note" in data
