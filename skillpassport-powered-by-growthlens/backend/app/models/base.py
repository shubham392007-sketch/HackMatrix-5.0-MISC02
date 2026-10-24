from datetime import datetime, timezone
from sqlalchemy import DateTime
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import Uuid
import uuid

Base = declarative_base()

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

# Ensure SQLAlchemy Uuid type handles string UUIDs gracefully on SQLite
_orig_uuid_bind_processor = Uuid.bind_processor

def _patched_uuid_bind_processor(self, dialect):
    proc = _orig_uuid_bind_processor(self, dialect)
    if proc is None:
        return None
    def process(value):
        if isinstance(value, str):
            try:
                value = uuid.UUID(value)
            except (ValueError, TypeError, AttributeError):
                pass
        return proc(value)
    return process

Uuid.bind_processor = _patched_uuid_bind_processor


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
