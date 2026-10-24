from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator
from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger
from backend.app.db.reliability import circuit_breaker

logger = get_logger("db.session")

settings = get_settings()

# Engine creation with strictly bounded pooling for Supabase session-mode pooler (limit 15 total)
# db_pool_size (default 8) with db_max_overflow=0 guarantees this service will NEVER exceed 8 connections total,
# perfectly supporting concurrent frontend requests while leaving a guaranteed 7-connection headroom
# on Supabase to prevent EMAXCONNSESSION errors.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_reset_on_return="rollback",
    connect_args={
        "connect_timeout": 30,
        "keepalives": 1,
        "keepalives_idle": 15,
        "keepalives_interval": 5,
        "keepalives_count": 3,
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

try:
    from backend.app.models.base import Base
except Exception:
    Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for thread-safe database sessions with circuit breaker and cleanup."""
    circuit_breaker.check_availability()
    db = SessionLocal()
    try:
        yield db
        circuit_breaker.record_success()
    except HTTPException:
        # Do NOT count application-level HTTP exceptions (401, 404, etc.) as database failures, but rollback cleanly
        try:
            db.rollback()
        except Exception as rb_err:
            logger.warning(f"Error during rollback on HTTPException: {rb_err}")
        raise
    except Exception as exc:
        try:
            db.rollback()
        except Exception as rb_err:
            logger.warning(f"Error during rollback on exception: {rb_err}")
        circuit_breaker.record_failure(exc)
        raise
    finally:
        try:
            db.close()
        except Exception as close_err:
            logger.debug(f'Safely ignored stale connection close exception: {close_err}')


def check_database_connection() -> dict:
    """Verifies live PostgreSQL connection via SELECT 1 with circuit breaker awareness."""
    circuit_metrics = circuit_breaker.get_metrics()
    if circuit_metrics["state"] == "OPEN":
        return {
            "status": "unhealthy",
            "connected": False,
            "error": "Circuit breaker is OPEN (recovering from connection exhaustion)",
            "circuit_breaker": circuit_metrics,
        }
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1;"))
            row = result.fetchone()
            if row and row[0] == 1:
                circuit_breaker.record_success()
                return {
                    "status": "healthy",
                    "connected": True,
                    "circuit_breaker": circuit_metrics,
                }
        return {"status": "unhealthy", "connected": False, "error": "Query returned no rows"}
    except Exception as e:
        circuit_breaker.record_failure(e)
        logger.error(f"PostgreSQL health check failed: {type(e).__name__}")
        return {
            "status": "unhealthy",
            "connected": False,
            "error": f"Database connection error: {type(e).__name__}",
            "circuit_breaker": circuit_breaker.get_metrics(),
        }
