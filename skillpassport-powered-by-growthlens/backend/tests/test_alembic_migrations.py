"""
Test Alembic migration chain and schema creation in an isolated test environment.
Ensures revision 003_add_learning_assessments is discoverable, creates the table correctly,
and can be cleanly downgraded and upgraded.
"""

import os
import tempfile
import pytest
import sqlalchemy as sa
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID
from alembic import command
from alembic.config import Config
from backend.app.models.learning import (
    LearningAssessment,
    LearningAssessmentModel,
    LearningProjectSubmission,
    LearningProjectSubmissionModel,
)




# Provide SQLite-compatible compilation for PostgreSQL-specific types during test runs
@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(type_, compiler, **kw):
    return 'JSON'

@compiles(UUID, 'sqlite')
def compile_uuid_sqlite(type_, compiler, **kw):
    return 'CHAR(36)'


def test_alembic_migration_chain():
    """Verify Alembic history, head discovery, upgrade and downgrade on an isolated SQLite database."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name

    try:
        db_url = f'sqlite:///{db_path}'
        alembic_ini_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'alembic.ini')
        
        alembic_cfg = Config(alembic_ini_path)
        alembic_cfg.set_main_option('sqlalchemy.url', db_url)
        # Ensure script_location is resolved relative to backend directory
        alembic_cfg.set_main_option('script_location', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'alembic'))

        # 1. Run upgrade to head
        command.upgrade(alembic_cfg, 'head')

        engine = sa.create_engine(db_url)
        inspector = sa.inspect(engine)
        tables = inspector.get_table_names()

        assert 'learning_assessments' in tables, "learning_assessments table was not created by migrations"
        assert 'learning_roadmaps' in tables, "learning_roadmaps table was not created by migrations"
        assert 'learning_steps' in tables, "learning_steps table was not created by migrations"
        assert 'learning_project_submissions' in tables, "learning_project_submissions table was not created by migrations"

        # 2. Verify schema columns match LearningAssessment & LearningAssessmentModel exactly
        assert LearningAssessmentModel is LearningAssessment
        orm_cols = {c.name: c for c in LearningAssessmentModel.__table__.columns}
        db_cols = {c['name']: c for c in inspector.get_columns('learning_assessments')}

        for col_name in orm_cols:
            assert col_name in db_cols, f"Column {col_name} missing from migrated learning_assessments table"

        assert LearningProjectSubmissionModel is LearningProjectSubmission
        proj_orm_cols = {c.name: c for c in LearningProjectSubmissionModel.__table__.columns}
        proj_db_cols = {c['name']: c for c in inspector.get_columns('learning_project_submissions')}
        for col_name in proj_orm_cols:
            assert col_name in proj_db_cols, f"Column {col_name} missing from migrated learning_project_submissions table"

        # 3. Test downgrade -1 (downgrades 005 to 004)
        command.downgrade(alembic_cfg, '-1')
        inspector = sa.inspect(engine)
        assert 'learning_project_submissions' not in inspector.get_table_names(), "learning_project_submissions should be dropped on downgrade of 005"
        assert 'job_postings' in inspector.get_table_names(), "job_postings should still be present in 004"

        # Downgrade 004 to 003
        command.downgrade(alembic_cfg, '-1')
        inspector = sa.inspect(engine)
        assert 'job_postings' not in inspector.get_table_names(), "job_postings should be dropped on downgrade of 004"
        assert 'learning_assessments' in inspector.get_table_names(), "learning_assessments should still be present in 003"

        # Downgrade 003 to 002
        command.downgrade(alembic_cfg, '002_learning_tables')
        inspector = sa.inspect(engine)
        assert 'learning_assessments' not in inspector.get_table_names(), "learning_assessments should be dropped on downgrade to 002"

        # 4. Test re-upgrade to head
        command.upgrade(alembic_cfg, 'head')
        inspector = sa.inspect(engine)
        assert 'learning_assessments' in inspector.get_table_names(), "learning_assessments should be re-created on upgrade"
        assert 'job_postings' in inspector.get_table_names(), "job_postings should be re-created on upgrade"
        assert 'learning_project_submissions' in inspector.get_table_names(), "learning_project_submissions should be re-created on upgrade"

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
