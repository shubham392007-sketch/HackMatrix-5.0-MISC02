"""Vector repository managing semantic evidence storage and isolated retrieval."""
from typing import Any, Dict, List, Optional
from backend.core.logging import get_logger
from backend.core.exceptions import VectorStoreError, CrossEmployeeAccessError
from backend.vectorstore.chroma_client import get_evidence_collection

logger = get_logger("vectorstore.repository")


class VectorEvidenceRepository:
    """Manages indexing and employee-isolated querying in ChromaDB."""

    def __init__(self):
        self.collection = get_evidence_collection()

    def index_evidence(
        self,
        evidence_id: str,
        employee_id: str,
        source: str,
        source_type: str,
        project_name: Optional[str],
        title: str,
        content: str,
        occurred_at: str,
        ai_summary: Optional[str] = None,
        competency_name: Optional[str] = None,
    ) -> None:
        """Upsert a canonical evidence record into ChromaDB."""
        if not employee_id:
            logger.warning(f"Skipping vector indexing for unmapped evidence {evidence_id}")
            return

        doc_text = f"Title: {title}\nActivity: {content}"
        if ai_summary:
            doc_text += f"\nSummary: {ai_summary}"

        metadata = {
            "evidence_id": str(evidence_id),
            "employee_id": str(employee_id),
            "source": str(source),
            "source_type": str(source_type),
            "project_name": str(project_name or "Unknown"),
            "occurred_at": str(occurred_at),
            "competency": str(competency_name or "General"),
        }

        try:
            self.collection.upsert(
                ids=[str(evidence_id)],
                documents=[doc_text],
                metadatas=[metadata],
            )
            logger.info(f"Indexed evidence {evidence_id} for employee {employee_id} in ChromaDB")
        except Exception as e:
            raise VectorStoreError(f"Failed to index vector in ChromaDB: {str(e)}")

    def query_evidence_by_employee(
        self,
        employee_id: str,
        query_text: str,
        competency_name: Optional[str] = None,
        n_results: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top relevant evidence for an employee.
        CRITICAL SECURITY REQUIREMENT:
        Evidence belonging to Employee A must NEVER be returned for Employee B.
        Enforced strictly at the vector database query filter level.
        """
        if not employee_id:
            raise CrossEmployeeAccessError("Query requires explicit employee_id")

        # Build metadata filter with strict employee isolation
        if competency_name:
            where_filter = {
                "$and": [
                    {"employee_id": {"$eq": str(employee_id)}},
                    {"competency": {"$eq": str(competency_name)}},
                ]
            }
        else:
            where_filter = {"employee_id": {"$eq": str(employee_id)}}

        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )
        except Exception as e:
            raise VectorStoreError(f"ChromaDB query failed: {str(e)}")

        output: List[Dict[str, Any]] = []
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i in range(len(ids)):
            meta = metadatas[i] if i < len(metadatas) else {}
            # Secondary runtime verification of employee isolation
            if str(meta.get("employee_id")) != str(employee_id):
                logger.critical(f"CROSS-EMPLOYEE LEAK DETECTED! Expected {employee_id}, found {meta.get('employee_id')}")
                continue

            output.append({
                "evidence_id": ids[i],
                "document": docs[i] if i < len(docs) else "",
                "metadata": meta,
                "distance": distances[i] if i < len(distances) else None,
            })

        return output

    def count(self) -> int:
        """Returns total vector records stored."""
        return self.collection.count()
