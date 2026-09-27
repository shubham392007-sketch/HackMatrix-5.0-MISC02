"""Counterfactual Evidence Builder.

Constructs immutable hypothetical evidence sequences from candidate actions
without modifying actual employee historical evidence records.
"""
import copy
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple, Optional

from services.action_catalog import CandidateAction


class CounterfactualBuilder:
    """Safely builds isolated hypothetical evidence sequences for What-If simulations."""

    @staticmethod
    def build_counterfactual_sequence(
        current_evidence: List[Dict[str, Any]],
        action: CandidateAction,
        quantity: int = 1,
        simulated_score: Optional[float] = None,
        days_from_now: int = 0,
        scenario_date: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Creates an immutable counterfactual sequence.

        Returns:
            (combined_evidence_sequence, counterfactual_events_only)
        """
        if quantity < 1:
            quantity = 1

        # 1. Immutable clone of real evidence
        immutable_baseline = copy.deepcopy(current_evidence)
        sorted_baseline = sorted(immutable_baseline, key=lambda x: str(x['timestamp']))

        learner_id = sorted_baseline[0].get('learner_id', 'L_SIM') if sorted_baseline else 'L_SIM'
        competency_id = sorted_baseline[0].get('competency_id', 'C01') if sorted_baseline else 'C01'

        # 2. Determine base timestamp for hypothetical action
        if scenario_date:
            try:
                base_dt = datetime.fromisoformat(scenario_date.replace("Z", "+00:00"))
            except Exception:
                base_dt = datetime.now(timezone.utc)
        elif sorted_baseline:
            last_dt_str = str(sorted_baseline[-1]['timestamp'])
            try:
                # Handle YYYY-MM-DD or ISO format
                if len(last_dt_str) == 10:
                    base_dt = datetime.strptime(last_dt_str, "%Y-%m-%d")
                else:
                    base_dt = datetime.fromisoformat(last_dt_str.replace("Z", "+00:00"))
            except Exception:
                base_dt = datetime.now(timezone.utc)
            base_dt = base_dt + timedelta(days=max(0, days_from_now))
        else:
            base_dt = datetime.now(timezone.utc) + timedelta(days=max(0, days_from_now))

        score = float(simulated_score) if simulated_score is not None else float(action.default_score)
        # Ensure score bounds
        score = float(np.clip(score, 0.0, 100.0))

        counterfactual_events: List[Dict[str, Any]] = []

        # 3. Generate N hypothetical events (staggered slightly if quantity > 1)
        for i in range(quantity):
            event_dt = base_dt + timedelta(days=i * 3)
            event_ts_str = event_dt.strftime("%Y-%m-%d")

            cf_event = {
                "evidence_id": f"CF_{action.action_id}_{i+1}_{int(event_dt.timestamp())}",
                "learner_id": learner_id,
                "competency_id": competency_id,
                "evidence_source": action.evidence_source,
                "source_detail": f"[What-If] {action.title} (Session {i+1} of {quantity})",
                "timestamp": event_ts_str,
                "raw_score": score,
                "source_confidence_weight": action.source_confidence_weight,
                "is_counterfactual": True,
                "action_id": action.action_id,
            }
            counterfactual_events.append(cf_event)

        # 4. Return combined sequence (baseline + hypothetical events)
        combined_sequence = immutable_baseline + counterfactual_events
        # Sort combined sequence chronologically
        combined_sequence.sort(key=lambda x: str(x['timestamp']))

        return combined_sequence, counterfactual_events
