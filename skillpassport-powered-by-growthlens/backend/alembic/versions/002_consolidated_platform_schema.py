"""Consolidated Platform Schema (Phase 1A.1 Remediation)

Revision ID: 002_consolidated_platform_schema
Revises: 001_initial_evidence_schema
Create Date: 2026-10-24 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002_consolidated_platform_schema'
down_revision: Union[str, None] = '001_initial_evidence_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

class SchemaReconciliationError(RuntimeError):
    """Raised when a pre-existing table cannot be safely or unambiguously reconciled."""
    pass

def _validate_and_reconcile_table(tname: str, expected_table: sa.Table, inspector) -> None:
    """
    Audits a pre-existing table against expected SQLAlchemy model metadata.
    - Validates primary key presence and matching columns.
    - Compares existing columns for fundamental type-family compatibility.
    - Safely adds missing optional or default-backed columns.
    - Halts with SchemaReconciliationError if a missing column is NOT NULL with no default,
      or if existing columns/PKs have irreconcilable conflicts.
    """
    pk_info = inspector.get_pk_constraint(tname)
    existing_pks = set(pk_info.get('constrained_columns') or [])
    expected_pks = {c.name for c in expected_table.primary_key}
    if expected_pks and existing_pks != expected_pks:
        raise SchemaReconciliationError(
            f"Table '{tname}' exists but has mismatched primary key: "
            f"existing={existing_pks} vs expected={expected_pks}. "
            "Manual resolution required to avoid data corruption."
        )

    existing_cols = {c['name']: c for c in inspector.get_columns(tname)}
    for col in expected_table.columns:
        if col.name in existing_cols:
            ex_col = existing_cols[col.name]
            ex_type = str(ex_col['type']).upper()
            exp_type = str(col.type).upper()
            if 'INT' in exp_type and 'INT' not in ex_type and 'NUMERIC' not in ex_type:
                raise SchemaReconciliationError(
                    f"Table '{tname}' column '{col.name}' type mismatch: "
                    f"existing is {ex_type}, expected {exp_type}."
                )
            if 'UUID' in exp_type and 'UUID' not in ex_type and 'CHAR' not in ex_type:
                raise SchemaReconciliationError(
                    f"Table '{tname}' column '{col.name}' type mismatch: "
                    f"existing is {ex_type}, expected {exp_type}."
                )
        else:
            has_default = (
                col.server_default is not None or 
                col.default is not None or 
                col.name in ('created_at', 'updated_at', 'retrieval_timestamp')
            )
            if not col.nullable and not has_default:
                raise SchemaReconciliationError(
                    f"Table '{tname}' is missing required column '{col.name}' ({col.type}) "
                    "which is NOT NULL and has no default value. "
                    "Automatic column addition would fail on existing rows. "
                    "Please populate this column via a forward data migration."
                )

def upgrade() -> None:
    is_offline = context.is_offline_mode()
    if is_offline:
        existing_tables = set()
        inspector = None
    else:
        bind = op.get_bind()
        inspector = sa.inspect(bind)
        existing_tables = set(inspector.get_table_names())

    # Table: user_profiles
    if 'user_profiles' not in existing_tables:
        op.create_table(
            'user_profiles',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('email', sa.String(255), nullable=False),
            sa.Column('display_name', sa.String(255), nullable=True),
            sa.Column('preferred_name', sa.String(255), nullable=True),
            sa.Column('headline', sa.String(255), nullable=True),
            sa.Column('current_role', sa.String(100), nullable=False, server_default='employee'),
            sa.Column('job_title', sa.String(255), nullable=True),
            sa.Column('specialization', sa.String(255), nullable=True),
            sa.Column('department_or_team', sa.String(255), nullable=True),
            sa.Column('location', sa.String(255), nullable=True),
            sa.Column('work_preference', sa.String(50), nullable=True),
            sa.Column('experience_level', sa.String(100), nullable=True),
            sa.Column('professional_goal', sa.String(), nullable=True),
            sa.Column('professional_summary', sa.String(), nullable=True),
            sa.Column('portfolio_url', sa.String(512), nullable=True),
            sa.Column('linkedin_url', sa.String(512), nullable=True),
            sa.Column('github_url', sa.String(512), nullable=True),
            sa.Column('privacy_preferences', postgresql.JSONB(), nullable=True),
            sa.Column('app_settings', postgresql.JSONB(), nullable=True),
            sa.Column('onboarding_status', sa.String(50), nullable=False, server_default='not_started'),
            sa.Column('onboarding_current_step', sa.Integer(), nullable=False, server_default=sa.text('1')),
            sa.Column('onboarding_current_category', sa.String(50), nullable=False, server_default='resume'),
            sa.Column('github_skipped', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('jira_skipped', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_user_profiles_email', 'user_profiles', ['email'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('user_profiles', Base.metadata.tables['user_profiles'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('user_profiles')}
        if 'email' not in existing_cols:
            op.add_column('user_profiles', sa.Column('email', sa.String(255), nullable=False))
        if 'display_name' not in existing_cols:
            op.add_column('user_profiles', sa.Column('display_name', sa.String(255), nullable=True))
        if 'preferred_name' not in existing_cols:
            op.add_column('user_profiles', sa.Column('preferred_name', sa.String(255), nullable=True))
        if 'headline' not in existing_cols:
            op.add_column('user_profiles', sa.Column('headline', sa.String(255), nullable=True))
        if 'current_role' not in existing_cols:
            op.add_column('user_profiles', sa.Column('current_role', sa.String(100), nullable=False, server_default='employee'))
        if 'job_title' not in existing_cols:
            op.add_column('user_profiles', sa.Column('job_title', sa.String(255), nullable=True))
        if 'specialization' not in existing_cols:
            op.add_column('user_profiles', sa.Column('specialization', sa.String(255), nullable=True))
        if 'department_or_team' not in existing_cols:
            op.add_column('user_profiles', sa.Column('department_or_team', sa.String(255), nullable=True))
        if 'location' not in existing_cols:
            op.add_column('user_profiles', sa.Column('location', sa.String(255), nullable=True))
        if 'work_preference' not in existing_cols:
            op.add_column('user_profiles', sa.Column('work_preference', sa.String(50), nullable=True))
        if 'experience_level' not in existing_cols:
            op.add_column('user_profiles', sa.Column('experience_level', sa.String(100), nullable=True))
        if 'professional_goal' not in existing_cols:
            op.add_column('user_profiles', sa.Column('professional_goal', sa.String(), nullable=True))
        if 'professional_summary' not in existing_cols:
            op.add_column('user_profiles', sa.Column('professional_summary', sa.String(), nullable=True))
        if 'portfolio_url' not in existing_cols:
            op.add_column('user_profiles', sa.Column('portfolio_url', sa.String(512), nullable=True))
        if 'linkedin_url' not in existing_cols:
            op.add_column('user_profiles', sa.Column('linkedin_url', sa.String(512), nullable=True))
        if 'github_url' not in existing_cols:
            op.add_column('user_profiles', sa.Column('github_url', sa.String(512), nullable=True))
        if 'privacy_preferences' not in existing_cols:
            op.add_column('user_profiles', sa.Column('privacy_preferences', postgresql.JSONB(), nullable=True))
        if 'app_settings' not in existing_cols:
            op.add_column('user_profiles', sa.Column('app_settings', postgresql.JSONB(), nullable=True))
        if 'onboarding_status' not in existing_cols:
            op.add_column('user_profiles', sa.Column('onboarding_status', sa.String(50), nullable=False, server_default='not_started'))
        if 'onboarding_current_step' not in existing_cols:
            op.add_column('user_profiles', sa.Column('onboarding_current_step', sa.Integer(), nullable=False, server_default=sa.text('1')))
        if 'onboarding_current_category' not in existing_cols:
            op.add_column('user_profiles', sa.Column('onboarding_current_category', sa.String(50), nullable=False, server_default='resume'))
        if 'github_skipped' not in existing_cols:
            op.add_column('user_profiles', sa.Column('github_skipped', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        if 'jira_skipped' not in existing_cols:
            op.add_column('user_profiles', sa.Column('jira_skipped', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        if 'onboarding_completed_at' not in existing_cols:
            op.add_column('user_profiles', sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('user_profiles', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('user_profiles', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('user_profiles')}
        if 'ix_user_profiles_email' not in existing_idxs:
            op.create_index('ix_user_profiles_email', 'user_profiles', ['email'])

    # Table: ai_analysis_runs
    if 'ai_analysis_runs' not in existing_tables:
        op.create_table(
            'ai_analysis_runs',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('input_evidence_ids', postgresql.JSONB(), nullable=False),
            sa.Column('content_hash', sa.String(64), nullable=False, server_default=''),
            sa.Column('analysis_type', sa.String(50), nullable=False, server_default='work_analysis'),
            sa.Column('status', sa.String(50), nullable=False, server_default='queued'),
            sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('model_name', sa.String(100), nullable=False, server_default='qwen3:8b'),
            sa.Column('prompt_version', sa.String(50), nullable=False, server_default='v1.0'),
            sa.Column('schema_version', sa.String(50), nullable=False, server_default='v1.0'),
            sa.Column('validator_version', sa.String(50), nullable=False, server_default='v1.0'),
            sa.Column('processing_warnings', postgresql.JSONB(), nullable=False),
            sa.Column('error_details', sa.String(), nullable=True),
            sa.Column('output_record_refs', postgresql.JSONB(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('idx_ai_run_owner_status', 'ai_analysis_runs', ['owner_user_id', 'status'])
        op.create_index('ix_ai_analysis_runs_owner_user_id', 'ai_analysis_runs', ['owner_user_id'])
        op.create_index('idx_ai_run_created', 'ai_analysis_runs', ['created_at'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('ai_analysis_runs', Base.metadata.tables['ai_analysis_runs'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('ai_analysis_runs')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'input_evidence_ids' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('input_evidence_ids', postgresql.JSONB(), nullable=False))
        if 'content_hash' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('content_hash', sa.String(64), nullable=False, server_default=''))
        if 'analysis_type' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('analysis_type', sa.String(50), nullable=False, server_default='work_analysis'))
        if 'status' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('status', sa.String(50), nullable=False, server_default='queued'))
        if 'started_at' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('started_at', sa.DateTime(timezone=True), nullable=False))
        if 'completed_at' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
        if 'model_name' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('model_name', sa.String(100), nullable=False, server_default='qwen3:8b'))
        if 'prompt_version' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('prompt_version', sa.String(50), nullable=False, server_default='v1.0'))
        if 'schema_version' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('schema_version', sa.String(50), nullable=False, server_default='v1.0'))
        if 'validator_version' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('validator_version', sa.String(50), nullable=False, server_default='v1.0'))
        if 'processing_warnings' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('processing_warnings', postgresql.JSONB(), nullable=False))
        if 'error_details' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('error_details', sa.String(), nullable=True))
        if 'output_record_refs' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('output_record_refs', postgresql.JSONB(), nullable=False))
        if 'created_at' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('ai_analysis_runs', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('ai_analysis_runs')}
        if 'idx_ai_run_owner_status' not in existing_idxs:
            op.create_index('idx_ai_run_owner_status', 'ai_analysis_runs', ['owner_user_id', 'status'])
        if 'ix_ai_analysis_runs_owner_user_id' not in existing_idxs:
            op.create_index('ix_ai_analysis_runs_owner_user_id', 'ai_analysis_runs', ['owner_user_id'])
        if 'idx_ai_run_created' not in existing_idxs:
            op.create_index('idx_ai_run_created', 'ai_analysis_runs', ['created_at'])

    # Table: ai_evaluation_suite_runs
    if 'ai_evaluation_suite_runs' not in existing_tables:
        op.create_table(
            'ai_evaluation_suite_runs',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('suite_name', sa.String(150), nullable=False),
            sa.Column('suite_version', sa.String(50), nullable=False, server_default='v1.0'),
            sa.Column('total_tests', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('passed_tests', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('failed_tests', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('pass_rate', sa.Float(), nullable=False, server_default=sa.text('1.0')),
            sa.Column('results', postgresql.JSONB(), nullable=False),
            sa.Column('initiated_by', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('ai_evaluation_suite_runs', Base.metadata.tables['ai_evaluation_suite_runs'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('ai_evaluation_suite_runs')}
        if 'suite_name' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('suite_name', sa.String(150), nullable=False))
        if 'suite_version' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('suite_version', sa.String(50), nullable=False, server_default='v1.0'))
        if 'total_tests' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('total_tests', sa.Integer(), nullable=False, server_default=sa.text('0')))
        if 'passed_tests' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('passed_tests', sa.Integer(), nullable=False, server_default=sa.text('0')))
        if 'failed_tests' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('failed_tests', sa.Integer(), nullable=False, server_default=sa.text('0')))
        if 'pass_rate' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('pass_rate', sa.Float(), nullable=False, server_default=sa.text('1.0')))
        if 'results' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('results', postgresql.JSONB(), nullable=False))
        if 'initiated_by' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('initiated_by', postgresql.UUID(as_uuid=True), nullable=False))
        if 'created_at' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('ai_evaluation_suite_runs', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('ai_evaluation_suite_runs')}

    # Table: output_validation_runs
    if 'output_validation_runs' not in existing_tables:
        op.create_table(
            'output_validation_runs',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('target_type', sa.String(50), nullable=False, server_default='work_analysis'),
            sa.Column('schema_valid', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('missing_fields', postgresql.JSONB(), nullable=False),
            sa.Column('invalid_references', postgresql.JSONB(), nullable=False),
            sa.Column('semantic_valid', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('error_messages', postgresql.JSONB(), nullable=False),
            sa.Column('retry_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('final_status', sa.String(50), nullable=False, server_default='valid'),
            sa.Column('validator_version', sa.String(50), nullable=False, server_default='v1.0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['run_id'], ['ai_analysis_runs.id'], ondelete='SET NULL'),
        )
        op.create_index('idx_val_owner_status', 'output_validation_runs', ['owner_user_id', 'final_status'])
        op.create_index('ix_output_validation_runs_owner_user_id', 'output_validation_runs', ['owner_user_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('output_validation_runs', Base.metadata.tables['output_validation_runs'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('output_validation_runs')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'run_id' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'target_type' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('target_type', sa.String(50), nullable=False, server_default='work_analysis'))
        if 'schema_valid' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('schema_valid', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        if 'missing_fields' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('missing_fields', postgresql.JSONB(), nullable=False))
        if 'invalid_references' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('invalid_references', postgresql.JSONB(), nullable=False))
        if 'semantic_valid' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('semantic_valid', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        if 'error_messages' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('error_messages', postgresql.JSONB(), nullable=False))
        if 'retry_count' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('retry_count', sa.Integer(), nullable=False, server_default=sa.text('0')))
        if 'final_status' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('final_status', sa.String(50), nullable=False, server_default='valid'))
        if 'validator_version' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('validator_version', sa.String(50), nullable=False, server_default='v1.0'))
        if 'created_at' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('output_validation_runs', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('output_validation_runs')}
        if 'idx_val_owner_status' not in existing_idxs:
            op.create_index('idx_val_owner_status', 'output_validation_runs', ['owner_user_id', 'final_status'])
        if 'ix_output_validation_runs_owner_user_id' not in existing_idxs:
            op.create_index('ix_output_validation_runs_owner_user_id', 'output_validation_runs', ['owner_user_id'])

    # Table: work_analysis_results
    if 'work_analysis_results' not in existing_tables:
        op.create_table(
            'work_analysis_results',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('observed_facts', postgresql.JSONB(), nullable=False),
            sa.Column('claimed_information', postgresql.JSONB(), nullable=False),
            sa.Column('inferred_attributes', postgresql.JSONB(), nullable=False),
            sa.Column('technical_tasks', postgresql.JSONB(), nullable=False),
            sa.Column('technologies', postgresql.JSONB(), nullable=False),
            sa.Column('uncertainty_flags', postgresql.JSONB(), nullable=False),
            sa.Column('confidence_score', sa.Float(), nullable=False, server_default=sa.text('0.85')),
            sa.Column('summary', sa.String(), nullable=False, server_default=''),
            sa.Column('role_identified', sa.String(100), nullable=False, server_default='Contributor'),
            sa.Column('analysis_method', sa.String(50), nullable=False, server_default='ollama'),
            sa.Column('model_name', sa.String(100), nullable=True),
            sa.Column('model_version', sa.String(50), nullable=True),
            sa.Column('fallback_used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('fallback_reason', sa.String(100), nullable=True),
            sa.Column('analysis_status', sa.String(50), nullable=False, server_default='completed'),
            sa.Column('validation_status', sa.String(50), nullable=False, server_default='valid'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['evidence_id'], ['evidence_items.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['run_id'], ['ai_analysis_runs.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_work_analysis_results_owner_user_id', 'work_analysis_results', ['owner_user_id'])
        op.create_index('idx_work_analysis_owner_ev', 'work_analysis_results', ['owner_user_id', 'evidence_id'])
        op.create_index('ix_work_analysis_results_evidence_id', 'work_analysis_results', ['evidence_id'])
        op.create_index('ix_work_analysis_results_run_id', 'work_analysis_results', ['run_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('work_analysis_results', Base.metadata.tables['work_analysis_results'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('work_analysis_results')}
        if 'run_id' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('run_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'owner_user_id' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'evidence_id' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'observed_facts' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('observed_facts', postgresql.JSONB(), nullable=False))
        if 'claimed_information' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('claimed_information', postgresql.JSONB(), nullable=False))
        if 'inferred_attributes' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('inferred_attributes', postgresql.JSONB(), nullable=False))
        if 'technical_tasks' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('technical_tasks', postgresql.JSONB(), nullable=False))
        if 'technologies' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('technologies', postgresql.JSONB(), nullable=False))
        if 'uncertainty_flags' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('uncertainty_flags', postgresql.JSONB(), nullable=False))
        if 'confidence_score' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('confidence_score', sa.Float(), nullable=False, server_default=sa.text('0.85')))
        if 'summary' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('summary', sa.String(), nullable=False, server_default=''))
        if 'role_identified' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('role_identified', sa.String(100), nullable=False, server_default='Contributor'))
        if 'analysis_method' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('analysis_method', sa.String(50), nullable=False, server_default='ollama'))
        if 'model_name' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('model_name', sa.String(100), nullable=True))
        if 'model_version' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('model_version', sa.String(50), nullable=True))
        if 'fallback_used' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('fallback_used', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        if 'fallback_reason' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('fallback_reason', sa.String(100), nullable=True))
        if 'analysis_status' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('analysis_status', sa.String(50), nullable=False, server_default='completed'))
        if 'validation_status' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('validation_status', sa.String(50), nullable=False, server_default='valid'))
        if 'created_at' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('work_analysis_results', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('work_analysis_results')}
        if 'ix_work_analysis_results_owner_user_id' not in existing_idxs:
            op.create_index('ix_work_analysis_results_owner_user_id', 'work_analysis_results', ['owner_user_id'])
        if 'idx_work_analysis_owner_ev' not in existing_idxs:
            op.create_index('idx_work_analysis_owner_ev', 'work_analysis_results', ['owner_user_id', 'evidence_id'])
        if 'ix_work_analysis_results_evidence_id' not in existing_idxs:
            op.create_index('ix_work_analysis_results_evidence_id', 'work_analysis_results', ['evidence_id'])
        if 'ix_work_analysis_results_run_id' not in existing_idxs:
            op.create_index('ix_work_analysis_results_run_id', 'work_analysis_results', ['run_id'])

    # Table: evidence_quality_assessments
    if 'evidence_quality_assessments' not in existing_tables:
        op.create_table(
            'evidence_quality_assessments',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('candidate_skill_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('quality_score', sa.Float(), nullable=False, server_default=sa.text('0.8')),
            sa.Column('quality_band', sa.String(50), nullable=False, server_default='medium'),
            sa.Column('factors', postgresql.JSONB(), nullable=False),
            sa.Column('explanation', sa.String(), nullable=False, server_default=''),
            sa.Column('calculation_version', sa.String(50), nullable=False, server_default='v1.0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['evidence_id'], ['evidence_items.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_evidence_quality_assessments_owner_user_id', 'evidence_quality_assessments', ['owner_user_id'])
        op.create_index('ix_evidence_quality_assessments_evidence_id', 'evidence_quality_assessments', ['evidence_id'])
        op.create_index('idx_quality_owner_ev', 'evidence_quality_assessments', ['owner_user_id', 'evidence_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('evidence_quality_assessments', Base.metadata.tables['evidence_quality_assessments'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('evidence_quality_assessments')}
        if 'evidence_id' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'candidate_skill_id' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('candidate_skill_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'owner_user_id' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'quality_score' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('quality_score', sa.Float(), nullable=False, server_default=sa.text('0.8')))
        if 'quality_band' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('quality_band', sa.String(50), nullable=False, server_default='medium'))
        if 'factors' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('factors', postgresql.JSONB(), nullable=False))
        if 'explanation' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('explanation', sa.String(), nullable=False, server_default=''))
        if 'calculation_version' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('calculation_version', sa.String(50), nullable=False, server_default='v1.0'))
        if 'created_at' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('evidence_quality_assessments', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('evidence_quality_assessments')}
        if 'ix_evidence_quality_assessments_owner_user_id' not in existing_idxs:
            op.create_index('ix_evidence_quality_assessments_owner_user_id', 'evidence_quality_assessments', ['owner_user_id'])
        if 'ix_evidence_quality_assessments_evidence_id' not in existing_idxs:
            op.create_index('ix_evidence_quality_assessments_evidence_id', 'evidence_quality_assessments', ['evidence_id'])
        if 'idx_quality_owner_ev' not in existing_idxs:
            op.create_index('idx_quality_owner_ev', 'evidence_quality_assessments', ['owner_user_id', 'evidence_id'])

    # Table: prompt_injection_findings
    if 'prompt_injection_findings' not in existing_tables:
        op.create_table(
            'prompt_injection_findings',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('source_type', sa.String(50), nullable=False, server_default='document'),
            sa.Column('risk_level', sa.String(50), nullable=False, server_default='medium'),
            sa.Column('detected_pattern', sa.String(150), nullable=False),
            sa.Column('quarantined_excerpt', sa.String(), nullable=False),
            sa.Column('handling_outcome', sa.String(50), nullable=False, server_default='quarantined'),
            sa.Column('action_taken', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['evidence_id'], ['evidence_items.id'], ondelete='CASCADE'),
        )
        op.create_index('idx_injection_owner_risk', 'prompt_injection_findings', ['owner_user_id', 'risk_level'])
        op.create_index('ix_prompt_injection_findings_owner_user_id', 'prompt_injection_findings', ['owner_user_id'])
        op.create_index('ix_prompt_injection_findings_evidence_id', 'prompt_injection_findings', ['evidence_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('prompt_injection_findings', Base.metadata.tables['prompt_injection_findings'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('prompt_injection_findings')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'evidence_id' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'source_type' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('source_type', sa.String(50), nullable=False, server_default='document'))
        if 'risk_level' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('risk_level', sa.String(50), nullable=False, server_default='medium'))
        if 'detected_pattern' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('detected_pattern', sa.String(150), nullable=False))
        if 'quarantined_excerpt' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('quarantined_excerpt', sa.String(), nullable=False))
        if 'handling_outcome' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('handling_outcome', sa.String(50), nullable=False, server_default='quarantined'))
        if 'action_taken' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('action_taken', sa.String(), nullable=False))
        if 'created_at' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('prompt_injection_findings', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('prompt_injection_findings')}
        if 'idx_injection_owner_risk' not in existing_idxs:
            op.create_index('idx_injection_owner_risk', 'prompt_injection_findings', ['owner_user_id', 'risk_level'])
        if 'ix_prompt_injection_findings_owner_user_id' not in existing_idxs:
            op.create_index('ix_prompt_injection_findings_owner_user_id', 'prompt_injection_findings', ['owner_user_id'])
        if 'ix_prompt_injection_findings_evidence_id' not in existing_idxs:
            op.create_index('ix_prompt_injection_findings_evidence_id', 'prompt_injection_findings', ['evidence_id'])

    # Table: evidence_conflicts
    if 'evidence_conflicts' not in existing_tables:
        op.create_table(
            'evidence_conflicts',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('evidence_a_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('evidence_b_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('candidate_skill_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('conflict_field', sa.String(100), nullable=False),
            sa.Column('evidence_a_assertion', sa.String(), nullable=False),
            sa.Column('evidence_b_assertion', sa.String(), nullable=False),
            sa.Column('explanation', sa.String(), nullable=False),
            sa.Column('suggested_resolution', sa.String(), nullable=False, server_default=''),
            sa.Column('status', sa.String(50), nullable=False, server_default='open'),
            sa.Column('resolution_decision', sa.String(50), nullable=True),
            sa.Column('resolution_notes', sa.String(), nullable=True),
            sa.Column('reviewer_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['evidence_a_id'], ['evidence_items.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['evidence_b_id'], ['evidence_items.id'], ondelete='CASCADE'),
        )
        op.create_index('idx_conflict_owner_status', 'evidence_conflicts', ['owner_user_id', 'status'])
        op.create_index('ix_evidence_conflicts_evidence_a_id', 'evidence_conflicts', ['evidence_a_id'])
        op.create_index('ix_evidence_conflicts_evidence_b_id', 'evidence_conflicts', ['evidence_b_id'])
        op.create_index('ix_evidence_conflicts_owner_user_id', 'evidence_conflicts', ['owner_user_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('evidence_conflicts', Base.metadata.tables['evidence_conflicts'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('evidence_conflicts')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'evidence_a_id' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('evidence_a_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'evidence_b_id' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('evidence_b_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'candidate_skill_id' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('candidate_skill_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'conflict_field' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('conflict_field', sa.String(100), nullable=False))
        if 'evidence_a_assertion' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('evidence_a_assertion', sa.String(), nullable=False))
        if 'evidence_b_assertion' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('evidence_b_assertion', sa.String(), nullable=False))
        if 'explanation' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('explanation', sa.String(), nullable=False))
        if 'suggested_resolution' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('suggested_resolution', sa.String(), nullable=False, server_default=''))
        if 'status' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('status', sa.String(50), nullable=False, server_default='open'))
        if 'resolution_decision' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('resolution_decision', sa.String(50), nullable=True))
        if 'resolution_notes' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('resolution_notes', sa.String(), nullable=True))
        if 'reviewer_id' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('reviewer_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'resolved_at' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('evidence_conflicts', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('evidence_conflicts')}
        if 'idx_conflict_owner_status' not in existing_idxs:
            op.create_index('idx_conflict_owner_status', 'evidence_conflicts', ['owner_user_id', 'status'])
        if 'ix_evidence_conflicts_evidence_a_id' not in existing_idxs:
            op.create_index('ix_evidence_conflicts_evidence_a_id', 'evidence_conflicts', ['evidence_a_id'])
        if 'ix_evidence_conflicts_evidence_b_id' not in existing_idxs:
            op.create_index('ix_evidence_conflicts_evidence_b_id', 'evidence_conflicts', ['evidence_b_id'])
        if 'ix_evidence_conflicts_owner_user_id' not in existing_idxs:
            op.create_index('ix_evidence_conflicts_owner_user_id', 'evidence_conflicts', ['owner_user_id'])

    # Table: verification_decisions
    if 'verification_decisions' not in existing_tables:
        op.create_table(
            'verification_decisions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('candidate_mapping_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('competency_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('reviewer_user_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('verification_state', sa.String(50), nullable=False, server_default='candidate'),
            sa.Column('decision_rationale', sa.String(), nullable=False),
            sa.Column('rule_version', sa.String(50), nullable=False, server_default='policy-v2026.1'),
            sa.Column('supporting_evidence_ids', postgresql.JSONB(), nullable=False),
            sa.Column('conflict_ids', postgresql.JSONB(), nullable=False),
            sa.Column('superseded_decision_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['candidate_mapping_id'], ['evidence_competency_mappings.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['competency_id'], ['competency_taxonomy.id'], ondelete='CASCADE'),
        )
        op.create_index('idx_verif_owner_state', 'verification_decisions', ['owner_user_id', 'verification_state'])
        op.create_index('ix_verification_decisions_competency_id', 'verification_decisions', ['competency_id'])
        op.create_index('ix_verification_decisions_candidate_mapping_id', 'verification_decisions', ['candidate_mapping_id'])
        op.create_index('ix_verification_decisions_owner_user_id', 'verification_decisions', ['owner_user_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('verification_decisions', Base.metadata.tables['verification_decisions'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('verification_decisions')}
        if 'candidate_mapping_id' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('candidate_mapping_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'competency_id' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('competency_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'owner_user_id' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'reviewer_user_id' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('reviewer_user_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'verification_state' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('verification_state', sa.String(50), nullable=False, server_default='candidate'))
        if 'decision_rationale' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('decision_rationale', sa.String(), nullable=False))
        if 'rule_version' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('rule_version', sa.String(50), nullable=False, server_default='policy-v2026.1'))
        if 'supporting_evidence_ids' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('supporting_evidence_ids', postgresql.JSONB(), nullable=False))
        if 'conflict_ids' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('conflict_ids', postgresql.JSONB(), nullable=False))
        if 'superseded_decision_id' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('superseded_decision_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('verification_decisions', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('verification_decisions')}
        if 'idx_verif_owner_state' not in existing_idxs:
            op.create_index('idx_verif_owner_state', 'verification_decisions', ['owner_user_id', 'verification_state'])
        if 'ix_verification_decisions_competency_id' not in existing_idxs:
            op.create_index('ix_verification_decisions_competency_id', 'verification_decisions', ['competency_id'])
        if 'ix_verification_decisions_candidate_mapping_id' not in existing_idxs:
            op.create_index('ix_verification_decisions_candidate_mapping_id', 'verification_decisions', ['candidate_mapping_id'])
        if 'ix_verification_decisions_owner_user_id' not in existing_idxs:
            op.create_index('ix_verification_decisions_owner_user_id', 'verification_decisions', ['owner_user_id'])

    # Table: hallucination_guard_results
    if 'hallucination_guard_results' not in existing_tables:
        op.create_table(
            'hallucination_guard_results',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('analysis_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('candidate_mapping_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('claim_text', sa.String(), nullable=False),
            sa.Column('citation_validation', sa.String(50), nullable=False, server_default='pass'),
            sa.Column('citation_verbatim_found', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('ownership_check', sa.String(50), nullable=False, server_default='pass'),
            sa.Column('semantic_support_score', sa.Float(), nullable=False, server_default=sa.text('1.0')),
            sa.Column('contradiction_check', sa.String(50), nullable=False, server_default='none'),
            sa.Column('guard_outcome', sa.String(50), nullable=False, server_default='PASS'),
            sa.Column('reason_codes', postgresql.JSONB(), nullable=False),
            sa.Column('guard_version', sa.String(50), nullable=False, server_default='v1.0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['analysis_id'], ['work_analysis_results.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['candidate_mapping_id'], ['evidence_competency_mappings.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['evidence_id'], ['evidence_items.id'], ondelete='CASCADE'),
        )
        op.create_index('idx_guard_owner_outcome', 'hallucination_guard_results', ['owner_user_id', 'guard_outcome'])
        op.create_index('ix_hallucination_guard_results_owner_user_id', 'hallucination_guard_results', ['owner_user_id'])
        op.create_index('ix_hallucination_guard_results_evidence_id', 'hallucination_guard_results', ['evidence_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('hallucination_guard_results', Base.metadata.tables['hallucination_guard_results'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('hallucination_guard_results')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'analysis_id' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('analysis_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'candidate_mapping_id' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('candidate_mapping_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'evidence_id' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'claim_text' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('claim_text', sa.String(), nullable=False))
        if 'citation_validation' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('citation_validation', sa.String(50), nullable=False, server_default='pass'))
        if 'citation_verbatim_found' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('citation_verbatim_found', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        if 'ownership_check' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('ownership_check', sa.String(50), nullable=False, server_default='pass'))
        if 'semantic_support_score' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('semantic_support_score', sa.Float(), nullable=False, server_default=sa.text('1.0')))
        if 'contradiction_check' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('contradiction_check', sa.String(50), nullable=False, server_default='none'))
        if 'guard_outcome' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('guard_outcome', sa.String(50), nullable=False, server_default='PASS'))
        if 'reason_codes' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('reason_codes', postgresql.JSONB(), nullable=False))
        if 'guard_version' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('guard_version', sa.String(50), nullable=False, server_default='v1.0'))
        if 'created_at' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('hallucination_guard_results', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('hallucination_guard_results')}
        if 'idx_guard_owner_outcome' not in existing_idxs:
            op.create_index('idx_guard_owner_outcome', 'hallucination_guard_results', ['owner_user_id', 'guard_outcome'])
        if 'ix_hallucination_guard_results_owner_user_id' not in existing_idxs:
            op.create_index('ix_hallucination_guard_results_owner_user_id', 'hallucination_guard_results', ['owner_user_id'])
        if 'ix_hallucination_guard_results_evidence_id' not in existing_idxs:
            op.create_index('ix_hallucination_guard_results_evidence_id', 'hallucination_guard_results', ['evidence_id'])

    # Table: human_review_tasks
    if 'human_review_tasks' not in existing_tables:
        op.create_table(
            'human_review_tasks',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('task_type', sa.String(50), nullable=False),
            sa.Column('priority', sa.String(50), nullable=False, server_default='medium'),
            sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('description', sa.String(), nullable=False),
            sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('candidate_mapping_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('conflict_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('reviewer_action', sa.String(50), nullable=True),
            sa.Column('reviewer_notes', sa.String(), nullable=True),
            sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['conflict_id'], ['evidence_conflicts.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['evidence_id'], ['evidence_items.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['candidate_mapping_id'], ['evidence_competency_mappings.id'], ondelete='SET NULL'),
        )
        op.create_index('idx_review_task_owner_status', 'human_review_tasks', ['owner_user_id', 'status'])
        op.create_index('ix_human_review_tasks_owner_user_id', 'human_review_tasks', ['owner_user_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('human_review_tasks', Base.metadata.tables['human_review_tasks'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('human_review_tasks')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'task_type' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('task_type', sa.String(50), nullable=False))
        if 'priority' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('priority', sa.String(50), nullable=False, server_default='medium'))
        if 'status' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('status', sa.String(50), nullable=False, server_default='pending'))
        if 'title' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('title', sa.String(255), nullable=False))
        if 'description' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('description', sa.String(), nullable=False))
        if 'evidence_id' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'candidate_mapping_id' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('candidate_mapping_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'conflict_id' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('conflict_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'assigned_to' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True))
        if 'reviewer_action' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('reviewer_action', sa.String(50), nullable=True))
        if 'reviewer_notes' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('reviewer_notes', sa.String(), nullable=True))
        if 'reviewed_at' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('human_review_tasks', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('human_review_tasks')}
        if 'idx_review_task_owner_status' not in existing_idxs:
            op.create_index('idx_review_task_owner_status', 'human_review_tasks', ['owner_user_id', 'status'])
        if 'ix_human_review_tasks_owner_user_id' not in existing_idxs:
            op.create_index('ix_human_review_tasks_owner_user_id', 'human_review_tasks', ['owner_user_id'])

    # Table: repository_language_snapshots
    if 'repository_language_snapshots' not in existing_tables:
        op.create_table(
            'repository_language_snapshots',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('selected_resource_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('github_repo_id', sa.String(100), nullable=True),
            sa.Column('repo_full_name', sa.String(255), nullable=False),
            sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('sync_run_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('total_bytes', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('retrieval_timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('sync_status', sa.String(50), nullable=False, server_default='success'),
            sa.Column('error_summary', sa.String(), nullable=True),
            sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['sync_run_id'], ['source_sync_runs.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['selected_resource_id'], ['selected_resources.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['connection_id'], ['connected_sources.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_repository_language_snapshots_connection_id', 'repository_language_snapshots', ['connection_id'])
        op.create_index('ix_repository_language_snapshots_sync_run_id', 'repository_language_snapshots', ['sync_run_id'])
        op.create_index('idx_repo_lang_current', 'repository_language_snapshots', ['selected_resource_id', 'is_current'])
        op.create_index('ix_repository_language_snapshots_selected_resource_id', 'repository_language_snapshots', ['selected_resource_id'])
        op.create_index('ix_repository_language_snapshots_owner_user_id', 'repository_language_snapshots', ['owner_user_id'])
        op.create_index('idx_repo_lang_owner_repo', 'repository_language_snapshots', ['owner_user_id', 'repo_full_name'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('repository_language_snapshots', Base.metadata.tables['repository_language_snapshots'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('repository_language_snapshots')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'selected_resource_id' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('selected_resource_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'github_repo_id' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('github_repo_id', sa.String(100), nullable=True))
        if 'repo_full_name' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('repo_full_name', sa.String(255), nullable=False))
        if 'connection_id' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'sync_run_id' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('sync_run_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'total_bytes' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('total_bytes', sa.Integer(), nullable=False, server_default=sa.text('0')))
        if 'retrieval_timestamp' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('retrieval_timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'sync_status' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('sync_status', sa.String(50), nullable=False, server_default='success'))
        if 'error_summary' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('error_summary', sa.String(), nullable=True))
        if 'is_current' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        if 'created_at' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('repository_language_snapshots', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('repository_language_snapshots')}
        if 'ix_repository_language_snapshots_connection_id' not in existing_idxs:
            op.create_index('ix_repository_language_snapshots_connection_id', 'repository_language_snapshots', ['connection_id'])
        if 'ix_repository_language_snapshots_sync_run_id' not in existing_idxs:
            op.create_index('ix_repository_language_snapshots_sync_run_id', 'repository_language_snapshots', ['sync_run_id'])
        if 'idx_repo_lang_current' not in existing_idxs:
            op.create_index('idx_repo_lang_current', 'repository_language_snapshots', ['selected_resource_id', 'is_current'])
        if 'ix_repository_language_snapshots_selected_resource_id' not in existing_idxs:
            op.create_index('ix_repository_language_snapshots_selected_resource_id', 'repository_language_snapshots', ['selected_resource_id'])
        if 'ix_repository_language_snapshots_owner_user_id' not in existing_idxs:
            op.create_index('ix_repository_language_snapshots_owner_user_id', 'repository_language_snapshots', ['owner_user_id'])
        if 'idx_repo_lang_owner_repo' not in existing_idxs:
            op.create_index('idx_repo_lang_owner_repo', 'repository_language_snapshots', ['owner_user_id', 'repo_full_name'])

    # Table: repository_language_breakdowns
    if 'repository_language_breakdowns' not in existing_tables:
        op.create_table(
            'repository_language_breakdowns',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('snapshot_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('language_name', sa.String(100), nullable=False),
            sa.Column('byte_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('percentage', sa.Float(), nullable=False, server_default=sa.text('0.0')),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['snapshot_id'], ['repository_language_snapshots.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('snapshot_id', 'language_name', name='uq_snapshot_language'),
        )
        op.create_index('ix_repository_language_breakdowns_snapshot_id', 'repository_language_breakdowns', ['snapshot_id'])
        op.create_index('idx_breakdown_language', 'repository_language_breakdowns', ['language_name'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('repository_language_breakdowns', Base.metadata.tables['repository_language_breakdowns'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('repository_language_breakdowns')}
        if 'snapshot_id' not in existing_cols:
            op.add_column('repository_language_breakdowns', sa.Column('snapshot_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'language_name' not in existing_cols:
            op.add_column('repository_language_breakdowns', sa.Column('language_name', sa.String(100), nullable=False))
        if 'byte_count' not in existing_cols:
            op.add_column('repository_language_breakdowns', sa.Column('byte_count', sa.Integer(), nullable=False, server_default=sa.text('0')))
        if 'percentage' not in existing_cols:
            op.add_column('repository_language_breakdowns', sa.Column('percentage', sa.Float(), nullable=False, server_default=sa.text('0.0')))
        if 'created_at' not in existing_cols:
            op.add_column('repository_language_breakdowns', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('repository_language_breakdowns', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('repository_language_breakdowns')}
        if 'ix_repository_language_breakdowns_snapshot_id' not in existing_idxs:
            op.create_index('ix_repository_language_breakdowns_snapshot_id', 'repository_language_breakdowns', ['snapshot_id'])
        if 'idx_breakdown_language' not in existing_idxs:
            op.create_index('idx_breakdown_language', 'repository_language_breakdowns', ['language_name'])

    # Table: repository_readme_snapshots
    if 'repository_readme_snapshots' not in existing_tables:
        op.create_table(
            'repository_readme_snapshots',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('selected_resource_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('repo_full_name', sa.String(255), nullable=False),
            sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('sync_run_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('readme_path', sa.String(255), nullable=False, server_default='README.md'),
            sa.Column('blob_sha', sa.String(100), nullable=True),
            sa.Column('html_url', sa.String(), nullable=True),
            sa.Column('content_hash', sa.String(64), nullable=True),
            sa.Column('raw_content', sa.String(), nullable=True),
            sa.Column('extracted_summary', sa.String(), nullable=True),
            sa.Column('sections_json', postgresql.JSONB(), nullable=True),
            sa.Column('sync_status', sa.String(50), nullable=False, server_default='success'),
            sa.Column('error_summary', sa.String(), nullable=True),
            sa.Column('retrieval_timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['selected_resource_id'], ['selected_resources.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['connection_id'], ['connected_sources.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['sync_run_id'], ['source_sync_runs.id'], ondelete='SET NULL'),
        )
        op.create_index('ix_repository_readme_snapshots_owner_user_id', 'repository_readme_snapshots', ['owner_user_id'])
        op.create_index('ix_repository_readme_snapshots_connection_id', 'repository_readme_snapshots', ['connection_id'])
        op.create_index('ix_repository_readme_snapshots_sync_run_id', 'repository_readme_snapshots', ['sync_run_id'])
        op.create_index('idx_repo_readme_owner_repo', 'repository_readme_snapshots', ['owner_user_id', 'repo_full_name'])
        op.create_index('ix_repository_readme_snapshots_selected_resource_id', 'repository_readme_snapshots', ['selected_resource_id'])
        op.create_index('idx_repo_readme_current', 'repository_readme_snapshots', ['selected_resource_id', 'is_current'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('repository_readme_snapshots', Base.metadata.tables['repository_readme_snapshots'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('repository_readme_snapshots')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'selected_resource_id' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('selected_resource_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'repo_full_name' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('repo_full_name', sa.String(255), nullable=False))
        if 'connection_id' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'sync_run_id' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('sync_run_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'readme_path' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('readme_path', sa.String(255), nullable=False, server_default='README.md'))
        if 'blob_sha' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('blob_sha', sa.String(100), nullable=True))
        if 'html_url' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('html_url', sa.String(), nullable=True))
        if 'content_hash' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('content_hash', sa.String(64), nullable=True))
        if 'raw_content' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('raw_content', sa.String(), nullable=True))
        if 'extracted_summary' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('extracted_summary', sa.String(), nullable=True))
        if 'sections_json' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('sections_json', postgresql.JSONB(), nullable=True))
        if 'sync_status' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('sync_status', sa.String(50), nullable=False, server_default='success'))
        if 'error_summary' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('error_summary', sa.String(), nullable=True))
        if 'retrieval_timestamp' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('retrieval_timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'is_current' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        if 'created_at' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('repository_readme_snapshots', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('repository_readme_snapshots')}
        if 'ix_repository_readme_snapshots_owner_user_id' not in existing_idxs:
            op.create_index('ix_repository_readme_snapshots_owner_user_id', 'repository_readme_snapshots', ['owner_user_id'])
        if 'ix_repository_readme_snapshots_connection_id' not in existing_idxs:
            op.create_index('ix_repository_readme_snapshots_connection_id', 'repository_readme_snapshots', ['connection_id'])
        if 'ix_repository_readme_snapshots_sync_run_id' not in existing_idxs:
            op.create_index('ix_repository_readme_snapshots_sync_run_id', 'repository_readme_snapshots', ['sync_run_id'])
        if 'idx_repo_readme_owner_repo' not in existing_idxs:
            op.create_index('idx_repo_readme_owner_repo', 'repository_readme_snapshots', ['owner_user_id', 'repo_full_name'])
        if 'ix_repository_readme_snapshots_selected_resource_id' not in existing_idxs:
            op.create_index('ix_repository_readme_snapshots_selected_resource_id', 'repository_readme_snapshots', ['selected_resource_id'])
        if 'idx_repo_readme_current' not in existing_idxs:
            op.create_index('idx_repo_readme_current', 'repository_readme_snapshots', ['selected_resource_id', 'is_current'])

    # Table: job_postings
    if 'job_postings' not in existing_tables:
        op.create_table(
            'job_postings',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('provider', sa.String(50), nullable=False),
            sa.Column('provider_job_id', sa.String(255), nullable=False),
            sa.Column('canonical_dedupe_key', sa.String(128), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('company_name', sa.String(255), nullable=False),
            sa.Column('company_domain', sa.String(255), nullable=True),
            sa.Column('location_text', sa.String(255), nullable=True),
            sa.Column('remote_status', sa.String(50), nullable=True),
            sa.Column('employment_type', sa.String(50), nullable=True),
            sa.Column('seniority', sa.String(50), nullable=True),
            sa.Column('salary_min', sa.Float(), nullable=True),
            sa.Column('salary_max', sa.Float(), nullable=True),
            sa.Column('salary_currency', sa.String(10), nullable=True),
            sa.Column('salary_period', sa.String(20), nullable=True),
            sa.Column('description', sa.String(), nullable=True),
            sa.Column('job_url', sa.String(), nullable=True),
            sa.Column('apply_url', sa.String(), nullable=True),
            sa.Column('posted_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('retrieved_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('is_stale', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('extracted_requirements', postgresql.JSONB(), nullable=False),
            sa.Column('raw_source_metadata', postgresql.JSONB(), nullable=False),
            sa.Column('content_hash', sa.String(64), nullable=False, server_default=''),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_job_postings_provider', 'job_postings', ['provider'])
        op.create_index('ix_job_postings_company_name', 'job_postings', ['company_name'])
        op.create_index('idx_job_postings_provider_pid', 'job_postings', ['provider', 'provider_job_id'])
        op.create_index('idx_job_postings_title_company', 'job_postings', ['title', 'company_name'])
        op.create_index('ix_job_postings_canonical_dedupe_key', 'job_postings', ['canonical_dedupe_key'], unique=True)
        op.create_index('ix_job_postings_title', 'job_postings', ['title'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('job_postings', Base.metadata.tables['job_postings'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('job_postings')}
        if 'provider' not in existing_cols:
            op.add_column('job_postings', sa.Column('provider', sa.String(50), nullable=False))
        if 'provider_job_id' not in existing_cols:
            op.add_column('job_postings', sa.Column('provider_job_id', sa.String(255), nullable=False))
        if 'canonical_dedupe_key' not in existing_cols:
            op.add_column('job_postings', sa.Column('canonical_dedupe_key', sa.String(128), nullable=False))
        if 'title' not in existing_cols:
            op.add_column('job_postings', sa.Column('title', sa.String(255), nullable=False))
        if 'company_name' not in existing_cols:
            op.add_column('job_postings', sa.Column('company_name', sa.String(255), nullable=False))
        if 'company_domain' not in existing_cols:
            op.add_column('job_postings', sa.Column('company_domain', sa.String(255), nullable=True))
        if 'location_text' not in existing_cols:
            op.add_column('job_postings', sa.Column('location_text', sa.String(255), nullable=True))
        if 'remote_status' not in existing_cols:
            op.add_column('job_postings', sa.Column('remote_status', sa.String(50), nullable=True))
        if 'employment_type' not in existing_cols:
            op.add_column('job_postings', sa.Column('employment_type', sa.String(50), nullable=True))
        if 'seniority' not in existing_cols:
            op.add_column('job_postings', sa.Column('seniority', sa.String(50), nullable=True))
        if 'salary_min' not in existing_cols:
            op.add_column('job_postings', sa.Column('salary_min', sa.Float(), nullable=True))
        if 'salary_max' not in existing_cols:
            op.add_column('job_postings', sa.Column('salary_max', sa.Float(), nullable=True))
        if 'salary_currency' not in existing_cols:
            op.add_column('job_postings', sa.Column('salary_currency', sa.String(10), nullable=True))
        if 'salary_period' not in existing_cols:
            op.add_column('job_postings', sa.Column('salary_period', sa.String(20), nullable=True))
        if 'description' not in existing_cols:
            op.add_column('job_postings', sa.Column('description', sa.String(), nullable=True))
        if 'job_url' not in existing_cols:
            op.add_column('job_postings', sa.Column('job_url', sa.String(), nullable=True))
        if 'apply_url' not in existing_cols:
            op.add_column('job_postings', sa.Column('apply_url', sa.String(), nullable=True))
        if 'posted_at' not in existing_cols:
            op.add_column('job_postings', sa.Column('posted_at', sa.DateTime(timezone=True), nullable=True))
        if 'retrieved_at' not in existing_cols:
            op.add_column('job_postings', sa.Column('retrieved_at', sa.DateTime(timezone=True), nullable=False))
        if 'is_stale' not in existing_cols:
            op.add_column('job_postings', sa.Column('is_stale', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        if 'extracted_requirements' not in existing_cols:
            op.add_column('job_postings', sa.Column('extracted_requirements', postgresql.JSONB(), nullable=False))
        if 'raw_source_metadata' not in existing_cols:
            op.add_column('job_postings', sa.Column('raw_source_metadata', postgresql.JSONB(), nullable=False))
        if 'content_hash' not in existing_cols:
            op.add_column('job_postings', sa.Column('content_hash', sa.String(64), nullable=False, server_default=''))
        if 'created_at' not in existing_cols:
            op.add_column('job_postings', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('job_postings', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('job_postings')}
        if 'ix_job_postings_provider' not in existing_idxs:
            op.create_index('ix_job_postings_provider', 'job_postings', ['provider'])
        if 'ix_job_postings_company_name' not in existing_idxs:
            op.create_index('ix_job_postings_company_name', 'job_postings', ['company_name'])
        if 'idx_job_postings_provider_pid' not in existing_idxs:
            op.create_index('idx_job_postings_provider_pid', 'job_postings', ['provider', 'provider_job_id'])
        if 'idx_job_postings_title_company' not in existing_idxs:
            op.create_index('idx_job_postings_title_company', 'job_postings', ['title', 'company_name'])
        if 'ix_job_postings_canonical_dedupe_key' not in existing_idxs:
            op.create_index('ix_job_postings_canonical_dedupe_key', 'job_postings', ['canonical_dedupe_key'], unique=True)
        if 'ix_job_postings_title' not in existing_idxs:
            op.create_index('ix_job_postings_title', 'job_postings', ['title'])

    # Table: job_search_cache
    if 'job_search_cache' not in existing_tables:
        op.create_table(
            'job_search_cache',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('cache_key', sa.String(128), nullable=False),
            sa.Column('mode', sa.String(50), nullable=False),
            sa.Column('query_text', sa.String(255), nullable=False),
            sa.Column('provider_used', sa.String(50), nullable=False),
            sa.Column('result_job_ids', postgresql.JSONB(), nullable=False),
            sa.Column('result_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('influencing_skills', postgresql.JSONB(), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_job_search_cache_expires_at', 'job_search_cache', ['expires_at'])
        op.create_index('ix_job_search_cache_cache_key', 'job_search_cache', ['cache_key'], unique=True)
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('job_search_cache', Base.metadata.tables['job_search_cache'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('job_search_cache')}
        if 'cache_key' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('cache_key', sa.String(128), nullable=False))
        if 'mode' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('mode', sa.String(50), nullable=False))
        if 'query_text' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('query_text', sa.String(255), nullable=False))
        if 'provider_used' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('provider_used', sa.String(50), nullable=False))
        if 'result_job_ids' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('result_job_ids', postgresql.JSONB(), nullable=False))
        if 'result_count' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('result_count', sa.Integer(), nullable=False, server_default=sa.text('0')))
        if 'influencing_skills' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('influencing_skills', postgresql.JSONB(), nullable=False))
        if 'expires_at' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False))
        if 'created_at' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('job_search_cache', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('job_search_cache')}
        if 'ix_job_search_cache_expires_at' not in existing_idxs:
            op.create_index('ix_job_search_cache_expires_at', 'job_search_cache', ['expires_at'])
        if 'ix_job_search_cache_cache_key' not in existing_idxs:
            op.create_index('ix_job_search_cache_cache_key', 'job_search_cache', ['cache_key'], unique=True)

    # Table: role_demand_models
    if 'role_demand_models' not in existing_tables:
        op.create_table(
            'role_demand_models',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('role_id', sa.String(100), nullable=False),
            sa.Column('version', sa.String(50), nullable=False, server_default='v2026.1'),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('seniority', sa.String(50), nullable=False, server_default='Mid Level'),
            sa.Column('context', sa.String(150), nullable=False, server_default='General'),
            sa.Column('description', sa.String(), nullable=False),
            sa.Column('provenance', sa.String(), nullable=False),
            sa.Column('source_type', sa.String(50), nullable=False, server_default='curated_model'),
            sa.Column('source_job_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('competencies', postgresql.JSONB(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['source_job_id'], ['job_postings.id'], ondelete='SET NULL'),
            sa.UniqueConstraint('role_id', 'version', 'owner_user_id', name='uq_role_id_version_owner'),
        )
        op.create_index('idx_role_models_role_version', 'role_demand_models', ['role_id', 'version'])
        op.create_index('ix_role_demand_models_owner_user_id', 'role_demand_models', ['owner_user_id'])
        op.create_index('ix_role_demand_models_role_id', 'role_demand_models', ['role_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('role_demand_models', Base.metadata.tables['role_demand_models'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('role_demand_models')}
        if 'role_id' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('role_id', sa.String(100), nullable=False))
        if 'version' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('version', sa.String(50), nullable=False, server_default='v2026.1'))
        if 'title' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('title', sa.String(255), nullable=False))
        if 'seniority' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('seniority', sa.String(50), nullable=False, server_default='Mid Level'))
        if 'context' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('context', sa.String(150), nullable=False, server_default='General'))
        if 'description' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('description', sa.String(), nullable=False))
        if 'provenance' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('provenance', sa.String(), nullable=False))
        if 'source_type' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('source_type', sa.String(50), nullable=False, server_default='curated_model'))
        if 'source_job_id' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('source_job_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'owner_user_id' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'competencies' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('competencies', postgresql.JSONB(), nullable=False))
        if 'is_active' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        if 'created_at' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('role_demand_models', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('role_demand_models')}
        if 'idx_role_models_role_version' not in existing_idxs:
            op.create_index('idx_role_models_role_version', 'role_demand_models', ['role_id', 'version'])
        if 'ix_role_demand_models_owner_user_id' not in existing_idxs:
            op.create_index('ix_role_demand_models_owner_user_id', 'role_demand_models', ['owner_user_id'])
        if 'ix_role_demand_models_role_id' not in existing_idxs:
            op.create_index('ix_role_demand_models_role_id', 'role_demand_models', ['role_id'])

    # Table: user_target_roles
    if 'user_target_roles' not in existing_tables:
        op.create_table(
            'user_target_roles',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('target_role_id', sa.String(100), nullable=False),
            sa.Column('target_role_version', sa.String(50), nullable=False, server_default='v2026.1'),
            sa.Column('role_title', sa.String(255), nullable=False),
            sa.Column('selected_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_user_target_roles_owner_user_id', 'user_target_roles', ['owner_user_id'], unique=True)
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('user_target_roles', Base.metadata.tables['user_target_roles'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('user_target_roles')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('user_target_roles', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'target_role_id' not in existing_cols:
            op.add_column('user_target_roles', sa.Column('target_role_id', sa.String(100), nullable=False))
        if 'target_role_version' not in existing_cols:
            op.add_column('user_target_roles', sa.Column('target_role_version', sa.String(50), nullable=False, server_default='v2026.1'))
        if 'role_title' not in existing_cols:
            op.add_column('user_target_roles', sa.Column('role_title', sa.String(255), nullable=False))
        if 'selected_at' not in existing_cols:
            op.add_column('user_target_roles', sa.Column('selected_at', sa.DateTime(timezone=True), nullable=False))
        if 'created_at' not in existing_cols:
            op.add_column('user_target_roles', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('user_target_roles', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('user_target_roles')}
        if 'ix_user_target_roles_owner_user_id' not in existing_idxs:
            op.create_index('ix_user_target_roles_owner_user_id', 'user_target_roles', ['owner_user_id'], unique=True)

    # Table: role_match_snapshots
    if 'role_match_snapshots' not in existing_tables:
        op.create_table(
            'role_match_snapshots',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('role_id', sa.String(100), nullable=False),
            sa.Column('role_version', sa.String(50), nullable=False),
            sa.Column('capability_state_version', sa.String(50), nullable=False, server_default='v1.0'),
            sa.Column('matching_policy_version', sa.String(50), nullable=False, server_default='v2026.1'),
            sa.Column('overall_match_score', sa.Float(), nullable=False),
            sa.Column('required_coverage_score', sa.Float(), nullable=False),
            sa.Column('supporting_coverage_score', sa.Float(), nullable=False),
            sa.Column('readiness_index', sa.Float(), nullable=False),
            sa.Column('match_summary', postgresql.JSONB(), nullable=False),
            sa.Column('gaps_data', postgresql.JSONB(), nullable=False),
            sa.Column('readiness_data', postgresql.JSONB(), nullable=False),
            sa.Column('priorities_data', postgresql.JSONB(), nullable=False),
            sa.Column('handoff_data', postgresql.JSONB(), nullable=False),
            sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_role_match_snapshots_owner_user_id', 'role_match_snapshots', ['owner_user_id'])
        op.create_index('ix_role_match_snapshots_role_id', 'role_match_snapshots', ['role_id'])
        op.create_index('idx_match_snapshots_owner_role', 'role_match_snapshots', ['owner_user_id', 'role_id', 'role_version'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('role_match_snapshots', Base.metadata.tables['role_match_snapshots'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('role_match_snapshots')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'role_id' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('role_id', sa.String(100), nullable=False))
        if 'role_version' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('role_version', sa.String(50), nullable=False))
        if 'capability_state_version' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('capability_state_version', sa.String(50), nullable=False, server_default='v1.0'))
        if 'matching_policy_version' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('matching_policy_version', sa.String(50), nullable=False, server_default='v2026.1'))
        if 'overall_match_score' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('overall_match_score', sa.Float(), nullable=False))
        if 'required_coverage_score' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('required_coverage_score', sa.Float(), nullable=False))
        if 'supporting_coverage_score' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('supporting_coverage_score', sa.Float(), nullable=False))
        if 'readiness_index' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('readiness_index', sa.Float(), nullable=False))
        if 'match_summary' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('match_summary', postgresql.JSONB(), nullable=False))
        if 'gaps_data' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('gaps_data', postgresql.JSONB(), nullable=False))
        if 'readiness_data' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('readiness_data', postgresql.JSONB(), nullable=False))
        if 'priorities_data' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('priorities_data', postgresql.JSONB(), nullable=False))
        if 'handoff_data' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('handoff_data', postgresql.JSONB(), nullable=False))
        if 'calculated_at' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('calculated_at', sa.DateTime(timezone=True), nullable=False))
        if 'created_at' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('role_match_snapshots', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('role_match_snapshots')}
        if 'ix_role_match_snapshots_owner_user_id' not in existing_idxs:
            op.create_index('ix_role_match_snapshots_owner_user_id', 'role_match_snapshots', ['owner_user_id'])
        if 'ix_role_match_snapshots_role_id' not in existing_idxs:
            op.create_index('ix_role_match_snapshots_role_id', 'role_match_snapshots', ['role_id'])
        if 'idx_match_snapshots_owner_role' not in existing_idxs:
            op.create_index('idx_match_snapshots_owner_role', 'role_match_snapshots', ['owner_user_id', 'role_id', 'role_version'])

    # Table: share_links
    if 'share_links' not in existing_tables:
        op.create_table(
            'share_links',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('token', sa.String(64), nullable=False),
            sa.Column('label', sa.String(255), nullable=False),
            sa.Column('template_id', sa.String(50), nullable=False, server_default='classic'),
            sa.Column('status', sa.String(20), nullable=False, server_default='active'),
            sa.Column('permissions_json', postgresql.JSONB(), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('revocation_reason', sa.String(), nullable=True),
            sa.Column('access_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
            sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_share_links_owner_user_id', 'share_links', ['owner_user_id'])
        op.create_index('ix_share_links_token', 'share_links', ['token'], unique=True)
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('share_links', Base.metadata.tables['share_links'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('share_links')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('share_links', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'token' not in existing_cols:
            op.add_column('share_links', sa.Column('token', sa.String(64), nullable=False))
        if 'label' not in existing_cols:
            op.add_column('share_links', sa.Column('label', sa.String(255), nullable=False))
        if 'template_id' not in existing_cols:
            op.add_column('share_links', sa.Column('template_id', sa.String(50), nullable=False, server_default='classic'))
        if 'status' not in existing_cols:
            op.add_column('share_links', sa.Column('status', sa.String(20), nullable=False, server_default='active'))
        if 'permissions_json' not in existing_cols:
            op.add_column('share_links', sa.Column('permissions_json', postgresql.JSONB(), nullable=False))
        if 'expires_at' not in existing_cols:
            op.add_column('share_links', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
        if 'revoked_at' not in existing_cols:
            op.add_column('share_links', sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))
        if 'revocation_reason' not in existing_cols:
            op.add_column('share_links', sa.Column('revocation_reason', sa.String(), nullable=True))
        if 'access_count' not in existing_cols:
            op.add_column('share_links', sa.Column('access_count', sa.Integer(), nullable=False, server_default=sa.text('0')))
        if 'last_accessed_at' not in existing_cols:
            op.add_column('share_links', sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('share_links', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('share_links', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('share_links')}
        if 'ix_share_links_owner_user_id' not in existing_idxs:
            op.create_index('ix_share_links_owner_user_id', 'share_links', ['owner_user_id'])
        if 'ix_share_links_token' not in existing_idxs:
            op.create_index('ix_share_links_token', 'share_links', ['token'], unique=True)

    # Table: share_access_events
    if 'share_access_events' not in existing_tables:
        op.create_table(
            'share_access_events',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('share_link_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('action', sa.String(50), nullable=False),
            sa.Column('details', sa.String(), nullable=False),
            sa.Column('ip_hash', sa.String(64), nullable=True),
            sa.Column('user_agent', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['share_link_id'], ['share_links.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_share_access_events_share_link_id', 'share_access_events', ['share_link_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('share_access_events', Base.metadata.tables['share_access_events'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('share_access_events')}
        if 'share_link_id' not in existing_cols:
            op.add_column('share_access_events', sa.Column('share_link_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'action' not in existing_cols:
            op.add_column('share_access_events', sa.Column('action', sa.String(50), nullable=False))
        if 'details' not in existing_cols:
            op.add_column('share_access_events', sa.Column('details', sa.String(), nullable=False))
        if 'ip_hash' not in existing_cols:
            op.add_column('share_access_events', sa.Column('ip_hash', sa.String(64), nullable=True))
        if 'user_agent' not in existing_cols:
            op.add_column('share_access_events', sa.Column('user_agent', sa.String(255), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('share_access_events', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('share_access_events', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('share_access_events')}
        if 'ix_share_access_events_share_link_id' not in existing_idxs:
            op.create_index('ix_share_access_events_share_link_id', 'share_access_events', ['share_link_id'])

    # Table: recruiter_messages
    if 'recruiter_messages' not in existing_tables:
        op.create_table(
            'recruiter_messages',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('recipient_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('share_link_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('sender_name', sa.String(255), nullable=False),
            sa.Column('sender_email', sa.String(255), nullable=False),
            sa.Column('company', sa.String(255), nullable=True),
            sa.Column('role_title', sa.String(255), nullable=True),
            sa.Column('subject', sa.String(255), nullable=True),
            sa.Column('message_body', sa.String(), nullable=False),
            sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('reply_body', sa.String(), nullable=True),
            sa.Column('replied_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['share_link_id'], ['share_links.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_recruiter_messages_recipient_user_id', 'recruiter_messages', ['recipient_user_id'])
        op.create_index('ix_recruiter_messages_share_link_id', 'recruiter_messages', ['share_link_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('recruiter_messages', Base.metadata.tables['recruiter_messages'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('recruiter_messages')}
        if 'recipient_user_id' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('recipient_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'share_link_id' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('share_link_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'sender_name' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('sender_name', sa.String(255), nullable=False))
        if 'sender_email' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('sender_email', sa.String(255), nullable=False))
        if 'company' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('company', sa.String(255), nullable=True))
        if 'role_title' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('role_title', sa.String(255), nullable=True))
        if 'subject' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('subject', sa.String(255), nullable=True))
        if 'message_body' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('message_body', sa.String(), nullable=False))
        if 'is_read' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        if 'reply_body' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('reply_body', sa.String(), nullable=True))
        if 'replied_at' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('replied_at', sa.DateTime(timezone=True), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('recruiter_messages', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('recruiter_messages')}
        if 'ix_recruiter_messages_recipient_user_id' not in existing_idxs:
            op.create_index('ix_recruiter_messages_recipient_user_id', 'recruiter_messages', ['recipient_user_id'])
        if 'ix_recruiter_messages_share_link_id' not in existing_idxs:
            op.create_index('ix_recruiter_messages_share_link_id', 'recruiter_messages', ['share_link_id'])

    # Table: user_custom_skills
    if 'user_custom_skills' not in existing_tables:
        op.create_table(
            'user_custom_skills',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('title', sa.String(150), nullable=False),
            sa.Column('description', sa.String(), nullable=False),
            sa.Column('context', sa.String(), nullable=True),
            sa.Column('self_assessed_level', sa.String(50), nullable=False, server_default='Intermediate'),
            sa.Column('tags', postgresql.JSONB(), nullable=False),
            sa.Column('attached_evidence_ids', postgresql.JSONB(), nullable=False),
            sa.Column('external_project_url', sa.String(512), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_user_custom_skills_owner_user_id', 'user_custom_skills', ['owner_user_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('user_custom_skills', Base.metadata.tables['user_custom_skills'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('user_custom_skills')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'title' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('title', sa.String(150), nullable=False))
        if 'description' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('description', sa.String(), nullable=False))
        if 'context' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('context', sa.String(), nullable=True))
        if 'self_assessed_level' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('self_assessed_level', sa.String(50), nullable=False, server_default='Intermediate'))
        if 'tags' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('tags', postgresql.JSONB(), nullable=False))
        if 'attached_evidence_ids' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('attached_evidence_ids', postgresql.JSONB(), nullable=False))
        if 'external_project_url' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('external_project_url', sa.String(512), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('user_custom_skills', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('user_custom_skills')}
        if 'ix_user_custom_skills_owner_user_id' not in existing_idxs:
            op.create_index('ix_user_custom_skills_owner_user_id', 'user_custom_skills', ['owner_user_id'])

    # Table: user_notifications
    if 'user_notifications' not in existing_tables:
        op.create_table(
            'user_notifications',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('description', sa.String(), nullable=False),
            sa.Column('category', sa.String(50), nullable=False, server_default='sharing'),
            sa.Column('severity', sa.String(20), nullable=False, server_default='info'),
            sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('related_domain', sa.String(100), nullable=False, server_default='Domain 6: Sharing & Recruiter'),
            sa.Column('action_route', sa.String(255), nullable=True),
            sa.Column('action_label', sa.String(100), nullable=True),
            sa.Column('entity_type', sa.String(50), nullable=True),
            sa.Column('entity_id', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_user_notifications_user_id', 'user_notifications', ['user_id'])
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('user_notifications', Base.metadata.tables['user_notifications'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('user_notifications')}
        if 'user_id' not in existing_cols:
            op.add_column('user_notifications', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'title' not in existing_cols:
            op.add_column('user_notifications', sa.Column('title', sa.String(255), nullable=False))
        if 'description' not in existing_cols:
            op.add_column('user_notifications', sa.Column('description', sa.String(), nullable=False))
        if 'category' not in existing_cols:
            op.add_column('user_notifications', sa.Column('category', sa.String(50), nullable=False, server_default='sharing'))
        if 'severity' not in existing_cols:
            op.add_column('user_notifications', sa.Column('severity', sa.String(20), nullable=False, server_default='info'))
        if 'read' not in existing_cols:
            op.add_column('user_notifications', sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        if 'related_domain' not in existing_cols:
            op.add_column('user_notifications', sa.Column('related_domain', sa.String(100), nullable=False, server_default='Domain 6: Sharing & Recruiter'))
        if 'action_route' not in existing_cols:
            op.add_column('user_notifications', sa.Column('action_route', sa.String(255), nullable=True))
        if 'action_label' not in existing_cols:
            op.add_column('user_notifications', sa.Column('action_label', sa.String(100), nullable=True))
        if 'entity_type' not in existing_cols:
            op.add_column('user_notifications', sa.Column('entity_type', sa.String(50), nullable=True))
        if 'entity_id' not in existing_cols:
            op.add_column('user_notifications', sa.Column('entity_id', sa.String(255), nullable=True))
        if 'created_at' not in existing_cols:
            op.add_column('user_notifications', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('user_notifications', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('user_notifications')}
        if 'ix_user_notifications_user_id' not in existing_idxs:
            op.create_index('ix_user_notifications_user_id', 'user_notifications', ['user_id'])

    # Table: user_passport_configs
    if 'user_passport_configs' not in existing_tables:
        op.create_table(
            'user_passport_configs',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('title', sa.String(255), nullable=False, server_default='Master Skill Passport'),
            sa.Column('template_id', sa.String(50), nullable=False, server_default='classic'),
            sa.Column('sections_config', postgresql.JSONB(), nullable=False),
            sa.Column('work_experiences', postgresql.JSONB(), nullable=False),
            sa.Column('education_entries', postgresql.JSONB(), nullable=False),
            sa.Column('portfolio_projects', postgresql.JSONB(), nullable=False),
            sa.Column('certifications', postgresql.JSONB(), nullable=False),
            sa.Column('publications', postgresql.JSONB(), nullable=False),
            sa.Column('achievements', postgresql.JSONB(), nullable=False),
            sa.Column('custom_sections', postgresql.JSONB(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_user_passport_configs_owner_user_id', 'user_passport_configs', ['owner_user_id'], unique=True)
    else:
        # Audit existing table integrity and halt on ambiguous/destructive drift
        from backend.app.models.base import Base
        _validate_and_reconcile_table('user_passport_configs', Base.metadata.tables['user_passport_configs'], inspector)
        existing_cols = {c['name'] for c in inspector.get_columns('user_passport_configs')}
        if 'owner_user_id' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False))
        if 'title' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('title', sa.String(255), nullable=False, server_default='Master Skill Passport'))
        if 'template_id' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('template_id', sa.String(50), nullable=False, server_default='classic'))
        if 'sections_config' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('sections_config', postgresql.JSONB(), nullable=False))
        if 'work_experiences' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('work_experiences', postgresql.JSONB(), nullable=False))
        if 'education_entries' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('education_entries', postgresql.JSONB(), nullable=False))
        if 'portfolio_projects' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('portfolio_projects', postgresql.JSONB(), nullable=False))
        if 'certifications' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('certifications', postgresql.JSONB(), nullable=False))
        if 'publications' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('publications', postgresql.JSONB(), nullable=False))
        if 'achievements' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('achievements', postgresql.JSONB(), nullable=False))
        if 'custom_sections' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('custom_sections', postgresql.JSONB(), nullable=False))
        if 'created_at' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        if 'updated_at' not in existing_cols:
            op.add_column('user_passport_configs', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')))
        existing_idxs = {i['name'] for i in inspector.get_indexes('user_passport_configs')}
        if 'ix_user_passport_configs_owner_user_id' not in existing_idxs:
            op.create_index('ix_user_passport_configs_owner_user_id', 'user_passport_configs', ['owner_user_id'], unique=True)

def downgrade() -> None:
    # Explicitly irreversible to protect existing application data from accidental deletion
    raise RuntimeError(
        "IrreversibleMigrationError: Downgrade of revision '002_consolidated_platform_schema' "
        "is explicitly blocked to protect pre-existing and operational application data. "
        "This migration creates and reconciles 25 foundational domain tables (including "
        "user_profiles, work_analysis_results, and sharing records). "
        "Dropping these tables would cause unrecoverable data loss. "
        "If you need to roll back schema changes, restore from a verified point-in-time "
        "database backup and apply an explicit forward-fix migration."
    )