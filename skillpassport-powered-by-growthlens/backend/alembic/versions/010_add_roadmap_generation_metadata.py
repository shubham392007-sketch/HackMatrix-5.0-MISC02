"""add roadmap generation metadata

Revision ID: 010_add_roadmap_gen_meta
Revises: 009_add_learning_activities
Create Date: 2026-10-24 19:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010_add_roadmap_gen_meta'
down_revision: Union[str, None] = '009_add_learning_activities'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table or check column existence to be safe for both Postgres and SQLite
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_cols = [c['name'] for c in insp.get_columns('learning_roadmaps')]

    if 'generation_method' not in existing_cols:
        op.add_column('learning_roadmaps', sa.Column('generation_method', sa.String(50), nullable=True, server_default='ollama_qwen'))
    if 'ai_model' not in existing_cols:
        op.add_column('learning_roadmaps', sa.Column('ai_model', sa.String(50), nullable=True, server_default='qwen3:8b'))
    if 'latency_seconds' not in existing_cols:
        op.add_column('learning_roadmaps', sa.Column('latency_seconds', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('learning_roadmaps', 'latency_seconds')
    op.drop_column('learning_roadmaps', 'ai_model')
    op.drop_column('learning_roadmaps', 'generation_method')
