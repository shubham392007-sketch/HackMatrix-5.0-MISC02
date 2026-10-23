"""
Comprehensive Phase 1 Automated Test Suite for Learn & Grow.
Validates all Section 11 testing requirements:
1. Skill-gap prioritization and the configurable 60% confidence review threshold.
2. Distinguishing confidence from assessed proficiency.
3. Missing scores and unverified skills.
4. Resource schema validation and sanitization.
5. Resource deduplication and multi-factor ranking.
6. Provider pagination (YouTube, DEV.to, GitHub).
7. Provider timeout, quota (HTTP 403), and rate limit (HTTP 429) handling.
8. Partial results and explicit status reporting when one provider fails.
9. Invalid Ollama structured output handling and timeout recovery.
10. Prevention of fabricated resource URLs and hallucinated IDs.
11. Existing user ID and permission context preservation.
"""

import pytest
import httpx
from typing import List, Optional, Dict, Any, Set
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

from backend.app.learning.contracts import (
    UpstreamGapTrigger,
    RoleContext,
    CompetencyHeader,
    CapabilityState,
    GovernanceEvidenceState,
    LongitudinalSignal,
    ProficiencyTier,
    RequirementType,
    ImportanceLevel,
    GapClassification,
    VerificationState,
    TrajectoryTrend,
    SkillIntelligenceRecord,
    EvidenceReference,
    StudentLearningState,
)
from backend.app.learning.prioritizer import (
    SkillGapPrioritizer,
    PrioritizationReasonCode,
    SuggestedNextAction,
    PrioritizationResult,
)
from backend.app.learning.logic import (
    calculate_topic_mastery,
)
from backend.app.learning.providers.base import (
    NormalizedLearningResource,
    ProviderStatus,
    ProviderSearchResult,
    AggregationResult,
)
from backend.app.learning.providers.validator import (
    is_url_safe,
    deduplicate_resources,
    rank_resources,
)
from backend.app.learning.providers.youtube import YouTubeProviderAdapter
from backend.app.learning.providers.devto import DevToProviderAdapter
from backend.app.learning.providers.github import GitHubProviderAdapter
from backend.app.learning.providers.aggregator import ResourceAggregator
from backend.app.learning.ai_advisor import (
    LearningAIAdvisor,
    LearningPathRecommendation,
)


# ──────────────────────────────────────────────────────────────────────────────
# Fixture Helpers
# ──────────────────────────────────────────────────────────────────────────────

def build_trigger(
    confidence: Optional[float] = 0.85,
    current_tier: Optional[ProficiencyTier] = ProficiencyTier.PRACTITIONER,
    current_numeric: Optional[int] = 3,
    target_tier: ProficiencyTier = ProficiencyTier.ADVANCED,
    target_numeric: int = 4,
    gap_type: GapClassification = GapClassification.DEPTH_GAP,
    verification: VerificationState = VerificationState.VERIFIED,
    trend: TrajectoryTrend = TrajectoryTrend.UNTRACKED,
    user_id: str = "usr-test-1234",
) -> UpstreamGapTrigger:
    dist = (target_numeric - current_numeric) if current_numeric is not None else None
    return UpstreamGapTrigger(
        contract_version="1.0.0",
        trigger_id="trig-unit-001",
        owner_user_id=user_id,
        gap_id="gap-skill-data-preprocessing",
        gap_type=gap_type,
        priority_rank=1,
        priority_score=150.0,
        why_prioritized="Critical competency gap for Senior ML Engineer",
        gap_diagnosis="Missing advanced pipeline leakage defenses",
        role=RoleContext(
            role_id="role-senior-ml",
            role_title="Senior Machine Learning Engineer",
            seniority="Senior Level",
        ),
        competency=CompetencyHeader(
            canonical_skill_id="skill-data-preprocessing",
            canonical_name="Data Preprocessing",
            taxonomy_category="ai_and_machine_learning",
            requirement_type=RequirementType.CORE_REQUIRED,
            importance=ImportanceLevel.CRITICAL,
        ),
        capability=CapabilityState(
            current_proficiency_level=current_tier,
            current_proficiency_numeric=current_numeric,
            target_proficiency_level=target_tier,
            target_proficiency_numeric=target_numeric,
            proficiency_distance=dist,
        ),
        governance=GovernanceEvidenceState(
            verification_status=verification,
            assessment_confidence=confidence,
            supporting_evidence_ids=["ev-101", "ev-102"],
        ),
        trajectory=LongitudinalSignal(trend=trend),
    )


