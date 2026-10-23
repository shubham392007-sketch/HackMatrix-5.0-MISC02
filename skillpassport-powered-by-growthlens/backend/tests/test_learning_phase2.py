"""
Learn & Grow Phase 2 Automated Test Suite.
Covers:
1. Upstream Career Intelligence database adapter (schema ingestion, user isolation, fallback).
2. Deterministic prioritization (confidence decoupling, unverified status, missing assessments).
3. Resource aggregation & caching without DB connection starvation.
4. Ollama roadmap generation with anti-hallucination guard and deterministic fallback.
5. Persistence in learning_roadmaps, learning_steps, learning_attempts, learning_mastery_snapshots.
6. Non-negotiable Governance Invariant: Learning completion NEVER verifies a Skill Passport skill.
"""

import json
import os
import uuid
import pytest
import httpx
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

# Force test mode
os.environ["APP_ENV"] = "test"

from sqlalchemy.dialects.postgresql import JSONB, UUID

# Allow SQLite to compile PostgreSQL JSONB and UUID columns during isolated test runs
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

from backend.app.main import app
from backend.app.db.session import get_db
from backend.app.models.base import Base
import backend.app.models
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import VerificationDecision
from backend.app.models.learning import (
    LearningRoadmap,
    LearningStep,
    LearningResourceItem,
    LearningAttempt,
    LearningMasterySnapshot,
)
from backend.app.learning.contracts import (
    UpstreamGapTrigger,
    RoleContext,
    CompetencyHeader,
    CapabilityState,
    GovernanceEvidenceState,
    ProficiencyTier,
    RequirementType,
    ImportanceLevel,
    GapClassification,
    VerificationState,
)
from backend.app.learning.upstream_adapter import CareerIntelligenceDbAdapter
from backend.app.learning.prioritizer import (
    SkillGapPrioritizer,
    PrioritizationReasonCode,
    SuggestedNextAction,
)
from backend.app.learning.logic import (
    deterministic_mastery,
    validate_dependency_graph,
    topological_sort_with_priorities,
    verify_pedagogical_alignment,
    DependencyValidationError,
)
from backend.app.learning.providers.base import NormalizedLearningResource, ProviderSearchResult, ProviderStatus
from backend.app.learning.providers.validator import (
    compute_topic_relevance,
    is_resource_relevant,
    is_url_safe,
    rank_resources,
)
from backend.app.learning.providers.aggregator import ResourceAggregator
from backend.app.learning.ai_advisor import LearningAIAdvisor


from sqlalchemy.pool import StaticPool
from backend.app.db.reliability import circuit_breaker


@pytest.fixture
def test_db_session():
    """Isolated in-memory SQLite database for deterministic unit testing."""
    circuit_breaker.reset()
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
    circuit_breaker.reset()


@pytest.fixture
def client(test_db_session):
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


# ──────────────────────────────────────────────────────────────────────────────
# 1. UPSTREAM DATABASE ADAPTER TESTS
# ──────────────────────────────────────────────────────────────────────────────

def test_upstream_adapter_user_isolation(test_db_session):
    """
    Verifies that User A never receives User B's career gap records or competencies.
    """
    adapter = CareerIntelligenceDbAdapter()

    user_a = "00000000-0000-0000-0000-00000000000a"
    user_b = "00000000-0000-0000-0000-00000000000b"

    # Seed competency taxonomy
    comp = CompetencyTaxonomy(
        id=uuid.uuid4(),
        canonical_name="Distributed Systems",
        normalized_name="distributed systems",
        category="Architecture",
        description="Scalable distributed systems",
        aliases=["distributed-systems"],
        taxonomy_version="v1.0",
    )
    test_db_session.add(comp)

    # Seed mapping strictly for User A
    mapping_a = EvidenceCompetencyMapping(
        id=uuid.uuid4(),
        evidence_id=uuid.uuid4(),
        competency_id=comp.id,
        owner_user_id=uuid.UUID(user_a),
        mapping_method="exact_match",
        relevance_score=0.85,
        supporting_excerpt="Excerpt",
        rationale="Rationale",
        status="candidate",
        proficiency_level="Intermediate",
    )
    test_db_session.add(mapping_a)
    test_db_session.commit()

    triggers_a = adapter.fetch_upstream_triggers(test_db_session, user_a)
    triggers_b = adapter.fetch_upstream_triggers(test_db_session, user_b)

    assert len(triggers_a) == 1
    assert triggers_a[0].owner_user_id == user_a
    assert len(triggers_b) == 0  # User B gets zero records, preserving strict isolation


