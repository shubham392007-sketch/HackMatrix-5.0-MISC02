"""
Learn & Grow Local AI Advisor (Ollama Qwen3 8B Integration Foundation).
Implements Section 7 requirements:
- Reuses existing Ollama configuration (qwen3:8b, format: json, temp: 0.1).
- Enforces strict anti-hallucination guard: model is forbidden from inventing provider resources or URLs.
- Rejects malformed JSON and invalid resource IDs.
- Deterministic fallback when Ollama is offline or times out.
"""

import json
import os
import time
from typing import List, Optional, Dict, Any, Set
import httpx
from pydantic import BaseModel, Field, field_validator

from backend.app.core.logging import get_logger
from backend.app.learning.prioritizer import PrioritizationResult
from backend.app.learning.providers.base import NormalizedLearningResource

logger = get_logger("learning.ai_advisor")


class LearningStageRecommendation(BaseModel):
    stage_number: int = Field(..., ge=1)
    stage_title: str
    focus_objective: str
    recommended_resource_ids: List[str] = Field(default_factory=list)
    pedagogical_rationale: str


class LearningPathRecommendation(BaseModel):
    skill_id: str
    canonical_name: str
    recommended_stages: List[LearningStageRecommendation] = Field(default_factory=list)
    estimated_total_hours: int = Field(6, ge=1)
    generation_method: str = Field("ollama_qwen", description="ollama_qwen or heuristic_fallback")
    validation_passed: bool = True
    rejected_hallucinations: List[str] = Field(default_factory=list)
    latency_seconds: Optional[float] = None


class ResourceSelectionExplanation(BaseModel):
    resource_id: str
    resource_title: str
    relevance_justification: str
    targeted_gap_deficiency: str
    prerequisite_alignment: str


class PracticeBrief(BaseModel):
    topic_slug: str
    title: str
    difficulty: str
    scenario_description: str
    starter_code_skeleton: str
    validation_criteria: List[str] = Field(default_factory=list)
    pitfalls_to_avoid: List[str] = Field(default_factory=list)


ADVISOR_SYSTEM_PROMPT = """You are the SkillPassport Learn & Grow Curriculum Advisor.
Your mission is to organize verified learning resources into a structured, pedagogical path.

CRITICAL INTEGRATION & SAFETY INVARIANTS:
1. ONLY recommend resources from the PROVIDED RESOURCE CATALOGUE.
2. NEVER invent or fabricate resource IDs, titles, or URLs.
3. If a resource ID is not in the catalogue, DO NOT include it.
4. Output ONLY valid JSON adhering strictly to the requested schema. No markdown backticks.
"""


