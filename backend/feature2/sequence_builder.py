"""Sequence Builder for Feature 2 Competency LSTM.
Constructs fixed-length temporal tensors with padding, masking,
and explicit Insufficient Evidence detection.
"""
from typing import List, Optional, Tuple
import numpy as np

from backend.feature2.schemas import CanonicalCompetencyEvidence
from backend.feature2.features import TemporalFeatureExtractor, FEATURE_DIMENSION
from backend.core.logging import get_logger

logger = get_logger("feature2.sequence_builder")

# Global Configuration Parameters
MAX_SEQUENCE_LENGTH = 10  # Maximum timesteps fed into the LSTM
MIN_SEQUENCE_LENGTH = 3   # Minimum required historical evidence events for ML inference


class CompetencySequenceBuilder:
    """Builds model-ready sequence tensors from chronological evidence."""

    def __init__(
        self,
        max_length: int = MAX_SEQUENCE_LENGTH,
        min_length: int = MIN_SEQUENCE_LENGTH,
    ):
        self.max_length = max_length
        self.min_length = min_length
        self.feature_extractor = TemporalFeatureExtractor()

    def build_inference_sequence(
        self,
        evidence_sequence: List[CanonicalCompetencyEvidence],
    ) -> Tuple[np.ndarray, np.ndarray, bool]:
        """
        Builds a single padded (1, max_length, FEATURE_DIMENSION) tensor for model inference.
        Returns:
            tensor: (1, max_length, feature_dim) float32 array
            mask: (1, max_length) boolean array where True indicates valid observation
            insufficient_evidence: True if valid observations < min_length
        """
        n = len(evidence_sequence)

        # 1. Insufficient Evidence Detection: Never force an ML prediction with too few data points
        if n < self.min_length:
            dummy_tensor = np.zeros((1, self.max_length, FEATURE_DIMENSION), dtype=np.float32)
            dummy_mask = np.zeros((1, self.max_length), dtype=bool)
            return dummy_tensor, dummy_mask, True

        # 2. Extract features for all events
        feature_matrix = self.feature_extractor.transform_sequence(evidence_sequence)

        # 3. Truncate to most recent max_length if sequence exceeds maximum window
        if n > self.max_length:
            feature_matrix = feature_matrix[-self.max_length:]
            n = self.max_length

        # 4. Pre-pad with zeros to exactly max_length
        padded_tensor = np.zeros((self.max_length, FEATURE_DIMENSION), dtype=np.float32)
        mask = np.zeros((self.max_length,), dtype=bool)

        start_idx = self.max_length - n
        padded_tensor[start_idx:] = feature_matrix
        mask[start_idx:] = True

        # Reshape with batch dimension: (1, seq_len, feat_dim)
        return (
            np.expand_dims(padded_tensor, axis=0),
            np.expand_dims(mask, axis=0),
            False,
        )

    def build_sliding_windows(
        self,
        evidence_sequence: List[CanonicalCompetencyEvidence],
    ) -> List[Tuple[np.ndarray, np.ndarray, int]]:
        """
        Creates historical sliding windows for training dataset generation.
        Each window (E_0 ... E_k) uses only past events to predict the outcome at k.
        """
        n = len(evidence_sequence)
        windows = []

        if n < self.min_length:
            return windows

        # For every observation k from min_length to n
        for k in range(self.min_length, n + 1):
            sub_seq = evidence_sequence[:k]
            window_tensor, mask, insufficient = self.build_inference_sequence(sub_seq)
            if not insufficient:
                windows.append((window_tensor[0], mask[0], k - 1))

        return windows
