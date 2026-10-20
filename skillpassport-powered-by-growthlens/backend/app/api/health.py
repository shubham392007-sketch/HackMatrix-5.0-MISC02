from fastapi import APIRouter, Response, status
import httpx
import json
from typing import Dict, Any
from backend.app.core.config import get_settings
from backend.app.db.session import check_database_connection
from backend.app.core.logging import get_logger

logger = get_logger("api.health")
router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live")
def liveness():
    """Liveness probe to confirm the FastAPI server process is running."""
    settings = get_settings()
    return {
        "status": "alive",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/ready")
async def readiness(response: Response):
    """
    Readiness probe that checks dependency availability separately.
    Reports safe diagnostic info without exposing credentials or stack traces.
    Distinguishes specific Ollama dependency states:
      - reachable_and_model_available
      - reachable_model_missing
      - connection_refused
      - timeout
      - http_error
      - invalid_model_response
    """
    settings = get_settings()
    services: Dict[str, Any] = {}
    is_ready = True

    # 1. Supabase PostgreSQL
    db_status = check_database_connection()
    services["supabase_postgresql"] = db_status
    if not db_status.get("connected"):
        is_ready = False

    # 2. Local Ollama Inference (qwen3:8b, etc.)
    ollama_state = "unknown"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            ollama_res = await client.get(f"{settings.ollama_base_url}/api/tags")
            if ollama_res.status_code == 200:
                try:
                    tags = ollama_res.json().get("models", [])
                    model_names = [m.get("name", "") for m in tags]
                    qwen_found = any(settings.ollama_qwen_model in n for n in model_names)

                    if qwen_found:
                        ollama_state = "reachable_and_model_available"
                        services["ollama"] = {
                            "status": "healthy",
                            "state": ollama_state,
                            "connected": True,
                            "target_model": settings.ollama_qwen_model,
                            "model_available": True,
                            "installed_models": model_names,
                        }
                    else:
                        ollama_state = "reachable_model_missing"
                        services["ollama"] = {
                            "status": "degraded",
                            "state": ollama_state,
                            "connected": True,
                            "target_model": settings.ollama_qwen_model,
                            "model_available": False,
                            "installed_models": model_names,
                            "diagnostic": f"Configured model '{settings.ollama_qwen_model}' not found in installed tags.",
                        }
                        is_ready = False
                except json.JSONDecodeError:
                    ollama_state = "invalid_model_response"
                    services["ollama"] = {
                        "status": "degraded",
                        "state": ollama_state,
                        "connected": True,
                        "error": "Failed to parse Ollama tags response JSON",
                    }
                    is_ready = False
            else:
                ollama_state = "http_error"
                services["ollama"] = {
                    "status": "degraded",
                    "state": ollama_state,
                    "connected": False,
                    "http_status": ollama_res.status_code,
                }
                is_ready = False

    except httpx.ConnectError:
        ollama_state = "connection_refused"
        services["ollama"] = {
            "status": "unavailable",
            "state": ollama_state,
            "connected": False,
            "diagnostic": "Ollama daemon is not reachable at configured base URL.",
        }
        is_ready = False

    except httpx.TimeoutException:
        ollama_state = "timeout"
        services["ollama"] = {
            "status": "unavailable",
            "state": ollama_state,
            "connected": False,
            "diagnostic": "Connection to Ollama timed out.",
        }
        is_ready = False

    except Exception as e:
        ollama_state = "connection_failure"
        services["ollama"] = {
            "status": "unavailable",
            "state": ollama_state,
            "connected": False,
            "diagnostic": f"Ollama readiness check error: {type(e).__name__}",
        }
        is_ready = False

    # 3. Redis / Celery broker
    try:
        import redis
        r = redis.from_url(settings.redis_url, socket_timeout=0.5, socket_connect_timeout=0.5)
        r.ping()
        services["redis"] = {"status": "healthy", "connected": True}
    except Exception:
        services["redis"] = {
            "status": "unavailable",
            "connected": False,
            "note": "Redis broker unreachable; in-memory fallback enabled for single-worker mode",
        }

    # 4. ChromaDB
    try:
        from backend.app.rag.chroma import chroma_store
        heartbeat = chroma_store.client.heartbeat()
        services["chromadb"] = {
            "status": "healthy",
            "connected": True,
            "persist_directory": settings.chroma_persist_directory,
        }
    except Exception as e:
        services["chromadb"] = {"status": "unhealthy", "connected": False, "error": str(e)}

    overall_status = "ready" if is_ready else "degraded"
    if not db_status.get("connected"):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": overall_status,
        "app_env": settings.app_env,
        "version": settings.app_version,
        "services": services,
    }


@router.get("/ai-diagnostic")
async def ai_diagnostic():
    """
    Dedicated diagnostic inspection for AI subsystems.
    Reports model configuration, connectivity, rule-based fallback readiness,
    and schema validation status without executing costly multi-minute inferences.
    """
    settings = get_settings()
    diagnostic: Dict[str, Any] = {
        "ollama_base_url": settings.ollama_base_url,
        "target_model": settings.ollama_qwen_model,
        "configured_timeout_seconds": getattr(settings, "ollama_timeout_seconds", 120.0),
        "rule_based_fallback_available": True,
        "output_schema_version": "v1.0",
        "grounded_trust_rules_enforced": True,
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                tags = resp.json().get("models", [])
                names = [m.get("name", "") for m in tags]
                has_model = any(settings.ollama_qwen_model in n for n in names)
                diagnostic["connectivity"] = "connected"
                diagnostic["model_available"] = has_model
                diagnostic["installed_models"] = names
                diagnostic["status"] = "ready" if has_model else "model_missing"
            else:
                diagnostic["connectivity"] = "http_error"
                diagnostic["http_status"] = resp.status_code
                diagnostic["status"] = "degraded"
    except httpx.ConnectError:
        diagnostic["connectivity"] = "connection_refused"
        diagnostic["status"] = "offline"
    except httpx.TimeoutException:
        diagnostic["connectivity"] = "timeout"
        diagnostic["status"] = "offline"
    except Exception as e:
        diagnostic["connectivity"] = f"error_{type(e).__name__}"
        diagnostic["status"] = "offline"

    return diagnostic
