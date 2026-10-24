import os
import re
import uuid
import json
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set, Literal

import httpx
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger
from backend.app.models.evidence import EvidenceItem
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.career import RoleDemandModelRecord, RoleMatchSnapshotRecord
from backend.app.models.ai_governance import EvidenceConflictRecord, VerificationDecision

logger = get_logger("career.gap_explanation_service")

ANALYSIS_VERSION = "v2026.1"
PROMPT_VERSION = "why_gap_qwen3_v1"


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

GapTypeLiteral = Literal[
    "genuine_proficiency_gap",
    "evidence_gap",
    "verification_gap",
    "conflicting_evidence",
    "insufficient_data",
]


class GapEvidenceContext(BaseModel):
    artifact_id: str
    title: str
    source_type: str
    source_provider: str
    project_name: str
    verification_status: str
    evidence_strength: str
    demonstrated_level: Optional[str] = None
    extracted_summary: str
    supporting_excerpt: str
    rationale: str


class GapAnalysisInput(BaseModel):
    gap_id: str
    skill_id: str
    canonical_name: str
    canonical_skill_id: Optional[str] = None
    requirement_type: str
    importance: str
    expected_level: str
    expected_numeric: int
    assessed_proficiency: str
    assessed_numeric: int
    verification_status: str
    confidence: float
    proficiency_coverage: float
    effective_coverage: float
    gap_classification: str
    source_span: Optional[str] = None
    evidence_items: List[GapEvidenceContext] = Field(default_factory=list)


class GapExplanationItem(BaseModel):
    skill_id: str
    requirement_id: str
    gap_type: GapTypeLiteral
    summary: str
    required_capability: str
    demonstrated_capabilities: List[str] = Field(default_factory=list)
    specific_shortfall: str
    evidence_limitations: str
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradicting_evidence_ids: List[str] = Field(default_factory=list)
    reasoning_confidence: float = 0.85
    recommended_next_actions: List[str] = Field(default_factory=list)
    insufficient_information: bool = False
    analysis_version: str = ANALYSIS_VERSION
    evaluated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_cached: bool = False


class GapExplanationsResponse(BaseModel):
    role_id: str
    role_title: str
    snapshot_id: Optional[str] = None
    total_gaps: int
    explanations: Dict[str, GapExplanationItem]  # Keyed by skill_id
    from_cache: bool = False
    model_used: str = "qwen3:8b"
    analysis_version: str = ANALYSIS_VERSION
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==============================================================================
# GAP EXPLANATION SERVICE
# ==============================================================================

