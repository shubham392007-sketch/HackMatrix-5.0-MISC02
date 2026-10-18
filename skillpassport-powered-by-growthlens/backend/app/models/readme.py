import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class RepositoryReadmeSnapshot(Base, TimestampMixin):
    """
    Stores point-in-time README content and extraction metadata for an authenticated user's
    explicitly selected GitHub repository.
    """
    __tablename__ = "repository_readme_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    selected_resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("selected_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
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

    readme_path: Mapped[str] = mapped_column(String(255), default="README.md", nullable=False)
    blob_sha: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    html_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sections_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, default=list)

    sync_status: Mapped[str] = mapped_column(String(50), default="success", nullable=False)  # "success", "not_found", "empty", "forbidden", "failed"
    error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retrieval_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    selected_resource = relationship("SelectedResource", backref="readme_snapshots")
    connection = relationship("ConnectedSource")
    sync_run = relationship("SourceSyncRun")

    __table_args__ = (
        Index("idx_repo_readme_owner_repo", "owner_user_id", "repo_full_name"),
        Index("idx_repo_readme_current", "selected_resource_id", "is_current"),
    )
