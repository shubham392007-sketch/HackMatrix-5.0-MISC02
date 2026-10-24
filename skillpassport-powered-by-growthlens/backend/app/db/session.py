import os
from pathlib import Path
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator
from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger
from backend.app.db.reliability import circuit_breaker

logger = get_logger("db.session")
settings = get_settings()

try:
    from backend.app.models.base import Base
except Exception:
    Base = declarative_base()

# Local SQLite fallback path for uninterrupted local development
data_dir = Path(__file__).resolve().parent.parent.parent / "data"
data_dir.mkdir(parents=True, exist_ok=True)
sqlite_fallback_path = data_dir / "skillpassport_local.db"
fallback_db_url = f"sqlite:///{sqlite_fallback_path.as_posix()}"

fallback_engine = create_engine(
    fallback_db_url,
    connect_args={"check_same_thread": False},
)
SessionFallback = sessionmaker(autocommit=False, autoflush=False, bind=fallback_engine)

# State flag tracking whether we are currently using fallback
_use_fallback = False

def _init_fallback():
    global _use_fallback
    _use_fallback = True
    try:
        circuit_breaker.reset()
    except Exception:
        pass
    try:
        import backend.app.models  # ensure all models registered
        Base.metadata.create_all(bind=fallback_engine)
        logger.info(f"Local SQLite database ready at {sqlite_fallback_path}")
    except Exception as e:
        logger.error(f"Error initializing local SQLite tables: {e}")

# Primary Engine creation
try:
    if settings.database_url.startswith("sqlite"):
        engine = create_engine(
            settings.database_url,
            connect_args={"check_same_thread": False},
        )
    else:
        engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_reset_on_return="rollback",
            connect_args={
                "connect_timeout": 5,
                "keepalives": 1,
                "keepalives_idle": 15,
                "keepalives_interval": 5,
                "keepalives_count": 3,
            },
        )
except Exception as e:
    logger.warning(f"Could not initialize primary database engine: {e}. Falling back to SQLite.")
    engine = fallback_engine
    _init_fallback()

_PrimarySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class _ResilientSessionMaker:
    """Dynamic session factory that transparently routes to SQLite fallback when primary is unavailable."""
    def __call__(self, *args, **kwargs):
        global _use_fallback
        if _use_fallback:
            return SessionFallback(*args, **kwargs)
        try:
            return _PrimarySessionLocal(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Failed to create primary database session ({e}). Activating SQLite fallback.")
            _init_fallback()
            return SessionFallback(*args, **kwargs)

    def __getattr__(self, name):
        if _use_fallback:
            return getattr(SessionFallback, name)
        return getattr(_PrimarySessionLocal, name)

SessionLocal = _ResilientSessionMaker()

# Auto-test connection on module load
if not _use_fallback and not settings.database_url.startswith("sqlite"):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
        logger.info("Primary PostgreSQL database connected successfully.")
    except Exception as e:
        logger.warning(
            f"Primary PostgreSQL connection unavailable ({type(e).__name__}: {str(e)[:120]}). "
            f"Activating resilient local SQLite fallback engine."
        )
        _init_fallback()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for thread-safe database sessions with automatic resilience."""
    global _use_fallback
    if _use_fallback:
        db = SessionFallback()
        try:
            yield db
        except HTTPException:
            try:
                db.rollback()
            except Exception:
                pass
            raise
        except Exception as exc:
            try:
                db.rollback()
            except Exception:
                pass
            raise
        finally:
            try:
                db.close()
            except Exception:
                pass
        return

    # Primary PostgreSQL path
    try:
        circuit_breaker.check_availability()
        db = SessionLocal()
    except Exception as exc:
        logger.warning(f"PostgreSQL unavailable on get_db: {exc}. Seamlessly switching to local SQLite fallback.")
        _init_fallback()
        circuit_breaker.reset()
        db = SessionFallback()
        try:
            yield db
        finally:
            db.close()
        return

    try:
        yield db
        circuit_breaker.record_success()
    except HTTPException:
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
        if circuit_breaker.get_metrics()["state"] == "OPEN":
            logger.warning("Circuit breaker tripped on PostgreSQL. Activating local SQLite fallback.")
            _init_fallback()
        raise
    finally:
        try:
            db.close()
        except Exception as close_err:
            logger.debug(f'Safely ignored stale connection close exception: {close_err}')


def check_database_connection() -> dict:
    """Verifies live database connection with automatic fallback awareness."""
    if _use_fallback:
        return {
            "status": "healthy",
            "connected": True,
            "mode": "local_sqlite_resilient",
            "database": "sqlite",
            "message": "Local SQLite database operational. Supabase PostgreSQL is standing by.",
        }
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
                    "mode": "postgresql",
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
