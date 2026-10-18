from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator
from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger

logger = get_logger("db.session")

settings = get_settings()

# Engine creation with connection pooling settings and Supabase resilience
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,  # Keep connections healthy for 30 minutes instead of aggressive 60s teardown
    pool_size=15,       # Support concurrent dashboard endpoint requests without queue starvation
    max_overflow=20,
    pool_timeout=30.0,
    connect_args={
        "connect_timeout": 15,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for thread-safe database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> dict:
    """Verifies live PostgreSQL connection via SELECT 1."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1;"))
            row = result.fetchone()
            if row and row[0] == 1:
                return {"status": "healthy", "connected": True}
        return {"status": "unhealthy", "connected": False, "error": "Query returned no rows"}
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {e}")
        return {"status": "unhealthy", "connected": False, "error": str(e)}
