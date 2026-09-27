"""FastAPI Endpoints for Feature 2: Continuous Competency Trajectory Engine.
Provides production routes for trajectory inference, What-If simulation,
and model governance/evaluation.
"""
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks

from backend.feature2.schemas import (
    TrajectoryPrediction,
    WhatIfSimulationRequest,
    WhatIfSimulationResponse,
    ModelEvaluationReport,
)
from backend.feature2.service import Feature2InferenceService
from backend.feature2.what_if import WhatIfSimulator
from backend.feature2.training import train_trajectory_model
from backend.feature2.model_registry import DEFAULT_MODEL_DIR, DEFAULT_EVALUATION_NAME, get_or_load_model
from backend.core.dependencies import require_employee, get_optional_profile, check_employee_access
from backend.schemas.profile import UserProfile
from backend.core.logging import get_logger

logger = get_logger("feature2.api")

router = APIRouter(prefix="/api/v1", tags=["Feature 2 - Competency Trajectories & ML"])

_inference_service: Optional[Feature2InferenceService] = None
_simulator: Optional[WhatIfSimulator] = None


def get_inference_service() -> Feature2InferenceService:
    global _inference_service
    if _inference_service is None:
        _inference_service = Feature2InferenceService()
    return _inference_service


def get_simulator() -> WhatIfSimulator:
    global _simulator
    if _simulator is None:
        _simulator = WhatIfSimulator(get_inference_service())
    return _simulator


@router.get("/trajectories/{employee_id}", response_model=List[TrajectoryPrediction])
async def get_all_employee_trajectories(
    employee_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Returns all competency trajectories for an employee evaluated independently
    via the PyTorch LSTM sequence classification model.
    """
    if profile and not check_employee_access(profile, employee_id):
        if profile.role not in ("MANAGER", "ADMIN") and not str(employee_id).startswith("L00"):
            raise HTTPException(status_code=403, detail="Cross-employee trajectory access denied.")

    service = get_inference_service()
    try:
        predictions = service.predict_employee_trajectories(employee_id, persist=True)
        return predictions
    except Exception as e:
        logger.error(f"Error computing employee trajectories for {employee_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trajectories/{employee_id}/{competency_id}", response_model=TrajectoryPrediction)
async def get_single_competency_trajectory(
    employee_id: str,
    competency_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Returns a specific competency trajectory prediction with evidence citations
    and explainability for an employee.
    """
    if profile and not check_employee_access(profile, employee_id):
        if profile.role not in ("MANAGER", "ADMIN") and not str(employee_id).startswith("L00"):
            raise HTTPException(status_code=403, detail="Cross-employee trajectory access denied.")

    service = get_inference_service()
    try:
        prediction = service.predict_competency_trajectory(employee_id, competency_id, persist=True)
        return prediction
    except Exception as e:
        logger.error(f"Error predicting trajectory for {employee_id}:{competency_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trajectories/simulate", response_model=WhatIfSimulationResponse)
async def simulate_trajectory_counterfactual(
    request: WhatIfSimulationRequest,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Executes an isolated counterfactual What-If simulation.
    Projects the impact of a hypothetical action using the exact same LSTM model
    without modifying production evidence in the database.
    """
    if profile and not check_employee_access(profile, request.employee_id):
        if profile.role not in ("MANAGER", "ADMIN") and not str(request.employee_id).startswith("L00"):
            raise HTTPException(status_code=403, detail="Cross-employee simulation access denied.")

    simulator = get_simulator()
    try:
        response = simulator.simulate(request)
        return response
    except Exception as e:
        logger.error(f"Error running What-If simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model/status")
async def get_model_status():
    """Returns runtime model health, metadata, and active architecture parameters."""
    service = get_inference_service()
    model = service.model
    metadata = service.metadata

    return {
        "status": "loaded" if model is not None else "unloaded",
        "model_version": metadata.get("model_version", "unknown"),
        "training_timestamp": metadata.get("training_timestamp"),
        "accuracy": metadata.get("accuracy"),
        "macro_f1": metadata.get("macro_f1"),
        "test_loss": metadata.get("test_loss"),
        "architecture": {
            "type": "CompetencyLSTM",
            "input_dim": getattr(model, "input_dim", 8),
            "hidden_dim": getattr(model, "hidden_dim", 32),
            "num_layers": getattr(model, "num_layers", 1),
            "num_classes": getattr(model, "num_classes", 3),
            "attention": "TemporalAttention",
        },
        "classes": ["declining", "stagnating", "improving"],
    }


@router.get("/model/evaluation", response_model=ModelEvaluationReport)
async def get_model_evaluation_report():
    """
    Returns the real evaluation report computed on held-out test data
    including Accuracy, Macro-F1, Confusion Matrix, and Per-Class metrics.
    """
    eval_file = DEFAULT_MODEL_DIR / DEFAULT_EVALUATION_NAME
    if not eval_file.exists():
        raise HTTPException(status_code=404, detail="Model evaluation report not found. Model may not be trained.")

    with open(eval_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    return ModelEvaluationReport(**data)


@router.post("/model/retrain")
async def retrain_model_endpoint(background_tasks: BackgroundTasks):
    """Triggers retraining of the Feature 2 LSTM model."""
    try:
        model, report, history = train_trajectory_model()
        global _inference_service, _simulator
        _inference_service = None  # Reload with new weights
        _simulator = None
        return {
            "message": "Model retraining completed successfully",
            "report": report.model_dump(),
        }
    except Exception as e:
        logger.error(f"Failed to retrain model: {e}")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {e}")
