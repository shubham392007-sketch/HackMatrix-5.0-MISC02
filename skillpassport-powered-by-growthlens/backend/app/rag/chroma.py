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
        self.learning_collection_name = "career_learning_semantics"
        self.learning_collection = self.client.get_or_create_collection(
            name=self.learning_collection_name,
            metadata={"description": "SkillPassport Career Intelligence & Learn & Grow Semantic Vectors"},
        )
        logger.info(f"Initialized ChromaDB persistent collections '{self.collection_name}' and '{self.learning_collection_name}' at {CHROMA_PERSIST_DIR}")

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

    # ==============================================================================
    # CAREER INTELLIGENCE & LEARN & GROW SEMANTIC SYNCHRONIZATION
    # ==============================================================================

    def index_gap_context(
        self,
        gap_id: str,
        owner_user_id: str,
        role_id: str,
        role_version: str,
        canonical_skill_id: str,
        skill_name: str,
        snapshot_id: str,
        explanation_text: str,
        reason_code: str = "TARGET_ROLE_CORE",
    ) -> bool:
        """
        Indexes a gap explanation in ChromaDB with deterministic IDs and strict user scoping.
        PostgreSQL remains authoritative; ChromaDB is a derived semantic retrieval index.
        """
        try:
            doc_id = f"gap_ctx_{owner_user_id}_{role_id}_{canonical_skill_id}"
            document_text = f"Skill: {skill_name}\nRole: {role_id}\nReason: {reason_code}\nExplanation: {explanation_text}"
            metadata = {
                "record_type": "gap_explanation",
                "source_record_id": str(gap_id),
                "owner_user_id": str(owner_user_id),
                "role_id": str(role_id),
                "role_version": str(role_version),
                "canonical_skill_id": str(canonical_skill_id),
                "skill_name": str(skill_name)[:100],
                "snapshot_id": str(snapshot_id),
                "reason_code": str(reason_code),
                "index_version": "v1.0",
            }
            self.learning_collection.upsert(
                ids=[doc_id],
                documents=[document_text],
                metadatas=[metadata],
            )
            logger.info(f"Indexed gap context {doc_id} in ChromaDB")
            return True
        except Exception as e:
            logger.warning(f"ChromaDB index_gap_context failed ({e}); PostgreSQL remains authoritative")
            return False

    def search_gap_contexts(
        self,
        query: str,
        owner_user_id: str,
        n_results: int = 5,
        role_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic similarity search over gap explanations scoped strictly to owner_user_id.
        """
        try:
            where_filter: Dict[str, Any] = {"owner_user_id": str(owner_user_id)}
            if role_id:
                where_filter = {
                    "$and": [
                        {"owner_user_id": str(owner_user_id)},
                        {"role_id": str(role_id)},
                    ]
                }
            results = self.learning_collection.query(
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
                        "id": ids[i],
                        "document": docs[i] if i < len(docs) else "",
                        "metadata": metas[i] if i < len(metas) else {},
                        "relevance_score": round(max(0.0, 1.0 - (distances[i] if i < len(distances) else 0.5)), 3),
                    })
            return hits
        except Exception as e:
            logger.warning(f"ChromaDB search_gap_contexts failed: {e}")
            return []

    def index_learning_step_packet(
        self,
        step_id: str,
        owner_user_id: Optional[str],
        topic_id: str,
        domain_id: str,
        title: str,
        pedagogy_text: str,
        provenance: str = "ai_generated",
    ) -> bool:
        """
        Indexes a study packet's pedagogy in ChromaDB for semantic discovery and cross-module retrieval.
        """
        try:
            doc_id = f"packet_{topic_id}"
            metadata = {
                "record_type": "step_packet",
                "source_record_id": str(step_id),
                "topic_id": str(topic_id),
                "domain_id": str(domain_id),
                "owner_user_id": str(owner_user_id) if owner_user_id else "global",
                "provenance": str(provenance),
                "title": str(title)[:100],
                "index_version": "v1.0",
            }
            self.learning_collection.upsert(
                ids=[doc_id],
                documents=[f"Title: {title}\nDomain: {domain_id}\nPedagogy: {pedagogy_text[:1000]}"],
                metadatas=[metadata],
            )
            logger.info(f"Indexed learning step packet {doc_id} in ChromaDB")
            return True
        except Exception as e:
            logger.warning(f"ChromaDB index_learning_step_packet failed ({e})")
            return False


chroma_store = ChromaEvidenceStore()
