import os
import json
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from ml.retention_inference import RetentionInferenceEngine
from services.retention_service import RetentionService
from main import app

@pytest.fixture(scope="module")
def inference_engine():
    engine = RetentionInferenceEngine.get_instance()
    assert engine.is_ready(), "RetentionInferenceEngine failed to load model and scaler artifacts."
    return engine

@pytest.fixture(scope="module")
def retention_service():
    service = RetentionService.get_instance()
    return service

@pytest.fixture(scope="module")
def api_client():
    return TestClient(app)


# ============================================================
# 1. ARTIFACT INTEGRITY & CONFIGURATION TESTS
# ============================================================

def test_model_artifacts_exist():
    """Verify that required model artifacts are persisted and readable."""
    model_dir = "models/retention"
    assert os.path.exists(os.path.join(model_dir, "weibull_model.pkl")), "weibull_model.pkl is missing."
    assert os.path.exists(os.path.join(model_dir, "scaler.pkl")), "scaler.pkl is missing."
    assert os.path.exists(os.path.join(model_dir, "model_metadata.json")), "model_metadata.json is missing."

def test_model_metadata_structure():
    """Verify that metadata contains all expected fields and parameters."""
    with open("models/retention/model_metadata.json", "r") as f:
        meta = json.load(f)

    assert meta["model_type"] == "WeibullAFTFitter"
    assert "c_index" in meta
    assert meta["c_index"] >= 0.75, f"Model C-index ({meta['c_index']}) below acceptable threshold (0.75)"
    assert "features" in meta
    assert len(meta["features"]) == 9
    assert "coefficients" in meta
    assert len(meta["coefficients"]) >= 9


# ============================================================
# 2. MATHEMATICAL & PROBABILISTIC PROPERTIES
# ============================================================

def test_survival_probability_monotonicity(inference_engine):
    """
    Survival probability S(t) = P(T > t) must be monotonically non-increasing over time:
    S(30d) >= S(60d) >= S(90d) >= S(180d).
    Decay probability F(t) = 1 - S(t) must be monotonically non-decreasing.
    """
    mock_features = {
        'evidence_count_30d': 1.0,
        'evidence_count_90d': 2.0,
        'historical_mean': 55.0,
        'recent_vs_historical_change': -5.0,
        'slope_per_30d': -3.0,
        'source_diversity': 1.0,
        'maximum_evidence_gap': 60.0,
        'average_days_between_evidence': 30.0,
        'current_score': 50.0
    }

    pred = inference_engine.predict_from_features(mock_features)
    s_probs = pred['survival_probabilities']
    d_probs = pred['decay_probabilities']

    # Probabilities bounded in [0, 1]
    for h in ['30d', '60d', '90d', '180d']:
        assert 0.0 <= s_probs[h] <= 1.0, f"S({h}) out of bounds: {s_probs[h]}"
        assert 0.0 <= d_probs[h] <= 1.0, f"F({h}) out of bounds: {d_probs[h]}"
        # S(t) + F(t) must sum to 1.0 within floating point precision
        assert abs((s_probs[h] + d_probs[h]) - 1.0) < 0.01

    # Monotonicity checks
    assert s_probs['30d'] >= s_probs['60d'] - 1e-4, "Monotonicity violated: S(30d) < S(60d)"
    assert s_probs['60d'] >= s_probs['90d'] - 1e-4, "Monotonicity violated: S(60d) < S(90d)"
    assert s_probs['90d'] >= s_probs['180d'] - 1e-4, "Monotonicity violated: S(90d) < S(180d)"

    assert d_probs['30d'] <= d_probs['60d'] + 1e-4, "Monotonicity violated: F(30d) > F(60d)"
    assert d_probs['60d'] <= d_probs['90d'] + 1e-4, "Monotonicity violated: F(60d) > F(90d)"
    assert d_probs['90d'] <= d_probs['180d'] + 1e-4, "Monotonicity violated: F(90d) > F(180d)"


# ============================================================
# 3. DIRECTIONAL SENSITIVITY & INTERVENTION SANITY CHECKS
# ============================================================

