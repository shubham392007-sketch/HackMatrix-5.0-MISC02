import os
import sys
import time
import pytest
from unittest.mock import MagicMock, patch
import httpx
import jwt

# Add backend directory to sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app.core.config import Settings, get_settings


@pytest.fixture(autouse=True)
def reset_settings_and_cache():
    get_settings.cache_clear()
    _TOKEN_CACHE.clear()
    yield
    get_settings.cache_clear()
    _TOKEN_CACHE.clear()
from backend.app.core.security import (
    validate_security_configuration,
    verify_supabase_token,
    _TOKEN_CACHE,
)


# ==============================================================================
# Task 1: Frontend Proxy Destination Selection (Algorithm Validation)
# ==============================================================================

def resolve_backend_proxy_target(env: dict) -> string_url:
    """Python parity implementation of next.config.ts getBackendProxyTarget() algorithm."""
    raw_target = (
        env.get("BACKEND_INTERNAL_URL") or
        env.get("NEXT_PUBLIC_BACKEND_URL") or
        "http://127.0.0.1:8001"
    )
    clean_target = raw_target.strip().rstrip("/")
    if clean_target.endswith("/api/v1"):
        clean_target = clean_target[:-len("/api/v1")]
    return f"{clean_target}/api/v1/:path*"


def test_proxy_destination_defaults_to_localhost():
    """Verify that absent environment variables default to local development 127.0.0.1:8001."""
    dest = resolve_backend_proxy_target({})
    assert dest == "http://127.0.0.1:8001/api/v1/:path*"


def test_proxy_destination_internal_url_takes_precedence():
    """Verify that private server-side BACKEND_INTERNAL_URL takes precedence over public URL."""
    env = {
        "BACKEND_INTERNAL_URL": "http://fastapi-service.internal:8001/",
        "NEXT_PUBLIC_BACKEND_URL": "https://api.skillpassport.io/",
    }
    dest = resolve_backend_proxy_target(env)
    assert dest == "http://fastapi-service.internal:8001/api/v1/:path*"


def test_proxy_destination_normalizes_trailing_slash():
    """Verify that trailing slashes are cleanly removed without producing double slashes."""
    env = {"NEXT_PUBLIC_BACKEND_URL": "https://api.skillpassport.io///"}
    dest = resolve_backend_proxy_target(env)
    assert dest == "https://api.skillpassport.io/api/v1/:path*"


def test_proxy_destination_strips_duplicate_api_v1():
    """Verify that trailing /api/v1 is not duplicated into /api/v1/api/v1/:path*."""
    env = {"NEXT_PUBLIC_BACKEND_URL": "https://api.skillpassport.io/api/v1/"}
    dest = resolve_backend_proxy_target(env)
    assert dest == "https://api.skillpassport.io/api/v1/:path*"


# ==============================================================================
# Task 2: Security Validation & Startup Guards
# ==============================================================================

def test_startup_validation_rejects_insecure_production_settings():
    """Verify that production startup halts if required credentials or HTTPS endpoints are missing."""
    # 1. Missing SUPABASE_URL
    s1 = Settings(
        app_env="production",
        supabase_url="",
        supabase_publishable_key="valid-key",
        secret_key="a" * 32,
        connector_credential_encryption_key="k" * 32,
    )
    with pytest.raises(RuntimeError) as exc1:
        validate_security_configuration(s1)
    assert "SUPABASE_URL" in str(exc1.value)

    # 2. Non-HTTPS SUPABASE_URL in production
    s2 = Settings(
        app_env="production",
        supabase_url="http://insecure.supabase.co",
        supabase_publishable_key="valid-key",
        secret_key="a" * 32,
        connector_credential_encryption_key="k" * 32,
    )
    with pytest.raises(RuntimeError) as exc2:
        validate_security_configuration(s2)
    assert "https://" in str(exc2.value)

    # 3. Default placeholder SECRET_KEY
    s3 = Settings(
        app_env="production",
        supabase_url="https://valid.supabase.co",
        supabase_publishable_key="valid-key",
        secret_key="change-in-production-secret-key-32chars-min",
        connector_credential_encryption_key="k" * 32,
    )
    with pytest.raises(RuntimeError) as exc3:
        validate_security_configuration(s3)
    assert "SECRET_KEY" in str(exc3.value)


def test_startup_validation_rejects_insecure_staging_settings():
    """Verify that staging mode enforces the same security invariants as production."""
    s = Settings(
        app_env="staging",
        supabase_url="",
        supabase_publishable_key="",
        secret_key="short",
        connector_credential_encryption_key="",
    )
    with pytest.raises(RuntimeError) as exc:
        validate_security_configuration(s)
    assert "Fatal Security Configuration Error for APP_ENV='staging'" in str(exc.value)


def test_startup_validation_permits_development_mode():
    """Verify that local development boots cleanly with warnings when optional keys are absent."""
    s = Settings(
        app_env="development",
        supabase_url="",
        supabase_publishable_key="",
    )
    # Should not raise exception
    validate_security_configuration(s)


# ==============================================================================
# Task 2: Supabase Token Verification & Demo Shortcut Quarantine
# ==============================================================================

def test_demo_tokens_blocked_in_production():
    """Verify that demo/test tokens fail closed and are rejected in production."""
    with patch.dict(os.environ, {"APP_ENV": "production"}):
        res = verify_supabase_token("sp_demo_user")
        assert res is None, "Demo token must never authenticate in production"

        res2 = verify_supabase_token("test-token-00000000-0000-0000-0000-000000000001")
        assert res2 is None, "Synthetic test token must never authenticate in production"


