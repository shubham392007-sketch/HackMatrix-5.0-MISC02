"""AI Layer API routes providing health, diagnostic, and structured Qwen inference endpoints."""
from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from backend.app.ai.health import get_ai_health
from backend.app.ai.ollama_client import OllamaClient
from langchain_core.messages import HumanMessage, SystemMessage

router = APIRouter(prefix="/ai", tags=["AI Intelligence (Qwen3 8B)"])


@router.get("/health")
async def ai_health() -> Dict[str, Any]:
    """Inspect availability of local Ollama runtime and Qwen3 8B model."""
    return await get_ai_health()


@router.post("/test")
async def ai_test_inference() -> Dict[str, Any]:
    """Test minimal non-sensitive prompt through Qwen3 8B to verify end-to-end inference."""
    client = OllamaClient()
    messages = [
        SystemMessage(content="You are GrowthLens AI. Return a JSON object with status 'ok' and model 'qwen3:8b'."),
        HumanMessage(content="Acknowledge connectivity test."),
    ]
    try:
        response = await client.invoke_chat(messages, operation="diagnostic_ping", temperature=0.0, max_tokens=60)
        return {
            "status": "success",
            "model": client.model,
            "response": response,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama Qwen3 inference failed: {str(e)}")
