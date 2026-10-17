import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class ConnectedSource(Base, TimestampMixin):
    __tablename__ = "connected_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # "github", "jira"
    account_identity: Mapped[str] = mapped_column(String(255), nullable=False)  # "octocat" / "email@company.com"
    connection_status: Mapped[str] = mapped_column(String(50), nullable=False, default="connected")  # "connected", "syncing", "needs_attention", "disconnected"
    
    # Encrypted token storage
    encrypted_credentials: Mapped[str] = mapped_column(Text, nullable=False)
    credential_key_version: Mapped[str] = mapped_column(String(20), default="v1", nullable=False)
    
    # Permissions and details
    requested_scopes: Mapped[Optional[List[str]]] = mapped_column(JSONB, default=list)
    granted_scopes: Mapped[Optional[List[str]]] = mapped_column(JSONB, default=list)
    connection_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    latest_error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    disconnected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    selected_resources = relationship("SelectedResource", back_populates="connection", cascade="all, delete-orphan")
    sync_runs = relationship("SourceSyncRun", back_populates="connection", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "provider", "account_identity", name="uq_owner_provider_identity"),
        Index("idx_connected_sources_owner_status", "owner_user_id", "connection_status"),
    )


class SelectedResource(Base, TimestampMixin):
    __tablename__ = "selected_resources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("connected_sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_resource_id: Mapped[str] = mapped_column(String(255), nullable=False)  # "octocat/repo" / "PROJ_KEY"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_selected: Mapped[bool] = mapped_column(default=True, nullable=False)
    content_categories: Mapped[Optional[List[str]]] = mapped_column(JSONB, default=list)  # ["commits", "prs", "issues"]
    
    last_synced_cursor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    access_warning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    connection = relationship("ConnectedSource", back_populates="selected_resources")

    __table_args__ = (
        UniqueConstraint("connection_id", "external_resource_id", name="uq_conn_resource"),
    )
