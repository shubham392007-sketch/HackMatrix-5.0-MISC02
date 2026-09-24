"""Pydantic schemas for LLM-based evidence extraction."""
from typing import List, Literal
from pydantic import BaseModel, Field


class ExtractedSkill(BaseModel):
    name: str = Field(..., description="Name of the technical or professional skill extracted")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")


class ExtractedCompetency(BaseModel):
    name: str = Field(..., description="High-level competency category inferred from evidence")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")


class EvidenceExtractionResult(BaseModel):
    """Structured extraction output guaranteed from Qwen3 8B."""
    evidence_summary: str = Field(..., description="Concise, factual summary of the activity")
    skills: List[ExtractedSkill] = Field(default_factory=list, description="Candidate skills identified directly in evidence")
    competencies: List[ExtractedCompetency] = Field(default_factory=list, description="Candidate competencies mapped")
    evidence_type: str = Field(default="project_activity", description="Categorization, e.g. commit, code_review, bug_fix")
    evidence_strength: float = Field(default=0.8, ge=0.0, le=1.0, description="Evidence reliability/strength metric")
    reasoning: str = Field(..., description="Brief explanation grounding the extraction in the evidence")
