"""
SkillPassport Database Reliability & Automatic Recovery Engine.
Provides error classification, connection exhaustion protection, circuit breaker,
and bounded jittered retries for transient PostgreSQL/Supabase errors.
"""

import time
import random
import threading
from typing import Callable, TypeVar, Any, Optional, Dict
from sqlalchemy.exc import (
    OperationalError as SAOperationalError,
    TimeoutError as SATimeoutError,
    DBAPIError,
    IntegrityError,
    DataError,
    ProgrammingError,
)
import psycopg2
from psycopg2 import errorcodes

from backend.app.core.exceptions import DatabaseUnavailableError
from backend.app.core.logging import get_logger

logger = get_logger("db.reliability")

T = TypeVar("T")

# Substrings that denote transient connection drops or resets
TRANSIENT_CONNECTION_KEYWORDS = [
    "server closed the connection unexpectedly",
    "connection closed",
    "could not connect to server",
    "connection refused",
    "connection reset by peer",
    "ssl connection has been closed unexpectedly",
    "terminating connection due to administrator command",
    "connection timed out",
    "network is unreachable",
    "broken pipe",
]

# Substrings that denote connection exhaustion on pooler or client
EXHAUSTION_KEYWORDS = [
    "emaxconnsession",
    "max clients reached",
    "max clients are limited to pool_size",
    "remaining connection slots are reserved",
    "too many clients already",
    "queuepool limit of size",
]


def is_transient_connection_error(exc: Exception) -> bool:
    """Returns True if the exception represents a transient network/connection drop."""
    err_str = str(exc).lower()
    if any(keyword in err_str for keyword in TRANSIENT_CONNECTION_KEYWORDS):
        return True
    if isinstance(exc, (psycopg2.OperationalError, SAOperationalError)):
        # Check pgcode if available
        orig = getattr(exc, "orig", None)
        pgcode = getattr(orig, "pgcode", None) or getattr(exc, "pgcode", None)
        if pgcode in (
            errorcodes.ADMIN_SHUTDOWN,
            errorcodes.CRASH_SHUTDOWN,
            errorcodes.CANNOT_CONNECT_NOW,
            errorcodes.CONNECTION_DOES_NOT_EXIST,
            errorcodes.CONNECTION_FAILURE,
            errorcodes.SQLCLIENT_UNABLE_TO_ESTABLISH_SQLCONNECTION,
            errorcodes.SQLSERVER_REJECTED_ESTABLISHMENT_OF_SQLCONNECTION,
        ):
            return True
        return any(keyword in err_str for keyword in TRANSIENT_CONNECTION_KEYWORDS)
    return False


def is_connection_exhaustion_error(exc: Exception) -> bool:
    """Returns True if the connection pool or Supabase pooler has reached capacity."""
    if isinstance(exc, SATimeoutError):
        return True
    err_str = str(exc).lower()
    return any(keyword in err_str for keyword in EXHAUSTION_KEYWORDS)


def is_transient_transaction_error(exc: Exception) -> bool:
    """Returns True if transaction failed due to serialization conflict or deadlock."""
    orig = getattr(exc, "orig", None)
    pgcode = getattr(orig, "pgcode", None) or getattr(exc, "pgcode", None)
    serialization_code = getattr(errorcodes, "SERIALIZATION_FAILURE", "40001")
    deadlock_code = getattr(errorcodes, "DEADLOCK_DETECTED", "40P01")
    if pgcode in (serialization_code, deadlock_code, "40001", "40P01"):
        return True
    err_str = str(exc).lower()
    return "deadlock detected" in err_str or "could not serialize access" in err_str


def is_non_retryable_error(exc: Exception) -> bool:
    """Returns True if the error is permanent (e.g. constraint violation, syntax error) or an HTTP exception."""
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        return True
    if isinstance(exc, (IntegrityError, DataError, ProgrammingError)):
        return True
    orig = getattr(exc, "orig", None)
    pgcode = getattr(orig, "pgcode", None) or getattr(exc, "pgcode", None)
    if pgcode and (
        pgcode.startswith("23")  # Integrity Constraint Violation
        or pgcode.startswith("22")  # Data Exception
        or pgcode.startswith("42")  # Syntax Error or Access Rule Violation
    ):
        return True
    return False


