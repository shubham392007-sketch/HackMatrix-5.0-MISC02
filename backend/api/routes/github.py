"""GitHub Integration API Endpoints."""
from fastapi import APIRouter, HTTPException
from backend.core.config import get_settings
from backend.core.security import redact_dict
from backend.integrations.github.client import GitHubClient
from backend.services.ingestion import EvidenceIngestionService
from backend.schemas.integrations import GitHubSyncRequest, IntegrationStatusResponse

router = APIRouter(prefix="/integrations/github", tags=["GitHub Integration"])


@router.post("/test")
async def test_github_connection():
    """Test connectivity and token validity against GitHub API."""
    client = GitHubClient()
    result = client.test_connection()
    return redact_dict(result)


@router.get("/status", response_model=IntegrationStatusResponse)
async def get_github_status():
    """Check configuration and health status of GitHub integration."""
    settings = get_settings()
    configured = bool(settings.github_token)
    client = GitHubClient()
    details = {}
    status = "not_configured"

    if configured:
        try:
            conn = client.test_connection()
            status = "connected" if conn.get("authenticated") else "invalid_token"
            details = conn
        except Exception as e:
            status = "error"
            details = {"error": str(e)}

    return IntegrationStatusResponse(
        provider="github",
        configured=configured,
        status=status,
        details=redact_dict(details)
    )


@router.post("/sync")
async def sync_github_activity(req: GitHubSyncRequest):
    """Synchronize recent commits and PRs from a repository, extract skills, and index vectors."""
    service = EvidenceIngestionService()
    result = await service.sync_github(
        owner=req.owner,
        repo=req.repo,
        limit_commits=req.limit_commits,
        limit_prs=req.limit_prs,
        run_ai=req.run_ai_extraction,
    )
    return result
