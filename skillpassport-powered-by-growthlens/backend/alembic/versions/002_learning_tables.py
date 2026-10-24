"""Add Domain 5 Learn & Grow Tables

Revision ID: 002_learning_tables
Revises: 001_initial_evidence_schema
Create Date: 2026-10-21 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002_learning_tables'
down_revision: Union[str, None] = '001_initial_evidence_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Learning Roadmaps
    op.create_table(
        'learning_roadmaps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('path_id', sa.String(100), nullable=False),
        sa.Column('domain_id', sa.String(100), nullable=False),
        sa.Column('domain_title', sa.String(255), nullable=False),
        sa.Column('blueprint_version', sa.String(50), server_default='v1.0', nullable=False),
        sa.Column('target_role_id', sa.String(100), nullable=True),
        sa.Column('target_role_title', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), server_default='in_progress', nullable=False),
        sa.Column('baseline_mastery', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('current_mastery', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('target_mastery', sa.Float(), server_default='85.0', nullable=False),
        sa.Column('estimated_total_hours', sa.Float(), server_default='12.0', nullable=False),
        sa.Column('total_steps', sa.Integer(), server_default='0', nullable=False),
        sa.Column('completed_steps', sa.Integer(), server_default='0', nullable=False),
        sa.Column('upstream_snapshot_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('upstream_snapshot_version', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('owner_user_id', 'domain_id', 'path_id', name='uq_owner_domain_path'),
    )
    op.create_index('idx_roadmaps_owner_user_id', 'learning_roadmaps', ['owner_user_id'])
    op.create_index('idx_roadmaps_path_id', 'learning_roadmaps', ['path_id'])
    op.create_index('idx_roadmaps_domain_id', 'learning_roadmaps', ['domain_id'])
    op.create_index('idx_roadmaps_owner_status', 'learning_roadmaps', ['owner_user_id', 'status'])

    # 2. Learning Steps
    op.create_table(
        'learning_steps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('roadmap_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('learning_roadmaps.id', ondelete='CASCADE'), nullable=False),
        sa.Column('step_id', sa.String(100), nullable=False),
        sa.Column('topic_id', sa.String(100), nullable=False),
        sa.Column('module_id', sa.String(100), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('learning_objective', sa.Text(), nullable=False),
        sa.Column('difficulty', sa.String(50), server_default='Intermediate', nullable=False),
        sa.Column('estimated_minutes', sa.Integer(), server_default='45', nullable=False),
        sa.Column('sequence_order', sa.Integer(), server_default='1', nullable=False),
        sa.Column('current_mastery', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('target_mastery', sa.Float(), server_default='80.0', nullable=False),
        sa.Column('prerequisite_ids', postgresql.JSONB(), server_default='[]', nullable=False),
        sa.Column('prerequisites_met', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('status', sa.String(50), server_default='available', nullable=False),
        sa.Column('recommendation_reason', sa.Text(), nullable=False),
        sa.Column('recommended_resource_ids', postgresql.JSONB(), server_default='[]', nullable=False),
        sa.Column('practice_exercise_ids', postgresql.JSONB(), server_default='[]', nullable=False),
        sa.Column('assessment_id', sa.String(100), nullable=True),
        sa.Column('project_id', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('roadmap_id', 'step_id', name='uq_roadmap_step'),
    )
    op.create_index('idx_steps_roadmap_id', 'learning_steps', ['roadmap_id'])
    op.create_index('idx_steps_step_id', 'learning_steps', ['step_id'])
    op.create_index('idx_steps_roadmap_order', 'learning_steps', ['roadmap_id', 'sequence_order'])

    # 3. Learning Resources
    op.create_table(
        'learning_resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resource_id', sa.String(255), nullable=False, unique=True),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('associated_skills', postgresql.JSONB(), server_default='[]', nullable=False),
        sa.Column('difficulty', sa.String(50), server_default='Intermediate', nullable=False),
        sa.Column('learning_objective', sa.Text(), nullable=True),
        sa.Column('prerequisites', postgresql.JSONB(), server_default='[]', nullable=False),
        sa.Column('provider_metadata', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('relevance_score', sa.Float(), server_default='0.85', nullable=False),
        sa.Column('is_validated', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_resources_resource_id', 'learning_resources', ['resource_id'])
    op.create_index('idx_resources_provider', 'learning_resources', ['provider'])

    # 4. Learning Attempts
    op.create_table(
        'learning_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('step_id', sa.String(100), nullable=False),
        sa.Column('roadmap_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('learning_roadmaps.id', ondelete='SET NULL'), nullable=True),
        sa.Column('attempt_type', sa.String(50), nullable=False),
        sa.Column('activity_id', sa.String(100), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('passed', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('signals', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('computed_mastery', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('attempt_metadata', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_attempts_owner_user_id', 'learning_attempts', ['owner_user_id'])
    op.create_index('idx_attempts_step_id', 'learning_attempts', ['step_id'])
    op.create_index('idx_attempts_roadmap_id', 'learning_attempts', ['roadmap_id'])
    op.create_index('idx_attempts_owner_type', 'learning_attempts', ['owner_user_id', 'attempt_type'])

    # 5. Learning Mastery Snapshots
    op.create_table(
        'learning_mastery_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('domain_id', sa.String(100), nullable=False),
        sa.Column('skill_id', sa.String(100), nullable=False),
        sa.Column('canonical_name', sa.String(255), nullable=False),
        sa.Column('mastery_score', sa.Float(), nullable=False),
        sa.Column('knowledge_signal', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('practice_signal', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('assessment_signal', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('project_signal', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_mastery_snapshots_owner', 'learning_mastery_snapshots', ['owner_user_id'])
    op.create_index('idx_mastery_snapshots_domain', 'learning_mastery_snapshots', ['domain_id'])
    op.create_index('idx_mastery_snapshots_skill', 'learning_mastery_snapshots', ['skill_id'])
    op.create_index('idx_mastery_snapshots_owner_skill', 'learning_mastery_snapshots', ['owner_user_id', 'skill_id', 'recorded_at'])


def downgrade() -> None:
    op.drop_table('learning_mastery_snapshots')
    op.drop_table('learning_attempts')
    op.drop_table('learning_resources')
    op.drop_table('learning_steps')
    op.drop_table('learning_roadmaps')

