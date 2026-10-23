from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.app.core.config import get_settings
from backend.app.models.base import Base
# Import all models so metadata is complete
import backend.app.models

config = getattr(context, "config", None)

if config is not None and getattr(config, "config_file_name", None) is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def get_url():
    url = config.get_main_option("sqlalchemy.url") if config is not None else None
    if url:
        return url
    settings = get_settings()
    # Prefer direct_url for transactional migrations (bypasses statement-level transaction poolers)
    if settings.direct_url and settings.direct_url.strip():
        url = settings.direct_url.strip()
    else:
        url = settings.database_url

    # Prevent accidental SQLite migration when target is intended to be PostgreSQL/Supabase
    if settings.is_production_or_staging and url.startswith("sqlite"):
        raise RuntimeError(
            f"Alembic migration safety violation: SQLite database URL '{url}' is rejected in '{settings.app_env}'. "
            "Alembic migrations in production and staging must target authoritative PostgreSQL via DIRECT_URL or DATABASE_URL."
        )
    return url


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if config is not None:
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()
