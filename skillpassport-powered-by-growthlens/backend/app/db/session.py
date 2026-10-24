import os
import json
import re
import uuid
import urllib.request
from pathlib import Path
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID
from typing import Generator
from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger
from backend.app.db.reliability import circuit_breaker

logger = get_logger("db.session")
settings = get_settings()

def sanitize_db_error_message(exc: Exception) -> str:
    """Strips credentials and connection secrets from database error strings."""
    msg = str(exc)
    msg = re.sub(r"://([^:@]+):([^@]+)@", r"://\1:***@", msg)
    msg = re.sub(r"password=([^\s]+)", "password=***", msg)
    return msg

# Register SQLite type compiler overrides so PostgreSQL types (JSONB, UUID) work natively
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"

# Ensure SQLite seamlessly accepts both Python uuid.UUID and str representation without crashing
_orig_uuid_bind_processor = UUID.bind_processor
_orig_uuid_result_processor = UUID.result_processor

def _sqlite_safe_uuid_bind_processor(self, dialect):
    if dialect.name == "sqlite":
        def process(value):
            if value is None:
                return None
            if isinstance(value, uuid.UUID):
                return str(value)
            if isinstance(value, str):
                try:
                    return str(uuid.UUID(value))
                except (ValueError, AttributeError):
                    return value
            return str(value)
        return process
    return _orig_uuid_bind_processor(self, dialect)

def _sqlite_safe_uuid_result_processor(self, dialect, coltype):
    if dialect.name == "sqlite":
        if self.as_uuid:
            def process(value):
                if value is None:
                    return None
                if isinstance(value, uuid.UUID):
                    return value
                try:
                    return uuid.UUID(value)
                except (ValueError, AttributeError):
                    return value
            return process
        return None
    return _orig_uuid_result_processor(self, dialect, coltype)

UUID.bind_processor = _sqlite_safe_uuid_bind_processor
UUID.result_processor = _sqlite_safe_uuid_result_processor

Base = declarative_base()


def sync_cloud_supabase_to_local_sqlite(target_engine):
    """
    Pulls cloud Supabase tables over HTTPS port 443 into the local SQLite database.
    Bypasses blocked PostgreSQL direct TCP ports (5432/6543) so users have real data.
    """
    supabase_key = (
        getattr(settings, "supabase_service_role_key", None)
        or getattr(settings, "supabase_anon_key", None)
        or getattr(settings, "supabase_publishable_key", None)
    )
    supabase_url = settings.supabase_url
    if not supabase_key or not supabase_url:
        return

    # Skip slow remote table fetching if local SQLite is already warm
    try:
        with target_engine.connect() as check_conn:
            has_data = check_conn.execute(text("SELECT count(*) FROM user_profiles")).scalar()
            if has_data and has_data > 0:
                logger.debug("Local database already initialized with user records, skipping HTTPS cloud sync during startup.")
                return
    except Exception:
        pass

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    }
    tables = [
        "user_profiles",
        "connected_sources",
        "evidence_items",
        "competency_taxonomy",
        "user_target_roles",
        "job_postings",
        "ingestion_runs",
    ]

    try:
        with target_engine.begin() as conn:
            for tbl in tables:
                try:
                    url = f"{supabase_url.rstrip('/')}/rest/v1/{tbl}?select=*"
                    req = urllib.request.Request(url, headers=headers)
                    with urllib.request.urlopen(req, timeout=4) as res:
                        rows = json.loads(res.read().decode())
                        if not rows:
                            continue
                        cols_res = conn.execute(text(f"PRAGMA table_info({tbl})")).fetchall()
                        valid_cols = {c[1] for c in cols_res}
                        for r in rows:
                            filtered = {}
                            for col, val in r.items():
                                if col in valid_cols:
                                    if isinstance(val, (dict, list)):
                                        filtered[col] = json.dumps(val)
                                    else:
                                        filtered[col] = val
                            col_names = list(filtered.keys())
                            if not col_names:
                                continue
                            placeholders = [f":{c}" for c in col_names]
                            sql = f"INSERT OR REPLACE INTO {tbl} ({', '.join(col_names)}) VALUES ({', '.join(placeholders)})"
                            conn.execute(text(sql), filtered)
                except Exception as tbl_err:
                    logger.debug(f"Sync skipped for {tbl}: {tbl_err}")
        logger.info("Successfully synced cloud Supabase records into resilient local database over HTTPS.")
    except Exception as sync_err:
        logger.warning(f"Initial cloud sync notice: {sync_err}")


_remote_postgres_status: dict = {
    "status": "unverified",
    "connected": False,
    "diagnostic": "Remote PostgreSQL status has not been checked.",
}


