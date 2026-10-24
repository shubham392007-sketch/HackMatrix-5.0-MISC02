import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.recruiter import EmployerOrganization, OrganizationMembership


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

    membership = (
        db.query(OrganizationMembership)
        .filter(
            OrganizationMembership.user_id == user_uuid,
            OrganizationMembership.status == "active",
        )
        .first()
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
                detail="Your employer account is currently pending organization approval.",
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employer authorization required. Please sign in with an active recruiter account.",
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
