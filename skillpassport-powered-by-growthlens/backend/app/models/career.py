import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Integer, Float, ForeignKey, Index, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class JobPostingRecord(Base, TimestampMixin):
    """
    Persisted real job vacancy records retrieved from TheirStack, JSearch,
    Fantastic.jobs, or uploaded by user.
    """
    __tablename__ = "job_postings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # theirstack, jsearch, fantastic_jobs, custom_upload
    provider_job_id: Mapped[str] = mapped_column(String(255), nullable=False)
    canonical_dedupe_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    remote_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # remote, hybrid, on_site
    employment_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # full_time, part_time, contract, internship
    seniority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # entry, mid, senior, lead, executive
    
    salary_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    salary_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    salary_currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    salary_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # yearly, monthly, hourly
    
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    apply_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_stale: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    extracted_requirements: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    raw_source_metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="")

    __table_args__ = (
        Index("idx_job_postings_provider_pid", "provider", "provider_job_id"),
        Index("idx_job_postings_title_company", "title", "company_name"),
    )


class RoleDemandModelRecord(Base, TimestampMixin):
    """
    Versioned role demand models: Curated benchmarks, Job-derived clusters,
    and Custom user parsed JD roles.
    """
    __tablename__ = "role_demand_models"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(50), nullable=False, default="v2026.1")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    seniority: Mapped[str] = mapped_column(String(50), nullable=False, default="Mid Level")
    context: Mapped[str] = mapped_column(String(150), nullable=False, default="General")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    provenance: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="curated_model")  # curated_model, job_derived, custom_parsed_job
    
    source_job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_postings.id", ondelete="SET NULL"),
        nullable=True,
    )
    owner_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    competencies: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("role_id", "version", "owner_user_id", name="uq_role_id_version_owner"),
        Index("idx_role_models_role_version", "role_id", "version"),
    )


class UserTargetRoleRecord(Base, TimestampMixin):
    """
    Persisted active target role selection per user.
    """
    __tablename__ = "user_target_roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    target_role_id: Mapped[str] = mapped_column(String(100), nullable=False)
    target_role_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v2026.1")
    role_title: Mapped[str] = mapped_column(String(255), nullable=False)
    selected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class RoleMatchSnapshotRecord(Base, TimestampMixin):
    """
    Reproducible match calculation snapshot tied to exact versions.
    """
    __tablename__ = "role_match_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    role_version: Mapped[str] = mapped_column(String(50), nullable=False)
    capability_state_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0")
    matching_policy_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v2026.1")
    
    overall_match_score: Mapped[float] = mapped_column(Float, nullable=False)
    required_coverage_score: Mapped[float] = mapped_column(Float, nullable=False)
    supporting_coverage_score: Mapped[float] = mapped_column(Float, nullable=False)
    readiness_index: Mapped[float] = mapped_column(Float, nullable=False)
    
    match_summary: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    gaps_data: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    readiness_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    priorities_data: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    handoff_data: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_match_snapshots_owner_role", "owner_user_id", "role_id", "role_version"),
    )


class JobSearchCacheRecord(Base, TimestampMixin):
    """
    Server-side cache for job discovery queries to minimize external API costs.
    """
    __tablename__ = "job_search_cache"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cache_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    mode: Mapped[str] = mapped_column(String(50), nullable=False)  # mode_a_skills, mode_b_role
    query_text: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_used: Mapped[str] = mapped_column(String(50), nullable=False)
    
    result_job_ids: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    result_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    influencing_skills: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
