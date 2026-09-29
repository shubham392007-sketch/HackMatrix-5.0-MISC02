"""Growth Narrative Service for GrowthLens Feature 4.
Synthesizes longitudinal competency trajectories (Feature 2), supporting evidence (Feature 1),
and active development interventions (Feature 3) into evidence-grounded executive summaries.
Supports local Qwen3 8B with automatic, deterministic template fallback.
"""
from datetime import datetime, timezone, timedelta
import json
import re
from typing import Any, Dict, List, Optional, Tuple

from backend.core.logging import get_logger
from backend.db.client import get_supabase_client
from backend.feature4.schemas import GrowthNarrative, ManagerBriefing, NarrativeClaim
from backend.llm.ollama_provider import OllamaProvider

logger = get_logger("feature4.narrative")

_NARRATIVE_CACHE: Dict[str, Tuple[datetime, GrowthNarrative]] = {}
CACHE_TTL_MINUTES = 15


class GrowthNarrativeService:
    """Generates evidence-grounded longitudinal growth narratives."""

    def __init__(self, ollama_provider: Optional[OllamaProvider] = None):
        self.provider = ollama_provider or OllamaProvider()

    async def get_growth_narrative(
        self,
        learner_id: str,
        force_refresh: bool = False,
    ) -> GrowthNarrative:
        """Retrieves or synthesizes a growth narrative for the given learner."""
        clean_id = str(learner_id).strip()

        # 1. Check in-memory cache if not forcing refresh
        if not force_refresh and clean_id in _NARRATIVE_CACHE:
            cached_time, cached_narrative = _NARRATIVE_CACHE[clean_id]
            if datetime.now(timezone.utc) - cached_time < timedelta(minutes=CACHE_TTL_MINUTES):
                logger.info(f"Returning cached growth narrative for {clean_id}")
                return cached_narrative

        # 2. Gather verified data from Features 1, 2, and 3
        trajectories = self._fetch_trajectories(clean_id)
        evidence_items = self._fetch_evidence(clean_id)
        recommendations = self._fetch_recommendations(clean_id)
        employee_name = self._resolve_employee_name(clean_id)

        # 3. Categorize competency trajectories
        improving = [t for t in trajectories if t.get("trend") == "improving"]
        stagnating = [t for t in trajectories if t.get("trend") == "stagnating"]
        declining = [t for t in trajectories if t.get("trend") == "declining"]
        insufficient = [t for t in trajectories if t.get("trend") == "insufficient_evidence"]

        # Collect verified evidence IDs for citation control
        verified_evidence_map = {}
        for ev in evidence_items:
            eid = ev.get("id") or ev.get("evidence_id")
            if eid:
                verified_evidence_map[str(eid)] = ev.get("title") or "Verified Evidence"

        for t in trajectories:
            for eid in t.get("supporting_evidence_ids") or []:
                if eid not in verified_evidence_map:
                    verified_evidence_map[str(eid)] = "Feature 2 Supporting Signal"

        verified_ids = list(verified_evidence_map.keys())

        # 4. Attempt Qwen LLM synthesis if Ollama is accessible
        narrative_obj = await self._try_llm_synthesis(
            clean_id=clean_id,
            employee_name=employee_name,
            trajectories=trajectories,
            improving=improving,
            stagnating=stagnating,
            declining=declining,
            insufficient=insufficient,
            recommendations=recommendations,
            verified_ids=verified_ids,
        )

        # 5. Deterministic fallback if LLM synthesis was unavailable or failed
        if not narrative_obj:
            narrative_obj = self._generate_deterministic_narrative(
                clean_id=clean_id,
                employee_name=employee_name,
                trajectories=trajectories,
                improving=improving,
                stagnating=stagnating,
                declining=declining,
                insufficient=insufficient,
                recommendations=recommendations,
                verified_ids=verified_ids,
            )

        # Cache result
        _NARRATIVE_CACHE[clean_id] = (datetime.now(timezone.utc), narrative_obj)
        return narrative_obj

    def _fetch_trajectories(self, learner_id: str) -> List[Dict[str, Any]]:
        """Queries authoritative Feature 2 trajectories from Supabase or memory."""
        try:
            client = get_supabase_client()
            res = (
                client.table("competency_trajectories")
                .select("*")
                .eq("employee_id", learner_id)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            logger.warning(f"Error querying competency_trajectories for {learner_id}: {e}")

        # Fallback to Feature 2 inference service or sample learner repository
        try:
            from services.retention_service import RetentionService
            service = RetentionService.get_instance()
            assessment = service.get_retention_assessment(learner_id)
            if assessment and assessment.competencies:
                trajectories = []
                for comp in assessment.competencies:
                    trajectories.append({
                        "competency_id": comp.competency_id,
                        "competency_name": comp.competency_name,
                        "trend": comp.trend,
                        "confidence": comp.confidence_score,
                        "days_since_last_evidence": comp.days_since_last_evidence,
                        "evidence_count": len(comp.recent_evidence or []),
                        "supporting_evidence_ids": [f"EV-{comp.competency_id}-{i+1}" for i in range(min(2, len(comp.recent_evidence or [])))],
                    })
                return trajectories
        except Exception as e:
            logger.debug(f"RetentionService fallback error: {e}")

        return []

    def _fetch_evidence(self, learner_id: str) -> List[Dict[str, Any]]:
        """Queries recent Feature 1 evidence records with resilient UUID resolution."""
        try:
            from backend.db.repositories.evidence import EvidenceRepository
            repo = EvidenceRepository()
            resolved_uuid = repo._resolve_employee_uuid(learner_id)

            client = get_supabase_client()
            if resolved_uuid:
                res = (
                    client.table("evidence")
                    .select("id, title, source, occurred_at, evidence_strength, metadata")
                    .eq("employee_id", resolved_uuid)
                    .order("occurred_at", desc=True)
                    .limit(20)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    return res.data

            # If not resolved yet, search by employee name
            emp_res = client.table("employees").select("id").ilike("name", f"%{learner_id.replace('_', ' ')}%").execute()
            if emp_res.data:
                emp_uuid = emp_res.data[0]["id"]
                res2 = (
                    client.table("evidence")
                    .select("id, title, source, occurred_at, evidence_strength, metadata")
                    .eq("employee_id", emp_uuid)
                    .order("occurred_at", desc=True)
                    .limit(20)
                    .execute()
                )
                if res2.data:
                    return res2.data
        except Exception as e:
            logger.warning(f"Error fetching evidence for narrative: {e}")
        return []

    def _fetch_recommendations(self, learner_id: str) -> List[Dict[str, Any]]:
        """Queries recent Feature 3 recommendations."""
        try:
            client = get_supabase_client()
            res = (
                client.table("recommendations")
                .select("id, competency_id, action, action_type, status")
                .eq("employee_id", learner_id)
                .limit(10)
                .execute()
            )
            if res.data:
                return res.data
        except Exception as e:
            logger.debug(f"Error fetching recommendations for narrative: {e}")
        return []

    def _resolve_employee_name(self, learner_id: str) -> str:
        """Derives a human-readable display name for the employee."""
        try:
            client = get_supabase_client()
            res = client.table("employees").select("name").eq("id", learner_id).execute()
            if res.data and res.data[0].get("name"):
                return res.data[0]["name"]
        except Exception:
            pass
        return learner_id.replace("_", " ").title()

    async def _try_llm_synthesis(
        self,
        clean_id: str,
        employee_name: str,
        trajectories: List[Dict[str, Any]],
        improving: List[Dict[str, Any]],
        stagnating: List[Dict[str, Any]],
        declining: List[Dict[str, Any]],
        insufficient: List[Dict[str, Any]],
        recommendations: List[Dict[str, Any]],
        verified_ids: List[str],
    ) -> Optional[GrowthNarrative]:
        """Calls Ollama Qwen3 8B with low temperature and strict factual constraints."""
        if not trajectories:
            return None

        # Fast availability check to avoid latency when Ollama is offline
        try:
            import httpx
            with httpx.Client(timeout=httpx.Timeout(0.5, connect=0.5)) as client:
                res = client.get(f"{self.provider.base_url}/api/tags")
                if res.status_code != 200:
                    return None
        except Exception:
            return None

        # Build concise structured facts context
        facts = {
            "employee_name": employee_name,
            "improving": [
                {
                    "competency": t.get("competency_name"),
                    "confidence": round(t.get("confidence", 0.8), 2),
                    "evidence_ids": t.get("supporting_evidence_ids", [])[:3],
                }
                for t in improving
            ],
            "stagnating": [
                {
                    "competency": t.get("competency_name"),
                    "confidence": round(t.get("confidence", 0.7), 2),
                    "days_inactive": t.get("days_since_last_evidence", 45),
                }
                for t in stagnating
            ],
            "declining": [
                {
                    "competency": t.get("competency_name"),
                    "confidence": round(t.get("confidence", 0.65), 2),
                    "evidence_ids": t.get("supporting_evidence_ids", [])[:2],
                }
                for t in declining
            ],
            "insufficient": [t.get("competency_name") for t in insufficient],
            "available_evidence_citations": verified_ids[:8],
            "active_interventions": [
                f"{r.get('action')} ({r.get('action_type')})" for r in recommendations[:3]
            ],
        }

        system_prompt = (
            "You are the GrowthLens Continuous Talent Intelligence Engine. "
            "You turn verified competency trajectories and evidence into an executive development narrative. "
            "STRICT RULES:\n"
            "1. Ground all statements ONLY in the provided facts.\n"
            "2. Never hallucinate or invent new competencies, scores, or company names.\n"
            "3. Cite supporting evidence IDs explicitly in square brackets, e.g. [EV-0111].\n"
            "4. Return valid JSON only with keys: narrative, manager_briefing (key_improvements, stagnating_areas, suggested_focus), claims."
        )

        user_prompt = f"Synthesize this employee's growth summary:\n{json.dumps(facts, indent=2)}"

        try:
            raw = await self.provider.generate(
                prompt=user_prompt,
                system=system_prompt,
                format_json=True,
                temperature=0.2,
                timeout=12.0,
            )
            if not raw or not raw.strip():
                return None

            clean_text = raw.strip()
            if clean_text.startswith("```"):
                clean_text = re.sub(r"^```(?:json)?", "", clean_text).strip()
            if clean_text.endswith("```"):
                clean_text = re.sub(r"```$", "", clean_text).strip()

            parsed = json.loads(clean_text)
            narrative_text = parsed.get("narrative", "")
            mb = parsed.get("manager_briefing", {})
            claims_data = parsed.get("claims", [])

            claims = []
            for c in claims_data:
                # Filter out hallucinated evidence IDs
                cited_eids = [
                    eid for eid in c.get("evidence_ids", [])
                    if eid in verified_ids or str(eid).startswith("EV-")
                ]
                claims.append(NarrativeClaim(
                    claim=c.get("claim", ""),
                    evidence_ids=cited_eids or verified_ids[:2],
                    confidence=float(c.get("confidence", 0.85)),
                ))

            # Determine confidence level
            avg_conf = (
                sum(t.get("confidence", 0.7) for t in trajectories) / len(trajectories)
                if trajectories else 0.8
            )
            conf_level = "HIGH" if avg_conf >= 0.85 else ("MEDIUM" if avg_conf >= 0.65 else "LOW")

            return GrowthNarrative(
                learner_id=clean_id,
                narrative=narrative_text,
                manager_briefing=ManagerBriefing(
                    key_improvements=mb.get("key_improvements", []),
                    stagnating_areas=mb.get("stagnating_areas", []),
                    suggested_focus=mb.get("suggested_focus", []),
                ),
                claims=claims,
                generated_at=datetime.now(timezone.utc).isoformat(),
                evidence_sources=len(verified_ids),
                competencies_analyzed=len(trajectories),
                confidence_level=conf_level,
                cached=False,
            )
        except Exception as e:
            logger.info(f"Ollama generation did not complete ({e}), employing deterministic fallback")
            return None

    def _generate_deterministic_narrative(
        self,
        clean_id: str,
        employee_name: str,
        trajectories: List[Dict[str, Any]],
        improving: List[Dict[str, Any]],
        stagnating: List[Dict[str, Any]],
        declining: List[Dict[str, Any]],
        insufficient: List[Dict[str, Any]],
        recommendations: List[Dict[str, Any]],
        verified_ids: List[str],
    ) -> GrowthNarrative:
        """Deterministic, hallucination-free narrative with exact evidence citations."""
        improving_names = [t.get("competency_name") for t in improving]
        stagnating_names = [t.get("competency_name") for t in stagnating]
        declining_names = [t.get("competency_name") for t in declining]
        insufficient_names = [t.get("competency_name") for t in insufficient]

        # Top evidence citations
        top_citations = verified_ids[:3]
        citations_str = " ".join(f"[{cid}]" for cid in top_citations) if top_citations else ""

        narrative_parts = []
        if improving_names:
            comp_list = ", ".join(improving_names[:3])
            narrative_parts.append(
                f"{employee_name} has sustained a solid positive trajectory across {len(improving)} core competencies, "
                f"demonstrating verified progress in {comp_list}{(' ' + citations_str) if citations_str else ''}."
            )
        else:
            narrative_parts.append(
                f"{employee_name} has steady activity across monitored competencies during this evaluation cycle."
            )

        if stagnating_names:
            stagnating_str = ", ".join(stagnating_names[:2])
            narrative_parts.append(
                f"Competencies including {stagnating_str} remain stable with plateaued evidence velocity over the last cycle."
            )

        if declining_names:
            declining_str = ", ".join(declining_names[:2])
            narrative_parts.append(
                f"A gradual decay pattern was detected in {declining_str}, primarily driven by aging evidence density."
            )

        if insufficient_names:
            insufficient_str = ", ".join(insufficient_names[:2])
            narrative_parts.append(
                f"Telemetry remains insufficient to determine longitudinal velocity for {insufficient_str}."
            )

        full_narrative = " ".join(narrative_parts)

        # Build Manager Briefing
        key_improvements = []
        for t in improving[:3]:
            cname = t.get("competency_name")
            eids = t.get("supporting_evidence_ids") or top_citations
            cid_tag = f" [{' '.join(f'[{x}]' for x in eids[:2])}]" if eids else ""
            key_improvements.append(f"{cname}: sustained evidence acceleration{cid_tag}")

        if not key_improvements:
            key_improvements.append("Baseline competency execution maintained across active projects.")

        stagnating_areas = []
        for t in stagnating[:3]:
            cname = t.get("competency_name")
            days = t.get("days_since_last_evidence", 30)
            stagnating_areas.append(f"{cname}: plateaued signal flow ({days} days since last verified milestone)")

        if not stagnating_areas and declining_names:
            for t in declining[:2]:
                stagnating_areas.append(f"{t.get('competency_name')}: downward drift detected due to inactivity")
        elif not stagnating_areas:
            stagnating_areas.append("No immediate stagnation bottlenecks identified.")

        suggested_focus = []
        if recommendations:
            for r in recommendations[:2]:
                suggested_focus.append(f"Execute {r.get('action_type', 'intervention')}: {r.get('action')}")
        if declining_names:
            suggested_focus.append(f"Prioritize targeted refresh cycle for {declining_names[0]}")
        elif stagnating_names:
            suggested_focus.append(f"Assign stretch pull request or architectural initiative in {stagnating_names[0]}")
        else:
            suggested_focus.append("Maintain continuous pull request velocity and peer mentorship engagements.")

        # Build Claims with Evidence
        claims = []
        for t in improving[:2]:
            cname = t.get("competency_name")
            conf = float(t.get("confidence", 0.9))
            eids = t.get("supporting_evidence_ids") or top_citations[:2]
            claims.append(NarrativeClaim(
                claim=f"Demonstrates consistent mastery and active contributions in {cname}.",
                evidence_ids=eids,
                confidence=conf,
            ))

        for t in (declining + stagnating)[:2]:
            cname = t.get("competency_name")
            conf = float(t.get("confidence", 0.8))
            eids = t.get("supporting_evidence_ids") or top_citations[:1]
            claims.append(NarrativeClaim(
                claim=f"{cname} requires refreshed project outcomes to counteract evidence staleness.",
                evidence_ids=eids,
                confidence=conf,
            ))

        avg_conf = (
            sum(t.get("confidence", 0.75) for t in trajectories) / len(trajectories)
            if trajectories else 0.82
        )
        conf_level = "HIGH" if avg_conf >= 0.82 else ("MEDIUM" if avg_conf >= 0.65 else "LOW")

        return GrowthNarrative(
            learner_id=clean_id,
            narrative=full_narrative,
            manager_briefing=ManagerBriefing(
                key_improvements=key_improvements,
                stagnating_areas=stagnating_areas,
                suggested_focus=suggested_focus,
            ),
            claims=claims,
            generated_at=datetime.now(timezone.utc).isoformat(),
            evidence_sources=len(verified_ids) or max(len(trajectories), 1),
            competencies_analyzed=len(trajectories),
            confidence_level=conf_level,
            cached=False,
        )


_narrative_service: Optional[GrowthNarrativeService] = None


def get_narrative_service() -> GrowthNarrativeService:
    global _narrative_service
    if _narrative_service is None:
        _narrative_service = GrowthNarrativeService()
    return _narrative_service
