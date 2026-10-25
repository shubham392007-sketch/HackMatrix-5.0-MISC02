"""
Reconcile Supabase Alembic version and safely apply missing migrations (004 and 005)
with zero data loss and no table drops.
"""
import os
import sys
from sqlalchemy import create_engine, text
import alembic.config
import alembic.command

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.dirname(backend_dir))

from backend.app.core.config import get_settings


def reconcile_and_upgrade():
    settings = get_settings()
    engine = create_engine(settings.database_url)

    print("Connecting to live database...")
    with engine.begin() as conn:
        curr = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchone()
        print("Current live alembic version:", curr)
        if curr and curr[0] == "003_add_sharing_domain":
            conn.execute(text("UPDATE alembic_version SET version_num = '003_add_learning_assessments';"))
            print("Successfully reconciled alembic_version from '003_add_sharing_domain' to '003_add_learning_assessments'.")

    # Run Alembic upgrade head
    alembic_ini = os.path.join(backend_dir, "alembic.ini")
    script_loc = os.path.join(backend_dir, "alembic")
    cfg = alembic.config.Config(alembic_ini)
    cfg.set_main_option("script_location", script_loc)

    print("Running alembic upgrade head on live database...")
    alembic.command.upgrade(cfg, "head")

    with engine.connect() as conn:
        new_ver = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchone()
        print("Updated live alembic version:", new_ver)

        # Confirm learning_project_submissions was created
        has_lps = conn.execute(text("SELECT to_regclass('public.learning_project_submissions');")).scalar()
        print("learning_project_submissions exists:", has_lps is not None)


if __name__ == "__main__":
    reconcile_and_upgrade()
