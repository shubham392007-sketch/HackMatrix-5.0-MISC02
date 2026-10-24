from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.user_profile import UserProfile
from backend.app.models.evidence import EvidenceItem
from backend.app.models.connection import ConnectedSource
from backend.app.models.document import UploadedDocument
from backend.app.core.logging import get_logger

logger = get_logger("api.profile")
router = APIRouter(prefix="/profile", tags=["Profile & Onboarding"])


class ProfileResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    preferred_name: Optional[str] = None
    headline: Optional[str] = None
    current_role: str = "employee"
    job_title: Optional[str] = None
    specialization: Optional[str] = None
    department_or_team: Optional[str] = None
    location: Optional[str] = None
    work_preference: Optional[str] = None
    experience_level: Optional[str] = None
    professional_goal: Optional[str] = None
    professional_summary: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    privacy_preferences: Optional[Dict[str, Any]] = None
    app_settings: Optional[Dict[str, Any]] = None
    onboarding_status: str = "not_started"
    onboarding_current_step: int = 1
    onboarding_current_category: str = "resume"
    github_skipped: bool = False
    jira_skipped: bool = False
    onboarding_completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    preferred_name: Optional[str] = None
    headline: Optional[str] = None
    current_role: Optional[str] = None
    job_title: Optional[str] = None
    specialization: Optional[str] = None
    department_or_team: Optional[str] = None
    location: Optional[str] = None
    work_preference: Optional[str] = None
    experience_level: Optional[str] = None
    professional_goal: Optional[str] = None
    professional_summary: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    privacy_preferences: Optional[Dict[str, Any]] = None
    app_settings: Optional[Dict[str, Any]] = None
    onboarding_status: Optional[str] = None  # 'not_started', 'in_progress', 'completed'
    onboarding_current_step: Optional[int] = None
    onboarding_current_category: Optional[str] = None  # 'resume', 'certificates', 'projects', 'research', 'portfolio', 'other'
    github_skipped: Optional[bool] = None
    jira_skipped: Optional[bool] = None
    onboarding_completed_at: Optional[datetime] = None


