from supabase import create_client, Client
from backend.core.config import get_settings
from backend.core.logging import get_logger

logger = get_logger("db.client")

_supabase_client: Client | None = None


def get_supabase_client(force_new: bool = False) -> Client:
    """Get or create the Supabase client using the service role key (backend only)."""
    global _supabase_client
    if _supabase_client is None or force_new:
        settings = get_settings()
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        logger.info("Supabase client initialized")
    return _supabase_client


def reset_supabase_client() -> None:
    """Reset cached Supabase client so a fresh session/socket is created on next query."""
    global _supabase_client
    _supabase_client = None


def execute_with_retry(query_fn, max_retries: int = 2):
    """Execute a Supabase database query with automatic reconnection on SSL/socket timeout."""
    last_err = None
    for attempt in range(max_retries + 1):
        try:
            return query_fn()
        except Exception as e:
            last_err = e
            err_str = str(e).lower()
            if "eof" in err_str or "ssl" in err_str or "connection" in err_str or "closed" in err_str:
                logger.warning(f"Supabase connection dropped on attempt {attempt + 1}, reconnecting: {e}")
                reset_supabase_client()
                continue
            raise e
    raise last_err


async def check_supabase_health() -> dict:
    """Check Supabase connectivity."""
    try:
        client = get_supabase_client()
        # Simple query to test connection - try to query a table
        # If tables don't exist yet, we catch the error but connection is still valid
        result = client.table("employees").select("id").limit(1).execute()
        return {"status": "healthy", "connected": True}
    except Exception as e:
        error_msg = str(e)
        # If the error is about missing table/schema, connection still works
        if any(indicator in error_msg for indicator in [
            "does not exist", "PGRST205", "schema cache", "relation"
        ]):
            return {"status": "healthy", "connected": True, "note": "tables not yet created"}
        return {"status": "unhealthy", "connected": False, "error": error_msg}
