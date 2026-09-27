"""Evaluation Module for Feature 2 Competency LSTM.
Computes real, un-fabricated classification metrics: Accuracy, Precision,
Recall, F1-scores, Confusion Matrix, and generates ModelEvaluationReport.
"""
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Any
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

from backend.feature2.schemas import ModelEvaluationReport, TrajectoryTrend
from backend.feature2.lstm_model import CompetencyLSTM
from backend.core.logging import get_logger

logger = get_logger("feature2.evaluation")


def evaluate_model(
    model: CompetencyLSTM,
    test_tensors: np.ndarray,
    test_masks: np.ndarray,
    test_labels: np.ndarray,
    criterion: nn.Module,
    model_version: str = "feature2_lstm_v1",
    dataset_version: str = "v1.0",
    num_employees: int = 10,
    num_competencies: int = 15,
    random_seed: int = 42,
) -> Tuple[ModelEvaluationReport, Dict[str, Any]]:
    """
    Evaluates the CompetencyLSTM on held-out test data.
    """
    model.eval()
    
    device = next(model.parameters()).device
    x_t = torch.tensor(test_tensors, dtype=torch.float32, device=device)
    mask_t = torch.tensor(test_masks, dtype=torch.bool, device=device)
    y_t = torch.tensor(test_labels, dtype=torch.long, device=device)

    with torch.no_grad():
        logits = model(x_t, mask_t)
        loss = criterion(logits, y_t).item()
        probs = torch.softmax(logits, dim=-1).cpu().numpy()
        preds = torch.argmax(logits, dim=-1).cpu().numpy()

    y_true = test_labels
    y_pred = preds

    # 1. Overall Accuracy
    acc = float(accuracy_score(y_true, y_pred))

    # 2. Macro & Weighted Precision, Recall, F1
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )

    # 3. Per-class metrics
    class_names = [TrajectoryTrend.DECLINING.value, TrajectoryTrend.STAGNATING.value, TrajectoryTrend.IMPROVING.value]
    class_p, class_r, class_f1, class_supp = precision_recall_fscore_support(
        y_true, y_pred, labels=[0, 1, 2], zero_division=0
    )

    per_class_metrics = {}
    for i, name in enumerate(class_names):
        per_class_metrics[name] = {
            "precision": round(float(class_p[i]), 4),
            "recall": round(float(class_r[i]), 4),
            "f1_score": round(float(class_f1[i]), 4),
            "support": int(class_supp[i]),
        }

    # 4. Confusion Matrix (3x3)
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2])
    cm_list = cm.tolist()

    # 5. Baseline accuracy (majority class classifier)
    unique_classes, counts = np.unique(y_true, return_counts=True)
    baseline_acc = float(np.max(counts) / len(y_true)) if len(y_true) > 0 else 0.3333

    # 6. Class distribution in test set
    class_dist = {
        TrajectoryTrend.DECLINING.value: int(np.sum(y_true == 0)),
        TrajectoryTrend.STAGNATING.value: int(np.sum(y_true == 1)),
        TrajectoryTrend.IMPROVING.value: int(np.sum(y_true == 2)),
    }

    report = ModelEvaluationReport(
        model_version=model_version,
        training_timestamp=datetime.now(timezone.utc),
        dataset_version=dataset_version,
        num_sequences=len(y_true),
        num_employees=num_employees,
        num_competencies=num_competencies,
        class_distribution=class_dist,
        accuracy=round(acc, 4),
        macro_precision=round(float(macro_p), 4),
        macro_recall=round(float(macro_r), 4),
        macro_f1=round(float(macro_f1), 4),
        per_class_metrics=per_class_metrics,
        confusion_matrix=cm_list,
        baseline_accuracy=round(baseline_acc, 4),
        test_loss=round(loss, 4),
        random_seed=random_seed,
    )

    summary_dict = {
        "report": report.model_dump(),
        "predictions": preds.tolist(),
        "probabilities": probs.tolist(),
    }

    logger.info(
        f"Evaluation finished: Accuracy={acc:.4f}, Macro-F1={macro_f1:.4f}, Test-Loss={loss:.4f}"
    )
    return report, summary_dict
