import pytest
from backend.app.core.security import encrypt_credential, decrypt_credential, verify_supabase_token
from backend.app.core.logging import sanitize_data, mask_secret


def test_encryption_and_decryption_cycle():
    pat = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
    encrypted = encrypt_credential(pat)
    assert encrypted != pat
    assert len(encrypted) > len(pat)

    decrypted = decrypt_credential(encrypted)
    assert decrypted == pat


def test_secret_masking():
    token = "ghp_secret_access_token_value_987654"
    masked = mask_secret(token)
    assert masked.startswith("ghp")
    assert masked.endswith("654")
    assert "***" in masked


def test_sanitize_dict_with_secrets():
    payload = {
        "user_id": "user_123",
        "github_token": "ghp_1234567890abcdefghijklmnopqrstuvwxyz",
        "jira_api_token": "atlassian_secret_api_token",
        "details": {
            "password": "supersecretpassword",
            "normal_field": "public_data",
        },
    }
    sanitized = sanitize_data(payload)
    assert "***" in sanitized["github_token"]
    assert "***" in sanitized["jira_api_token"]
    assert "***" in sanitized["details"]["password"]
    assert sanitized["details"]["normal_field"] == "public_data"


def test_demo_token_verification_permitted_in_test_and_dev(monkeypatch):
    """Verifies that demo tokens are accepted in explicitly permitted development and test environments."""
    monkeypatch.setenv("APP_ENV", "test")
    user = verify_supabase_token("sp_demo_user")
    assert user is not None
    assert user["email"] == "alex.chen@skillpassport.growthlens.io"
    assert user["sub"] == "00000000-0000-0000-0000-000000000001"
    assert user["role"] == "authenticated"

    monkeypatch.setenv("APP_ENV", "development")
    user_dev = verify_supabase_token("sp_demo_user")
    assert user_dev is not None
    assert user_dev["sub"] == "00000000-0000-0000-0000-000000000001"


def test_demo_token_rejected_in_production(monkeypatch):
    """Verifies that demo tokens are unconditionally rejected when APP_ENV is production."""
    monkeypatch.setenv("APP_ENV", "production")
    user = verify_supabase_token("sp_demo_user")
    assert user is None

    # Also test 'prod' designator
    monkeypatch.setenv("APP_ENV", "prod")
    assert verify_supabase_token("sp_demo_user") is None

    # Also test 'staging' designator
    monkeypatch.setenv("APP_ENV", "staging")
    assert verify_supabase_token("sp_demo_user") is None


def test_demo_token_fails_closed_on_missing_or_ambiguous_environment(monkeypatch):
    """Verifies that demo tokens fail closed if the environment is missing, empty, or ambiguous."""
    # Missing / empty
    monkeypatch.setenv("APP_ENV", "")
    assert verify_supabase_token("sp_demo_user") is None

    # Ambiguous / unvetted values
    monkeypatch.setenv("APP_ENV", "custom")
    assert verify_supabase_token("sp_demo_user") is None

    monkeypatch.setenv("APP_ENV", "qa")
    assert verify_supabase_token("sp_demo_user") is None

    monkeypatch.setenv("APP_ENV", "staging_eu")
    assert verify_supabase_token("sp_demo_user") is None


def test_demo_token_conflicting_configuration_fails_closed(monkeypatch):
    """Verifies that conflicting environment settings (e.g. env var says production) fail closed."""
    from backend.app.core.config import get_settings
    settings = get_settings()

    # Even if settings.app_env is development, os.environ production takes precedence and fails closed
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr(settings, "app_env", "development")
    assert verify_supabase_token("sp_demo_user") is None

    # Conversely, if settings.app_env is production, it fails closed even if os.environ is development
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setattr(settings, "app_env", "production")
    assert verify_supabase_token("sp_demo_user") is None


def test_real_authentication_flows_preserved(monkeypatch):
    """Verifies that invalid or expired JWTs continue to be rejected properly without printing secrets."""
    monkeypatch.setenv("APP_ENV", "development")
    # Empty token
    assert verify_supabase_token("") is None
    # Malformed non-JWT token (not a demo token)
    assert verify_supabase_token("some_arbitrary_user_string") is None

