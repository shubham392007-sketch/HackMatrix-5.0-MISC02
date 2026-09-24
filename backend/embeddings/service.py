"""Embedding Service supporting local ChromaDB ONNX MiniLM and fallback models."""
from typing import List
from backend.core.logging import get_logger

logger = get_logger("embeddings.service")

_embedding_fn = None


def get_embedding_function():
    """Lazily load the ChromaDB default embedding function."""
    global _embedding_fn
    if _embedding_fn is None:
        from chromadb.utils import embedding_functions
        logger.info("Initializing ChromaDB default ONNX embedding function (all-MiniLM-L6-v2)")
        _embedding_fn = embedding_functions.DefaultEmbeddingFunction()
    return _embedding_fn


class EmbeddingService:
    """Service generating semantic vectors from evidence text."""

    def __init__(self):
        self.embedding_fn = get_embedding_function()

    def embed_text(self, text: str) -> List[float]:
        """Generate vector embedding for a single text document."""
        return self.embedding_fn([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a batch of documents."""
        if not texts:
            return []
        return self.embedding_fn(texts)
