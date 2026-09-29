import pytest
from backend.feature2.schemas import TrajectoryPrediction, TrajectoryTrend
from backend.feature3.catalog import (
    RecommendationCatalogService,
    normalize_competency_name,
)
from backend.feature3.engine import NextActionRecommendationEngine
from backend.feature3.mentorship_service import MentorshipMatchingService
from backend.feature3.schemas import (
    DeficiencyLevel,
    InterventionType,
    MentorshipRequestCreate,
    MentorshipStatus,
    RecommendationPriority,
    RecommendationStatus,
)
from backend.feature3.youtube_service import YouTubeDiscoveryService


def test_competency_normalization():
    """Verify standard competency mapping and aliases."""
    assert normalize_competency_name("C01") == "Backend Engineering & API Development"
    assert normalize_competency_name("C05") == "Quality Assurance & Testing"
    assert normalize_competency_name("FastAPI backend") == "Backend Engineering & API Development"
    assert normalize_competency_name("Database Systems & Storage") == "Database Systems & Storage"


def test_catalog_lookup():
    """Verify deterministic catalog rules matching competency and deficiency level."""
    catalog = RecommendationCatalogService()
    rules = catalog.list_rules()
    assert len(rules) == 12

    # High deficiency backend -> Micro-learning
    rule_be = catalog.find_rule("Backend Engineering & API Development", DeficiencyLevel.HIGH)
    assert rule_be is not None
    assert rule_be.action_type == InterventionType.MICRO_LEARNING
    assert rule_be.priority == RecommendationPriority.HIGH

    # Moderate deficiency backend -> Mentorship
    rule_be_mod = catalog.find_rule("Backend Engineering & API Development", DeficiencyLevel.MODERATE)
    assert rule_be_mod is not None
    assert rule_be_mod.action_type == InterventionType.INTERNAL_MENTORSHIP


def test_confidence_and_evidence_gating():
    """Verify insufficient evidence produces evidence gathering without negative corrective action."""
    engine = NextActionRecommendationEngine()

    # Trajectory with insufficient evidence
    traj_insufficient = TrajectoryPrediction(
        id="traj-1",
        employee_id="test_user",
        competency_id="C01",
        competency_name="Backend Engineering & API Development",
        trend=TrajectoryTrend.INSUFFICIENT_EVIDENCE,
        confidence=0.0,
        probabilities={"improving": 0.0, "stagnating": 0.0, "declining": 0.0},
        freshness="fresh",
        days_since_last_evidence=5,
        evidence_count=1,
        insufficient_evidence=True,
    )

    rec = engine.generate_recommendation_for_trajectory(traj_insufficient, explain_with_ai=False)
    assert rec.action_type == InterventionType.EVIDENCE_GATHERING
    assert rec.trend == "insufficient_evidence"
    assert "More evidence is needed" in rec.justification
    assert rec.resource is None
    assert rec.mentor_suggestion is None


def test_improving_trajectory_recognition():
    """Verify improving competency does not trigger negative intervention."""
    engine = NextActionRecommendationEngine()

    traj_improving = TrajectoryPrediction(
        id="traj-2",
        employee_id="test_user",
        competency_id="C01",
        competency_name="Backend Engineering & API Development",
        trend=TrajectoryTrend.IMPROVING,
        confidence=0.92,
        probabilities={"improving": 0.92, "stagnating": 0.05, "declining": 0.03},
        freshness="fresh",
        days_since_last_evidence=1,
        evidence_count=8,
        insufficient_evidence=False,
    )

    rec = engine.generate_recommendation_for_trajectory(traj_improving, explain_with_ai=False)
    assert rec.trend == "improving"
    assert rec.priority == RecommendationPriority.LOW
    assert "Peer Mentor" in rec.action


def test_youtube_discovery_and_fallback():
    """Verify YouTube discovery falls back gracefully to verified technical tutorials."""
    yt = YouTubeDiscoveryService()
    res = yt.discover_resource(
        query="PostgreSQL index selectivity EXPLAIN ANALYZE tuning tutorial",
        target_topics=["index", "explain analyze"],
        competency_name="Database Systems & Storage",
    )
    assert res is not None
    assert res.video_id == "clv4QJ3Hk4g"
    assert "PostgreSQL" in res.title
    assert "https://www.youtube.com/watch?v=clv4QJ3Hk4g" in res.deep_link_url


def test_mentorship_pairing_and_duplicate_prevention():
    """Verify mentorship request creation, lifecycle, and duplicate prevention."""
    service = MentorshipMatchingService()

    req = MentorshipRequestCreate(
        mentee_id="test_mentee_101",
        mentor_id="test_mentor_202",
        competency_id="C05",
        note="Testing unit pairing",
    )

    # 1. Create initial pairing
    res = service.request_mentorship(req)
    assert res["status"] == MentorshipStatus.REQUESTED.value
    pairing_id = res["id"]

    # 2. Duplicate request check
    dup = service.request_mentorship(req)
    assert "already exists" in dup["message"]
    assert dup["id"] == pairing_id

    # 3. Status transition
    updated = service.update_pairing_status(pairing_id, MentorshipStatus.ACCEPTED, "Accepted pairing")
    assert updated["status"] == MentorshipStatus.ACCEPTED.value

    # 4. Cleanup
    service.update_pairing_status(pairing_id, MentorshipStatus.COMPLETED)


def test_recommendation_lifecycle_update():
    """Verify recommendation status update lifecycle."""
    engine = NextActionRecommendationEngine()
    traj = TrajectoryPrediction(
        id="traj-declining-1",
        employee_id="L000001",
        competency_id="C05",
        competency_name="Quality Assurance & Testing",
        trend=TrajectoryTrend.DECLINING,
        confidence=0.75,
        probabilities={"improving": 0.1, "stagnating": 0.15, "declining": 0.75},
        freshness="fresh",
        days_since_last_evidence=2,
        evidence_count=5,
        insufficient_evidence=False,
        supporting_evidence_ids=["EV-0001", "EV-0002"],
        supporting_evidence_titles=["Test Suite Failure PR #10", "Flaky Test Issue #12"],
    )

    rec = engine.generate_recommendation_for_trajectory(traj, explain_with_ai=False)
    assert rec.trend == "declining"
    assert rec.status == RecommendationStatus.GENERATED

    # Update status to started
    res_started = engine.update_recommendation_status(rec.id, RecommendationStatus.STARTED)
    assert res_started["status"] == "started"

    # Update status to completed
    res_completed = engine.update_recommendation_status(rec.id, RecommendationStatus.COMPLETED)
    assert res_completed["status"] == "completed"
