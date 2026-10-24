"""
Unit and integration tests verifying database deployment safety invariants:
1. Production/staging environments fail closed when PostgreSQL is unavailable.
2. Local SQLite fallback is strictly prohibited in production/staging.
3. Database error diagnostics are sanitized and never expose passwords.
4. Alembic migrations reject SQLite URLs in production/staging.
"""

import os
import pytest
from unittest.mock import patch, MagicMock

from backend.app.core.config import Settings
from backend.app.db.session import sanitize_db_error_message, _init_resilient_engine
from backend.alembic import env as alembic_env


def test_sqlite_fallback_allowed_in_development_and_test():
    """Verify development and test environments permit SQLite fallback by default."""
    dev_settings = Settings(app_env="development")
    assert dev_settings.is_sqlite_fallback_allowed() is True
    assert dev_settings.is_production_or_staging is False

    test_settings = Settings(app_env="test")
    assert test_settings.is_sqlite_fallback_allowed() is True
    assert test_settings.is_production_or_staging is False


def test_sqlite_fallback_strictly_prohibited_in_production_and_staging():
    """Verify production and staging fail closed and reject SQLite fallback even if requested."""
    prod_settings = Settings(app_env="production", allow_sqlite_fallback=True)
    assert prod_settings.is_production_or_staging is True
    assert prod_settings.is_sqlite_fallback_allowed() is False

    staging_settings = Settings(app_env="staging", allow_sqlite_fallback=True)
    assert staging_settings.is_production_or_staging is True
    assert staging_settings.is_sqlite_fallback_allowed() is False


def test_error_message_sanitization():
    """Verify credentials and passwords are completely stripped from diagnostic messages."""
    raw_error = Exception(
        "could not connect to server at 'db.project.supabase.co', "
        "URI: postgresql+psycopg2://postgres:super_secret_password_123@db.project.supabase.co:5432/postgres "
        "password=another_secret_password connection refused"
    )
    sanitized = sanitize_db_error_message(raw_error)
    assert "super_secret_password_123" not in sanitized
    assert "another_secret_password" not in sanitized
    assert "://postgres:***@" in sanitized
    assert "password=***" in sanitized


def test_production_fails_closed_when_postgres_unreachable():
    """Verify _init_resilient_engine raises RuntimeError in production mode instead of falling back to SQLite."""
    prod_settings = Settings(
        app_env="production",
        database_url="postgresql+psycopg2://postgres:super_secret_pwd@127.0.0.1:54321/postgres",
    )
    with patch("backend.app.db.session.settings", prod_settings):
        with pytest.raises(RuntimeError) as exc_info:
            _init_resilient_engine()

        error_message = str(exc_info.value)
        assert "Local SQLite fallback is disabled in production/staging" in error_message
        assert "super_secret_pwd" not in error_message  # credential must not be leaked


def test_alembic_rejects_sqlite_in_production():
    """Verify Alembic migration runner rejects SQLite URLs in production/staging environments."""
    prod_settings = Settings(
        app_env="production",
        database_url="sqlite:///fallback.db",
        direct_url="",
    )
    with patch("backend.alembic.env.get_settings", return_value=prod_settings):
        with patch.object(alembic_env, "config", None):
            with pytest.raises(RuntimeError) as exc_info:
                alembic_env.get_url()

            assert "Alembic migration safety violation: SQLite database URL" in str(exc_info.value)
