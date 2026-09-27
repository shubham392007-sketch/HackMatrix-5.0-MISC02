"""Isolated Counterfactual What-If Simulator for Feature 2.
Allows employees and managers to explore hypothetical interventions
(e.g., scoring 90% on an assessment, delivering a project milestone)
by projecting trajectory impact through the exact same feature engineering
and PyTorch LSTM model without mutating production evidence.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import uuid
import torch

from backend.feature2.schemas import (
    WhatIfSimulationRequest,
    WhatIfSimulationResponse,
    CanonicalCompetencyEvidence,
    TrajectoryTrend,
    TrajectoryProbabilities,
    TrajectoryPrediction,
    FreshnessState,
)
from backend.feature2.service import Feature2InferenceService, LABEL_TO_TREND
from backend.feature2.preprocessor import EvidencePreprocessor
from backend.feature2.sequence_builder import MIN_SEQUENCE_LENGTH
from backend.feature2.freshness import compute_freshness
from backend.feature2.confidence import calculate_trajectory_confidence
from backend.feature2.explainability import generate_trajectory_explanation
from backend.core.logging import get_logger

logger = get_logger("feature2.what_if")


class WhatIfSimulator:
    """Simulates trajectory changes from hypothetical future actions."""

    def __init__(self, inference_service: Feature2InferenceService):
        self.service = inference_service

    def simulate(self, request: WhatIfSimulationRequest) -> WhatIfSimulationResponse:
        """
        Runs counterfactual simulation:
        1. Evaluates baseline trajectory using actual production evidence (without mutating DB).
        2. Clones the evidence sequence and appends a synthetic counterfactual event.
        3. Passes the counterfactual sequence through the exact same LSTM pipeline.
        4. Calculates deltas and returns comparative response.
        """
        # 1. Baseline prediction (without persisting during simulation)
        baseline = self.service.predict_competency_trajectory(
            employee_id=request.employee_id,
            competency_id=request.competency_id,
            persist=False,
        )

        # 2. Retrieve actual historical evidence
        evidence_list = self.service.adapter.get_employee_competency_evidence(
            request.employee_id, request.competency_id
        )
        clean_evidence = EvidencePreprocessor.sort_chronologically(
            EvidencePreprocessor.deduplicate_evidence(evidence_list)
        )

        # 3. Create transient synthetic counterfactual event
        now_utc = datetime.now(timezone.utc)
        simulated_time = now_utc + timedelta(days=request.days_from_now)

        sim_event = CanonicalCompetencyEvidence(
            evidence_id=f"sim_{uuid.uuid4().hex[:8]}",
            employee_id=request.employee_id,
            organization_id=baseline.organization_id,
            competency_id=request.competency_id,
            competency_name=baseline.competency_name,
            timestamp=simulated_time,
            source="simulation",
            source_type=request.action_type,
            source_reference=f"counterfactual_{request.action_type}",
            title=request.simulated_description or f"Simulated {request.action_type.title()}",
            content_summary=f"Counterfactual simulation with score {request.simulated_score:.1f}",
            evidence_strength=0.95,
            raw_score=request.simulated_score,
            is_counterfactual=True,
        )

        # 4. Clone and append to create the projected sequence
        projected_sequence: List[CanonicalCompetencyEvidence] = list(clean_evidence) + [sim_event]

        # 5. Evaluate projected sequence with identical sequence builder and model
        projected_prediction = self._evaluate_projected_sequence(
            sequence=projected_sequence,
            baseline=baseline,
            simulated_time=simulated_time,
        )

        # 6. Calculate deltas
        prob_delta = {
            "improving": round(
                projected_prediction.probabilities.improving - baseline.probabilities.improving, 4
            ),
            "stagnating": round(
                projected_prediction.probabilities.stagnating - baseline.probabilities.stagnating, 4
            ),
            "declining": round(
                projected_prediction.probabilities.declining - baseline.probabilities.declining, 4
            ),
        }
        confidence_delta = round(projected_prediction.confidence - baseline.confidence, 4)
        trend_changed = baseline.trend != projected_prediction.trend

        return WhatIfSimulationResponse(
            employee_id=request.employee_id,
            competency_id=request.competency_id,
            competency_name=baseline.competency_name,
            baseline=baseline,
            projected=projected_prediction,
            trend_changed=trend_changed,
            probability_delta=prob_delta,
            confidence_delta=confidence_delta,
            simulated_action={
                "action_type": request.action_type,
                "simulated_score": request.simulated_score,
                "days_from_now": request.days_from_now,
                "description": request.simulated_description,
            },
            disclaimer="Counterfactual projection generated by Feature 2 LSTM. Not saved to production evidence.",
        )

    def _evaluate_projected_sequence(
        self,
        sequence: List[CanonicalCompetencyEvidence],
        baseline: TrajectoryPrediction,
        simulated_time: datetime,
    ) -> TrajectoryPrediction:
        """Runs the sequence through Feature 2 LSTM for counterfactual prediction."""
        if len(sequence) < MIN_SEQUENCE_LENGTH:
            return TrajectoryPrediction(
                employee_id=baseline.employee_id,
                organization_id=baseline.organization_id,
                competency_id=baseline.competency_id,
                competency_name=baseline.competency_name,
                trend=TrajectoryTrend.INSUFFICIENT_EVIDENCE,
                probabilities=TrajectoryProbabilities(improving=0.0, stagnating=0.0, declining=0.0),
                confidence=0.0,
                freshness=FreshnessState.FRESH,
                days_since_last_evidence=0,
                evidence_count=len(sequence),
                last_evidence_at=simulated_time,
                first_evidence_at=sequence[0].timestamp if sequence else simulated_time,
                insufficient_evidence=True,
                model_version=self.service.metadata.get("model_version", "feature2_lstm_v1"),
                is_simulated=True,
                explanation="Still insufficient historical evidence (< 3 events) even with simulated action.",
            )

        tensor, mask, _ = self.service.seq_builder.build_inference_sequence(sequence)

        x_t = torch.tensor(tensor, dtype=torch.float32)
        mask_t = torch.tensor(mask, dtype=torch.bool)

        probs_np, preds_np, _ = self.service.model.predict_probabilities(x_t, mask_t)
        probs_row = probs_np[0]
        pred_label = int(preds_np[0])

        trend = LABEL_TO_TREND.get(pred_label, TrajectoryTrend.STAGNATING)
        probs_obj = TrajectoryProbabilities(
            declining=float(round(probs_row[0], 4)),
            stagnating=float(round(probs_row[1], 4)),
            improving=float(round(probs_row[2], 4)),
        )

        freshness_state, days_since, freshness_factor, _ = compute_freshness(simulated_time)
        top_prob = float(probs_row[pred_label])

        confidence, _, _ = calculate_trajectory_confidence(
            top_class_prob=top_prob,
            evidence_count=len(sequence),
            freshness_factor=freshness_factor,
            evidence_sequence=sequence,
            insufficient_evidence=False,
        )

        explanation_data = generate_trajectory_explanation(
            competency_name=baseline.competency_name,
            trend=trend,
            probabilities=probs_obj,
            confidence=confidence,
            freshness=freshness_state,
            days_since=days_since,
            evidence_sequence=sequence,
            insufficient_evidence=False,
        )

        return TrajectoryPrediction(
            employee_id=baseline.employee_id,
            organization_id=baseline.organization_id,
            competency_id=baseline.competency_id,
            competency_name=baseline.competency_name,
            trend=trend,
            probabilities=probs_obj,
            confidence=confidence,
            freshness=freshness_state,
            days_since_last_evidence=days_since,
            evidence_count=len(sequence),
            last_evidence_at=simulated_time,
            first_evidence_at=sequence[0].timestamp,
            insufficient_evidence=False,
            model_version=self.service.metadata.get("model_version", "feature2_lstm_v1"),
            supporting_evidence_ids=explanation_data["supporting_evidence_ids"],
            supporting_evidence_titles=explanation_data["supporting_evidence_titles"],
            explanation=f"[SIMULATION] {explanation_data['explanation']}",
            is_simulated=True,
        )
