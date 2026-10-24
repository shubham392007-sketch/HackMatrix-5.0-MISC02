"""Add learning_activities table for Domain 5 Learn & Grow (Phase 12)

Revision ID: 009_add_learning_activities
Revises: 008_add_learning_mini_projects
Create Date: 2026-10-24 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '009_add_learning_activities'
down_revision: Union[str, None] = '008_add_learning_mini_projects'
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

    if 'learning_activities' not in existing_tables:
        op.create_table(
            'learning_activities',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('roadmap_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('learning_roadmaps.id', ondelete='CASCADE'), nullable=True),
            sa.Column('step_id', sa.String(100), nullable=True),
            sa.Column('activity_type', sa.String(50), nullable=False),
            sa.Column('activity_status', sa.String(50), server_default='completed', nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('detail', sa.Text(), nullable=True),
            sa.Column('domain_id', sa.String(100), nullable=True),
            sa.Column('skill_id', sa.String(100), nullable=True),
            sa.Column('target_role_id', sa.String(100), nullable=True),
            sa.Column('resource_id', sa.String(255), nullable=True),
            sa.Column('assessment_id', sa.String(100), nullable=True),
            sa.Column('project_id', sa.String(100), nullable=True),
            sa.Column('score', sa.Float(), nullable=True),
            sa.Column('link_route', sa.String(255), nullable=True),
            sa.Column('activity_metadata', postgresql.JSONB(), server_default='{}', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index('idx_activities_owner_user_id', 'learning_activities', ['owner_user_id'])
        op.create_index('idx_activities_roadmap_id', 'learning_activities', ['roadmap_id'])
        op.create_index('idx_activities_step_id', 'learning_activities', ['step_id'])
        op.create_index('idx_activities_owner_type', 'learning_activities', ['owner_user_id', 'activity_type'])
        op.create_index('idx_activities_owner_created', 'learning_activities', ['owner_user_id', 'created_at'])
        op.create_index('idx_activities_domain', 'learning_activities', ['domain_id'])


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

    if 'learning_activities' in existing_tables:
        op.drop_table('learning_activities')
