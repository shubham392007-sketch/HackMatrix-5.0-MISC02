"""Service for Stage-1 deterministic fact synthesis and Stage-2 LLM / grounded narrative generation."""
import json
import re
from typing import List, Dict, Any, Optional
import httpx

from services.retention_service import RetentionService, COMPETENCIES_MAP, COMPETENCY_NAME_TO_ID
from ..schemas.narrative_schema import (
    EvaluationPeriod,
    EvidenceReference,
    NarrativeClaim,
    ManagerBriefing,
    GrowthNarrativeRequest,
    GrowthNarrativeResponse,
)
from ..repositories.narrative_repository import NarrativeRepository
from .evidence_link_service import EvidenceLinkService
from ..utils.date_utils import get_quarter_label


class NarrativeService:
    """Orchestrates deterministic claim extraction, LLM synthesis, and evidence validation."""

    def __init__(
        self,
        retention_service: Optional[RetentionService] = None,
        evidence_link_service: Optional[EvidenceLinkService] = None,
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "qwen3:8b",
    ):
        self.retention_service = retention_service or RetentionService.get_instance()
        self.evidence_link_service = evidence_link_service or EvidenceLinkService(self.retention_service)
        self.ollama_base_url = ollama_base_url.rstrip("/")
        self.ollama_model = ollama_model

    async def generate_narrative(self, request: GrowthNarrativeRequest) -> GrowthNarrativeResponse:
        """Generates a complete, evidence-grounded Growth Narrative with Manager Briefing."""
        learner_id = self.retention_service.resolve_learner_id(request.learner_id)

        # 1. Determine period
        period = request.evaluation_period
        if not period or not period.start_date or not period.end_date:
            period = EvaluationPeriod(
                start_date="2026-05-01",
                end_date="2026-09-30",
                label="Q2-Q3 2026"
            )
        elif not period.label:
            period.label = get_quarter_label(period.start_date, period.end_date)

        # Check Cache
        cached = NarrativeRepository.get_narrative(learner_id, period.start_date, period.end_date)
        if cached:
            try:
                return GrowthNarrativeResponse(**cached)
            except Exception:
                pass

        # 2. Extract verified evidence
        evidence_sources = self.evidence_link_service.get_period_evidence(
            learner_id=learner_id,
            period=period,
            competency_ids=request.competency_ids
        )

        # 3. Stage 1: Build deterministic claims
        claims = self._build_deterministic_claims(evidence_sources)

        # 4. Stage 2: Narrative and Manager Briefing generation
        narrative_text, briefing = await self._synthesize_narrative_and_briefing(
            learner_id=learner_id,
            period=period,
            claims=claims,
            evidence=evidence_sources
        )

        # 5. Stage 3: Validate claims
        validated_claims = self.evidence_link_service.validate_claims_against_evidence(
            claims=claims,
            verified_evidence=evidence_sources
        )

        # Map supporting evidence by ID
        supporting_evidence_map = {e.evidence_id: e for e in evidence_sources}

        # Calculate confidence score and coverage
        ev_count = len(evidence_sources)
        if ev_count >= 5:
            coverage = "high"
            conf_score = 0.92
        elif ev_count >= 3:
            coverage = "adequate"
            conf_score = 0.84
        elif ev_count >= 1:
            coverage = "limited"
            conf_score = 0.70
        else:
            coverage = "insufficient"
            conf_score = 0.40

        limitations = []
        if ev_count < 3:
            limitations.append("Fewer than 3 evidence events recorded in this window; confidence interval is widened.")
        if not any(c.trend == "improving" for c in validated_claims):
            limitations.append("No active skill acceleration observed in the current period window.")

        display_name = learner_id.replace('_', ' ').title()
        if self.retention_service.learners_df is not None and not self.retention_service.learners_df.empty:
            match = self.retention_service.learners_df[self.retention_service.learners_df["learner_id"] == learner_id]
            if not match.empty:
                display_name = str(match.iloc[0].get("name") or display_name)

        # 6. Response & Caching
        response_data = GrowthNarrativeResponse(
            success=True,
            learner_id=learner_id,
            learner_name=display_name,
            evaluation_period=period,
            narrative=narrative_text,
            claims=validated_claims,
            manager_briefing=briefing,
            confidence_score=conf_score,
            evidence_coverage=coverage,
            supporting_evidence=supporting_evidence_map,
            limitations=limitations
        )

        NarrativeRepository.save_narrative(
            learner_id=learner_id,
            start_date=period.start_date,
            end_date=period.end_date,
            narrative_data=response_data.model_dump()
        )

        return response_data

    def _build_deterministic_claims(self, evidence: List[EvidenceReference]) -> List[NarrativeClaim]:
        """Constructs grounded claims directly from chronological evidence deltas."""
        if not evidence:
            return [
                NarrativeClaim(
                    claim_id="CLM-001",
                    competency_id="C01",
                    competency_name="General Competency",
                    claim_text="Insufficient active evidence logged during the designated evaluation cycle.",
                    trend="stagnating",
                    evidence_ids=[],
                    verified=True
                )
            ]

        # Group by competency
        comp_groups: Dict[str, List[EvidenceReference]] = {}
        for ev in evidence:
            cid = COMPETENCY_NAME_TO_ID.get(ev.title.split()[0], "C01")
            comp_groups.setdefault(cid, []).append(ev)

        claims: List[NarrativeClaim] = []
        claim_counter = 1

        for cid, items in comp_groups.items():
            comp_name = COMPETENCIES_MAP.get(cid, cid)
            eids = [it.evidence_id for it in items]

            if len(items) == 1:
                single_score = items[0].raw_score
                text = (
                    f"Demonstrated consistent competency in {comp_name} at an observed score of "
                    f"{single_score:.1f} ({items[0].source_type})."
                )
                claims.append(NarrativeClaim(
                    claim_id=f"CLM-{claim_counter:03d}",
                    competency_id=cid,
                    competency_name=comp_name,
                    claim_text=text,
                    trend="stagnating",
                    evidence_ids=eids,
                    verified=True
                ))
            else:
                first_score = items[0].raw_score
                last_score = items[-1].raw_score
                delta = round(last_score - first_score, 1)

                if delta >= 2.0:
                    trend = "improving"
                    verb = f"advanced by +{delta:.1f} points (from {first_score:.1f} to {last_score:.1f})"
                elif delta <= -2.0:
                    trend = "declining"
                    verb = f"experienced a retentive dip of {delta:.1f} points (from {first_score:.1f} to {last_score:.1f})"
                else:
                    trend = "stagnating"
                    verb = f"stabilized steady performance at {last_score:.1f} (baseline: {first_score:.1f})"

                text = f"Skill trajectory for {comp_name} {verb} across {len(items)} verified milestones."
                claims.append(NarrativeClaim(
                    claim_id=f"CLM-{claim_counter:03d}",
                    competency_id=cid,
                    competency_name=comp_name,
                    claim_text=text,
                    trend=trend,
                    evidence_ids=eids,
                    verified=True
                ))
            claim_counter += 1

        return claims

    async def _synthesize_narrative_and_briefing(
        self,
        learner_id: str,
        period: EvaluationPeriod,
        claims: List[NarrativeClaim],
        evidence: List[EvidenceReference]
    ) -> tuple[str, ManagerBriefing]:
        """Tries Ollama LLM synthesis first; gracefully falls back to grounded synthesis."""
        claims_summary = "\n".join([
            f"- [{c.claim_id}] {c.competency_name} ({c.trend}): {c.claim_text} (Evidence: {', '.join(c.evidence_ids)})"
            for c in claims
        ])
        evidence_summary = "\n".join([
            f"- [{e.evidence_id}] on {e.timestamp}: score={e.raw_score} via {e.source_type} ({e.detail})"
            for e in evidence
        ])

        system_prompt = (
            "You are GrowthLens Intelligence. Generate an evidence-backed growth narrative and manager briefing. "
            "CRITICAL: Ground all claims in the provided evidence. Cite evidence IDs [e.g. E001] for every factual statement. "
            "Return valid JSON with keys: narrative_text, key_improvements, stagnating_areas, suggested_focus."
        )

        user_prompt = (
            f"Learner ID: {learner_id}\n"
            f"Period: {period.label} ({period.start_date} to {period.end_date})\n\n"
            f"Verified Claims:\n{claims_summary}\n\n"
            f"Evidence Records:\n{evidence_summary}\n\n"
            "Produce an engaging, professional narrative and manager briefing."
        )

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    f"{self.ollama_base_url}/api/generate",
                    json={
                        "model": self.ollama_model,
                        "prompt": user_prompt,
                        "system": system_prompt,
                        "stream": False,
                        "format": "json"
                    }
                )
                if res.status_code == 200:
                    raw_text = res.json().get("response", "")
                    clean = raw_text.strip()
                    if clean.startswith("```"):
                        clean = re.sub(r"^```(?:json)?", "", clean).strip()
                    if clean.endswith("```"):
                        clean = clean[:-3].strip()
                    data = json.loads(clean)
                    narrative_text = data.get("narrative_text", "")
                    briefing = ManagerBriefing(
                        key_improvements=data.get("key_improvements", []),
                        stagnating_areas=data.get("stagnating_areas", []),
                        suggested_focus=data.get("suggested_focus", [])
                    )
                    if narrative_text and briefing.key_improvements:
                        return narrative_text, briefing
        except Exception:
            pass

        return self._generate_grounded_fallback(learner_id, period, claims, evidence)

    def _generate_grounded_fallback(
        self,
        learner_id: str,
        period: EvaluationPeriod,
        claims: List[NarrativeClaim],
        evidence: List[EvidenceReference]
    ) -> tuple[str, ManagerBriefing]:
        """Deterministic, grounded prose generator ensuring 100% reliability and strict evidence citations."""
        improving = [c for c in claims if c.trend == "improving"]
        declining = [c for c in claims if c.trend == "declining"]
        stagnating = [c for c in claims if c.trend == "stagnating"]

        period_title = period.label or f"{period.start_date} to {period.end_date}"

        display_name = learner_id.replace('_', ' ').title()
        if self.retention_service.learners_df is not None and not self.retention_service.learners_df.empty:
            match = self.retention_service.learners_df[self.retention_service.learners_df["learner_id"] == learner_id]
            if not match.empty:
                display_name = str(match.iloc[0].get("name") or display_name)

        sections = []
        sections.append(f"### Growth Narrative: {period_title}")
        sections.append(
            f"During the **{period_title}** evaluation cycle ({period.start_date} to {period.end_date}), "
            f"engineer **{display_name}** logged **{len(evidence)} verified evidence milestones** "
            f"across **{len(claims)} evaluated competencies**."
        )

        if improving:
            prog_lines = []
            for c in improving:
                c_evidence_ids = ", ".join(c.evidence_ids)
                prog_lines.append(
                    f"- **{c.competency_name}**: Demonstrated notable acceleration with verified milestone progression "
                    f"[{c_evidence_ids}]."
                )
            sections.append("#### Notable Competency Accelerations\n" + "\n".join(prog_lines))

        if stagnating:
            maint_lines = []
            for c in stagnating:
                c_evidence_ids = ", ".join(c.evidence_ids) if c.evidence_ids else "N/A"
                maint_lines.append(
                    f"- **{c.competency_name}**: Maintained consistent performance with stable mastery signals "
                    f"[{c_evidence_ids}]."
                )
            sections.append("#### Sustained Baseline Competencies\n" + "\n".join(maint_lines))

        if declining:
            dec_lines = []
            for c in declining:
                c_evidence_ids = ", ".join(c.evidence_ids)
                dec_lines.append(
                    f"- **{c.competency_name}**: Exhibited a retentive dip in recent activity "
                    f"[{c_evidence_ids}]. Prompt targeted reinforcement is recommended."
                )
            sections.append("#### Retention Attention Areas\n" + "\n".join(dec_lines))

        sections.append(
            "#### Growth Momentum Summary\n"
            f"Overall trajectory reflects active engagement with high signal integrity. "
            f"Continued regular cadence of real-world practice is encouraged to counteract natural retention decay."
        )

        narrative_markdown = "\n\n".join(sections)

        # Manager Briefing synthesis
        key_acc = [
            f"Surpassed previous benchmark in {c.competency_name} through verified deliverables [{', '.join(c.evidence_ids)}]."
            for c in improving
        ]
        if not key_acc:
            key_acc = [
                f"Sustained steady competency standards across all monitored skills in {period_title}."
            ]

        areas_sup = [
            f"Proactively reinforce {c.competency_name} where recent evidence shows retention dipping."
            for c in declining
        ]
        if not areas_sup:
            areas_sup = [
                "Maintain ongoing practice diversity to prevent recency lapse and keep telemetry confidence high."
            ]

        topics = []
        if improving:
            topics.append(f"Explore opportunities to mentor peers or lead initiatives in {improving[0].competency_name}.")
        if declining:
            topics.append(f"Review potential blockers or resource constraints impacting {declining[0].competency_name}.")
        topics.append("Review quarterly development aspirations and schedule upcoming hands-on project opportunities.")

        briefing = ManagerBriefing(
            key_improvements=key_acc,
            stagnating_areas=areas_sup,
            suggested_focus=topics
        )

        return narrative_markdown, briefing