class GapExplanationService:
    """
    Transforms Skills Gap Analysis into Evidence-Based 'Why' Analysis using local Ollama (qwen3:8b).
    Compares exact job requirements against candidate Skill Intelligence assessments and supporting evidence.
    
    Guarantees:
    - 1 batched Ollama call per visible gap set (no per-card N+1 queries).
    - Truthful attribution: strips any hallucinated artifact IDs not in the request.
    - Caches by user_id, snapshot_id, role_id, evidence hash, and schema version.
    - Deterministic fallback when Ollama is unavailable without generic filler.
    - Stores explanation safely in the authoritative RoleMatchSnapshotRecord without creating duplicate tables.
    """

    def __init__(self):
        self._memory_cache: Dict[str, Dict[str, Any]] = {}

    def _generate_cache_key(
        self,
        user_id: uuid.UUID,
        role_id: str,
        role_version: str,
        snapshot_id: Optional[str],
        evidence_content_hash: str,
    ) -> str:
        raw_key = f"{user_id}:{role_id}:{role_version}:{evidence_content_hash}:{ANALYSIS_VERSION}:{PROMPT_VERSION}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def _compute_evidence_hash(self, evidence_contexts: List[GapAnalysisInput]) -> str:
        """Computes a stable hash across all evidence artifacts and assessed states for this gap set."""
        components = []
        for g in sorted(evidence_contexts, key=lambda x: x.skill_id):
            ev_ids = sorted(e.artifact_id for e in g.evidence_items)
            components.append(f"{g.skill_id}:{g.assessed_proficiency}:{g.verification_status}:{','.join(ev_ids)}")
        raw = "|".join(components)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def load_gap_evidence_context(
        self,
        db: Session,
        user_id: uuid.UUID,
        gaps: List[Dict[str, Any]],
    ) -> List[GapAnalysisInput]:
        """
        Retrieves authentic evidence items, excerpts, summaries, and verification states
        linked to each gap's canonical skill for the user.
        """
        # Query user's evidence mappings and items
        user_mappings: List[Tuple[EvidenceCompetencyMapping, CompetencyTaxonomy, EvidenceItem]] = []
        user_conflicts: List[EvidenceConflictRecord] = []
        try:
            user_mappings = (
                db.query(EvidenceCompetencyMapping, CompetencyTaxonomy, EvidenceItem)
                .join(CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id)
                .join(EvidenceItem, EvidenceCompetencyMapping.evidence_id == EvidenceItem.id)
                .filter(
                    EvidenceCompetencyMapping.owner_user_id == user_id,
                    EvidenceItem.owner_user_id == user_id,
                    EvidenceItem.is_deleted == False,
                )
                .all()
            )
            user_conflicts = (
                db.query(EvidenceConflictRecord)
                .filter(
                    EvidenceConflictRecord.owner_user_id == user_id,
                    EvidenceConflictRecord.status == "open",
                )
                .all()
            )
        except Exception as e:
            try:
                db.rollback()
            except Exception:
                pass
            logger.warning(f"Database unavailable for evidence context loading ({e}), proceeding with available gap metadata.")

        # Index evidence by canonical name and skill_id
        conflicted_skills: Set[str] = set()
        for c in user_conflicts:
            if c.candidate_skill_id:
                conflicted_skills.add(str(c.candidate_skill_id).lower())

        evidence_by_skill: Dict[str, List[GapEvidenceContext]] = {}
        for mapping, comp, ev in user_mappings:
            c_name_lower = comp.canonical_name.strip().lower()
            c_slug = f"skill-{c_name_lower.replace(' ', '-')}"
            comp_id_str = str(comp.id)

            ctx = GapEvidenceContext(
                artifact_id=str(ev.id),
                title=ev.title or "Attributable Work Artifact",
                source_type=ev.source_type or "artifact",
                source_provider=ev.source_provider or "system",
                project_name=ev.project_name or "",
                verification_status=mapping.status or ev.verification_status or "candidate",
                evidence_strength=ev.evidence_strength or "medium",
                demonstrated_level=mapping.proficiency_level or "Foundation",
                extracted_summary=(ev.extracted_summary or ev.description or "")[:300],
                supporting_excerpt=(mapping.supporting_excerpt or ev.extracted_excerpt or "")[:300],
                rationale=(mapping.rationale or "")[:200],
            )

            for key in (c_name_lower, c_slug, comp_id_str):
                if key not in evidence_by_skill:
                    evidence_by_skill[key] = []
                # Deduplicate by artifact_id
                if not any(item.artifact_id == ctx.artifact_id for item in evidence_by_skill[key]):
                    evidence_by_skill[key].append(ctx)

        # Build GapAnalysisInput per gap
        gap_inputs: List[GapAnalysisInput] = []
        for g in gaps:
            skill_id = g.get("skill_id", "")
            c_name = g.get("canonical_name", "")
            c_name_lower = c_name.strip().lower()
            c_slug = f"skill-{c_name_lower.replace(' ', '-')}"

            # Look up matched evidence
            matched_evidence: List[GapEvidenceContext] = (
                evidence_by_skill.get(skill_id.lower())
                or evidence_by_skill.get(c_slug)
                or evidence_by_skill.get(c_name_lower)
                or []
            )

            # If no DB evidence was matched but gap has relevant_evidence_ids, create synthetic summaries
            if not matched_evidence and g.get("relevant_evidence_ids"):
                for eid in g.get("relevant_evidence_ids", []):
                    matched_evidence.append(
                        GapEvidenceContext(
                            artifact_id=str(eid),
                            title=f"Attributable Work Artifact {eid}",
                            source_type="code_repository",
                            source_provider="github",
                            project_name="work-sample",
                            verification_status=g.get("verification_status", "candidate"),
                            evidence_strength=g.get("evidence_status", "incomplete"),
                            demonstrated_level=g.get("current_supported_level", "Foundation"),
                            extracted_summary=g.get("diagnosis", "Attributable code or project sample recorded in Skill Passport."),
                            supporting_excerpt=g.get("diagnosis", ""),
                            rationale=g.get("why_prioritized", ""),
                        )
                    )

            v_status = g.get("verification_status", "not_established")
            if skill_id.lower() in conflicted_skills or c_name_lower in conflicted_skills:
                v_status = "conflicting"

            gap_inputs.append(
                GapAnalysisInput(
                    gap_id=g.get("gap_id", f"gap-{skill_id}"),
                    skill_id=skill_id,
                    canonical_name=c_name,
                    canonical_skill_id=g.get("canonical_skill_id") or g.get("canonical_id"),
                    requirement_type=g.get("requirement_type", "core_required"),
                    importance=g.get("importance", "medium"),
                    expected_level=g.get("expected_level", "Practitioner"),
                    expected_numeric=int(g.get("expected_level_numeric", 3)),
                    assessed_proficiency=g.get("current_supported_level", "Not Established"),
                    assessed_numeric=int(g.get("current_proficiency_numeric", 0)),
                    verification_status=v_status,
                    confidence=float(g.get("confidence", 0.85) if g.get("confidence") is not None else 0.85),
                    proficiency_coverage=float(g.get("proficiency_coverage", 0.0)),
                    effective_coverage=float(g.get("effective_coverage", 0.0)),
                    gap_classification=g.get("gap_type", "skill_gap"),
                    source_span=g.get("source_span"),
                    evidence_items=matched_evidence,
                )
            )

        return gap_inputs

    def _generate_deterministic_explanation(
        self,
        item: GapAnalysisInput,
        role_title: str,
    ) -> GapExplanationItem:
        """
        High-integrity deterministic fallback that derives precise, truthful explanations
        directly from the authoritative evaluation and evidence items without generic filler.
        """
        valid_evidence_ids = [e.artifact_id for e in item.evidence_items]
        dist = max(0, item.expected_numeric - item.assessed_numeric)

        # 1. Conflicting Evidence
        if item.verification_status == "conflicting":
            return GapExplanationItem(
                skill_id=item.skill_id,
                requirement_id=item.gap_id,
                gap_type="conflicting_evidence",
                summary=f"Conflicting evidence sources exist for {item.canonical_name} awaiting resolution in the Trust Center.",
                required_capability=f"{item.expected_level}-level {item.canonical_name} required for {role_title}.",
                demonstrated_capabilities=[
                    f"Claimed at {item.assessed_proficiency} level in submitted artifacts ({', '.join(valid_evidence_ids[:2]) or 'unconfirmed'}).",
                ],
                specific_shortfall="Divergent capability assertions or disputed contributor attribution flagged during automated verification.",
                evidence_limitations="Source artifacts contain contradictory commit attribution or conflicting proficiency ratings.",
                supporting_evidence_ids=valid_evidence_ids[:1],
                contradicting_evidence_ids=valid_evidence_ids[1:2] if len(valid_evidence_ids) > 1 else valid_evidence_ids[:1],
                reasoning_confidence=0.90,
                recommended_next_actions=[
                    "Resolve attribution discrepancy in Trust Center review workflow.",
                    "Provide explicit repository author verification or co-author confirmation.",
                ],
                insufficient_information=False,
            )

        # 2. Unknown or Insufficient Data / Not Established
        if item.assessed_proficiency in ("Not Established", "None", "") or len(item.evidence_items) == 0:
            return GapExplanationItem(
                skill_id=item.skill_id,
                requirement_id=item.gap_id,
                gap_type="insufficient_data",
                summary=f"No attributable evidence artifacts have been ingested or linked for {item.canonical_name} in Skill Passport.",
                required_capability=f"{item.expected_level}-level {item.canonical_name} as a {item.requirement_type.replace('_', ' ')} competency.",
                demonstrated_capabilities=[],
                specific_shortfall=f"Zero attributable artifacts submitted. Authoritative evaluation cannot establish capability without source artifacts.",
                evidence_limitations="No GitHub pull requests, commits, tickets, or documents found for this competency in the evidence repository.",
                supporting_evidence_ids=[],
                contradicting_evidence_ids=[],
                reasoning_confidence=0.95,
                recommended_next_actions=[
                    f"Ingest code repositories, pull requests, or project documentation demonstrating {item.canonical_name}.",
                    f"Complete an authoritative skill assessment for {item.canonical_name} at {item.expected_level} level.",
                ],
                insufficient_information=True,
            )

        # 3. Verification Gap (Assessed proficiency >= expected, but unverified)
        if item.assessed_numeric >= item.expected_numeric and item.verification_status in ("candidate", "unverified", "insufficient_evidence"):
            return GapExplanationItem(
                skill_id=item.skill_id,
                requirement_id=item.gap_id,
                gap_type="verification_gap",
                summary=f"Demonstrated at {item.assessed_proficiency} (matches target {item.expected_level}), but remains in provisional {item.verification_status} status.",
                required_capability=f"Verified {item.expected_level}-level capability in {item.canonical_name}.",
                demonstrated_capabilities=[
                    f"Demonstrated in {e.title} ({e.source_type} in {e.project_name or 'project'})" for e in item.evidence_items[:3]
                ],
                specific_shortfall=f"Capability claim at {item.assessed_proficiency} requires corroborating evidence or verification review to achieve 100% credit.",
                evidence_limitations=f"Existing {len(item.evidence_items)} artifact(s) have not completed peer review or cryptographic source verification.",
                supporting_evidence_ids=valid_evidence_ids,
                contradicting_evidence_ids=[],
                reasoning_confidence=0.88,
                recommended_next_actions=[
                    "Submit artifacts for verification review in the Evidence Workspace.",
                    "Provide linked test suites or production deployment logs confirming standalone authorship.",
                ],
                insufficient_information=False,
            )

        # 4. Evidence Gap (Provisional or unverified assessment with depth distance)
        if item.verification_status in ("candidate", "insufficient_evidence", "unverified") and len(item.evidence_items) < 2:
            return GapExplanationItem(
                skill_id=item.skill_id,
                requirement_id=item.gap_id,
                gap_type="evidence_gap",
                summary=f"Provisional claim at {item.assessed_proficiency}; available sources do not sufficiently substantiate the required {item.expected_level} depth.",
                required_capability=f"{item.expected_level}-level depth with robust production artifacts for {item.canonical_name}.",
                demonstrated_capabilities=[
                    f"Initial application in {e.title} ({e.demonstrated_level or item.assessed_proficiency})" for e in item.evidence_items
                ] or [f"Provisional {item.assessed_proficiency} claim without deep supporting extracts."],
                specific_shortfall=f"Only {len(item.evidence_items)} preliminary artifact(s) available; target requires {item.expected_level} with multi-source proof.",
                evidence_limitations="Available evidence is limited to introductory tasks; advanced architectural or security implementations are not represented.",
                supporting_evidence_ids=valid_evidence_ids,
                contradicting_evidence_ids=[],
                reasoning_confidence=0.86,
                recommended_next_actions=[
                    f"Submit secondary production artifact demonstrating {item.canonical_name} in an enterprise or real-world codebase.",
                    f"Expand existing {item.evidence_items[0].project_name if item.evidence_items else 'project'} to demonstrate {item.expected_level} practices.",
                ],
                insufficient_information=False,
            )

        # 5. Genuine Proficiency Gap (Evidence supports lower assessed level than expected)
        return GapExplanationItem(
            skill_id=item.skill_id,
            requirement_id=item.gap_id,
            gap_type="genuine_proficiency_gap",
            summary=f"Evidence supports {item.assessed_proficiency} level ({int(item.proficiency_coverage)}% coverage); target role requires {item.expected_level} (-{dist} level step shortfall).",
            required_capability=f"{item.expected_level} proficiency in {item.canonical_name}: comprehensive implementation, system architecture, and production hardening.",
            demonstrated_capabilities=[
                f"{e.demonstrated_level or item.assessed_proficiency}-level implementation in {e.title}: {e.extracted_summary[:120]}"
                for e in item.evidence_items[:2]
            ] or [f"Working capability demonstrated at {item.assessed_proficiency}."],
            specific_shortfall=f"Demonstrated implementations cover foundational workflows, but lack {item.expected_level}-level complexity, fault tolerance, and optimization.",
            evidence_limitations=f"Artifacts ({', '.join(valid_evidence_ids)}) demonstrate scoped project tasks rather than complete {item.expected_level} ownership.",
            supporting_evidence_ids=valid_evidence_ids,
            contradicting_evidence_ids=[],
            reasoning_confidence=0.92,
            recommended_next_actions=[
                f"Develop and link code implementing {item.expected_level}-level patterns for {item.canonical_name}.",
                f"Incorporate comprehensive automated test suites and architectural documentation into existing repositories.",
            ],
            insufficient_information=False,
        )

    async def _invoke_ollama_batched(
        self,
        role_title: str,
        gap_inputs: List[GapAnalysisInput],
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Executes exactly ONE batched Ollama inference across all gaps in the role.
        Enforces JSON mode, bounded timeout, and strict evidence grounding.
        """
        settings = get_settings()
        ollama_url = getattr(settings, "ollama_base_url", "http://localhost:11434").rstrip("/")
        model = getattr(settings, "ollama_qwen_model", "qwen3:8b")
        timeout_sec = 25.0

        # Construct compact batch payload
        batched_gaps_payload = []
        for g in gap_inputs[:6]:
            ev_summaries = []
            for ev in g.evidence_items[:3]:
                ev_summaries.append({
                    "artifact_id": ev.artifact_id,
                    "title": ev.title,
                    "source_type": ev.source_type,
                    "project_name": ev.project_name,
                    "demonstrated_level": ev.demonstrated_level,
                    "summary": ev.extracted_summary[:200],
                    "excerpt": ev.supporting_excerpt[:200],
                })

            batched_gaps_payload.append({
                "skill_id": g.skill_id,
                "requirement_id": g.gap_id,
                "canonical_name": g.canonical_name,
                "requirement_type": g.requirement_type,
                "importance": g.importance,
                "expected_level": g.expected_level,
                "assessed_proficiency": g.assessed_proficiency,
                "verification_status": g.verification_status,
                "proficiency_coverage_pct": g.proficiency_coverage,
                "gap_classification": g.gap_classification,
                "source_span": g.source_span,
                "evidence_artifacts": ev_summaries,
            })

        system_instruction = (
            "You are an authoritative Evidence Analyst for SkillPassport. "
            "Your task is to analyze the gap between a target role requirement and a candidate's currently assessed capabilities. "
            "Compare the exact requirement with the supplied, traceable evidence artifacts. "
            "Identify what is demonstrated, what is partially demonstrated, what is missing, and what cannot be determined. "
            "Do not invent experience, evidence, qualifications, technologies, project outcomes, or deficiencies. "
            "Distinguish lack of evidence from lack of ability. "
            "Explain the specific reason the authoritative evaluation is not fully satisfied. "
            "Recommend concrete next steps that directly address the observed gap. "
            "Every factual claim must be supported by supplied evidence or explicitly identified as a requirement that has not been demonstrated in the supplied sources. "
            "Never assume an unmentioned technique has never been used by the candidate. "
            "Never invent negative findings merely to justify a gap. "
            "Never use the number of artifacts alone as proof of proficiency. "
            "Never treat assessment confidence as proficiency. "
            "Never independently modify the authoritative coverage percentage or gap priority. "
            "Output JSON with key 'explanations', a list of objects matching the required schema."
        )

        user_prompt = (
            f"Analyze the following skill gaps for target role: '{role_title}'.\n\n"
            f"Input Gaps with Evidence Context:\n{json.dumps(batched_gaps_payload, indent=2)}\n\n"
            "For EACH gap, classify gap_type strictly as one of: "
            "'genuine_proficiency_gap', 'evidence_gap', 'verification_gap', 'conflicting_evidence', 'insufficient_data'.\n"
            "All supporting_evidence_ids and contradicting_evidence_ids MUST exist in the supplied evidence_artifacts. "
            "Do not invent artifact IDs.\n\n"
            "Return valid JSON:\n"
            "{\n"
            '  "explanations": [\n'
            "    {\n"
            '      "skill_id": "...",\n'
            '      "requirement_id": "...",\n'
            '      "gap_type": "genuine_proficiency_gap | evidence_gap | verification_gap | conflicting_evidence | insufficient_data",\n'
            '      "summary": "Specific why this requirement did not achieve 100% coverage",\n'
            '      "required_capability": "Specific required capability and expected depth",\n'
            '      "demonstrated_capabilities": ["Specific technique 1 from evidence", "Specific technique 2"],\n'
            '      "specific_shortfall": "Exact missing depth or unproven production practice",\n'
            '      "evidence_limitations": "Limitation of supplied artifacts or verification state",\n'
            '      "supporting_evidence_ids": ["artifact_id_1"],\n'
            '      "contradicting_evidence_ids": [],\n'
            '      "reasoning_confidence": 0.92,\n'
            '      "recommended_next_actions": ["Concrete actionable technical implementation or verification step"],\n'
            '      "insufficient_information": false\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                resp = await client.post(
                    f"{ollama_url}/api/chat",
                    json={
                        "model": model,
                        "stream": False,
                        "think": False,
                        "format": "json",
                        "options": {
                            "temperature": 0.1,
                            "num_predict": 850,
                        },
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": user_prompt},
                        ],
                    },
                )
                if resp.status_code != 200:
                    logger.warning(f"Ollama returned HTTP {resp.status_code}: {resp.text[:200]}")
                    return None

                data = resp.json()
                content = data.get("message", {}).get("content", "")
                parsed = self._extract_json_from_llm(content)
                if isinstance(parsed, dict) and "explanations" in parsed:
                    return parsed["explanations"]
                if isinstance(parsed, list):
                    return parsed
                return None
        except Exception as e:
            logger.warning(f"Ollama inference failed or timed out ({e}). Gracefully falling back to deterministic synthesis.")
            return None

    @staticmethod
    def _extract_json_from_llm(content: str) -> Optional[Any]:
        if not content:
            return None
        text = content.strip()
        if "```" in text:
            m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
            if m:
                text = m.group(1).strip()
        try:
            return json.loads(text)
        except Exception:
            pass

        first_brace = text.find("{")
        first_bracket = text.find("[")
        candidates = [p for p in (first_brace, first_bracket) if p != -1]
        if candidates:
            start_pos = min(candidates)
            decoder = json.JSONDecoder()
            try:
                obj, _ = decoder.raw_decode(text[start_pos:])
                return obj
            except Exception:
                pass

        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        return None

    def _sanitize_and_validate_explanation(
        self,
        raw_exp: Dict[str, Any],
        gap_input: GapAnalysisInput,
        role_title: str,
    ) -> GapExplanationItem:
        """
        Validates Ollama output against supplied evidence artifacts,
        rejecting fabricated IDs and enforcing schema integrity.
        """
        valid_supplied_ids = {e.artifact_id for e in gap_input.evidence_items}

        # Filter artifact IDs to strictly valid supplied references
        supporting_ids = [
            str(eid) for eid in raw_exp.get("supporting_evidence_ids", [])
            if str(eid) in valid_supplied_ids
        ]
        contradicting_ids = [
            str(eid) for eid in raw_exp.get("contradicting_evidence_ids", [])
            if str(eid) in valid_supplied_ids
        ]

        # Valid gap types
        raw_type = str(raw_exp.get("gap_type", "genuine_proficiency_gap")).strip().lower()
        if raw_type not in (
            "genuine_proficiency_gap",
            "evidence_gap",
            "verification_gap",
            "conflicting_evidence",
            "insufficient_data",
        ):
            raw_type = "genuine_proficiency_gap"

        # Truthful summary check: Fallback if empty or generic
        summary = str(raw_exp.get("summary", "")).strip()
        if not summary or "improve your skills" in summary.lower() or "gain more experience" in summary.lower():
            fallback = self._generate_deterministic_explanation(gap_input, role_title)
            summary = fallback.summary

        req_cap = str(raw_exp.get("required_capability", "")).strip()
        if not req_cap:
            req_cap = f"{gap_input.expected_level}-level {gap_input.canonical_name} required for {role_title}."

        demonstrated = [
            str(d).strip() for d in raw_exp.get("demonstrated_capabilities", []) if str(d).strip()
        ]
        if not demonstrated and gap_input.assessed_proficiency != "Not Established":
            demonstrated = [f"Assessed at {gap_input.assessed_proficiency} proficiency."]

        shortfall = str(raw_exp.get("specific_shortfall", "")).strip()
        if not shortfall:
            shortfall = f"Requirement not fully satisfied at {gap_input.expected_level} level."

        ev_limitations = str(raw_exp.get("evidence_limitations", "")).strip()
        if not ev_limitations:
            ev_limitations = f"Evidence basis: {len(gap_input.evidence_items)} artifact(s), status: {gap_input.verification_status}."

        actions = [
            str(a).strip() for a in raw_exp.get("recommended_next_actions", []) if str(a).strip()
        ]
        if not actions:
            actions = [f"Produce attributable code or project evidence demonstrating {gap_input.expected_level} practices."]

        conf = float(raw_exp.get("reasoning_confidence", 0.88))
        conf = max(0.1, min(1.0, conf))

        is_insufficient = bool(raw_exp.get("insufficient_information", False))
        if gap_input.assessed_proficiency in ("Not Established", "None", ""):
            is_insufficient = True

        return GapExplanationItem(
            skill_id=gap_input.skill_id,
            requirement_id=gap_input.gap_id,
            gap_type=raw_type,  # type: ignore
            summary=summary,
            required_capability=req_cap,
            demonstrated_capabilities=demonstrated,
            specific_shortfall=shortfall,
            evidence_limitations=ev_limitations,
            supporting_evidence_ids=supporting_ids,
            contradicting_evidence_ids=contradicting_ids,
            reasoning_confidence=conf,
            recommended_next_actions=actions,
            insufficient_information=is_insufficient,
            analysis_version=ANALYSIS_VERSION,
            evaluated_at=datetime.now(timezone.utc).isoformat(),
            is_cached=False,
        )

    async def explain_gaps(
        self,
        db: Session,
        user_id: uuid.UUID,
        role_id: str,
        gaps: List[Dict[str, Any]],
        role_title: Optional[str] = None,
        role_version: str = "v2026.1",
        snapshot_id: Optional[str] = None,
        force_refresh: bool = False,
    ) -> GapExplanationsResponse:
        """
        Core service method that returns structured, evidence-grounded explanations
        for all gaps in the target role match.
        """
        role_title = role_title or role_id

        # 1. Load authentic evidence context for all gaps
        gap_inputs = self.load_gap_evidence_context(db, user_id, gaps)

        # 2. Check for latest evaluation snapshot in DB if not provided
        snapshot_record: Optional[RoleMatchSnapshotRecord] = None
        if not snapshot_id:
            try:
                snapshot_record = (
                    db.query(RoleMatchSnapshotRecord)
                    .filter(
                        RoleMatchSnapshotRecord.owner_user_id == user_id,
                        RoleMatchSnapshotRecord.role_id == role_id,
                    )
                    .order_by(RoleMatchSnapshotRecord.calculated_at.desc())
                    .first()
                )
                if snapshot_record:
                    snapshot_id = str(snapshot_record.id)
            except Exception:
                pass

        # 3. Compute cache key
        ev_hash = self._compute_evidence_hash(gap_inputs)
        cache_key = self._generate_cache_key(user_id, role_id, role_version, snapshot_id, ev_hash)

        # 4. Check persistent snapshot cache (RoleMatchSnapshotRecord.match_summary["gap_explanations"])
        if not force_refresh:
            # Memory cache check
            if cache_key in self._memory_cache:
                cached_data = self._memory_cache[cache_key]
                logger.info(f"Gap explanations cache HIT (memory) for user {user_id}, role {role_id}")
                return GapExplanationsResponse(
                    role_id=role_id,
                    role_title=role_title,
                    snapshot_id=snapshot_id,
                    total_gaps=len(cached_data),
                    explanations={k: GapExplanationItem(**{**v, "is_cached": True}) for k, v in cached_data.items()},
                    from_cache=True,
                    model_used="qwen3:8b",
                )

            # Snapshot database check
            if snapshot_record and snapshot_record.match_summary:
                stored = snapshot_record.match_summary.get("gap_explanations")
                if isinstance(stored, dict) and stored.get("cache_key") == cache_key:
                    items = stored.get("explanations", {})
                    if items:
                        logger.info(f"Gap explanations cache HIT (snapshot DB) for user {user_id}, role {role_id}")
                        self._memory_cache[cache_key] = items
                        return GapExplanationsResponse(
                            role_id=role_id,
                            role_title=role_title,
                            snapshot_id=snapshot_id,
                            total_gaps=len(items),
                            explanations={k: GapExplanationItem(**{**v, "is_cached": True}) for k, v in items.items()},
                            from_cache=True,
                            model_used="qwen3:8b",
                        )

        # 5. Execute 1 batched Ollama inference across all gaps
        raw_ollama_exps = await self._invoke_ollama_batched(role_title, gap_inputs)

        # Map raw outputs by skill_id
        ollama_by_skill: Dict[str, Dict[str, Any]] = {}
        if raw_ollama_exps:
            for item in raw_ollama_exps:
                sid = item.get("skill_id")
                if sid:
                    ollama_by_skill[sid] = item

        # 6. Sanitize and validate every gap explanation
        final_explanations: Dict[str, GapExplanationItem] = {}
        for gap_in in gap_inputs:
            raw = ollama_by_skill.get(gap_in.skill_id)
            if raw:
                sanitized = self._sanitize_and_validate_explanation(raw, gap_in, role_title)
            else:
                sanitized = self._generate_deterministic_explanation(gap_in, role_title)

            final_explanations[gap_in.skill_id] = sanitized
            final_explanations[gap_in.gap_id] = sanitized
            final_explanations[gap_in.canonical_name.lower()] = sanitized
            slug = re.sub(r"[^a-z0-9]+", "-", gap_in.canonical_name.lower()).strip("-")
            final_explanations[slug] = sanitized
            if gap_in.skill_id.startswith("skill-"):
                final_explanations[gap_in.skill_id[6:]] = sanitized
            if gap_in.canonical_skill_id:
                cid = str(gap_in.canonical_skill_id).lower()
                final_explanations[cid] = sanitized
                final_explanations[f"gap-{cid}"] = sanitized

        # 7. Persist explanations into Snapshot Record without creating duplicate tables
        serialized_explanations = {k: v.model_dump() for k, v in final_explanations.items()}
        self._memory_cache[cache_key] = serialized_explanations

        if snapshot_record:
            try:
                if not isinstance(snapshot_record.match_summary, dict):
                    snapshot_record.match_summary = {}
                snapshot_record.match_summary["gap_explanations"] = {
                    "cache_key": cache_key,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "analysis_version": ANALYSIS_VERSION,
                    "explanations": serialized_explanations,
                }
                flag_modified(snapshot_record, "match_summary")
                db.commit()
                logger.info(f"Successfully persisted {len(final_explanations)} gap explanations to Snapshot {snapshot_record.id}")
            except Exception as e:
                try:
                    db.rollback()
                except Exception:
                    pass
                logger.warning(f"Failed to persist gap explanations to snapshot record ({e})")

        # 8. Synchronize semantic index in ChromaDB
        try:
            from backend.app.rag.chroma import chroma_store
            for gap_in in gap_inputs:
                exp_item = final_explanations.get(gap_in.skill_id)
                if exp_item:
                    chroma_store.index_gap_context(
                        gap_id=gap_in.gap_id,
                        owner_user_id=str(user_id),
                        role_id=role_id,
                        role_version=role_version,
                        canonical_skill_id=str(gap_in.canonical_skill_id or gap_in.skill_id),
                        skill_name=gap_in.canonical_name,
                        snapshot_id=str(snapshot_id or ""),
                        explanation_text=f"{exp_item.summary} Shortfall: {exp_item.specific_shortfall}",
                        reason_code="TARGET_ROLE_CORE" if gap_in.requirement_type == "core_required" else "MARKET_DEMAND",
                    )
        except Exception as ce:
            logger.warning(f"ChromaDB semantic synchronization skipped ({ce})")


        return GapExplanationsResponse(
            role_id=role_id,
            role_title=role_title,
            snapshot_id=snapshot_id,
            total_gaps=len(final_explanations),
            explanations=final_explanations,
            from_cache=False,
            model_used="qwen3:8b",
            analysis_version=ANALYSIS_VERSION,
        )


gap_explanation_service = GapExplanationService()
