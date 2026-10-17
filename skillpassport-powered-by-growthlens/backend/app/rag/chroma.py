import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger

logger = get_logger("rag.chroma")

CHROMA_PERSIST_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "chroma_db"


class ChromaEvidenceStore:
    def __init__(self):
        CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(CHROMA_PERSIST_DIR),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection_name = "skill_passport_evidence"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "SkillPassport Domain 1 Evidence Vectors"},
        )
        logger.info(f"Initialized ChromaDB persistent collection '{self.collection_name}' at {CHROMA_PERSIST_DIR}")

    def index_evidence_item(
        self,
        evidence_id: str,
        owner_user_id: str,
        title: str,
        description: str,
        excerpt: str,
        source_provider: str,
        category: str,
        strength: str = "medium",
        verification_status: str = "unreviewed",
    ) -> bool:
        """Indexes or updates an evidence item in ChromaDB."""
        try:
            document_text = f"Title: {title}\nDescription: {description}\nExcerpt: {excerpt}"
            metadata = {
                "owner_user_id": str(owner_user_id),
                "source_provider": str(source_provider),
                "category": str(category),
                "strength": str(strength),
                "verification_status": str(verification_status),
                "title": str(title)[:100],
            }

            self.collection.upsert(
                ids=[str(evidence_id)],
                documents=[document_text],
                metadatas=[metadata],
            )
            logger.info(f"Indexed evidence item {evidence_id} in ChromaDB")
            return True
        except Exception as e:
            logger.error(f"Failed to index evidence item {evidence_id} in ChromaDB: {e}")
            return False

    def search_evidence(
        self,
        query: str,
        owner_user_id: str,
        n_results: int = 10,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Performs semantic similarity search over evidence owned by the user."""
        try:
            where_filter: Dict[str, Any] = {"owner_user_id": str(owner_user_id)}
            if category:
                where_filter = {
                    "$and": [
                        {"owner_user_id": str(owner_user_id)},
                        {"category": str(category)},
                    ]
                }

            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter,
            )

            hits = []
            if results and results["ids"] and len(results["ids"][0]) > 0:
                ids = results["ids"][0]
                docs = results["documents"][0] if results["documents"] else []
                metas = results["metadatas"][0] if results["metadatas"] else []
                distances = results["distances"][0] if results["distances"] else []

                for i in range(len(ids)):
                    hits.append({
                        "evidence_id": ids[i],
                        "document": docs[i] if i < len(docs) else "",
                        "metadata": metas[i] if i < len(metas) else {},
                        "distance": distances[i] if i < len(distances) else 0.0,
                        "relevance_score": round(max(0.0, 1.0 - (distances[i] if i < len(distances) else 0.5)), 3),
                    })

            return hits
        except Exception as e:
            logger.error(f"ChromaDB search failed: {e}")
            return []

    def delete_evidence_item(self, evidence_id: str) -> bool:
        """Removes an evidence item from vector store."""
        try:
            self.collection.delete(ids=[str(evidence_id)])
            return True
        except Exception as e:
            logger.error(f"Failed to delete {evidence_id} from ChromaDB: {e}")
            return False


chroma_store = ChromaEvidenceStore()