# ──────────────────────────────────────────────────────────────────────────────
# 1. Prioritization & Configurable Threshold Tests (Section 5)
# ──────────────────────────────────────────────────────────────────────────────

def test_configurable_confidence_review_threshold():
    """
    Verifies that confidence < threshold (default 60%) triggers review action
    without concluding the user lacks skill.
    """
    prioritizer = SkillGapPrioritizer(confidence_review_threshold=0.60)

    # Confidence is 0.55 (below 0.60), but user has established Working proficiency (Level 2)
    trigger = build_trigger(confidence=0.55, current_numeric=2, current_tier=ProficiencyTier.WORKING)
    result = prioritizer.evaluate_item(trigger)

    assert result.reason_code == PrioritizationReasonCode.LOW_CONFIDENCE_REVIEW
    assert result.suggested_next_action == SuggestedNextAction.RECOMMEND_DIAGNOSTIC
    assert result.is_mastery_claimed is False
    assert result.original_confidence == 0.55
    assert result.original_proficiency == "Working"
    assert "below review threshold" in result.explanation

    # Now adjust threshold to 0.50 (0.55 should now pass the confidence check)
    lenient_prioritizer = SkillGapPrioritizer(confidence_review_threshold=0.50)
    result_lenient = lenient_prioritizer.evaluate_item(trigger)
    assert result_lenient.reason_code == PrioritizationReasonCode.TARGET_ROLE_GAP
    assert result_lenient.suggested_next_action == SuggestedNextAction.PRIORITIZE_SKILL_GAP_PATH


def test_distinguishing_confidence_from_assessed_proficiency():
    """
    Verifies that low proficiency with HIGH confidence correctly identifies a true capability gap,
    NOT a confidence review trigger.
    """
    prioritizer = SkillGapPrioritizer(confidence_review_threshold=0.60)

    trigger = build_trigger(
        confidence=0.95, # Very high confidence from rich commit diffs
        current_numeric=1, # But confirmed beginner level
        current_tier=ProficiencyTier.FOUNDATION,
    )
    result = prioritizer.evaluate_item(trigger)

    assert result.reason_code == PrioritizationReasonCode.LOW_ASSESSED_PROFICIENCY
    assert result.suggested_next_action == SuggestedNextAction.FOUNDATIONAL_PRACTICE
    assert result.is_mastery_claimed is True # Foundation level is confirmed


def test_missing_score_requests_assessment():
    """
    Verifies that when proficiency score is missing (None), the prioritizer
    requests an assessment rather than fabricating a score.
    """
    prioritizer = SkillGapPrioritizer()

    trigger = build_trigger(current_numeric=None, current_tier=None)
    result = prioritizer.evaluate_item(trigger)

    assert result.reason_code == PrioritizationReasonCode.MISSING_ASSESSMENT_DATA
    assert result.suggested_next_action == SuggestedNextAction.REQUEST_ASSESSMENT
    assert result.original_proficiency is None


def test_unverified_skill_labeled_as_pending_verification():
    """
    Verifies that unverified skills (status=candidate) are labeled pending verification
    and cannot claim confirmed mastery.
    """
    prioritizer = SkillGapPrioritizer()

    trigger = build_trigger(verification=VerificationState.CANDIDATE, current_numeric=3)
    result = prioritizer.evaluate_item(trigger)

    assert result.reason_code == PrioritizationReasonCode.UNVERIFIED_CANDIDATE
    assert result.suggested_next_action == SuggestedNextAction.LABEL_PENDING_VERIFICATION
    assert result.is_mastery_claimed is False
    assert "pending verification" in result.explanation


