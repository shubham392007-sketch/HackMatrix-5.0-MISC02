"""Evidence Staleness & Confidence Decay Service for GrowthLens Feature 4.
Calculates dynamic confidence erosion and widening uncertainty bands as evidence ages,
consuming authoritative Feature 2 freshness metrics and survival retention projections.
"""
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.core.logging import get_logger
from backend.db.client import get_supabase_client
from backend.feature4.schemas import ConfidenceDecay, DecayCurvePoint

logger = get_logger("feature4.staleness")


class StalenessService:
    """Computes evidence freshness and multi-horizon confidence decay bands."""

    def get_confidence_decay(
        self,
        learner_id: str,
        competency_id: str,
    ) -> ConfidenceDecay:
        """
        Calculates evidence freshness score and 180-day confidence decay projection with widening uncertainty.
        """
        clean_comp = competency_id.strip().upper()
        comp_title = self._resolve_competency_name(clean_comp)

        # 1. Fetch authoritative trajectory from Feature 2
        trajectory = self._fetch_trajectory(learner_id, clean_comp)

        # 2. Extract baseline metrics
        if trajectory:
            base_conf = float(trajectory.get("confidence", 0.85) or 0.85)
            days_since = int(trajectory.get("days_since_last_evidence", 14) or 14)
            trend = str(trajectory.get("trend", "improving")).lower()
        else:
            base_conf = 0.80
            days_since = 30
            trend = "stagnating"

        # 3. Calculate continuous freshness score: exponential decay f(d) = e^(-d / 45)
        # 0 days -> 1.0; 14 days -> 0.73; 45 days -> 0.37; 90 days -> 0.13
        decay_constant = 45.0
        freshness_score = round(math.exp(-days_since / decay_constant), 2)
        freshness_score = max(0.05, min(1.0, freshness_score))

        # 4. Classify freshness label
        if days_since <= 14:
            freshness_label = "Fresh"
        elif days_since <= 60:
            freshness_label = "Aging"
        else:
            freshness_label = "Stale"

        # 5. Project 180-day confidence decay curve with widening uncertainty bands
        # Confidence decays gradually if no new evidence arrives: C(t) = C0 * exp(-t / 180)
        # Uncertainty band widens with time: +/- (0.04 + 0.001 * t)
        decay_curve: List[DecayCurvePoint] = []
        projection_days = [0, 30, 60, 90, 180]

        for day in projection_days:
            projected_conf = base_conf * math.exp(-day / 150.0)
            projected_conf = max(0.15, min(0.99, round(projected_conf, 2)))

            # Band widens as time horizon extends into the future
            band_width = 0.05 + (day / 180.0) * 0.12
            upper = min(1.0, round(projected_conf + band_width, 2))
            lower = max(0.05, round(projected_conf - band_width, 2))

            decay_curve.append(DecayCurvePoint(
                day=day,
                confidence=projected_conf,
                upper_band=upper,
                lower_band=lower,
            ))

        return ConfidenceDecay(
            learner_id=learner_id,
            competency_id=clean_comp,
            competency_name=comp_title,
            current_confidence=base_conf,
            freshness_score=freshness_score,
            freshness_label=freshness_label,
            days_since_last_evidence=days_since,
            decay_curve=decay_curve,
        )

    def _fetch_trajectory(self, learner_id: str, competency_id: str) -> Optional[Dict[str, Any]]:
        """Queries authoritative Feature 2 trajectory record."""
        try:
            client = get_supabase_client()
            res = (
                client.table("competency_trajectories")
                .select("*")
                .eq("employee_id", learner_id)
                .eq("competency_id", competency_id)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Error querying trajectory for staleness: {e}")

        # Fallback to retention service
        try:
            from services.retention_service import RetentionService
            service = RetentionService.get_instance()
            assessment = service.get_retention_assessment(learner_id)
            if assessment and assessment.competencies:
                for c in assessment.competencies:
                    if c.competency_id.upper() == competency_id.upper():
                        return {
                            "confidence": c.confidence_score,
                            "days_since_last_evidence": c.days_since_last_evidence,
                            "trend": c.trend,
                        }
        except Exception:
            pass

        return None

    def _resolve_competency_name(self, competency_id: str) -> str:
        names = {
            "C01": "Backend Engineering & API Development",
            "C02": "Data Processing & Analytics",
            "C03": "Database Systems & Storage",
            "C04": "DevOps & Cloud Infrastructure",
            "C05": "Quality Assurance & Testing",
            "C06": "Technical Communication & Collaboration",
        }
        return names.get(competency_id.upper(), competency_id.replace("_", " ").title())


_staleness_service: Optional[StalenessService] = None


def get_staleness_service() -> StalenessService:
    global _staleness_service
    if _staleness_service is None:
        _staleness_service = StalenessService()
    return _staleness_service
