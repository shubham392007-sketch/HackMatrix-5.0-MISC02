import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Integer, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class ShareLinkRecord(Base, TimestampMixin):
    __tablename__ = "share_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Cryptographically secure unguessable token (e.g. sp_shr_...)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # 8 Templates: classic, executive, technical, ai_ml, engineering, academic, project, anonymous
    template_id: Mapped[str] = mapped_column(String(50), default="classic", nullable=False)
    
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, expired, revoked
    
    # Permissions and customization JSON
    permissions_json: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revocation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    messages = relationship("RecruiterMessage", back_populates="share_link", cascade="all, delete-orphan")
    events = relationship("ShareAccessEvent", back_populates="share_link", cascade="all, delete-orphan")


class UserCustomSkill(Base, TimestampMixin):
    """
    User-Declared Skill.
    STRICT INVARIANT: Self-Declared · Not independently verified.
    Never populates verified competencies taxonomy or inflates verified count.
    """
    __tablename__ = "user_custom_skills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    self_assessed_level: Mapped[str] = mapped_column(String(50), default="Intermediate", nullable=False)  # Beginner, Intermediate, Advanced, Expert
    tags: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    attached_evidence_ids: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    external_project_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)


class RecruiterMessage(Base, TimestampMixin):
    """
    Persistent message sent by a recruiter viewing an active shared passport.
    Delivered directly to candidate's dashboard notifications and message inbox.
    """
    __tablename__ = "recruiter_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    share_link_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("share_links.id", ondelete="CASCADE"), nullable=False, index=True)
    
    sender_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sender_email: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message_body: Mapped[str] = mapped_column(Text, nullable=False)
    
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reply_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    replied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    share_link = relationship("ShareLinkRecord", back_populates="messages")


class ShareAccessEvent(Base, TimestampMixin):
    """
    Real access events and audit telemetry for shared passport links.
    """
    __tablename__ = "share_access_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    share_link_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("share_links.id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # "created", "viewed", "permissions_updated", "revoked", "message_received"
    details: Mapped[str] = mapped_column(Text, nullable=False)
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    share_link = relationship("ShareLinkRecord", back_populates="events")


class UserNotification(Base, TimestampMixin):
    """
    Persistent in-app notification delivered to candidate's dashboard and notification bell.
    """
    __tablename__ = "user_notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="sharing", nullable=False)  # "sharing", "evidence", "verification", "system"
    severity: Mapped[str] = mapped_column(String(20), default="info", nullable=False)  # "info", "success", "warning", "error"
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    related_domain: Mapped[str] = mapped_column(String(100), default="Domain 6: Sharing & Recruiter", nullable=False)
    action_route: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g. "recruiter_message"
    entity_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class UserPassportConfigRecord(Base, TimestampMixin):
    """
    Master Skill Passport configuration, customizable profile sections,
    and portfolio artifacts owned privately by the authenticated user.
    """
    __tablename__ = "user_passport_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(255), default="Master Skill Passport", nullable=False)
    template_id: Mapped[str] = mapped_column(String(50), default="classic", nullable=False)

    # Section ordering and global visibility switches
    sections_config: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)

    # Optional section items populated directly by user
    work_experiences: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    education_entries: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    portfolio_projects: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    certifications: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    publications: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    achievements: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    custom_sections: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    sharing_permissions: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)


