from supabase import create_client, Client
from backend.core.config import get_settings
from backend.core.logging import get_logger

logger = get_logger("db.client")

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """Get or create the Supabase client using the service role key (backend only)."""
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        logger.info("Supabase client initialized")
    return _supabase_client


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
