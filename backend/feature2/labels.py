"""Label Generation for Feature 2 Competency Trajectories.
Maps historical longitudinal sequences to ground-truth trajectory classes:
0: Declining, 1: Stagnating, 2: Improving.
Guarantees zero future leakage into feature representations.
"""
from typing import Dict, List, Optional
import numpy as np

from backend.feature2.schemas import CanonicalCompetencyEvidence

LABEL_DECLINING = 0
LABEL_STAGNATING = 1
LABEL_IMPROVING = 2

LABEL_MAP = {
    LABEL_DECLINING: "declining",
    LABEL_STAGNATING: "stagnating",
    LABEL_IMPROVING: "improving",
}

REVERSE_LABEL_MAP = {v: k for k, v in LABEL_MAP.items()}

# Threshold in performance points for trajectory classification
IMPROVEMENT_THRESHOLD = +3.0
DECLINE_THRESHOLD = -3.0


class TrajectoryLabelGenerator:
    """Generates deterministic trajectory labels from chronological evidence sequence."""

    @staticmethod
    def derive_label_from_subsequent_events(
        history_events: List[CanonicalCompetencyEvidence],
        future_events: List[CanonicalCompetencyEvidence],
    ) -> int:
        """
        Determines ground truth label by comparing historical baseline at snapshot
        against subsequent performance in future_events.
        """
        if not history_events:
            return LABEL_STAGNATING

        # Historical score at snapshot (most recent known score)
        hist_scores = [e.raw_score for e in history_events if e.raw_score is not None]
        if not hist_scores:
            hist_baseline = 75.0
        else:
            # Weighted average of last 2 scores
            if len(hist_scores) >= 2:
                hist_baseline = 0.6 * hist_scores[-1] + 0.4 * hist_scores[-2]
            else:
                hist_baseline = hist_scores[-1]

        # Future scores to evaluate outcome
        future_scores = [e.raw_score for e in future_events if e.raw_score is not None]
        if not future_scores:
            # If no future events exist, evaluate linear trajectory across history itself
            if len(hist_scores) >= 2:
                delta = hist_scores[-1] - hist_scores[0]
                if delta >= IMPROVEMENT_THRESHOLD:
                    return LABEL_IMPROVING
                elif delta <= DECLINE_THRESHOLD:
                    return LABEL_DECLINING
            return LABEL_STAGNATING

        # Future performance
        avg_future = float(np.mean(future_scores))
        delta = avg_future - hist_baseline

        if delta >= IMPROVEMENT_THRESHOLD:
            return LABEL_IMPROVING
        elif delta <= DECLINE_THRESHOLD:
            return LABEL_DECLINING
        else:
            return LABEL_STAGNATING

    @classmethod
    def label_sequence_window(
        cls,
        full_sequence: List[CanonicalCompetencyEvidence],
        snapshot_index: int,
    ) -> int:
        """
        Labels a sequence up to snapshot_index (0 to snapshot_index is history;
        snapshot_index + 1 to end is future).
        """
        history = full_sequence[: snapshot_index + 1]
        future = full_sequence[snapshot_index + 1 :]
        return cls.derive_label_from_subsequent_events(history, future)
