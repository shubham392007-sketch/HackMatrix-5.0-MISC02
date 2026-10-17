import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.job import IngestionJob
from backend.app.models.sync_run import SourceSyncRun
from backend.app.ingestion.pipeline import queue_manager
from backend.app.core.logging import get_logger

logger = get_logger("api.ingestion_runs")
router = APIRouter(prefix="/ingestion-runs", tags=["Ingestion Runs & Jobs"])


@router.get("")
def list_ingestion_runs(
    status_filter: Optional[str] = None,
    limit: int = 50,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists ingestion jobs and execution telemetry for the authenticated user."""
    query = db.query(IngestionJob).filter(IngestionJob.owner_user_id == user.id)
    if status_filter:
        query = query.filter(IngestionJob.status == status_filter)

    jobs = query.order_by(IngestionJob.created_at.desc()).limit(limit).all()

    results = []
    for j in jobs:
        results.append({
            "id": str(j.id),
            "jobType": j.job_type,
            "status": j.status,
            "currentStage": j.current_stage,
            "progressPercentage": j.progress_percentage,
            "attemptCount": j.attempt_count,
            "maxAttempts": j.max_attempts,
            "isRetryable": j.is_retryable,
            "errorCode": j.error_code,
            "errorMessage": j.error_message,
            "metadata": j.stage_metadata or {},
            "createdAt": j.created_at.isoformat() if j.created_at else None,
            "startedAt": j.started_at.isoformat() if j.started_at else None,
            "completedAt": j.completed_at.isoformat() if j.completed_at else None,
        })

    # Summary metrics
    all_jobs = db.query(IngestionJob).filter(IngestionJob.owner_user_id == user.id).all()
    completed = sum(1 for j in all_jobs if j.status in ["SUCCEEDED", "COMPLETED"])
    failed = sum(1 for j in all_jobs if j.status in ["FAILED", "DEAD_LETTER"])
    running = sum(1 for j in all_jobs if j.status in ["RUNNING", "QUEUED", "PROCESSING"])

    return {
        "runs": results,
        "total": len(all_jobs),
        "summary": {
            "totalRuns": len(all_jobs),
            "completedRuns": completed,
            "failedRuns": failed,
            "runningRuns": running,
        },
    }


@router.get("/{run_id}")
def get_ingestion_run(
    run_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves detailed stage telemetry for a specific ingestion run."""
    try:
        j_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run UUID")

    job = db.query(IngestionJob).filter(
        IngestionJob.id == j_uuid,
        IngestionJob.owner_user_id == user.id,
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Ingestion run not found")

    return {
        "id": str(job.id),
        "jobType": job.job_type,
        "status": job.status,
        "currentStage": job.current_stage,
        "progressPercentage": job.progress_percentage,
        "attemptCount": job.attempt_count,
        "maxAttempts": job.max_attempts,
        "isRetryable": job.is_retryable,
        "errorCode": job.error_code,
        "errorMessage": job.error_message,
        "metadata": job.stage_metadata or {},
        "createdAt": job.created_at.isoformat() if job.created_at else None,
        "startedAt": job.started_at.isoformat() if job.started_at else None,
        "completedAt": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.post("/{run_id}/retry")
def retry_ingestion_run(
    run_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retries a failed ingestion job and re-enqueues into sequential pipeline."""
    try:
        j_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run UUID")

    job = db.query(IngestionJob).filter(
        IngestionJob.id == j_uuid,
        IngestionJob.owner_user_id == user.id,
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Ingestion run not found")

    job.status = "QUEUED"
    job.current_stage = "QUEUED"
    job.progress_percentage = 0
    job.attempt_count += 1
    job.error_message = None
    db.commit()

    queue_manager.enqueue_job(job.id)

    return {"status": "enqueued", "message": f"Ingestion run {job.id} re-enqueued for sequential processing"}
