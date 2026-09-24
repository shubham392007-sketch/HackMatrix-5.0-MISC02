"""Repository for tracking and querying ingestion runs."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from backend.db.client import get_supabase_client
from backend.core.logging import get_logger

logger = get_logger("db.repositories.ingestion")


class IngestionRunRepository:
    def __init__(self):
        self.client = get_supabase_client()

    def start_run(self, source: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Create a new pending/running ingestion run record."""
        run_id = str(uuid4())
        payload = {
            "id": run_id,
            "source": source,
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "records_found": 0,
            "records_processed": 0,
            "records_skipped": 0,
            "records_failed": 0,
            "metadata": metadata or {},
        }
        self.client.table("ingestion_runs").insert(payload).execute()
        return run_id

    def update_progress(
        self,
        run_id: str,
        found: int = 0,
        processed: int = 0,
        skipped: int = 0,
        failed: int = 0,
    ) -> None:
        """Increment progress counts for a run."""
        self.client.table("ingestion_runs").update({
            "records_found": found,
            "records_processed": processed,
            "records_skipped": skipped,
            "records_failed": failed,
        }).eq("id", run_id).execute()

    def complete_run(
        self,
        run_id: str,
        status: str = "completed",
        found: int = 0,
        processed: int = 0,
        skipped: int = 0,
        failed: int = 0,
        error_summary: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Finalize an ingestion run."""
        payload = {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "records_found": found,
            "records_processed": processed,
            "records_skipped": skipped,
            "records_failed": failed,
            "error_summary": error_summary,
        }
        res = self.client.table("ingestion_runs").update(payload).eq("id", run_id).execute()
        return res.data[0] if res.data else payload

    def get_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        res = self.client.table("ingestion_runs").select("*").eq("id", run_id).execute()
        return res.data[0] if res.data else None

    def list_runs(self, limit: int = 20) -> List[Dict[str, Any]]:
        res = (
            self.client.table("ingestion_runs")
            .select("*")
            .order("started_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
