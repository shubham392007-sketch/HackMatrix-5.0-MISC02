"""
Learn & Grow Phase 3 & Phase 6 Comprehensive Automated Test Suite.
Tests:
1. Synthetic Career Intelligence input adapter (Applied Machine Learning Engineer profile).
2. Edge cases: Empty gap list, malformed fields, duplicate gaps, unsupported proficiency.
3. Low-confidence evidence preservation (preserving uncertainty without assuming low proficiency).
4. Dependency validation & cycle detection.
5. Upstream database adapter resilience when CI snapshot is missing.
6. AI Assessment generation, validation, and safe learner payload (answer keys stripped).
7. Assessment grading, pass/fail rules, and deterministic mastery calculation.
8. Database persistence and data isolation (synthetic records vs real user data).
"""

import os
import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

# Force test mode
os.environ["APP_ENV"] = "test"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

from backend.app.models.base import Base
import backend.app.models
from backend.app.models.learning import (
    LearningRoadmap,
    LearningStep,
    LearningAttempt,
    LearningAssessment,
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
from backend.app.learning.synthetic_ci_adapter import (
    synthetic_ci_adapter,
    SYNTHETIC_USER_ID,
)
from backend.app.learning.upstream_adapter import CareerIntelligenceDbAdapter
from backend.app.learning.logic import (
    validate_dependency_graph,
    topological_sort_with_priorities,
    deterministic_mastery,
    DependencyValidationError,
)
from backend.app.learning.assessment_generator import (
    AssessmentGenerator,
    AssessmentDefinition,
    AssessmentQuestion,
    strip_answers_for_learner,
    grade_assessment,
)


@pytest.fixture(scope="module")
def sqlite_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    yield session
    session.close()


# -----------------------------------------------------------------------------
# 1. SYNTHETIC INPUT ADAPTER TESTS
# -----------------------------------------------------------------------------

def test_synthetic_mle_gaps_contract():
    """Verify that create_applied_mle_synthetic_triggers produces 5 valid UpstreamGapTrigger objects."""
    triggers = synthetic_ci_adapter.create_applied_mle_synthetic_triggers()
    assert len(triggers) == 5
    for t in triggers:
        assert isinstance(t, UpstreamGapTrigger)
        assert t.owner_user_id == SYNTHETIC_USER_ID
        assert t.role.role_title == "Applied Machine Learning Engineer"
        assert t.competency.canonical_skill_id.startswith("skill-")
        assert 0.0 <= t.governance.assessment_confidence <= 1.0


def test_synthetic_low_confidence_preserves_uncertainty():
    """Verify that low confidence does NOT blindly force low proficiency."""
    triggers = synthetic_ci_adapter.create_applied_mle_synthetic_triggers()
    dl_gap = next(t for t in triggers if t.competency.canonical_skill_id == "skill-deep-learning")
    # Deep learning has low confidence (0.55), but current proficiency is foundation/beginner (1)
    assert dl_gap.governance.assessment_confidence == 0.55
    assert dl_gap.governance.verification_status == VerificationState.CANDIDATE
    assert dl_gap.capability.current_proficiency_level == ProficiencyTier.FOUNDATION
    assert dl_gap.capability.current_proficiency_numeric == 1


def test_normalize_synthetic_gaps_empty_list():
    """Verify handling of empty gap list."""
    res = synthetic_ci_adapter.normalize_raw_gaps([])
    assert res == []


def test_normalize_synthetic_gaps_duplicates():
    """Verify deduplication when duplicate skill gap IDs are provided."""
    raw_gaps = [
        {"canonical_skill_id": "skill-1", "canonical_name": "Skill 1"},
        {"canonical_skill_id": "skill-1", "canonical_name": "Skill 1 Duplicate"},
        {"canonical_skill_id": "skill-2", "canonical_name": "Skill 2"},
    ]
    normalized = synthetic_ci_adapter.normalize_raw_gaps(raw_gaps)
    assert len(normalized) == 2
    unique_ids = {t.competency.canonical_skill_id for t in normalized}
    assert unique_ids == {"skill-1", "skill-2"}


def test_normalize_synthetic_gaps_unsupported_proficiency():
    """Verify fallback when an unsupported proficiency string is provided."""
    raw = [
        {
            "skill_id": "skill-custom",
            "skill_name": "Custom ML",
            "current_proficiency": "SUPER_EXPERT_UNKNOWN",
            "target_proficiency": "Advanced",
        }
    ]
    normalized = synthetic_ci_adapter.normalize_raw_gaps(raw)
    assert len(normalized) == 1
    # Should safely fallback to NOT_ESTABLISHED
    assert normalized[0].capability.current_proficiency_level == ProficiencyTier.NOT_ESTABLISHED


def test_normalize_synthetic_gaps_missing_fields():
    """Verify fallback and default generation for missing fields."""
    raw = [
        {
            "skill_id": "skill-minimal",
        }
    ]
    normalized = synthetic_ci_adapter.normalize_raw_gaps(raw)
    assert len(normalized) == 1
    assert normalized[0].competency.canonical_skill_id == "skill-minimal"
    assert normalized[0].competency.canonical_name == "Minimal"
    assert normalized[0].capability.current_proficiency_level == ProficiencyTier.NOT_ESTABLISHED
    assert normalized[0].capability.target_proficiency_level == ProficiencyTier.PRACTITIONER


# -----------------------------------------------------------------------------
# 2. DEPENDENCY GRAPH & CYCLE DETECTION TESTS
# -----------------------------------------------------------------------------

def test_validate_dependency_graph_success():
    """Valid DAG must pass validation."""
    items = [
        {"id": "A", "prerequisites": []},
        {"id": "B", "prerequisites": ["A"]},
        {"id": "C", "prerequisites": ["B"]},
    ]
    is_valid, errors = validate_dependency_graph(items)
    assert is_valid is True
    assert len(errors) == 0


def test_validate_dependency_graph_cycle():
    """Cycle must be detected and rejected."""
    items = [
        {"id": "A", "prerequisites": ["C"]},
        {"id": "B", "prerequisites": ["A"]},
        {"id": "C", "prerequisites": ["B"]},
    ]
    is_valid, errors = validate_dependency_graph(items)
    assert is_valid is False
    assert any("Circular dependency" in e for e in errors)


def test_validate_dependency_graph_missing_prereq():
    """Missing prerequisite must be caught."""
    items = [
        {"id": "A", "prerequisites": ["NON_EXISTENT"]},
    ]
    is_valid, errors = validate_dependency_graph(items)
    assert is_valid is False
    assert any("Missing prerequisite" in e for e in errors)


def test_topological_sort_with_priorities():
    """Prerequisites must strictly precede dependents, higher priorities prioritized among ready items."""
    items = [
        {"id": "model_deployment", "prerequisites": ["model_evaluation"], "priority_score": 90.0},
        {"id": "model_evaluation", "prerequisites": ["feature_engineering"], "priority_score": 60.0},
        {"id": "feature_engineering", "prerequisites": ["pandas_preprocessing"], "priority_score": 75.0},
        {"id": "pandas_preprocessing", "prerequisites": [], "priority_score": 50.0},
    ]
    ordered = topological_sort_with_priorities(items)
    ordered_ids = [item["id"] for item in ordered]
    # pandas_preprocessing has no prereqs, but must come first because feature_engineering depends on it
    assert ordered_ids.index("pandas_preprocessing") < ordered_ids.index("feature_engineering")
    assert ordered_ids.index("feature_engineering") < ordered_ids.index("model_evaluation")
    assert ordered_ids.index("model_evaluation") < ordered_ids.index("model_deployment")


# -----------------------------------------------------------------------------
# 3. UPSTREAM ADAPTER RESILIENCE
# -----------------------------------------------------------------------------

def test_upstream_adapter_missing_snapshot(sqlite_db):
    """When user has no Career Intelligence snapshot, returns empty list without raising."""
    adapter = CareerIntelligenceDbAdapter()
    unknown_user = str(uuid.uuid4())
    triggers = adapter.fetch_upstream_triggers(sqlite_db, unknown_user)
    assert triggers == []


# -----------------------------------------------------------------------------
# 4. ASSESSMENT GENERATION, SECURITY & GRADING TESTS
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_assessment_generator_fallback():
    """Assessment generator produces structured definition using curated fallback."""
    gen = AssessmentGenerator(ollama_url="http://127.0.0.1:99999", timeout_seconds=0.1)
    asmt = await gen.generate_assessment(
        skill_id="skill-feature-engineering",
        skill_name="Feature Engineering",
        learning_objective="Advanced feature encoding and imputation",
        difficulty="Intermediate",
        is_synthetic=True,
        question_count=4,
    )
    assert asmt.skill_id == "skill-feature-engineering"
    assert len(asmt.questions) == 4
    assert asmt.passing_threshold == 70.0
    assert asmt.generation_method == "heuristic_fallback"
    for q in asmt.questions:
        assert 0 <= q.correct_index < len(q.options)
        assert q.explanation != ""


def test_security_learner_payload_strips_answers():
    """Learner payload MUST NEVER expose correct_index or explanation."""
    questions = [
        AssessmentQuestion(
            id="q1",
            category="conceptual",
            question_text="What is one-hot encoding?",
            options=["Binary vectors", "Continuous numbers", "Decision trees", "Neural weights"],
            correct_index=0,
            explanation="One-hot encodes categories into binary indicators.",
            points=10,
        ),
        AssessmentQuestion(
            id="q2",
            category="applied_scenario",
            question_text="When should target encoding be used?",
            options=["High cardinality categorical features", "Small binary flags", "Continuous target", "None"],
            correct_index=0,
            explanation="Target encoding represents categories by the expected target value.",
            points=10,
        ),
    ]
    asmt = AssessmentDefinition(
        assessment_id="asmt-sec-1",
        skill_id="skill-feature-engineering",
        skill_name="Feature Engineering",
        title="Security Test Assessment",
        learning_objective="Test answer stripping",
        questions=questions,
        passing_threshold=70.0,
        is_synthetic=True,
        generation_method="heuristic_fallback",
    )
    safe = strip_answers_for_learner(asmt)
    assert "questions" in safe
    safe_q = safe["questions"][0]
    assert "correct_index" not in safe_q
    assert "explanation" not in safe_q
    assert safe_q["options"] == ["Binary vectors", "Continuous numbers", "Decision trees", "Neural weights"]


def test_grade_assessment_scoring():
    """Grading evaluates user answers strictly against backend answer keys."""
    questions = [
        AssessmentQuestion(
            id="q1",
            category="conceptual",
            question_text="Question 1",
            options=["A", "B", "C", "D"],
            correct_index=1,
            explanation="Explanation 1",
            points=10,
        ),
        AssessmentQuestion(
            id="q2",
            category="applied_scenario",
            question_text="Question 2",
            options=["A", "B", "C", "D"],
            correct_index=2,
            explanation="Explanation 2",
            points=10,
        ),
    ]
    asmt = AssessmentDefinition(
        assessment_id="asmt-grade-1",
        skill_id="skill-eval",
        skill_name="Model Evaluation",
        title="Grading Test",
        learning_objective="Objective",
        questions=questions,
        passing_threshold=50.0,
        is_synthetic=True,
        generation_method="curated_fallback",
    )

    # 1. 100% correct
    result_full = grade_assessment(asmt, {"q1": 1, "q2": 2})
    assert result_full["score_percentage"] == 100.0
    assert result_full["passed"] is True
    assert result_full["computed_mastery"] == 20.0  # 20% weight in mastery formula

    # 2. 50% correct
    result_half = grade_assessment(asmt, {"q1": 1, "q2": 0})
    assert result_half["score_percentage"] == 50.0
    assert result_half["passed"] is True
    assert result_half["computed_mastery"] == 10.0

    # 3. 0% correct
    result_zero = grade_assessment(asmt, {"q1": 0, "q2": 0})
    assert result_zero["score_percentage"] == 0.0
    assert result_zero["passed"] is False
    assert result_zero["computed_mastery"] == 0.0


# -----------------------------------------------------------------------------
# 5. DATABASE PERSISTENCE & USER ISOLATION
# -----------------------------------------------------------------------------

def test_database_learning_assessment_persistence(sqlite_db):
    """Verify LearningAssessment model persists to database and can be queried."""
    test_user_id = uuid.uuid4()
    asmt = LearningAssessment(
        assessment_id=f"asmt-db-{uuid.uuid4().hex[:6]}",
        owner_user_id=test_user_id,
        skill_id="skill-test",
        skill_name="Test Skill",
        title="Database Test Assessment",
        learning_objective="Test DB persistence",
        passing_threshold=70.0,
        time_limit_minutes=15,
        is_synthetic=True,
        generation_method="curated_fallback",
        generation_latency_seconds=0.05,
        questions_data=[
            {
                "id": "q1",
                "category": "conceptual",
                "question_text": "Is this persisted?",
                "options": ["Yes", "No"],
                "correct_index": 0,
                "explanation": "Yes it is persisted.",
                "points": 10,
            }
        ],
    )
    sqlite_db.add(asmt)
    sqlite_db.commit()

    retrieved = sqlite_db.query(LearningAssessment).filter(
        LearningAssessment.assessment_id == asmt.assessment_id
    ).first()
    assert retrieved is not None
    assert retrieved.skill_id == "skill-test"
    assert retrieved.is_synthetic is True
    assert len(retrieved.questions_data) == 1
    assert retrieved.questions_data[0]["correct_index"] == 0


def test_deterministic_mastery_formula():
    """Verify PRD/TRD deterministic formula: 30% K + 25% P + 20% A + 25% Prj."""
    assert deterministic_mastery(100.0, 100.0, 100.0, 100.0) == 100.0
    assert deterministic_mastery(0.0, 0.0, 0.0, 0.0) == 0.0
    # K=100 (30), P=50 (12.5), A=80 (16), Prj=0 (0) -> 58.5
    assert deterministic_mastery(100.0, 50.0, 80.0, 0.0) == 58.5
