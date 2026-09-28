"""Orchestrator for the GrowthLens RAG Evidence Retrieval & Justification Pipeline."""
from typing import Optional
from backend.core.logging import get_logger
from backend.core.exceptions import CrossEmployeeAccessError, DatabaseError
from backend.db.client import get_supabase_client
from backend.rag.retriever import EvidenceRetriever
from backend.rag.generator import EvidenceJustificationGenerator
from backend.rag.schemas import (
    RAGSearchRequest,
    RAGSearchResponse,
    JustificationRequest,
    JustificationResponse,
)

logger = get_logger("rag.service")


class RAGService:
    """End-to-end RAG orchestrator for evidence retrieval, justification, and traceability."""

    def __init__(
        self,
        retriever: Optional[EvidenceRetriever] = None,
        generator: Optional[EvidenceJustificationGenerator] = None,
    ):
        self.retriever = retriever or EvidenceRetriever()
        self.generator = generator or EvidenceJustificationGenerator()
        self.client = get_supabase_client()

    def _resolve_employee(self, raw_id: str) -> str:
        """Resolves target employee ID across employees, user_id, and profiles."""
        from backend.db.repositories.evidence import EvidenceRepository
        repo = EvidenceRepository()
        resolved = repo._resolve_employee_uuid(raw_id)
        if resolved:
            return resolved
        return raw_id

    def search_evidence(self, req: RAGSearchRequest) -> RAGSearchResponse:
        """Execute employee-isolated semantic evidence retrieval."""
        canonical_id = self._resolve_employee(req.employee_id)

        items = self.retriever.retrieve(
            employee_id=canonical_id,
            query=req.query,
            competency=req.competency,
            limit=req.limit,
        )

        return RAGSearchResponse(
            employee_id=req.employee_id,
            query=req.query,
            retrieved_count=len(items),
            evidence=items,
        )

    async def justify_competency(self, req: JustificationRequest) -> JustificationResponse:
        """
        Executes complete RAG justification:
        1. Formulates semantic retrieval query from competency context.
        2. Retrieves employee-isolated evidence.
        3. Invokes Qwen3 8B Evidence Justification Engine.
        4. Validates and reconciles evidence references.
        5. Persists recommendation and evidence links in Supabase for traceability.
        """
        canonical_id = self._resolve_employee(req.employee_id)
        inquiry = req.request_context or req.question or ""

        # Construct contextual search query
        search_query = f"Evidence of work, commits, tasks, issues, and problem solving related to {req.competency}"
        if inquiry:
            search_query += f". {inquiry}"

        # Retrieve relevant evidence with strict employee filter
        retrieved_evidence = self.retriever.retrieve(
            employee_id=canonical_id,
            query=search_query,
            competency=req.competency,
            limit=6,
        )

        # Generate evidence-grounded justification
        response = await self.generator.generate_justification(
            employee_id=canonical_id,
            competency=req.competency,
            retrieved_evidence=retrieved_evidence,
            query=inquiry,
        )

        # Persist recommendation record in Supabase
        try:
            from backend.db.client import execute_with_retry
            rec_payload = {
                "employee_id": canonical_id,
                "competency_name": req.competency,
                "action": response.action,
                "justification": response.justification,
                "confidence": response.confidence,
                "evidence_sufficiency": response.evidence_sufficiency,
                "metadata": {"query": inquiry}
            }
            rec_res = execute_with_retry(lambda: self.client.table("recommendations").insert(rec_payload).execute())
            if rec_res.data:
                rec_id = rec_res.data[0]["id"]
                # Link each evidence reference
                for ev_ref in response.evidence_refs:
                    execute_with_retry(lambda: self.client.table("recommendation_evidence").insert({
                        "recommendation_id": rec_id,
                        "evidence_id": ev_ref,
                    }).execute())
        except Exception as e:
            logger.error(f"Failed to persist recommendation audit: {e}")

        return response
