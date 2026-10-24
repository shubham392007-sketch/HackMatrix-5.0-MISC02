import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Integer, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class EmployerOrganization(Base, TimestampMixin):
    """
    Verified employer or recruitment agency organization profile.
    Maintains organization-level isolation and team memberships.
    """
    __tablename__ = "employer_organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    company_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    memberships = relationship("OrganizationMembership", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMembership(Base, TimestampMixin):
    """
    Trusted membership record establishing recruiter, hiring manager,
    or organization administrator privileges for an authenticated user.
    """
    __tablename__ = "organization_memberships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employer_organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Privileged roles: 'recruiter', 'hiring_manager', 'org_admin'
    role: Mapped[str] = mapped_column(String(50), default="recruiter", nullable=False)
    
    # Status: 'active', 'pending_approval', 'suspended'
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    
    job_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    public_contact_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    public_contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_public_contact_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    organization = relationship("EmployerOrganization", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_user_membership"),
        Index("idx_org_memberships_user_status", "user_id", "status"),
    )


class CandidateShareInvitation(Base, TimestampMixin):
    """
    Durable record tracking a candidate Skill Passport shared with a specific recruiter
    or submitted in response to a published job opening.
    """
    __tablename__ = "candidate_share_invitations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    share_link_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("share_links.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    candidate_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Recruiter targeting
    recruiter_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    recruiter_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Optional job association
    job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_postings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Optional personal note from candidate
    candidate_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Delivery status: 'delivered' (in-app to recruiter), 'pending_account' (email not yet on platform)
    delivery_status: Mapped[str] = mapped_column(String(50), default="delivered", nullable=False)
    
    # Pipeline status: 'new', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'
    pipeline_status: Mapped[str] = mapped_column(String(50), default="new", nullable=False, index=True)
    
    is_read_by_recruiter: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Private recruiter notes (organization-isolated)
    recruiter_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_status_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_share_invitations_recruiter_status", "recruiter_user_id", "pipeline_status"),
        Index("idx_share_invitations_email", "recruiter_email"),
        Index("idx_share_invitations_candidate", "candidate_user_id"),
    )
