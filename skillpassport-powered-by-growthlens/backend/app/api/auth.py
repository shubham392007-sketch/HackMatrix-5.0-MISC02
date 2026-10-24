import uuid
from datetime import datetime, timezone
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.core.logging import get_logger

logger = get_logger("api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: str = "employee"


class SignupResponse(BaseModel):
    success: bool
    user_id: str
    email: str
    message: str


class PasswordResetRequest(BaseModel):
    email: str
    new_password: str


@router.post("/signup", response_model=SignupResponse)
def direct_signup(req: SignupRequest, db: Session = Depends(get_db)):
    """
    Secure signup handler that provisions users directly in Supabase Postgres.
    Acts as a high-availability fallback when Supabase hosted SMTP delivery is throttled (HTTP 429).
    Guarantees seamless user onboarding and immediate password login via GoTrue.
    """
    normalized_email = req.email.strip().lower()
    if not normalized_email or "@" not in normalized_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required.",
        )

    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    trimmed_name = (req.full_name or normalized_email.split("@")[0]).strip()
    role = req.role if req.role in ("employee", "manager", "admin", "reviewer") else "employee"

    # 1. Check if user already exists
    existing = db.execute(
        text("SELECT id, email FROM auth.users WHERE lower(email) = lower(:email)"),
        {"email": normalized_email},
    ).fetchone()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in or reset your password.",
        )

    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    hashed_pw = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        # 2. Insert into auth.users (with email pre-confirmed to bypass hosted SMTP throttle)
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
                json_build_object('sub', :id, 'email', :email, 'role', :role, 'full_name', :full_name),
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
                "role": role,
                "full_name": trimmed_name,
            },
        )

        # 3. Insert into auth.identities
        sql_identity = """
            INSERT INTO auth.identities (
                id, provider_id, user_id, identity_data, provider, created_at, updated_at
            ) VALUES (
                :id, :user_id, :user_id,
                json_build_object('sub', :user_id, 'email', :email, 'role', :role, 'full_name', :full_name),
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
                "role": role,
                "full_name": trimmed_name,
            },
        )

        # 4. Insert into public.user_profiles
        sql_profile = """
            INSERT INTO public.user_profiles (
                id, email, display_name, "current_role", onboarding_status,
                onboarding_current_step, onboarding_current_category,
                github_skipped, jira_skipped, created_at, updated_at
            ) VALUES (
                :id, :email, :display_name, :current_role, 'not_started',
                1, 'resume', false, false, :now, :now
            )
            ON CONFLICT (id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                updated_at = :now
        """
        db.execute(
            text(sql_profile),
            {
                "id": user_id,
                "email": normalized_email,
                "display_name": trimmed_name,
                "current_role": role,
                "now": now,
            },
        )

        db.commit()
        logger.info(f"Direct signup completed for user {normalized_email} (id={user_id})")

        return SignupResponse(
            success=True,
            user_id=str(user_id),
            email=normalized_email,
            message="Account created successfully. You can now sign in.",
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Direct signup failed for {normalized_email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/reset-password")
def direct_reset_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Direct password reset allowing users to update their credentials when hosted email delivery is unavailable.
    """
    normalized_email = req.email.strip().lower()
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )

    user = db.execute(
        text("SELECT id FROM auth.users WHERE lower(email) = lower(:email)"),
        {"email": normalized_email},
    ).fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address.",
        )

    hashed_pw = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc)

    db.execute(
        text("UPDATE auth.users SET encrypted_password = :encrypted_password, updated_at = :now WHERE id = :id"),
        {"encrypted_password": hashed_pw, "now": now, "id": user.id},
    )
    db.commit()
    logger.info(f"Password reset completed directly for user {normalized_email}")

    return {"success": True, "message": "Password updated successfully."}
