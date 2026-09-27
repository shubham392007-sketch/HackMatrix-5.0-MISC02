"""Explainability & Evidence Traceability for Feature 2.
Connects model trajectory predictions directly back to specific Feature 1 evidence events,
generating human-readable, evidence-backed justifications.
"""
from typing import List, Dict, Any, Optional
from backend.feature2.schemas import (
    CanonicalCompetencyEvidence,
    TrajectoryTrend,
    TrajectoryProbabilities,
    FreshnessState,
)


def generate_trajectory_explanation(
    competency_name: str,
    trend: TrajectoryTrend,
    probabilities: TrajectoryProbabilities,
    confidence: float,
    freshness: FreshnessState,
    days_since: int,
    evidence_sequence: List[CanonicalCompetencyEvidence],
    insufficient_evidence: bool = False,
) -> Dict[str, Any]:
    """
    Generates explainability metadata, citations, and narrative summary.
    """
    if insufficient_evidence or len(evidence_sequence) < 3:
        return {
            "supporting_evidence_ids": [e.evidence_id for e in evidence_sequence],
            "supporting_evidence_titles": [e.title for e in evidence_sequence],
            "explanation": (
                f"Trajectory for {competency_name} cannot be reliably determined yet. "
                f"Only {len(evidence_sequence)} observation(s) recorded (minimum 3 required for longitudinal ML)."
            ),
            "key_drivers": [],
        }

    # Identify most recent and influential evidence
    recent_events = evidence_sequence[-3:]
    supporting_ids = [e.evidence_id for e in recent_events]
    supporting_titles = [e.title for e in recent_events]

    # Calculate score movement
    scores = [e.raw_score for e in evidence_sequence if e.raw_score is not None]
    if len(scores) >= 2:
        score_diff = scores[-1] - scores[0]
        score_movement = f"Score shifted from {scores[0]:.1f} to {scores[-1]:.1f} ({'+' if score_diff >= 0 else ''}{score_diff:.1f} pts)."
    else:
        score_movement = "Evaluated via sequential multi-modal activities."

    # Trend narrative
    prob_val = getattr(probabilities, trend.value, 0.0) * 100.0
    freshness_note = (
        "Signals are recent and active."
        if freshness == FreshnessState.FRESH
        else f"Last observed {days_since} days ago ({freshness.value}); schedule new practice or assessment."
    )

    narrative = (
        f"{competency_name} exhibits an {trend.value.upper()} trajectory ({prob_val:.1f}% model likelihood, "
        f"{confidence * 100.0:.0f}% confidence) based on {len(evidence_sequence)} longitudinal events. "
        f"{score_movement} Key recent signal: '{recent_events[-1].title}' ({recent_events[-1].source.upper()}). "
        f"{freshness_note}"
    )

    drivers = [
        {
            "evidence_id": e.evidence_id,
            "title": e.title,
            "source": e.source,
            "date": e.timestamp.strftime("%Y-%m-%d"),
            "score": e.raw_score,
        }
        for e in recent_events
    ]

    return {
        "supporting_evidence_ids": supporting_ids,
        "supporting_evidence_titles": supporting_titles,
        "explanation": narrative,
        "key_drivers": drivers,
    }
