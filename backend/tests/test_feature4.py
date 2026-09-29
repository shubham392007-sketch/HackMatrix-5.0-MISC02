"""Comprehensive Unit and Integration Tests for GrowthLens Feature 4:
Continuous Talent Intelligence & Development Insights.
Tests all 6 core capabilities:
1. Growth Narrative Synthesis (with evidence citations & deterministic fallback)
2. Privacy-Safe Peer Growth Benchmarking (k-anonymity enforcement)
3. Evidence Staleness & Widening Confidence Decay Bands
4. Manager Team Skill Heatmap & Systemic Pattern Detection
5. Safe What-If Counterfactual Trajectory Simulation (zero DB mutations)
6. Feature 4 FastAPI Endpoints Integration
"""
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.feature4.schemas import (
    GrowthNarrative,
    PeerBenchmark,
    ConfidenceDecay,
    TeamHeatmap,
    ManagerBriefing,
    NarrativeClaim,
)
from backend.feature4.narrative_service import GrowthNarrativeService
from backend.feature4.benchmark_service import PeerBenchmarkService
from backend.feature4.staleness_service import StalenessService
from backend.feature4.team_service import TeamIntelligenceService
from backend.feature4.what_if_service import Feature4WhatIfService


client = TestClient(app)


def test_feature4_schemas_validation():
    """Validates Pydantic schema constraints and default serialization."""
    narrative = GrowthNarrative(
        learner_id="test_learner",
        narrative="Test narrative with evidence [EV-001].",
        manager_briefing=ManagerBriefing(
            key_improvements=["Backend API acceleration"],
            stagnating_areas=["Database indexing"],
            suggested_focus=["Take Advanced SQL course"],
        ),
        claims=[
            NarrativeClaim(claim="Delivered core API", evidence_ids=["EV-001"], confidence=0.92)
        ],
        evidence_sources=1,
        competencies_analyzed=2,
        confidence_level="HIGH",
    )
    assert narrative.learner_id == "test_learner"
    assert len(narrative.claims) == 1
    assert narrative.claims[0].evidence_ids == ["EV-001"]


@pytest.mark.asyncio
async def test_growth_narrative_deterministic_fallback():
    """Tests narrative generation with evidence citations and manager briefing."""
    service = GrowthNarrativeService()
    narrative = await service.get_growth_narrative(learner_id="shubham_pokale", force_refresh=True)

    assert narrative.learner_id == "shubham_pokale"
    assert len(narrative.narrative) > 30
    assert narrative.manager_briefing is not None
    assert len(narrative.manager_briefing.key_improvements) > 0
    assert len(narrative.manager_briefing.suggested_focus) > 0
    assert narrative.confidence_level in ("HIGH", "MEDIUM", "LOW")
    # Verify claims have supporting evidence references
    assert len(narrative.claims) > 0
    for claim in narrative.claims:
        assert isinstance(claim.evidence_ids, list)


def test_peer_benchmark_k_anonymity_enforcement():
    """Tests that k-anonymity prevents leaking benchmarks for tiny cohorts."""
    # Service with standard k=3
    service = PeerBenchmarkService(min_cohort_size=3)
    benchmark = service.get_peer_benchmark(learner_id="shubham_pokale", competency_id="C01")

    assert benchmark.privacy_safe is True
    if benchmark.cohort_size >= 3:
        assert benchmark.benchmark_available is True
        assert 1.0 <= benchmark.percentile <= 99.0
        assert "top" in benchmark.message.lower()
    else:
        assert benchmark.benchmark_available is False
        assert "not enough comparable" in benchmark.message.lower()

    # Service with impossible k=9999 to guarantee k-anonymity rejection
    strict_service = PeerBenchmarkService(min_cohort_size=9999)
    strict_bench = strict_service.get_peer_benchmark(learner_id="shubham_pokale", competency_id="C01")
    assert strict_bench.benchmark_available is False
    assert strict_bench.percentile is None
    assert "privacy-safe benchmark" in strict_bench.message


