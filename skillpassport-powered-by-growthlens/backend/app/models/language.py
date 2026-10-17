import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, BigInteger, Float, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class RepositoryLanguageSnapshot(Base, TimestampMixin):
    """
    Stores a point-in-time language statistics snapshot for an authenticated user's
    explicitly selected GitHub repository.
    """
    __tablename__ = "repository_language_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    selected_resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("selected_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    github_repo_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    repo_full_name: Mapped[str] = mapped_column(String(255), nullable=False)  # "owner/repo"
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("connected_sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sync_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("source_sync_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    total_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    retrieval_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    sync_status: Mapped[str] = mapped_column(String(50), default="success", nullable=False)  # "success", "empty", "failed", "partial"
    error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    selected_resource = relationship("SelectedResource", backref="language_snapshots")
    connection = relationship("ConnectedSource")
    sync_run = relationship("SourceSyncRun")
    breakdowns: Mapped[List["RepositoryLanguageBreakdown"]] = relationship(
        "RepositoryLanguageBreakdown",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="desc(RepositoryLanguageBreakdown.byte_count)",
    )

    __table_args__ = (
        Index("idx_repo_lang_owner_repo", "owner_user_id", "repo_full_name"),
        Index("idx_repo_lang_current", "selected_resource_id", "is_current"),
    )


class RepositoryLanguageBreakdown(Base, TimestampMixin):
    """
    Stores the individual byte counts and calculated percentages per detected language.
    """
    __tablename__ = "repository_language_breakdowns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repository_language_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language_name: Mapped[str] = mapped_column(String(100), nullable=False)
    byte_count: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    snapshot = relationship("RepositoryLanguageSnapshot", back_populates="breakdowns")

    __table_args__ = (
        UniqueConstraint("snapshot_id", "language_name", name="uq_snapshot_language"),
        Index("idx_breakdown_language", "language_name"),
    )
