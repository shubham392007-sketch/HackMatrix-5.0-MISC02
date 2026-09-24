from datetime import datetime
from typing import Any, Literal
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class CanonicalEvidence(BaseModel):
    """
    Canonical evidence representation used across all providers (GitHub, Jira, etc.).
    Downstream AI & RAG pipelines operate solely on this normalized structure.
    """
    evidence_id: str = Field(default_factory=lambda: str(uuid4()), description="Stable internal unique ID")
    employee_id: str | None = Field(default=None, description="Mapped GrowthLens internal employee ID")
    source: Literal["github", "jira", "internal"] = Field(..., description="Provider source")
    source_type: str = Field(..., description="Type of evidence: commit, pull_request, issue, comment, etc.")
    source_reference: str = Field(..., description="Unique provider reference, e.g. commit SHA or Jira issue key")
    project_id: str | None = Field(default=None, description="External project or repository identifier")
    project_name: str | None = Field(default=None, description="External project or repository name")
    title: str = Field(..., description="Brief title or subject line")
    content: str = Field(..., description="Bounded, normalized text content describing the activity")
    occurred_at: datetime = Field(..., description="Timestamp when the activity occurred")
    evidence_type: str = Field(default="project_activity", description="Categorization of the evidence")
    evidence_strength: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence/strength score 0.0 - 1.0")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Provider-specific raw metadata")
    is_mapped: bool = Field(default=True, description="Whether associated to a recognized employee")
    unmapped_external_identity: str | None = Field(default=None, description="External username/email if unmapped")

    model_config = {"from_attributes": True}


class EvidenceCreate(BaseModel):
    employee_id: str | None = None
    source: Literal["github", "jira", "internal"]
    source_type: str
    source_reference: str
    project_id: str | None = None
    project_name: str | None = None
    title: str
    content: str
    occurred_at: datetime
    evidence_type: str = "project_activity"
    evidence_strength: float = 1.0
    metadata: dict[str, Any] = Field(default_factory=dict)
    is_mapped: bool = True
    unmapped_external_identity: str | None = None


class EvidenceResponse(CanonicalEvidence):
    ai_processed: bool = False
    ai_summary: str | None = None
    skills: list[dict[str, Any]] = Field(default_factory=list)
    competencies: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None
