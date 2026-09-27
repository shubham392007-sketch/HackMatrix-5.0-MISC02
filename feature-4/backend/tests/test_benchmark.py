"""Unit and integration tests for Enhancement 8.4: Peer-Percentile Growth Benchmarking."""
import pytest
from fastapi.testclient import TestClient

from backend.services.benchmark_service import BenchmarkService
from backend.repositories.benchmark_repository import BenchmarkRepository
from backend.schemas.benchmark_schema import BenchmarkRequest
from backend.utils.privacy_utils import bucket_cohort_size, calculate_relative_tier, get_min_cohort_size
import main

client = TestClient(main.app)


def test_privacy_utils_cohort_bucketing():
    """Verify cohort size bucketing hides exact counts to prevent inference attacks."""
    assert bucket_cohort_size(3) == "< 5 peers"
    assert bucket_cohort_size(7) == "5–9 peers"
    assert bucket_cohort_size(15) == "10–25 peers"
    assert bucket_cohort_size(40) == "25–50 peers"
    assert bucket_cohort_size(100) == "50+ peers"


def test_relative_tier_assignment():
    """Verify conversion of growth percentiles into accessible tier labels."""
    assert calculate_relative_tier(95) == "top 10%"
    assert calculate_relative_tier(82) == "top 20%"
    assert calculate_relative_tier(72) == "top 30%"
    assert calculate_relative_tier(55) == "top 50%"
    assert calculate_relative_tier(35) == "mid-tier"
    assert calculate_relative_tier(15) == "developing pace"


def test_benchmark_calculation_with_cohort():
    """Verify empirical cumulative distribution calculation for valid learner and peer group."""
    service = BenchmarkService()
    req = BenchmarkRequest(
        learner_id="L000001",
        competency_id="C05"
    )

    res = service.calculate_peer_benchmark(req)
    assert res.available is True
    assert res.learner_id in ["L000001", "shubham_pokale"]
    assert res.competency_id == "C05"
    assert res.growth_percentile is not None
    assert 1 <= res.growth_percentile <= 99
    assert res.cohort_size_bucket is not None
    assert res.privacy_safe is True
    assert "peers" in res.cohort_size_bucket


def test_benchmark_k_anonymity_enforcement(monkeypatch):
    """Verify benchmark restricts output when peer cohort count falls below configured threshold."""
    # Temporarily set minimum cohort size to an arbitrarily high number
    monkeypatch.setenv("PEER_BENCHMARK_MIN_COHORT_SIZE", "9999")

    service = BenchmarkService()
    req = BenchmarkRequest(
        learner_id="L000001",
        competency_id="C05"
    )

    res = service.calculate_peer_benchmark(req)
    assert res.available is False
    assert res.growth_percentile is None
    assert "privacy" in res.reason.lower() or "cohort size" in res.reason.lower()


def test_benchmark_api_endpoint():
    """Verify /api/v1/feature4/benchmark returns structured response."""
    response = client.post("/api/v1/feature4/benchmark", json={
        "learner_id": "L000001",
        "competency_id": "C01"
    })
    assert response.status_code == 200
    data = response.json()
    assert "available" in data
    assert "privacy_safe" in data
    assert data["privacy_safe"] is True
