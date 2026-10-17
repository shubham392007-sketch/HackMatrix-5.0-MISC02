from enum import Enum
from typing import Set, Dict, Optional
from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session

from backend.app.models.job import IngestionJob, ProcessingEvent
from backend.app.core.exceptions import PipelineProcessingError
from backend.app.core.logging import get_logger

logger = get_logger("ingestion.state_machine")


class PipelineStage(str, Enum):
    QUEUED = "QUEUED"
    VALIDATING_SOURCE = "VALIDATING_SOURCE"
    FETCHING = "FETCHING"
    VALIDATING_FILE = "VALIDATING_FILE"
    NORMALIZING = "NORMALIZING"
    DEDUPLICATING = "DEDUPLICATING"
    EXTRACTING_TEXT = "EXTRACTING_TEXT"
    OCR_PROCESSING = "OCR_PROCESSING"
    BUILDING_CONTEXT = "BUILDING_CONTEXT"
    EXTRACTING_EVIDENCE = "EXTRACTING_EVIDENCE"
    MAPPING_COMPETENCIES = "MAPPING_COMPETENCIES"
    VALIDATING_OUTPUT = "VALIDATING_OUTPUT"
    CALCULATING_QUALITY = "CALCULATING_QUALITY"
    CHECKING_CORROBORATION = "CHECKING_CORROBORATION"
    GENERATING_EMBEDDINGS = "GENERATING_EMBEDDINGS"
    INDEXING = "INDEXING"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


TERMINAL_STAGES: Set[PipelineStage] = {
    PipelineStage.COMPLETED,
    PipelineStage.PARTIAL,
    PipelineStage.FAILED,
    PipelineStage.CANCELLED,
}

# Permitted state transitions for pipeline consistency
ALLOWED_TRANSITIONS: Dict[PipelineStage, Set[PipelineStage]] = {
    PipelineStage.QUEUED: {
        PipelineStage.VALIDATING_SOURCE,
        PipelineStage.VALIDATING_FILE,
        PipelineStage.FETCHING,
        PipelineStage.CANCELLED,
        PipelineStage.FAILED,
    },
    PipelineStage.VALIDATING_SOURCE: {PipelineStage.FETCHING, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.FETCHING: {PipelineStage.NORMALIZING, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.VALIDATING_FILE: {PipelineStage.EXTRACTING_TEXT, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.EXTRACTING_TEXT: {PipelineStage.OCR_PROCESSING, PipelineStage.NORMALIZING, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.OCR_PROCESSING: {PipelineStage.NORMALIZING, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.NORMALIZING: {PipelineStage.DEDUPLICATING, PipelineStage.BUILDING_CONTEXT, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.DEDUPLICATING: {PipelineStage.BUILDING_CONTEXT, PipelineStage.COMPLETED, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.BUILDING_CONTEXT: {PipelineStage.EXTRACTING_EVIDENCE, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.EXTRACTING_EVIDENCE: {PipelineStage.MAPPING_COMPETENCIES, PipelineStage.FAILED, PipelineStage.PARTIAL, PipelineStage.CANCELLED},
    PipelineStage.MAPPING_COMPETENCIES: {PipelineStage.VALIDATING_OUTPUT, PipelineStage.READY_FOR_REVIEW, PipelineStage.COMPLETED, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.VALIDATING_OUTPUT: {PipelineStage.CALCULATING_QUALITY, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.CALCULATING_QUALITY: {PipelineStage.CHECKING_CORROBORATION, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.CHECKING_CORROBORATION: {PipelineStage.GENERATING_EMBEDDINGS, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.GENERATING_EMBEDDINGS: {PipelineStage.INDEXING, PipelineStage.READY_FOR_REVIEW, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.INDEXING: {PipelineStage.READY_FOR_REVIEW, PipelineStage.COMPLETED, PipelineStage.FAILED, PipelineStage.CANCELLED},
    PipelineStage.READY_FOR_REVIEW: {PipelineStage.COMPLETED, PipelineStage.PARTIAL, PipelineStage.FAILED},
    PipelineStage.FAILED: {PipelineStage.QUEUED},  # Permitted on authorized retry
    PipelineStage.PARTIAL: {PipelineStage.QUEUED},
    PipelineStage.CANCELLED: set(),
    PipelineStage.COMPLETED: set(),
}


def transition_job_stage(
    db: Session,
    job: IngestionJob,
    target_stage: PipelineStage,
    detail: str,
    progress: Optional[int] = None,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
    metadata_snapshot: Optional[dict] = None,
) -> IngestionJob:
    """
    Atomically updates job stage and logs a durable processing event.
    Enforces state-machine transition integrity.
    """
    current_stage = PipelineStage(job.current_stage)
    
    # Check transition validity
    if target_stage not in ALLOWED_TRANSITIONS.get(current_stage, set()):
        raise PipelineProcessingError(
            stage=target_stage.value,
            message=f"Illegal transition from '{current_stage.value}' to '{target_stage.value}'",
            retryable=False,
        )

    now = datetime.now(timezone.utc)
    job.current_stage = target_stage.value
    
    if progress is not None:
        job.progress_percentage = min(100, max(0, progress))

    if target_stage == PipelineStage.QUEUED and not job.started_at:
        job.status = "QUEUED"
    elif target_stage in TERMINAL_STAGES:
        job.status = target_stage.value
        if target_stage == PipelineStage.COMPLETED:
            job.completed_at = now
            job.progress_percentage = 100
        elif target_stage == PipelineStage.FAILED:
            job.failed_at = now
            job.error_code = error_code or "PIPELINE_ERROR"
            job.error_message = error_message or detail
        elif target_stage == PipelineStage.CANCELLED:
            job.completed_at = now
    else:
        job.status = "PROCESSING"
        if not job.started_at:
            job.started_at = now

    # Record event
    event = ProcessingEvent(
        id=uuid.uuid4(),
        job_id=job.id,
        owner_user_id=job.owner_user_id,
        stage=target_stage.value,
        status="completed" if target_stage in {PipelineStage.COMPLETED, PipelineStage.READY_FOR_REVIEW} else ("failed" if target_stage == PipelineStage.FAILED else "running"),
        detail=detail,
        event_timestamp=now,
        metadata_snapshot=metadata_snapshot or {},
    )
    db.add(event)
    db.commit()
    db.refresh(job)

    logger.info(
        f"Job {job.id} transitioned {current_stage.value} -> {target_stage.value} ({job.progress_percentage}%)"
    )
    return job
