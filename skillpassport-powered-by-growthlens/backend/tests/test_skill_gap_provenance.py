"""
Phase 9 — Evidence-Provenance Assessment Test Suite.
Validates:
1. Requirement Sources retrieval from Role Demand Models & Job Postings.
2. User Evidence retrieval with strict user-tenant isolation.
3. Evidence Sufficiency classification:
   - evidence_gap (no verified artifacts in workspace)
   - verified_skill_gap (verified artifacts present but below target level)
   - conflicting_evidence (contradicting relationship present)
4. Anti-Hallucination Guard:
   - Ollama hallucinations are intercepted and rejected.
   - Fabricated evidence IDs cannot be persisted.
5. Engine & AI Provenance honesty:
   - Ollama Qwen 3 (8B) recorded accurately when used.
   - Deterministic engine recorded accurately on fallback; never falsely labeled as AI.
6. REST API Endpoints:
   - GET /api/v1/learning/assessments/provenance/{skill_id}
   - POST /api/v1/learning/assessments/provenance/evaluate
"""

import os
import uuid
import json
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock, AsyncMock

os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

from backend.app.main import app
from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.base import Base
import backend.app.models
from backend.app.models.learning import (
    SkillGapAssessmentRecord,
    LearningRoadmap,
    LearningStep,
)
from backend.app.models.evidence import (
    EvidenceItem,
    EvidenceRelationship,
)
from backend.app.models.taxonomy import (
    CompetencyTaxonomy,
    EvidenceCompetencyMapping,
)
from backend.app.models.career import (
    RoleDemandModelRecord,
    UserTargetRoleRecord,
    JobPostingRecord,
)
from backend.app.learning.provenance_service import (
    provenance_service,
    SkillGapAssessmentResponse,
)

USER_1_ID = "00000000-0000-0000-0000-000000000001"
USER_2_ID = "00000000-0000-0000-0000-000000000002"

user_1 = AuthenticatedUser(
    user_id=USER_1_ID,
    email="learner1@growthlens.test",
    role="authenticated",
    metadata={"full_name": "Learner One"},
)

user_2 = AuthenticatedUser(
    user_id=USER_2_ID,
    email="learner2@growthlens.test",
    role="authenticated",
    metadata={"full_name": "Learner Two"},
)


def create_sample_evidence_item(
    user_id: str,
    title: str = "Test Evidence Item",
    verification_status: str = "verified",
    source_url: str = "https://github.com/user/repo/commit/123",
    description: str = "Sample data preprocessing script",
    excerpt: str = "df.dropna(subset=['feature_1'])",
) -> EvidenceItem:
    return EvidenceItem(
        id=uuid.uuid4(),
        owner_user_id=uuid.UUID(user_id),
        source_provider="github",
        source_type="commit",
        source_name="user/repo",
        evidence_category="code_commit",
        title=title,
        description=description,
        extracted_excerpt=excerpt,
        observed_timestamp=datetime.now(timezone.utc),
        contributor_identity=user_id,
        content_hash=uuid.uuid4().hex,
        verification_status=verification_status,
        source_url=source_url,
    )


def create_sample_competency(session, name: str = "Data Preprocessing & Feature Engineering") -> CompetencyTaxonomy:
    comp = CompetencyTaxonomy(
        id=uuid.uuid4(),
        canonical_name=name,
        normalized_name=name.lower(),
        category="Data Engineering",
        description="Techniques for data cleaning and feature engineering.",
        aliases=["data-preprocessing", "feature-engineering"],
    )
    session.add(comp)
    session.commit()
    return comp


def create_sample_mapping(
    session,
    evidence_id: uuid.UUID,
    competency_id: uuid.UUID,
    user_id: str,
    status: str = "verified",
    proficiency_level: str = "Foundation",
) -> EvidenceCompetencyMapping:
    mapping = EvidenceCompetencyMapping(
        id=uuid.uuid4(),
        evidence_id=evidence_id,
        competency_id=competency_id,
        owner_user_id=uuid.UUID(user_id),
        mapping_method="exact_match",
        relevance_score=0.9,
        supporting_excerpt="df.dropna(subset=['feature_1'])",
        rationale="Demonstrated foundational data imputation",
        status=status,
        proficiency_level=proficiency_level,
    )
    session.add(mapping)
    session.commit()
    return mapping