def _init_resilient_engine():
    """
    Initializes PostgreSQL if reachable; in development or test environments, seamlessly
    activates a cloud-synced local database if direct port 5432/IPv6 is unreachable.
    Fails closed in production and staging environments to prevent silent, non-durable writes.
    """
    global _remote_postgres_status
    is_postgres = settings.database_url.startswith("postgresql") or settings.database_url.startswith("postgres")

    if is_postgres:
        try:
            logger.info("Verifying direct PostgreSQL connection...")
            pg_engine = create_engine(
                settings.database_url,
                pool_pre_ping=settings.db_pool_pre_ping,
                pool_recycle=settings.db_pool_recycle,
                pool_size=min(settings.db_pool_size, 5),
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
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1;"))
            logger.info("Direct PostgreSQL connection established successfully.")
            _remote_postgres_status = {
                "status": "healthy",
                "connected": True,
                "engine": "postgresql",
                "note": "Direct Supabase PostgreSQL connection verified.",
            }
            return pg_engine
        except Exception as pg_err:
            sanitized_err = sanitize_db_error_message(pg_err)
            _remote_postgres_status = {
                "status": "unavailable",
                "connected": False,
                "engine": "postgresql",
                "diagnostic": (
                    f"Direct PostgreSQL port 5432 / IPv6 unreachable ({sanitized_err}). "
                    "Configure Supabase Connection Pooler (port 6543) or verified IPv4 network path for remote persistence."
                ),
                "error": sanitized_err,
            }
            if not settings.is_sqlite_fallback_allowed():
                logger.critical(
                    f"FATAL: Authoritative PostgreSQL connection failed in '{settings.app_env}' environment: {sanitized_err}. "
                    "SQLite fallback is strictly prohibited in production and staging to prevent non-durable local writes."
                )
                raise RuntimeError(
                    f"Database connection failed in '{settings.app_env}' environment: {sanitized_err}. "
                    "Local SQLite fallback is disabled in production/staging to prevent data loss. "
                    "Please verify your Supabase PostgreSQL connection string, network egress on port 5432/6543, "
                    "or configure the Supabase Connection Pooler."
                )
            logger.warning(
                f"Direct PostgreSQL port 5432 / IPv6 unreachable ({sanitized_err}). "
                f"Activating local SQLite fallback layer for '{settings.app_env}' mode. "
                "Notice: Writes to local SQLite do NOT synchronize back to Supabase."
            )
    elif not settings.is_sqlite_fallback_allowed():
        raise RuntimeError(
            f"Database configuration error: '{settings.database_url}' is not a PostgreSQL URL. "
            f"Non-PostgreSQL databases are strictly prohibited in '{settings.app_env}' mode."
        )
    else:
        _remote_postgres_status = {
            "status": "unverified",
            "connected": False,
            "engine": None,
            "diagnostic": "Remote PostgreSQL is not configured (database_url is not postgresql).",
        }

    # Resilient local SQLite database
    from backend.app.models.base import Base as ModelsBase
    import backend.app.models  # ensure models are loaded into Base metadata

    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
    os.makedirs(data_dir, exist_ok=True)
    sqlite_path = os.path.join(data_dir, "skillpassport.db")
    sqlite_engine = create_engine(
        f"sqlite:///{sqlite_path}",
        connect_args={"check_same_thread": False},
    )

    # Create all schema tables
    ModelsBase.metadata.create_all(bind=sqlite_engine)

    # Sync real cloud Supabase data over HTTPS port 443
    sync_cloud_supabase_to_local_sqlite(sqlite_engine)

    # Seed taxonomy if empty
    try:
        from backend.app.db.seeds import seed_canonical_taxonomy
        TempSession = sessionmaker(bind=sqlite_engine)
        with TempSession() as s:
            seed_canonical_taxonomy(s)
    except Exception as seed_err:
        logger.debug(f"Taxonomy seeding notice: {seed_err}")

    circuit_breaker.reset()
    return sqlite_engine


engine = _init_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for thread-safe database sessions with circuit breaker and cleanup."""
    if engine.dialect.name != "sqlite":
        circuit_breaker.check_availability()
    db = SessionLocal()
    try:
        yield db
        circuit_breaker.record_success()
    except HTTPException:
        # Do NOT count application-level HTTP exceptions (401, 404, etc.) as database failures
        raise
    except Exception as exc:
        try:
            db.rollback()
        except Exception as rb_err:
            logger.warning(f"Error during rollback on exception: {rb_err}")
        if engine.dialect.name != "sqlite":
            circuit_breaker.record_failure(exc)
        raise
    finally:
        try:
            db.close()
        except Exception as close_err:
            logger.debug(f"Safely ignored stale connection close exception: {close_err}")


def check_database_connection() -> dict:
    """Verifies live database connection via SELECT 1 with circuit breaker awareness."""
    circuit_metrics = circuit_breaker.get_metrics()
    if engine.dialect.name != "sqlite" and circuit_metrics["state"] == "OPEN":
        return {
            "status": "unhealthy",
            "connected": False,
            "engine": engine.dialect.name,
            "is_sqlite_fallback": engine.dialect.name == "sqlite",
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
                    "engine": engine.dialect.name,
                    "is_sqlite_fallback": engine.dialect.name == "sqlite",
                    "circuit_breaker": circuit_metrics,
                }
        return {
            "status": "unhealthy",
            "connected": False,
            "engine": engine.dialect.name,
            "is_sqlite_fallback": engine.dialect.name == "sqlite",
            "error": "Query returned no rows",
            "circuit_breaker": circuit_metrics,
        }
    except Exception as e:
        if engine.dialect.name != "sqlite":
            circuit_breaker.record_failure(e)
        logger.error(f"Local database health check failed: {e}")
        return {
            "status": "unhealthy",
            "connected": False,
            "engine": engine.dialect.name,
            "is_sqlite_fallback": engine.dialect.name == "sqlite",
            "error": str(e),
            "circuit_breaker": circuit_breaker.get_metrics(),
        }


def get_remote_postgres_status() -> dict:
    """Returns the verified status of the remote Supabase PostgreSQL connection."""
    global _remote_postgres_status
    if engine.dialect.name == "postgresql":
        return {
            "status": "healthy",
            "connected": True,
            "engine": "postgresql",
            "note": "Authoritative Supabase PostgreSQL connected directly.",
        }
    return dict(_remote_postgres_status)


def check_database_connection() -> dict:
    """Verifies live database connection via SELECT 1 with circuit breaker awareness (backward compatibility)."""
    return get_local_database_status()

get_local_database_status = check_database_connection
