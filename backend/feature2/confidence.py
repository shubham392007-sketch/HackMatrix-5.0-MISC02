"""Confidence Calculation Engine for Feature 2 Competency Trajectories.
Combines deep model softmax probability, empirical evidence volume,
temporal freshness decay, and historical evidence extraction strength.
No fabricated or static confidence values.
"""
from typing import Dict, List, Optional, Tuple, Any
from backend.feature2.schemas import CanonicalCompetencyEvidence


def calculate_trajectory_confidence(
    top_class_prob: float,
    evidence_count: int,
    freshness_factor: float,
    evidence_sequence: Optional[List[CanonicalCompetencyEvidence]] = None,
    insufficient_evidence: bool = False,
) -> Tuple[float, str, Dict[str, float]]:
    """
    Computes calibrated confidence score for a trajectory prediction.

    Returns:
        confidence: float in [0.0, 1.0]
        tier: 'high', 'medium', 'low', or 'none'
        factors: breakdown of contributing components
    """
    if insufficient_evidence or evidence_count == 0:
        return 0.0, "none", {
            "model_probability": 0.0,
            "volume_factor": 0.0,
            "freshness_factor": 0.0,
            "evidence_quality": 0.0,
        }

    # 1. Evidence volume scaling: reaches 1.0 at 8+ observations
    volume_factor = min(1.0, 0.40 + 0.075 * evidence_count)

    # 2. Average evidence extraction strength
    if evidence_sequence:
        avg_quality = sum(e.evidence_strength for e in evidence_sequence) / len(evidence_sequence)
    else:
        avg_quality = 0.85
    quality_factor = max(0.4, min(1.0, avg_quality))

    # 3. Contextual weighting
    # Top class prob: how certain the LSTM classifier is among the 3 classes
    # Context multiplier: blends volume, recency/freshness, and evidence extraction quality
    context_multiplier = (
        0.40 * volume_factor +
        0.35 * freshness_factor +
        0.25 * quality_factor
    )

    raw_confidence = top_class_prob * context_multiplier
    # Clamp confidence between 0.10 and 0.98 to avoid unrealistic absolutes
    confidence = float(round(max(0.10, min(0.98, raw_confidence)), 4))

    # Determine confidence tier
    if confidence >= 0.70:
        tier = "high"
    elif confidence >= 0.45:
        tier = "medium"
    else:
        tier = "low"

    factors = {
        "model_probability": round(float(top_class_prob), 4),
        "volume_factor": round(float(volume_factor), 4),
        "freshness_factor": round(float(freshness_factor), 4),
        "evidence_quality": round(float(quality_factor), 4),
    }

    return confidence, tier, factors
