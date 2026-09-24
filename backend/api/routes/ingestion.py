"""Ingestion Run Tracking API Endpoints."""
from fastapi import APIRouter, HTTPException, Query
from backend.db.repositories.ingestion import IngestionRunRepository

router = APIRouter(prefix="/ingestion", tags=["Ingestion Tracking"])


@router.get("/runs")
async def list_ingestion_runs(limit: int = Query(default=20, ge=1, le=100)):
    """Retrieve history of synchronization runs (status, record counts, timings, errors)."""
    repo = IngestionRunRepository()
    runs = repo.list_runs(limit=limit)
    return {
        "count": len(runs),
        "runs": runs
    }


@router.get("/runs/{run_id}")
async def get_ingestion_run(run_id: str):
    """Retrieve details and diagnostic summary of a specific ingestion run."""
    repo = IngestionRunRepository()
    run = repo.get_run_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Ingestion run '{run_id}' not found.")
    return run
