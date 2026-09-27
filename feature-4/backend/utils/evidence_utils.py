"""Evidence, freshness, and trend utilities for Feature 4."""
from typing import Dict, Any, Tuple


def calculate_freshness(days_since_last: float) -> float:
    """
    Computes signal freshness percentage based on days since last verified evidence.
    0 days = 100.0%, 180+ days = 0.0%
    """
    return max(0.0, min(100.0, (1.0 - (days_since_last / 180.0)) * 100.0))


def classify_freshness_state(freshness_pct: float) -> str:
    """Classifies freshness percentage into Fresh, Aging, or Stale."""
    if freshness_pct >= 75.0:
        return "Fresh"
    elif freshness_pct >= 40.0:
        return "Aging"
    else:
        return "Stale"


def get_trend_icon(trend: str) -> str:
    """Returns accessible directional icon for trend state."""
    t = trend.lower()
    if t == "improving":
        return "↑"
    elif t == "declining":
        return "↓"
    elif t == "stagnating":
        return "→"
    return "?"


def calculate_confidence_bands(score: float, confidence: float) -> Tuple[float, float]:
    """
    Computes upper and lower uncertainty band margins around score.
    Higher confidence produces tighter bands; decaying confidence widens bands.
    """
    uncertainty_width = (1.0 - max(0.0, min(1.0, confidence))) * 25.0
    upper = min(100.0, score + uncertainty_width)
    lower = max(0.0, score - uncertainty_width)
    return round(upper, 1), round(lower, 1)
