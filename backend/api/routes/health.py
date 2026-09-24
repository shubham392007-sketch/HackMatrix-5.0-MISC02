from fastapi import APIRouter
import httpx

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.db.client import check_supabase_health

logger = get_logger("api.health")
router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Comprehensive health check for all services."""
    settings = get_settings()
    health = {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "services": {},
    }
    
    all_healthy = True
    
    # Check Supabase
    supabase_health = await check_supabase_health()
    health["services"]["supabase"] = supabase_health
    if supabase_health.get("status") != "healthy":
        all_healthy = False
    
    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                has_model = any(settings.ollama_model in n for n in model_names)
                health["services"]["ollama"] = {
                    "status": "healthy",
                    "connected": True,
                    "model_available": has_model,
                    "target_model": settings.ollama_model,
                }
            else:
                health["services"]["ollama"] = {"status": "unhealthy", "connected": False}
                all_healthy = False
    except Exception as e:
        health["services"]["ollama"] = {"status": "unhealthy", "connected": False, "error": str(e)}
        all_healthy = False
    
    # Check ChromaDB
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"http://{settings.chroma_host}:{settings.chroma_port}/api/v2/heartbeat")
            if resp.status_code == 200:
                health["services"]["chromadb"] = {"status": "healthy", "connected": True}
            else:
                health["services"]["chromadb"] = {"status": "unhealthy", "connected": False}
                all_healthy = False
    except Exception as e:
        # ChromaDB may not be running yet - that's okay for early phases
        health["services"]["chromadb"] = {
            "status": "unavailable",
            "connected": False,
            "error": str(e),
            "note": "ChromaDB server may not be started yet",
        }
    
    health["status"] = "healthy" if all_healthy else "degraded"
    return health
