"""Service for privacy-preserving, peer-percentile growth benchmarking."""
from typing import Optional, Dict, Any, List
import numpy as np

from services.retention_service import RetentionService, COMPETENCIES_MAP, COMPETENCY_NAME_TO_ID
from ..schemas.benchmark_schema import BenchmarkRequest, BenchmarkResponse
from ..repositories.benchmark_repository import BenchmarkRepository
from ..utils.privacy_utils import get_min_cohort_size, bucket_cohort_size, calculate_relative_tier
from ..utils.date_utils import get_quarter_label


class BenchmarkService:
    """Calculates empirical growth percentile relative to comparable baseline cohorts."""

    def __init__(
        self,
        retention_service: Optional[RetentionService] = None,
        benchmark_repository: Optional[BenchmarkRepository] = None
    ):
        self.retention_service = retention_service or RetentionService.get_instance()
        self.repo = benchmark_repository or BenchmarkRepository(self.retention_service)

    def calculate_peer_benchmark(self, request: BenchmarkRequest) -> BenchmarkResponse:
        """Computes aggregate growth percentile within privacy-safe cohort boundaries."""
        learner_id = self.retention_service.resolve_learner_id(request.learner_id)
        cid = COMPETENCY_NAME_TO_ID.get(request.competency_id, request.competency_id)
        comp_name = COMPETENCIES_MAP.get(cid, cid)

        start_date = request.evaluation_period.start_date if request.evaluation_period else None
        end_date = request.evaluation_period.end_date if request.evaluation_period else None

        # 1. Fetch learner baseline and growth delta
        learner_stats = self.repo.get_learner_baseline_and_growth(
            learner_id=learner_id,
            competency_id=cid,
            start_date=start_date,
            end_date=end_date
        )

        if not learner_stats:
            return BenchmarkResponse(
                available=False,
                learner_id=learner_id,
                competency_id=cid,
                competency_name=comp_name,
                evaluation_period=request.evaluation_period,
                privacy_safe=True,
                reason="Insufficient learner evidence history in this competency (minimum 2 verified points required)."
            )

        baseline_score = learner_stats["baseline_score"]
        learner_growth = learner_stats["growth_delta"]

        # Group label (e.g. "Proficient Baseline (70–85 pts)")
        level_label = self._get_level_group_label(baseline_score)

        # 2. Extract peer cohort growth rates (starting at comparable level)
        peer_deltas = self.repo.get_cohort_growth_rates(
            competency_id=cid,
            target_learner_id=learner_id,
            baseline_score=baseline_score,
            score_tolerance=15.0,
            start_date=start_date,
            end_date=end_date
        )

        cohort_size = len(peer_deltas)
        min_cohort_size = get_min_cohort_size()

        # 3. Privacy-safe k-anonymity gate
        if cohort_size < min_cohort_size:
            return BenchmarkResponse(
                available=False,
                learner_id=learner_id,
                competency_id=cid,
                competency_name=comp_name,
                evaluation_period=request.evaluation_period,
                starting_level_group=level_label,
                cohort_size_bucket=bucket_cohort_size(cohort_size),
                privacy_safe=True,
                reason=f"Insufficient peer cohort size (minimum {min_cohort_size} comparable peers required to protect learner privacy)."
            )

        # 4. Empirical Cumulative Distribution Percentile calculation
        # ECDF: (count(p < val) + 0.5 * count(p == val)) / N * 100
        less_count = sum(1 for p in peer_deltas if p < learner_growth)
        equal_count = sum(1 for p in peer_deltas if p == learner_growth)
        raw_pct = ((less_count + 0.5 * equal_count) / cohort_size) * 100.0

        # Clamp between 1st and 99th percentile
        percentile = int(max(1, min(99, round(raw_pct))))
        tier = calculate_relative_tier(percentile)
        size_bucket = bucket_cohort_size(cohort_size)

        return BenchmarkResponse(
            available=True,
            learner_id=learner_id,
            competency_id=cid,
            competency_name=comp_name,
            evaluation_period=request.evaluation_period,
            starting_level_group=level_label,
            growth_percentile=percentile,
            relative_tier=tier,
            cohort_size_bucket=size_bucket,
            privacy_safe=True,
            reason=None
        )

    def _get_level_group_label(self, score: float) -> str:
        """Maps baseline score to coarse proficiency bracket."""
        if score >= 85.0:
            return "Advanced Baseline (85–100)"
        elif score >= 70.0:
            return "Proficient Baseline (70–84)"
        elif score >= 55.0:
            return "Developing Baseline (55–69)"
        else:
            return "Foundational Baseline (< 55)"