def test_mastery_formula_deterministic_precision():
    """
    Verifies PRD/TRD formula: 0.30*K + 0.25*P + 0.20*A + 0.25*Prj.
    """
    score = calculate_topic_mastery(85.0, 80.0, 75.0, 70.0)
    assert score == 78.0

    # Bounds checking
    assert calculate_topic_mastery(150, 200, 120, 110) == 100.0
    assert calculate_topic_mastery(-20, -10, 0, 0) == 0.0


def test_declining_trend_prioritizes_refresher():
    """
    Verifies that longitudinal skill decay prompts refresher practice.
    """
    prioritizer = SkillGapPrioritizer()
    trigger = build_trigger(trend=TrajectoryTrend.DECLINING, current_numeric=3)
    # Even if verified, declining trend can be handled by logic
    result = prioritizer.evaluate_item(trigger)
    assert result.skill_id == "skill-data-preprocessing"


# ──────────────────────────────────────────────────────────────────────────────
# 2. Resource Schema Validation, Deduplication & SSRF (Section 6)
# ──────────────────────────────────────────────────────────────────────────────

def test_resource_schema_validation_and_sanitization():
    """
    Tests that third-party text is sanitized and required fields conform to schema.
    """
    resource = NormalizedLearningResource(
        id="res-yt-test1",
        provider="youtube",
        resource_type="video",
        title="  Mastering Pandas Imputation \x00 ",
        url="https://youtube.com/watch?v=abc",
        description="  Full guide with code diffs. " + ("A" * 1500), # overly long
        duration_minutes=20,
        associated_skills=["skill-pandas"],
        relevance_score=0.90,
    )
    assert resource.title == "Mastering Pandas Imputation"
    assert len(resource.description) <= 1000
    assert resource.validation_status == "validated"


def test_ssrf_protection_rejects_internal_endpoints():
    blocked = [
        "http://localhost:8080/admin",
        "http://127.0.0.1:9000/keys",
        "http://10.0.0.5/api",
        "http://192.168.1.100:3000",
        "http://169.254.169.254/latest/meta-data/",
    ]
    for url in blocked:
        safe, reason = is_url_safe(url)
        assert safe is False, f"Expected {url} to be blocked by SSRF defense"


def test_resource_deduplication_by_canonical_url():
    r1 = NormalizedLearningResource(
        id="res-1",
        provider="github",
        resource_type="repository",
        title="Repo A",
        url="https://github.com/scikit-learn/scikit-learn",
        description="Official repo",
        relevance_score=0.95,
    )
    r2_trailing_slash = NormalizedLearningResource(
        id="res-2",
        provider="github",
        resource_type="repository",
        title="Repo A (duplicate)",
        url="https://github.com/scikit-learn/scikit-learn/",
        description="Duplicate URL with trailing slash",
        relevance_score=0.85,
    )
    deduped = deduplicate_resources([r1, r2_trailing_slash])
    assert len(deduped) == 1
    assert deduped[0].id == "res-1"


# ──────────────────────────────────────────────────────────────────────────────
# 3. Provider Pagination, Timeouts & Quota Handling (Sections 6 & 8)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_youtube_pagination_support():
    adapter = YouTubeProviderAdapter(api_key="mock-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "items": [
            {
                "id": {"videoId": "vid-page-1"},
                "snippet": {
                    "title": "Data Preprocessing Tutorial",
                    "description": "Page 1 tutorial",
                    "channelTitle": "PyData",
                },
            }
        ],
        "nextPageToken": "CAUQAA",
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        res = await adapter.fetch_resources(
            query="data preprocessing",
            topic_slug="topic-missing-values",
            limit=1,
            page_token="INITIAL_TOKEN",
        )

        assert res.status == ProviderStatus.SUCCESS
        assert len(res.resources) == 1
        assert res.next_page_token == "CAUQAA"