def test_demo_tokens_blocked_in_staging():
    """Verify that demo/test tokens fail closed and are rejected in staging."""
    with patch.dict(os.environ, {"APP_ENV": "staging"}):
        res = verify_supabase_token("sp_demo_alexchen_valid")
        assert res is None, "Demo token must never authenticate in staging"


def test_demo_tokens_permitted_in_test_environment():
    """Verify that legitimate local tests with APP_ENV=test resolve demo identities properly."""
    with patch.dict(os.environ, {"APP_ENV": "test"}):
        res = verify_supabase_token("sp_demo_user")
        assert res is not None
        assert res["sub"] == "00000000-0000-0000-0000-000000000001"
        assert res["email"] == "alex.chen@skillpassport.growthlens.io"


def test_missing_supabase_credentials_fails_closed():
    """Verify that missing Supabase configuration returns None (fails closed) with no hardcoded fallback."""
    _TOKEN_CACHE.clear()
    valid_jwt = jwt.encode({"sub": "user-123", "exp": time.time() + 3600}, "dummy-secret", algorithm="HS256")
    
    mock_settings = MagicMock()
    mock_settings.app_env = "production"
    mock_settings.supabase_url = ""
    mock_settings.supabase_publishable_key = ""

    with patch("backend.app.core.security.get_settings", return_value=mock_settings):
        with patch.dict(os.environ, {"APP_ENV": "production"}):
            res = verify_supabase_token(valid_jwt)
            assert res is None, "Must fail closed when Supabase credentials are missing"


def test_valid_supabase_token_verification_success():
    """Verify that an authentic Supabase token verified by Supabase Auth API succeeds."""
    _TOKEN_CACHE.clear()
    valid_jwt = jwt.encode(
        {"sub": "d3b07384-d113-4089-9a28-66be7520e5e0", "exp": time.time() + 3600, "email": "engineer@growthlens.io"},
        "dummy-secret",
        algorithm="HS256"
    )

    mock_settings = MagicMock()
    mock_settings.app_env = "production"
    mock_settings.supabase_url = "https://mock-proj.supabase.co"
    mock_settings.supabase_publishable_key = "sb_pub_mock_key"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "d3b07384-d113-4089-9a28-66be7520e5e0",
        "email": "engineer@growthlens.io",
        "role": "authenticated",
        "user_metadata": {"full_name": "Test Engineer"},
        "email_confirmed_at": "2026-01-01T00:00:00Z",
    }

    mock_client = MagicMock()
    mock_client.get.return_value = mock_resp

    with patch("backend.app.core.security.get_settings", return_value=mock_settings):
        with patch("backend.app.core.security.get_auth_http_client", return_value=mock_client):
            with patch.dict(os.environ, {"APP_ENV": "production"}):
                res = verify_supabase_token(valid_jwt)
                assert res is not None
                assert res["sub"] == "d3b07384-d113-4089-9a28-66be7520e5e0"
                assert res["email"] == "engineer@growthlens.io"
                assert res["role"] == "authenticated"


def test_rejected_supabase_token_fails_closed():
    """Verify that non-200 Supabase API response fails closed and returns None."""
    _TOKEN_CACHE.clear()
    forged_jwt = jwt.encode({"sub": "attacker", "exp": time.time() + 3600}, "dummy-secret", algorithm="HS256")

    mock_settings = MagicMock()
    mock_settings.app_env = "production"
    mock_settings.supabase_url = "https://mock-proj.supabase.co"
    mock_settings.supabase_publishable_key = "sb_pub_mock_key"

    mock_resp = MagicMock()
    mock_resp.status_code = 401

    mock_client = MagicMock()
    mock_client.get.return_value = mock_resp

    with patch("backend.app.core.security.get_settings", return_value=mock_settings):
        with patch("backend.app.core.security.get_auth_http_client", return_value=mock_client):
            with patch.dict(os.environ, {"APP_ENV": "production"}):
                res = verify_supabase_token(forged_jwt)
                assert res is None


def test_supabase_server_error_and_network_drop_fails_closed():
    """Verify that network exceptions or 500/502 errors do NOT fall back to trusting unverified signatures."""
    _TOKEN_CACHE.clear()
    untrusted_jwt = jwt.encode({"sub": "untrusted-user", "exp": time.time() + 3600}, "dummy-secret", algorithm="HS256")

    mock_settings = MagicMock()
    mock_settings.app_env = "production"
    mock_settings.supabase_url = "https://mock-proj.supabase.co"
    mock_settings.supabase_publishable_key = "sb_pub_mock_key"

    # Case A: 500 Server error
    mock_resp_500 = MagicMock()
    mock_resp_500.status_code = 500

    mock_client = MagicMock()
    mock_client.get.return_value = mock_resp_500

    with patch("backend.app.core.security.get_settings", return_value=mock_settings):
        with patch("backend.app.core.security.get_auth_http_client", return_value=mock_client):
            with patch.dict(os.environ, {"APP_ENV": "production"}):
                res500 = verify_supabase_token(untrusted_jwt)
                assert res500 is None, "500 error from auth provider must fail closed"

    # Case B: Network ConnectError
    mock_client_err = MagicMock()
    mock_client_err.get.side_effect = httpx.ConnectError("Network dropped")

    with patch("backend.app.core.security.get_settings", return_value=mock_settings):
        with patch("backend.app.core.security.get_auth_http_client", return_value=mock_client_err):
            with patch.dict(os.environ, {"APP_ENV": "production"}):
                res_err = verify_supabase_token(untrusted_jwt)
                assert res_err is None, "Network disconnect must fail closed"