class LearningAIAdvisor:
    """
    Dedicated Learn & Grow interface to Ollama Qwen3 8B.
    Includes strict anti-fabrication guards, latency instrumentation, and timeout fallbacks.
    """

    def __init__(
        self,
        ollama_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        self.ollama_url = (ollama_url or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
        self.model = model or os.environ.get("OLLAMA_QWEN_MODEL") or os.environ.get("OLLAMA_MODEL", "qwen3:8b")
        if timeout_seconds is not None:
            self.timeout_seconds = timeout_seconds
        elif "OLLAMA_ROADMAP_TIMEOUT_SECONDS" in os.environ:
            self.timeout_seconds = float(os.environ["OLLAMA_ROADMAP_TIMEOUT_SECONDS"])
        else:
            try:
                from backend.app.core.config import get_settings
                settings = get_settings()
                self.timeout_seconds = float(
                    getattr(settings, "effective_roadmap_timeout_seconds", getattr(settings, "ollama_roadmap_timeout_seconds", 45.0))
                )
            except Exception:
                if "OLLAMA_TIMEOUT_SECONDS" in os.environ:
                    self.timeout_seconds = float(os.environ["OLLAMA_TIMEOUT_SECONDS"])
                else:
                    self.timeout_seconds = 45.0


    async def recommend_learning_path(
        self,
        gap: PrioritizationResult,
        available_catalogue: List[NormalizedLearningResource],
    ) -> LearningPathRecommendation:
        """
        Organizes existing catalogue resources into structured learning stages using Ollama.
        Strictly prevents resource fabrication.
        """
        catalogue_map: Dict[str, NormalizedLearningResource] = {r.id: r for r in available_catalogue}
        allowed_ids: Set[str] = set(catalogue_map.keys())

        # Construct safe prompt containing only existing resources
        catalogue_summary = [
            {"id": r.id, "title": r.title, "type": r.resource_type, "provider": r.provider}
            for r in available_catalogue
        ]

        prompt_payload = {
            "skill_id": gap.skill_id,
            "skill_name": gap.canonical_name,
            "gap_reason": gap.reason_code.value,
            "target_proficiency": gap.target_proficiency,
            "available_resources": catalogue_summary,
        }

        user_prompt = (
            f"Organize the following available resources into 2-3 progressive learning stages for {gap.canonical_name}.\n"
            f"Input:\n{json.dumps(prompt_payload, indent=2)}\n\n"
            "Schema:\n"
            "{\n"
            '  "recommended_stages": [\n'
            '    {\n'
            '      "stage_number": 1,\n'
            '      "stage_title": "Foundational Concepts",\n'
            '      "focus_objective": "Understand core mechanics",\n'
            '      "recommended_resource_ids": ["res-1"],\n'
            '      "pedagogical_rationale": "Essential prerequisite knowledge"\n'
            "    }\n"
            "  ],\n"
            '  "estimated_total_hours": 6\n'
            "}"
        )

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "think": False,
                        "messages": [
                            {"role": "system", "content": ADVISOR_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.1,
                            "num_ctx": 2048,
                            "num_predict": 512,
                        },
                    },
                )
                elapsed = round(time.perf_counter() - start_time, 2)

                if resp.status_code != 200:
                    logger.warning(f"Ollama returned HTTP {resp.status_code} after {elapsed:.2f}s. Using heuristic fallback.")
                    return self._fallback_learning_path(gap, available_catalogue, latency_seconds=elapsed)

                data = resp.json()
                raw_content = data.get("message", {}).get("content", "{}")
                # Attempt to extract pure JSON, handling possible markdown code fences
                try:
                    parsed = json.loads(raw_content)
                except json.JSONDecodeError:
                    import re
                    # Look for JSON fenced code block
                    json_match = re.search(r'```json\s*(\{.*?\})\s*```', raw_content, re.DOTALL)
                    if not json_match:
                        # Fallback to first JSON object in the string
                        json_match = re.search(r'(\{.*\})', raw_content, re.DOTALL)
                    if json_match:
                        try:
                            parsed = json.loads(json_match.group(1))
                        except json.JSONDecodeError as exc:
                            logger.warning(f"Failed to parse Ollama JSON after extraction: {exc}")
                            return self._fallback_learning_path(gap, available_catalogue, latency_seconds=elapsed)
                    else:
                        logger.warning("Ollama response did not contain valid JSON; using fallback.")
                        return self._fallback_learning_path(gap, available_catalogue, latency_seconds=elapsed)

                # Validate and enforce anti-fabrication guard
                raw_stages = parsed.get("recommended_stages", [])
                valid_stages: List[LearningStageRecommendation] = []
                rejected_ids: List[str] = []

                for s in raw_stages:
                    raw_res_ids = s.get("recommended_resource_ids", [])
                    filtered_res_ids = []

                    for rid in raw_res_ids:
                        if rid in allowed_ids:
                            filtered_res_ids.append(rid)
                        else:
                            logger.warning(f"Anti-Hallucination Guard: Rejected fabricated resource ID '{rid}'")
                            rejected_ids.append(rid)

                    valid_stages.append(
                        LearningStageRecommendation(
                            stage_number=s.get("stage_number", len(valid_stages) + 1),
                            stage_title=s.get("stage_title", f"Stage {len(valid_stages) + 1}"),
                            focus_objective=s.get("focus_objective", f"Advance competency in {gap.canonical_name}"),
                            recommended_resource_ids=filtered_res_ids,
                            pedagogical_rationale=s.get("pedagogical_rationale", "Curated learning step"),
                        )
                    )

                logger.info(f"Ollama AI generation successful in {elapsed:.2f}s for '{gap.canonical_name}'")
                return LearningPathRecommendation(
                    skill_id=gap.skill_id,
                    canonical_name=gap.canonical_name,
                    recommended_stages=valid_stages,
                    estimated_total_hours=parsed.get("estimated_total_hours", 6),
                    generation_method="ollama_qwen",
                    validation_passed=True,
                    rejected_hallucinations=rejected_ids,
                    latency_seconds=elapsed,
                )

        except (httpx.TimeoutException, httpx.ConnectError, json.JSONDecodeError) as e:
            elapsed = round(time.perf_counter() - start_time, 2)
            logger.info(f"Ollama offline or request failed after {elapsed:.2f}s ({e}). Employing deterministic heuristic fallback.")
            return self._fallback_learning_path(gap, available_catalogue, latency_seconds=elapsed)
        except Exception as e:
            elapsed = round(time.perf_counter() - start_time, 2)
            logger.error(f"Unexpected error in AI advisor after {elapsed:.2f}s: {e}", exc_info=True)
            return self._fallback_learning_path(gap, available_catalogue, latency_seconds=elapsed)

    def _fallback_learning_path(
        self,
        gap: PrioritizationResult,
        available_catalogue: List[NormalizedLearningResource],
        latency_seconds: Optional[float] = None,
    ) -> LearningPathRecommendation:
        """
        Deterministic, heuristic stage generator when Ollama is offline or times out.
        Ensures 100% application resilience.
        """
        video_ids = [r.id for r in available_catalogue if r.resource_type == "video"]
        doc_ids = [r.id for r in available_catalogue if r.resource_type in ("article", "documentation")]
        code_ids = [r.id for r in available_catalogue if r.resource_type == "repository"]

        stages = []
        # Stage 1: Theory & Core Concepts
        if video_ids or doc_ids:
            stages.append(
                LearningStageRecommendation(
                    stage_number=1,
                    stage_title="1. Conceptual Foundation & Core Architecture",
                    focus_objective=f"Understand theoretical underpinnings of {gap.canonical_name}",
                    recommended_resource_ids=(doc_ids[:1] + video_ids[:1]),
                    pedagogical_rationale="Foundational grounding before code implementation",
                )
            )

        # Stage 2: Applied Code & Implementation
        if code_ids or video_ids[1:]:
            stages.append(
                LearningStageRecommendation(
                    stage_number=len(stages) + 1,
                    stage_title="2. Hands-on Implementation & Practice",
                    focus_objective=f"Build and test practical implementations of {gap.canonical_name}",
                    recommended_resource_ids=(code_ids[:1] + video_ids[1:2]),
                    pedagogical_rationale="Hands-on codebase pattern study",
                )
            )

        if not stages and available_catalogue:
            stages.append(
                LearningStageRecommendation(
                    stage_number=1,
                    stage_title="1. Self-Paced Review",
                    focus_objective=f"Study core resources for {gap.canonical_name}",
                    recommended_resource_ids=[r.id for r in available_catalogue[:2]],
                    pedagogical_rationale="Direct catalogue matching",
                )
            )

        return LearningPathRecommendation(
            skill_id=gap.skill_id,
            canonical_name=gap.canonical_name,
            recommended_stages=stages,
            estimated_total_hours=8,
            generation_method="heuristic_fallback",
            validation_passed=True,
            rejected_hallucinations=[],
            latency_seconds=latency_seconds,
        )
