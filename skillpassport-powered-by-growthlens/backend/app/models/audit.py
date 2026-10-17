import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class ReviewAuditEvent(Base):
    __tablename__ = "review_audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    target_record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    target_record_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "evidence_item", "competency_mapping", "connected_source"
    
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "status_change", "manual_correction", "verification_granted", "flagged_inaccurate", "source_disconnected", "evidence_deleted"
    previous_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    new_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reason_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    audit_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)

    __table_args__ = (
        Index("idx_audit_actor_time", "actor_user_id", "event_timestamp"),
        Index("idx_audit_target_time", "target_record_id", "event_timestamp"),
    )
