"""High-level LLM Service abstracting provider calls and Pydantic validation."""
import json
import re
from typing import Optional, List
from backend.core.logging import get_logger
from backend.core.exceptions import LLMServiceError
from backend.llm.ollama_provider import OllamaProvider
from backend.llm.schemas import EvidenceExtractionResult
from backend.llm.prompts import (
    EVIDENCE_EXTRACTION_SYSTEM_PROMPT,
    build_evidence_extraction_prompt,
)

logger = get_logger("llm.service")


class LLMService:
    """Service handling structured inference with local Qwen3 8B."""

    def __init__(self, provider: Optional[OllamaProvider] = None):
        self.provider = provider or OllamaProvider()

    async def extract_skills_from_evidence(
        self,
        source: str,
        source_type: str,
        title: str,
        content: str,
        known_competencies: Optional[List[str]] = None,
    ) -> EvidenceExtractionResult:
        """Invokes Qwen3 8B to extract skills, competencies, and structured summary from evidence."""
        prompt = build_evidence_extraction_prompt(
            source=source,
            source_type=source_type,
            title=title,
            content=content,
            known_competencies=known_competencies,
        )

        raw_response = await self.provider.generate(
            prompt=prompt,
            system=EVIDENCE_EXTRACTION_SYSTEM_PROMPT,
            format_json=True,
            temperature=0.1,
        )

        return self._parse_and_validate_extraction(raw_response)

    def _parse_and_validate_extraction(self, raw_text: str) -> EvidenceExtractionResult:
        """Safely parses JSON and validates with Pydantic."""
        try:
            # Strip any accidental markdown fences
            clean = raw_text.strip()
            if clean.startswith("```"):
                clean = re.sub(r"^```(?:json)?", "", clean).strip()
            if clean.endswith("```"):
                clean = clean[:-3].strip()

            parsed = json.loads(clean)
            return EvidenceExtractionResult.model_validate(parsed)
        except Exception as e:
            logger.error(f"Failed to parse LLM extraction response: {e}. Raw response: {raw_text[:200]}")
            # Fallback safe extraction if JSON validation fails
            raise LLMServiceError(f"Model returned invalid extraction JSON: {str(e)}")
