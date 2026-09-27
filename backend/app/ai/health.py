"""Health check module for GrowthLens AI & Ollama Qwen3 Subsystem."""
from typing import Any, Dict
from backend.app.ai.ollama_client import OllamaClient
from backend.core.logging import get_logger

logger = get_logger("ai.health")


async def get_ai_health() -> Dict[str, Any]:
    """Inspects local Ollama daemon connectivity and Qwen3 8B model availability."""
    client = OllamaClient()
    health_result = await client.check_health()
    return health_result
