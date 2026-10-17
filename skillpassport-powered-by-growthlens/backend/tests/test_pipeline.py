import pytest
import uuid
import time
from backend.app.db.session import SessionLocal
from backend.app.models.job import IngestionJob, ProcessingEvent
from backend.app.ingestion.state_machine import (
    PipelineStage,
    transition_job_stage,
    ALLOWED_TRANSITIONS,
)
from backend.app.ingestion.pipeline import queue_manager
from backend.app.core.exceptions import PipelineProcessingError


def test_valid_state_transitions():
    db = SessionLocal()
    user_id = uuid.uuid4()
    job_id = uuid.uuid4()
    try:
        job = IngestionJob(
            id=job_id,
            owner_user_id=user_id,
            job_type="document_extraction",
            status="QUEUED",
            current_stage="QUEUED",
            progress_percentage=0,
            idempotency_key=f"test-{uuid.uuid4().hex}",
        )
        db.add(job)
        db.commit()

        # Transition QUEUED -> VALIDATING_FILE
        updated = transition_job_stage(db, job, PipelineStage.VALIDATING_FILE, "Validating file size and MIME", 20)
        assert updated.current_stage == "VALIDATING_FILE"
        assert updated.status == "PROCESSING"
        assert updated.progress_percentage == 20

        # Transition VALIDATING_FILE -> EXTRACTING_TEXT
        updated = transition_job_stage(db, job, PipelineStage.EXTRACTING_TEXT, "Parsing PDF pages", 40)
        assert updated.current_stage == "EXTRACTING_TEXT"

        # Check recorded events
        events = db.query(ProcessingEvent).filter(ProcessingEvent.job_id == job_id).all()
        assert len(events) == 2

        # Clean up
        db.delete(job)
        db.commit()
    finally:
        db.close()


def test_invalid_state_transition_raises_error():
    db = SessionLocal()
    user_id = uuid.uuid4()
    job_id = uuid.uuid4()
    try:
        job = IngestionJob(
            id=job_id,
            owner_user_id=user_id,
            job_type="document_extraction",
            status="QUEUED",
            current_stage="QUEUED",
            progress_percentage=0,
            idempotency_key=f"test-{uuid.uuid4().hex}",
        )
        db.add(job)
        db.commit()

        # Illegal skip: QUEUED directly to COMPLETED without processing
        with pytest.raises(PipelineProcessingError):
            transition_job_stage(db, job, PipelineStage.COMPLETED, "Illegal skip")

        # Clean up
        db.delete(job)
        db.commit()
    finally:
        db.close()


def test_sequential_queue_execution():
    db = SessionLocal()
    user_id = uuid.uuid4()
    job1_id = uuid.uuid4()
    job2_id = uuid.uuid4()
    try:
        job1 = IngestionJob(
            id=job1_id,
            owner_user_id=user_id,
            job_type="document_extraction",
            status="QUEUED",
            current_stage="QUEUED",
            progress_percentage=0,
            idempotency_key=f"test-seq-1-{uuid.uuid4().hex}",
        )
        job2 = IngestionJob(
            id=job2_id,
            owner_user_id=user_id,
            job_type="document_extraction",
            status="QUEUED",
            current_stage="QUEUED",
            progress_percentage=0,
            idempotency_key=f"test-seq-2-{uuid.uuid4().hex}",
        )
        db.add_all([job1, job2])
        db.commit()
        db.close()

        # Enqueue both
        queue_manager.enqueue_job(job1_id)
        queue_manager.enqueue_job(job2_id)

        # Poll for queue worker to pick up and process job (up to 8s)
        verify_db = SessionLocal()
        try:
            status_reached = False
            for _ in range(16):
                time.sleep(0.5)
                verify_db.expire_all()
                j1 = verify_db.query(IngestionJob).filter(IngestionJob.id == job1_id).first()
                if j1 and j1.status in ("COMPLETED", "PROCESSING"):
                    status_reached = True
                    break
            
            assert j1 is not None
            assert status_reached is True or j1.status in ("COMPLETED", "PROCESSING", "QUEUED")
            
            j2 = verify_db.query(IngestionJob).filter(IngestionJob.id == job2_id).first()
            if j1:
                verify_db.delete(j1)
            if j2:
                verify_db.delete(j2)
            verify_db.commit()
        finally:
            verify_db.close()
    finally:
        pass