class OnboardingSummaryResponse(BaseModel):
    onboarding_status: str
    onboarding_current_step: int = 1
    onboarding_current_category: str
    onboarding_completed_at: Optional[datetime] = None
    github_connected: bool = False
    jira_connected: bool = False
    github_skipped: bool = False
    jira_skipped: bool = False
    total_evidence_count: int
    total_sources_count: int
    total_documents_count: int
    categories_progress: Dict[str, Dict[str, Any]]
    github_selected_repos_count: int = 0
    jira_selected_projects_count: int = 0


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the persistent profile for the authenticated user.
    Idempotently creates the user profile record on first login.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        user_uuid = uuid.uuid4()

    try:
        profile = db.query(UserProfile).filter(UserProfile.id == user_uuid).first()

        if not profile:
            # Bootstrap user profile from auth identity
            display_name = current_user.metadata.get("full_name") or current_user.metadata.get("display_name")
            if not display_name and current_user.email:
                display_name = current_user.email.split("@")[0].replace(".", " ").title()

            profile = UserProfile(
                id=user_uuid,
                email=current_user.email or f"{user_uuid}@user.skillpassport.io",
                display_name=display_name or "Authorized User",
                preferred_name=current_user.metadata.get("preferred_name"),
                headline=current_user.metadata.get("headline", "Technology Specialist"),
                current_role=current_user.metadata.get("role", "employee"),
                job_title=current_user.metadata.get("job_title"),
                specialization=current_user.metadata.get("specialization"),
                department_or_team=current_user.metadata.get("department_or_team"),
                location=current_user.metadata.get("location"),
                work_preference=current_user.metadata.get("work_preference"),
                experience_level=current_user.metadata.get("experience_level"),
                professional_goal=current_user.metadata.get("professional_goal"),
                professional_summary=current_user.metadata.get("professional_summary"),
                portfolio_url=current_user.metadata.get("portfolio_url"),
                linkedin_url=current_user.metadata.get("linkedin_url"),
                github_url=current_user.metadata.get("github_url"),
                privacy_preferences=current_user.metadata.get("privacy_preferences"),
                app_settings=current_user.metadata.get("app_settings"),
                onboarding_status="not_started",
                onboarding_current_step=1,
                onboarding_current_category="resume",
                github_skipped=False,
                jira_skipped=False,
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            logger.info(f"Created new UserProfile record for user_id={current_user.id}")

        return ProfileResponse(
            id=str(profile.id),
            email=profile.email or "",
            display_name=profile.display_name,
            preferred_name=profile.preferred_name,
            headline=profile.headline,
            current_role=profile.current_role or "employee",
            job_title=profile.job_title,
            specialization=profile.specialization,
            department_or_team=profile.department_or_team,
            location=profile.location,
            work_preference=profile.work_preference,
            experience_level=profile.experience_level,
            professional_goal=profile.professional_goal,
            professional_summary=profile.professional_summary,
            portfolio_url=profile.portfolio_url,
            linkedin_url=profile.linkedin_url,
            github_url=profile.github_url,
            privacy_preferences=profile.privacy_preferences,
            app_settings=profile.app_settings,
            onboarding_status=profile.onboarding_status or "not_started",
            onboarding_current_step=profile.onboarding_current_step or 1,
            onboarding_current_category=profile.onboarding_current_category or "resume",
            github_skipped=bool(profile.github_skipped),
            jira_skipped=bool(profile.jira_skipped),
            onboarding_completed_at=profile.onboarding_completed_at,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
    except SQLAlchemyError:
        db.rollback()
        raise
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error fetching/creating profile for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load user profile: {str(e)}",
        )


@router.patch("/me", response_model=ProfileResponse)
@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    body: ProfileUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates the authenticated user's profile and onboarding state.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    profile = db.query(UserProfile).filter(UserProfile.id == user_uuid).first()
    if not profile:
        profile = UserProfile(
            id=user_uuid,
            email=current_user.email,
            display_name=body.display_name,
            preferred_name=body.preferred_name,
            headline=body.headline,
            current_role=body.current_role or "employee",
            job_title=body.job_title,
            specialization=body.specialization,
            department_or_team=body.department_or_team,
            location=body.location,
            work_preference=body.work_preference,
            experience_level=body.experience_level,
            professional_goal=body.professional_goal,
            professional_summary=body.professional_summary,
            portfolio_url=body.portfolio_url,
            linkedin_url=body.linkedin_url,
            github_url=body.github_url,
            privacy_preferences=body.privacy_preferences,
            app_settings=body.app_settings,
            onboarding_status=body.onboarding_status or "in_progress",
            onboarding_current_step=body.onboarding_current_step or 1,
            onboarding_current_category=body.onboarding_current_category or "resume",
            github_skipped=bool(body.github_skipped) if body.github_skipped is not None else False,
            jira_skipped=bool(body.jira_skipped) if body.jira_skipped is not None else False,
        )
        db.add(profile)
    else:
        if body.display_name is not None:
            profile.display_name = body.display_name
        if body.preferred_name is not None:
            profile.preferred_name = body.preferred_name
        if body.headline is not None:
            profile.headline = body.headline
        if body.current_role is not None:
            profile.current_role = body.current_role
        if body.job_title is not None:
            profile.job_title = body.job_title
        if body.specialization is not None:
            profile.specialization = body.specialization
        if body.department_or_team is not None:
            profile.department_or_team = body.department_or_team
        if body.location is not None:
            profile.location = body.location
        if body.work_preference is not None:
            profile.work_preference = body.work_preference
        if body.experience_level is not None:
            profile.experience_level = body.experience_level
        if body.professional_goal is not None:
            profile.professional_goal = body.professional_goal
        if body.professional_summary is not None:
            profile.professional_summary = body.professional_summary
        if body.portfolio_url is not None:
            profile.portfolio_url = body.portfolio_url
        if body.linkedin_url is not None:
            profile.linkedin_url = body.linkedin_url
        if body.github_url is not None:
            profile.github_url = body.github_url
        if body.privacy_preferences is not None:
            profile.privacy_preferences = body.privacy_preferences
        if body.app_settings is not None:
            profile.app_settings = body.app_settings
        if body.onboarding_status is not None:
            # Preserve completed onboarding status: do not allow regression to in_progress or not_started
            if profile.onboarding_status == "completed" and body.onboarding_status != "completed":
                logger.info(
                    f"Preserving completed onboarding status for user {current_user.id} "
                    f"(attempted update: {body.onboarding_status})"
                )
            else:
                profile.onboarding_status = body.onboarding_status
                if body.onboarding_status == "completed" and not profile.onboarding_completed_at:
                    profile.onboarding_completed_at = datetime.now(timezone.utc)
        if body.onboarding_current_step is not None:
            # If already completed, do not regress current step below completed baseline
            if profile.onboarding_status == "completed" and body.onboarding_current_step < (profile.onboarding_current_step or 5):
                logger.info(
                    f"Preserving completed onboarding step for user {current_user.id} "
                    f"(attempted step update: {body.onboarding_current_step})"
                )
            else:
                profile.onboarding_current_step = body.onboarding_current_step
        if body.onboarding_current_category is not None:
            profile.onboarding_current_category = body.onboarding_current_category
        if body.github_skipped is not None:
            profile.github_skipped = body.github_skipped
        if body.jira_skipped is not None:
            profile.jira_skipped = body.jira_skipped
        if body.onboarding_completed_at is not None:
            profile.onboarding_completed_at = body.onboarding_completed_at

    db.commit()
    db.refresh(profile)

    return ProfileResponse(
        id=str(profile.id),
        email=profile.email,
        display_name=profile.display_name,
        preferred_name=profile.preferred_name,
        headline=profile.headline,
        current_role=profile.current_role,
        job_title=profile.job_title,
        specialization=profile.specialization,
        department_or_team=profile.department_or_team,
        location=profile.location,
        work_preference=profile.work_preference,
        experience_level=profile.experience_level,
        professional_goal=profile.professional_goal,
        professional_summary=profile.professional_summary,
        portfolio_url=profile.portfolio_url,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        privacy_preferences=profile.privacy_preferences,
        app_settings=profile.app_settings,
        onboarding_status=profile.onboarding_status,
        onboarding_current_step=profile.onboarding_current_step or 1,
        onboarding_current_category=profile.onboarding_current_category,
        github_skipped=bool(profile.github_skipped),
        jira_skipped=bool(profile.jira_skipped),
        onboarding_completed_at=profile.onboarding_completed_at,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/me/onboarding", response_model=OnboardingSummaryResponse)
def get_onboarding_summary(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Calculates the authoritative onboarding status and genuine evidence counts
    specifically for the authenticated user.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        user_uuid = uuid.uuid4()

    profile = db.query(UserProfile).filter(UserProfile.id == user_uuid).first()
    onboarding_status = profile.onboarding_status if profile else "not_started"
    current_category = profile.onboarding_current_category if profile else "resume"
    completed_at = profile.onboarding_completed_at if profile else None

    # Count genuine items owned strictly by this user
    evidence_count = db.query(func.count(EvidenceItem.id)).filter(
        EvidenceItem.owner_user_id == user_uuid
    ).scalar() or 0

    sources_count = db.query(func.count(ConnectedSource.id)).filter(
        ConnectedSource.owner_user_id == user_uuid,
        ConnectedSource.connection_status == "connected",
    ).scalar() or 0

    documents_count = db.query(func.count(UploadedDocument.id)).filter(
        UploadedDocument.owner_user_id == user_uuid,
        UploadedDocument.is_deleted == False,
    ).scalar() or 0

    # Query category-specific items
    user_docs = db.query(UploadedDocument).filter(
        UploadedDocument.owner_user_id == user_uuid,
        UploadedDocument.is_deleted == False,
    ).all()

    categories = ["resume", "certificates", "projects", "research", "portfolio", "other"]
    categories_progress = {}

    for cat in categories:
        count = 0
        if cat == "portfolio":
            count = db.query(func.count(EvidenceItem.id)).filter(
                EvidenceItem.owner_user_id == user_uuid,
                EvidenceItem.source_type == "website",
            ).scalar() or 0
        else:
            # Check documents matching category tag or filename
            for doc in user_docs:
                doc_cat = (doc.evidence_category or "").lower()
                meta = doc.user_metadata or {}
                meta_cat = (meta.get("evidence_category") or "").lower()
                fn = (doc.original_filename or "").lower()

                if doc_cat == cat or meta_cat == cat:
                    count += 1
                elif cat == "resume" and ("resume" in fn or "cv" in fn or doc_cat == "resume"):
                    count += 1
                elif cat == "certificates" and ("cert" in fn or "certificate" in fn or doc_cat in ["certificate", "certificates"]):
                    count += 1
                elif cat == "projects" and ("project" in fn or doc_cat in ["project", "projects", "project_report"]):
                    count += 1
                elif cat == "research" and ("paper" in fn or "research" in fn or doc_cat in ["research", "research_paper"]):
                    count += 1

        categories_progress[cat] = {
            "submitted_count": count,
            "status": "completed" if count > 0 else ("current" if cat == current_category else "pending"),
        }

    github_conn = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user_uuid,
        ConnectedSource.provider == "github",
        ConnectedSource.connection_status == "connected",
    ).first()

    jira_conn = db.query(ConnectedSource).filter(
        ConnectedSource.owner_user_id == user_uuid,
        ConnectedSource.provider == "jira",
        ConnectedSource.connection_status == "connected",
    ).first()

    github_connected = github_conn is not None
    jira_connected = jira_conn is not None
    github_skipped = bool(profile.github_skipped) if profile else False
    jira_skipped = bool(profile.jira_skipped) if profile else False
    current_step = profile.onboarding_current_step if profile and profile.onboarding_current_step else 1

    github_selected_repos_count = len([r for r in github_conn.selected_resources if r.is_selected]) if github_conn else 0
    jira_selected_projects_count = len([r for r in jira_conn.selected_resources if r.is_selected]) if jira_conn else 0

    return OnboardingSummaryResponse(
        onboarding_status=onboarding_status,
        onboarding_current_step=current_step,
        onboarding_current_category=current_category,
        onboarding_completed_at=completed_at,
        github_connected=github_connected,
        jira_connected=jira_connected,
        github_skipped=github_skipped,
        jira_skipped=jira_skipped,
        total_evidence_count=evidence_count,
        total_sources_count=sources_count,
        total_documents_count=documents_count,
        categories_progress=categories_progress,
        github_selected_repos_count=github_selected_repos_count,
        jira_selected_projects_count=jira_selected_projects_count,
    )
