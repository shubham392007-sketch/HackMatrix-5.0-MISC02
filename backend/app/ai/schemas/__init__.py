"""Centralized Pydantic Schemas for Structured Qwen3 8B Outputs."""
from typing import List, Optional
from pydantic import BaseModel, Field


class ExtractedSkillCandidate(BaseModel):
    name: str = Field(..., description="Canonical or extracted skill name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence score (0.0 - 1.0)")
    evidence_span: Optional[str] = Field(None, description="Exact phrase or excerpt indicating the skill")


class ExtractedCompetencyCandidate(BaseModel):
    name: str = Field(..., description="Target high-level competency area")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence score (0.0 - 1.0)")


class EvidenceExtractionOutput(BaseModel):
    """Structured output for Feature 1 evidence normalization and signal extraction."""
    competency_candidates: List[str] = Field(default_factory=list, description="Candidate competencies matched")
    skills: List[ExtractedSkillCandidate] = Field(default_factory=list, description="Extracted individual skills")
    evidence_type: str = Field(..., description="Classification: COMMIT, PULL_REQUEST, ISSUE_RESOLUTION, ASSESSMENT, etc.")
    evidence_summary: str = Field(..., description="Concise, factual factual summary of the observable engineering work")
    observable_outcome: Optional[str] = Field(None, description="Concrete measurable outcome or technical accomplishment")
    extracted_signals: List[str] = Field(default_factory=list, description="Observed behavioral and technical work signals")
    evidence_strength: str = Field(default="moderate", description="Strength: 'strong', 'moderate', 'weak'")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0, description="LLM extraction confidence")
    insufficient_information: bool = Field(default=False, description="True if input is too vague or lacks observable technical work")
    reasoning_basis: List[str] = Field(default_factory=list, description="Bullet points explaining why these skills were identified")
    evidence_refs: List[str] = Field(default_factory=list, description="List of source evidence IDs referenced")


class RAGJustificationOutput(BaseModel):
    """Structured output for RAG competency justification."""
    competency: str = Field(..., description="Target competency analyzed")
    action: Optional[str] = Field(None, description="Recommended development action or next step (None if insufficient)")
    justification: str = Field(..., description="Evidence-grounded explanation of competency status and action rationale")
    evidence_refs: List[str] = Field(default_factory=list, description="Authentic evidence record IDs directly supporting the claim")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="LLM interpretation confidence")
    evidence_sufficiency: str = Field(default="sufficient", description="'sufficient', 'limited', or 'insufficient'")
    limitations: Optional[str] = Field(None, description="Notes on stale, missing, or contradictory evidence")


class TrendExplanationOutput(BaseModel):
    """Structured output for Feature 2 analytical trajectory interpretation."""
    competency: str = Field(..., description="Competency name")
    trend: str = Field(..., description="Authoritative trend: 'improving', 'stagnating', or 'declining'")
    summary: str = Field(..., description="Clear human-readable summary of the trajectory")
    supporting_evidence: List[str] = Field(default_factory=list, description="Evidence items that confirm the trend")
    contradictory_evidence: List[str] = Field(default_factory=list, description="Evidence items that challenge or complicate the trend")
    missing_evidence: Optional[str] = Field(None, description="Identified evidence gaps or staleness")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0, description="Interpretation confidence")
    insufficient_evidence: bool = Field(default=False, description="True if evidence is too sparse for deep explanation")
    evidence_refs: List[str] = Field(default_factory=list, description="Valid evidence IDs cited in the analysis")


class RecommendationExplanationOutput(BaseModel):
    """Structured output for Feature 3 Next-Action recommendation contextualization."""
    action: str = Field(..., description="Action title or curriculum unit")
    action_type: str = Field(..., description="micro_learning, mentorship, project_outcome, or assessment")
    target_gap: str = Field(..., description="Specific skill weakness or decaying area addressed")
    reason: str = Field(..., description="Why this exact action addresses the observed gap")
    expected_benefit: str = Field(..., description="Anticipated competency uplift and decay mitigation")
    evidence_refs: List[str] = Field(default_factory=list, description="Evidence IDs demonstrating the gap")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0, description="Interpretation confidence")


class GrowthNarrativeOutput(BaseModel):
    """Structured output for Feature 4 longitudinal growth narrative and manager briefing."""
    narrative: str = Field(..., description="Flowing narrative with [1], [2] citation markers for evidence")
    key_improvements: List[str] = Field(default_factory=list, description="Core technical capabilities strengthened")
    stagnating_areas: List[str] = Field(default_factory=list, description="Competencies with plateauing signal")
    suggested_focus: List[str] = Field(default_factory=list, description="Priority focus areas for the upcoming quarter")
    staleness_warning: Optional[str] = Field(None, description="Warning if any critical skills lack recent evidence")
    confidence_interpretation: str = Field(..., description="Explanation of confidence bands and data freshness")
    evidence_refs: List[str] = Field(default_factory=list, description="All evidence IDs cited in the narrative")
