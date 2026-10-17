import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class SourceSyncRun(Base, TimestampMixin):
    __tablename__ = "source_sync_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("connected_sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(50), default="manual", nullable=False)  # "manual", "scheduled", "webhook"
    status: Mapped[str] = mapped_column(String(50), default="running", nullable=False)  # "running", "completed", "partially_completed", "failed", "cancelled"

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    records_discovered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_imported: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_skipped: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_duplicated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    selected_resources_snapshot: Mapped[Optional[List[dict]]] = mapped_column(JSONB, default=list)
    resource_outcomes: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    connection = relationship("ConnectedSource", back_populates="sync_runs")
    raw_records = relationship("RawSourceRecord", back_populates="sync_run", cascade="all, delete-orphan")


class RawSourceRecord(Base, TimestampMixin):
    __tablename__ = "raw_source_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    sync_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("source_sync_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    record_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "pull_request", "commit", "issue", "jira_issue"
    external_record_id: Mapped[str] = mapped_column(String(255), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    storage_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    sync_run = relationship("SourceSyncRun", back_populates="raw_records")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "provider", "record_type", "external_record_id", name="uq_raw_record"),
        Index("idx_raw_records_lookup", "owner_user_id", "provider", "record_type"),
    )
