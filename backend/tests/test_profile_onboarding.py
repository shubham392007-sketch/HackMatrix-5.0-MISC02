"""Integration Tests for Profile Completion and Integration Credentials Flow."""
import pytest
from fastapi.testclient import TestClient
from main import app
from backend.core.security import encrypt_credentials, decrypt_credentials, mask_token
from backend.schemas.profile import UserProfile
from backend.core.dependencies import get_current_profile

client = TestClient(app)

# Dummy profile for dependency override
mock_profile = UserProfile(
    id="00000000-0000-0000-0000-000000000001",
    user_id="00000000-0000-0000-0000-000000000001",
    full_name="Priya Sharma",
    email="priya.sharma@growthlens.internal",
    role="EMPLOYEE",
    onboarding_completed=False,
)


class TestProfileOnboardingAndIntegrations:
    """Verifies profile completion and encrypted credentials flow."""

    def test_credential_encryption_and_masking(self):
        token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
        encrypted = encrypt_credentials({"token": token, "username": "priya"})
        assert encrypted != token
        decrypted = decrypt_credentials(encrypted)
        assert decrypted["token"] == token
        assert decrypted["username"] == "priya"
        masked = mask_token(token)
        assert "ghp_" in masked
        assert "..." in masked
        assert token not in masked

    def test_github_validation_endpoint_with_invalid_token(self):
        res = client.post("/api/profile/validate/github", json={"token": "ghp_invalid_dummy_token_999"})
        assert res.status_code == 200
        data = res.json()
        assert data["valid"] is False
        assert "failed" in data["message"].lower() or "invalid" in data["message"].lower()

    def test_jira_validation_endpoint_missing_fields(self):
        res = client.post("/api/profile/validate/jira", json={"base_url": "", "email": "", "api_token": ""})
        assert res.status_code == 200
        data = res.json()
        assert data["valid"] is False
        assert "required" in data["message"].lower()

    def test_complete_onboarding_flow(self):
        app.dependency_overrides[get_current_profile] = lambda: mock_profile
        try:
            payload = {
                "full_name": "Priya Sharma",
                "job_title": "Senior AI Systems Engineer",
                "department": "AI / Machine Learning",
                "github": {
                    "token": "ghp_mock_token_for_onboarding_test_12345",
                    "username": "priyasharma-ai",
                    "repository_owner": "growthlens",
                    "repository_name": "core-backend",
                },
                "jira": {
                    "base_url": "https://growthlens-demo.atlassian.net",
                    "email": "priya.sharma@growthlens.internal",
                    "api_token": "ATATT3xFfGF0_mock_jira_token_12345",
                    "project_key": "GL",
                },
            }
            res = client.post("/api/profile/complete-onboarding", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert "github" in data["integrations"]
            assert "jira" in data["integrations"]
            assert data["integrations"]["github"]["token_masked"] != payload["github"]["token"]
            assert "..." in data["integrations"]["github"]["token_masked"]
        finally:
            app.dependency_overrides.clear()
