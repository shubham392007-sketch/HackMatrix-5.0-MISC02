"""
Learn & Grow Domain Database Models.
Owned exclusively by Domain 5 (Learn & Grow).
Does not modify any existing upstream tables.
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Integer,
    Float,
    ForeignKey,
    Index,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class LearningRoadmap(Base, TimestampMixin):
    """
    Persisted learning roadmap generated for an authenticated user.
    Tracks progression, mastery, and the upstream career snapshot used to generate it.
    """
    __tablename__ = "learning_roadmaps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    path_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    domain_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    domain_title: Mapped[str] = mapped_column(String(255), nullable=False)
    blueprint_version: Mapped[str] = mapped_column(String(50), default="v1.0", nullable=False)

    target_role_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    target_role_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="in_progress", nullable=False)
    baseline_mastery: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_mastery: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_mastery: Mapped[float] = mapped_column(Float, default=85.0, nullable=False)
    estimated_total_hours: Mapped[float] = mapped_column(Float, default=12.0, nullable=False)

    total_steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    upstream_snapshot_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    upstream_snapshot_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    steps: Mapped[List["LearningStep"]] = relationship(
        "LearningStep",
        back_populates="roadmap",
        cascade="all, delete-orphan",
        order_by="LearningStep.sequence_order",
    )

    __table_args__ = (
        UniqueConstraint("owner_user_id", "domain_id", "path_id", name="uq_owner_domain_path"),
        Index("idx_roadmaps_owner_status", "owner_user_id", "status"),
    )


class LearningStep(Base, TimestampMixin):
    """
    Individual learning step within a personalized roadmap.
    Tracks prerequisites, resource recommendations, and mastery targets.
    """
    __tablename__ = "learning_steps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roadmap_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_roadmaps.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    step_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    topic_id: Mapped[str] = mapped_column(String(100), nullable=False)
    module_id: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    learning_objective: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), default="Intermediate", nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    sequence_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    current_mastery: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_mastery: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)

    prerequisite_ids: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    prerequisites_met: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="available", nullable=False)

    recommendation_reason: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_resource_ids: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    practice_exercise_ids: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    assessment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    roadmap: Mapped["LearningRoadmap"] = relationship("LearningRoadmap", back_populates="steps")

    __table_args__ = (
        UniqueConstraint("roadmap_id", "step_id", name="uq_roadmap_step"),
        Index("idx_steps_roadmap_order", "roadmap_id", "sequence_order"),
    )


class LearningResourceItem(Base, TimestampMixin):
    """
    Catalog of validated learning resources discovered from YouTube, DEV.to, and GitHub.
    Deduplicated and validated against SSRF.
    """
    __tablename__ = "learning_resources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    associated_skills: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), default="Intermediate", nullable=False)
    learning_objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prerequisites: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    provider_metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    is_validated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class LearningAttempt(Base, TimestampMixin):
    """
    Submission records for practice exercises, knowledge assessments, and mini-projects.
    Never marks a Skill Passport skill as verified.
    """
    __tablename__ = "learning_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    step_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    roadmap_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_roadmaps.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    attempt_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # practice, assessment, project, diagnostic
    activity_id: Mapped[str] = mapped_column(String(100), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    signals: Mapped[Dict[str, float]] = mapped_column(JSONB, default=dict, nullable=False)
    computed_mastery: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    attempt_metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (
        Index("idx_attempts_owner_type", "owner_user_id", "attempt_type"),
    )


class LearningMasterySnapshot(Base):
    """
    Time-series snapshots of capability and mastery improvement across learning domains.
    """
    __tablename__ = "learning_mastery_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    domain_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    skill_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    canonical_name: Mapped[str] = mapped_column(String(255), nullable=False)

    mastery_score: Mapped[float] = mapped_column(Float, nullable=False)
    knowledge_signal: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    practice_signal: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    assessment_signal: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    project_signal: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_mastery_snapshots_owner_skill", "owner_user_id", "skill_id", "recorded_at"),
    )


class LearningAssessment(Base, TimestampMixin):
    """
    AI-generated or curated knowledge and mastery assessment definitions.
    Stores the full protected question set, including options, answer keys, rubrics, and explanations.
    Answer keys and rubrics are stripped before delivery to learners.
    """
    __tablename__ = "learning_assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    roadmap_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_roadmaps.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    step_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    skill_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    skill_name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    learning_objective: Mapped[str] = mapped_column(Text, nullable=False)
    passing_threshold: Mapped[float] = mapped_column(Float, default=70.0, nullable=False)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    generation_method: Mapped[str] = mapped_column(String(50), default="ollama_qwen", nullable=False)
    generation_latency_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Full protected questions array: [{id, question_text, category, options, correct_index, explanation, points, difficulty}]
    questions_data: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)

    __table_args__ = (
        Index("idx_assessments_owner_skill", "owner_user_id", "skill_id"),
        Index("idx_assessments_roadmap_step", "roadmap_id", "step_id"),
    )


class LearningProjectSubmission(Base, TimestampMixin):
    """
    Submission records for applied mini-projects (Domain 5).
    Maintains repository submission status distinct from scored evaluations.
    Does NOT increment topic mastery or project signal until server evaluated.
    """
    __tablename__ = "learning_project_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    step_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    roadmap_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_roadmaps.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    github_repo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    summary_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="submitted", nullable=False)  # "submitted", "evaluated"
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rubric_scores: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    submission_metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (
        Index("idx_project_submissions_owner_proj", "owner_user_id", "project_id"),
    )


# Architectural compatibility aliases
LearningRoadmapModel = LearningRoadmap
LearningStepModel = LearningStep
LearningResourceModel = LearningResourceItem
LearningAttemptModel = LearningAttempt
LearningMasterySnapshotModel = LearningMasterySnapshot
LearningAssessmentModel = LearningAssessment
LearningProjectSubmissionModel = LearningProjectSubmission


