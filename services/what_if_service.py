"""What-If Learning Path Simulation Service.

Orchestrates counterfactual trajectory simulation by reusing the exact same
feature engineering pipeline and Weibull survival/trajectory inference engine.
"""
import uuid
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from ml.retention_inference import RetentionInferenceEngine
from services.retention_service import RetentionService, COMPETENCIES_MAP, COMPETENCY_NAME_TO_ID
from services.action_catalog import ActionCatalogService, CandidateAction
from services.counterfactual_builder import CounterfactualBuilder


def classify_trend(slope_per_30d: float) -> str:
    """Standardized 3-class trajectory momentum classifier."""
    if slope_per_30d > 1.5:
        return "improving"
    elif slope_per_30d < -1.5:
        return "declining"
    return "stagnating"


def calculate_freshness(days_since_last_evidence: float) -> float:
    """Calculates evidence freshness score (0.0 to 100.0%)."""
    return round(float(max(0.0, 1.0 - (days_since_last_evidence / 180.0)) * 100.0), 1)


class WhatIfSimulationService:
    """Authoritative service for What-If scenario simulations."""
    _instance = None

    def __init__(self):
        self.retention_service = RetentionService.get_instance()
        self.inference_engine = RetentionInferenceEngine.get_instance()
        self.catalog = ActionCatalogService.get_instance()

    @classmethod
    def get_instance(cls) -> "WhatIfSimulationService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def simulate(
        self,
        learner_id: str,
        competency_id: str,
        action_id: Optional[str] = None,
        quantity: int = 1,
        simulated_score: Optional[float] = None,
        days_from_now: int = 0,
        scenario_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Runs a What-If scenario against the learner's actual evidence sequence.
        """
        resolved_learner = self.retention_service.resolve_learner_id(learner_id)
        target_cid = COMPETENCY_NAME_TO_ID.get(competency_id, competency_id)

        # 1. Fetch real historical evidence
        actual_evidence = self.retention_service.get_learner_evidence(resolved_learner, target_cid)

        # 2. Check for sufficient evidence
        if not actual_evidence or len(actual_evidence) < 2:
            return {
                "success": False,
                "error": "Insufficient historical evidence for a reliable trajectory simulation.",
                "details": {
                    "learner_id": learner_id,
                    "competency_id": target_cid,
                    "evidence_count": len(actual_evidence) if actual_evidence else 0,
                    "minimum_required": 2
                }
            }

        # 3. Compute baseline trajectory & prediction through the SAME engine
        baseline_features = self.inference_engine.extract_features_from_trajectory(actual_evidence)
        baseline_pred = self.inference_engine.predict_from_features(baseline_features)

        baseline_slope = baseline_features.get("slope_per_30d", 0.0)
        baseline_trend = classify_trend(baseline_slope)
        baseline_days_since = baseline_features.get("days_since_last_evidence", 0.0)
        baseline_freshness = calculate_freshness(baseline_days_since)

        # Build baseline timeline trajectory points
        baseline_trajectory = [
            {
                "timestamp": str(r.get("timestamp")),
                "score": float(r.get("raw_score", 0.0)),
                "source": str(r.get("evidence_source", "")),
                "detail": str(r.get("source_detail", "")),
                "is_counterfactual": False
            }
            for r in sorted(actual_evidence, key=lambda x: str(x['timestamp']))
        ]

        # 4. Handle "No Action" (Baseline check / Equivalence)
        if not action_id or action_id.strip() == "" or action_id.lower() == "none":
            sim_id = f"SIM-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
            model_ver = self.inference_engine.metadata.get("model_type", "WeibullAFTFitter-v1")

            return {
                "success": True,
                "simulation_id": sim_id,
                "model_version": model_ver,
                "learner_id": learner_id,
                "competency_id": target_cid,
                "competency_name": COMPETENCIES_MAP.get(target_cid, target_cid),
                "scenario": {
                    "action_id": "none",
                    "action_name": "No Action (Baseline Reality)",
                    "quantity": 0,
                    "is_counterfactual": False
                },
                "baseline": {
                    "trend": baseline_trend,
                    "decay_risk": baseline_pred["risk_score"],
                    "decay_risk_percentage": baseline_pred["risk_percentage"],
                    "risk_level": baseline_pred["risk_level"],
                    "freshness": baseline_freshness,
                    "expected_days_to_decay": baseline_pred["expected_days_to_decay"],
                    "confidence": baseline_pred["confidence"],
                    "trajectory": baseline_trajectory
                },
                "projected": {
                    "trend": baseline_trend,
                    "decay_risk": baseline_pred["risk_score"],
                    "decay_risk_percentage": baseline_pred["risk_percentage"],
                    "risk_level": baseline_pred["risk_level"],
                    "freshness": baseline_freshness,
                    "expected_days_to_decay": baseline_pred["expected_days_to_decay"],
                    "confidence": baseline_pred["confidence"],
                    "trajectory": baseline_trajectory
                },
                "comparison": {
                    "trend_changed": False,
                    "previous_trend": baseline_trend,
                    "projected_trend": baseline_trend,
                    "risk_delta": 0.0,
                    "percentage_delta": 0.0,
                    "freshness_delta": 0.0,
                    "expected_days_gained": 0,
                    "trajectory_difference": []
                },
                "model_explanation": {
                    "inputs_changed": {},
                    "summary": "No counterfactual action introduced; projected trajectory is identical to baseline."
                },
                "disclaimer": "This is a model-based scenario projection, not a guaranteed outcome.",
                "limitations": self._get_limitations()
            }

        # 5. Retrieve action definition from catalog
        action = self.catalog.get_action(action_id)
        if not action:
            return {
                "success": False,
                "error": f"Unsupported or unknown action '{action_id}'.",
                "available_actions": [a.action_id for a in self.catalog.list_actions(target_cid)]
            }

        # 6. Build counterfactual sequence immutably
        combined_sequence, cf_events = CounterfactualBuilder.build_counterfactual_sequence(
            current_evidence=actual_evidence,
            action=action,
            quantity=quantity,
            simulated_score=simulated_score,
            days_from_now=days_from_now,
            scenario_date=scenario_date
        )

        # 7. Pass counterfactual sequence into the SAME feature engineering and model inference
        last_cf_ts = np.datetime64(str(cf_events[-1]['timestamp']))
        cf_snapshot_time = str(last_cf_ts + np.timedelta64(1, 'D'))

        projected_features = self.inference_engine.extract_features_from_trajectory(
            combined_sequence,
            snapshot_time=cf_snapshot_time
        )
        projected_pred = self.inference_engine.predict_from_features(projected_features)

        projected_slope = projected_features.get("slope_per_30d", 0.0)
        projected_trend = classify_trend(projected_slope)
        projected_days_since = projected_features.get("days_since_last_evidence", 0.0)
        projected_freshness = calculate_freshness(projected_days_since)

        # 8. Build projected trajectory points (real + counterfactual)
        projected_trajectory = [
            {
                "timestamp": str(r.get("timestamp")),
                "score": float(r.get("raw_score", 0.0)),
                "source": str(r.get("evidence_source", "")),
                "detail": str(r.get("source_detail", "")),
                "is_counterfactual": bool(r.get("is_counterfactual", False))
            }
            for r in combined_sequence
        ]

        # 9. Calculate deltas
        risk_delta = round(float(projected_pred["risk_score"] - baseline_pred["risk_score"]), 4)
        pct_delta = round(float(projected_pred["risk_percentage"] - baseline_pred["risk_percentage"]), 1)
        freshness_delta = round(float(projected_freshness - baseline_freshness), 1)
        days_gained = max(0, int(projected_pred["expected_days_to_decay"] - baseline_pred["expected_days_to_decay"]))
        trend_changed = (baseline_trend != projected_trend)

        # 10. Formulate model explanation grounded in feature deltas
        model_explanation = self._build_model_explanation(baseline_features, projected_features, action, quantity)

        sim_id = f"SIM-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        model_ver = self.inference_engine.metadata.get("model_type", "WeibullAFTFitter-v1")

        return {
            "success": True,
            "simulation_id": sim_id,
            "model_version": model_ver,
            "learner_id": learner_id,
            "competency_id": target_cid,
            "competency_name": COMPETENCIES_MAP.get(target_cid, target_cid),
            "scenario": {
                "action_id": action.action_id,
                "action_name": action.title,
                "category": action.category,
                "quantity": quantity,
                "simulated_score": simulated_score if simulated_score is not None else action.default_score,
                "is_counterfactual": True,
                "hypothetical_events_count": len(cf_events)
            },
            "baseline": {
                "trend": baseline_trend,
                "decay_risk": baseline_pred["risk_score"],
                "decay_risk_percentage": baseline_pred["risk_percentage"],
                "risk_level": baseline_pred["risk_level"],
                "freshness": baseline_freshness,
                "expected_days_to_decay": baseline_pred["expected_days_to_decay"],
                "confidence": baseline_pred["confidence"],
                "survival_probabilities": baseline_pred["survival_probabilities"],
                "trajectory": baseline_trajectory
            },
            "projected": {
                "trend": projected_trend,
                "decay_risk": projected_pred["risk_score"],
                "decay_risk_percentage": projected_pred["risk_percentage"],
                "risk_level": projected_pred["risk_level"],
                "freshness": projected_freshness,
                "expected_days_to_decay": projected_pred["expected_days_to_decay"],
                "confidence": projected_pred["confidence"],
                "survival_probabilities": projected_pred["survival_probabilities"],
                "trajectory": projected_trajectory
            },
            "comparison": {
                "trend_changed": trend_changed,
                "previous_trend": baseline_trend,
                "projected_trend": projected_trend,
                "risk_delta": risk_delta,
                "percentage_delta": pct_delta,
                "freshness_delta": freshness_delta,
                "expected_days_gained": days_gained,
                "trajectory_difference": [
                    {"event": e["source_detail"], "score": e["raw_score"], "date": e["timestamp"]}
                    for e in cf_events
                ]
            },
            "model_explanation": model_explanation,
            "disclaimer": "This is a model-based scenario projection, not a guaranteed outcome.",
            "limitations": self._get_limitations()
        }

    def _build_model_explanation(
        self,
        base_f: Dict[str, Any],
        proj_f: Dict[str, Any],
        action: CandidateAction,
        qty: int
    ) -> Dict[str, Any]:
        """Creates transparent, model-grounded explanations of input changes."""
        changes = {}
        tracked_keys = [
            ("days_since_last_evidence", "Days Since Last Evidence", "{:.0f}d"),
            ("evidence_count_30d", "Recent Practice Volume (30d)", "{:.0f}"),
            ("evidence_count_90d", "Quarterly Volume (90d)", "{:.0f}"),
            ("recent_vs_historical_change", "Recent vs Historical Performance Gap", "{:+.1f} pts"),
            ("slope_per_30d", "Trajectory Velocity (30d)", "{:+.1f} pts/month"),
            ("current_score", "Current Proficiency Score", "{:.1f}/100"),
            ("source_diversity", "Evidence Source Diversity", "{:.0f} types")
        ]

        for key, label, fmt in tracked_keys:
            bv = base_f.get(key, 0.0)
            pv = proj_f.get(key, 0.0)
            diff = pv - bv
            if abs(diff) > 0.01:
                changes[key] = {
                    "label": label,
                    "baseline": fmt.format(bv),
                    "projected": fmt.format(pv),
                    "delta": fmt.format(diff)
                }

        summary = (
            f"Scenario added {qty} hypothetical {action.category} event(s) ({action.title}). "
            f"This renewed evidence recency, increased rolling practice volume, and shifted "
            f"trajectory velocity from {base_f.get('slope_per_30d', 0.0):+.1f} to {proj_f.get('slope_per_30d', 0.0):+.1f} pts/month."
        )

        return {
            "inputs_changed": changes,
            "summary": summary
        }

    def _get_limitations(self) -> List[str]:
        return [
            "Projected trajectory is a scenario estimation derived from the trained Weibull AFT model.",
            "It does not guarantee individual mastery, physiological retention, or human performance.",
            "Skill decay risk reflects evidence recency and logged telemetry, not permanent skill loss.",
            "Activities performed outside connected platforms are not reflected in model telemetry."
        ]
