"""Add learning_mini_projects table for Domain 5 Learn & Grow (Phase 11)

Revision ID: 008_add_learning_mini_projects
Revises: 007_add_learning_step_packets
Create Date: 2026-10-24 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '008_add_learning_mini_projects'
down_revision: Union[str, None] = '007_add_learning_step_packets'
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

    if 'learning_mini_projects' not in existing_tables:
        op.create_table(
            'learning_mini_projects',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('project_id', sa.String(100), nullable=False, unique=True),
            sa.Column('domain_id', sa.String(100), nullable=False),
            sa.Column('domain_title', sa.String(255), nullable=False),
            sa.Column('skill_id', sa.String(100), nullable=True),
            sa.Column('skill_name', sa.String(255), nullable=True),
            sa.Column('gap_id', sa.String(100), nullable=True),
            sa.Column('roadmap_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('learning_roadmaps.id', ondelete='SET NULL'), nullable=True),
            sa.Column('target_role_id', sa.String(100), nullable=True),
            sa.Column('title', sa.String(500), nullable=False),
            sa.Column('difficulty', sa.String(50), server_default='Intermediate', nullable=False),
            sa.Column('estimated_hours', sa.Integer(), nullable=True),
            sa.Column('problem_statement', sa.Text(), nullable=False),
            sa.Column('relevance_to_gap', sa.Text(), nullable=False),
            sa.Column('learning_objectives', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('expected_deliverables', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('implementation_requirements', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('milestones', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('acceptance_criteria', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('rubric', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('submission_instructions', sa.Text(), nullable=False),
            sa.Column('resources', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('generation_method', sa.String(50), nullable=False),
            sa.Column('ai_provider', sa.String(50), nullable=True),
            sa.Column('ai_model', sa.String(50), nullable=True),
            sa.Column('latency_seconds', sa.Float(), nullable=True),
            sa.Column('generation_status', sa.String(50), server_default='completed', nullable=False),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('status', sa.String(50), server_default='not_started', nullable=False),
            sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        )
        op.create_index('idx_mini_projects_owner_domain', 'learning_mini_projects', ['owner_user_id', 'domain_id'])
        op.create_index('idx_mini_projects_owner_gap', 'learning_mini_projects', ['owner_user_id', 'gap_id'])
        op.create_index('idx_mini_projects_project_id', 'learning_mini_projects', ['project_id'])


def downgrade() -> None:
    existing_tables = []
    if not context.is_offline_mode():
        conn = op.get_bind()
        if conn is not None:
            try:
                inspector = sa.inspect(conn)
                existing_tables = inspector.get_table_names()
                if 'learning_mini_projects' not in existing_tables:
                    return
            except Exception:
                pass

    op.drop_index('idx_mini_projects_project_id', table_name='learning_mini_projects')
    op.drop_index('idx_mini_projects_owner_gap', table_name='learning_mini_projects')
    op.drop_index('idx_mini_projects_owner_domain', table_name='learning_mini_projects')
    op.drop_table('learning_mini_projects')
