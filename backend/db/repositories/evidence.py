from typing import Any, List, Optional
from backend.db.client import get_supabase_client
from backend.schemas.evidence import CanonicalEvidence, EvidenceCreate
from backend.core.logging import get_logger

logger = get_logger("db.repositories.evidence")


class EvidenceRepository:
    def __init__(self):
        self.client = get_supabase_client()

    def get_by_id(self, evidence_id: str) -> Optional[dict]:
        res = self.client.table("evidence").select("*").eq("id", evidence_id).execute()
        return res.data[0] if res.data else None

    def exists_by_reference(self, source: str, source_reference: str) -> bool:
        res = self.client.table("evidence").select("id").eq("source", source).eq("source_reference", source_reference).execute()
        return len(res.data) > 0

    def create(self, evidence: CanonicalEvidence) -> dict:
        payload = {
            "id": evidence.evidence_id,
            "employee_id": evidence.employee_id,
            "source": evidence.source,
            "source_type": evidence.source_type,
            "source_reference": evidence.source_reference,
            "project_id": evidence.project_id,
            "project_name": evidence.project_name,
            "title": evidence.title,
            "content": evidence.content,
            "occurred_at": evidence.occurred_at.isoformat(),
            "evidence_type": evidence.evidence_type,
            "evidence_strength": evidence.evidence_strength,
            "metadata": evidence.metadata,
            "is_mapped": evidence.is_mapped,
            "unmapped_external_identity": evidence.unmapped_external_identity,
        }
        res = self.client.table("evidence").insert(payload).execute()
        return res.data[0] if res.data else payload

    def list_by_employee(self, employee_id: str, limit: int = 50, offset: int = 0) -> List[dict]:
        res = (
            self.client.table("evidence")
            .select("*")
            .eq("employee_id", employee_id)
            .order("occurred_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return res.data or []

    def get_employee_evidence_by_id(self, employee_id: str, evidence_id: str) -> Optional[dict]:
        res = (
            self.client.table("evidence")
            .select("*")
            .eq("employee_id", employee_id)
            .eq("id", evidence_id)
            .execute()
        )
        return res.data[0] if res.data else None

    def update_ai_extraction(self, evidence_id: str, summary: str) -> None:
        self.client.table("evidence").update({
            "ai_processed": True,
            "ai_summary": summary,
        }).eq("id", evidence_id).execute()

    def attach_skill(self, evidence_id: str, skill_id: str, confidence: float) -> dict:
        payload = {
            "evidence_id": evidence_id,
            "skill_id": skill_id,
            "extraction_confidence": float(confidence),
        }
        res = self.client.table("evidence_skills").upsert(payload, on_conflict="evidence_id,skill_id").execute()
        return res.data[0] if res.data else payload

    def attach_competency(self, evidence_id: str, competency_id: str, confidence: float) -> dict:
        payload = {
            "evidence_id": evidence_id,
            "competency_id": competency_id,
            "extraction_confidence": float(confidence),
        }
        res = self.client.table("evidence_competencies").upsert(payload, on_conflict="evidence_id,competency_id").execute()
        return res.data[0] if res.data else payload

    def get_evidence_skills_and_competencies(self, evidence_id: str) -> dict:
        skills_res = (
            self.client.table("evidence_skills")
            .select("skill_id, extraction_confidence, skills(name)")
            .eq("evidence_id", evidence_id)
            .execute()
        )
        comp_res = (
            self.client.table("evidence_competencies")
            .select("competency_id, extraction_confidence, competencies(name)")
            .eq("evidence_id", evidence_id)
            .execute()
        )
        return {
            "skills": skills_res.data or [],
            "competencies": comp_res.data or []
        }

    def get_batch_skills_and_competencies(self, evidence_ids: List[str]) -> dict[str, dict]:
        """Fetch skills and competencies for a list of evidence IDs in 2 batch queries."""
        if not evidence_ids:
            return {}
        result = {eid: {"skills": [], "competencies": []} for eid in evidence_ids}
        try:
            skills_res = (
                self.client.table("evidence_skills")
                .select("evidence_id, skill_id, extraction_confidence, skills(name)")
                .in_("evidence_id", evidence_ids)
                .execute()
            )
            for row in (skills_res.data or []):
                eid = row.get("evidence_id")
                if eid in result and row.get("skills"):
                    name = row["skills"].get("name")
                    if name and name not in result[eid]["skills"]:
                        result[eid]["skills"].append(name)
        except Exception as e:
            logger.warning(f"Failed to fetch batch skills: {e}")

        try:
            comp_res = (
                self.client.table("evidence_competencies")
                .select("evidence_id, competency_id, extraction_confidence, competencies(name)")
                .in_("evidence_id", evidence_ids)
                .execute()
            )
            for row in (comp_res.data or []):
                eid = row.get("evidence_id")
                if eid in result and row.get("competencies"):
                    name = row["competencies"].get("name")
                    if name and name not in result[eid]["competencies"]:
                        result[eid]["competencies"].append(name)
        except Exception as e:
            logger.warning(f"Failed to fetch batch competencies: {e}")

        return result
