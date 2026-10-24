"""
SkillPassport Database Connectivity & Connection Pool Reliability Tests.
Tests bounded connection pooling, Session Pooler error classification,
safe session lifecycle, rollback semantics, circuit breaker recovery,
and credential sanitization.
"""

import pytest
import time
from unittest.mock import MagicMock, patch
from sqlalchemy import text
from sqlalchemy.exc import (
    OperationalError as SAOperationalError,
    TimeoutError as SATimeoutError,
    IntegrityError,
)
import psycopg2
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.core.config import Settings, get_settings
from backend.app.db.session import get_db, engine, SessionLocal, check_database_connection
from backend.app.db.reliability import (
    is_transient_connection_error,
    is_connection_exhaustion_error,
    is_non_retryable_error,
    DatabaseCircuitBreaker,
    execute_with_retry,
    circuit_breaker,
)
from backend.app.core.exceptions import DatabaseUnavailableError
from backend.app.main import create_app


# ---------------------------------------------------------------------------
# 1. Missing Database URL Validation
# ---------------------------------------------------------------------------
def test_missing_database_url_validation():
    """Confirms that an empty or whitespace DATABASE_URL is cleanly rejected."""
    with pytest.raises(ValueError, match="DATABASE_URL is required"):
        Settings.validate_and_normalize_database_url("")

    with pytest.raises(ValueError, match="DATABASE_URL is required"):
        Settings.validate_and_normalize_database_url("   ")


# ---------------------------------------------------------------------------
# 2. Malformed Connection & Scheme Normalization
# ---------------------------------------------------------------------------
def test_scheme_normalization():
    """Confirms postgres:// and postgresql:// are normalized to postgresql+psycopg2://."""
    url1 = "postgres://postgres.ref:secret@aws-0-region.pooler.supabase.com:5432/postgres"
    norm1 = Settings.validate_and_normalize_database_url(url1)
    assert norm1.startswith("postgresql+psycopg2://")

    url2 = "postgresql://postgres.ref:secret@aws-0-region.pooler.supabase.com:5432/postgres"
    norm2 = Settings.validate_and_normalize_database_url(url2)
    assert norm2.startswith("postgresql+psycopg2://")

    url3 = "postgresql+psycopg2://postgres.ref:secret@aws-0-region.pooler.supabase.com:5432/postgres"
    norm3 = Settings.validate_and_normalize_database_url(url3)
    assert norm3 == url3


# ---------------------------------------------------------------------------
# 3. Sanitized Database URL Redacts Password
# ---------------------------------------------------------------------------
def test_sanitized_database_url_masks_password():
    """Confirms sanitized_database_url property redacts passwords from logs."""
    test_settings = Settings(
        database_url="postgresql+psycopg2://postgres.myproject:SuperSecretP@ss123@aws-0-region.pooler.supabase.com:5432/postgres",
        supabase_url="https://myproject.supabase.co",
        supabase_publishable_key="test-key",
    )
    sanitized = test_settings.sanitized_database_url
    assert "SuperSecretP@ss123" not in sanitized
    assert "***" in sanitized
    assert "postgres.myproject" in sanitized
    assert "aws-0-region.pooler.supabase.com:5432/postgres" in sanitized


# ---------------------------------------------------------------------------
# 4. Successful SELECT 1 with Configured Engine
# ---------------------------------------------------------------------------
def test_successful_select_1_with_configured_engine():
    """Executes safe read-only SELECT 1 against the configured PostgreSQL engine."""
    with engine.connect() as conn:
        res = conn.execute(text("SELECT 1;"))
        val = res.scalar()
        assert val == 1


# ---------------------------------------------------------------------------
# 5. Session Closure on Successful Request
# ---------------------------------------------------------------------------
def test_session_closure_on_successful_request():
    """Verifies that get_db generator yields a session and closes it on completion."""
    gen = get_db()
    db = next(gen)
    assert db is not None
    # Session is active
    val = db.execute(text("SELECT 1;")).scalar()
    assert val == 1

    # Complete generator
    try:
        next(gen)
    except StopIteration:
        pass

    # Ensure engine checkedout connections return to 0
    assert engine.pool.checkedout() == 0


# ---------------------------------------------------------------------------
# 6. Session Rollback and Closure on HTTPException
# ---------------------------------------------------------------------------
def test_session_rollback_and_closure_on_http_exception():
    """Verifies that get_db performs explicit rollback when an HTTPException occurs."""
    gen = get_db()
    db = next(gen)
    rollback_called = False
    original_rollback = db.rollback

    def tracking_rollback():
        nonlocal rollback_called
        rollback_called = True
        original_rollback()

    db.rollback = tracking_rollback

    with pytest.raises(HTTPException):
        try:
            raise HTTPException(status_code=404, detail="Resource not found")
        except HTTPException as he:
            gen.throw(he)

    assert rollback_called
    assert engine.pool.checkedout() == 0


