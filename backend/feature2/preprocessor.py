"""Evidence Normalization and Preprocessing for Feature 2.
Enforces chronological ordering, deduplication, timezone normalization,
and grouping by (employee_id, competency_id).
"""
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from collections import defaultdict

from backend.feature2.schemas import CanonicalCompetencyEvidence
from backend.core.logging import get_logger

logger = get_logger("feature2.preprocessor")


class EvidencePreprocessor:
    """Normalizes and groups chronological competency evidence."""

    @staticmethod
    def validate_and_normalize(evidence_items: List[CanonicalCompetencyEvidence]) -> List[CanonicalCompetencyEvidence]:
        """
        Validates evidence items, standardizes timestamps to UTC,
        and removes malformed or duplicate records.
        """
        valid_items: List[CanonicalCompetencyEvidence] = []
        seen_keys = set()

        for item in evidence_items:
            # 1. Validation: Essential fields must exist
            if not item.employee_id or not item.competency_id or not item.timestamp:
                logger.warning(f"Discarding malformed evidence item: {item.evidence_id}")
                continue

            # 2. Timezone normalization to UTC
            ts = item.timestamp
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            else:
                ts = ts.astimezone(timezone.utc)
            item.timestamp = ts

            # 3. Deduplication key (by evidence_id or signature)
            dedup_key = (
                item.evidence_id,
                item.employee_id,
                item.competency_id,
                ts.isoformat(),
                item.title.strip().lower()
            )
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            valid_items.append(item)

        # 4. Strictly sort chronologically by timestamp
        valid_items.sort(key=lambda x: x.timestamp)
        return valid_items

    @classmethod
    def deduplicate_evidence(cls, evidence_items: List[CanonicalCompetencyEvidence]) -> List[CanonicalCompetencyEvidence]:
        """Convenience method returning deduplicated and normalized items."""
        return cls.validate_and_normalize(evidence_items)

    @staticmethod
    def sort_chronologically(evidence_items: List[CanonicalCompetencyEvidence]) -> List[CanonicalCompetencyEvidence]:
        """Sorts evidence items chronologically by UTC timestamp."""
        return sorted(evidence_items, key=lambda x: x.timestamp)

    @classmethod
    def group_by_employee_competency(
        cls,
        evidence_items: List[CanonicalCompetencyEvidence]
    ) -> Dict[Tuple[str, str], List[CanonicalCompetencyEvidence]]:
        """
        Groups normalized evidence into chronological sequences indexed by:
        (employee_id, competency_id) -> [evidence_1, evidence_2, ...].
        """
        cleaned = cls.validate_and_normalize(evidence_items)
        grouped = defaultdict(list)

        for item in cleaned:
            grouped[(item.employee_id, item.competency_id)].append(item)

        # Ensure every sequence is sorted chronologically
        for key in grouped:
            grouped[key].sort(key=lambda x: x.timestamp)

        return dict(grouped)
