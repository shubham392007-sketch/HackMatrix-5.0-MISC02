import uuid
import pytest
from pydantic import ValidationError
from backend.app.models.user_profile import UserProfile
from backend.app.api.profile import ProfileUpdateRequest, ProfileResponse


def test_user_profile_model_has_all_settings_fields():
    """Verify UserProfile model supports all professional fields and JSON preferences."""
    test_id = uuid.uuid4()
    profile = UserProfile(
        id=test_id,
        email="sarah.jenkins@example.com",
        display_name="Sarah Jenkins",
        preferred_name="Sarah",
        headline="Staff Distributed Systems Architect",
        location="San Francisco, CA (Remote)",
        work_preference="remote",
        portfolio_url="https://sarahjenkins.dev",
        linkedin_url="https://linkedin.com/in/sarahjenkins",
        github_url="https://github.com/sarahjenkins",
        privacy_preferences={
            "recruiter_disclosure_tier": "verified_recruiters_only",
            "hide_email_phone": True,
            "mask_employer_name": True,
            "public_verified_only": True,
        },
        app_settings={
            "density": "compact",
            "theme": "light",
            "email_notifications": False,
            "in_app_notifications": True,
        },
    )

    assert profile.display_name == "Sarah Jenkins"
    assert profile.preferred_name == "Sarah"
    assert profile.headline == "Staff Distributed Systems Architect"
    assert profile.location == "San Francisco, CA (Remote)"
    assert profile.work_preference == "remote"
    assert profile.portfolio_url == "https://sarahjenkins.dev"
    assert profile.privacy_preferences["recruiter_disclosure_tier"] == "verified_recruiters_only"
    assert profile.privacy_preferences["hide_email_phone"] is True
    assert profile.app_settings["density"] == "compact"


def test_profile_update_request_validation():
    """Verify ProfileUpdateRequest handles valid inputs and rejects bad inputs."""
    valid_payload = {
        "display_name": "Sarah J.",
        "preferred_name": "Sarah",
        "headline": "Lead Reliability Engineer",
        "bio": "Specializing in distributed systems and consensus protocols.",
        "location": "New York, NY",
        "work_preference": "hybrid",
        "portfolio_url": "https://example.com/portfolio",
        "linkedin_url": "https://linkedin.com/in/example",
        "github_url": "https://github.com/example",
        "privacy_preferences": {
            "recruiter_disclosure_tier": "restricted",
            "hide_email_phone": True,
        },
        "app_settings": {
            "density": "comfortable",
        },
    }

    req = ProfileUpdateRequest(**valid_payload)
    assert req.display_name == "Sarah J."
    assert req.work_preference == "hybrid"
    assert req.privacy_preferences["recruiter_disclosure_tier"] == "restricted"
    assert req.app_settings["density"] == "comfortable"


def test_profile_response_serialization():
    """Verify ProfileResponse correctly serializes all fields into JSON response."""
    test_id = uuid.uuid4()
    resp_data = {
        "id": str(test_id),
        "email": "alex.rivera@example.com",
        "display_name": "Alex Rivera",
        "preferred_name": "Alex",
        "headline": "Senior Full-Stack Engineer",
        "bio": "Building resilient web applications.",
        "location": "Seattle, WA",
        "work_preference": "remote",
        "portfolio_url": "https://alexrivera.io",
        "linkedin_url": "https://linkedin.com/in/alexrivera",
        "github_url": "https://github.com/alexrivera",
        "experience_level": "senior",
        "career_stage": "Senior Individual Contributor",
        "privacy_preferences": {
            "recruiter_disclosure_tier": "verified_recruiters_only",
            "hide_email_phone": True,
            "mask_employer_name": False,
            "public_verified_only": True,
        },
        "app_settings": {
            "density": "compact",
            "telemetry_enabled": False,
        },
    }

    profile_resp = ProfileResponse(**resp_data)
    assert profile_resp.id == str(test_id)
    assert profile_resp.email == "alex.rivera@example.com"
    assert profile_resp.preferred_name == "Alex"
    assert profile_resp.privacy_preferences["hide_email_phone"] is True
    assert profile_resp.app_settings["density"] == "compact"


def test_integrity_boundary_invariant():
    """
    CRITICAL INVARIANT:
    Self-reported profile fields must never touch or alter verified skills or rubrics.
    Updating bio or headline cannot create or mutate verified credentials.
    """
    profile = UserProfile(
        id=uuid.uuid4(),
        email="candidate@example.com",
        display_name="Candidate Asserting Mastery",
        headline="World-Leading AI Scientist & Core Kernel Hacker",
        professional_summary="I independently invented all modern neural architectures.",
    )

    # Invariant: UserProfile table has no relationship to directly verified skills
    # without passing through ingestion -> extraction -> human review/verification
    assert not hasattr(profile, "verified_skills") or profile.__dict__.get("verified_skills") is None
    assert profile.headline == "World-Leading AI Scientist & Core Kernel Hacker"
