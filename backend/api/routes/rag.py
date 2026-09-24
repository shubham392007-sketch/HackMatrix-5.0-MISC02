"""RAG Retrieval and Justification Engine API Endpoints."""
from fastapi import APIRouter
from backend.rag.service import RAGService
from backend.rag.schemas import (
    RAGSearchRequest,
    RAGSearchResponse,
    JustificationRequest,
    JustificationResponse,
)

router = APIRouter(prefix="/rag", tags=["RAG & Intelligence"])


@router.post("/search", response_model=RAGSearchResponse)
async def semantic_evidence_search(req: RAGSearchRequest):
    """
    Search employee evidence semantically with metadata filters.
    Strictly isolated: never returns evidence belonging to other employees.
    """
    service = RAGService()
    return service.search_evidence(req)


@router.post("/justify", response_model=JustificationResponse)
async def justify_competency(req: JustificationRequest):
    """
    Execute the full Evidence Justification Engine:
    1. Retrieves employee-isolated evidence semantically.
    2. Invokes local Qwen3 8B with strictly bounded evidence context.
    3. Returns evidence-grounded action, justification, and validated references.
    4. Audits recommendation in Supabase.
    """
    service = RAGService()
    return await service.justify_competency(req)
