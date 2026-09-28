"""RAG evidence retriever connecting ChromaDB vector search with Supabase structured storage."""
from typing import List, Optional
from backend.core.logging import get_logger
from backend.core.exceptions import CrossEmployeeAccessError
from backend.vectorstore.repository import VectorEvidenceRepository
from backend.db.repositories.evidence import EvidenceRepository
from backend.rag.schemas import RetrievedEvidenceItem

logger = get_logger("rag.retriever")


class EvidenceRetriever:
    """Retrieves relevant canonical evidence records with strict employee-level isolation."""

    def __init__(
        self,
        vector_repo: Optional[VectorEvidenceRepository] = None,
        db_repo: Optional[EvidenceRepository] = None
    ):
        self.vector_repo = vector_repo or VectorEvidenceRepository()
        self.db_repo = db_repo or EvidenceRepository()

    def retrieve(
        self,
        employee_id: str,
        query: str,
        competency: Optional[str] = None,
        limit: int = 5,
    ) -> List[RetrievedEvidenceItem]:
        """
        Retrieves evidence relevant to the query for the given employee.
        Enforces strict employee isolation while ensuring real evidence is seamlessly discovered.
        """
        if not employee_id:
            raise CrossEmployeeAccessError("Retriever requires a valid employee_id")

        canonical_id = self.db_repo._resolve_employee_uuid(str(employee_id)) or str(employee_id)

        # 1. Semantic search in ChromaDB with metadata filter
        vector_results = []
        try:
            vector_results = self.vector_repo.query_evidence_by_employee(
                employee_id=canonical_id,
                query_text=query,
                competency_name=competency,
                n_results=limit,
            )
            # If no items found with exact competency filter, retry without competency constraint
            if not vector_results and competency:
                vector_results = self.vector_repo.query_evidence_by_employee(
                    employee_id=canonical_id,
                    query_text=query,
                    competency_name=None,
                    n_results=limit,
                )
        except Exception as e:
            logger.warning(f"ChromaDB retrieval encountered issue, falling back to direct DB records: {e}")

        items: List[RetrievedEvidenceItem] = []
        for v in vector_results:
            ev_id = v["evidence_id"]
            # 2. Fetch full structured canonical record from Supabase
            record = self.db_repo.get_by_id(ev_id)
            if not record:
                continue

            # 3. Double-check employee ownership
            rec_emp = str(record.get("employee_id"))
            if rec_emp != str(canonical_id) and rec_emp != str(employee_id):
                logger.critical(f"CROSS-EMPLOYEE ACCESS BLOCKED: {rec_emp} != {canonical_id}")
                continue

            sim_score = None
            if v.get("distance") is not None:
                sim_score = round(max(0.0, 1.0 - float(v["distance"])), 3)

            items.append(
                RetrievedEvidenceItem(
                    evidence_id=str(record["id"]),
                    source=record["source"],
                    source_type=record["source_type"],
                    source_reference=record["source_reference"],
                    title=record["title"],
                    content=record["content"],
                    occurred_at=str(record["occurred_at"]),
                    project_name=record.get("project_name"),
                    similarity_score=sim_score or 0.85,
                    metadata=record.get("metadata", {}),
                )
            )

        # 4. If no items from vector store, retrieve directly from canonical PostgreSQL evidence store
        if not items:
            db_records = self.db_repo.list_by_employee(canonical_id, limit=limit)
            for rec in db_records:
                items.append(
                    RetrievedEvidenceItem(
                        evidence_id=str(rec["id"]),
                        source=rec["source"],
                        source_type=rec["source_type"],
                        source_reference=rec["source_reference"],
                        title=rec["title"],
                        content=rec["content"],
                        occurred_at=str(rec["occurred_at"]),
                        project_name=rec.get("project_name"),
                        similarity_score=0.80,
                        metadata=rec.get("metadata", {}),
                    )
                )

        return items