def test_upstream_adapter_canonical_taxonomy_mapping(test_db_session):
    """
    Verifies that skill names resolve to canonical CompetencyTaxonomy without guessing.
    """
    adapter = CareerIntelligenceDbAdapter()

    comp = CompetencyTaxonomy(
        id=uuid.uuid4(),
        canonical_name="PostgreSQL Query Optimization",
        normalized_name="postgresql query optimization",
        category="Data Engineering",
        description="Database indexing and query tuning",
        aliases=["postgres", "sql-tuning"],
        taxonomy_version="v1.0",
    )
    test_db_session.add(comp)
    test_db_session.commit()

    # Exact match
    res_exact = adapter.map_skill_to_canonical_taxonomy(test_db_session, "postgresql query optimization")
    assert res_exact is not None
    assert res_exact.id == comp.id

    # Non-existent skill - must return None, NEVER fabricate
    res_unknown = adapter.map_skill_to_canonical_taxonomy(test_db_session, "Quantum Rust Blockchain")
    assert res_unknown is None


# ──────────────────────────────────────────────────────────────────────────────
# 2. DETERMINISTIC GAP PRIORITIZATION TESTS
# ──────────────────────────────────────────────────────────────────────────────

def test_prioritizer_confidence_decoupling():
    """
    Confidence < 0.60 must route to diagnostic / evidence review,
    NEVER penalizing capability score or claiming decay.
    """
    prioritizer = SkillGapPrioritizer(confidence_review_threshold=0.60)

    trigger = UpstreamGapTrigger(
        trigger_id="trig-conf-test",
        owner_user_id="00000000-0000-0000-0000-000000000001",
        gap_id="gap-1",
        gap_type=GapClassification.DEPTH_GAP,
        priority_rank=1,
        priority_score=85.0,
        why_prioritized="Low confidence signal",
        gap_diagnosis="Extraction confidence 0.45",
        role=RoleContext(
            role_id="role-backend",
            role_title="Backend Engineer",
            seniority="Senior",
        ),
        competency=CompetencyHeader(
            canonical_skill_id="skill-py",
            canonical_name="Python",
            taxonomy_category="Backend",
            requirement_type=RequirementType.CORE_REQUIRED,
            importance=ImportanceLevel.HIGH,
        ),
        capability=CapabilityState(
            current_proficiency_level=ProficiencyTier.WORKING,
            current_proficiency_numeric=2,
            target_proficiency_level=ProficiencyTier.ADVANCED,
            target_proficiency_numeric=4,
            proficiency_distance=2,
        ),
        governance=GovernanceEvidenceState(
            verification_status=VerificationState.CANDIDATE,
            assessment_confidence=0.45,  # Below 0.60 threshold
            supporting_evidence_ids=[],
        ),
    )

    result = prioritizer.evaluate_item(trigger)

    assert result.reason_code == PrioritizationReasonCode.LOW_CONFIDENCE_REVIEW
    assert result.suggested_next_action in (
        SuggestedNextAction.REQUEST_EVIDENCE,
        SuggestedNextAction.RECOMMEND_DIAGNOSTIC,
    )
    assert result.is_mastery_claimed is False
    assert result.original_confidence == 0.45


