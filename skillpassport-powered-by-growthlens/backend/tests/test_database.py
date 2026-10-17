import pytest
import uuid
from datetime import datetime, timezone
from backend.app.db.session import SessionLocal
from backend.app.models.taxonomy import CompetencyTaxonomy
from backend.app.models.connection import ConnectedSource
from backend.app.models.evidence import EvidenceItem
from backend.app.core.security import encrypt_credential


def test_database_session_and_taxonomy():
    db = SessionLocal()
    try:
        competencies = db.query(CompetencyTaxonomy).all()
        assert len(competencies) >= 8
        names = [c.canonical_name for c in competencies]
        assert "API Architecture & Design" in names
        assert "Distributed Systems & Event Streaming" in names
    finally:
        db.close()


def test_connected_source_model_creation():
    db = SessionLocal()
    test_user_id = uuid.uuid4()
    try:
        source = ConnectedSource(
            id=uuid.uuid4(),
            owner_user_id=test_user_id,
            provider="github",
            account_identity=f"test-user-{uuid.uuid4().hex[:6]}",
            connection_status="connected",
            encrypted_credentials=encrypt_credential("ghp_test123456789"),
            credential_key_version="v1",
            requested_scopes=["repo", "read:user"],
            granted_scopes=["repo", "read:user"],
        )
        db.add(source)
        db.commit()

        # Query back
        fetched = db.query(ConnectedSource).filter(ConnectedSource.id == source.id).first()
        assert fetched is not None
        assert fetched.provider == "github"
        assert fetched.owner_user_id == test_user_id

        # Clean up test source
        db.delete(fetched)
        db.commit()
    finally:
        db.close()


def test_evidence_item_model_creation():
    db = SessionLocal()
    test_user_id = uuid.uuid4()
    try:
        item = EvidenceItem(
            id=uuid.uuid4(),
            owner_user_id=test_user_id,
            source_provider="github",
            source_type="pull_request",
            external_record_id="101",
            source_name="skillpassport/backend",
            evidence_category="engineering",
            title="Implement resilient connection pooling",
            description="Added SQLAlchemy pool_pre_ping and timeout configs",
            extracted_excerpt="Added pool_pre_ping=True, max_overflow=10",
            observed_timestamp=datetime.now(timezone.utc),
            contributor_identity="alexchen",
            attribution_status="author",
            is_collaborative=False,
            project_name="SkillPassport",
            evidence_strength="high",
            extraction_confidence=0.92,
            verification_status="unreviewed",
            processing_status="ready_for_review",
            provenance={"repo": "skillpassport/backend", "pr_number": 101},
            normalized_metadata={"authorIdentified": "alexchen", "commitCount": 3},
            content_hash=uuid.uuid4().hex,
            model_version="qwen3:8b",
        )
        db.add(item)
        db.commit()

        fetched = db.query(EvidenceItem).filter(EvidenceItem.id == item.id).first()
        assert fetched is not None
        assert fetched.evidence_strength == "high"
        assert fetched.extraction_confidence == 0.92
        assert fetched.verification_status == "unreviewed"

        # Clean up
        db.delete(fetched)
        db.commit()
    finally:
        db.close()
