"""Privacy and k-anonymity utilities for Feature 4."""
import os
from typing import Optional, Tuple


def get_min_cohort_size() -> int:
    """Configurable minimum peer cohort size for privacy-safe benchmarking."""
    val = os.getenv("PEER_BENCHMARK_MIN_COHORT_SIZE", "5")
    try:
        return max(3, int(val))
    except ValueError:
        return 5


def bucket_cohort_size(size: int) -> str:
    """
    Returns coarse cohort size buckets to prevent exact differential inference attacks.
    Never reveals the precise single-integer headcount of peers.
    """
    if size < 5:
        return "< 5 peers"
    elif size < 10:
        return "5–9 peers"
    elif size <= 25:
        return "10–25 peers"
    elif size <= 50:
        return "25–50 peers"
    else:
        return "50+ peers"


def calculate_relative_tier(percentile: int) -> str:
    """Converts a growth percentile into an accessible quartile / tier label."""
    if percentile >= 90:
        return "top 10%"
    elif percentile >= 80:
        return "top 20%"
    elif percentile >= 70:
        return "top 30%"
    elif percentile >= 50:
        return "top 50%"
    elif percentile >= 30:
        return "mid-tier"
    else:
        return "developing pace"
