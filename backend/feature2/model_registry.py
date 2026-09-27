"""Model Registry for Feature 2 LSTM.
Manages saving, loading, versioning, and caching of trained PyTorch models
and their metadata / evaluation reports.
"""
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import torch

from backend.feature2.lstm_model import CompetencyLSTM
from backend.feature2.schemas import ModelEvaluationReport
from backend.core.logging import get_logger

logger = get_logger("feature2.model_registry")

DEFAULT_MODEL_DIR = Path("models/feature2")
DEFAULT_MODEL_NAME = "feature2_lstm_v1.pt"
DEFAULT_METADATA_NAME = "model_metadata.json"
DEFAULT_EVALUATION_NAME = "evaluation_report.json"

_CACHED_MODEL: Optional[CompetencyLSTM] = None
_CACHED_METADATA: Optional[Dict[str, Any]] = None


def ensure_model_dir(dir_path: Path = DEFAULT_MODEL_DIR) -> Path:
    """Ensures model directory exists."""
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


def save_model_artifacts(
    model: CompetencyLSTM,
    evaluation_report: ModelEvaluationReport,
    training_history: Dict[str, Any],
    hyperparameters: Dict[str, Any],
    model_dir: Path = DEFAULT_MODEL_DIR,
    model_name: str = DEFAULT_MODEL_NAME,
) -> Dict[str, str]:
    """
    Saves model weights, metadata, and evaluation report to disk.
    """
    ensure_model_dir(model_dir)

    model_path = model_dir / model_name
    metadata_path = model_dir / DEFAULT_METADATA_NAME
    eval_path = model_dir / DEFAULT_EVALUATION_NAME

    # 1. Save PyTorch state dict and architecture parameters
    save_payload = {
        "model_state_dict": model.state_dict(),
        "input_dim": model.input_dim,
        "hidden_dim": model.hidden_dim,
        "num_layers": model.num_layers,
        "num_classes": model.num_classes,
        "hyperparameters": hyperparameters,
    }
    torch.save(save_payload, str(model_path))

    # 2. Save metadata JSON
    metadata = {
        "model_version": evaluation_report.model_version,
        "training_timestamp": evaluation_report.training_timestamp.isoformat(),
        "dataset_version": evaluation_report.dataset_version,
        "accuracy": evaluation_report.accuracy,
        "macro_f1": evaluation_report.macro_f1,
        "test_loss": evaluation_report.test_loss,
        "hyperparameters": hyperparameters,
        "training_history": training_history,
    }
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # 3. Save full evaluation report JSON
    with open(eval_path, "w", encoding="utf-8") as f:
        json.dump(evaluation_report.model_dump(), f, indent=2, default=str)

    logger.info(f"Model artifacts successfully saved to {model_dir}")
    return {
        "model_path": str(model_path),
        "metadata_path": str(metadata_path),
        "eval_path": str(eval_path),
    }


def load_model(
    model_path: Optional[Path] = None,
    device: str = "cpu",
) -> Tuple[CompetencyLSTM, Dict[str, Any]]:
    """
    Loads saved model weights and architecture from disk.
    """
    if model_path is None:
        model_path = DEFAULT_MODEL_DIR / DEFAULT_MODEL_NAME

    if not model_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found at: {model_path}")

    checkpoint = torch.load(str(model_path), map_location=device)
    
    model = CompetencyLSTM(
        input_dim=checkpoint.get("input_dim", 8),
        hidden_dim=checkpoint.get("hidden_dim", 32),
        num_layers=checkpoint.get("num_layers", 1),
        num_classes=checkpoint.get("num_classes", 3),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    metadata_path = model_path.parent / DEFAULT_METADATA_NAME
    metadata = {}
    if metadata_path.exists():
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

    return model, metadata


def get_or_load_model(device: str = "cpu") -> Tuple[CompetencyLSTM, Dict[str, Any]]:
    """
    Singleton accessor for the loaded model to avoid reloading weights repeatedly.
    """
    global _CACHED_MODEL, _CACHED_METADATA
    if _CACHED_MODEL is not None and _CACHED_METADATA is not None:
        return _CACHED_MODEL, _CACHED_METADATA

    model_path = DEFAULT_MODEL_DIR / DEFAULT_MODEL_NAME
    if model_path.exists():
        _CACHED_MODEL, _CACHED_METADATA = load_model(model_path, device=device)
    else:
        logger.warning(f"No trained model found at {model_path}. Initializing default untrained instance.")
        _CACHED_MODEL = CompetencyLSTM().to(device)
        _CACHED_METADATA = {"model_version": "untrained_v0", "status": "untrained"}

    return _CACHED_MODEL, _CACHED_METADATA


def set_cached_model(model: CompetencyLSTM, metadata: Dict[str, Any]) -> None:
    """Updates the cached in-memory singleton."""
    global _CACHED_MODEL, _CACHED_METADATA
    _CACHED_MODEL = model
    _CACHED_METADATA = metadata
