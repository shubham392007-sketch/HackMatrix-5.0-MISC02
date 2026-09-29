from typing import Optional
from fastapi import APIRouter, Depends
from backend.core.config import get_settings
from backend.core.security import redact_dict
from backend.core.logging import get_logger
from backend.core.exceptions import JiraIntegrationError
from backend.integrations.jira.client import JiraClient
from backend.services.ingestion import EvidenceIngestionService
from backend.schemas.integrations import JiraSyncRequest, IntegrationStatusResponse
from backend.core.dependencies import get_optional_profile
from backend.schemas.profile import UserProfile
from backend.db.client import get_supabase_client
from backend.db.repositories.evidence import EvidenceRepository

logger = get_logger("api.routes.jira")

router = APIRouter(prefix="/integrations/jira", tags=["Jira Integration"])


@router.post("/test")
async def test_jira_connection():
    """Test connectivity and credentials against Jira Cloud API."""
    client = JiraClient()
    result = client.test_connection()
    return redact_dict(result)


@router.get("/status", response_model=IntegrationStatusResponse)
async def get_jira_status(profile: Optional[UserProfile] = Depends(get_optional_profile)):
    """Check configuration and health status of Jira integration."""
    settings = get_settings()
    configured = bool(settings.jira_base_url and settings.jira_email and settings.jira_api_token)
    client = JiraClient()
    details = {}
    status = "not_configured"

    # Check if user has individual integration configured in user_integrations
    if profile:
        try:
            db_client = get_supabase_client()
            res = db_client.table("user_integrations").select("*").eq("user_id", profile.user_id).eq("provider", "jira").execute()
            if res.data:
                cfg = res.data[0]
                return IntegrationStatusResponse(
                    provider="jira",
                    configured=True,
                    status=cfg.get("connection_status", "connected"),
                    details={
                        "base_url": cfg.get("base_url"),
                        "project_key": cfg.get("project_key"),
                        "external_email": cfg.get("external_username"),
                        "last_sync_at": cfg.get("last_sync_at"),
                    }
                )
        except Exception:
            pass

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
async def sync_jira_issues(
    req: JiraSyncRequest,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """Synchronize recent Jira issues from a project, extract skills, and index vectors."""
    raw_emp = req.target_employee_id.strip() if req.target_employee_id else None
    target_emp = raw_emp or (profile.id if profile else None) or "shubham_pokale"
    user_id = profile.user_id if profile else None

    evidence_repo = EvidenceRepository()
    canonical_emp = evidence_repo._resolve_employee_uuid(target_emp)

    try:
        service = EvidenceIngestionService()
        result = await service.sync_jira(
            project_key=req.project_key,
            max_issues=req.max_issues,
            run_ai=req.run_ai_extraction,
            target_employee_id=target_emp or canonical_emp,
            user_id=user_id,
        )
        return result
    except JiraIntegrationError as e:
        logger.warning(f"Jira integration error during sync: {e}")
        return {
            "id": None,
            "source": "jira",
            "status": "failed",
            "started_at": None,
            "completed_at": None,
            "records_found": 0,
            "records_processed": 0,
            "records_skipped": 0,
            "records_failed": 1,
            "error_summary": str(e),
            "metadata": {"project_key": req.project_key},
            "organization_id": None,
        }
    except Exception as e:
        logger.error(f"Unexpected error in Jira sync route: {e}", exc_info=True)
        return {
            "id": None,
            "source": "jira",
            "status": "failed",
            "started_at": None,
            "completed_at": None,
            "records_found": 0,
            "records_processed": 0,
            "records_skipped": 0,
            "records_failed": 1,
            "error_summary": f"Sync failed: {str(e)}",
            "metadata": {"project_key": req.project_key},
            "organization_id": None,
        }
