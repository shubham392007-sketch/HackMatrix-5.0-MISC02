"""Time-Aware Feature Engineering for Feature 2 Competency Trajectories.
Converts chronological evidence sequences into normalized mathematical feature tensors
with explicit missing-data handling and zero future leakage.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
import numpy as np

from backend.feature2.schemas import CanonicalCompetencyEvidence

# Feature dimension per evidence timestep
FEATURE_NAMES = [
    "score_norm",             # Normalized score (0.0 - 1.0). If missing, imputed baseline (0.75)
    "score_missing_flag",     # 1.0 if raw score was missing, 0.0 if observed
    "evidence_strength",      # Confidence weight (0.0 - 1.0)
    "gap_days_norm",          # Days since previous evidence, normalized by 180 days
    "score_delta",            # Change from immediate previous observation (-1.0 to +1.0)
    "cumulative_delta",       # Change from initial sequence observation (-1.0 to +1.0)
    "source_diversity_norm",  # Unique sources up to this point / max sources (5.0)
    "recency_norm",           # Recency relative to snapshot date (1.0 = today, 0.0 = 180+ days old)
]
FEATURE_DIMENSION = len(FEATURE_NAMES)  # 8 features


class TemporalFeatureExtractor:
    """Extracts longitudinal feature vectors from chronological evidence events."""

    @staticmethod
    def extract_timestep_features(
        current_event: CanonicalCompetencyEvidence,
        previous_event: Optional[CanonicalCompetencyEvidence],
        first_event: CanonicalCompetencyEvidence,
        unique_sources_seen: set,
        snapshot_time: Optional[datetime] = None,
    ) -> List[float]:
        """
        Extracts an 8-dimensional feature vector for a single evidence step in time.
        Guarantees that only past and current information is used (Zero Future Leakage).
        """
        # 1. Performance score & missing flag
        if current_event.raw_score is not None:
            score_norm = float(np.clip(current_event.raw_score / 100.0, 0.0, 1.0))
            score_missing = 0.0
        else:
            # Default baseline prior for un-scored activity (e.g. routine commit)
            score_norm = 0.75
            score_missing = 1.0

        # 2. Evidence strength weight
        strength = float(np.clip(current_event.evidence_strength, 0.0, 1.0))

        # 3. Gap days from previous event
        if previous_event is not None:
            delta_days = (current_event.timestamp - previous_event.timestamp).total_seconds() / 86400.0
            gap_days_norm = float(np.clip(max(0.0, delta_days) / 180.0, 0.0, 1.0))
        else:
            gap_days_norm = 0.0

        # 4. Immediate score delta
        if previous_event is not None and previous_event.raw_score is not None and current_event.raw_score is not None:
            score_delta = float(np.clip((current_event.raw_score - previous_event.raw_score) / 100.0, -1.0, 1.0))
        else:
            score_delta = 0.0

        # 5. Cumulative score delta from sequence start
        if first_event.raw_score is not None and current_event.raw_score is not None:
            cum_delta = float(np.clip((current_event.raw_score - first_event.raw_score) / 100.0, -1.0, 1.0))
        else:
            cum_delta = 0.0

        # 6. Source diversity (cumulative distinct sources)
        unique_sources_seen.add(current_event.source)
        source_div_norm = float(np.clip(len(unique_sources_seen) / 5.0, 0.0, 1.0))

        # 7. Recency relative to snapshot time
        if snapshot_time is not None:
            days_from_snapshot = (snapshot_time - current_event.timestamp).total_seconds() / 86400.0
            recency_norm = float(np.clip(1.0 - (max(0.0, days_from_snapshot) / 180.0), 0.0, 1.0))
        else:
            recency_norm = 1.0

        return [
            score_norm,
            score_missing,
            strength,
            gap_days_norm,
            score_delta,
            cum_delta,
            source_div_norm,
            recency_norm,
        ]

    @classmethod
    def transform_sequence(
        cls,
        evidence_sequence: List[CanonicalCompetencyEvidence],
        snapshot_time: Optional[datetime] = None,
    ) -> np.ndarray:
        """
        Transforms an ordered list of N evidence items into an (N, FEATURE_DIMENSION) array.
        """
        if not evidence_sequence:
            return np.zeros((0, FEATURE_DIMENSION), dtype=np.float32)

        if snapshot_time is None:
            snapshot_time = evidence_sequence[-1].timestamp

        first_event = evidence_sequence[0]
        unique_sources = set()
        feature_rows: List[List[float]] = []

        for idx, event in enumerate(evidence_sequence):
            prev_event = evidence_sequence[idx - 1] if idx > 0 else None
            row = cls.extract_timestep_features(
                current_event=event,
                previous_event=prev_event,
                first_event=first_event,
                unique_sources_seen=unique_sources,
                snapshot_time=snapshot_time,
            )
            feature_rows.append(row)

        return np.array(feature_rows, dtype=np.float32)
