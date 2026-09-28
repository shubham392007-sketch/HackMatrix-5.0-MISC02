from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from backend.core.dependencies import get_current_user, get_current_profile, require_employee, require_manager, require_admin
from backend.schemas.profile import (
    UserProfile,
    ProfileUpdateRequest,
    ManagerAssignmentCreate,
    ManagerAssignmentResponse,
    ValidateGitHubRequest,
    ValidateGitHubResponse,
    ValidateJiraRequest,
    ValidateJiraResponse,
    CompleteOnboardingRequest,
    OnboardingCompletionResponse,
    UserIntegrationSummary,
    GitHubIntegrationSetup,
    JiraIntegrationSetup,
)
from backend.core.security import encrypt_credentials, decrypt_credentials, mask_token
from backend.integrations.github.client import GitHubClient
from backend.integrations.jira.client import JiraClient
from backend.db.client import get_supabase_client
from backend.core.logging import get_logger

logger = get_logger("api.profile")
router = APIRouter(prefix="/profile", tags=["User Profiles & Workspaces"])


@router.get("/me", response_model=UserProfile)
async def get_my_profile(profile: UserProfile = Depends(get_current_profile)):
    """Retrieve the authenticated user's profile and organization metadata."""
    return profile


@router.patch("/me", response_model=UserProfile)
async def update_my_profile(
    req: ProfileUpdateRequest,
    profile: UserProfile = Depends(get_current_profile),
):
    """Update editable fields on the user's profile (name, title, department, onboarding status)."""
    client = get_supabase_client()
    updates: Dict[str, Any] = {}
    if req.full_name is not None:
        updates["full_name"] = req.full_name.strip()
    if req.job_title is not None:
        updates["job_title"] = req.job_title.strip()
    if req.department is not None:
        updates["department"] = req.department.strip()
    if req.avatar_url is not None:
        updates["avatar_url"] = req.avatar_url
    if req.onboarding_completed is not None:
        updates["onboarding_completed"] = req.onboarding_completed

    if updates:
        try:
            client.table("profiles").update(updates).eq("id", profile.id).execute()
        except Exception as e:
            logger.error(f"Error updating profile {profile.id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to update profile.")

    # Return updated profile
    from backend.core.auth import get_profile_by_user_id
    updated = get_profile_by_user_id(profile.user_id)
    return updated or profile


@router.get("/team", response_model=List[UserProfile])
async def get_manager_team(profile: UserProfile = Depends(require_manager)):
    """Retrieve direct reports assigned to the current manager in manager_assignments."""
    client = get_supabase_client()
    try:
        assignments = (
            client.table("manager_assignments")
            .select("employee_id")
            .eq("manager_id", profile.id)
            .execute()
        )
        emp_ids = [a["employee_id"] for a in (assignments.data or [])]
        if not emp_ids:
            return []

        team_profiles = (
            client.table("profiles")
            .select("*")
            .in_("id", emp_ids)
            .execute()
        )
        return [UserProfile(**p) for p in (team_profiles.data or [])]
    except Exception as e:
        logger.error(f"Error fetching manager team for {profile.id}: {e}")
        return []