class DatabaseCircuitBreaker:
    """
    In-memory circuit breaker protecting Supabase from cascading failures during outages.
    States:
      - CLOSED: Database is operational.
      - OPEN: Failures exceeded threshold. Fails fast with 503 without overwhelming DB.
      - HALF_OPEN: Probe window reached; allows single query to verify recovery.
    """

    STATE_CLOSED = "CLOSED"
    STATE_OPEN = "OPEN"
    STATE_HALF_OPEN = "HALF_OPEN"

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout_seconds: float = 15.0,
    ):
        self._lock = threading.Lock()
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout_seconds
        self._state = self.STATE_CLOSED
        self._consecutive_failures = 0
        self._last_failure_time = 0.0
        self._last_success_time = time.time()
        self._total_tripped_count = 0

    @property
    def state(self) -> str:
        with self._lock:
            if self._state == self.STATE_OPEN:
                if (time.time() - self._last_failure_time) >= self._recovery_timeout:
                    self._state = self.STATE_HALF_OPEN
                    logger.info("Database circuit breaker transitioned to HALF_OPEN (probing recovery)")
            return self._state

    def check_availability(self) -> None:
        """
        Validates if requests should be allowed to proceed.
        Raises DatabaseUnavailableError if the circuit is currently OPEN.
        """
        current_state = self.state
        if current_state == self.STATE_OPEN:
            remaining = max(1, int(self._recovery_timeout - (time.time() - self._last_failure_time)))
            logger.warning(f"Circuit breaker is OPEN. Rejecting database checkout (recovery in {remaining}s)")
            raise DatabaseUnavailableError(
                message="Database service is temporarily recovering from high load or connection exhaustion.",
                retry_after=remaining,
                details={"circuit_state": "OPEN", "retry_after_seconds": remaining},
            )

    def record_success(self) -> None:
        """Registers a successful database operation, resetting failure count."""
        with self._lock:
            if self._state in (self.STATE_HALF_OPEN, self.STATE_OPEN):
                logger.info("Database circuit breaker recovered: transitioning to CLOSED")
            self._state = self.STATE_CLOSED
            self._consecutive_failures = 0
            self._last_success_time = time.time()

    def record_failure(self, exc: Exception) -> None:
        """Registers a database connection failure, tripping the circuit if threshold met."""
        # Non-retryable errors (e.g. invalid query or constraint violation) do not trip breaker
        if is_non_retryable_error(exc):
            return

        with self._lock:
            self._consecutive_failures += 1
            self._last_failure_time = time.time()
            logger.warning(
                f"Database failure recorded (count={self._consecutive_failures}/{self._failure_threshold}): {type(exc).__name__}"
            )

            if self._state == self.STATE_HALF_OPEN:
                # Probe failed, re-open immediately
                self._state = self.STATE_OPEN
                self._total_tripped_count += 1
                logger.warning("Database probe failed in HALF_OPEN. Circuit returned to OPEN.")
            elif self._consecutive_failures >= self._failure_threshold:
                self._state = self.STATE_OPEN
                self._total_tripped_count += 1
                logger.error(
                    f"Database circuit breaker TRIPPED to OPEN after {self._consecutive_failures} failures. "
                    f"Failing fast for next {self._recovery_timeout} seconds."
                )

    def reset(self) -> None:
        """Resets the circuit breaker to closed (used in tests or administrative resets)."""
        with self._lock:
            self._state = self.STATE_CLOSED
            self._consecutive_failures = 0
            self._last_failure_time = 0.0
            self._last_success_time = time.time()

    def get_metrics(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "state": self._state,
                "consecutive_failures": self._consecutive_failures,
                "failure_threshold": self._failure_threshold,
                "recovery_timeout_seconds": self._recovery_timeout,
                "seconds_since_last_success": round(time.time() - self._last_success_time, 2),
                "seconds_since_last_failure": (
                    round(time.time() - self._last_failure_time, 2)
                    if self._last_failure_time > 0
                    else None
                ),
                "total_tripped_count": self._total_tripped_count,
            }


from backend.app.core.config import get_settings

try:
    _settings = get_settings()
    _threshold = getattr(_settings, "db_circuit_breaker_threshold", 5)
    _recovery_timeout = getattr(_settings, "db_circuit_breaker_recovery_seconds", 15.0)
except Exception:
    _threshold = 5
    _recovery_timeout = 15.0

# Process-wide singleton circuit breaker
circuit_breaker = DatabaseCircuitBreaker(
    failure_threshold=_threshold,
    recovery_timeout_seconds=_recovery_timeout,
)


def execute_with_retry(
    operation: Callable[[], T],
    operation_name: str = "database_operation",
    max_retries: int = 2,
    is_idempotent: bool = True,
    backoff_base: float = 0.15,
    max_backoff: float = 1.5,
) -> T:
    """
    Executes a database operation with bounded exponential backoff and jitter for transient errors.
    Strict safety constraints:
      - Never retries non-idempotent operations if failure occurred during execution.
      - Never retries permanent errors (integrity, validation, syntax).
      - Retries transient connection drops and serialization deadlocks.
    """
    circuit_breaker.check_availability()
    attempt = 0

    while True:
        try:
            result = operation()
            circuit_breaker.record_success()
            return result
        except Exception as exc:
            attempt += 1

            # Check if permanent
            if is_non_retryable_error(exc):
                circuit_breaker.record_success()  # DB is alive, error is data/code
                raise

            # Classify error
            transient_conn = is_transient_connection_error(exc)
            exhaustion = is_connection_exhaustion_error(exc)
            transient_tx = is_transient_transaction_error(exc)

            if not (transient_conn or exhaustion or transient_tx):
                # Unknown error - don't retry blindly
                raise

            circuit_breaker.record_failure(exc)

            # Writes that are not idempotent must never be retried after starting
            if not is_idempotent:
                logger.warning(
                    f"Non-idempotent operation '{operation_name}' failed with {type(exc).__name__}; "
                    f"skipping automatic retry to prevent duplicate records."
                )
                raise DatabaseUnavailableError(
                    message="Database connection was interrupted during a write operation. Please check your data before retrying.",
                    details={"operation": operation_name, "attempt": attempt},
                )

            if attempt > max_retries:
                logger.error(
                    f"Operation '{operation_name}' exhausted all {max_retries} retry attempts: {exc}"
                )
                raise DatabaseUnavailableError(
                    message="Database service is temporarily unavailable after multiple retry attempts.",
                    details={"operation": operation_name, "attempts": attempt},
                )

            # Calculate jittered exponential backoff
            delay = min(max_backoff, (backoff_base * (2 ** (attempt - 1))) + random.uniform(0.05, 0.2))
            # If exhaustion, add extra cooling buffer
            if exhaustion:
                delay += 0.5

            logger.info(
                f"Retrying transient failure in '{operation_name}' (attempt {attempt}/{max_retries}) after {delay:.2f}s..."
            )
            time.sleep(delay)
