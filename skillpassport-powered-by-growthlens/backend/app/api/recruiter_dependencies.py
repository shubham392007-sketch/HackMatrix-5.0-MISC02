import re
import uuid
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.recruiter import EmployerOrganization, OrganizationMembership
from backend.app.models.user_profile import UserProfile


class RecruiterContext:
    def __init__(
        self,
        user: AuthenticatedUser,
        membership: OrganizationMembership,
        organization: EmployerOrganization,
    ):
        self.user = user
        self.membership = membership
        self.organization = organization
        self.user_id = membership.user_id
        self.org_id = organization.id
        self.role = membership.role


def resolve_or_create_recruiter_membership(
    db: Session,
    user_id: uuid.UUID,
    email: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Optional[OrganizationMembership]:
    """
    Resolves an active recruiter/manager membership for the authenticated user.
    If the user has role 'manager' (or 'recruiter'/'employer'/'hiring_manager')
    in auth metadata or user profile, but does not yet have an OrganizationMembership,
    this automatically provisions a default organization and active membership.
    The manager login IS the recruiter login.
    """
    # 1. Existing active membership
    membership = (
        db.query(OrganizationMembership)
        .filter(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.status == "active",
        )
        .first()
    )
    if membership:
        return membership

    # 2. Check if user is a manager or recruiter
    meta_dict = meta or {}
    user_role = str(meta_dict.get("role", "")).lower().strip()

    profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    profile_role = str(profile.current_role if profile and profile.current_role else "").lower().strip()

    is_manager = (
        user_role in ("manager", "hiring_manager", "recruiter", "employer", "admin")
        or profile_role in ("manager", "hiring_manager", "recruiter", "employer", "admin")
    )

    if not is_manager:
        return None

    # 3. User is authorized as a manager/recruiter -> auto-provision default organization & membership
    display_name = (
        meta_dict.get("full_name")
        or (profile.display_name if profile else None)
        or (email.split("@")[0].replace(".", " ").title() if email else "Hiring Manager")
    )
    user_email = email or (profile.email if profile else None) or f"{user_id}@user.skillpassport.io"
    domain = user_email.split("@")[1].lower() if "@" in user_email else None
    public_domains = {
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "icloud.com",
        "user.skillpassport.io",
        "proton.me",
        "protonmail.com",
    }
    is_custom_domain = domain and domain not in public_domains

    org = None
    if is_custom_domain:
        org = db.query(EmployerOrganization).filter(EmployerOrganization.domain == domain).first()

    if not org:
        company_name = domain.split(".")[0].title() if is_custom_domain else None
        org_name = (
            meta_dict.get("organization_name")
            or (profile.department_or_team if profile and profile.department_or_team else None)
            or (f"{company_name} Workspace" if company_name else f"{display_name}'s Organization")
        )
        base_slug = re.sub(r"[^\w\s-]", "", org_name.lower()).strip()
        base_slug = re.sub(r"[-\s]+", "-", base_slug) or "employer"

        slug = base_slug
        suffix = 1
        while db.query(EmployerOrganization).filter(EmployerOrganization.slug == slug).first():
            slug = f"{base_slug}-{str(user_id)[:6]}-{suffix}"
            suffix += 1

        org = EmployerOrganization(
            id=uuid.uuid4(),
            name=org_name,
            slug=slug,
            domain=domain if is_custom_domain else None,
            is_verified=True,
        )
        db.add(org)
        db.flush()

    membership = OrganizationMembership(
        id=uuid.uuid4(),
        organization_id=org.id,
        user_id=user_id,
        role="hiring_manager",
        status="active",
        job_title=(profile.job_title if profile and profile.job_title else "Hiring Manager"),
        public_contact_name=display_name,
        public_contact_email=user_email,
        is_public_contact_enabled=True,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def get_current_recruiter_context(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecruiterContext:
    """
    Enforces that the current authenticated user has an active recruiter,
    hiring manager, or organization administrator role.
    Prevents unauthorized or candidate users from accessing employer endpoints.
    """
    try:
        user_uuid = uuid.UUID(str(user.id))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier.",
        )

    membership = resolve_or_create_recruiter_membership(
        db=db,
        user_id=user_uuid,
        email=user.email,
        meta=user.metadata,
    )

    if not membership:
        # Check if pending approval
        pending = (
            db.query(OrganizationMembership)
            .filter(
                OrganizationMembership.user_id == user_uuid,
                OrganizationMembership.status == "pending_approval",
            )
            .first()
        )
        if pending:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your manager/employer account is currently pending organization approval.",
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or Recruiter authorization required. Please sign in with an authorized manager account.",
        )

    if not membership.organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated employer organization could not be found.",
        )

    return RecruiterContext(
        user=user,
        membership=membership,
        organization=membership.organization,
    )
