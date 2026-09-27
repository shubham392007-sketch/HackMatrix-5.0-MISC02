"""Feature 2 Inference & Trajectory Service.
Orchestrates end-to-end prediction: evidence retrieval, sequence preprocessing,
LSTM inference, confidence & freshness calculation, explainability,
and Supabase PostgreSQL persistence.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import numpy as np
import torch

from backend.feature2.schemas import (
    CanonicalCompetencyEvidence,
    TrajectoryTrend,
    TrajectoryProbabilities,
    TrajectoryPrediction,
    FreshnessState,
)
from backend.feature2.adapter import Feature1EvidenceAdapter
from backend.feature2.preprocessor import EvidencePreprocessor
from backend.feature2.sequence_builder import CompetencySequenceBuilder, MIN_SEQUENCE_LENGTH
from backend.feature2.model_registry import get_or_load_model
from backend.feature2.freshness import compute_freshness
from backend.feature2.confidence import calculate_trajectory_confidence
from backend.feature2.explainability import generate_trajectory_explanation
from backend.db.client import get_supabase_client
from backend.core.logging import get_logger

logger = get_logger("feature2.service")

LABEL_TO_TREND = {
    0: TrajectoryTrend.DECLINING,
    1: TrajectoryTrend.STAGNATING,
    2: TrajectoryTrend.IMPROVING,
}


class Feature2InferenceService:
    """Core service for continuous competency trajectory inference."""

    def __init__(self):
        self.adapter = Feature1EvidenceAdapter()
        self.seq_builder = CompetencySequenceBuilder(min_length=MIN_SEQUENCE_LENGTH)
        self.model, self.metadata = get_or_load_model()

    def predict_competency_trajectory(
        self,
        employee_id: str,
        competency_id: str,
        persist: bool = True,
    ) -> TrajectoryPrediction:
        """
        Calculates the authoritative trajectory prediction for a single competency of an employee.
        """
        # 1. Fetch chronological evidence from Feature 1 sources (DB + dataset)
        evidence_list = self.adapter.get_employee_competency_evidence(employee_id, competency_id)

        # 2. Normalize and order chronologically
        clean_evidence = EvidencePreprocessor.sort_chronologically(
            EvidencePreprocessor.deduplicate_evidence(evidence_list)
        )

        competency_name = clean_evidence[0].competency_name if clean_evidence else competency_id.replace("_", " ").title()
        org_id = clean_evidence[0].organization_id if clean_evidence else None

        # 3. Check for Insufficient Evidence
        if len(clean_evidence) < MIN_SEQUENCE_LENGTH:
            freshness_state, days_since, freshness_factor, _ = compute_freshness(
                clean_evidence[-1].timestamp if clean_evidence else None
            )
            explanation_data = generate_trajectory_explanation(
                competency_name=competency_name,
                trend=TrajectoryTrend.INSUFFICIENT_EVIDENCE,
                probabilities=TrajectoryProbabilities(improving=0.0, stagnating=0.0, declining=0.0),
                confidence=0.0,
                freshness=freshness_state,
                days_since=days_since,
                evidence_sequence=clean_evidence,
                insufficient_evidence=True,
            )

            prediction = TrajectoryPrediction(
                employee_id=employee_id,
                organization_id=org_id,
                competency_id=competency_id,
                competency_name=competency_name,
                trend=TrajectoryTrend.INSUFFICIENT_EVIDENCE,
                probabilities=TrajectoryProbabilities(improving=0.0, stagnating=0.0, declining=0.0),
                confidence=0.0,
                freshness=freshness_state,
                days_since_last_evidence=days_since,
                evidence_count=len(clean_evidence),
                last_evidence_at=clean_evidence[-1].timestamp if clean_evidence else None,
                first_evidence_at=clean_evidence[0].timestamp if clean_evidence else None,
                insufficient_evidence=True,
                model_version=self.metadata.get("model_version", "feature2_lstm_v1"),
                supporting_evidence_ids=explanation_data["supporting_evidence_ids"],
                supporting_evidence_titles=explanation_data["supporting_evidence_titles"],
                explanation=explanation_data["explanation"],
            )

            if persist:
                self._persist_prediction(prediction)
            return prediction

        # 4. Sequence Building
        tensor, mask, insufficient = self.seq_builder.build_inference_sequence(clean_evidence)
        if insufficient:
            # Fallback defensively
            return self.predict_competency_trajectory(employee_id, competency_id, persist=False)

        # 5. PyTorch LSTM Inference
        x_t = torch.tensor(tensor, dtype=torch.float32)
        mask_t = torch.tensor(mask, dtype=torch.bool)

        probs_np, preds_np, _ = self.model.predict_probabilities(x_t, mask_t)
        probs_row = probs_np[0]
        pred_label = int(preds_np[0])

        trend = LABEL_TO_TREND.get(pred_label, TrajectoryTrend.STAGNATING)
        probs_obj = TrajectoryProbabilities(
            declining=float(round(probs_row[0], 4)),
            stagnating=float(round(probs_row[1], 4)),
            improving=float(round(probs_row[2], 4)),
        )

        # 6. Freshness & Confidence
        last_ev_time = clean_evidence[-1].timestamp
        freshness_state, days_since, freshness_factor, _ = compute_freshness(last_ev_time)
        top_prob = float(probs_row[pred_label])

        confidence, tier, _ = calculate_trajectory_confidence(
            top_class_prob=top_prob,
            evidence_count=len(clean_evidence),
            freshness_factor=freshness_factor,
            evidence_sequence=clean_evidence,
            insufficient_evidence=False,
        )

        # 7. Explainability
        explanation_data = generate_trajectory_explanation(
            competency_name=competency_name,
            trend=trend,
            probabilities=probs_obj,
            confidence=confidence,
            freshness=freshness_state,
            days_since=days_since,
            evidence_sequence=clean_evidence,
            insufficient_evidence=False,
        )

        # 8. Create Final TrajectoryPrediction
        prediction = TrajectoryPrediction(
            employee_id=employee_id,
            organization_id=org_id,
            competency_id=competency_id,
            competency_name=competency_name,
            trend=trend,
            probabilities=probs_obj,
            confidence=confidence,
            freshness=freshness_state,
            days_since_last_evidence=days_since,
            evidence_count=len(clean_evidence),
            last_evidence_at=last_ev_time,
            first_evidence_at=clean_evidence[0].timestamp,
            insufficient_evidence=False,
            model_version=self.metadata.get("model_version", "feature2_lstm_v1"),
            supporting_evidence_ids=explanation_data["supporting_evidence_ids"],
            supporting_evidence_titles=explanation_data["supporting_evidence_titles"],
            explanation=explanation_data["explanation"],
        )

        if persist:
            self._persist_prediction(prediction)

        return prediction

    def predict_employee_trajectories(
        self,
        employee_id: str,
        persist: bool = True,
    ) -> List[TrajectoryPrediction]:
        """
        Evaluates and returns all competency trajectories for an employee independently.
        Never collapses into a single aggregate score.
        """
        competency_ids = self.adapter.get_employee_competencies(employee_id)
        if not competency_ids:
            logger.info(f"No registered competencies found for employee {employee_id}")
            return []

        predictions = []
        for comp_id in competency_ids:
            pred = self.predict_competency_trajectory(employee_id, comp_id, persist=persist)
            predictions.append(pred)

        return predictions

    def _persist_prediction(self, prediction: TrajectoryPrediction) -> None:
        """Upserts trajectory prediction into Supabase PostgreSQL."""
        try:
            supabase = get_supabase_client()
            record = {
                "employee_id": prediction.employee_id,
                "organization_id": prediction.organization_id,
                "competency_id": prediction.competency_id,
                "competency_name": prediction.competency_name,
                "trend": prediction.trend.value,
                "improving_probability": prediction.probabilities.improving,
                "stagnating_probability": prediction.probabilities.stagnating,
                "declining_probability": prediction.probabilities.declining,
                "confidence": prediction.confidence,
                "freshness_state": prediction.freshness.value,
                "days_since_last_evidence": prediction.days_since_last_evidence,
                "evidence_count": prediction.evidence_count,
                "last_evidence_at": prediction.last_evidence_at.isoformat() if prediction.last_evidence_at else None,
                "first_evidence_at": prediction.first_evidence_at.isoformat() if prediction.first_evidence_at else None,
                "insufficient_evidence": prediction.insufficient_evidence,
                "model_version": prediction.model_version,
                "supporting_evidence_ids": prediction.supporting_evidence_ids,
                "supporting_evidence_titles": prediction.supporting_evidence_titles,
                "explanation": prediction.explanation,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            # Upsert on conflict (employee_id, competency_id)
            supabase.table("competency_trajectories").upsert(
                record, on_conflict="employee_id,competency_id"
            ).execute()
            logger.debug(f"Persisted trajectory for {prediction.employee_id}:{prediction.competency_id}")
        except Exception as e:
            logger.error(f"Failed to persist trajectory to Supabase: {e}")