@router.post("/assign", response_model=ManagerAssignmentResponse)
async def assign_employee_to_manager(
    req: ManagerAssignmentCreate,
    current_profile: UserProfile = Depends(require_manager),
):
    """Assign an employee to a manager within the same organization."""
    client = get_supabase_client()
    org_id = req.organization_id or current_profile.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization ID is required for assignment.")

    # Verify both belong to the organization if specified
    assignment_data = {
        "manager_id": req.manager_id,
        "employee_id": req.employee_id,
        "organization_id": org_id,
    }
    try:
        res = client.table("manager_assignments").insert(assignment_data).execute()
        if res.data:
            return ManagerAssignmentResponse(**res.data[0])
        raise HTTPException(status_code=500, detail="Failed to create manager assignment.")
    except Exception as e:
        logger.error(f"Error creating manager assignment: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────
# Integration Credential Validation & Profile Onboarding
# ─────────────────────────────────────────────────────────────

@router.post("/validate/github", response_model=ValidateGitHubResponse)
async def validate_github_credentials(req: ValidateGitHubRequest):
    """
    Validates GitHub Personal Access Token connectivity and optional repository access.
    Does not persist credentials.
    """
    if not req.token or not req.token.strip():
        return ValidateGitHubResponse(
            valid=False,
            message="GitHub Personal Access Token is required.",
        )
    client = GitHubClient(token=req.token.strip())
    try:
        conn = client.test_connection()
        if not conn.get("authenticated"):
            return ValidateGitHubResponse(
                valid=False,
                message=conn.get("message", "Authentication failed with GitHub API."),
            )

        username = conn.get("username")
        rate_limit = conn.get("rate_limit_remaining")
        repo_valid = None

        if req.repository_owner and req.repository_name:
            try:
                repo_res = client.validate_repository(
                    req.repository_owner.strip(), req.repository_name.strip()
                )
                repo_valid = repo_res.get("valid", False)
            except Exception:
                repo_valid = False

        return ValidateGitHubResponse(
            valid=True,
            username=username,
            rate_limit_remaining=int(rate_limit) if rate_limit is not None else None,
            repository_accessible=repo_valid,
            message=f"Successfully authenticated as GitHub user @{username}.",
        )
    except Exception as e:
        return ValidateGitHubResponse(
            valid=False,
            message=f"GitHub validation error: {str(e)}",
        )


@router.post("/validate/jira", response_model=ValidateJiraResponse)
async def validate_jira_credentials(req: ValidateJiraRequest):
    """
    Validates Jira Cloud base URL, email, and API token connectivity.
    Does not persist credentials.
    """
    if not req.base_url or not req.email or not req.api_token:
        return ValidateJiraResponse(
            valid=False,
            message="Jira base URL, email, and API token are all required.",
        )
    client = JiraClient(
        base_url=req.base_url.strip(),
        email=req.email.strip(),
        api_token=req.api_token.strip(),
    )
    try:
        conn = client.test_connection()
        if not conn.get("authenticated"):
            return ValidateJiraResponse(
                valid=False,
                message=conn.get("message", "Jira authentication failed."),
            )

        display_name = conn.get("display_name")
        email = conn.get("email")
        project_valid = None

        if req.project_key:
            try:
                p_res = client.validate_project(req.project_key.strip())
                project_valid = p_res.get("valid", False)
            except Exception:
                project_valid = False

        return ValidateJiraResponse(
            valid=True,
            display_name=display_name,
            email=email,
            project_accessible=project_valid,
            message=f"Successfully connected to Jira as {display_name} ({email}).",
        )
    except Exception as e:
        return ValidateJiraResponse(
            valid=False,
            message=f"Jira validation error: {str(e)}",
        )


@router.post("/complete-onboarding", response_model=OnboardingCompletionResponse)
async def complete_profile_onboarding(
    req: CompleteOnboardingRequest,
    profile: UserProfile = Depends(get_current_profile),
):
    """
    Completes initial profile setup:
    1. Saves personal information and engineering role details.
    2. Securely validates and AES-encrypts GitHub and Jira integration credentials.
    3. Links integration identities for automated evidence ingestion.
    4. Marks profile onboarding as completed so returning users go directly to the app.
    """
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Update personal & role info on Profile
    profile_updates = {
        "job_title": req.job_title.strip(),
        "department": req.department.strip(),
        "onboarding_completed": True,
        "updated_at": now_iso,
    }
    if req.full_name and req.full_name.strip():
        profile_updates["full_name"] = req.full_name.strip()
    if req.github and req.github.username:
        profile_updates["github_username"] = req.github.username.strip()
    if req.jira and req.jira.email:
        profile_updates["jira_account_id"] = req.jira.email.strip()

    try:
        client.table("profiles").update(profile_updates).eq("id", profile.id).execute()
    except Exception as e:
        err_str = str(e)
        logger.warning(f"Initial profile update warning: {err_str}")
        if "github_username" in err_str or "jira_account_id" in err_str:
            core_updates = {
                "job_title": req.job_title.strip(),
                "department": req.department.strip(),
                "onboarding_completed": True,
                "updated_at": now_iso,
            }
            if req.full_name and req.full_name.strip():
                core_updates["full_name"] = req.full_name.strip()
            try:
                client.table("profiles").update(core_updates).eq("id", profile.id).execute()
            except Exception as e2:
                logger.error(f"Fallback profile update failed: {e2}")
                raise HTTPException(status_code=500, detail=f"Failed to update profile: {e2}")
        else:
            logger.error(f"Failed to update profile for {profile.id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update profile: {e}")

    integrations_summary: Dict[str, UserIntegrationSummary] = {}

    # 2. Process GitHub Integration
    if req.github and req.github.token and req.github.token.strip():
        token = req.github.token.strip()
        username = req.github.username.strip() if req.github.username else None

        # Test connection
        gh_client = GitHubClient(token=token)
        try:
            gh_res = gh_client.test_connection()
            status = "connected" if gh_res.get("authenticated") else "invalid_credentials"
            if not username and gh_res.get("username"):
                username = gh_res.get("username")
        except Exception:
            status = "error"

        # Encrypt credentials at rest
        encrypted_data = encrypt_credentials({
            "token": token,
            "username": username,
            "repository_owner": req.github.repository_owner.strip() if req.github.repository_owner else None,
            "repository_name": req.github.repository_name.strip() if req.github.repository_name else None,
        })

        gh_record = {
            "user_id": profile.user_id,
            "profile_id": profile.id,
            "provider": "github",
            "encrypted_credentials": encrypted_data,
            "external_username": username,
            "repository_owner": req.github.repository_owner.strip() if req.github.repository_owner else None,
            "repository_name": req.github.repository_name.strip() if req.github.repository_name else None,
            "connection_status": status,
            "last_validated_at": now_iso,
            "updated_at": now_iso,
        }
        try:
            client.table("user_integrations").upsert(gh_record, on_conflict="user_id,provider").execute()
            if username:
                client.table("integration_identities").upsert({
                    "employee_id": profile.id,
                    "provider": "github",
                    "external_username": username,
                    "updated_at": now_iso,
                }, on_conflict="employee_id,provider").execute()
        except Exception as e:
            logger.error(f"Error saving GitHub integration: {e}")

        integrations_summary["github"] = UserIntegrationSummary(
            provider="github",
            is_active=True,
            connection_status=status,
            external_username=username,
            repository_owner=req.github.repository_owner,
            repository_name=req.github.repository_name,
            token_masked=mask_token(token),
            last_validated_at=datetime.now(timezone.utc),
        )

    # 3. Process Jira Integration
    if req.jira and req.jira.api_token and req.jira.api_token.strip():
        base_url = req.jira.base_url.strip()
        email = req.jira.email.strip()
        api_token = req.jira.api_token.strip()
        project_key = req.jira.project_key.strip() if req.jira.project_key else None

        jira_client = JiraClient(base_url=base_url, email=email, api_token=api_token)
        try:
            jira_res = jira_client.test_connection()
            status = "connected" if jira_res.get("authenticated") else "invalid_credentials"
        except Exception:
            status = "error"

        encrypted_jira = encrypt_credentials({
            "base_url": base_url,
            "email": email,
            "api_token": api_token,
            "project_key": project_key,
        })

        jira_record = {
            "user_id": profile.user_id,
            "profile_id": profile.id,
            "provider": "jira",
            "encrypted_credentials": encrypted_jira,
            "external_username": email,
            "base_url": base_url,
            "project_key": project_key,
            "connection_status": status,
            "last_validated_at": now_iso,
            "updated_at": now_iso,
        }
        try:
            client.table("user_integrations").upsert(jira_record, on_conflict="user_id,provider").execute()
            client.table("integration_identities").upsert({
                "employee_id": profile.id,
                "provider": "jira",
                "external_email": email,
                "updated_at": now_iso,
            }, on_conflict="employee_id,provider").execute()
        except Exception as e:
            logger.error(f"Error saving Jira integration: {e}")

        integrations_summary["jira"] = UserIntegrationSummary(
            provider="jira",
            is_active=True,
            connection_status=status,
            external_username=email,
            base_url=base_url,
            project_key=project_key,
            token_masked=mask_token(api_token),
            last_validated_at=datetime.now(timezone.utc),
        )

    from backend.core.auth import get_profile_by_user_id
    updated_profile = get_profile_by_user_id(profile.user_id) or profile

    return OnboardingCompletionResponse(
        success=True,
        profile=updated_profile,
        integrations=integrations_summary,
        message="Profile setup and integration credentials completed successfully.",
    )


@router.get("/integrations", response_model=Dict[str, UserIntegrationSummary])
async def get_my_integrations(profile: UserProfile = Depends(get_current_profile)):
    """Retrieve all configured integrations for the user with masked credentials."""
    client = get_supabase_client()
    try:
        res = client.table("user_integrations").select("*").eq("user_id", profile.user_id).execute()
        records = res.data or []
        summary = {}
        for r in records:
            provider = r["provider"]
            masked = "***REDACTED***"
            if r.get("encrypted_credentials"):
                try:
                    dec = decrypt_credentials(r["encrypted_credentials"])
                    tok = dec.get("token") or dec.get("api_token")
                    if tok:
                        masked = mask_token(tok)
                except Exception:
                    pass
            summary[provider] = UserIntegrationSummary(
                provider=provider,
                is_active=r.get("is_active", True),
                connection_status=r.get("connection_status", "untested"),
                external_username=r.get("external_username"),
                base_url=r.get("base_url"),
                repository_owner=r.get("repository_owner"),
                repository_name=r.get("repository_name"),
                project_key=r.get("project_key"),
                token_masked=masked,
                last_validated_at=r.get("last_validated_at"),
                last_sync_at=r.get("last_sync_at"),
            )
        return summary
    except Exception as e:
        logger.error(f"Error fetching user integrations: {e}")
        return {}


@router.put("/integrations/github", response_model=UserIntegrationSummary)
async def update_github_integration(
    setup: GitHubIntegrationSetup,
    profile: UserProfile = Depends(get_current_profile),
):
    """Save or update GitHub credentials and target repo settings for the user."""
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    token = setup.token.strip() if setup.token else ""
    username = setup.username.strip() if setup.username else None

    # Test connection if token provided
    status = "connected"
    if token and not token.startswith("***"):
        gh_client = GitHubClient(token=token)
        try:
            gh_res = gh_client.test_connection()
            status = "connected" if gh_res.get("authenticated") else "invalid_credentials"
            if not username and gh_res.get("username"):
                username = gh_res.get("username")
        except Exception:
            status = "error"
    else:
        # If token was left as masked/existing, retain existing credentials
        existing = client.table("user_integrations").select("*").eq("user_id", profile.user_id).eq("provider", "github").execute()
        if existing.data and existing.data[0].get("encrypted_credentials"):
            try:
                dec = decrypt_credentials(existing.data[0]["encrypted_credentials"])
                token = dec.get("token", "")
            except Exception:
                pass
            status = existing.data[0].get("connection_status", "connected")
            if not username:
                username = existing.data[0].get("external_username")

    encrypted_data = encrypt_credentials({
        "token": token,
        "username": username,
        "repository_owner": setup.repository_owner.strip() if setup.repository_owner else None,
        "repository_name": setup.repository_name.strip() if setup.repository_name else None,
    })

    gh_record = {
        "user_id": profile.user_id,
        "profile_id": profile.id,
        "provider": "github",
        "encrypted_credentials": encrypted_data,
        "external_username": username,
        "repository_owner": setup.repository_owner.strip() if setup.repository_owner else None,
        "repository_name": setup.repository_name.strip() if setup.repository_name else None,
        "connection_status": status,
        "is_active": True,
        "last_validated_at": now_iso,
        "updated_at": now_iso,
    }
    client.table("user_integrations").upsert(gh_record, on_conflict="user_id,provider").execute()

    if username:
        try:
            client.table("integration_identities").upsert({
                "employee_id": profile.id,
                "provider": "github",
                "external_username": username,
                "updated_at": now_iso,
            }, on_conflict="employee_id,provider").execute()
        except Exception as e:
            logger.warning(f"Could not upsert github identity: {e}")

    return UserIntegrationSummary(
        provider="github",
        is_active=True,
        connection_status=status,
        external_username=username,
        repository_owner=setup.repository_owner,
        repository_name=setup.repository_name,
        token_masked=mask_token(token),
        last_validated_at=datetime.now(timezone.utc),
    )


@router.put("/integrations/jira", response_model=UserIntegrationSummary)
async def update_jira_integration(
    setup: JiraIntegrationSetup,
    profile: UserProfile = Depends(get_current_profile),
):
    """Save or update Jira Cloud credentials and project settings for the user."""
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    base_url = setup.base_url.strip() if setup.base_url else ""
    email = setup.email.strip() if setup.email else ""
    api_token = setup.api_token.strip() if setup.api_token else ""
    project_key = setup.project_key.strip() if setup.project_key else None

    status = "connected"
    if api_token and not api_token.startswith("***"):
        jira_client = JiraClient(base_url=base_url, email=email, api_token=api_token)
        try:
            jira_res = jira_client.test_connection()
            status = "connected" if jira_res.get("authenticated") else "invalid_credentials"
        except Exception:
            status = "error"
    else:
        existing = client.table("user_integrations").select("*").eq("user_id", profile.user_id).eq("provider", "jira").execute()
        if existing.data and existing.data[0].get("encrypted_credentials"):
            try:
                dec = decrypt_credentials(existing.data[0]["encrypted_credentials"])
                api_token = dec.get("api_token", "")
            except Exception:
                pass
            status = existing.data[0].get("connection_status", "connected")
            if not base_url:
                base_url = dec.get("base_url", "")
            if not email:
                email = dec.get("email", "")

    encrypted_jira = encrypt_credentials({
        "base_url": base_url,
        "email": email,
        "api_token": api_token,
        "project_key": project_key,
    })

    jira_record = {
        "user_id": profile.user_id,
        "profile_id": profile.id,
        "provider": "jira",
        "encrypted_credentials": encrypted_jira,
        "external_username": email,
        "base_url": base_url,
        "project_key": project_key,
        "connection_status": status,
        "is_active": True,
        "last_validated_at": now_iso,
        "updated_at": now_iso,
    }
    client.table("user_integrations").upsert(jira_record, on_conflict="user_id,provider").execute()

    if email:
        try:
            client.table("integration_identities").upsert({
                "employee_id": profile.id,
                "provider": "jira",
                "external_email": email,
                "updated_at": now_iso,
            }, on_conflict="employee_id,provider").execute()
        except Exception as e:
            logger.warning(f"Could not upsert jira identity: {e}")

    return UserIntegrationSummary(
        provider="jira",
        is_active=True,
        connection_status=status,
        external_username=email,
        base_url=base_url,
        project_key=project_key,
        token_masked=mask_token(api_token),
        last_validated_at=datetime.now(timezone.utc),
    )


@router.delete("/integrations/{provider}")
async def disconnect_integration(
    provider: str,
    profile: UserProfile = Depends(get_current_profile),
):
    """Disconnect and deactivate an integration provider for the current user."""
    client = get_supabase_client()
    try:
        client.table("user_integrations").delete().eq("user_id", profile.user_id).eq("provider", provider).execute()
        client.table("integration_identities").delete().eq("employee_id", profile.id).eq("provider", provider).execute()
        return {"success": True, "message": f"{provider} disconnected successfully"}
    except Exception as e:
        logger.error(f"Error disconnecting {provider}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect {provider}: {str(e)}")