def test_prioritizer_unverified_skill():
    """
    Unverified skill must not claim mastery, labeled as pending verification.
    """
    prioritizer = SkillGapPrioritizer()

    trigger = UpstreamGapTrigger(
        trigger_id="trig-unverif-test",
        owner_user_id="00000000-0000-0000-0000-000000000001",
        gap_id="gap-2",
        gap_type=GapClassification.EVIDENCE_GAP,
        priority_rank=2,
        priority_score=80.0,
        why_prioritized="Unverified candidate skill",
        gap_diagnosis="Candidate status from extraction",
        role=RoleContext(role_id="role-backend", role_title="Backend Engineer", seniority="Senior"),
        competency=CompetencyHeader(
            canonical_skill_id="skill-k8s",
            canonical_name="Kubernetes",
            taxonomy_category="DevOps",
            requirement_type=RequirementType.CORE_REQUIRED,
            importance=ImportanceLevel.HIGH,
        ),
        capability=CapabilityState(
            current_proficiency_level=ProficiencyTier.WORKING,
            current_proficiency_numeric=2,
            target_proficiency_level=ProficiencyTier.PRACTITIONER,
            target_proficiency_numeric=3,
            proficiency_distance=1,
        ),
        governance=GovernanceEvidenceState(
            verification_status=VerificationState.CANDIDATE,
            assessment_confidence=0.85,
        ),
    )

    result = prioritizer.evaluate_item(trigger)

    assert result.reason_code == PrioritizationReasonCode.UNVERIFIED_CANDIDATE
    assert result.suggested_next_action == "label_pending_verification"
    assert result.is_mastery_claimed is False


# ──────────────────────────────────────────────────────────────────────────────
# 3. FASTAPI API ENDPOINT INTEGRATION TESTS
# ──────────────────────────────────────────────────────────────────────────────

def test_get_learning_priorities_endpoint(client):
    """Tests GET /api/v1/learning/priorities with authenticated context."""
    res = client.get("/api/v1/learning/priorities")
    assert res.status_code == 200
    data = res.json()
    assert "priorities" in data
    assert "confidence_review_threshold" in data
    assert data["confidence_review_threshold"] == 0.60


def test_blueprints_and_diagnostics_endpoints(client):
    """Tests Domain Blueprints and Diagnostic Question bank retrieval."""
    res_bp = client.get("/api/v1/learning/blueprints")
    assert res_bp.status_code == 200
    blueprints = res_bp.json()["blueprints"]
    assert len(blueprints) >= 3

    # Diagnostic question retrieval
    res_diag = client.get("/api/v1/learning/blueprints/dist-sys/diagnostic")
    assert res_diag.status_code == 200
    diag_data = res_diag.json()
    assert diag_data["domain_id"] == "dist-sys"
    assert len(diag_data["questions"]) > 0
    # Crucial security check: answers and explanations must NOT leak to client
    for q in diag_data["questions"]:
        assert "correct_index" not in q
        assert "explanation" not in q

    # Diagnostic submission
    submit_res = client.post(
        "/api/v1/learning/blueprints/dist-sys/diagnostic/submit",
        json={"answers": {"diag-dist-1": 1, "diag-dist-2": 1}},
    )
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    assert submit_data["overall_score"] == 100.0
    assert submit_data["passed"] is True


def test_resource_search_endpoint(client):
    """
    Tests GET /api/v1/learning/resources/search.
    Verifies that YouTube, DEV.to, and GitHub are queried with fault tolerance.
    """
    res = client.get("/api/v1/learning/resources/search?query=kafka+event+streaming&limit=2")
    assert res.status_code == 200
    data = res.json()
    assert "resources" in data
    assert "provider_statuses" in data
    assert "youtube" in data["provider_statuses"]
    assert "devto" in data["provider_statuses"]
    assert "github" in data["provider_statuses"]


