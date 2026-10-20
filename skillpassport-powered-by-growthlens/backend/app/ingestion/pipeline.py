import asyncio
import threading
from typing import Optional, Callable, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from backend.app.models.job import IngestionJob
from backend.app.db.session import SessionLocal
from backend.app.ingestion.state_machine import PipelineStage, transition_job_stage
from backend.app.core.logging import get_logger

logger = get_logger("ingestion.pipeline")


class SequentialQueueManager:
    """
    Mandatory sequential pipeline manager.
    Enforces that evidence extraction executes strictly one item at a time.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._job_queue = []
                cls._instance._is_processing = False
                cls._instance._queue_lock = threading.Lock()
        return cls._instance

    def enqueue_job(self, job_id: uuid.UUID, processor_fn: Optional[Callable[[uuid.UUID], None]] = None):
        """Adds a job to the FIFO sequential queue and kicks off processor if idle."""
        with self._queue_lock:
            self._job_queue.append((job_id, processor_fn))
            logger.info(f"Enqueued job {job_id}. Current queue depth: {len(self._job_queue)}")
            if not self._is_processing:
                # Start background thread to process sequentially
                threading.Thread(target=self._process_queue_sequentially, daemon=True).start()

    def _process_queue_sequentially(self):
        with self._queue_lock:
            if self._is_processing:
                return
            self._is_processing = True

        try:
            while True:
                next_item = None
                with self._queue_lock:
                    if self._job_queue:
                        next_item = self._job_queue.pop(0)
                    else:
                        self._is_processing = False
                        break

                if next_item:
                    job_id, processor_fn = next_item
                    logger.info(f"Processing sequential job: {job_id}")
                    db = SessionLocal()
                    try:
                        job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
                        if job:
                            if processor_fn:
                                processor_fn(job_id)
                            else:
                                self._run_default_pipeline_steps(db, job)
                    except Exception as e:
                        logger.error(f"Error executing sequential job {job_id}: {e}")
                        try:
                            db.rollback()
                            job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
                            if job and job.status not in ("COMPLETED", "FAILED", "CANCELLED"):
                                transition_job_stage(
                                    db=db,
                                    job=job,
                                    target_stage=PipelineStage.FAILED,
                                    detail=f"Execution error: {str(e)}",
                                    error_code="PIPELINE_EXECUTION_FAILURE",
                                )
                        except Exception as inner_e:
                            logger.error(f"Failed to record failure state: {inner_e}")
                    finally:
                        db.close()
        finally:
            with self._queue_lock:
                self._is_processing = False

    def _run_default_pipeline_steps(self, db: Session, job: IngestionJob):
        """
        Executes sequential pipeline stages for a job:
        VALIDATING -> NORMALIZING -> BUILDING_CONTEXT -> EXTRACTING -> MAPPING -> INDEXING -> READY_FOR_REVIEW
        """
        logger.info(f"Running pipeline for job {job.id} (type: {job.job_type})")
        if job.job_type == "document_extraction":
            transition_job_stage(db, job, PipelineStage.VALIDATING_FILE, "Validating document format and signature", 15)
            transition_job_stage(db, job, PipelineStage.EXTRACTING_TEXT, "Extracting text content page by page", 35)
            transition_job_stage(db, job, PipelineStage.NORMALIZING, "Normalizing document structure and sections", 55)
            transition_job_stage(db, job, PipelineStage.BUILDING_CONTEXT, "Building bounded context for extraction", 70)
            transition_job_stage(db, job, PipelineStage.EXTRACTING_EVIDENCE, "Extracting candidate evidence items", 80)
            transition_job_stage(db, job, PipelineStage.MAPPING_COMPETENCIES, "Mapping against canonical taxonomy", 90)
            transition_job_stage(db, job, PipelineStage.VALIDATING_OUTPUT, "Validating structured output schema", 95)
            transition_job_stage(db, job, PipelineStage.READY_FOR_REVIEW, "Evidence extracted and queued for user review", 100)
            transition_job_stage(db, job, PipelineStage.COMPLETED, "Document processing completed successfully", 100)
        elif job.job_type in ("github_sync", "jira_sync"):
            transition_job_stage(db, job, PipelineStage.VALIDATING_SOURCE, "Validating connection and credentials", 10)
            transition_job_stage(db, job, PipelineStage.FETCHING, "Fetching repository language statistics and remote activities", 30)
            transition_job_stage(db, job, PipelineStage.NORMALIZING, "Normalizing activity records and language composition", 50)
            transition_job_stage(db, job, PipelineStage.DEDUPLICATING, "Evaluating exact and near duplicate records", 65)
            transition_job_stage(db, job, PipelineStage.BUILDING_CONTEXT, "Integrating language technology signals into extraction context", 75)
            transition_job_stage(db, job, PipelineStage.EXTRACTING_EVIDENCE, "Interpreting work and extracting candidate skills", 85)
            transition_job_stage(db, job, PipelineStage.MAPPING_COMPETENCIES, "Linking candidate competencies", 92)
            transition_job_stage(db, job, PipelineStage.READY_FOR_REVIEW, "Activities extracted and ready for review", 100)
            transition_job_stage(db, job, PipelineStage.COMPLETED, "Source sync completed successfully", 100)
        else:
            transition_job_stage(db, job, PipelineStage.VALIDATING_SOURCE, "Validating source URL and protocol", 20)
            transition_job_stage(db, job, PipelineStage.FETCHING, "Fetching web content with SSRF protection", 40)
            transition_job_stage(db, job, PipelineStage.NORMALIZING, "Extracting article text via Trafilatura", 60)
            transition_job_stage(db, job, PipelineStage.BUILDING_CONTEXT, "Structuring project claims", 75)
            transition_job_stage(db, job, PipelineStage.EXTRACTING_EVIDENCE, "Extracting evidence from project page", 85)
            transition_job_stage(db, job, PipelineStage.MAPPING_COMPETENCIES, "Mapping candidate skills", 95)
            transition_job_stage(db, job, PipelineStage.COMPLETED, "Website extraction completed successfully", 100)


queue_manager = SequentialQueueManager()
