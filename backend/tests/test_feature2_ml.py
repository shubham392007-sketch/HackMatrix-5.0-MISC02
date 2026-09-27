"""Unit and Integration Tests for Feature 2: Continuous Competency Trajectory Engine.
Validates normalization, feature engineering, sequence builder, PyTorch LSTM model,
confidence & freshness calculation, explainability, What-If simulation, and FastAPI endpoints.
"""
from datetime import datetime, timezone, timedelta
import pytest
import numpy as np
import torch
from fastapi.testclient import TestClient

from backend.feature2.schemas import (
    CanonicalCompetencyEvidence,
    TrajectoryTrend,
    FreshnessState,
    WhatIfSimulationRequest,
)
from backend.feature2.features import TemporalFeatureExtractor, FEATURE_DIMENSION
from backend.feature2.preprocessor import EvidencePreprocessor
from backend.feature2.sequence_builder import CompetencySequenceBuilder, MIN_SEQUENCE_LENGTH, MAX_SEQUENCE_LENGTH
from backend.feature2.labels import TrajectoryLabelGenerator
from backend.feature2.lstm_model import CompetencyLSTM
from backend.feature2.freshness import compute_freshness
from backend.feature2.confidence import calculate_trajectory_confidence
from backend.feature2.service import Feature2InferenceService
from backend.feature2.what_if import WhatIfSimulator
from main import app

client = TestClient(app)


def create_sample_evidence_series(
    employee_id: str = "L000001",
    competency_id: str = "C01",
    trend_type: str = "improving",
    count: int = 5,
):
    base_time = datetime.now(timezone.utc) - timedelta(days=count * 10)
    items = []
    
    for i in range(count):
        t = base_time + timedelta(days=i * 10)
        if trend_type == "improving":
            score = 65.0 + i * 5.0  # 65, 70, 75, 80, 85
        elif trend_type == "declining":
            score = 85.0 - i * 5.0  # 85, 80, 75, 70, 65
        else:
            score = 75.0 + (i % 2) * 1.0  # 75, 76, 75, 76...
            
        ev = CanonicalCompetencyEvidence(
            evidence_id=f"ev_test_{i}",
            employee_id=employee_id,
            competency_id=competency_id,
            competency_name="Python Programming",
            timestamp=t,
            source="github" if i % 2 == 0 else "jira",
            source_type="commit" if i % 2 == 0 else "issue",
            source_reference=f"ref_{i}",
            title=f"Milestone event {i}",
            raw_score=score,
            evidence_strength=0.9,
            is_counterfactual=False,
        )
        items.append(ev)
    return items


class TestFeature2DataAndFeatures:
    """Tests normalization, feature extraction, and sequence building."""

    def test_preprocessor_sorting_and_deduplication(self):
        items = create_sample_evidence_series(count=4)
        # Shuffle order
        shuffled = [items[2], items[0], items[3], items[1], items[0]]  # includes duplicate
        cleaned = EvidencePreprocessor.deduplicate_evidence(shuffled)
        sorted_ev = EvidencePreprocessor.sort_chronologically(cleaned)

        assert len(sorted_ev) == 4
        for i in range(len(sorted_ev) - 1):
            assert sorted_ev[i].timestamp <= sorted_ev[i + 1].timestamp

    def test_feature_extractor_dimensions_and_causality(self):
        items = create_sample_evidence_series(count=4)
        extractor = TemporalFeatureExtractor()
        mat = extractor.transform_sequence(items)

        assert mat.shape == (4, FEATURE_DIMENSION)
        # Verify first event delta is 0.0 (no past history)
        assert mat[0, 4] == 0.0  # score_delta
        assert mat[0, 5] == 0.0  # cumulative_delta

    def test_insufficient_evidence_flag(self):
        # Sequence with only 2 events (< MIN_SEQUENCE_LENGTH = 3)
        items = create_sample_evidence_series(count=2)
        builder = CompetencySequenceBuilder()
        tensor, mask, insufficient = builder.build_inference_sequence(items)

        assert insufficient is True
        assert mask.sum() == 0

    def test_sufficient_evidence_sequence_tensor(self):
        items = create_sample_evidence_series(count=5)
        builder = CompetencySequenceBuilder()
        tensor, mask, insufficient = builder.build_inference_sequence(items)

        assert insufficient is False
        assert tensor.shape == (1, MAX_SEQUENCE_LENGTH, FEATURE_DIMENSION)
        assert mask.shape == (1, MAX_SEQUENCE_LENGTH)
        assert mask.sum() == 5
        # Verify pre-padding: last 5 elements are valid True
        assert np.all(mask[0, -5:] == True)
        assert np.all(mask[0, :-5] == False)


