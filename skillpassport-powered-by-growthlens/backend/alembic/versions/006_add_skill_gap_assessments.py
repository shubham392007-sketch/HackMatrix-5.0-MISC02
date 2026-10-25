"""Add skill_gap_assessments table for Domain 5 Learn & Grow (Phase 9)

Revision ID: 006_add_skill_gap_assessments
Revises: 005_career_and_profile_tables
Create Date: 2026-10-23 17:55:00.000000

"""
from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '006_add_skill_gap_assessments'
down_revision: Union[str, None] = '005_career_and_profile_tables'
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

    if 'skill_gap_assessments' not in existing_tables:
        op.create_table(
            'skill_gap_assessments',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('skill_id', sa.String(100), nullable=False),
            sa.Column('canonical_name', sa.String(255), nullable=False),
            sa.Column('target_role_id', sa.String(100), nullable=False),
            sa.Column('target_role_title', sa.String(255), nullable=False),
            sa.Column('gap_id', sa.String(100), nullable=False),
            sa.Column('gap_type', sa.String(50), server_default='depth_gap', nullable=False),
            sa.Column('required_proficiency', sa.String(50), server_default='Practitioner', nullable=False),
            sa.Column('current_proficiency', sa.String(50), server_default='Not Established', nullable=False),
            sa.Column('proficiency_distance', sa.Integer(), server_default='1', nullable=False),
            sa.Column('evidence_sufficiency', sa.String(50), server_default='evidence_gap', nullable=False),
            sa.Column('confidence_score', sa.Float(), server_default='0.75', nullable=False),
            sa.Column('assessment_rationale', sa.Text(), nullable=False),
            sa.Column('requirement_sources', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('supporting_evidence', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('contradicting_evidence', postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column('analysis_run_id', sa.String(100), nullable=False),
            sa.Column('ai_provider', sa.String(50), server_default='ollama_qwen', nullable=False),
            sa.Column('ai_model', sa.String(50), server_default='qwen3:8b', nullable=False),
            sa.Column('prompt_version', sa.String(50), server_default='v1.0', nullable=False),
            sa.Column('validation_status', sa.String(50), server_default='passed', nullable=False),
            sa.Column('is_human_reviewed', sa.Boolean(), server_default='false', nullable=False),
            sa.Column(
                'roadmap_id',
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey('learning_roadmaps.id', ondelete='SET NULL'),
                nullable=True,
            ),
            sa.Column('roadmap_path_id', sa.String(100), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )

        op.create_index('idx_gap_asmt_owner_user_id', 'skill_gap_assessments', ['owner_user_id'])
        op.create_index('idx_gap_asmt_skill_id', 'skill_gap_assessments', ['skill_id'])
        op.create_index('idx_gap_asmt_target_role_id', 'skill_gap_assessments', ['target_role_id'])
        op.create_index('idx_gap_asmt_gap_id', 'skill_gap_assessments', ['gap_id'])
        op.create_index('idx_gap_asmt_owner_skill_role', 'skill_gap_assessments', ['owner_user_id', 'skill_id', 'target_role_id'])


def downgrade() -> None:
    if not context.is_offline_mode():
        conn = op.get_bind()
        if conn is not None:
            try:
                inspector = sa.inspect(conn)
                existing_tables = inspector.get_table_names()
                if 'skill_gap_assessments' not in existing_tables:
                    return
            except Exception:
                pass

    op.drop_table('skill_gap_assessments')
