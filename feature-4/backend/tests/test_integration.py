"""End-to-end integration test suite verifying all 4 Feature 4 enhancements operate harmoniously."""
import pytest
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_feature4_complete_workflow():
    """Simulates a manager inspecting growth narrative, peer benchmark, confidence decay, and team heatmap."""
    learner_id = "L000001"
    competency_id = "C05"

    # Step 1: Generate Growth Narrative
    res_narrative = client.post("/api/v1/feature4/narrative", json={
        "learner_id": learner_id,
        "evaluation_period": {
            "start_date": "2026-05-01",
            "end_date": "2026-09-30",
            "label": "Q2-Q3 2026"
        }
    })
    assert res_narrative.status_code == 200
    narrative_data = res_narrative.json()
    assert narrative_data["success"] is True
    assert len(narrative_data["claims"]) > 0

    # Step 2: Compare with Peer Benchmark
    res_bench = client.post("/api/v1/feature4/benchmark", json={
        "learner_id": learner_id,
        "competency_id": competency_id,
        "evaluation_period": {
            "start_date": "2026-05-01",
            "end_date": "2026-09-30"
        }
    })
    assert res_bench.status_code == 200
    bench_data = res_bench.json()
    assert bench_data["privacy_safe"] is True

    # Step 3: Inspect Telemetry Staleness & Confidence Decay
    res_conf = client.get(f"/api/v1/feature4/confidence-decay/{learner_id}/{competency_id}")
    assert res_conf.status_code == 200
    conf_data = res_conf.json()
    assert conf_data["freshness_state"] in ["Fresh", "Aging", "Stale"]
    assert len(conf_data["timeline"]) > 0

    # Step 4: Review Department Team Heatmap
    res_heat = client.get("/api/v1/feature4/team-heatmap?team_id=Engineering")
    assert res_heat.status_code == 200
    heat_data = res_heat.json()
    assert heat_data["total_members"] > 0
    assert len(heat_data["team_insights"]) > 0

    # Step 5: Verify Static Frontend Dashboard Access
    res_fe = client.get("/feature4/")
    assert res_fe.status_code == 200
    assert "GrowthLens" in res_fe.text
