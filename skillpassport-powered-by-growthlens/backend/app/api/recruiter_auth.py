import json
import uuid
import re
from datetime import datetime, timezone
import bcrypt
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.core.logging import get_logger
from backend.app.models.recruiter import EmployerOrganization, OrganizationMembership
from backend.app.models.user_profile import UserProfile

logger = get_logger("api.recruiter_auth")
router = APIRouter(prefix="/recruiter/auth", tags=["Recruiter & Employer Authentication"])


# ==============================================================================
# SCHEMAS
# ==============================================================================

class RecruiterRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    work_email: str = Field(...)
    password: str = Field(..., min_length=6)
    organization_name: str = Field(..., min_length=2, max_length=255)
    job_title: str = Field(..., min_length=2, max_length=255)
    website: Optional[str] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None


class RecruiterLoginRequest(BaseModel):
    email: str
    password: str


class RecruiterAuthResponse(BaseModel):
    success: bool
    user_id: str
    email: str
    full_name: str
    role: str
    status: str
    organization: Dict[str, Any]
    token: Optional[str] = None
    message: str


# ==============================================================================
# HELPER: Generate slug from organization name
# ==============================================================================

def slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower()).strip()
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug or "employer"


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.post("/register", response_model=RecruiterAuthResponse, status_code=status.HTTP_201_CREATED)
def register_recruiter(req: RecruiterRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new employer recruiter or hiring manager account.
    Creates user account, resolves or creates organization, and creates a trusted
    OrganizationMembership preventing client-side privilege self-assignment.
    """
    normalized_email = req.work_email.strip().lower()
    if not normalized_email or "@" not in normalized_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid business email address is required.",
        )

    # 1. Check if user already exists
    existing = db.execute(
        text("SELECT id, email FROM auth.users WHERE lower(email) = lower(:email)"),
        {"email": normalized_email},
    ).fetchone()

    now = datetime.now(timezone.utc)
    user_id = None
    is_new_user = False

    if existing:
        user_id = existing.id
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
        # Verify if user already has an active recruiter membership
        existing_membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == user_uuid
        ).first()
        if existing_membership and existing_membership.status == "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An employer account with this email already exists. Please sign in.",
            )
    else:
        is_new_user = True
        user_id = uuid.uuid4()
        hashed_pw = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Insert into auth.users (email pre-confirmed)
        is_sqlite = db.bind and db.bind.dialect.name == "sqlite"
        user_meta = json.dumps({"sub": str(user_id), "email": normalized_email, "role": "recruiter", "full_name": req.full_name.strip()})

        if is_sqlite:
            db.execute(
                text("INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at, raw_user_meta_data) VALUES (:id, :email, :encrypted_password, :now, :now, :meta)"),
                {
                    "id": str(user_id),
                    "email": normalized_email,
                    "encrypted_password": hashed_pw,
                    "now": now.isoformat(),
                    "meta": user_meta,
                },
            )
            db.execute(
                text("INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at) VALUES (:id, :user_id, :user_id, :meta, 'email', :now, :now)"),
                {
                    "id": str(uuid.uuid4()),
                    "user_id": str(user_id),
                    "meta": user_meta,
                    "now": now.isoformat(),
                },
            )
            existing_prof = db.query(UserProfile).filter(UserProfile.id == user_id).first()
            if not existing_prof:
                db.add(UserProfile(
                    id=user_id,
                    email=normalized_email,
                    display_name=req.full_name.strip(),
                    current_role="recruiter",
                    job_title=req.job_title.strip(),
                    onboarding_status="completed",
                ))
            else:
                existing_prof.display_name = req.full_name.strip()
                existing_prof.current_role = "recruiter"
                existing_prof.job_title = req.job_title.strip()
        else:
            sql_user = """
                INSERT INTO auth.users (
                    id, instance_id, aud, role, email, encrypted_password,
                    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                    created_at, updated_at, is_sso_user, is_anonymous,
                    confirmation_token, recovery_token, email_change_token_new,
                    email_change, phone_change, phone_change_token,
                    email_change_token_current, email_change_confirm_status,
                    reauthentication_token
                ) VALUES (
                    :id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                    :email, :encrypted_password, :now,
                    '{"provider": "email", "providers": ["email"]}'::jsonb,
                    json_build_object('sub', :id, 'email', :email, 'role', 'recruiter', 'full_name', :full_name),
                    :now, :now, false, false,
                    '', '', '',
                    '', '', '',
                    '', 0,
                    ''
                )
            """
            db.execute(
                text(sql_user),
                {
                    "id": str(user_id),
                    "email": normalized_email,
                    "encrypted_password": hashed_pw,
                    "now": now,
                    "full_name": req.full_name.strip(),
                },
            )

            sql_identity = """
                INSERT INTO auth.identities (
                    id, provider_id, user_id, identity_data, provider, created_at, updated_at
                ) VALUES (
                    :id, :user_id, :user_id,
                    json_build_object('sub', :user_id, 'email', :email, 'role', 'recruiter', 'full_name', :full_name),
                    'email', :now, :now
                )
            """
            db.execute(
                text(sql_identity),
                {
                    "id": str(uuid.uuid4()),
                    "user_id": str(user_id),
                    "email": normalized_email,
                    "now": now,
                    "full_name": req.full_name.strip(),
                },
            )

            sql_profile = """
                INSERT INTO public.user_profiles (
                    id, email, display_name, "current_role", job_title, onboarding_status,
                    created_at, updated_at
                ) VALUES (
                    :id, :email, :display_name, 'recruiter', :job_title, 'completed',
                    :now, :now
                )
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    "current_role" = 'recruiter',
                    job_title = EXCLUDED.job_title,
                    updated_at = :now
            """
            db.execute(
                text(sql_profile),
                {
                    "id": user_id,
                    "email": normalized_email,
                    "display_name": req.full_name.strip(),
                    "job_title": req.job_title.strip(),
                    "now": now,
                },
            )

        # 2. Resolve or create EmployerOrganization
    org_name = req.organization_name.strip()
    base_slug = slugify(org_name)
    
    org = db.query(EmployerOrganization).filter(
        EmployerOrganization.name.ilike(org_name)
    ).first()

    is_org_creator = False
    if not org:
        is_org_creator = True
        # Ensure unique slug
        unique_slug = base_slug
        count = 1
        while db.query(EmployerOrganization).filter(EmployerOrganization.slug == unique_slug).first():
            unique_slug = f"{base_slug}-{count}"
            count += 1

        email_domain = normalized_email.split("@")[1] if "@" in normalized_email else None
        org = EmployerOrganization(
            name=org_name,
            slug=unique_slug,
            domain=email_domain,
            website=req.website.strip() if req.website else None,
            location=req.location.strip() if req.location else None,
            industry=req.industry.strip() if req.industry else None,
            company_size=req.company_size.strip() if req.company_size else None,
            is_verified=True,
        )
        db.add(org)
        db.flush()

    # 3. Create trusted OrganizationMembership
    membership_role = "org_admin" if is_org_creator else "recruiter"
    membership = db.query(OrganizationMembership).filter(
        OrganizationMembership.organization_id == org.id,
        OrganizationMembership.user_id == user_id,
    ).first()

    if not membership:
        membership = OrganizationMembership(
            organization_id=org.id,
            user_id=user_id,
            role=membership_role,
            status="active",
            job_title=req.job_title.strip(),
            public_contact_name=req.full_name.strip(),
            public_contact_email=normalized_email,
            is_public_contact_enabled=True,
        )
        db.add(membership)
    else:
        membership.status = "active"
        membership.job_title = req.job_title.strip()
        membership.public_contact_name = req.full_name.strip()
        membership.public_contact_email = normalized_email

    db.commit()
    logger.info(f"Registered recruiter {normalized_email} for organization '{org.name}' with role {membership.role}")

    # For automated test environments, supply a valid synthetic test token; in production, client uses Supabase Auth
    token = None
    if os.environ.get("APP_ENV") in ("test", "development"):
        token = f"test-token-{user_id}:{normalized_email}"

    return RecruiterAuthResponse(
        success=True,
        user_id=str(user_id),
        email=normalized_email,
        full_name=req.full_name.strip(),
        role=membership.role,
        status=membership.status,
        organization={
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "website": org.website,
            "location": org.location,
            "is_verified": org.is_verified,
        },
        token=token,
        message="Employer registration completed successfully.",
    )


@router.post("/login", response_model=RecruiterAuthResponse)
def login_recruiter(req: RecruiterLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a recruiter or hiring manager.
    Verifies credentials and ensures the user possesses an active organization membership.
    """
    normalized_email = req.email.strip().lower()
    
    # 1. Retrieve user from auth.users
    user = db.execute(
        text("SELECT id, email, encrypted_password, raw_user_meta_data FROM auth.users WHERE lower(email) = lower(:email)"),
        {"email": normalized_email},
    ).fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # 2. Check password
    if not user.encrypted_password or not bcrypt.checkpw(req.password.encode("utf-8"), user.encrypted_password.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # 3. Check active organization membership
    user_uuid = uuid.UUID(str(user.id)) if not isinstance(user.id, uuid.UUID) else user.id
    membership = db.query(OrganizationMembership).filter(
        OrganizationMembership.user_id == user_uuid,
        OrganizationMembership.status == "active",
    ).first()

    if not membership:
        # Check if pending approval
        pending_membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == user_uuid,
            OrganizationMembership.status == "pending_approval",
        ).first()
        if pending_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your employer account is currently pending organization approval. You will be notified once activated.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account does not have active recruiter or hiring manager privileges. Please register as an employer or sign in via candidate portal.",
        )

    org = membership.organization
    meta = user.raw_user_meta_data or {}
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}
    full_name = (meta.get("full_name") if isinstance(meta, dict) else None) or membership.public_contact_name or normalized_email.split("@")[0]
    token = None
    if os.environ.get("APP_ENV") in ("test", "development"):
        token = f"test-token-{user.id}:{normalized_email}"

    return RecruiterAuthResponse(
        success=True,
        user_id=str(user.id),
        email=normalized_email,
        full_name=full_name,
        role=membership.role,
        status=membership.status,
        organization={
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "website": org.website,
            "location": org.location,
            "is_verified": org.is_verified,
        },
        token=token,
        message="Sign in successful.",
    )


@router.get("/me")
def get_current_recruiter_profile(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the authenticated recruiter's profile, active organization membership,
    and public contact settings.
    """
    user_uuid = uuid.UUID(user.id)
    membership = db.query(OrganizationMembership).filter(
        OrganizationMembership.user_id == user_uuid,
        OrganizationMembership.status == "active",
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user does not have an active employer membership.",
        )

    org = membership.organization
    profile = db.query(UserProfile).filter(UserProfile.id == user_uuid).first()

    return {
        "user_id": str(user_uuid),
        "email": user.email,
        "full_name": (profile.display_name if profile else None) or membership.public_contact_name or user.email.split("@")[0],
        "job_title": membership.job_title,
        "role": membership.role,
        "status": membership.status,
        "public_contact_name": membership.public_contact_name,
        "public_contact_email": membership.public_contact_email or user.email,
        "is_public_contact_enabled": membership.is_public_contact_enabled,
        "organization": {
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "website": org.website,
            "location": org.location,
            "is_verified": org.is_verified,
            "created_at": org.created_at.isoformat(),
        },
    }


def secrets_token(nbytes: int = 32) -> str:
    import secrets
    return secrets.token_urlsafe(nbytes)
