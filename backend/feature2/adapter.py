"""Feature 1 Evidence Adapter.
Transforms raw Feature 1 database records and CSV data into CanonicalCompetencyEvidence.
Guarantees decoupling between Feature 1 ingestors and Feature 2 ML feature extraction.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import dateutil.parser

from backend.feature2.schemas import CanonicalCompetencyEvidence
from backend.core.logging import get_logger

logger = get_logger("feature2.adapter")

# Fallback mapping for competency code/name resolution
COMPETENCY_LOOKUP: Dict[str, str] = {
    "C01": "Backend Engineering & API Development",
    "C02": "Data Processing & Analytics",
    "C03": "Database Systems & Storage",
    "C04": "DevOps & Cloud Infrastructure",
    "C05": "Quality Assurance & Testing",
    "C06": "Technical Communication & Collaboration",
    # Legacy codes from misc02 dataset
    "Python Programming": "Backend Engineering & API Development",
    "Data Analysis": "Data Processing & Analytics",
    "SQL & Databases": "Database Systems & Storage",
    "Cloud Deployment": "DevOps & Cloud Infrastructure",
    "Communication": "Technical Communication & Collaboration",
    "Stakeholder Management": "Technical Communication & Collaboration",
    "Team Leadership": "Technical Communication & Collaboration",
}


def parse_timestamp(raw_ts: Any) -> datetime:
    """Robust ISO/UTC timestamp parser."""
    if isinstance(raw_ts, datetime):
        if raw_ts.tzinfo is None:
            return raw_ts.replace(tzinfo=timezone.utc)
        return raw_ts
    if isinstance(raw_ts, str):
        try:
            dt = dateutil.parser.isoparse(raw_ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            pass
    # Fallback default
    return datetime.now(timezone.utc)


class Feature1EvidenceAdapter:
    """Adapts Feature 1 evidence structures to CanonicalCompetencyEvidence."""

    @staticmethod
    def from_db_record(
        evidence_row: Dict[str, Any],
        competency_id: str,
        competency_name: str,
    ) -> CanonicalCompetencyEvidence:
        """Adapts a row from public.evidence + junction table."""
        ts = parse_timestamp(evidence_row.get("occurred_at") or evidence_row.get("created_at"))
        
        # Calculate raw score if available in metadata or explicit field
        meta = evidence_row.get("metadata") or {}
        raw_score = None
        if "score" in meta:
            try:
                raw_score = float(meta["score"])
            except (ValueError, TypeError):
                pass
        elif "raw_score" in evidence_row and evidence_row["raw_score"] is not None:
            try:
                raw_score = float(evidence_row["raw_score"])
            except (ValueError, TypeError):
                pass

        strength = 1.0
        if "evidence_strength" in evidence_row and evidence_row["evidence_strength"] is not None:
            try:
                strength = float(evidence_row["evidence_strength"])
            except (ValueError, TypeError):
                pass

        return CanonicalCompetencyEvidence(
            evidence_id=str(evidence_row.get("id") or evidence_row.get("evidence_id")),
            employee_id=str(evidence_row.get("employee_id")),
            organization_id=str(evidence_row.get("organization_id")) if evidence_row.get("organization_id") else None,
            competency_id=competency_id,
            competency_name=competency_name,
            timestamp=ts,
            source=str(evidence_row.get("source", "internal")),
            source_type=str(evidence_row.get("source_type", "project_activity")),
            source_reference=str(evidence_row.get("source_reference", "")),
            title=str(evidence_row.get("title", "Evidence Entry")),
            content_summary=evidence_row.get("content") or evidence_row.get("ai_summary"),
            evidence_strength=strength,
            raw_score=raw_score,
            outcome_signal=raw_score,
            metadata=meta,
            is_counterfactual=False,
        )

    @staticmethod
    def from_csv_row(row: Dict[str, Any]) -> CanonicalCompetencyEvidence:
        """Adapts a row from misc02_dataset/evidence.csv."""
        comp_id = str(row.get("competency_id", "C01"))
        comp_name = COMPETENCY_LOOKUP.get(comp_id, f"Competency {comp_id}")
        ts = parse_timestamp(row.get("timestamp"))

        raw_score = None
        if "raw_score" in row and row["raw_score"] != "" and row["raw_score"] is not None:
            try:
                raw_score = float(row["raw_score"])
            except (ValueError, TypeError):
                pass

        strength = 1.0
        if "source_confidence_weight" in row and row["source_confidence_weight"] != "":
            try:
                strength = float(row["source_confidence_weight"])
            except (ValueError, TypeError):
                pass

        return CanonicalCompetencyEvidence(
            evidence_id=str(row.get("evidence_id")),
            employee_id=str(row.get("learner_id")),
            organization_id=None,
            competency_id=comp_id,
            competency_name=comp_name,
            timestamp=ts,
            source=str(row.get("evidence_source", "internal")).split("_")[0],
            source_type=str(row.get("evidence_source", "commit")),
            source_reference=str(row.get("trajectory_id", "")),
            title=str(row.get("source_detail", "Historical Evidence")),
            content_summary=str(row.get("source_detail", "")),
            evidence_strength=strength,
            raw_score=raw_score,
            outcome_signal=raw_score,
            metadata={"trajectory_id": row.get("trajectory_id")},
            is_counterfactual=False,
        )

    def __init__(self, dataset_csv_path: str = "misc02_dataset/evidence.csv"):
        self.dataset_csv_path = dataset_csv_path
        self._df_cache = None

    def _get_csv_df(self):
        if self._df_cache is None:
            import os
            import pandas as pd
            if os.path.exists(self.dataset_csv_path):
                try:
                    self._df_cache = pd.read_csv(self.dataset_csv_path)
                except Exception as e:
                    logger.warning(f"Could not load CSV evidence dataset: {e}")
        return self._df_cache

    def get_employee_competencies(self, employee_id: str) -> List[str]:
        """Returns all competency IDs tracked for a given employee."""
        competencies = set()

        # 1. From CSV dataset
        df = self._get_csv_df()
        if df is not None and not df.empty:
            matched = df[df["learner_id"] == str(employee_id)]
            if not matched.empty:
                competencies.update(matched["competency_id"].dropna().unique().tolist())

        # 2. From Supabase PostgreSQL DB
        try:
            from backend.db.client import get_supabase_client
            supabase = get_supabase_client()
            ev_res = supabase.table("evidence").select("id").eq("employee_id", employee_id).execute()
            if ev_res.data:
                ev_ids = [r["id"] for r in ev_res.data]
                if ev_ids:
                    junction = supabase.table("evidence_competencies").select("competency_id").in_("evidence_id", ev_ids).execute()
                    for j in junction.data:
                        competencies.add(j["competency_id"])
        except Exception:
            pass

        # If empty but learner ID starts with L, fallback to standard competencies
        if not competencies and str(employee_id).startswith("L"):
            competencies.update(["C01", "C02", "C03", "C04", "C05"])

        return sorted(list(competencies))

    def get_employee_competency_evidence(
        self, employee_id: str, competency_id: str
    ) -> List[CanonicalCompetencyEvidence]:
        """Retrieves and standardizes all chronological evidence for an employee's competency."""
        evidence_list: List[CanonicalCompetencyEvidence] = []

        # 1. From CSV dataset
        df = self._get_csv_df()
        if df is not None and not df.empty:
            matched = df[(df["learner_id"] == str(employee_id)) & (df["competency_id"] == str(competency_id))]
            for _, row in matched.iterrows():
                evidence_list.append(self.from_csv_row(row.to_dict()))

        # 2. From Supabase PostgreSQL DB
        try:
            from backend.db.client import get_supabase_client
            supabase = get_supabase_client()
            junction = supabase.table("evidence_competencies").select("evidence_id, competencies(name)").eq("competency_id", competency_id).execute()
            if junction.data:
                ev_ids = [j["evidence_id"] for j in junction.data]
                comp_name = junction.data[0].get("competencies", {}).get("name", competency_id) if junction.data[0].get("competencies") else competency_id
                if ev_ids:
                    db_ev = supabase.table("evidence").select("*").eq("employee_id", employee_id).in_("id", ev_ids).execute()
                    for row in db_ev.data:
                        evidence_list.append(self.from_db_record(row, competency_id, comp_name))
        except Exception:
            pass

        return evidence_list

    def get_all_employee_evidence_grouped(
        self, employee_id: str
    ) -> Dict[str, List[CanonicalCompetencyEvidence]]:
        """Retrieves and standardizes all chronological evidence for an employee across all competencies in minimal DB queries."""
        from collections import defaultdict
        grouped: Dict[str, List[CanonicalCompetencyEvidence]] = defaultdict(list)

        # 1. From CSV dataset
        df = self._get_csv_df()
        if df is not None and not df.empty:
            matched = df[df["learner_id"] == str(employee_id)]
            for _, row in matched.iterrows():
                comp_id = str(row.get("competency_id", "C01"))
                grouped[comp_id].append(self.from_csv_row(row.to_dict()))

        # 2. From Supabase PostgreSQL DB
        try:
            from backend.db.client import get_supabase_client
            supabase = get_supabase_client()
            db_ev_res = supabase.table("evidence").select("*").eq("employee_id", employee_id).execute()
            if db_ev_res.data:
                ev_map = {r["id"]: r for r in db_ev_res.data}
                ev_ids = list(ev_map.keys())
                if ev_ids:
                    junction = supabase.table("evidence_competencies").select("evidence_id, competency_id, competencies(name)").in_("evidence_id", ev_ids).execute()
                    for j in junction.data:
                        cid = j.get("competency_id")
                        eid = j.get("evidence_id")
                        cname = j.get("competencies", {}).get("name", cid) if j.get("competencies") else cid
                        if eid in ev_map and cid:
                            grouped[cid].append(self.from_db_record(ev_map[eid], cid, cname))
        except Exception as e:
            logger.warning(f"Error fetching grouped employee evidence from DB: {e}")

        # If learner starts with L and no evidence found yet, ensure default competency buckets
        if not grouped and str(employee_id).startswith("L"):
            for default_cid in ["C01", "C02", "C03", "C04", "C05"]:
                grouped[default_cid] = []

        return dict(grouped)

    def get_all_employee_evidence(self, employee_id: str) -> List[CanonicalCompetencyEvidence]:
        """Retrieves all evidence across all competencies for an employee."""
        competencies = self.get_employee_competencies(employee_id)
        all_ev = []
        for comp_id in competencies:
            all_ev.extend(self.get_employee_competency_evidence(employee_id, comp_id))
        return all_ev

