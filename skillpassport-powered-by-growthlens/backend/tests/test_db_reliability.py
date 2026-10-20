import pytest
import time
from unittest.mock import MagicMock
from sqlalchemy.exc import (
    OperationalError as SAOperationalError,
    TimeoutError as SATimeoutError,
    IntegrityError,
    ProgrammingError,
)
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from backend.app.db.reliability import (
    is_transient_connection_error,
    is_connection_exhaustion_error,
    is_transient_transaction_error,
    is_non_retryable_error,
    DatabaseCircuitBreaker,
    execute_with_retry,
)
from backend.app.core.exceptions import DatabaseUnavailableError
from backend.app.db.session import get_db, engine, SessionLocal
from backend.app.main import create_app


def test_transient_connection_error_classifier():
    # String match tests
    assert is_transient_connection_error(Exception("server closed the connection unexpectedly"))
    assert is_transient_connection_error(Exception("connection reset by peer"))
    assert is_transient_connection_error(Exception("could not connect to server: Connection refused"))
    assert is_transient_connection_error(Exception("SSL connection has been closed unexpectedly"))
    assert is_transient_connection_error(Exception("broken pipe"))

    # Non-transient errors
    assert not is_transient_connection_error(ValueError("Invalid argument"))
    assert not is_transient_connection_error(Exception("column 'foo' does not exist"))


def test_connection_exhaustion_classifier():
    assert is_connection_exhaustion_error(
        Exception("FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15")
    )
    assert is_connection_exhaustion_error(Exception("too many clients already"))
    assert is_connection_exhaustion_error(Exception("remaining connection slots are reserved for non-replication superuser connections"))
    assert is_connection_exhaustion_error(Exception("QueuePool limit of size 8 overflow 0 reached, connection timed out"))
    assert is_connection_exhaustion_error(SATimeoutError("QueuePool timeout"))

    # Other operational errors should not be classified as exhaustion
    assert not is_connection_exhaustion_error(Exception("syntax error at or near 'SELECT'"))


def test_transient_transaction_classifier():
    assert is_transient_transaction_error(Exception("deadlock detected: Process 1234 waits for ShareLock"))
    assert is_transient_transaction_error(Exception("could not serialize access due to concurrent update"))
    assert not is_transient_transaction_error(Exception("relation not found"))


def test_non_retryable_classifier():
    mock_orig = MagicMock()
    mock_orig.pgcode = "23505"  # unique_violation
    integrity_err = IntegrityError("duplicate key value", None, mock_orig)
    assert is_non_retryable_error(integrity_err)

    prog_err = ProgrammingError("syntax error", None, MagicMock(pgcode="42601"))
    assert is_non_retryable_error(prog_err)

    assert not is_non_retryable_error(Exception("server closed the connection unexpectedly"))


def test_circuit_breaker_transitions():
    cb = DatabaseCircuitBreaker(failure_threshold=3, recovery_timeout_seconds=0.3)
    assert cb.state == DatabaseCircuitBreaker.STATE_CLOSED

    # 1st failure
    cb.record_failure(Exception("connection refused"))
    assert cb.state == DatabaseCircuitBreaker.STATE_CLOSED

    # 2nd failure
    cb.record_failure(Exception("connection refused"))
    assert cb.state == DatabaseCircuitBreaker.STATE_CLOSED

    # 3rd failure - trips breaker
    cb.record_failure(Exception("connection refused"))
    assert cb.state == DatabaseCircuitBreaker.STATE_OPEN

    # While OPEN, check_availability must raise DatabaseUnavailableError
    with pytest.raises(DatabaseUnavailableError) as exc_info:
        cb.check_availability()
    assert exc_info.value.retry_after >= 1
    assert exc_info.value.code == "DATABASE_UNAVAILABLE"

    # Wait for recovery timeout to transition to HALF_OPEN
    time.sleep(0.35)
    assert cb.state == DatabaseCircuitBreaker.STATE_HALF_OPEN

    # A probe failure in HALF_OPEN trips immediately back to OPEN
    cb.record_failure(Exception("connection still refused"))
    assert cb.state == DatabaseCircuitBreaker.STATE_OPEN

    # Wait again and test successful recovery
    time.sleep(0.35)
    assert cb.state == DatabaseCircuitBreaker.STATE_HALF_OPEN
    cb.record_success()
    assert cb.state == DatabaseCircuitBreaker.STATE_CLOSED
    assert cb._consecutive_failures == 0


def test_execute_with_retry_success_after_transient_failure():
    attempts = 0

    def flaky_db_op():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise SAOperationalError("server closed the connection unexpectedly", None, None)
        return "success_val"

    result = execute_with_retry(
        flaky_db_op,
        operation_name="flaky_test_op",
        max_retries=2,
        is_idempotent=True,
        backoff_base=0.01,
        max_backoff=0.05,
    )
    assert result == "success_val"
    assert attempts == 2


def test_execute_with_retry_prevents_unsafe_non_idempotent_replay():
    attempts = 0

    def non_idempotent_write():
        nonlocal attempts
        attempts += 1
        raise SAOperationalError("server closed the connection unexpectedly", None, None)

    with pytest.raises(DatabaseUnavailableError) as exc_info:
        execute_with_retry(
            non_idempotent_write,
            operation_name="create_unhashed_record",
            max_retries=2,
            is_idempotent=False,
        )

    # Must only attempt once and abort immediately to prevent duplicate rows
    assert attempts == 1
    assert "interrupted during a write operation" in str(exc_info.value.message)


def test_fastapi_database_unavailable_error_handler():
    app = create_app()

    @app.get("/test-db-unavailable")
    def trigger_db_unavailable():
        raise DatabaseUnavailableError("Supabase connection limit reached", retry_after=12)

    client = TestClient(app)
    response = client.get("/test-db-unavailable")
    assert response.status_code == 503
    assert response.headers.get("retry-after") == "12"
    data = response.json()
    assert data["error"]["code"] == "DATABASE_UNAVAILABLE"
    assert "connection limit reached" in data["error"]["message"]


def test_fastapi_raw_sqlalchemy_error_handler():
    app = create_app()

    @app.get("/test-raw-sa-error")
    def trigger_sa_error():
        raise SAOperationalError("FATAL: (EMAXCONNSESSION) max clients reached", None, None)

    client = TestClient(app)
    response = client.get("/test-raw-sa-error")
    assert response.status_code == 503
    assert response.headers.get("retry-after") == "15"
    data = response.json()
    assert data["error"]["code"] == "DATABASE_TEMPORARILY_UNAVAILABLE"
    # Ensure sensitive database credentials or raw internal details are not leaked
    assert "EMAXCONNSESSION" not in data["error"]["message"]
    assert "high load or connection limits" in data["error"]["message"]


def test_database_session_dependency_lifecycle():
    # Verify get_db opens and closes cleanly without leaking connection slots
    generator = get_db()
    db = next(generator)
    assert db is not None

    close_called = False
    original_close = db.close

    def tracking_close():
        nonlocal close_called
        close_called = True
        original_close()

    db.close = tracking_close

    # Trigger finally block in generator
    try:
        next(generator)
    except StopIteration:
        pass

    assert close_called
    assert engine.pool.checkedout() == 0
