"""Service for extracting, filtering, and validating evidence links for Growth Narratives."""
from typing import List, Dict, Any, Optional, Set
import pandas as pd

from services.retention_service import RetentionService, COMPETENCIES_MAP, COMPETENCY_NAME_TO_ID
from ..schemas.narrative_schema import EvidenceReference, EvaluationPeriod, NarrativeClaim
from ..utils.date_utils import parse_date_str


class EvidenceLinkService:
    """Manages verified evidence extraction and strict evidence-claim linking."""

    def __init__(self, retention_service: Optional[RetentionService] = None):
        self.retention_service = retention_service or RetentionService.get_instance()

    def get_period_evidence(
        self,
        learner_id: str,
        period: Optional[EvaluationPeriod] = None,
        competency_ids: Optional[List[str]] = None
    ) -> List[EvidenceReference]:
        """
        Retrieves verified evidence records bounded strictly to the evaluation period.
        """
        resolved_id = self.retention_service.resolve_learner_id(learner_id)
        df = self.retention_service.evidence_df

        if df is None or df.empty:
            return []

        sub = df[df["learner_id"] == resolved_id]
        if sub.empty:
            return []

        # Filter by competencies if specified
        if competency_ids:
            target_cids = [COMPETENCY_NAME_TO_ID.get(c, c) for c in competency_ids]
            sub = sub[sub["competency_id"].isin(target_cids)]

        # Filter by period dates
        if period and period.start_date and period.end_date:
            start_dt = parse_date_str(period.start_date)
            end_dt = parse_date_str(period.end_date)
            if start_dt and end_dt:
                sub = sub[
                    (sub["timestamp"] >= pd.Timestamp(start_dt)) &
                    (sub["timestamp"] <= pd.Timestamp(end_dt))
                ]

        # Sort chronologically
        sub = sub.sort_values("timestamp")

        evidence_list: List[EvidenceReference] = []
        for _, row in sub.iterrows():
            eid = str(row["evidence_id"])
            cid = str(row["competency_id"])
            c_name = COMPETENCIES_MAP.get(cid, cid)
            src = str(row.get("evidence_source", "verified_event"))
            detail = str(row.get("source_detail", ""))
            ts_str = str(row["timestamp"])[:10]
            raw_score = float(row.get("raw_score", 0.0))

            title = f"{c_name} Assessment / Project"

            evidence_list.append(EvidenceReference(
                evidence_id=eid,
                source=src,
                source_type=src,
                timestamp=ts_str,
                title=title,
                raw_score=raw_score,
                detail=f"{detail} ({c_name}, Score: {raw_score:.1f})"
            ))

        return evidence_list

    def validate_claims_against_evidence(
        self,
        claims: List[NarrativeClaim],
        verified_evidence: List[EvidenceReference]
    ) -> List[NarrativeClaim]:
        """
        Validates that every claim's cited evidence_ids exist in the verified evidence set.
        """
        verified_id_set: Set[str] = {e.evidence_id for e in verified_evidence}

        validated_claims: List[NarrativeClaim] = []
        for claim in claims:
            existing_ids = [eid for eid in claim.evidence_ids if eid in verified_id_set]
            has_valid_citations = len(existing_ids) > 0 or len(verified_evidence) == 0
            is_fully_verified = has_valid_citations and (len(existing_ids) == len(claim.evidence_ids))

            validated_claims.append(NarrativeClaim(
                claim_id=claim.claim_id,
                competency_id=claim.competency_id,
                competency_name=claim.competency_name,
                claim_text=claim.claim_text,
                trend=claim.trend,
                evidence_ids=existing_ids if existing_ids else claim.evidence_ids[:1],
                verified=is_fully_verified
            ))

        return validated_claims
