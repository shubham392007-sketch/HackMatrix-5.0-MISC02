"""Initial Domain 1 Evidence Ingestion and Intelligence Schema

Revision ID: 001_initial_evidence_schema
Revises: 
Create Date: 2026-10-12 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial_evidence_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Connected Sources
    op.create_table(
        'connected_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('account_identity', sa.String(255), nullable=False),
        sa.Column('connection_status', sa.String(50), nullable=False, server_default='connected'),
        sa.Column('encrypted_credentials', sa.Text(), nullable=False),
        sa.Column('credential_key_version', sa.String(20), nullable=False, server_default='v1'),
        sa.Column('requested_scopes', postgresql.JSONB(), server_default='[]', nullable=True),
        sa.Column('granted_scopes', postgresql.JSONB(), server_default='[]', nullable=True),
        sa.Column('connection_metadata', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('latest_error_summary', sa.Text(), nullable=True),
        sa.Column('disconnected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('owner_user_id', 'provider', 'account_identity', name='uq_owner_provider_identity'),
    )
    op.create_index('idx_connected_sources_owner_status', 'connected_sources', ['owner_user_id', 'connection_status'])

    # 2. Selected Resources (repos, Jira projects)
    op.create_table(
        'selected_resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('connected_sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('external_resource_id', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('is_selected', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('content_categories', postgresql.JSONB(), server_default='[]', nullable=True),
        sa.Column('last_synced_cursor', sa.String(255), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('access_warning', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('connection_id', 'external_resource_id', name='uq_conn_resource'),
    )

    # 3. Source Sync Runs
    op.create_table(
        'source_sync_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('connected_sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('trigger_type', sa.String(50), server_default='manual', nullable=False),
        sa.Column('status', sa.String(50), server_default='running', nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('records_discovered', sa.Integer(), server_default='0', nullable=False),
        sa.Column('records_imported', sa.Integer(), server_default='0', nullable=False),
        sa.Column('records_skipped', sa.Integer(), server_default='0', nullable=False),
        sa.Column('records_duplicated', sa.Integer(), server_default='0', nullable=False),
        sa.Column('records_failed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('selected_resources_snapshot', postgresql.JSONB(), server_default='[]', nullable=True),
        sa.Column('resource_outcomes', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('error_summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_sync_runs_owner', 'source_sync_runs', ['owner_user_id', 'created_at'])

    # 4. Raw Source Records
    op.create_table(
        'raw_source_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sync_run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('source_sync_runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('record_type', sa.String(50), nullable=False),
        sa.Column('external_record_id', sa.String(255), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('content_hash', sa.String(64), nullable=False),
        sa.Column('raw_payload', postgresql.JSONB(), nullable=False),
        sa.Column('storage_key', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('owner_user_id', 'provider', 'record_type', 'external_record_id', name='uq_raw_record'),
    )
    op.create_index('idx_raw_records_lookup', 'raw_source_records', ['owner_user_id', 'provider', 'record_type'])

    # 5. Uploaded Documents
    op.create_table(
        'uploaded_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('sha256_hash', sa.String(64), nullable=False),
        sa.Column('evidence_category', sa.String(50), nullable=False),
        sa.Column('user_metadata', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('storage_bucket', sa.String(100), server_default='evidence-originals', nullable=False),
        sa.Column('private_storage_key', sa.String(512), nullable=False, unique=True),
        sa.Column('document_version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('processing_state', sa.String(50), server_default='queued', nullable=False),
        sa.Column('extraction_summary', sa.Text(), nullable=True),
        sa.Column('error_summary', sa.Text(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_uploaded_docs_owner_hash', 'uploaded_documents', ['owner_user_id', 'sha256_hash'])
    op.create_index('idx_uploaded_docs_owner_state', 'uploaded_documents', ['owner_user_id', 'processing_state'])

    # 6. Document Chunks
    op.create_table(
        'document_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('uploaded_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('page_or_slide_number', sa.Integer(), nullable=False),
        sa.Column('section_title', sa.String(255), nullable=True),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('original_text', sa.Text(), nullable=False),
        sa.Column('normalized_text', sa.Text(), nullable=False),
        sa.Column('char_offset_start', sa.Integer(), nullable=True),
        sa.Column('char_offset_end', sa.Integer(), nullable=True),
        sa.Column('extraction_method', sa.String(50), nullable=False),
        sa.Column('chunk_hash', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_doc_chunks_doc_page', 'document_chunks', ['document_id', 'page_or_slide_number'])

    # 7. Ingestion Jobs
    op.create_table(
        'ingestion_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('uploaded_documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('sync_run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('source_sync_runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('job_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), server_default='QUEUED', nullable=False),
        sa.Column('current_stage', sa.String(50), server_default='QUEUED', nullable=False),
        sa.Column('progress_percentage', sa.Integer(), server_default='0', nullable=False),
        sa.Column('attempt_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('max_attempts', sa.Integer(), server_default='3', nullable=False),
        sa.Column('is_retryable', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('idempotency_key', sa.String(128), nullable=False, unique=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_code', sa.String(100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('stage_metadata', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_ingestion_jobs_owner_status', 'ingestion_jobs', ['owner_user_id', 'status'])
    op.create_index('idx_ingestion_jobs_created', 'ingestion_jobs', ['created_at'])

    # 8. Processing Events
    op.create_table(
        'processing_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ingestion_jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stage', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('detail', sa.Text(), nullable=False),
        sa.Column('event_timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('metadata_snapshot', postgresql.JSONB(), server_default='{}', nullable=True),
    )
    op.create_index('idx_processing_events_job_time', 'processing_events', ['job_id', 'event_timestamp'])

    # 9. Evidence Items
    op.create_table(
        'evidence_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_provider', sa.String(50), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('external_record_id', sa.String(255), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('source_name', sa.String(255), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('uploaded_documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('raw_record_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('raw_source_records.id', ondelete='SET NULL'), nullable=True),
        sa.Column('evidence_category', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('extracted_excerpt', sa.Text(), nullable=False),
        sa.Column('extracted_summary', sa.Text(), nullable=True),
        sa.Column('observed_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ingestion_timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('contributor_identity', sa.String(255), nullable=False),
        sa.Column('attribution_status', sa.String(50), server_default='contributor', nullable=False),
        sa.Column('is_collaborative', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('project_name', sa.String(255), server_default='', nullable=False),
        sa.Column('evidence_strength', sa.String(20), server_default='medium', nullable=False),
        sa.Column('extraction_confidence', sa.Float(), server_default='0.85', nullable=False),
        sa.Column('verification_status', sa.String(50), server_default='unreviewed', nullable=False),
        sa.Column('processing_status', sa.String(50), server_default='ready_for_review', nullable=False),
        sa.Column('provenance', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('normalized_metadata', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('content_hash', sa.String(64), nullable=False),
        sa.Column('model_version', sa.String(50), server_default='qwen3:8b', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_evidence_owner_status', 'evidence_items', ['owner_user_id', 'processing_status'])
    op.create_index('idx_evidence_owner_verification', 'evidence_items', ['owner_user_id', 'verification_status'])
    op.create_index('idx_evidence_owner_observed', 'evidence_items', ['owner_user_id', 'observed_timestamp'])
    op.create_index('idx_evidence_hash', 'evidence_items', ['owner_user_id', 'content_hash'])

    # 10. Evidence Relationships (cross-source corroboration, duplicates)
    op.create_table(
        'evidence_relationships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_evidence_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_evidence_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('relationship_type', sa.String(50), nullable=False),
        sa.Column('confidence_score', sa.Float(), server_default='0.9', nullable=False),
        sa.Column('rationale', sa.Text(), nullable=False),
        sa.Column('is_reviewed', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('source_evidence_id', 'target_evidence_id', 'relationship_type', name='uq_evidence_rel'),
    )

    # 11. Competency Taxonomy
    op.create_table(
        'competency_taxonomy',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('canonical_name', sa.String(150), nullable=False, unique=True),
        sa.Column('normalized_name', sa.String(150), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('aliases', postgresql.JSONB(), server_default='[]', nullable=False),
        sa.Column('parent_competency_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('competency_taxonomy.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(50), server_default='active', nullable=False),
        sa.Column('taxonomy_version', sa.String(20), server_default='v1.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_taxonomy_canonical', 'competency_taxonomy', ['canonical_name'])
    op.create_index('idx_taxonomy_category', 'competency_taxonomy', ['category'])

    # 12. Evidence-to-Competency Mapping
    op.create_table(
        'evidence_competency_mappings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('evidence_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('competency_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('competency_taxonomy.id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mapping_method', sa.String(50), nullable=False),
        sa.Column('relevance_score', sa.Float(), server_default='0.85', nullable=False),
        sa.Column('supporting_excerpt', sa.Text(), nullable=False),
        sa.Column('rationale', sa.Text(), nullable=False),
        sa.Column('status', sa.String(50), server_default='candidate', nullable=False),
        sa.Column('proficiency_level', sa.String(50), server_default='Practitioner', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('evidence_id', 'competency_id', name='uq_evidence_competency'),
    )
    op.create_index('idx_mapping_owner_status', 'evidence_competency_mappings', ['owner_user_id', 'status'])

    # 13. Review & Audit Events
    op.create_table(
        'review_audit_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('actor_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_record_type', sa.String(50), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('previous_state', sa.String(100), nullable=True),
        sa.Column('new_state', sa.String(100), nullable=True),
        sa.Column('reason_note', sa.Text(), nullable=True),
        sa.Column('event_timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('audit_metadata', postgresql.JSONB(), server_default='{}', nullable=True),
    )
    op.create_index('idx_audit_actor_time', 'review_audit_events', ['actor_user_id', 'event_timestamp'])
    op.create_index('idx_audit_target_time', 'review_audit_events', ['target_record_id', 'event_timestamp'])

    # 14. Web Crawl Records
    op.create_table(
        'web_crawl_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ingestion_jobs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('submitted_url', sa.Text(), nullable=False),
        sa.Column('final_url', sa.Text(), nullable=False),
        sa.Column('page_title', sa.String(512), nullable=False),
        sa.Column('content_hash', sa.String(64), nullable=False),
        sa.Column('crawl_depth', sa.Integer(), server_default='0', nullable=False),
        sa.Column('http_status', sa.Integer(), server_default='200', nullable=False),
        sa.Column('extraction_status', sa.String(50), server_default='extracted', nullable=False),
        sa.Column('extracted_headings', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('cleaned_content', sa.Text(), nullable=False),
        sa.Column('discovered_links', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_web_crawl_owner_url', 'web_crawl_records', ['owner_user_id', 'submitted_url'])


def downgrade() -> None:
    op.drop_table('web_crawl_records')
    op.drop_table('review_audit_events')
    op.drop_table('evidence_competency_mappings')
    op.drop_table('competency_taxonomy')
    op.drop_table('evidence_relationships')
    op.drop_table('evidence_items')
    op.drop_table('processing_events')
    op.drop_table('ingestion_jobs')
    op.drop_table('document_chunks')
    op.drop_table('uploaded_documents')
    op.drop_table('raw_source_records')
    op.drop_table('source_sync_runs')
    op.drop_table('selected_resources')
    op.drop_table('connected_sources')
