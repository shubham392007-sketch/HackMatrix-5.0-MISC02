"""PyTorch LSTM Model for Feature 2 Competency Trajectory Classification.
Accepts temporal 8-dimensional sequence tensors and produces calibrated
probabilities over 3 trajectory classes (declining=0, stagnating=1, improving=2).
"""
from typing import Optional, Tuple, Dict, Any
import torch
import torch.nn as nn
import numpy as np

from backend.feature2.features import FEATURE_DIMENSION


class TemporalAttention(nn.Module):
    """Attention pooling layer over valid timesteps in the LSTM hidden states."""

    def __init__(self, hidden_dim: int):
        super().__init__()
        self.attn = nn.Sequential(
            nn.Linear(hidden_dim, max(16, hidden_dim // 2)),
            nn.Tanh(),
            nn.Linear(max(16, hidden_dim // 2), 1),
        )

    def forward(
        self,
        lstm_out: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            lstm_out: (batch_size, seq_len, hidden_dim)
            mask: (batch_size, seq_len) boolean tensor (True for valid tokens)
        Returns:
            context: (batch_size, hidden_dim) pooled context vector
            weights: (batch_size, seq_len, 1) attention weights
        """
        # (batch_size, seq_len, 1) -> (batch_size, seq_len)
        scores = self.attn(lstm_out).squeeze(-1)

        if mask is not None:
            # Mask out padded positions with a large negative value
            scores = scores.masked_fill(~mask, -1e9)

        weights = torch.softmax(scores, dim=-1).unsqueeze(-1)  # (batch_size, seq_len, 1)
        # Avoid NaN if an entire row was masked (defensive fallback)
        weights = torch.nan_to_num(weights, nan=0.0)
        
        context = torch.sum(lstm_out * weights, dim=1)  # (batch_size, hidden_dim)
        return context, weights


class CompetencyLSTM(nn.Module):
    """Deep sequence classifier predicting competency trajectory."""

    def __init__(
        self,
        input_dim: int = FEATURE_DIMENSION,
        hidden_dim: int = 32,
        num_layers: int = 1,
        dropout: float = 0.2,
        num_classes: int = 3,
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.num_classes = num_classes

        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        self.attention = TemporalAttention(hidden_dim)

        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, max(16, hidden_dim // 2)),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(max(16, hidden_dim // 2), num_classes),
        )

    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Forward pass.
        Args:
            x: (batch_size, seq_len, input_dim)
            mask: (batch_size, seq_len) boolean tensor
        Returns:
            logits: (batch_size, num_classes)
        """
        lstm_out, _ = self.lstm(x)
        context, _ = self.attention(lstm_out, mask)
        logits = self.classifier(context)
        return logits

    def predict_probabilities(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Inference step returning numpy arrays.
        Returns:
            probabilities: (batch_size, num_classes) float array
            predicted_classes: (batch_size,) int array
            attention_weights: (batch_size, seq_len) float array
        """
        self.eval()
        with torch.no_grad():
            lstm_out, _ = self.lstm(x)
            context, attn_weights = self.attention(lstm_out, mask)
            logits = self.classifier(context)
            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(probs, dim=-1)

            return (
                probs.cpu().numpy(),
                preds.cpu().numpy(),
                attn_weights.squeeze(-1).cpu().numpy(),
            )
