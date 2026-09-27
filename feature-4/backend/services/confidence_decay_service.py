"""Service for computing evidence staleness, confidence decay, and trajectory uncertainty bands."""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import numpy as np
import pandas as pd

from services.retention_service import RetentionService, COMPETENCIES_MAP, COMPETENCY_NAME_TO_ID
from ..schemas.confidence_schema import ConfidenceTimelinePoint, ConfidenceDecayResponse
from ..utils.evidence_utils import calculate_freshness, classify_freshness_state, calculate_confidence_bands, get_trend_icon
from ..utils.date_utils import parse_date_str


class ConfidenceDecayService:
    """Computes evidence freshness, 4-factor confidence decay, and expanding uncertainty envelopes."""

    def __init__(self, retention_service: Optional[RetentionService] = None):
        self.retention_service = retention_service or RetentionService.get_instance()
        self.engine = self.retention_service.engine

    def compute_confidence_decay(
        self,
        learner_id: str,
        competency_id: str
    ) -> ConfidenceDecayResponse:
        """
        Calculates longitudinal confidence points and forward projections with widening uncertainty bands.
        """
        resolved_id = self.retention_service.resolve_learner_id(learner_id)
        cid = COMPETENCY_NAME_TO_ID.get(competency_id, competency_id)
        comp_name = COMPETENCIES_MAP.get(cid, cid)

        evidence = self.retention_service.get_learner_evidence(resolved_id, cid)

        if not evidence or len(evidence) < 1:
            # Empty / cold start fallback
            return ConfidenceDecayResponse(
                learner_id=resolved_id,
                competency_id=cid,
                competency_name=comp_name,
                current_trend="stagnating",
                current_confidence=0.50,
                days_since_last_evidence=180,
                freshness_percentage=0.0,
                freshness_state="Stale",
                last_evidence_timestamp=None,
                timeline=[],
                methodology={
                    "model": "4-Factor Telemetry Confidence (Volume, Diversity, Recency, Stability)",
                    "weights": {"volume": 0.25, "diversity": 0.25, "recency": 0.25, "stability": 0.25}
                }
            )

        sorted_ev = sorted(evidence, key=lambda x: str(x.get("timestamp", "")))
        last_item = sorted_ev[-1]
        last_dt = parse_date_str(str(last_item.get("timestamp", "")))

        # Evaluate model features using existing engine
        features = self.engine.extract_features_from_trajectory(sorted_ev)
        slope = float(features.get("slope_per_30d", 0.0))
        days_since = float(features.get("days_since_last_evidence", 15.0))
        base_confidence = float(features.get("prediction_confidence", 0.85))

        # Trend classification
        if slope > 0.4:
            current_trend = "improving"
        elif slope < -0.4:
            current_trend = "declining"
        else:
            current_trend = "stagnating"

        freshness_pct = calculate_freshness(days_since)
        freshness_state = classify_freshness_state(freshness_pct)

        # Build timeline of observed points
        timeline: List[ConfidenceTimelinePoint] = []
        cum_sources = set()

        for idx, item in enumerate(sorted_ev):
            t_str = str(item.get("timestamp"))[:10]
            score = float(item.get("raw_score", 70.0))
            cum_sources.add(str(item.get("evidence_source", "verified")))

            # Factor approximations for historical point
            pt_vol = min(1.0, (idx + 1) / 4.0)
            pt_div = min(1.0, len(cum_sources) / 3.0)
            pt_rec = 1.0  # Fresh at the moment of capture
            pt_stab = 0.90
            pt_conf = round(float(np.mean([pt_vol, pt_div, pt_rec, pt_stab])), 2)

            band_upper, band_lower = calculate_confidence_bands(score, pt_conf)

            timeline.append(ConfidenceTimelinePoint(
                timestamp=t_str,
                score=round(score, 1),
                confidence=pt_conf,
                band_upper=band_upper,
                band_lower=band_lower,
                freshness=100.0,
                is_observed=True,
                staleness_note="Observed evidence point"
            ))

        # Project forward decay points if inactive
        last_score = float(sorted_ev[-1].get("raw_score", 70.0))
        projection_intervals = [30, 60, 90, 120]

        for days_ahead in projection_intervals:
            proj_days_since = days_since + days_ahead
            # Recency factor decays exponentially
            rec_decay = float(np.exp(-proj_days_since / 60.0))
            vol_factor = min(1.0, len(sorted_ev) / 5.0)
            div_factor = min(1.0, len(cum_sources) / 3.0)
            stab_factor = 0.85

            proj_conf = round(float(np.mean([vol_factor, div_factor, rec_decay, stab_factor])), 2)
            proj_conf = max(0.25, proj_conf)
            proj_freshness = calculate_freshness(proj_days_since)

            proj_upper, proj_lower = calculate_confidence_bands(last_score, proj_conf)

            # Projected date
            if last_dt:
                proj_date = (pd.Timestamp(last_dt) + pd.Timedelta(days=proj_days_since)).strftime("%Y-%m-%d")
            else:
                proj_date = f"+{int(proj_days_since)}d"

            state_label = classify_freshness_state(proj_freshness)
            note = f"Projected staleness (+{days_ahead}d without new evidence): {state_label} telemetry"

            timeline.append(ConfidenceTimelinePoint(
                timestamp=proj_date,
                score=round(last_score, 1),
                confidence=proj_conf,
                band_upper=proj_upper,
                band_lower=proj_lower,
                freshness=round(proj_freshness, 1),
                is_observed=False,
                staleness_note=note
            ))

        return ConfidenceDecayResponse(
            learner_id=resolved_id,
            competency_id=cid,
            competency_name=comp_name,
            current_trend=current_trend,
            current_confidence=round(base_confidence, 2),
            days_since_last_evidence=int(days_since),
            freshness_percentage=round(freshness_pct, 1),
            freshness_state=freshness_state,
            last_evidence_timestamp=str(last_item.get("timestamp"))[:10],
            timeline=timeline,
            methodology={
                "model_description": "4-Factor Telemetry Confidence Model incorporating Volume, Diversity, Recency, and Stability.",
                "features": {
                    "volume": f"{len(sorted_ev)} evidence events",
                    "diversity": f"{len(cum_sources)} distinct sources",
                    "recency": f"{int(days_since)} days since last verification",
                    "stability": f"Trajectory slope velocity {slope:+.2f} pts/month"
                },
                "uncertainty_formula": "Uncertainty band width = (1 - confidence) * 25.0 pts"
            }
        )