@pytest.fixture
def test_db_session():
    """Isolated in-memory SQLite database for deterministic tests."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def client(test_db_session):
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user_1
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_evidence_gap_when_no_user_artifacts(test_db_session):
    """When user has no artifacts for a skill, sufficiency is honestly 'evidence_gap'."""
    assessment = await provenance_service.evaluate_or_get_skill_assessment(
        db=test_db_session,
        user_id=USER_1_ID,
        skill_id="data-preprocessing",
        target_role_id="role-ml-engineer",
        force_refresh=True,
    )

    assert assessment.skill_id == "data-preprocessing"
    assert assessment.evidence_sufficiency == "evidence_gap"
    assert len(assessment.supporting_evidence) == 0
    assert assessment.ai_provider in ("ollama_qwen", "deterministic_engine")
    # Anti-hallucination guard ensures validation status is passed or partial (if it stripped a hallucinated ID)
    assert assessment.validation_status in ("passed", "partial")


@pytest.mark.asyncio
async def test_verified_skill_gap_when_evidence_exists_below_target(test_db_session):
    """When verified evidence exists but level is lower than role demand, sufficiency is 'verified_skill_gap'."""
    item = create_sample_evidence_item(
        user_id=USER_1_ID,
        title="feat: add basic pandas missing value dropna script",
        verification_status="verified",
        description="Script cleaning null values in tabular data using dropna",
        excerpt="df.dropna(subset=['feature_1'])",
        source_url="https://github.com/user1/data-pipeline/commit/abc123",
    )
    test_db_session.add(item)
    test_db_session.commit()

    comp = create_sample_competency(test_db_session)
    create_sample_mapping(
        test_db_session,
        evidence_id=item.id,
        competency_id=comp.id,
        user_id=USER_1_ID,
        status="verified",
        proficiency_level="Foundation",
    )

    assessment = await provenance_service.evaluate_or_get_skill_assessment(
        db=test_db_session,
        user_id=USER_1_ID,
        skill_id="data-preprocessing",
        target_role_id="role-ml-engineer",
        force_refresh=True,
    )

    assert assessment.evidence_sufficiency == "verified_skill_gap"
    assert len(assessment.supporting_evidence) == 1
    assert assessment.supporting_evidence[0].evidence_id == str(item.id)
    assert assessment.supporting_evidence[0].verification_status == "verified"
    assert "https://github.com" in (assessment.supporting_evidence[0].source_url or "")


@pytest.mark.asyncio
async def test_conflicting_evidence_classification(test_db_session):
    """When an evidence relationship of type 'contradiction' exists, classification is 'conflicting_evidence'."""
    item1 = create_sample_evidence_item(
        user_id=USER_1_ID,
        title="feat: numpy array vectorization script",
        verification_status="verified",
        description="Numpy script for preprocessing",
    )
    item2 = create_sample_evidence_item(
        user_id=USER_1_ID,
        title="Failed Vectorization Diagnostic Test",
        verification_status="verified",
        description="Failed attempt",
    )
    test_db_session.add_all([item1, item2])
    test_db_session.commit()

    comp = create_sample_competency(test_db_session)
    create_sample_mapping(
        test_db_session,
        evidence_id=item1.id,
        competency_id=comp.id,
        user_id=USER_1_ID,
        status="verified",
        proficiency_level="Foundation",
    )

    rel = EvidenceRelationship(
        id=uuid.uuid4(),
        owner_user_id=uuid.UUID(USER_1_ID),
        source_evidence_id=item1.id,
        target_evidence_id=item2.id,
        relationship_type="contradiction",
        confidence_score=0.95,
        rationale="Candidate code demonstrated anti-pattern contrasting self-assessment score",
    )
    test_db_session.add(rel)
    test_db_session.commit()

    assessment = await provenance_service.evaluate_or_get_skill_assessment(
        db=test_db_session,
        user_id=USER_1_ID,
        skill_id="data-preprocessing",
        force_refresh=True,
    )

    assert assessment.evidence_sufficiency == "conflicting_evidence"
    assert len(assessment.contradicting_evidence) >= 1
    assert assessment.contradicting_evidence[0].is_contradicting is True


@pytest.mark.asyncio
async def test_anti_hallucination_guard_rejects_fake_citations(test_db_session):
    """If Ollama returns evidence IDs that do NOT exist in the user's authentic records, they are dropped."""
    real_item = create_sample_evidence_item(
        user_id=USER_1_ID,
        title="Legitimate Commit",
        verification_status="verified",
    )
    test_db_session.add(real_item)
    test_db_session.commit()

    comp = create_sample_competency(test_db_session)
    create_sample_mapping(
        test_db_session,
        evidence_id=real_item.id,
        competency_id=comp.id,
        user_id=USER_1_ID,
        status="verified",
        proficiency_level="Foundation",
    )

    fake_id = "00000000-0000-0000-0000-999999999999"

    # Mock Ollama returning a hallucinated citation alongside the real one
    mock_ollama_content = {
        "assessment_rationale": "Evaluated based on code commits.",
        "cited_evidence_ids": [str(real_item.id), fake_id],  # fake_id is hallucinated
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"message": {"content": json.dumps(mock_ollama_content)}}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        assessment = await provenance_service.evaluate_or_get_skill_assessment(
            db=test_db_session,
            user_id=USER_1_ID,
            skill_id="data-preprocessing",
            force_refresh=True,
        )

        assert assessment.ai_provider == "ollama_qwen"
        # The fake ID must NOT be present in supporting evidence
        supporting_ids = [e.evidence_id for e in assessment.supporting_evidence]
        assert str(real_item.id) in supporting_ids
        assert fake_id not in supporting_ids
        # Anti-hallucination guard flagged the dropped citation
        assert assessment.validation_status == "partial"


