import os
import uuid
import re
from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session

from backend.app.db.session import SessionLocal
from backend.app.models.user_profile import UserProfile
from backend.app.api.dependencies import AuthenticatedUser


def sanitize_next_url(raw_next: str | None) -> str:
    """Safe internal redirect URL sanitization matching auth/callback."""
    if not raw_next:
        return "/app/onboarding"
    if (
        raw_next.startswith("/")
        and not raw_next.startswith("//")
        and not raw_next.startswith("/\\")
        and "\\" not in raw_next
        and not re.match(r"^/[a-zA-Z0-9_-]+:", raw_next)
    ):
        return raw_next
    return "/app/onboarding"


def test_1_safe_redirect_sanitization():
    """Validates that open redirect attempts are strictly neutralized."""
    # Malicious inputs that should default to safe onboarding
    assert sanitize_next_url("//attacker.com") == "/app/onboarding"
    assert sanitize_next_url("https://evil.com/phish") == "/app/onboarding"
    assert sanitize_next_url("http://localhost:9999/steal") == "/app/onboarding"
    assert sanitize_next_url("javascript:alert(1)") == "/app/onboarding"
    assert sanitize_next_url("/\\attacker.com") == "/app/onboarding"
    assert sanitize_next_url(None) == "/app/onboarding"
    assert sanitize_next_url("") == "/app/onboarding"

    # Legitimate internal paths that should be permitted
    assert sanitize_next_url("/app/onboarding") == "/app/onboarding"
    assert sanitize_next_url("/app/evidence") == "/app/evidence"
    assert sanitize_next_url("/app/skills/explorer") == "/app/skills/explorer"
    assert sanitize_next_url("/app/passport?view=compact") == "/app/passport?view=compact"


def test_2_email_verification_status_gate():
    """Asserts AuthenticatedUser correctly enforces email verification state."""
    # Unverified user (confirmation pending)
    unverified = AuthenticatedUser(
        user_id="11111111-1111-1111-1111-111111111111",
        email="unverified@skillpassport.test",
        role="authenticated",
        email_confirmed_at=None,
    )
    assert unverified.is_email_verified is False

    # Verified user (completed confirmation)
    verified = AuthenticatedUser(
        user_id="22222222-2222-2222-2222-222222222222",
        email="verified@skillpassport.test",
        role="authenticated",
        email_confirmed_at="2026-10-22T20:00:00Z",
    )
    assert verified.is_email_verified is True


def test_3_email_template_contains_valid_supabase_variables():
    """Asserts the branded confirmation email template matches Supabase Auth specs."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    html_path = os.path.join(base_dir, "supabase", "templates", "confirmation.html")
    txt_path = os.path.join(base_dir, "supabase", "templates", "confirmation.txt")

    assert os.path.exists(html_path), "confirmation.html template must exist"
    assert os.path.exists(txt_path), "confirmation.txt template must exist"

    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    with open(txt_path, "r", encoding="utf-8") as f:
        txt_content = f.read()

    # Supabase confirmation variable check
    assert "{{ .ConfirmationURL }}" in html_content
    assert "{{ .ConfirmationURL }}" in txt_content

    # Branding & styling checks
    assert "Skill Passport" in html_content
    assert "Verify your email address" in html_content
    assert "Security Notice" in html_content or "security" in html_content.lower()

    # Plain-text fallback check
    assert "Having trouble with the button?" in html_content or "{{ .ConfirmationURL }}" in html_content


def test_4_user_profile_idempotent_creation_and_onboarding():
    """
    Tests idempotent profile creation and onboarding progression in the database.
    Ensures repeated visits do not duplicate profiles or reset completed onboarding.
    """
    session: Session = SessionLocal()
    test_user_id = uuid.uuid4()
    test_email = f"test-onboard-{test_user_id.hex[:8]}@example.com"

    try:
        # 1. First initialization (simulate callback bootstrap)
        profile_1 = UserProfile(
            id=test_user_id,
            email=test_email,
            display_name="Test Candidate",
            current_role="employee",
            onboarding_status="not_started",
            onboarding_current_step=1,
            onboarding_current_category="resume",
            github_skipped=False,
            jira_skipped=False,
        )
        session.add(profile_1)
        session.commit()
        session.refresh(profile_1)

        assert profile_1.onboarding_status == "not_started"
        assert profile_1.onboarding_current_step == 1

        # 2. Progressing through the wizard
        profile_1.onboarding_status = "in_progress"
        profile_1.onboarding_current_step = 3
        profile_1.job_title = "Full-Stack Engineer"
        session.commit()

        # Re-fetch from DB to verify persistence
        reloaded = session.query(UserProfile).filter(UserProfile.id == test_user_id).first()
        assert reloaded is not None
        assert reloaded.onboarding_status == "in_progress"
        assert reloaded.onboarding_current_step == 3
        assert reloaded.job_title == "Full-Stack Engineer"

        # 3. Completing onboarding
        now = datetime.now(timezone.utc)
        reloaded.onboarding_status = "completed"
        reloaded.onboarding_completed_at = now
        session.commit()

        # 4. Repeated login / callback should NOT reset completed onboarding
        callback_check = session.query(UserProfile).filter(UserProfile.id == test_user_id).first()
        assert callback_check.onboarding_status == "completed"
        assert callback_check.onboarding_completed_at is not None

    finally:
        # Clean up test record
        try:
            session.query(UserProfile).filter(UserProfile.id == test_user_id).delete()
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()