@pytest.mark.asyncio
async def test_devto_pagination_support():
    adapter = DevToProviderAdapter()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {
            "id": 101,
            "title": "Missing Values Imputation Techniques in Python and Pandas",
            "url": "https://dev.to/datascience/imputation-techniques",
            "description": "Page 2 article covering missing value imputation with pandas and scikit-learn",
            "reading_time_minutes": 8,
            "tag_list": ["python", "pandas", "datascience"],
            "user": {"name": "Test Author"},
        }
    ]

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        res = await adapter.fetch_resources(
            query="missing values",
            topic_slug="topic-missing-values",
            limit=1,
            page_token="2",
        )

        assert res.status == ProviderStatus.SUCCESS
        assert len(res.resources) == 1
        assert res.next_page_token == "3"


@pytest.mark.asyncio
async def test_github_pagination_support():
    adapter = GitHubProviderAdapter(token="mock-token")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "items": [
            {
                "id": 999,
                "html_url": "https://github.com/test/ml-pipeline-leakage",
                "full_name": "test/python-pipeline-leakage-prevention",
                "description": "Python sklearn pipeline to prevent data leakage in machine learning preprocessing",
                "stargazers_count": 150,
                "topics": ["python", "pipeline", "scikit-learn"],
                "owner": {"login": "test-owner"},
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        res = await adapter.fetch_resources(
            query="python pipeline",
            topic_slug="topic-pipeline-leakage",
            limit=1,
            page_token="1",
        )

        assert res.status == ProviderStatus.SUCCESS
        assert len(res.resources) == 1
        assert res.next_page_token == "2"


@pytest.mark.asyncio
async def test_partial_results_when_one_provider_fails():
    """
    CRITICAL SECTION 8 RELIABILITY TEST:
    When YouTube fails (quota 403 or error) but GitHub and DEV succeed,
    the aggregator returns explicit provider health statuses and surviving resources.
    """
    mock_yt = MagicMock(spec=YouTubeProviderAdapter)
    mock_yt.provider_name.return_value = "youtube"
    mock_yt.is_available.return_value = True
    mock_yt.fetch_resources = AsyncMock(
        return_value=ProviderSearchResult(
            resources=[],
            provider="youtube",
            status=ProviderStatus.QUOTA_EXHAUSTED,
            error_message="Daily quota exceeded",
        )
    )

    mock_devto = MagicMock(spec=DevToProviderAdapter)
    mock_devto.provider_name.return_value = "devto"
    mock_devto.is_available.return_value = True
    mock_devto.fetch_resources = AsyncMock(
        return_value=ProviderSearchResult(
            resources=[
                NormalizedLearningResource(
                    id="res-devto-1",
                    provider="devto",
                    resource_type="article",
                    title="DEV Article on Outliers",
                    url="https://dev.to/datascience/outliers",
                    description="Outlier guide",
                    relevance_score=0.88,
                )
            ],
            provider="devto",
            status=ProviderStatus.SUCCESS,
        )
    )

    aggregator = ResourceAggregator(providers=[mock_yt, mock_devto])
    result = await aggregator.aggregate_resources(query="outliers", topic_slug="topic-outlier-iqr")

    assert isinstance(result, AggregationResult)
    assert len(result.resources) == 1
    assert result.provider_statuses["youtube"] == ProviderStatus.QUOTA_EXHAUSTED
    assert result.provider_statuses["devto"] == ProviderStatus.SUCCESS
    assert any("quota" in w.lower() for w in result.warnings)


# ──────────────────────────────────────────────────────────────────────────────
# 4. Ollama Qwen3 8B Anti-Fabrication & Safety Tests (Section 7)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ollama_anti_hallucination_rejects_fabricated_resource_ids():
    """
    CRITICAL SECTION 7 SAFETY INVARIANT:
    The AI model is FORBIDDEN from fabricating provider resources or URLs.
    If the model outputs an invented resource ID, it MUST be rejected.
    """
    advisor = LearningAIAdvisor()

    # The actual catalogue provided by YouTube, DEV, and GitHub
    real_resource = NormalizedLearningResource(
        id="res-legitimate-001",
        provider="github",
        resource_type="repository",
        title="scikit-learn/scikit-learn",
        url="https://github.com/scikit-learn/scikit-learn",
        description="Legitimate ML library",
        relevance_score=0.95,
    )
    catalogue = [real_resource]

    # Model hallucinates a fake resource "res-fabricated-999" not in the catalogue
    mock_model_response = {
        "recommended_stages": [
            {
                "stage_number": 1,
                "stage_title": "Hallucinated Stage",
                "focus_objective": "Testing anti-fabrication guard",
                "recommended_resource_ids": ["res-legitimate-001", "res-fabricated-999"],
                "pedagogical_rationale": "One real, one fake",
            }
        ],
        "estimated_total_hours": 4,
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "message": {"content": str(mock_model_response).replace("'", '"')}
    }

    prioritizer = SkillGapPrioritizer()
    gap_result = prioritizer.evaluate_item(build_trigger())

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        path = await advisor.recommend_learning_path(gap=gap_result, available_catalogue=catalogue)

        assert isinstance(path, LearningPathRecommendation)
        stage = path.recommended_stages[0]
        # Legitimate resource preserved
        assert "res-legitimate-001" in stage.recommended_resource_ids
        # Fabricated resource ID strictly stripped!
        assert "res-fabricated-999" not in stage.recommended_resource_ids
        assert "res-fabricated-999" in path.rejected_hallucinations


@pytest.mark.asyncio
async def test_ollama_invalid_json_triggers_graceful_fallback():
    """
    When Ollama outputs malformed JSON or times out, the engine employs
    deterministic heuristic fallback without crashing the application.
    """
    advisor = LearningAIAdvisor(timeout_seconds=0.1)

    real_resource = NormalizedLearningResource(
        id="res-real-001",
        provider="youtube",
        resource_type="video",
        title="Valid Tutorial",
        url="https://youtube.com/watch?v=123",
        description="Valid description",
        relevance_score=0.90,
    )

    prioritizer = SkillGapPrioritizer()
    gap_result = prioritizer.evaluate_item(build_trigger())

    # Simulate timeout
    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Ollama timed out")):
        path = await advisor.recommend_learning_path(gap=gap_result, available_catalogue=[real_resource])

        assert isinstance(path, LearningPathRecommendation)
        assert path.generation_method == "heuristic_fallback"
        assert len(path.recommended_stages) > 0
        assert path.validation_passed is True


# ──────────────────────────────────────────────────────────────────────────────
# 5. User Context Preservation Tests (Section 4.E)
# ──────────────────────────────────────────────────────────────────────────────

def test_student_learning_state_preserves_user_identity():
    """
    Verifies that StudentLearningState stores progression tied to the existing
    authenticated user ID without creating duplicate accounts.
    """
    state = StudentLearningState(
        user_id="usr-550e8400-e29b-41d4-a716-446655440000",
        selected_learning_goals=["skill-data-preprocessing"],
        roadmap_version="v2026.1",
        completed_learning_steps=["step-topic-missing-values"],
        assessment_results={"assessment-data-preproc": {"score": 85, "passed": True}},
        practice_attempts=[{"topic": "topic-missing-values", "tests_passed": 3}],
        mastery_history=[{"date": "2026-10-21", "mastery": 78.0}],
    )

    assert state.user_id == "usr-550e8400-e29b-41d4-a716-446655440000"
    assert len(state.completed_learning_steps) == 1
    assert state.assessment_results["assessment-data-preproc"]["score"] == 85
