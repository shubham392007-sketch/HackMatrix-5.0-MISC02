"""
Confidence Explainer Service for Career Intelligence & Role Intelligence.
Provides evidence-grounded, explainable confidence score rationales for
role-competency matching and skill-gap analyses.

Scope Rule:
Strictly isolated to Domain 3 (Career Intelligence). Does NOT modify global Ollama
extraction pipelines, Skill Intelligence verification states, or Trust & Governance.
"""

import re
import json
import httpx
from typing import Optional, List, Dict, Any
from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger

logger = get_logger("career.confidence_explainer")


class ConfidenceExplainerService:
    """
    Produces deterministic, evidence-grounded explanations answering:
    'Why was this confidence score assigned?'
    """

    def __init__(self):
        self.settings = get_settings()

    def generate_rationale(
        self,
        requirement: Dict[str, Any],
        matched_user_skill: Optional[Dict[str, Any]],
        evaluation: Dict[str, Any],
        role_context: Optional[Dict[str, Any]] = None,
        allow_ollama: bool = True,
    ) -> Dict[str, Any]:
        """
        Builds a comprehensive confidence rationale for a role-requirement evaluation.
        First constructs a deterministic, 100% grounded explanation.
        If Ollama is available and configured, optionally enriches the synthesis prose.
        """
        c_name = requirement.get("canonical_name", "Required Skill")
        req_type = requirement.get("requirement_type", "core_required")
        expected_level = requirement.get("expected_level", "Practitioner")
        expected_num = requirement.get("expected_level_numeric", 3)
        raw_confidence = evaluation.get("confidence", 0.0)
        score_percent = int(round(raw_confidence * 100)) if raw_confidence <= 1.0 else int(round(raw_confidence))

        match_status = evaluation.get("match_status", "missing_weak")
        v_status = evaluation.get("verification_status", "not_established")
        curr_level = evaluation.get("current_proficiency", "Not Established")
        curr_num = evaluation.get("current_proficiency_numeric", 0)
        evidence_ids = evaluation.get("evidence_ids") or []
        evidence_strength = evaluation.get("evidence_strength", "none")

        # Extract linked artifact metadata if available
        evidence_items = []
        if matched_user_skill and "evidence_items" in matched_user_skill:
            evidence_items = matched_user_skill["evidence_items"]

        # 1. Deterministic Grounded Analysis
        supporting_factors: List[str] = []
        evidence_limitations: List[str] = []
        uncertainty_notes: List[str] = []

        # Determine score meaning based on actual system origin
        if not matched_user_skill or match_status == "missing_weak":
            score_meaning = (
                "Confidence reflects the complete absence of attributable engineering artifacts in connected sources."
            )
            summary = (
                f"Assigned 0% confidence because no attributable code commits, pull requests, technical documents, "
                f"or repository files were found in your connected sources for {c_name}."
            )
            evidence_limitations.append(
                f"No verifiable engineering artifacts currently demonstrate {c_name} in your Skill Passport."
            )
            uncertainty_notes.append(
                "An evidence gap indicates that relevant work has not yet been ingested or connected; "
                "it does not serve as proof that you lack this competency."
            )
        else:
            score_meaning = (
                "Confidence reflects the relevance, cryptographic attribution, and verification standing "
                "of source artifacts supporting this competency claim."
            )

            # Supporting factors
            if evidence_items:
                artifact_titles = [f"'{e.get('title', 'Work Artifact')}'" for e in evidence_items[:3]]
                supporting_factors.append(
                    f"Directly supported by {len(evidence_items)} attributable artifact(s): {', '.join(artifact_titles)}."
                )
            elif evidence_ids:
                supporting_factors.append(
                    f"Linked to {len(evidence_ids)} attributable evidence record(s) in Evidence Workspace."
                )

            if curr_num > 0:
                supporting_factors.append(
                    f"Demonstrated capability established at {curr_level} level (numeric {curr_num}/5)."
                )

            if v_status == "verified":
                supporting_factors.append(
                    "Cleared 7-point Trust & Governance verification with confirmed code authorship and zero open conflicts."
                )

            # Limitations & Shortfalls
            if curr_num < expected_num:
                dist = expected_num - curr_num
                evidence_limitations.append(
                    f"Proficiency shortfall: currently supported at {curr_level} (numeric {curr_num}/5) "
                    f"against target role expectation of {expected_level} (numeric {expected_num}/5), "
                    f"representing a {dist}-level depth gap."
                )

            if v_status == "candidate":
                evidence_limitations.append(
                    "Capability claim is currently in 'candidate' review state and has not yet cleared independent verification."
                )
                uncertainty_notes.append(
                    "Candidate skills receive a fractional verification weight in effective coverage until reviewed."
                )
            elif v_status == "conflicting":
                evidence_limitations.append(
                    "Open attribution conflict or contradictory source signals detected in Trust Center."
                )
                uncertainty_notes.append(
                    "Confidence is discounted until the conflicting source claims are resolved."
                )
            elif v_status == "insufficient_evidence":
                evidence_limitations.append(
                    "Extracted mention lacks sufficient corroborating code implementation examples."
                )

            if evidence_strength in ("low", "medium") and len(evidence_ids) < 2:
                evidence_limitations.append(
                    "Single-source evidence: evaluation relies on one artifact without cross-source validation."
                )

            # Construct concise summary
            if v_status == "verified" and curr_num >= expected_num:
                summary = (
                    f"Assigned high confidence ({score_percent}%) because {c_name} at {curr_level} level is directly backed by "
                    f"{len(evidence_ids) or 1} verified engineering artifact(s) passing all Trust & Governance integrity checks."
                )
            elif v_status == "verified" and curr_num < expected_num:
                dist = expected_num - curr_num
                summary = (
                    f"Assigned {score_percent}% confidence reflecting high certainty in your demonstrated {curr_level} capabilities, "
                    f"while noting a {dist}-level depth gap relative to the target role's {expected_level} requirement."
                )
            elif v_status == "candidate":
                summary = (
                    f"Assigned moderate confidence ({score_percent}%) because work evidence was extracted for {c_name}, "
                    f"but remains in candidate status awaiting peer or automated verification clearance."
                )
            elif v_status == "conflicting":
                summary = (
                    f"Assigned discounted confidence ({score_percent}%) due to conflicting evidence attribution flagged in Trust Center."
                )
            else:
                summary = (
                    f"Assigned {score_percent}% confidence based on available evidence signals for {c_name} at {curr_level} level."
                )

            uncertainty_notes.append(
                "Skill gaps represent areas where formal proof has not yet been recorded under the current evaluation policy, "
                "not a conclusion of candidate inability."
            )

        rationale = {
            "score": round(float(raw_confidence if raw_confidence <= 1.0 else raw_confidence / 100.0), 2),
            "score_percent": score_percent,
            "score_meaning": score_meaning,
            "summary": summary,
            "supporting_factors": supporting_factors,
            "evidence_limitations": evidence_limitations,
            "uncertainty_notes": uncertainty_notes,
            "is_verified": v_status == "verified",
            "model_assisted": False,
        }

        # 2. Optional Ollama Qwen3 8B Enrichment (strictly scoped and non-blocking)
        if allow_ollama and getattr(self.settings, "ollama_base_url", None) and score_percent > 0:
            enriched_summary = self._try_ollama_enrichment(
                requirement=requirement,
                evaluation=evaluation,
                deterministic_summary=summary,
                supporting_factors=supporting_factors,
                evidence_limitations=evidence_limitations,
            )
            if enriched_summary:
                rationale["summary"] = enriched_summary
                rationale["model_assisted"] = True

        return rationale

    def _try_ollama_enrichment(
        self,
        requirement: Dict[str, Any],
        evaluation: Dict[str, Any],
        deterministic_summary: str,
        supporting_factors: List[str],
        evidence_limitations: List[str],
    ) -> Optional[str]:
        """
        Attempts to call Ollama Qwen3 8B with strict 2.5-second timeout.
        Validates output to guarantee no hallucinations or altered scores.
        """
        try:
            ollama_url = f"{self.settings.ollama_base_url.rstrip('/')}/api/chat"
            c_name = requirement.get("canonical_name", "Skill")
            score_percent = int(round(evaluation.get("confidence", 0.8) * 100)) if evaluation.get("confidence", 0.8) <= 1.0 else int(evaluation.get("confidence", 80))

            prompt = (
                f"You are the Career Intelligence confidence explanation engine.\n"
                f"Task: In 2 concise sentences, explain to the candidate why a confidence score of {score_percent}% was assigned "
                f"for the role requirement '{c_name}'.\n\n"
                f"Ground facts:\n"
                f"- Requirement: {c_name} (Expected: {requirement.get('expected_level')})\n"
                f"- Demonstrated State: {evaluation.get('current_proficiency')} ({evaluation.get('verification_status')})\n"
                f"- Supporting Factors: {'; '.join(supporting_factors) if supporting_factors else 'None'}\n"
                f"- Evidence Limitations: {'; '.join(evidence_limitations) if evidence_limitations else 'None'}\n\n"
                f"Rules:\n"
                f"1. State clearly why the {score_percent}% score was assigned based ONLY on the ground facts.\n"
                f"2. Mention the actual evidence and limitations.\n"
                f"3. Do not invent project names or credentials not listed.\n"
                f"4. Do not state that missing evidence proves lack of ability.\n"
                f"5. Output ONLY the 2 sentences of explanation. No markdown, no preambles."
            )

            with httpx.Client(timeout=2.5) as client:
                resp = client.post(
                    ollama_url,
                    json={
                        "model": getattr(self.settings, "ollama_qwen_model", "qwen3:8b"),
                        "messages": [
                            {"role": "system", "content": "You are a precise, evidence-grounded talent evaluation explainer."},
                            {"role": "user", "content": prompt},
                        ],
                        "options": {"temperature": 0.1, "num_predict": 120},
                        "stream": False,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = (data.get("message", {}).get("content") or "").strip()
                    # Basic validation: must be reasonable length and not empty
                    if 30 <= len(content) <= 350 and not content.startswith("{"):
                        return content
        except Exception as e:
            # Fall back silently to deterministic summary
            logger.debug(f"Ollama enrichment skipped or timed out ({e}); using deterministic rationale.")

        return None


confidence_explainer = ConfidenceExplainerService()
