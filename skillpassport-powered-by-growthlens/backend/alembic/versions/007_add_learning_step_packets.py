"""Add learning_step_packets table for Domain 5 Learn & Grow (Phase 10B)

Revision ID: 007_add_learning_step_packets
Revises: 006_add_skill_gap_assessments
Create Date: 2026-10-24 10:55:00.000000

"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007_add_learning_step_packets'
down_revision: Union[str, None] = '006_add_skill_gap_assessments'
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

    if 'learning_step_packets' not in existing_tables:
        op.create_table(
            'learning_step_packets',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('step_id', sa.String(100), nullable=False),
            sa.Column('topic_id', sa.String(100), nullable=False),
            sa.Column('domain_id', sa.String(100), nullable=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('learning_objective', sa.Text(), nullable=False),
            sa.Column('why_this_matters', sa.Text(), nullable=False),
            sa.Column('what_is_it', sa.Text(), nullable=False),
            sa.Column('why_and_when', sa.Text(), nullable=False),
            sa.Column('worked_example', postgresql.JSONB(), server_default='{}', nullable=False),
            sa.Column('common_mistakes', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('implementation_steps', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('knowledge_check', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('source_attribution', sa.String(500), nullable=False),
            sa.Column('generation_method', sa.String(50), nullable=False),
            sa.Column('ai_provider', sa.String(50), server_default='ollama', nullable=True),
            sa.Column('ai_model', sa.String(50), server_default='qwen3:8b', nullable=True),
            sa.Column('latency_seconds', sa.Float(), nullable=True),
            sa.Column('generation_status', sa.String(50), server_default='completed', nullable=False),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        )
        op.create_index('idx_packets_step_owner', 'learning_step_packets', ['step_id', 'owner_user_id'])
        op.create_index('idx_packets_topic', 'learning_step_packets', ['topic_id'])


def downgrade() -> None:
    existing_tables = []
    if not context.is_offline_mode():
        conn = op.get_bind()
        if conn is not None:
            try:
                inspector = sa.inspect(conn)
                existing_tables = inspector.get_table_names()
                if 'learning_step_packets' not in existing_tables:
                    return
            except Exception:
                pass

    op.drop_index('idx_packets_topic', table_name='learning_step_packets')
    op.drop_index('idx_packets_step_owner', table_name='learning_step_packets')
    op.drop_table('learning_step_packets')
