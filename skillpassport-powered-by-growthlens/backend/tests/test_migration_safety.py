import io
import os
import sys
import pytest
from unittest.mock import MagicMock
import sqlalchemy as sa

# Ensure repo and backend root are on sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic import command
import backend.app.models
from backend.app.models.base import Base

# Import the migration module for direct unit testing of reconciliation and downgrade guards
import importlib.util
MIG_PATH = os.path.join(BACKEND_DIR, "alembic", "versions", "002_consolidated_platform_schema.py")
spec = importlib.util.spec_from_file_location("mig_002", MIG_PATH)
mig_002 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mig_002)


def get_offline_alembic_config() -> Config:
    """Returns an Alembic config configured for offline execution without network/DB connection."""
    ini_path = os.path.join(BACKEND_DIR, "alembic.ini")
    cfg = Config(ini_path)
    # Ensure offline dummy dialect string (PostgreSQL syntax target)
    cfg.set_main_option("sqlalchemy.url", "postgresql://fake:fake@localhost:5432/fake")
    return cfg


def test_alembic_single_head_and_lineage():
    """Verify Alembic history resolves to a single linear head with no branches."""
    cfg = get_offline_alembic_config()
    orig_cwd = os.getcwd()
    try:
        os.chdir(ROOT_DIR)
        script_dir = ScriptDirectory.from_config(cfg)
        heads = script_dir.get_heads()
        assert len(heads) == 1, f"Expected single head, got: {heads}"
        assert heads[0] == "011_merge_migration_heads"

        rev = script_dir.get_revision("002_consolidated_platform_schema")
        assert rev.down_revision == "001_initial_evidence_schema"
    finally:
        os.chdir(orig_cwd)


def test_complete_model_registration():
    """Verify that all core platform tables are registered in Base.metadata."""
    table_names = list(Base.metadata.tables.keys())
    assert len(table_names) >= 39, f"Expected at least 39 tables in Base.metadata, got {len(table_names)}"
    
    # Verify core domain tables are registered
    assert "user_profiles" in table_names
    assert "work_analysis_results" in table_names
    assert "job_postings" in table_names
    assert "share_links" in table_names
    assert "recruiter_messages" in table_names


def test_offline_sql_upgrade_generation():
    """Verify that offline upgrade generates 25 CREATE TABLE statements safely."""
    cfg = get_offline_alembic_config()
    orig_cwd = os.getcwd()
    old_stdout = sys.stdout
    buffer = io.StringIO()
    try:
        os.chdir(ROOT_DIR)
        sys.stdout = buffer
        command.upgrade(cfg, "001:002_consolidated_platform_schema", sql=True)
    finally:
        sys.stdout = old_stdout
        os.chdir(orig_cwd)

    sql_out = buffer.getvalue()
    import re
    created = re.findall(r"CREATE TABLE\s+([^\s\(]+)", sql_out, re.IGNORECASE)
    assert len(created) == 25, f"Expected 25 tables in upgrade SQL, got {len(created)}"
    # Ensure zero DROP TABLE statements in upgrade
    assert "DROP TABLE" not in sql_out.upper()


def test_downgrade_is_blocked_and_irreversible():
    """Verify that downgrade is explicitly blocked with a clear RuntimeError."""
    # 1. Direct invocation guard
    with pytest.raises(RuntimeError) as exc_info:
        mig_002.downgrade()
    assert "IrreversibleMigrationError" in str(exc_info.value)
    assert "explicitly blocked" in str(exc_info.value)

    # 2. Offline command invocation guard
    cfg = get_offline_alembic_config()
    orig_cwd = os.getcwd()
    old_stdout = sys.stdout
    buffer = io.StringIO()
    try:
        os.chdir(ROOT_DIR)
        sys.stdout = buffer
        with pytest.raises(RuntimeError) as cmd_exc:
            command.downgrade(cfg, "002_consolidated_platform_schema:001", sql=True)
        assert "IrreversibleMigrationError" in str(cmd_exc.value)
    finally:
        sys.stdout = old_stdout
        os.chdir(orig_cwd)


def test_reconciliation_primary_key_mismatch_raises_error():
    """Verify that an existing table with a corrupted/mismatched primary key triggers an error."""
    mock_inspector = MagicMock()
    # Mock existing table with wrong PK
    mock_inspector.get_pk_constraint.return_value = {"constrained_columns": ["email"]}
    expected_table = Base.metadata.tables["user_profiles"]

    with pytest.raises(mig_002.SchemaReconciliationError) as exc_info:
        mig_002._validate_and_reconcile_table("user_profiles", expected_table, mock_inspector)
    assert "mismatched primary key" in str(exc_info.value)


def test_reconciliation_missing_not_null_without_default_raises_error():
    """Verify that an existing table missing a required NOT NULL column with no default halts."""
    mock_inspector = MagicMock()
    # Mock valid PK
    mock_inspector.get_pk_constraint.return_value = {"constrained_columns": ["id"]}
    # Mock columns missing 'email' (which is NOT NULL without default)
    mock_inspector.get_columns.return_value = [
        {"name": "id", "type": sa.dialects.postgresql.UUID()}
    ]
    expected_table = Base.metadata.tables["user_profiles"]

    with pytest.raises(mig_002.SchemaReconciliationError) as exc_info:
        mig_002._validate_and_reconcile_table("user_profiles", expected_table, mock_inspector)
    assert "missing required column 'email'" in str(exc_info.value)
    assert "which is NOT NULL and has no default value" in str(exc_info.value)


def test_reconciliation_incompatible_column_type_raises_error():
    """Verify that an existing table with an incompatible column type (e.g. INT vs UUID) halts."""
    mock_inspector = MagicMock()
    # Mock valid PK
    mock_inspector.get_pk_constraint.return_value = {"constrained_columns": ["id"]}
    # Mock columns with incompatible type for 'owner_user_id' (INT instead of UUID)
    mock_inspector.get_columns.return_value = [
        {"name": "id", "type": sa.dialects.postgresql.UUID()},
        {"name": "owner_user_id", "type": sa.Integer()},
    ]
    expected_table = Base.metadata.tables["ai_analysis_runs"]

    with pytest.raises(mig_002.SchemaReconciliationError) as exc_info:
        mig_002._validate_and_reconcile_table("ai_analysis_runs", expected_table, mock_inspector)
    assert "type mismatch" in str(exc_info.value)
