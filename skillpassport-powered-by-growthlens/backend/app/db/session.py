import os
import json
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

# Register SQLite type compiler overrides so PostgreSQL types (JSONB, UUID) work natively
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"

Base = declarative_base()


def sync_cloud_supabase_to_local_sqlite(target_engine):
    """
    Pulls cloud Supabase tables over HTTPS port 443 into the local SQLite database.
    Bypasses blocked PostgreSQL direct TCP ports (5432/6543) so users have real data.
    """
    supabase_key = settings.supabase_service_role_key or settings.supabase_anon_key
    supabase_url = settings.supabase_url
    if not supabase_key or not supabase_url:
        return

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


def _init_resilient_engine():
    """
    Initializes PostgreSQL if reachable; seamlessly activates a cloud-synced local
    database if direct port 5432/IPv6 is unreachable on the current network.
    """
    is_postgres = settings.database_url.startswith("postgresql") or settings.database_url.startswith("postgres")

    if is_postgres:
        try:
            logger.info("Verifying direct PostgreSQL connection...")
            pg_engine = create_engine(
                settings.database_url,
                pool_pre_ping=settings.db_pool_pre_ping,
                pool_recycle=60,
                pool_size=min(settings.db_pool_size, 20),
                max_overflow=max(settings.db_max_overflow, 10),
                pool_timeout=max(settings.db_pool_timeout, 30.0),
                pool_reset_on_return=None,
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
            from backend.app.models.base import Base as ModelsBase
            import backend.app.models
            ModelsBase.metadata.create_all(bind=pg_engine, checkfirst=True)
            return pg_engine
        except Exception as pg_err:
            if (
                settings.app_env in ("production", "staging")
                or os.environ.get("RENDER")
                or os.environ.get("APP_ENV") in ("production", "staging")
            ):
                logger.critical(f"FATAL: Production database connection failed: {pg_err}")
                raise RuntimeError(
                    f"Production PostgreSQL connection failed: {pg_err}. "
                    "Silent SQLite fallback is disabled in production environments."
                ) from pg_err
            logger.warning(
                f"Direct PostgreSQL port 5432 / IPv6 unreachable ({pg_err}). "
                "Activating high-availability local database layer with cloud PostgREST synchronization."
            )

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
_use_fallback = (engine.dialect.name == 'sqlite')
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
                    "circuit_breaker": circuit_metrics,
                }
        return {"status": "unhealthy", "connected": False, "error": "Query returned no rows"}
    except Exception as e:
        if engine.dialect.name != "sqlite":
            circuit_breaker.record_failure(e)
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "connected": False,
            "error": f"Database connection error: {type(e).__name__}",
            "circuit_breaker": circuit_breaker.get_metrics(),
        }
