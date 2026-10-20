import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Float, ForeignKey, Index, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class CompetencyTaxonomy(Base, TimestampMixin):
    __tablename__ = "competency_taxonomy"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True, index=True)
    normalized_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # "Backend Engineering", "Cloud Infrastructure", "System Architecture"
    description: Mapped[str] = mapped_column(Text, nullable=False)
    aliases: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    
    parent_competency_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competency_taxonomy.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    taxonomy_version: Mapped[str] = mapped_column(String(20), default="v1.0", nullable=False)

    mappings = relationship("EvidenceCompetencyMapping", back_populates="competency", cascade="all, delete-orphan")


class EvidenceCompetencyMapping(Base, TimestampMixin):
    __tablename__ = "evidence_competency_mappings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competency_taxonomy.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    mapping_method: Mapped[str] = mapped_column(String(50), nullable=False)  # "exact_match", "embedding_similarity", "llm_proposal", "manual_review"
    relevance_score: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    
    # Supporting excerpt is MANDATORY for traceability
    supporting_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="candidate", nullable=False)  # "candidate", "reviewed", "flagged", "insufficient"
    proficiency_level: Mapped[str] = mapped_column(String(50), default="Practitioner", nullable=False)  # "Foundation", "Working", "Practitioner", "Advanced"

    @property
    def confidence_score(self) -> float:
        return self.relevance_score

    evidence_item = relationship("EvidenceItem", back_populates="competency_mappings")
    competency = relationship("CompetencyTaxonomy", back_populates="mappings")

    __table_args__ = (
        UniqueConstraint("evidence_id", "competency_id", name="uq_evidence_competency"),
        Index("idx_mapping_owner_status", "owner_user_id", "status"),
    )
