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


def test_demo_token_verification():
    user = verify_supabase_token("sp_demo_user")
    assert user is not None
    assert user["email"] == "alex.chen@skillpassport.growthlens.io"
    assert user["role"] == "authenticated"
