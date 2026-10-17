import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, Index, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class IngestionJob(Base, TimestampMixin):
    __tablename__ = "ingestion_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Polymorphic target: either a document or a source record
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("uploaded_documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    sync_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("source_sync_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "document_extraction", "github_sync", "jira_sync", "website_crawl"
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", nullable=False)
    current_stage: Mapped[str] = mapped_column(String(50), default="QUEUED", nullable=False)
    progress_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    is_retryable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stage_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)

    events = relationship("ProcessingEvent", back_populates="job", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_ingestion_jobs_owner_status", "owner_user_id", "status"),
        Index("idx_ingestion_jobs_created", "created_at"),
    )


class ProcessingEvent(Base):
    __tablename__ = "processing_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ingestion_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # "completed", "failed", "started"
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    metadata_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)

    job = relationship("IngestionJob", back_populates="events")

    __table_args__ = (
        Index("idx_processing_events_job_time", "job_id", "event_timestamp"),
    )
