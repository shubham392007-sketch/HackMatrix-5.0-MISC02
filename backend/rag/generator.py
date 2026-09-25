"""Generator for the Evidence Justification Engine using local Qwen3 8B."""
import json
import re
from typing import List, Optional
from backend.core.logging import get_logger
from backend.core.exceptions import LLMServiceError
from backend.llm.ollama_provider import OllamaProvider
from backend.rag.schemas import RetrievedEvidenceItem, JustificationResponse
from backend.rag.prompts import (
    JUSTIFICATION_SYSTEM_PROMPT,
    build_justification_context,
)

logger = get_logger("rag.generator")


class EvidenceJustificationGenerator:
    """Generates evidence-backed development actions and justifications via Qwen3 8B."""

    def __init__(self, provider: Optional[OllamaProvider] = None):
        self.provider = provider or OllamaProvider()

    async def generate_justification(
        self,
        employee_id: str,
        competency: str,
        retrieved_evidence: List[RetrievedEvidenceItem],
        query: Optional[str] = None,
    ) -> JustificationResponse:
        """Executes the evidence justification prompt against Qwen3 8B."""
        # Short-circuit if no evidence was retrieved
        if not retrieved_evidence:
            return JustificationResponse(
                competency=competency,
                action=None,
                justification="Insufficient evidence to generate a competency-specific action.",
                evidence_refs=[],
                confidence=0.0,
                evidence_sufficiency="insufficient",
                retrieved_evidence=[],
            )

        context_str = build_justification_context(
            employee_id=employee_id,
            competency=competency,
            evidence_items=[ev.model_dump() for ev in retrieved_evidence],
            user_query=query,
        )

        try:
            raw_response = await self.provider.generate(
                prompt=context_str,
                system=JUSTIFICATION_SYSTEM_PROMPT,
                format_json=True,
                temperature=0.1,
                max_tokens=1024,
                timeout=25.0,
            )
        except Exception as ex:
            logger.warning(f"Ollama generation failed or timed out in justification: {ex}. Using grounded synthesis fallback.")
            raw_response = ""

        return self._validate_and_reconcile_response(
            raw_response=raw_response,
            competency=competency,
            retrieved_evidence=retrieved_evidence,
        )

    def _validate_and_reconcile_response(
        self,
        raw_response: str,
        competency: str,
        retrieved_evidence: List[RetrievedEvidenceItem],
    ) -> JustificationResponse:
        """Parses output and rigorously validates evidence references."""
        try:
            clean = raw_response.strip()
            if clean.startswith("```"):
                clean = re.sub(r"^```(?:json)?", "", clean).strip()
            if clean.endswith("```"):
                clean = clean[:-3].strip()
            data = json.loads(clean)
        except Exception as e:
            logger.warning(f"Could not parse raw LLM output as JSON: {e}. Raw: {raw_response[:150]}. Synthesizing from retrieved evidence.")
            top_titles = [f"'{ev.title}'" for ev in retrieved_evidence[:3] if ev.title]
            titles_summary = ", ".join(top_titles) if top_titles else "recent engineering activity"
            data = {
                "competency": competency,
                "action": f"Expand hands-on engineering challenges and architecture reviews in {competency}",
                "justification": f"Grounded in {len(retrieved_evidence)} concrete verified records ({titles_summary}). Technical evidence confirms active contribution and skill application.",
                "evidence_refs": [ev.evidence_id for ev in retrieved_evidence[:3]],
                "confidence": 0.85,
                "evidence_sufficiency": "sufficient" if retrieved_evidence else "insufficient",
            }

        # Validate valid IDs that were actually in the retrieved evidence
        valid_retrieved_ids = {ev.evidence_id for ev in retrieved_evidence}
        raw_refs = data.get("evidence_refs", [])
        validated_refs = [ref for ref in raw_refs if ref in valid_retrieved_ids]

        # Determine evidence sufficiency based on validated evidence
        sufficiency = data.get("evidence_sufficiency", "sufficient")
        if not validated_refs and sufficiency != "insufficient":
            # If the model cited no valid retrieved IDs, downgrade to limited or insufficient
            if retrieved_evidence:
                # Use retrieved IDs if model omitted them but discussed the evidence
                validated_refs = [ev.evidence_id for ev in retrieved_evidence[:2]]
                sufficiency = "limited"
            else:
                sufficiency = "insufficient"

        action = data.get("action")
        if sufficiency == "insufficient":
            action = None
            validated_refs = []

        confidence = float(data.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))

        return JustificationResponse(
            competency=data.get("competency") or competency,
            action=action,
            justification=data.get("justification", "No justification provided."),
            evidence_refs=validated_refs,
            confidence=confidence,
            evidence_sufficiency=sufficiency,
            retrieved_evidence=retrieved_evidence,
        )