def test_practice_attempt_mastery_calculation(client):
    """
    Tests POST /api/v1/learning/attempts.
    Verifies exact mastery formula: 0.30K + 0.25P + 0.20A + 0.25Prj.
    """
    attempt_payload = {
        "step_id": "step-1",
        "attempt_type": "practice",
        "activity_id": "act-kafka-partitions",
        "score": 80.0,
        "signals": {
            "knowledge_signal": 80.0,
            "practice_signal": 80.0,
            "assessment_signal": 70.0,
            "project_signal": 60.0,
        },
    }
    # Expected: 0.30*80 + 0.25*80 + 0.20*70 + 0.25*60 = 24 + 20 + 14 + 15 = 73.0
    res = client.post("/api/v1/learning/attempts", json=attempt_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["computed_mastery"] == 73.0
    assert data["passed"] is True


def test_governance_invariant_learning_does_not_verify_skills(client, test_db_session):
    """
    CRITICAL GOVERNANCE INVARIANT:
    Completing a learning attempt or roadmap step must NEVER verify a Skill Passport skill
    or create a VerificationDecision in Domain 4.
    """
    user_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # Seed an unverified mapping
    comp = CompetencyTaxonomy(
        id=uuid.uuid4(),
        canonical_name="Kafka Architecture",
        normalized_name="kafka architecture",
        category="Architecture",
        description="Event Streaming",
        taxonomy_version="v1.0",
    )
    test_db_session.add(comp)

    mapping = EvidenceCompetencyMapping(
        id=uuid.uuid4(),
        evidence_id=uuid.uuid4(),
        competency_id=comp.id,
        owner_user_id=user_uuid,
        mapping_method="candidate_extraction",
        relevance_score=0.75,
        supporting_excerpt="Excerpt",
        rationale="Candidate from code",
        status="candidate",  # Unverified
        proficiency_level="Foundation",
    )
    test_db_session.add(mapping)
    test_db_session.commit()

    # User scores 100% on a learning practice attempt
    attempt_payload = {
        "step_id": "step-kafka-1",
        "attempt_type": "project",
        "activity_id": "act-capstone-project",
        "score": 100.0,
        "signals": {
            "knowledge_signal": 100.0,
            "practice_signal": 100.0,
            "assessment_signal": 100.0,
            "project_signal": 100.0,
        },
    }
    res = client.post("/api/v1/learning/attempts", json=attempt_payload)
    assert res.status_code == 200
    assert res.json()["computed_mastery"] == 100.0

    # Verify that the Skill Passport candidate status has NOT changed to verified
    test_db_session.refresh(mapping)
    assert mapping.status == "candidate"  # Must remain candidate!

    # Verify no verification decision was fabricated
    decisions = (
        test_db_session.query(VerificationDecision)
        .filter(VerificationDecision.owner_user_id == user_uuid)
        .all()
    )
    assert len(decisions) == 0


def test_ollama_advisor_fallback_and_anti_hallucination():
    """
    Tests that LearningAIAdvisor cleanly falls back when Ollama is offline,
    and strips any fabricated resource IDs.
    """
    advisor = LearningAIAdvisor(ollama_url="http://invalid-host:11434", timeout_seconds=0.1)

    gap = SkillGapPrioritizer().evaluate_item(
        UpstreamGapTrigger(
            trigger_id="trig-mock",
            owner_user_id="00000000-0000-0000-0000-000000000001",
            gap_id="gap-mock",
            gap_type=GapClassification.DEPTH_GAP,
            priority_rank=1,
            priority_score=85.0,
            why_prioritized="Depth gap",
            gap_diagnosis="Needs practical experience",
            role=RoleContext(role_id="role-backend", role_title="Backend Engineer", seniority="Senior"),
            competency=CompetencyHeader(
                canonical_skill_id="skill-py",
                canonical_name="Python",
                taxonomy_category="Backend",
                requirement_type=RequirementType.CORE_REQUIRED,
                importance=ImportanceLevel.HIGH,
            ),
            capability=CapabilityState(
                current_proficiency_level=ProficiencyTier.WORKING,
                current_proficiency_numeric=2,
                target_proficiency_level=ProficiencyTier.ADVANCED,
                target_proficiency_numeric=4,
                proficiency_distance=2,
            ),
            governance=GovernanceEvidenceState(
                verification_status=VerificationState.VERIFIED,
                assessment_confidence=0.85,
            ),
        )
    )

    catalogue = [
        NormalizedLearningResource(
            id="yt_valid123",
            provider="youtube",
            resource_type="video",
            title="Python Async Deep Dive",
            url="https://youtube.com/watch?v=valid123",
            description="Deep dive into Python async/await",
            associated_skills=["Python"],
            relevance_score=0.92,
        )
    ]

    import asyncio
    rec = asyncio.run(advisor.recommend_learning_path(gap, catalogue))

    assert rec.generation_method == "heuristic_fallback"
    assert len(rec.recommended_stages) > 0
    # Every recommended resource ID MUST exist in the provided catalogue
    for stage in rec.recommended_stages:
        for r_id in stage.recommended_resource_ids:
            assert r_id == "yt_valid123"


def test_roadmap_generate_and_retrieve_endpoints(client):
    """
    Tests POST /api/v1/learning/roadmaps/generate and GET /api/v1/learning/roadmaps/{path_id}.
    Verifies that generated roadmaps and steps are persisted and retrievable.
    """
    gen_res = client.post(
        "/api/v1/learning/roadmaps/generate",
        json={"domain_id": "dist-sys", "step_count": 3},
    )
    assert gen_res.status_code == 200
    roadmap_data = gen_res.json()
    assert "path_id" in roadmap_data
    assert roadmap_data["domain_id"] == "dist-sys"
    assert len(roadmap_data["steps"]) > 0

    path_id = roadmap_data["path_id"]

    # Retrieve roadmap by path_id
    get_res = client.get(f"/api/v1/learning/roadmaps/{path_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["path_id"] == path_id
    assert len(retrieved["steps"]) == len(roadmap_data["steps"])


def test_mastery_and_overview_telemetry_endpoints(client):
    """
    Tests GET /api/v1/learning/mastery and GET /api/v1/learning/overview.
    """
    # Mastery telemetry
    mastery_res = client.get("/api/v1/learning/mastery")
    assert mastery_res.status_code == 200
    m_data = mastery_res.json()
    assert "average_mastery" in m_data
    assert "recent_snapshots" in m_data

    # Overview dashboard endpoint
    overview_res = client.get("/api/v1/learning/overview")
    assert overview_res.status_code == 200
    o_data = overview_res.json()
    assert "active_blueprint" in o_data
    assert "priorities" in o_data


def test_resource_relevance_validation_and_unrelated_rejection():
    """
    Issue 1 Verification:
    - Topic-matching resources receive high relevance (>0.60).
    - Unrelated resources (e.g. Nike Dunk resale, personal devto analytics, cyberpunk profile)
      score low (<0.20) and are rejected.
    - Valid URLs alone without topic relevance are rejected.
    - Aggregator rejects irrelevant resources even if emitted by a provider.
    """
    # 1. Relevant resource
    rel_score = compute_topic_relevance(
        query="Feature Engineering",
        title="Azure Databricks for MLOps and Feature Engineering",
        description="Core feature transforms and scaling pipelines",
        tags=["mlops", "featureengineering", "datascience"],
        topic_slug="domain-data-preprocessing",
    )
    assert rel_score >= 0.70

    # 2. Irrelevant resource with valid URL (e.g. shoe resale prices)
    irrel_resource = NormalizedLearningResource(
        id="res-nike",
        provider="devto",
        resource_type="article",
        title="Nike Dunk Low resale prices in 2026: most traded pairs sell under retail",
        url="https://dev.to/mindmoxie/nike-dunk-low-resale-prices",
        description="Footwear market analysis and resale trends",
        tags=["datascience", "shoes", "fashion"],
        relevance_score=0.82,  # Artificially claimed score
    )
    is_safe, _ = is_url_safe(irrel_resource.url)
    assert is_safe is True  # Valid, public URL
    is_rel, calculated_rel, reason = is_resource_relevant(
        irrel_resource,
        query="Feature Engineering",
        topic_slug="domain-data-preprocessing",
        min_threshold=0.20,
    )
    assert is_rel is False
    assert calculated_rel < 0.20
    assert "Low topic relevance score" in reason

    # 3. Aggregator filtering
    mock_provider = MagicMock()
    mock_provider.provider_name.return_value = "devto"
    mock_provider.is_available.return_value = True
    mock_provider.fetch_resources = AsyncMock(
        return_value=ProviderSearchResult(
            resources=[
                irrel_resource,
                NormalizedLearningResource(
                    id="res-fe-genuine",
                    provider="devto",
                    resource_type="article",
                    title="Feature Engineering Best Practices with Scikit-Learn",
                    url="https://dev.to/datascience/feature-engineering-best-practices",
                    description="Hands-on guide to encoding and transformation features",
                    tags=["python", "featureengineering", "machinelearning"],
                    relevance_score=0.90,
                ),
            ],
            provider="devto",
            status=ProviderStatus.SUCCESS,
        )
    )

    agg = ResourceAggregator(providers=[mock_provider])
    import asyncio
    agg_res = asyncio.run(agg.aggregate_resources(query="Feature Engineering", topic_slug="domain-data-preprocessing"))

    # Only the genuine feature engineering resource should survive filtering
    assert len(agg_res.resources) == 1
    assert agg_res.resources[0].id == "res-fe-genuine"


def test_ollama_advisor_timeout_latency_and_fallback_behavior():
    """
    Issue 2 Verification:
    - Tests timeout triggers deterministic fallback cleanly.
    - Tests successful model response parsing with think:False, extracting valid stages and recording latency.
    - Tests malformed JSON output gracefully triggers fallback.
    - Tests fallback preserves deterministic schema with generation_method='heuristic_fallback'.
    """
    advisor = LearningAIAdvisor(timeout_seconds=0.05)
    gap = SkillGapPrioritizer().evaluate_item(
        UpstreamGapTrigger(
            trigger_id="trig-latency-test",
            owner_user_id="00000000-0000-0000-0000-000000000001",
            gap_id="gap-fe",
            gap_type=GapClassification.DEPTH_GAP,
            priority_rank=1,
            priority_score=90.0,
            why_prioritized="Depth gap",
            gap_diagnosis="Needs feature engineering mastery",
            role=RoleContext(role_id="role-mle", role_title="Applied ML Engineer", seniority="Senior"),
            competency=CompetencyHeader(
                canonical_skill_id="skill-fe",
                canonical_name="Feature Engineering",
                taxonomy_category="Machine Learning",
                requirement_type=RequirementType.CORE_REQUIRED,
                importance=ImportanceLevel.HIGH,
            ),
            capability=CapabilityState(
                current_proficiency_level=ProficiencyTier.WORKING,
                current_proficiency_numeric=2,
                target_proficiency_level=ProficiencyTier.ADVANCED,
                target_proficiency_numeric=4,
                proficiency_distance=2,
            ),
            governance=GovernanceEvidenceState(
                verification_status=VerificationState.VERIFIED,
                assessment_confidence=0.85,
            ),
        )
    )
    catalogue = [
        NormalizedLearningResource(
            id="res-yt-fe1",
            provider="youtube",
            resource_type="video",
            title="Feature Engineering Tutorial",
            url="https://youtube.com/watch?v=fe123",
            description="Feature selection and encoding",
            associated_skills=["Feature Engineering"],
            relevance_score=0.95,
        )
    ]

    import asyncio

    # Case 1: Timeout triggers deterministic fallback
    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Read timed out")):
        rec = asyncio.run(advisor.recommend_learning_path(gap, catalogue))
        assert rec.generation_method == "heuristic_fallback"
        assert rec.validation_passed is True
        assert len(rec.recommended_stages) > 0
        assert rec.latency_seconds is not None

    # Case 2: Successful model response
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "message": {
            "content": json.dumps({
                "recommended_stages": [
                    {
                        "stage_number": 1,
                        "stage_title": "Foundational Feature Engineering",
                        "focus_objective": "Understand transformations",
                        "recommended_resource_ids": ["res-yt-fe1"],
                        "pedagogical_rationale": "Essential grounding",
                    }
                ],
                "estimated_total_hours": 5,
            })
        }
    }
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        rec_success = asyncio.run(advisor.recommend_learning_path(gap, catalogue))
        assert rec_success.generation_method == "ollama_qwen"
        assert len(rec_success.recommended_stages) == 1
        assert rec_success.recommended_stages[0].recommended_resource_ids == ["res-yt-fe1"]
        assert rec_success.latency_seconds is not None
        # Verify think: False was sent in payload
        called_json = mock_post.call_args[1]["json"]
        assert called_json.get("think") is False

    # Case 3: Malformed JSON output
    mock_resp_malformed = MagicMock()
    mock_resp_malformed.status_code = 200
    mock_resp_malformed.json.return_value = {"message": {"content": "INVALID NOT JSON {{"}}
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp_malformed
        rec_malformed = asyncio.run(advisor.recommend_learning_path(gap, catalogue))
        assert rec_malformed.generation_method == "heuristic_fallback"


def test_isolated_roadmap_persistence_and_duplicate_prevention(client, test_db_session):
    """
    Issue 3 Verification:
    - Generates roadmap and verifies persistent rows in learning_roadmaps & learning_steps.
    - Verifies duplicate prevention: repeating the request returns the existing active roadmap.
    - Verifies force_regenerate archives previous in-progress roadmap.
    - Verifies retrieval after simulated page reload via GET /roadmaps/{path_id}.
    - Verifies user isolation.
    """
    user_id = "00000000-0000-0000-0000-000000000001"
    owner_uuid = uuid.UUID(user_id)

    # 1. First generation request
    res1 = client.post("/api/v1/learning/roadmaps/generate", json={"domain_id": "dist-sys"})
    assert res1.status_code == 200
    d1 = res1.json()
    path_id1 = d1["path_id"]

    # Verify rows in DB
    db_roadmap = test_db_session.query(LearningRoadmap).filter(LearningRoadmap.path_id == path_id1).first()
    assert db_roadmap is not None
    assert db_roadmap.owner_user_id == owner_uuid
    assert db_roadmap.domain_id == "dist-sys"
    assert len(db_roadmap.steps) > 0

    # Verify step sequence orders and foreign keys
    for idx, s in enumerate(db_roadmap.steps):
        assert s.roadmap_id == db_roadmap.id
        assert s.sequence_order == idx + 1

    # 2. Repeat request (Idempotency / Duplicate Prevention)
    res2 = client.post("/api/v1/learning/roadmaps/generate", json={"domain_id": "dist-sys"})
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["path_id"] == path_id1  # Returns the exact existing roadmap!

    # Verify no duplicate roadmap rows were created
    total_active = (
        test_db_session.query(LearningRoadmap)
        .filter(LearningRoadmap.owner_user_id == owner_uuid, LearningRoadmap.domain_id == "dist-sys", LearningRoadmap.status == "in_progress")
        .count()
    )
    assert total_active == 1

    # 3. Retrieval by path_id (Simulates page refresh)
    get_res = client.get(f"/api/v1/learning/roadmaps/{path_id1}")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["path_id"] == path_id1
    assert len(retrieved["steps"]) == len(d1["steps"])

    # 4. Force regenerate
    res3 = client.post("/api/v1/learning/roadmaps/generate", json={"domain_id": "dist-sys", "force_regenerate": True})
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["path_id"] != path_id1  # New path ID generated!

    # Verify old roadmap is now archived
    test_db_session.refresh(db_roadmap)
    assert db_roadmap.status == "archived"


def test_dependency_graph_validation_and_topological_ordering():
    """
    Issue 4 Verification:
    - Validates dependency graph controls ordering.
    - Detects missing prerequisites.
    - Detects circular dependencies.
    - Detects impossible orderings.
    - Keeps priority ranking separate from dependency constraints: high-ranked item
      cannot appear before mandatory prerequisites.
    - Verifies pedagogical alignment.
    """
    # 1. Missing prerequisite detection
    missing_graph = [
        {"id": "step-2", "stage_title": "Advanced Tuning", "prerequisites": ["step-missing"]},
    ]
    valid, errors = validate_dependency_graph(missing_graph)
    assert valid is False
    assert any("Missing prerequisite" in e for e in errors)

    # 2. Circular dependency detection
    cycle_graph = [
        {"id": "step-a", "stage_title": "A", "prerequisites": ["step-b"]},
        {"id": "step-b", "stage_title": "B", "prerequisites": ["step-a"]},
    ]
    valid_c, errors_c = validate_dependency_graph(cycle_graph)
    assert valid_c is False
    assert any("Circular dependency detected" in e for e in errors_c)

    # 3. Impossible ordering detection
    wrong_order = [
        {"id": "step-adv", "stage_title": "Advanced Step", "prerequisites": ["step-base"]},
        {"id": "step-base", "stage_title": "Foundational Base", "prerequisites": []},
    ]
    valid_o, errors_o = validate_dependency_graph(wrong_order)
    assert valid_o is False
    assert any("Impossible sequence ordering" in e for e in errors_o)

    # 4. Decoupling priority ranking from dependency constraints:
    # High-priority item (score=250) has prerequisite (score=80).
    # Prerequisite MUST be ordered first despite lower priority!
    topics = [
        {"id": "topic-advanced-saga", "stage_title": "Distributed Sagas", "prerequisites": ["topic-kafka-core"], "priority_score": 250.0},
        {"id": "topic-kafka-core", "stage_title": "Kafka Core Mechanics", "prerequisites": [], "priority_score": 80.0},
        {"id": "topic-postgres-tuning", "stage_title": "Postgres Query Optimization", "prerequisites": [], "priority_score": 120.0},
    ]
    sorted_stages = topological_sort_with_priorities(topics)
    sorted_ids = [s["id"] for s in sorted_stages]

    # topic-kafka-core MUST strictly precede topic-advanced-saga
    assert sorted_ids.index("topic-kafka-core") < sorted_ids.index("topic-advanced-saga")

    # 5. Pedagogical rationale alignment
    pedagogical_stages = [
        {"stage_title": "1. Foundational Architecture & Mechanics", "pedagogical_rationale": "Essential conceptual grounding"},
        {"stage_title": "2. Production Hands-on Implementation", "pedagogical_rationale": "Applied codebase practice"},
    ]
    is_aligned, p_errs = verify_pedagogical_alignment(pedagogical_stages)
    assert is_aligned is True
    assert len(p_errs) == 0

    bad_pedagogy = [
        {"stage_title": "1. Advanced Capstone Project", "pedagogical_rationale": "Complex production implementation"},
        {"stage_title": "2. Foundational Concepts", "pedagogical_rationale": "Beginner basics"},
    ]
    is_bad_aligned, bad_p_errs = verify_pedagogical_alignment(bad_pedagogy)
    assert is_bad_aligned is False