# ---------------------------------------------------------------------------
# 7. Session Rollback and Failure Tracking on Unhandled Exception
# ---------------------------------------------------------------------------
def test_session_rollback_and_closure_on_unhandled_exception():
    """Verifies get_db rolls back and closes session when an unexpected error occurs."""
    gen = get_db()
    db = next(gen)
    rollback_called = False
    original_rollback = db.rollback

    def tracking_rollback():
        nonlocal rollback_called
        rollback_called = True
        original_rollback()

    db.rollback = tracking_rollback

    with pytest.raises(RuntimeError):
        gen.throw(RuntimeError("Unexpected processing crash"))

    assert rollback_called
    assert engine.pool.checkedout() == 0


# ---------------------------------------------------------------------------
# 8. SQLAlchemy Pool Exhaustion Classification & Handling
# ---------------------------------------------------------------------------
def test_sqlalchemy_pool_exhaustion_classification():
    """Verifies SATimeoutError and QueuePool limit messages are classified as exhaustion."""
    pool_err = SATimeoutError("QueuePool limit of size 2 overflow 0 reached, connection timed out")
    assert is_connection_exhaustion_error(pool_err)

    app = create_app()

    @app.get("/test-pool-exhaustion")
    def trigger_pool_exhaustion():
        raise SATimeoutError("QueuePool limit reached")

    client = TestClient(app)
    resp = client.get("/test-pool-exhaustion")
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert resp.headers.get("retry-after") == "15"
    data = resp.json()
    assert data["error"]["code"] == "DATABASE_TEMPORARILY_UNAVAILABLE"


# ---------------------------------------------------------------------------
# 9. Session-Pooler EMAXCONNSESSION Error Classification
# ---------------------------------------------------------------------------
def test_session_pooler_emaxconnsession_classification():
    """Confirms Supabase EMAXCONNSESSION is recognized as connection exhaustion."""
    emax = Exception("FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15")
    assert is_connection_exhaustion_error(emax)
    assert not is_non_retryable_error(emax)


# ---------------------------------------------------------------------------
# 10. Bounded Recovery Behavior (Circuit Breaker)
# ---------------------------------------------------------------------------
def test_bounded_circuit_breaker_recovery():
    """Verifies circuit breaker trips after threshold and auto-recovers after timeout."""
    cb = DatabaseCircuitBreaker(failure_threshold=2, recovery_timeout_seconds=0.2)
    assert cb.state == DatabaseCircuitBreaker.STATE_CLOSED

    cb.record_failure(Exception("connection refused"))
    assert cb.state == DatabaseCircuitBreaker.STATE_CLOSED

    cb.record_failure(Exception("connection refused"))
    assert cb.state == DatabaseCircuitBreaker.STATE_OPEN

    # While OPEN, check_availability raises DatabaseUnavailableError (fails fast)
    with pytest.raises(DatabaseUnavailableError):
        cb.check_availability()

    # Wait for recovery probe
    time.sleep(0.25)
    assert cb.state == DatabaseCircuitBreaker.STATE_HALF_OPEN

    # Successful probe closes circuit
    cb.record_success()
    assert cb.state == DatabaseCircuitBreaker.STATE_CLOSED


# ---------------------------------------------------------------------------
# 11. No Unsafe Repeated Database Write on Non-Idempotent Operation
# ---------------------------------------------------------------------------
def test_no_unsafe_repeated_write_after_ambiguous_failure():
    """Verifies non-idempotent operations abort immediately without duplicate write retries."""
    exec_count = 0

    def insert_evidence_row():
        nonlocal exec_count
        exec_count += 1
        raise SAOperationalError("server closed the connection unexpectedly", None, None)

    with pytest.raises(DatabaseUnavailableError) as exc_info:
        execute_with_retry(
            insert_evidence_row,
            operation_name="insert_evidence",
            max_retries=3,
            is_idempotent=False,
        )

    # Must abort after exactly 1 attempt
    assert exec_count == 1
    assert "interrupted during a write operation" in str(exc_info.value.message)


# ---------------------------------------------------------------------------
# 12. Sanitized Logs & Errors (No Credential Leakage)
# ---------------------------------------------------------------------------
def test_sanitized_error_handling_no_credential_leak():
    """Verifies health check and error handlers do not leak connection strings or passwords."""
    with patch("backend.app.db.session.engine.connect") as mock_connect:
        mock_connect.side_effect = SAOperationalError(
            "could not connect to server with password 'super_secret_db_password_123!'",
            None,
            None,
        )
        res = check_database_connection()
        assert res["status"] == "unhealthy"
        assert res["connected"] is False
        assert "super_secret_db_password_123!" not in str(res)
        assert "super_secret_db_password_123!" not in res.get("error", "")

    # Test psycopg2 exception handler
    app = create_app()

    @app.get("/test-driver-error")
    def trigger_driver_error():
        raise psycopg2.OperationalError("connection to aws-0-region.pooler.supabase.com with password 'mypass' failed")

    client = TestClient(app)
    resp = client.get("/test-driver-error")
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert "mypass" not in resp.text
    assert "pooler.supabase.com" not in resp.text