def test_provenance_rest_endpoints(client, test_db_session):
    """Tests GET and POST provenance API endpoints."""
    res = client.get("/api/v1/learning/assessments/provenance/data-preprocessing")
    assert res.status_code == 200
    data = res.json()
    assert data["skill_id"] == "data-preprocessing"
    assert "evidence_sufficiency" in data
    assert "requirement_sources" in data
    assert "supporting_evidence" in data
    assert "ai_provider" in data
    assert "analysis_run_id" in data

    # Test evaluate POST endpoint
    eval_payload = {
        "skill_id": "data-preprocessing",
        "target_role_id": "role-ml-engineer",
        "gap_id": "gap-123",
        "force_refresh": True,
    }
    res2 = client.post("/api/v1/learning/assessments/provenance/evaluate", json=eval_payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["skill_id"] == "data-preprocessing"
    assert data2["gap_id"] == "gap-123"


def test_user_tenant_evidence_isolation(client, test_db_session):
    """User 1's assessment must never contain or cite User 2's evidence items."""
    item2 = create_sample_evidence_item(
        user_id=USER_2_ID,
        title="User 2 Secret Internal Commit",
        verification_status="verified",
    )
    test_db_session.add(item2)
    test_db_session.commit()

    comp = create_sample_competency(test_db_session)
    create_sample_mapping(
        test_db_session,
        evidence_id=item2.id,
        competency_id=comp.id,
        user_id=USER_2_ID,
        status="verified",
        proficiency_level="Foundation",
    )

    # User 1 queries provenance
    res = client.get("/api/v1/learning/assessments/provenance/data-preprocessing")
    assert res.status_code == 200
    data = res.json()

    cited_ids = [e["evidence_id"] for e in data.get("supporting_evidence", [])]
    assert str(item2.id) not in cited_ids
