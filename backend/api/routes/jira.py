"""Jira Integration API Endpoints."""
from fastapi import APIRouter
from backend.core.config import get_settings
from backend.core.security import redact_dict
from backend.integrations.jira.client import JiraClient
from backend.services.ingestion import EvidenceIngestionService
from backend.schemas.integrations import JiraSyncRequest, IntegrationStatusResponse

router = APIRouter(prefix="/integrations/jira", tags=["Jira Integration"])


@router.post("/test")
async def test_jira_connection():
    """Test connectivity and credentials against Jira Cloud API."""
    client = JiraClient()
    result = client.test_connection()
    return redact_dict(result)


@router.get("/status", response_model=IntegrationStatusResponse)
async def get_jira_status():
    """Check configuration and health status of Jira integration."""
    settings = get_settings()
    configured = bool(settings.jira_base_url and settings.jira_email and settings.jira_api_token)
    client = JiraClient()
    details = {}
    status = "not_configured"

    if configured:
        try:
            conn = client.test_connection()
            status = "connected" if conn.get("authenticated") else "invalid_credentials"
            details = conn
        except Exception as e:
            status = "error"
            details = {"error": str(e)}

    return IntegrationStatusResponse(
        provider="jira",
        configured=configured,
        status=status,
        details=redact_dict(details)
    )


@router.post("/sync")
async def sync_jira_issues(req: JiraSyncRequest):
    """Synchronize recent Jira issues from a project, extract skills, and index vectors."""
    service = EvidenceIngestionService()
    result = await service.sync_jira(
        project_key=req.project_key,
        max_issues=req.max_issues,
        run_ai=req.run_ai_extraction,
    )
    return result