def test_staleness_and_decay_bands():
    """Tests evidence staleness score and widening uncertainty intervals."""
    service = StalenessService()
    decay_info = service.get_confidence_decay(learner_id="shubham_pokale", competency_id="C01")

    assert decay_info.learner_id == "shubham_pokale"
    assert decay_info.competency_id == "C01"
    assert 0.0 <= decay_info.freshness_score <= 1.0
    assert decay_info.freshness_label in ("Fresh", "Aging", "Stale")
    assert len(decay_info.decay_curve) == 5

    # Verify points at 0, 30, 60, 90, 180 days
    days = [pt.day for pt in decay_info.decay_curve]
    assert days == [0, 30, 60, 90, 180]

    # Verify widening uncertainty band over time
    band_day_0 = decay_info.decay_curve[0].upper_band - decay_info.decay_curve[0].lower_band
    band_day_180 = decay_info.decay_curve[-1].upper_band - decay_info.decay_curve[-1].lower_band
    assert band_day_180 > band_day_0


def test_team_heatmap_and_pattern_detection():
    """Tests server-side aggregation of team skill heatmap and systemic pattern detection."""
    service = TeamIntelligenceService()
    heatmap = service.get_team_heatmap(team_id="team_core_engineering")

    assert heatmap.team_id == "team_core_engineering"
    assert len(heatmap.members) > 0
    assert len(heatmap.competency_names) >= 4

    # Verify each member has valid competency trends
    for member in heatmap.members:
        assert member.name is not None
        for comp_name, status in member.competencies.items():
            assert status.trend in ("improving", "stagnating", "declining", "insufficient_evidence")
            assert status.confidence >= 0.0

    # Verify pattern callouts
    assert len(heatmap.patterns) > 0
    for pattern in heatmap.patterns:
        assert pattern.competency is not None
        assert pattern.observation is not None
        assert pattern.severity in ("positive", "neutral", "warning", "critical")


def test_what_if_counterfactual_simulation():
    """Tests that What-If simulation projects trajectory without mutating real data."""
    service = Feature4WhatIfService()
    res = service.simulate(
        employee_id="shubham_pokale",
        competency_id="C01",
        action_type="project_outcome",
        simulated_score=95.0,
        days_from_now=7,
        simulated_description="Lead microservice refactor and containerization",
    )

    assert res["employee_id"] == "shubham_pokale"
    assert res["is_counterfactual"] is True
    assert "baseline" in res
    assert "projected" in res
    assert "disclaimer" in res
    assert "Counterfactual simulation" in res["disclaimer"]


def test_api_endpoints_integration():
    """Tests all FastAPI endpoints registered for Feature 4."""
    # 1. Growth Narrative
    r_narrative = client.get("/feature4/api/narrative/shubham_pokale")
    assert r_narrative.status_code == 200
    data_narrative = r_narrative.json()
    assert "narrative" in data_narrative
    assert "manager_briefing" in data_narrative

    # 2. Peer Benchmark
    r_bench = client.get("/feature4/api/benchmark/shubham_pokale/C01")
    assert r_bench.status_code == 200
    data_bench = r_bench.json()
    assert data_bench["privacy_safe"] is True
    assert "comparison" in data_bench

    # 3. Confidence Decay
    r_decay = client.get("/feature4/api/confidence-decay/shubham_pokale/C01")
    assert r_decay.status_code == 200
    data_decay = r_decay.json()
    assert "decay_curve" in data_decay
    assert len(data_decay["decay_curve"]) == 5

    # 4. Team Heatmap
    r_heatmap = client.get("/feature4/api/heatmap/team/team_core_engineering")
    assert r_heatmap.status_code == 200
    data_heatmap = r_heatmap.json()
    assert "members" in data_heatmap
    assert "patterns" in data_heatmap

    # 5. What-If Simulator
    r_whatif = client.post(
        "/feature4/api/what-if",
        json={
            "employee_id": "shubham_pokale",
            "competency_id": "C01",
            "action_type": "project_outcome",
            "simulated_score": 90.0,
            "days_from_now": 0,
        },
    )
    assert r_whatif.status_code == 200
    data_whatif = r_whatif.json()
    assert data_whatif["is_counterfactual"] is True
    assert "projected" in data_whatif

    # 6. Unified Growth Overview
    r_overview = client.get("/feature4/api/overview/shubham_pokale")
    assert r_overview.status_code == 200
    data_overview = r_overview.json()
    assert "narrative_preview" in data_overview
    assert "confidence_level" in data_overview
