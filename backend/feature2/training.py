"""PyTorch LSTM Training Pipeline for Feature 2 Competency Trajectories.
Handles class imbalance weighting, early stopping, validation loss monitoring,
model checkpointing, evaluation report generation, and artifact persistence.
"""
import copy
from typing import Dict, Any, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

from backend.feature2.lstm_model import CompetencyLSTM
from backend.feature2.dataset import TrajectoryDatasetBuilder
from backend.feature2.evaluation import evaluate_model
from backend.feature2.model_registry import save_model_artifacts, set_cached_model
from backend.feature2.schemas import ModelEvaluationReport
from backend.core.logging import get_logger

logger = get_logger("feature2.training")


def compute_class_weights(y: np.ndarray, num_classes: int = 3) -> torch.Tensor:
    """
    Computes inverse frequency class weights to balance CrossEntropyLoss.
    weight_c = total_samples / (num_classes * count_c)
    """
    classes, counts = np.unique(y, return_counts=True)
    count_dict = {int(c): int(cnt) for c, cnt in zip(classes, counts)}
    total = len(y)

    weights = []
    for c in range(num_classes):
        cnt = count_dict.get(c, 1)  # avoid division by 0
        w = total / (num_classes * cnt)
        weights.append(w)

    # Normalize weights so mean is 1.0
    weights_np = np.array(weights, dtype=np.float32)
    weights_np = weights_np / np.mean(weights_np)
    return torch.tensor(weights_np, dtype=torch.float32)


def train_trajectory_model(
    dataset_dict: Optional[Dict[str, Any]] = None,
    hidden_dim: int = 32,
    num_layers: int = 1,
    dropout: float = 0.2,
    learning_rate: float = 0.003,
    batch_size: int = 16,
    epochs: int = 35,
    patience: int = 6,
    device: str = "cpu",
    random_seed: int = 42,
) -> Tuple[CompetencyLSTM, ModelEvaluationReport, Dict[str, Any]]:
    """
    Executes full training pipeline for Feature 2 LSTM.
    """
    torch.manual_seed(random_seed)
    np.random.seed(random_seed)

    # 1. Prepare dataset
    if dataset_dict is None:
        logger.info("Building trajectory dataset from evidence...")
        builder = TrajectoryDatasetBuilder()
        dataset_dict = builder.build_dataset(include_synthetic_dev=True)

    X_train = dataset_dict["X_train"]
    y_train = dataset_dict["y_train"]
    mask_train = dataset_dict["mask_train"]

    X_val = dataset_dict["X_val"]
    y_val = dataset_dict["y_val"]
    mask_val = dataset_dict["mask_val"]

    X_test = dataset_dict["X_test"]
    y_test = dataset_dict["y_test"]
    mask_test = dataset_dict["mask_test"]

    logger.info(
        f"Training set: {len(X_train)} sequences, Val: {len(X_val)}, Test: {len(X_test)}"
    )

    # 2. Compute class weights for imbalanced cross entropy
    class_weights = compute_class_weights(y_train, num_classes=3).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    # 3. Create PyTorch Datasets and DataLoaders
    train_ds = TensorDataset(
        torch.tensor(X_train, dtype=torch.float32),
        torch.tensor(mask_train, dtype=torch.bool),
        torch.tensor(y_train, dtype=torch.long),
    )
    val_ds = TensorDataset(
        torch.tensor(X_val, dtype=torch.float32),
        torch.tensor(mask_val, dtype=torch.bool),
        torch.tensor(y_val, dtype=torch.long),
    )

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    # 4. Instantiate Model & Optimizer
    model = CompetencyLSTM(
        input_dim=X_train.shape[2],
        hidden_dim=hidden_dim,
        num_layers=num_layers,
        dropout=dropout,
        num_classes=3,
    ).to(device)

    optimizer = torch.optim.Adam(
        model.parameters(), lr=learning_rate, weight_decay=1e-4
    )
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=2
    )

    # 5. Training Loop with Early Stopping
    best_val_loss = float("inf")
    best_model_weights = copy.deepcopy(model.state_dict())
    patience_counter = 0

    history = {
        "train_loss": [],
        "val_loss": [],
        "val_accuracy": [],
    }

    for epoch in range(1, epochs + 1):
        model.train()
        running_train_loss = 0.0

        for x_b, mask_b, y_b in train_loader:
            x_b, mask_b, y_b = x_b.to(device), mask_b.to(device), y_b.to(device)
            optimizer.zero_grad()
            logits = model(x_b, mask_b)
            loss = criterion(logits, y_b)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            running_train_loss += loss.item() * len(y_b)

        epoch_train_loss = running_train_loss / len(train_ds)

        # Validation
        model.eval()
        running_val_loss = 0.0
        val_correct = 0

        with torch.no_grad():
            for x_b, mask_b, y_b in val_loader:
                x_b, mask_b, y_b = x_b.to(device), mask_b.to(device), y_b.to(device)
                logits = model(x_b, mask_b)
                v_loss = criterion(logits, y_b)
                running_val_loss += v_loss.item() * len(y_b)
                preds = torch.argmax(logits, dim=-1)
                val_correct += (preds == y_b).sum().item()

        epoch_val_loss = running_val_loss / len(val_ds) if len(val_ds) > 0 else 0.0
        epoch_val_acc = val_correct / len(val_ds) if len(val_ds) > 0 else 0.0

        scheduler.step(epoch_val_loss)

        history["train_loss"].append(round(epoch_train_loss, 4))
        history["val_loss"].append(round(epoch_val_loss, 4))
        history["val_accuracy"].append(round(epoch_val_acc, 4))

        if epoch % 5 == 0 or epoch == epochs:
            logger.info(
                f"Epoch {epoch:02d}/{epochs}: Train Loss={epoch_train_loss:.4f}, "
                f"Val Loss={epoch_val_loss:.4f}, Val Acc={epoch_val_acc:.4f}"
            )

        # Early stopping check
        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            best_model_weights = copy.deepcopy(model.state_dict())
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                logger.info(f"Early stopping triggered at epoch {epoch}")
                break

    # 6. Restore best weights
    model.load_state_dict(best_model_weights)

    # 7. Evaluate on held-out test split
    report, summary = evaluate_model(
        model=model,
        test_tensors=X_test,
        test_masks=mask_test,
        test_labels=y_test,
        criterion=criterion,
        model_version="feature2_lstm_v1",
        dataset_version="v1.0",
        num_employees=dataset_dict.get("num_employees", 10),
        num_competencies=dataset_dict.get("num_competencies", 15),
        random_seed=random_seed,
    )

    # 8. Save artifacts and update in-memory cache
    hyperparameters = {
        "hidden_dim": hidden_dim,
        "num_layers": num_layers,
        "dropout": dropout,
        "learning_rate": learning_rate,
        "batch_size": batch_size,
        "epochs_trained": len(history["train_loss"]),
        "best_val_loss": round(best_val_loss, 4),
    }

    save_model_artifacts(
        model=model,
        evaluation_report=report,
        training_history=history,
        hyperparameters=hyperparameters,
    )
    set_cached_model(model, report.model_dump())

    return model, report, history


if __name__ == "__main__":
    import json
    logger.info("Starting standalone training script for Feature 2 LSTM...")
    model, report, history = train_trajectory_model()
    print("\n--- Model Training Completed Successfully ---")
    print(json.dumps(report.model_dump(), indent=2, default=str))
