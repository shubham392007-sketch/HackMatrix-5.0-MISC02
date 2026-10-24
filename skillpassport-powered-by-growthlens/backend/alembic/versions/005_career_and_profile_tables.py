"""Add career intelligence and user profile tables

Revision ID: 005_career_and_profile_tables
Revises: 004_learning_project_submissions
Create Date: 2026-10-23 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005_career_and_profile_tables'
down_revision: Union[str, None] = '004_learning_project_submissions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    existing_tables = []
    if not context.is_offline_mode():
        conn = op.get_bind()
        if conn is not None:
            try:
                inspector = sa.inspect(conn)
                existing_tables = inspector.get_table_names()
            except Exception:
                existing_tables = []

    # 1. user_profiles
    if 'user_profiles' not in existing_tables:
        op.create_table(
            'user_profiles',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('email', sa.String(255), nullable=False),
            sa.Column('display_name', sa.String(255), nullable=True),
            sa.Column('headline', sa.String(255), nullable=True),
            sa.Column('current_role', sa.String(100), server_default='employee', nullable=False),
            sa.Column('job_title', sa.String(255), nullable=True),
            sa.Column('specialization', sa.String(255), nullable=True),
            sa.Column('department_or_team', sa.String(255), nullable=True),
            sa.Column('experience_level', sa.String(100), nullable=True),
            sa.Column('professional_goal', sa.Text(), nullable=True),
            sa.Column('professional_summary', sa.Text(), nullable=True),
            sa.Column('onboarding_status', sa.String(50), server_default='not_started', nullable=False),
            sa.Column('onboarding_current_step', sa.Integer(), server_default='1', nullable=False),
            sa.Column('onboarding_current_category', sa.String(50), server_default='resume', nullable=False),
            sa.Column('github_skipped', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('jira_skipped', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index('idx_user_profiles_email', 'user_profiles', ['email'])

    # 2. job_postings
    if 'job_postings' not in existing_tables:
        op.create_table(
            'job_postings',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('provider', sa.String(50), nullable=False),
            sa.Column('provider_job_id', sa.String(255), nullable=False),
            sa.Column('canonical_dedupe_key', sa.String(128), nullable=False, unique=True),
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
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('job_url', sa.Text(), nullable=True),
            sa.Column('apply_url', sa.Text(), nullable=True),
            sa.Column('posted_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('retrieved_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('is_stale', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('extracted_requirements', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('raw_source_metadata', postgresql.JSONB(), server_default='{}', nullable=False),
            sa.Column('content_hash', sa.String(64), server_default='', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index('idx_job_postings_provider_pid', 'job_postings', ['provider', 'provider_job_id'])
        op.create_index('idx_job_postings_title_company', 'job_postings', ['title', 'company_name'])
        op.create_index('idx_job_postings_dedupe', 'job_postings', ['canonical_dedupe_key'])

    # 3. role_demand_models
    if 'role_demand_models' not in existing_tables:
        op.create_table(
            'role_demand_models',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('role_id', sa.String(100), nullable=False),
            sa.Column('version', sa.String(50), server_default='v2026.1', nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('seniority', sa.String(50), server_default='Mid Level', nullable=False),
            sa.Column('context', sa.String(150), server_default='General', nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('provenance', sa.Text(), nullable=False),
            sa.Column('source_type', sa.String(50), server_default='curated_model', nullable=False),
            sa.Column(
                'source_job_id',
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey('job_postings.id', ondelete='SET NULL'),
                nullable=True,
            ),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('competencies', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.UniqueConstraint('role_id', 'version', 'owner_user_id', name='uq_role_id_version_owner'),
        )
        op.create_index('idx_role_models_role_version', 'role_demand_models', ['role_id', 'version'])
        op.create_index('idx_role_models_owner_user_id', 'role_demand_models', ['owner_user_id'])

    # 4. user_target_roles
    if 'user_target_roles' not in existing_tables:
        op.create_table(
            'user_target_roles',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
            sa.Column('target_role_id', sa.String(100), nullable=False),
            sa.Column('target_role_version', sa.String(50), server_default='v2026.1', nullable=False),
            sa.Column('role_title', sa.String(255), nullable=False),
            sa.Column('selected_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index('idx_user_target_roles_owner', 'user_target_roles', ['owner_user_id'])

    # 5. role_match_snapshots
    if 'role_match_snapshots' not in existing_tables:
        op.create_table(
            'role_match_snapshots',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('role_id', sa.String(100), nullable=False),
            sa.Column('role_version', sa.String(50), nullable=False),
            sa.Column('capability_state_version', sa.String(50), server_default='v1.0', nullable=False),
            sa.Column('matching_policy_version', sa.String(50), server_default='v2026.1', nullable=False),
            sa.Column('overall_match_score', sa.Float(), nullable=False),
            sa.Column('required_coverage_score', sa.Float(), nullable=False),
            sa.Column('supporting_coverage_score', sa.Float(), nullable=False),
            sa.Column('readiness_index', sa.Float(), nullable=False),
            sa.Column('match_summary', postgresql.JSONB(), server_default='{}', nullable=False),
            sa.Column('gaps_data', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('readiness_data', postgresql.JSONB(), server_default='{}', nullable=False),
            sa.Column('priorities_data', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('handoff_data', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index('idx_match_snapshots_owner_role', 'role_match_snapshots', ['owner_user_id', 'role_id', 'role_version'])
        op.create_index('idx_match_snapshots_owner', 'role_match_snapshots', ['owner_user_id'])

    # 6. job_search_cache
    if 'job_search_cache' not in existing_tables:
        op.create_table(
            'job_search_cache',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('cache_key', sa.String(128), nullable=False, unique=True),
            sa.Column('mode', sa.String(50), nullable=False),
            sa.Column('query_text', sa.String(255), nullable=False),
            sa.Column('provider_used', sa.String(50), nullable=False),
            sa.Column('result_job_ids', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('result_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('influencing_skills', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index('idx_job_search_cache_key', 'job_search_cache', ['cache_key'])
        op.create_index('idx_job_search_cache_expires', 'job_search_cache', ['expires_at'])


def downgrade() -> None:
    existing_tables = []
    if not context.is_offline_mode():
        conn = op.get_bind()
        if conn is not None:
            try:
                inspector = sa.inspect(conn)
                existing_tables = inspector.get_table_names()
            except Exception:
                existing_tables = []

    tables_to_drop = [
        'job_search_cache',
        'role_match_snapshots',
        'user_target_roles',
        'role_demand_models',
        'job_postings',
        'user_profiles',
    ]

    for tbl in tables_to_drop:
        if tbl in existing_tables:
            op.drop_table(tbl)