def test_directional_sensitivity(inference_engine):
    """
    A high-performing, progressing learner must have lower decay risk than a declining learner.
    """
    declining_features = {
        'evidence_count_30d': 0.0,
        'evidence_count_90d': 1.0,
        'historical_mean': 50.0,
        'recent_vs_historical_change': -15.0,
        'slope_per_30d': -8.0,
        'source_diversity': 1.0,
        'maximum_evidence_gap': 80.0,
        'average_days_between_evidence': 45.0,
        'current_score': 35.0
    }

    progressing_features = {
        'evidence_count_30d': 4.0,
        'evidence_count_90d': 8.0,
        'historical_mean': 85.0,
        'recent_vs_historical_change': 6.0,
        'slope_per_30d': 5.0,
        'source_diversity': 3.0,
        'maximum_evidence_gap': 15.0,
        'average_days_between_evidence': 10.0,
        'current_score': 92.0
    }

    pred_declining = inference_engine.predict_from_features(declining_features)
    pred_progressing = inference_engine.predict_from_features(progressing_features)

    assert pred_declining['risk_score'] > pred_progressing['risk_score'], (
        f"Sensitivity violation: Declining risk ({pred_declining['risk_score']}) "
        f"is not higher than progressing risk ({pred_progressing['risk_score']})"
    )
    assert pred_progressing['expected_days_to_decay'] > pred_declining['expected_days_to_decay']

def test_counterfactual_simulation_reduces_risk(retention_service):
    """
    Simulating a successful intervention (high score assessment or project)
    must strictly reduce decay risk and increase expected survival time.
    """
    # Test on real learner from dataset
    sim_result = retention_service.simulate_action(
        learner_id='L000001',
        competency_id='Communication',
        action_type='project_outcome',
        simulated_score=95.0,
        days_from_now=0
    )

    assert 'error' not in sim_result
    assert sim_result['new_risk'] < sim_result['original_risk'], (
        f"Counterfactual simulation failed: new risk ({sim_result['new_risk']}) "
        f"not lower than original ({sim_result['original_risk']})"
    )
    assert sim_result['risk_delta'] < 0, "Risk delta should be negative for a risk reduction."
    assert sim_result['expected_days_gained'] >= 0, "Expected days gained must be non-negative."


# ============================================================
# 4. HELD-OUT TEST CONCORDANCE INDEX
# ============================================================

def test_model_performance_on_dataset():
    """Verify that the model maintains >= 0.78 C-index on sample survival data."""
    if not os.path.exists('derived_data/decay_survival_dataset.csv'):
        pytest.skip("Survival dataset not present for benchmark test.")

    from lifelines.utils import concordance_index
    import joblib

    model = joblib.load("models/retention/weibull_model.pkl")
    scaler = joblib.load("models/retention/scaler.pkl")

    with open("models/retention/model_metadata.json", "r") as f:
        meta = json.load(f)

    feats = meta['features']
    df = pd.read_csv('derived_data/decay_survival_dataset.csv', nrows=5000).fillna(0)

    X_scaled = pd.DataFrame(scaler.transform(df[feats]), columns=feats)
    t = np.maximum(np.where(df['decay_event'] == 1, df['days_to_decay'], df['future_observation_days']), 1.0)
    e = df['decay_event'].values

    predicted_medians = model.predict_median(X_scaled).values
    c_idx = concordance_index(t, predicted_medians, e)

    assert c_idx >= 0.78, f"C-index {c_idx:.4f} is lower than target 0.78."


# ============================================================
# 5. REST API END-TO-END TESTS
# ============================================================

def test_api_retention_endpoint(api_client):
    """Test GET /api/v1/learner/{id}/retention response schema and status."""
    res = api_client.get("/api/v1/learner/L000001/retention")
    assert res.status_code == 200
    data = res.json()

    assert "risk_score" in data
    assert "risk_level" in data
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert "survival_probabilities" in data
    assert "key_risk_factors" in data
    assert len(data["key_risk_factors"]) > 0

def test_api_simulate_endpoint(api_client):
    """Test POST /api/v1/learner/{id}/retention/simulate response schema and status."""
    payload = {
        "competency_id": "C05",
        "action_type": "project_outcome",
        "simulated_score": 90.0,
        "days_from_now": 0
    }
    res = api_client.post("/api/v1/learner/L000001/retention/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "original_risk" in data
    assert "new_risk" in data
    assert "risk_delta" in data
    assert data["risk_delta"] < 0
    assert "expected_days_gained" in data

def test_api_learners_endpoint(api_client):
    """Test GET /api/v1/learners returns list of sample learners."""
    res = api_client.get("/api/v1/learners?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "learners" in data
    assert len(data["learners"]) == 5
    assert "learner_id" in data["learners"][0]
