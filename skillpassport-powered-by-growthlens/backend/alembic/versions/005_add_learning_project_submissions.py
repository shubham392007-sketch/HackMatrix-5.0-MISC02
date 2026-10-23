"""Add learning_project_submissions table for Domain 5 Learn & Grow

Revision ID: 005_add_learning_project_submissions
Revises: 004_add_career_intelligence_tables
Create Date: 2026-10-23 16:36:00.000000

"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005_add_learning_project_submissions'
down_revision: Union[str, None] = '004_add_career_intelligence_tables'
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

    if 'learning_project_submissions' not in existing_tables:
        op.create_table(
            'learning_project_submissions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('project_id', sa.String(100), nullable=False),
            sa.Column('step_id', sa.String(100), nullable=True),
            sa.Column(
                'roadmap_id',
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey('learning_roadmaps.id', ondelete='SET NULL'),
                nullable=True,
            ),
            sa.Column('github_repo_url', sa.String(500), nullable=False),
            sa.Column('summary_notes', sa.Text(), nullable=True),
            sa.Column('status', sa.String(50), server_default='submitted', nullable=False),
            sa.Column('score', sa.Float(), nullable=True),
            sa.Column('passed', sa.Boolean(), nullable=True),
            sa.Column('feedback', sa.Text(), nullable=True),
            sa.Column('rubric_scores', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('submission_metadata', postgresql.JSONB(), server_default='{}', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )

        op.create_index('idx_project_submissions_owner_user_id', 'learning_project_submissions', ['owner_user_id'])
        op.create_index('idx_project_submissions_project_id', 'learning_project_submissions', ['project_id'])
        op.create_index('idx_project_submissions_step_id', 'learning_project_submissions', ['step_id'])
        op.create_index('idx_project_submissions_roadmap_id', 'learning_project_submissions', ['roadmap_id'])
        op.create_index('idx_project_submissions_owner_proj', 'learning_project_submissions', ['owner_user_id', 'project_id'])


def downgrade() -> None:
    if not context.is_offline_mode():
        conn = op.get_bind()
        if conn is not None:
            try:
                inspector = sa.inspect(conn)
                existing_tables = inspector.get_table_names()
                if 'learning_project_submissions' not in existing_tables:
                    return
            except Exception:
                pass

    op.drop_table('learning_project_submissions')
