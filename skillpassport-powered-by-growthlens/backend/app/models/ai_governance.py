import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, Float, ForeignKey, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class AIAnalysisRun(Base, TimestampMixin):
    __tablename__ = "ai_analysis_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    input_evidence_ids: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    analysis_type: Mapped[str] = mapped_column(String(50), nullable=False, default="work_analysis")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued")  # queued, running, completed, failed
    
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    model_name: Mapped[str] = mapped_column(String(100), nullable=False, default="qwen3:8b")
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0")
    schema_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0")
    validator_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0")
    
    processing_warnings: Mapped[List[dict]] = mapped_column(JSONB, default=list, nullable=False)
    error_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    output_record_refs: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (
        Index("idx_ai_run_owner_status", "owner_user_id", "status"),
        Index("idx_ai_run_created", "created_at"),
    )


class WorkAnalysisResult(Base, TimestampMixin):
    __tablename__ = "work_analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_analysis_runs.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    observed_facts: Mapped[List[dict]] = mapped_column(JSONB, default=list, nullable=False)
    claimed_information: Mapped[List[dict]] = mapped_column(JSONB, default=list, nullable=False)
    inferred_attributes: Mapped[List[dict]] = mapped_column(JSONB, default=list, nullable=False)
    technical_tasks: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    technologies: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    uncertainty_flags: Mapped[List[dict]] = mapped_column(JSONB, default=list, nullable=False)

    confidence_score: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    role_identified: Mapped[str] = mapped_column(String(100), default="Contributor", nullable=False)

    analysis_method: Mapped[str] = mapped_column(String(50), default="ollama", nullable=False)  # 'ollama' | 'rule_based'
    model_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fallback_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    analysis_status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False)  # 'completed' | 'failed' | 'insufficient_evidence'
    validation_status: Mapped[str] = mapped_column(String(50), default="valid", nullable=False)  # 'valid' | 'invalid' | 'warning'

    __table_args__ = (
        Index("idx_work_analysis_owner_ev", "owner_user_id", "evidence_id"),
    )


class EvidenceQualityAssessment(Base, TimestampMixin):
    __tablename__ = "evidence_quality_assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    candidate_skill_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    quality_score: Mapped[float] = mapped_column(Float, default=0.8, nullable=False)
    quality_band: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)  # high, medium, low, insufficient
    factors: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)  # reliability, directness, recency, etc.
    explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    calculation_version: Mapped[str] = mapped_column(String(50), default="v1.0", nullable=False)

    __table_args__ = (
        Index("idx_quality_owner_ev", "owner_user_id", "evidence_id"),
    )


class VerificationDecision(Base, TimestampMixin):
    __tablename__ = "verification_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_mapping_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_competency_mappings.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    competency_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competency_taxonomy.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    reviewer_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    verification_state: Mapped[str] = mapped_column(String(50), default="candidate", nullable=False)
    decision_rationale: Mapped[str] = mapped_column(Text, nullable=False)
    rule_version: Mapped[str] = mapped_column(String(50), default="policy-v2026.1", nullable=False)
    supporting_evidence_ids: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    conflict_ids: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    superseded_decision_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    __table_args__ = (
        Index("idx_verif_owner_state", "owner_user_id", "verification_state"),
    )


class HallucinationGuardResult(Base, TimestampMixin):
    __tablename__ = "hallucination_guard_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    analysis_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("work_analysis_results.id", ondelete="SET NULL"),
        nullable=True,
    )
    candidate_mapping_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_competency_mappings.id", ondelete="SET NULL"),
        nullable=True,
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    citation_validation: Mapped[str] = mapped_column(String(50), default="pass", nullable=False)  # pass, fail, missing
    citation_verbatim_found: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ownership_check: Mapped[str] = mapped_column(String(50), default="pass", nullable=False)  # pass, fail
    semantic_support_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    contradiction_check: Mapped[str] = mapped_column(String(50), default="none", nullable=False)  # none, flagged
    guard_outcome: Mapped[str] = mapped_column(String(50), default="PASS", nullable=False)  # PASS, BLOCK, INSUFFICIENT_EVIDENCE, CONFLICT
    reason_codes: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    guard_version: Mapped[str] = mapped_column(String(50), default="v1.0", nullable=False)

    __table_args__ = (
        Index("idx_guard_owner_outcome", "owner_user_id", "guard_outcome"),
    )


class OutputValidationRun(Base, TimestampMixin):
    __tablename__ = "output_validation_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_analysis_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_type: Mapped[str] = mapped_column(String(50), nullable=False, default="work_analysis")
    schema_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    missing_fields: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    invalid_references: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    semantic_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_messages: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    final_status: Mapped[str] = mapped_column(String(50), default="valid", nullable=False)  # valid, invalid, repaired
    validator_version: Mapped[str] = mapped_column(String(50), default="v1.0", nullable=False)

    __table_args__ = (
        Index("idx_val_owner_status", "owner_user_id", "final_status"),
    )


class EvidenceConflictRecord(Base, TimestampMixin):
    __tablename__ = "evidence_conflicts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    evidence_a_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_b_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    candidate_skill_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    conflict_field: Mapped[str] = mapped_column(String(100), nullable=False)
    evidence_a_assertion: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_b_assertion: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_resolution: Mapped[str] = mapped_column(Text, default="", nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False)  # open, resolved, ignored
    resolution_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_conflict_owner_status", "owner_user_id", "status"),
    )


class PromptInjectionFinding(Base, TimestampMixin):
    __tablename__ = "prompt_injection_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    source_type: Mapped[str] = mapped_column(String(50), default="document", nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)  # low, medium, high, critical
    detected_pattern: Mapped[str] = mapped_column(String(150), nullable=False)
    quarantined_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    handling_outcome: Mapped[str] = mapped_column(String(50), default="quarantined", nullable=False)
    action_taken: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("idx_injection_owner_risk", "owner_user_id", "risk_level"),
    )


class HumanReviewTask(Base, TimestampMixin):
    __tablename__ = "human_review_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    task_type: Mapped[str] = mapped_column(String(50), nullable=False)  # uncertainty, conflict, hallucination_block, verification_request, prompt_injection
    priority: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)  # low, medium, high, urgent
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, in_review, approved, rejected, escalated

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_items.id", ondelete="CASCADE"),
        nullable=True,
    )
    candidate_mapping_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_competency_mappings.id", ondelete="SET NULL"),
        nullable=True,
    )
    conflict_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_conflicts.id", ondelete="SET NULL"),
        nullable=True,
    )

    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reviewer_action: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_review_task_owner_status", "owner_user_id", "status"),
    )


class AIEvaluationSuiteRun(Base, TimestampMixin):
    __tablename__ = "ai_evaluation_suite_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    suite_name: Mapped[str] = mapped_column(String(150), nullable=False)
    suite_version: Mapped[str] = mapped_column(String(50), default="v1.0", nullable=False)
    total_tests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passed_tests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_tests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pass_rate: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    results: Mapped[List[dict]] = mapped_column(JSONB, default=list, nullable=False)
    initiated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
