"""Freshness Engine for Feature 2 Competency Trajectories.
Computes elapsed days since last observed evidence, maps to discrete FreshnessState,
and calculates continuous exponential decay factors and projected decay curves.
"""
from datetime import datetime, timezone
import math
from typing import Dict, List, Optional, Tuple, Any

from backend.feature2.schemas import FreshnessState


HALF_LIFE_DAYS = 60.0  # Evidence confidence drops by 50% after 60 days without new signals
DECAY_RATE = math.log(2.0) / HALF_LIFE_DAYS


def compute_freshness(
    last_evidence_at: Optional[datetime],
    now_utc: Optional[datetime] = None,
) -> Tuple[FreshnessState, int, float, List[Dict[str, float]]]:
    """
    Computes freshness metrics for a competency trajectory.

    Returns:
        state: FreshnessState ('fresh', 'recent', 'aging', 'stale')
        days_since: Integer count of elapsed days
        freshness_factor: Continuous multiplier in range [0.05, 1.0]
        decay_curve: Projected decay schedule over 30, 60, 90, 180 days
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    elif now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)

    if last_evidence_at is None:
        return FreshnessState.STALE, 999, 0.05, _generate_decay_curve(999)

    if last_evidence_at.tzinfo is None:
        last_evidence_at = last_evidence_at.replace(tzinfo=timezone.utc)

    days_since = max(0, int((now_utc - last_evidence_at).total_seconds() / 86400.0))

    # Categorize state
    if days_since <= 30:
        state = FreshnessState.FRESH
    elif days_since <= 60:
        state = FreshnessState.RECENT
    elif days_since <= 90:
        state = FreshnessState.AGING
    else:
        state = FreshnessState.STALE

    # Continuous exponential decay: e^(-lambda * days)
    decay_raw = math.exp(-DECAY_RATE * days_since)
    freshness_factor = float(round(max(0.05, min(1.0, decay_raw)), 4))

    # Future decay projections
    decay_curve = _generate_decay_curve(days_since)

    return state, days_since, freshness_factor, decay_curve


def _generate_decay_curve(current_days_since: int) -> List[Dict[str, float]]:
    """Generates projected confidence retention factors at future intervals."""
    intervals = [0, 30, 60, 90, 180]
    curve = []
    for d in intervals:
        future_days = current_days_since + d
        factor = math.exp(-DECAY_RATE * future_days)
        curve.append({
            "days_ahead": d,
            "total_gap_days": future_days,
            "retention_factor": float(round(max(0.05, min(1.0, factor)), 4)),
        })
    return curve
