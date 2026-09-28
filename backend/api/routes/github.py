from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from backend.core.config import get_settings
from backend.core.security import redact_dict
from backend.integrations.github.client import GitHubClient
from backend.services.ingestion import EvidenceIngestionService
from backend.schemas.integrations import GitHubSyncRequest, IntegrationStatusResponse
from backend.core.dependencies import get_optional_profile
from backend.schemas.profile import UserProfile
from backend.db.client import get_supabase_client

router = APIRouter(prefix="/integrations/github", tags=["GitHub Integration"])


@router.post("/test")
async def test_github_connection():
    """Test connectivity and token validity against GitHub API."""
    client = GitHubClient()
    result = client.test_connection()
    return redact_dict(result)


@router.get("/status", response_model=IntegrationStatusResponse)
async def get_github_status(profile: Optional[UserProfile] = Depends(get_optional_profile)):
    """Check configuration and health status of GitHub integration."""
    settings = get_settings()
    configured = bool(settings.github_token)
    client = GitHubClient()
    details = {}
    status = "not_configured"

    db_client = get_supabase_client()

    # 1. Check if user has individual integration configured in user_integrations
    if profile:
        try:
            res = db_client.table("user_integrations").select("*").eq("user_id", profile.user_id).eq("provider", "github").execute()
            if res.data:
                cfg = res.data[0]
                return IntegrationStatusResponse(
                    provider="github",
                    configured=True,
                    status=cfg.get("connection_status", "connected"),
                    details={
                        "username": cfg.get("external_username"),
                        "repository_owner": cfg.get("repository_owner"),
                        "repository_name": cfg.get("repository_name"),
                        "last_sync_at": cfg.get("last_sync_at"),
                    }
                )
        except Exception:
            pass

    # 2. Check active user integration in table if unauthenticated request
    try:
        active_rec = db_client.table("user_integrations").select("*").eq("provider", "github").eq("is_active", True).order("updated_at", desc=True).limit(1).execute()
        if active_rec.data:
            cfg = active_rec.data[0]
            return IntegrationStatusResponse(
                provider="github",
                configured=True,
                status=cfg.get("connection_status", "connected"),
                details={
                    "username": cfg.get("external_username") or settings.github_repository_owner,
                    "repository_owner": cfg.get("repository_owner") or settings.github_repository_owner,
                    "repository_name": cfg.get("repository_name") or settings.github_repository_name,
                    "last_sync_at": cfg.get("last_sync_at"),
                }
            )
    except Exception:
        pass

    if configured:
        try:
            conn = client.test_connection()
            status = "connected" if conn.get("authenticated") else "invalid_token"
            details = conn
            try:
                sync_res = db_client.table("ingestion_runs").select("completed_at").eq("source", "github").eq("status", "completed").order("completed_at", desc=True).limit(1).execute()
                if sync_res.data and sync_res.data[0].get("completed_at"):
                    details["last_sync_at"] = sync_res.data[0]["completed_at"]
            except Exception:
                pass
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
async def sync_github_activity(
    req: GitHubSyncRequest,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """Synchronize recent commits and PRs from a repository, extract skills, and index vectors."""
    target_emp = req.target_employee_id or (profile.id if profile else None)
    user_id = profile.user_id if profile else None

    # Determine user_id from target_emp if not directly authenticated
    db_client = get_supabase_client()
    if not user_id and target_emp:
        try:
            emp_check = db_client.table("employees").select("user_id").eq("id", target_emp).execute()
            if emp_check.data and emp_check.data[0].get("user_id"):
                user_id = emp_check.data[0]["user_id"]
            else:
                prof_check = db_client.table("profiles").select("user_id").eq("id", target_emp).execute()
                if prof_check.data and prof_check.data[0].get("user_id"):
                    user_id = prof_check.data[0]["user_id"]
        except Exception:
            pass

    target_owner = req.owner
    target_repo = req.repo

    # If owner/repo omitted, check user_integrations for this user_id or most recent active record
    if not target_owner or not target_repo:
        try:
            query = db_client.table("user_integrations").select("*").eq("provider", "github").eq("is_active", True)
            if user_id:
                query = query.eq("user_id", user_id)
            res = query.order("updated_at", desc=True).limit(1).execute()
            if res.data:
                cfg = res.data[0]
                if not target_owner and cfg.get("repository_owner"):
                    target_owner = cfg["repository_owner"]
                if not target_repo and cfg.get("repository_name"):
                    target_repo = cfg["repository_name"]
        except Exception:
            pass

    # Clean combined "owner/repo" if present
    if target_repo and "/" in target_repo:
        parts = [p.strip() for p in target_repo.split("/", 1)]
        target_owner = parts[0]
        target_repo = parts[1]
    elif target_owner and "/" in target_owner:
        parts = [p.strip() for p in target_owner.split("/", 1)]
        target_owner = parts[0]
        target_repo = parts[1]

    service = EvidenceIngestionService()
    result = await service.sync_github(
        owner=target_owner,
        repo=target_repo,
        limit_commits=req.limit_commits,
        limit_prs=req.limit_prs,
        run_ai=req.run_ai_extraction,
        target_employee_id=target_emp,
        user_id=user_id,
    )
    return result