class TestPyTorchLSTMArchitecture:
    """Tests the PyTorch LSTM neural network forward and inference passes."""

    def test_lstm_forward_pass_and_attention(self):
        model = CompetencyLSTM(input_dim=8, hidden_dim=32, num_classes=3)
        dummy_input = torch.randn(2, 10, 8)
        dummy_mask = torch.ones(2, 10, dtype=torch.bool)
        dummy_mask[0, :5] = False  # sequence 0 has length 5

        logits = model(dummy_input, dummy_mask)
        assert logits.shape == (2, 3)

        probs, preds, attn_weights = model.predict_probabilities(dummy_input, dummy_mask)
        assert probs.shape == (2, 3)
        assert preds.shape == (2,)
        # Probabilities sum to 1.0 across classes
        np.testing.assert_allclose(probs.sum(axis=1), [1.0, 1.0], atol=1e-5)


class TestFreshnessAndConfidence:
    """Tests freshness decay and confidence scoring."""

    def test_freshness_states(self):
        now = datetime.now(timezone.utc)
        # Fresh (<= 30 days)
        state, days, factor, _ = compute_freshness(now - timedelta(days=10), now_utc=now)
        assert state == FreshnessState.FRESH
        assert days == 10
        assert factor > 0.85

        # Stale (> 90 days)
        state_stale, days_stale, factor_stale, _ = compute_freshness(now - timedelta(days=120), now_utc=now)
        assert state_stale == FreshnessState.STALE
        assert days_stale == 120
        assert factor_stale < 0.35

    def test_confidence_calibration(self):
        # Insufficient evidence gives 0.0 confidence
        conf_none, tier_none, _ = calculate_trajectory_confidence(
            top_class_prob=0.9, evidence_count=2, freshness_factor=1.0, insufficient_evidence=True
        )
        assert conf_none == 0.0
        assert tier_none == "none"

        # High confidence for good probability, count, and freshness
        conf_high, tier_high, factors = calculate_trajectory_confidence(
            top_class_prob=0.88, evidence_count=8, freshness_factor=0.95, insufficient_evidence=False
        )
        assert 0.70 <= conf_high <= 0.98
        assert tier_high == "high"


class TestFeature2ServiceAndWhatIf:
    """Tests full service inference and counterfactual simulation."""

    def test_service_prediction_and_explainability(self):
        service = Feature2InferenceService()
        pred = service.predict_competency_trajectory("L000001", "C01", persist=False)

        assert pred.employee_id == "L000001"
        assert pred.competency_id == "C01"
        assert pred.trend in [
            TrajectoryTrend.IMPROVING,
            TrajectoryTrend.STAGNATING,
            TrajectoryTrend.DECLINING,
            TrajectoryTrend.INSUFFICIENT_EVIDENCE,
        ]
        assert 0.0 <= pred.confidence <= 1.0
        assert pred.model_version is not None
        assert pred.explanation is not None

    def test_what_if_counterfactual_simulation(self):
        service = Feature2InferenceService()
        simulator = WhatIfSimulator(service)

        req = WhatIfSimulationRequest(
            employee_id="L000001",
            competency_id="C01",
            action_type="assessment",
            simulated_score=98.0,
            days_from_now=0,
            simulated_description="High score certification exam",
        )
        response = simulator.simulate(req)

        assert response.employee_id == "L000001"
        assert response.competency_id == "C01"
        assert response.baseline is not None
        assert response.projected is not None
        assert response.projected.is_simulated is True
        assert "improving" in response.probability_delta
        assert "Counterfactual projection" in response.disclaimer


class TestFeature2FastAPIEndpoints:
    """Tests the HTTP endpoints exposed on the FastAPI application."""

    def test_get_model_status(self):
        res = client.get("/api/v1/model/status")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "loaded"
        assert "CompetencyLSTM" in data["architecture"]["type"]

    def test_get_model_evaluation(self):
        res = client.get("/api/v1/model/evaluation")
        assert res.status_code == 200
        data = res.json()
        assert data["model_version"] == "feature2_lstm_v1"
        assert "accuracy" in data
        assert "confusion_matrix" in data
        assert data["accuracy"] > 0.70

    def test_get_employee_trajectories(self):
        res = client.get("/api/v1/trajectories/L000001")
        assert res.status_code == 200
        trajectories = res.json()
        assert isinstance(trajectories, list)
        if len(trajectories) > 0:
            assert "trend" in trajectories[0]
            assert "confidence" in trajectories[0]

    def test_post_what_if_simulation_endpoint(self):
        payload = {
            "employee_id": "L000001",
            "competency_id": "C01",
            "action_type": "project_outcome",
            "simulated_score": 92.0,
            "days_from_now": 7,
            "simulated_description": "Production release completed ahead of schedule"
        }
        res = client.post("/api/v1/trajectories/simulate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["employee_id"] == "L000001"
        assert "baseline" in data
        assert "projected" in data
        assert "probability_delta" in data
