"""Pydantic schemas for RAG retrieval and evidence justification."""
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field


class RAGSearchRequest(BaseModel):
    employee_id: str = Field(..., description="Internal employee UUID")
    query: str = Field(..., description="Semantic query text")
    competency: Optional[str] = Field(default=None, description="Optional competency filter")
    limit: int = Field(default=5, ge=1, le=20, description="Max evidence items to retrieve")


class RetrievedEvidenceItem(BaseModel):
    evidence_id: str
    source: str
    source_type: str
    source_reference: str
    title: str
    content: str
    occurred_at: str
    project_name: Optional[str] = None
    similarity_score: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RAGSearchResponse(BaseModel):
    employee_id: str
    query: str
    retrieved_count: int
    evidence: List[RetrievedEvidenceItem]


class JustificationRequest(BaseModel):
    employee_id: str = Field(..., description="Target employee UUID")
    competency: str = Field(..., description="Target competency category to justify")
    request_context: Optional[str] = Field(
        default=None,
        description="Optional specific inquiry, e.g. 'Identify strengths and recommended next development steps'"
    )


class JustificationResponse(BaseModel):
    """Evidence-grounded structured response from Qwen3 8B."""
    competency: str = Field(..., description="Evaluated competency")
    action: Optional[str] = Field(default=None, description="Concrete next development action, or null if insufficient")
    justification: str = Field(..., description="Evidence-grounded rationale")
    evidence_refs: List[str] = Field(default_factory=list, description="Validated internal evidence UUIDs supporting the conclusion")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence metric based on evidence support")
    evidence_sufficiency: Literal["sufficient", "limited", "insufficient"] = Field(
        ...,
        description="Categorical assessment of evidence sufficiency"
    )
    retrieved_evidence: List[RetrievedEvidenceItem] = Field(
        default_factory=list,
        description="Full evidence records backing the references for complete UI traceability"
    )
