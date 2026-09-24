"""ChromaDB Client configuration and collection factory."""
import os
from typing import Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.embeddings.service import get_embedding_function

logger = get_logger("vectorstore.chroma_client")

_chroma_client: Optional[chromadb.ClientAPI] = None
COLLECTION_NAME = "growthlens_evidence"


def get_chroma_client() -> chromadb.ClientAPI:
    """Returns singleton persistent ChromaDB client."""
    global _chroma_client
    if _chroma_client is None:
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "chroma_data"))
        os.makedirs(data_dir, exist_ok=True)
        logger.info(f"Initializing Persistent ChromaDB client at: {data_dir}")
        _chroma_client = chromadb.PersistentClient(
            path=data_dir,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
    return _chroma_client


def get_evidence_collection():
    """Gets or creates the growthlens_evidence collection with attached embedding function."""
    client = get_chroma_client()
    embedding_fn = get_embedding_function()
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_fn,
        metadata={"description": "GrowthLens Evidence Semantic Vectors"}
    )
    return collection
