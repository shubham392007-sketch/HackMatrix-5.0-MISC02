"""Add learning_assessments table for Domain 5 Learn & Grow

Revision ID: 003_add_learning_assessments
Revises: 002_learning_tables
Create Date: 2026-10-22 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003_add_learning_assessments'
down_revision: Union[str, None] = '002_learning_tables'
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

    # Avoid duplicate-table creation if table was already created in an earlier migration run
    if 'learning_assessments' not in existing_tables:
        op.create_table(
            'learning_assessments',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('assessment_id', sa.String(100), nullable=False, unique=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column(
                'roadmap_id',
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey('learning_roadmaps.id', ondelete='CASCADE'),
                nullable=True,
            ),
            sa.Column('step_id', sa.String(100), nullable=True),
            sa.Column('skill_id', sa.String(100), nullable=False),
            sa.Column('skill_name', sa.String(255), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('learning_objective', sa.Text(), nullable=False),
            sa.Column('passing_threshold', sa.Float(), server_default='70.0', nullable=False),
            sa.Column('time_limit_minutes', sa.Integer(), server_default='15', nullable=False),
            sa.Column('is_synthetic', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('generation_method', sa.String(50), server_default='ollama_qwen', nullable=False),
            sa.Column('generation_latency_seconds', sa.Float(), nullable=True),
            sa.Column('questions_data', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )

        op.create_index('idx_assessments_assessment_id', 'learning_assessments', ['assessment_id'])
        op.create_index('idx_assessments_owner_user_id', 'learning_assessments', ['owner_user_id'])
        op.create_index('idx_assessments_skill_id', 'learning_assessments', ['skill_id'])
        op.create_index('idx_assessments_step_id', 'learning_assessments', ['step_id'])
        op.create_index('idx_assessments_owner_skill', 'learning_assessments', ['owner_user_id', 'skill_id'])
        op.create_index('idx_assessments_roadmap_step', 'learning_assessments', ['roadmap_id', 'step_id'])


def downgrade() -> None:
    if not context.is_offline_mode():
        conn = op.get_bind()
        if conn is not None:
            try:
                inspector = sa.inspect(conn)
                existing_tables = inspector.get_table_names()
                if 'learning_assessments' not in existing_tables:
                    return
            except Exception:
                pass

    op.drop_table('learning_assessments')

