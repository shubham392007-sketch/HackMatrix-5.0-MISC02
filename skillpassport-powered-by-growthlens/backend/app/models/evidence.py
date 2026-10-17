import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, Float, ForeignKey, Index, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class EvidenceItem(Base, TimestampMixin):
    __tablename__ = "evidence_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Source provenance
    source_provider: Mapped[str] = mapped_column(String(50), nullable=False)  # "github", "jira", "certificate", "document", "portfolio", "research", "resume"
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "pull_request", "commit", "pdf_page", "jira_issue", "web_article"
    external_record_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Foreign linkage (nullable if standalone)
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("uploaded_documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    raw_record_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("raw_source_records.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Core content
    evidence_category: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_excerpt: Mapped[Text] = mapped_column(Text, nullable=False)
    extracted_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps
    observed_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ingestion_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Attribution
    contributor_identity: Mapped[str] = mapped_column(String(255), nullable=False)
    attribution_status: Mapped[str] = mapped_column(String(50), default="contributor", nullable=False)  # "owner", "author", "contributor", "self_reported", "unconfirmed"
    is_collaborative: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    project_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    # SEPARATE METRICS: Never combine into one number!
    evidence_strength: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)  # "high", "medium", "low"
    extraction_confidence: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)  # 0.0 - 1.0
    verification_status: Mapped[str] = mapped_column(String(50), default="unreviewed", nullable=False)  # "unreviewed", "source_checked", "needs_confirmation", "partially_supported", "verified", "insufficient_evidence", "rejected"
    processing_status: Mapped[str] = mapped_column(String(50), default="ready_for_review", nullable=False)  # "discovered", "normalized", "extracted", "indexed", "ready_for_review", "failed"

    # Provenance metadata (repo, branch, commit SHA, PR number, issue key, page/slide number)
    provenance: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    normalized_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), default="qwen3:8b", nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    competency_mappings = relationship("EvidenceCompetencyMapping", back_populates="evidence_item", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_evidence_owner_status", "owner_user_id", "processing_status"),
        Index("idx_evidence_owner_verification", "owner_user_id", "verification_status"),
        Index("idx_evidence_owner_observed", "owner_user_id", "observed_timestamp"),
        Index("idx_evidence_hash", "owner_user_id", "content_hash"),
    )


class EvidenceRelationship(Base, TimestampMixin):
    __tablename__ = "evidence_relationships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    source_evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "exact_duplicate", "near_duplicate", "cross_source_corroboration", "contradiction", "related_project", "superseded"
    confidence_score: Mapped[float] = mapped_column(Float, default=0.9, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("source_evidence_id", "target_evidence_id", "relationship_type", name="uq_evidence_rel"),
    )
