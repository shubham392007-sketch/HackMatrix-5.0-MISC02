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

    def get_existing_references(self, source: str, source_references: List[str]) -> set:
        """Batch check existing references in a single query to eliminate N round trips."""
        if not source_references:
            return set()
        try:
            res = self.client.table("evidence").select("source_reference").eq("source", source).in_("source_reference", source_references).execute()
            return {r["source_reference"] for r in (res.data or []) if r.get("source_reference")}
        except Exception as e:
            logger.warning(f"Batch reference check failed: {e}")
            return set()

    def search_text(self, employee_id: str, query: str, limit: int = 5) -> List[dict]:
        """Perform text matching against employee evidence title and content."""
        target_uuid = self._resolve_employee_uuid(employee_id) or str(employee_id)
        tokens = [t.strip().lower() for t in query.split() if len(t.strip()) > 2]
        all_records = self.list_by_employee(target_uuid, limit=100)
        if not tokens:
            return all_records[:limit]

        matched = []
        for r in all_records:
            t = (r.get("title") or "").lower()
            c = (r.get("content") or "").lower()
            match_count = sum(1 for tok in tokens if tok in t or tok in c)
            if match_count > 0:
                matched.append((match_count, r))

        matched.sort(key=lambda x: x[0], reverse=True)
        results = [m[1] for m in matched]
        return (results if results else all_records)[:limit]

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

    def _resolve_employee_uuid(self, employee_id: str) -> Optional[str]:
        """Resolves employee_id whether it is an employees.id, profiles.id / user_id, or slug/name."""
        if not employee_id:
            return None
        import uuid
        is_uuid = False
        try:
            uuid.UUID(str(employee_id))
            is_uuid = True
        except (ValueError, AttributeError):
            is_uuid = False

        if is_uuid:
            str_id = str(employee_id)
            # 1. Direct match on employees.id
            try:
                emp = self.client.table("employees").select("id").eq("id", str_id).execute()
                if emp.data:
                    return str(emp.data[0]["id"])
            except Exception as e:
                logger.debug(f"Direct employee id check failed: {e}")

            # 2. Check if it matches employees.user_id (Supabase auth user id)
            try:
                emp_by_user = self.client.table("employees").select("id").eq("user_id", str_id).execute()
                if emp_by_user.data:
                    return str(emp_by_user.data[0]["id"])
            except Exception as e:
                logger.debug(f"User ID employee check failed: {e}")

            # 3. Check profiles table (auth user profile)
            try:
                prof = self.client.table("profiles").select("id, user_id, full_name, email").eq("id", str_id).execute()
                if not prof.data:
                    prof = self.client.table("profiles").select("id, user_id, full_name, email").eq("user_id", str_id).execute()
                if prof.data:
                    p = prof.data[0]
                    # Find employee matching email or user_id
                    emp_match = self.client.table("employees").select("id").or_(f"user_id.eq.{p['user_id']},email.eq.{p['email']}").execute()
                    if emp_match.data:
                        # Link user_id if missing
                        target_id = emp_match.data[0]["id"]
                        self.client.table("employees").update({"user_id": p["user_id"]}).eq("id", target_id).execute()
                        return str(target_id)
                    else:
                        # Auto-create employee record so evidence and vectors can be cleanly attached
                        new_emp = self.client.table("employees").insert({
                            "user_id": p["user_id"],
                            "name": p.get("full_name") or p["email"].split("@")[0],
                            "email": p["email"],
                            "role": "Software Engineer",
                            "department": "Engineering",
                        }).execute()
                        if new_emp.data:
                            return str(new_emp.data[0]["id"])
            except Exception as e:
                logger.warning(f"Profile to employee lookup failed: {e}")

            return str_id

        # 4. Resolve slug / display name (e.g. 'shubham_pokale')
        try:
            slug_words = str(employee_id).replace("_", " ").strip().split()
            first_word = slug_words[0] if slug_words else str(employee_id)
            res = self.client.table("employees").select("id").ilike("name", f"%{first_word}%").limit(1).execute()
            if res.data:
                return res.data[0]["id"]
        except Exception as e:
            logger.warning(f"Failed to resolve employee slug {employee_id}: {e}")
        return None

    def list_by_employee(self, employee_id: str, limit: int = 50, offset: int = 0) -> List[dict]:
        target_uuid = self._resolve_employee_uuid(employee_id)
        if not target_uuid:
            return []

        res = (
            self.client.table("evidence")
            .select("*")
            .eq("employee_id", target_uuid)
            .order("occurred_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return res.data or []

    def get_employee_evidence_by_id(self, employee_id: str, evidence_id: str) -> Optional[dict]:
        target_uuid = self._resolve_employee_uuid(employee_id)
        if not target_uuid:
            # Fallback to direct query by ID
            return self.get_by_id(evidence_id)

        res = (
            self.client.table("evidence")
            .select("*")
            .eq("employee_id", target_uuid)
            .eq("id", evidence_id)
            .execute()
        )
        return res.data[0] if res.data else self.get_by_id(evidence_id)

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
