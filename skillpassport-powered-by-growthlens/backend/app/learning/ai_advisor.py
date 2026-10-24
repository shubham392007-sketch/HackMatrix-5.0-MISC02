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
from backend.app.learning.mini_project_catalogue import CURATED_MINI_PROJECTS

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
        raw_url = (ollama_url or os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")).rstrip("/")
        if "localhost" in raw_url:
            raw_url = raw_url.replace("localhost", "127.0.0.1")
        self.ollama_url = raw_url
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

    async def generate_step_study_packet(
        self,
        topic_id: str,
        topic_title: str,
        learning_objective: str,
        domain_name: str,
    ) -> Dict[str, Any]:
        """
        Generates or resolves a substantive educational study packet with:
        - Concept foundations (what is it)
        - When & why to apply
        - Worked example with syntax-highlighted code
        - Common engineering mistakes
        - Step-by-step implementation guide
        - Knowledge check questions
        - Technical attribution
        """
        import time

        normalized_id = topic_id.replace("step-", "").lower()
        if normalized_id in SUBSTANTIVE_STUDY_PACKETS:
            curated = dict(SUBSTANTIVE_STUDY_PACKETS[normalized_id])
            curated["generation_method"] = "curated_catalogue"
            curated["is_ai_generated"] = False
            curated["ai_provider"] = None
            curated["ai_model"] = None
            curated["latency_seconds"] = 0.0
            curated["generation_status"] = "curated"
            curated["error_message"] = None
            return curated

        # Domain alias matching
        for key, packet in SUBSTANTIVE_STUDY_PACKETS.items():
            if key in normalized_id or normalized_id in key:
                curated = dict(packet)
                curated["generation_method"] = "curated_catalogue"
                curated["is_ai_generated"] = False
                curated["ai_provider"] = None
                curated["ai_model"] = None
                curated["latency_seconds"] = 0.0
                curated["generation_status"] = "curated"
                curated["error_message"] = None
                return curated

        # If Ollama is available, synthesize a high-caliber packet
        start_time = time.time()
        last_error = None
        prompt = (
            f"Generate a rigorous, professional study packet for topic '{topic_title}' in domain '{domain_name}'.\n"
            f"Objective: {learning_objective}\n\n"
            "Respond strictly in JSON adhering to this schema:\n"
            "{\n"
            '  "what_is_it": "Rigorous explanation of core principles",\n'
            '  "why_and_when": "Specific engineering trade-offs and operational contexts",\n'
            '  "worked_example": {\n'
            '    "title": "Title of practical example",\n'
            '    "explanation": "Walkthrough of the code",\n'
            '    "code": "Production-grade code snippet in Python or bash",\n'
            '    "visual_note": "Key takeaway"\n'
            "  },\n"
            '  "common_mistakes": ["Mistake 1 with root cause", "Mistake 2 with fix"],\n'
            '  "implementation_steps": ["Step 1", "Step 2", "Step 3"],\n'
            '  "knowledge_check": [\n'
            "    {\n"
            '      "question": "Diagnostic multiple choice question?",\n'
            '      "options": ["A", "B", "C", "D"],\n'
            '      "correct_index": 0,\n'
            '      "explanation": "Why A is correct"\n'
            "    }\n"
            "  ],\n"
            '  "source_attribution": "Official Documentation or RFC Citation"\n'
            "}"
        )

        try:
            async with httpx.AsyncClient(timeout=min(self.timeout_seconds, 15.0)) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "think": False,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a senior engineering educator. Output ONLY valid JSON with zero conversational preamble.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "format": "json",
                        "stream": False,
                        "options": {"temperature": 0.1, "num_predict": 750},
                    },
                )
                if resp.status_code == 200:
                    raw_content = resp.json().get("message", {}).get("content", "{}")
                    try:
                        parsed = json.loads(raw_content)
                        required_fields = ["what_is_it", "why_and_when", "worked_example", "common_mistakes", "implementation_steps", "knowledge_check", "source_attribution"]
                        if all(f in parsed for f in required_fields) and isinstance(parsed["worked_example"], dict) and "code" in parsed["worked_example"]:
                            parsed["step_id"] = f"step-{topic_id}" if not topic_id.startswith("step-") else topic_id
                            parsed["topic_id"] = topic_id.replace("step-", "")
                            parsed["title"] = topic_title
                            parsed["learning_objective"] = learning_objective
                            parsed["why_this_matters"] = f"Critical for satisfying proficiency benchmarks in {domain_name}."
                            parsed["generation_method"] = "ollama_qwen"
                            parsed["is_ai_generated"] = True
                            parsed["ai_provider"] = "ollama"
                            parsed["ai_model"] = self.model
                            parsed["latency_seconds"] = round(time.time() - start_time, 2)
                            parsed["generation_status"] = "completed"
                            parsed["error_message"] = None
                            return parsed
                    except Exception as e:
                        last_error = str(e)
                        logger.warning(f"Could not parse Ollama study packet JSON: {e}")
        except Exception as e:
            last_error = str(e)
            logger.info(f"Ollama study packet synthesis skipped ({e}), falling back to curated reference packet.")

        # Default domain-appropriate fallback packet
        return {
            "step_id": f"step-{topic_id}" if not topic_id.startswith("step-") else topic_id,
            "topic_id": topic_id.replace("step-", ""),
            "title": topic_title,
            "learning_objective": learning_objective,
            "why_this_matters": f"Developing verified competency in {topic_title} directly remediates diagnosed candidate deficiencies in {domain_name}.",
            "what_is_it": f"{topic_title} represents an essential architectural foundation within {domain_name}. It establishes standard data flow boundaries, idempotency expectations, and failure-handling guarantees required by production services.",
            "why_and_when": f"Deploy {topic_title} whenever building resilient systems where maintainability, typed validation, and performance under scale are non-negotiable requirements.",
            "worked_example": {
                "title": f"Production Implementation Pattern for {topic_title}",
                "explanation": f"A standardized implementation demonstrating robust error handling, typed signatures, and deterministic lifecycle control:",
                "code": f"# Implementation pattern for {topic_title}\nfrom typing import Dict, Any, Optional\nimport logging\n\nlogger = logging.getLogger(__name__)\n\ndef execute_task(payload: Dict[str, Any]) -> Dict[str, Any]:\n    \"\"\"Executes {topic_title} with boundary validations.\"\"\"\n    if not payload:\n        raise ValueError('Payload must not be empty')\n    logger.info('Processing operation with verified parameters')\n    return {{'status': 'success', 'data': payload}}",
                "visual_note": "Ensures complete boundary separation and typed validation prior to execution.",
            },
            "common_mistakes": [
                f"Omitting input validation and relying on downstream components to catch malformed payloads",
                f"Silently swallowing exceptions instead of raising domain-specific errors",
                f"Neglecting automated unit tests for edge cases and boundary conditions",
            ],
            "implementation_steps": [
                f"1. Define explicit schemas and data contracts for {topic_title}",
                f"2. Implement core algorithmic or structural logic with input guard assertions",
                f"3. Write integration and regression test suites validating happy paths and error states",
                f"4. Profile performance and add structured telemetry logging",
            ],
            "knowledge_check": [
                {
                    "question": f"What is the primary benefit of adhering to standardized design patterns in {topic_title}?",
                    "options": [
                        "It eliminates runtime indeterminism, improves maintainability, and prevents defect leakage",
                        "It makes all code execute in zero milliseconds",
                        "It bypasses the need for automated testing",
                        "It prevents other engineers from reading the code",
                    ],
                    "correct_index": 0,
                    "explanation": "Standardized engineering patterns provide predictable lifecycle guarantees and facilitate verifiable automated testing.",
                }
            ],
            "source_attribution": f"GrowthLens Technical Curriculum & Industry Best Practice Specifications ({domain_name})",
            "generation_method": "deterministic_fallback",
            "is_ai_generated": False,
            "ai_provider": None,
            "ai_model": None,
            "latency_seconds": round(time.time() - start_time, 2) if "start_time" in locals() else 0.0,
            "generation_status": "fallback",
            "error_message": last_error,
        }


    async def generate_mini_projects(
        self,
        domain_id: str,
        domain_title: str,
        skill_id: Optional[str],
        skill_name: Optional[str],
        gap_id: Optional[str],
        target_role_id: Optional[str],
        project_count: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Generate domain-specific mini-project specifications using Ollama or curated catalogue.
        Returns a list of validated project dicts. Never fabricates submissions or scores.
        Falls back to curated catalogue when Ollama is unavailable or returns invalid JSON.
        """
        # 1. Check curated catalogue first (always reliable)
        curated = CURATED_MINI_PROJECTS.get(domain_id, [])
        if not curated:
            # Normalize target keys and query tokens
            clean_dom = domain_id.lower().replace("domain-", "").replace("gap-skill-", "").replace("skill-", "").replace("-&-", "-").replace("&", "")
            title_clean = (domain_title or "").lower()
            skill_clean = (skill_name or skill_id or "").lower()

            for key, projects in CURATED_MINI_PROJECTS.items():
                k_clean = key.lower()
                if (
                    k_clean == clean_dom
                    or k_clean in clean_dom
                    or clean_dom in k_clean
                    or k_clean in title_clean
                    or k_clean in skill_clean
                    or (k_clean == "version-control" and ("git" in title_clean or "git" in clean_dom or "version control" in title_clean))
                    or (k_clean == "postgresql" and ("postgres" in title_clean or "sql" in title_clean))
                    or (k_clean == "fastapi-backend" and ("fastapi" in title_clean or "backend" in title_clean))
                    or (k_clean == "data-preprocessing" and ("preprocessing" in title_clean or "data" in title_clean or "pipeline" in title_clean))
                ):
                    curated = projects
                    break

        # 2. Try Ollama generation
        start_time = time.time()
        try:
            prompt = self._build_project_generation_prompt(
                domain_id=domain_id,
                domain_title=domain_title,
                skill_id=skill_id,
                skill_name=skill_name,
                gap_id=gap_id,
                target_role_id=target_role_id,
                project_count=project_count,
            )
            async with httpx.AsyncClient(timeout=min(self.timeout_seconds, 15.0)) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "options": {"temperature": 0.3, "num_predict": 4096},
                    },
                )
                if response.status_code == 200:
                    raw = response.json().get("response", "")
                    latency = round(time.time() - start_time, 2)
                    parsed = json.loads(raw)
                    projects_raw = parsed.get("projects", parsed) if isinstance(parsed, dict) else parsed
                    if isinstance(projects_raw, list) and len(projects_raw) >= 1:
                        validated = []
                        for proj in projects_raw[:project_count]:
                            if self._validate_project_spec(proj):
                                proj["generation_method"] = "ollama_qwen"
                                proj["ai_provider"] = "ollama"
                                proj["ai_model"] = self.model
                                proj["latency_seconds"] = latency
                                proj["generation_status"] = "generated"
                                validated.append(proj)
                        if validated:
                            logger.info(f"Generated {len(validated)} Ollama projects for domain '{domain_id}'")
                            return validated
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            logger.warning(f"Ollama unavailable for project generation ({domain_id}): {e}")
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
            logger.warning(f"Ollama returned invalid project JSON for domain '{domain_id}': {e}")
        except Exception as e:
            logger.warning(f"Ollama project generation error for domain '{domain_id}': {e}")

        # 3. Use curated catalogue
        if curated:
            logger.info(f"Using curated project catalogue for domain '{domain_id}' ({len(curated)} projects)")
            for proj in curated:
                proj["generation_method"] = "curated_catalogue"
                proj["ai_provider"] = None
                proj["ai_model"] = None
                proj["latency_seconds"] = None
                proj["generation_status"] = "curated"
            return curated[:project_count]

        # 4. Deterministic fallback
        logger.warning(f"Generating deterministic fallback project spec for domain '{domain_id}'")
        return self._fallback_projects(domain_id=domain_id, domain_title=domain_title, skill_name=skill_name, project_count=project_count)

    def _validate_project_spec(self, proj: Dict[str, Any]) -> bool:
        """Validates that an AI-generated project has the minimum required substantive fields."""
        required = ["title", "problem_statement", "learning_objectives", "rubric", "milestones"]
        for field in required:
            if not proj.get(field):
                return False
        if len(proj.get("rubric", [])) < 2:
            return False
        if len(proj.get("milestones", [])) < 2:
            return False
        if len(proj.get("title", "")) < 10:
            return False
        return True

    def _build_project_generation_prompt(
        self,
        domain_id: str,
        domain_title: str,
        skill_id: Optional[str],
        skill_name: Optional[str],
        gap_id: Optional[str],
        target_role_id: Optional[str],
        project_count: int,
    ) -> str:
        skill_context = f"Skill: {skill_name or skill_id or 'core competency'}"
        gap_context = f"Gap ID: {gap_id}" if gap_id else ""
        role_context = f"Target role: {target_role_id}" if target_role_id else ""
        return f"""You are the SkillPassport Learn & Grow curriculum architect.

Generate {project_count} realistic, domain-specific mini-project specifications for:
Domain: {domain_title} (ID: {domain_id})
{skill_context}
{gap_context}
{role_context}

Each project must directly develop and demonstrate measurable competency in {domain_title}.

CRITICAL RULES:
- Do NOT fabricate scores, submissions, evaluations, or verification status.
- Projects must be domain-specific and technically substantive, NOT generic templates.
- Each project title must be different and target a distinct sub-skill.
- Output ONLY valid JSON, no markdown, no backticks.

Required JSON schema:
{{
  "projects": [
    {{
      "title": "Specific project title (min 15 chars)",
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimated_hours": <integer 4-40>,
      "problem_statement": "2-4 sentence concrete technical problem that requires {domain_title} skills",
      "relevance_to_gap": "1-2 sentences explaining how this closes the skill gap",
      "learning_objectives": ["objective 1", "objective 2", "objective 3"],
      "expected_deliverables": ["deliverable 1", "deliverable 2"],
      "implementation_requirements": ["requirement 1", "requirement 2"],
      "milestones": [
        {{"step": 1, "title": "Milestone title", "description": "What to do", "acceptance": "How to verify"}},
        {{"step": 2, "title": "Milestone title", "description": "What to do", "acceptance": "How to verify"}},
        {{"step": 3, "title": "Milestone title", "description": "What to do", "acceptance": "How to verify"}}
      ],
      "acceptance_criteria": ["criterion 1", "criterion 2"],
      "rubric": [
        {{"criterion": "Technical Correctness", "weight_pct": 40, "description": "Domain-specific evaluation criteria"}},
        {{"criterion": "Code Quality & Architecture", "weight_pct": 30, "description": "Evaluation criteria"}},
        {{"criterion": "Documentation & Testing", "weight_pct": 30, "description": "Evaluation criteria"}}
      ],
      "submission_instructions": "How to submit (GitHub repo URL, key files to include)",
      "resources": [
        {{"title": "Relevant resource title", "type": "documentation|tutorial|article", "url_hint": "official docs domain"}}
      ]
    }}
  ]
}}"""

    def _fallback_projects(
        self,
        domain_id: str,
        domain_title: str,
        skill_name: Optional[str],
        project_count: int = 3,
    ) -> List[Dict[str, Any]]:
        """Deterministic fallback projects when both Ollama and curated catalogue are unavailable."""
        skill = skill_name or domain_title
        fallback_specs = [
            {
                "title": f"{skill} — Foundational Implementation Project",
                "difficulty": "Intermediate",
                "estimated_hours": 8,
                "problem_statement": f"Design and implement a complete {skill} solution demonstrating core production-grade patterns, error handling, and test coverage.",
                "relevance_to_gap": f"Directly develops verified competency in {skill} through practical implementation.",
                "learning_objectives": [
                    f"Implement core {skill} patterns correctly",
                    "Write automated tests verifying behaviour",
                    "Document architectural decisions",
                ],
                "expected_deliverables": [
                    "GitHub repository with implementation",
                    "README with setup and design rationale",
                    "Test suite with verified coverage",
                ],
                "implementation_requirements": [
                    f"Use production-appropriate {skill} tooling",
                    "Follow coding standards and naming conventions",
                    "Include error handling and input validation",
                ],
                "milestones": [
                    {"step": 1, "title": "Environment Setup & Design", "description": "Set up project structure and define architecture", "acceptance": "Working local environment with design doc"},
                    {"step": 2, "title": "Core Implementation", "description": f"Implement primary {skill} functionality", "acceptance": "Core features functional with manual verification"},
                    {"step": 3, "title": "Testing & Documentation", "description": "Write tests and complete documentation", "acceptance": "Tests pass; README complete"},
                ],
                "acceptance_criteria": [
                    "Implementation is functional and meets problem requirements",
                    "Test suite covers primary use cases",
                    "Documentation enables reproducible setup",
                ],
                "rubric": [
                    {"criterion": "Technical Correctness", "weight_pct": 40, "description": "Core implementation meets problem specification"},
                    {"criterion": "Code Quality", "weight_pct": 30, "description": "Clean, modular, well-named code"},
                    {"criterion": "Testing & Documentation", "weight_pct": 30, "description": "Tests pass; README explains decisions"},
                ],
                "submission_instructions": "Submit a public GitHub repository URL with implementation and README. Include a brief summary of your design choices.",
                "resources": [],
                "generation_method": "deterministic_fallback",
                "ai_provider": None,
                "ai_model": None,
                "latency_seconds": None,
                "generation_status": "fallback",
            },
            {
                "title": f"{skill} — Advanced Integration Challenge",
                "difficulty": "Advanced",
                "estimated_hours": 16,
                "problem_statement": f"Build a production-grade {skill} integration demonstrating advanced patterns including observability, resilience, and performance optimization.",
                "relevance_to_gap": f"Validates senior-level {skill} competency required for target role.",
                "learning_objectives": [
                    f"Apply advanced {skill} patterns in a realistic scenario",
                    "Implement observability and error recovery",
                    "Optimize for performance and maintainability",
                ],
                "expected_deliverables": [
                    "Complete implementation with advanced features",
                    "Performance benchmarks or load test results",
                    "Architecture decision record (ADR)",
                ],
                "implementation_requirements": [
                    f"Implement at least two advanced {skill} patterns",
                    "Include monitoring/logging integration",
                    "Document trade-off decisions in ADR",
                ],
                "milestones": [
                    {"step": 1, "title": "Architecture Design", "description": "Define system design and ADR", "acceptance": "ADR reviewed and design approved"},
                    {"step": 2, "title": "Implementation", "description": "Build advanced integration features", "acceptance": "Features functional end-to-end"},
                    {"step": 3, "title": "Observability & Testing", "description": "Add monitoring, tests and benchmarks", "acceptance": "All tests pass; benchmark data captured"},
                ],
                "acceptance_criteria": [
                    "Advanced patterns correctly implemented and justified",
                    "System handles error cases gracefully",
                    "Performance benchmarks document behavior under load",
                ],
                "rubric": [
                    {"criterion": "Advanced Pattern Application", "weight_pct": 40, "description": "Correct use of advanced techniques"},
                    {"criterion": "Resilience & Observability", "weight_pct": 35, "description": "Error handling, logging, metrics"},
                    {"criterion": "Documentation & Trade-offs", "weight_pct": 25, "description": "ADR quality and completeness"},
                ],
                "submission_instructions": "Submit repository URL with ADR document, implementation, and benchmark results.",
                "resources": [],
                "generation_method": "deterministic_fallback",
                "ai_provider": None,
                "ai_model": None,
                "latency_seconds": None,
                "generation_status": "fallback",
            },
        ]
        return fallback_specs[:project_count]


# ──────────────────────────────────────────────────────────────────────────────
# Comprehensive Substantive Study Packets Repository
# ──────────────────────────────────────────────────────────────────────────────

SUBSTANTIVE_STUDY_PACKETS: Dict[str, Dict[str, Any]] = {
    "topic-gap-skill-docker-core": {
        "step_id": "step-topic-gap-skill-docker-core",
        "topic_id": "topic-gap-skill-docker-core",
        "title": "Multi-Stage Dockerfile Construction & Layer Optimization",
        "learning_objective": "Construct a multi-stage Dockerfile that discards build toolchains and runs under an unprivileged user.",
        "why_this_matters": "Production environments require minimal container footprint and strict security isolation. Single-stage images contain unnecessary build compilers (gcc, make) and run as root by default, introducing high CVE liability and slow deployment cycles.",
        "what_is_it": "Multi-stage Docker builds allow you to use multiple FROM instructions in a single Dockerfile. Each FROM instruction begins a new build stage with a fresh base. You selectively copy artifacts (such as compiled wheels, binaries, or assets) from intermediate builder stages into the final shipping runtime stage, stripping compilers and build caches.",
        "why_and_when": "Use multi-stage builds when: (1) Deploying microservices to container registries where image size correlates with pull latency and bandwidth costs; (2) Hardening production deployments to comply with security standards (e.g., non-root user execution, read-only root filesystems); (3) Maintaining clean separation between build dependencies and runtime dependencies.",
        "worked_example": {
            "title": "Hardened Multi-Stage Dockerfile for Python / FastAPI",
            "explanation": "This multi-stage Dockerfile builds compiled Python dependencies in a builder stage and copies only the installed packages into a minimal runner image with a dedicated non-root user:",
            "code": """# Stage 1: Dependency builder stage
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential gcc libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Minimal hardened runtime stage
FROM python:3.12-slim AS runner

WORKDIR /app

# Create unprivileged system group and user
RUN groupadd -g 10001 appgroup && \\
    useradd -u 10001 -g appgroup -s /bin/false appuser && \\
    apt-get update && apt-get install -y --no-install-recommends \\
    libpq5 curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy only installed wheels from builder
COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appgroup src/ /app/src/

ENV PATH=/home/appuser/.local/bin:$PATH \\
    PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]""",
            "visual_note": "Final image size drops from ~900MB to ~110MB with zero compiler binaries present in the shipping container.",
        },
        "common_mistakes": [
            "Running containers as default root (UID 0), allowing potential container breakout exploits to acquire host root permissions",
            "Placing 'COPY . .' before dependency installation, invalidating Docker's layer cache on every trivial source file change",
            "Omitting a .dockerignore file, accidentally baking .git history, secrets, and local venvs into image layers",
            "Leaving build compilers (gcc, build-essential) inside the final shipping container",
        ],
        "implementation_steps": [
            "1. Create a minimal .dockerignore excluding .git, __pycache__, .env, and local test artifacts",
            "2. Define the builder stage with FROM ... AS builder and install build tools and dependencies",
            "3. Define the final runtime stage with FROM ... AS runner and create a dedicated non-root user (UID 10001)",
            "4. Copy only the compiled dependencies using COPY --from=builder",
            "5. Configure explicit HEALTHCHECK and EXPOSE directives and activate USER appuser before CMD",
        ],
        "knowledge_check": [
            {
                "question": "Why should requirements.txt be copied and installed before copying the rest of the application source code in a Dockerfile?",
                "options": [
                    "To leverage Docker layer caching so package re-installation is skipped when only source code edits occur",
                    "Because Docker requires dependencies to be installed first to parse python syntax",
                    "To compress the image archive during export",
                    "Because Linux will not boot without pre-cached site-packages",
                ],
                "correct_index": 0,
                "explanation": "Docker caches instructions sequentially. If requirements.txt has not changed, Docker reuses the existing cached layer, speeding up CI builds from minutes to seconds.",
            },
            {
                "question": "What primary vulnerability is prevented by configuring 'USER appuser' in production Docker containers?",
                "options": [
                    "Container process escape vulnerabilities from escalating to host-level root control",
                    "Network packet sniffing on local bridge networks",
                    "Database deadlock conditions during batch transactions",
                    "DNS spoofing during external API calls",
                ],
                "correct_index": 0,
                "explanation": "Executing under an unprivileged user ensures that even if an attacker achieves remote code execution within the container, they cannot modify system libraries or mount host resources as root.",
            },
        ],
        "source_attribution": "Docker Official Documentation (Dockerfile Best Practices) & CIS Docker Benchmark v1.6.0",
    },
    "topic-gap-skill-docker-compose": {
        "step_id": "step-topic-gap-skill-docker-compose",
        "topic_id": "topic-gap-skill-docker-compose",
        "title": "Docker Compose Multi-Container Orchestration",
        "learning_objective": "Define declarative service topologies with condition-based depends_on and isolated networks.",
        "why_this_matters": "Modern web applications require coordinated interaction between application servers, databases, and message brokers. Managing individual docker run commands causes networking failures and race conditions during startup.",
        "what_is_it": "Docker Compose is a declarative specification (compose.yaml) for defining and running multi-container Docker applications. It provisions isolated bridge networks, named persistent storage volumes, environment variable injection, and service dependency ordering with healthcheck conditions.",
        "why_and_when": "Use Docker Compose for: (1) Local development environments replicating microservice topologies with a single command; (2) Automated CI/CD integration testing with real databases; (3) Multi-container production or staging edge deployments.",
        "worked_example": {
            "title": "Declarative Multi-Service Compose with Healthchecks & Bridge Networking",
            "explanation": "This Compose configuration synchronizes a FastAPI service, PostgreSQL database, and Redis cache with condition-based startup sequencing:",
            "code": """services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://app:secret@db:5432/appdb
      - REDIS_URL=redis://cache:6379/0
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
    networks:
      - backend-net

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=appdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - backend-net

  cache:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - backend-net

volumes:
  pgdata:

networks:
  backend-net:
    driver: bridge""",
            "visual_note": "The web service is delayed until Postgres and Redis pass their healthcheck probes, completely eliminating connection refusal crashes.",
        },
        "common_mistakes": [
            "Using plain 'depends_on: [db]' without 'condition: service_healthy', causing web apps to crash because the DB container starts before the DB engine is ready to accept connections",
            "Binding database ports to 0.0.0.0 on production hosts instead of keeping them internal to the bridge network",
            "Failing to declare named volumes for stateful services, causing complete data loss whenever containers are restarted",
        ],
        "implementation_steps": [
            "1. Define individual service entries with appropriate base images and environment variables",
            "2. Implement robust healthcheck directives for data stores using native CLI tools (e.g., pg_isready)",
            "3. Configure depends_on with condition: service_healthy on dependent application services",
            "4. Isolate internal communication on a user-defined bridge network",
            "5. Mount database files to persistent named volumes",
        ],
        "knowledge_check": [
            {
                "question": "What is the primary difference between 'depends_on: [db]' and 'depends_on: {db: {condition: service_healthy}}'?",
                "options": [
                    "The condition syntax waits until the database passes its healthcheck probe before starting the web container, whereas plain depends_on only waits for container creation",
                    "Plain depends_on compiles the code; condition syntax does not",
                    "Condition syntax only works on Windows",
                    "There is no difference; both behave identically",
                ],
                "correct_index": 0,
                "explanation": "A database container enters 'running' state long before PostgreSQL finishes initialization. Healthcheck conditions prevent race condition connection errors.",
            }
        ],
        "source_attribution": "Docker Compose Specification & Cloud Native Computing Foundation (CNCF) Reference Architectures",
    },
    "topic-fastapi-routes": {
        "step_id": "step-topic-fastapi-routes",
        "topic_id": "topic-fastapi-routes",
        "title": "FastAPI Route Handlers & Status Codes",
        "learning_objective": "Build RESTful route handlers with explicit response models and status codes.",
        "why_this_matters": "APIs with ambiguous response types or default 200 OK statuses for resource creation violate REST contracts and break client-side SDK generation.",
        "what_is_it": "FastAPI leverages Python type hints and Pydantic models to automatically validate request parameters, serialize responses, enforce status codes, and generate OpenAPI documentation.",
        "why_and_when": "Use explicit route definitions and status codes when designing predictable public APIs or microservice communication channels.",
        "worked_example": {
            "title": "Idempotent Resource Creation Endpoint with Explicit Status Codes",
            "explanation": "Demonstrates typed request validation, 201 Created on resource insertion, and typed HTTP exceptions:",
            "code": """from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, EmailStr

router = APIRouter(prefix="/users", tags=["Users"])

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field("member", pattern="^(admin|member|guest)$")

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str

@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new verified user account",
)
async def create_user(payload: UserCreate):
    # Enforce duplicate check
    if payload.email == "taken@example.com":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )
    return UserResponse(
        id="usr_01HXYZ",
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
    )""",
            "visual_note": "Generates interactive Swagger UI documentation at /docs automatically.",
        },
        "common_mistakes": [
            "Returning 200 OK for resource creation instead of 201 CREATED",
            "Catching exceptions and returning dicts with {'error': 'msg'} instead of raising HTTPException",
            "Omitting response_model, which allows internal database fields or passwords to leak to clients",
        ],
        "implementation_steps": [
            "1. Define strict input and output Pydantic schemas",
            "2. Decorate the endpoint with @router.post, status_code=201, and response_model",
            "3. Implement validation guards with typed HTTPException",
            "4. Return schema-conforming objects",
        ],
        "knowledge_check": [
            {
                "question": "Why is response_model critical in FastAPI route definitions?",
                "options": [
                    "It filters and serializes output data, preventing sensitive internal model fields from leaking",
                    "It speeds up network transmission by converting JSON to XML",
                    "It disables CORS security headers",
                    "It prevents the server from restarting",
                ],
                "correct_index": 0,
                "explanation": "FastAPI uses response_model to filter the output data through Pydantic, ensuring only fields explicitly defined in the response model are serialized.",
            }
        ],
        "source_attribution": "FastAPI Official Documentation (Tutorial - Response Model & Status Codes)",
    },
    "topic-sql-indexing": {
        "step_id": "step-topic-sql-indexing",
        "topic_id": "topic-sql-indexing",
        "title": "B-Tree vs GIN Index Selection & Covering Indexes",
        "learning_objective": "Eliminate sequential table scans on multi-million row tables using covering indexes and GIN structures.",
        "why_this_matters": "High-throughput relational databases degrade exponentially when full table scans occur on critical path queries.",
        "what_is_it": "B-Tree indexes provide logarithmic search for equality and range filters, while Generalized Inverted Indexes (GIN) index composite elements like arrays and JSONB keys.",
        "why_and_when": "Use B-Tree covering indexes (INCLUDE clause) for OLTP workloads requiring Index-Only Scans without touching table heap pages.",
        "worked_example": {
            "title": "Covering B-Tree Index with JSONB GIN Index",
            "explanation": "Constructs an index-only scan covering index and a jsonb_path_ops GIN index:",
            "code": """-- 1. Covering B-Tree Index for hot customer queries
CREATE INDEX CONCURRENTLY idx_orders_user_created
ON orders (user_id, created_at DESC)
INCLUDE (status, total_amount);

-- 2. Specialized GIN index for JSONB metadata filters
CREATE INDEX CONCURRENTLY idx_orders_metadata_gin
ON orders USING gin (metadata jsonb_path_ops);

-- Query verification using EXPLAIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT status, total_amount
FROM orders
WHERE user_id = 'usr_102'
ORDER BY created_at DESC
LIMIT 10;""",
            "visual_note": "Executing with EXPLAIN confirms 'Index Only Scan' with zero heap page fetches.",
        },
        "common_mistakes": [
            "Creating single-column indexes on every column instead of targeted composite indexes",
            "Omitting the INCLUDE clause when selecting 1-2 projection columns, forcing expensive table heap fetches",
            "Indexing high-cardinality volatile columns with GIN instead of B-Tree",
        ],
        "implementation_steps": [
            "1. Profile slow queries using pg_stat_statements and EXPLAIN (ANALYZE, BUFFERS)",
            "2. Order composite index columns: equality columns first, range/sort columns second",
            "3. Append non-filter projection columns using the INCLUDE clause",
            "4. Build indexes concurrently in production using CREATE INDEX CONCURRENTLY",
        ],
        "knowledge_check": [
            {
                "question": "What is the primary benefit of a covering index utilizing PostgreSQL's INCLUDE clause?",
                "options": [
                    "It allows the query planner to satisfy the query via an Index Only Scan without visiting table heap pages",
                    "It automatically partitions the table across multiple SSDs",
                    "It prevents all database write locks forever",
                    "It converts SQL queries into binary C code",
                ],
                "correct_index": 0,
                "explanation": "Included columns are stored in the leaf pages of the B-Tree but do not participate in index sorting, enabling Index Only Scans without bloating search tree traversal.",
            }
        ],
        "source_attribution": "PostgreSQL Documentation (Chapter 11 - Indexes: Index-Only Scans and Covering Indexes)",
    },
    "topic-data-cleaning": {
        "step_id": "step-topic-data-cleaning",
        "topic_id": "topic-data-cleaning",
        "title": "Data Imputation & Type Normalization Pipelines",
        "learning_objective": "Build deterministic preprocessing pipelines handling missing values and schema enforcement.",
        "why_this_matters": "Downstream model training and ETL jobs fail unpredictably when unhandled NaNs, dirty string floats, or timezone drifts enter pipelines.",
        "what_is_it": "Data imputation and normalization systematically validate inputs, replace missing values with domain-appropriate statistics, and coerce types.",
        "why_and_when": "Execute at the ingestion boundary before writing to feature stores or data warehouses.",
        "worked_example": {
            "title": "Production Polars/Pandas Schema-Safe Imputation Pipeline",
            "explanation": "Validates types, imputes median values for numerical columns, and cleans categoricals:",
            "code": """import pandas as pd
import numpy as np
from typing import Dict, Any

def clean_tabular_batch(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = df.copy()
    # 1. Type coercion
    if 'created_at' in cleaned.columns:
        cleaned['created_at'] = pd.to_datetime(cleaned['created_at'], errors='coerce', utc=True)
    # 2. Numerical imputation
    num_cols = cleaned.select_dtypes(include=[np.number]).columns
    for col in num_cols:
        median_val = cleaned[col].median()
        cleaned[col] = cleaned[col].fillna(median_val)
    # 3. Categorical imputation
    cat_cols = cleaned.select_dtypes(include=['object']).columns
    for col in cat_cols:
        cleaned[col] = cleaned[col].astype(str).str.strip().str.lower().fillna('unknown')
    return cleaned""",
            "visual_note": "Ensures zero NaN leakage with verified column schemas.",
        },
        "common_mistakes": [
            "Imputing test datasets using test set statistics rather than training set parameters (data leakage)",
            "Silently dropping rows with dropna() without logging data loss percentages",
            "Ignoring UTC timezone offsets in datetime parsing",
        ],
        "implementation_steps": [
            "1. Assert non-null schemas using Pydantic or Great Expectations",
            "2. Fit imputation parameters strictly on training split and transform test split",
            "3. Enforce explicit UTC datetime conversions",
        ],
        "knowledge_check": [
            {
                "question": "Why must imputation values (like median or mean) be calculated only from the training split in ML pipelines?",
                "options": [
                    "To prevent data leakage from the evaluation/test split into the model training pipeline",
                    "Because pandas will crash if test data is computed",
                    "To save disk space on AWS",
                    "Because test splits never contain numerical values",
                ],
                "correct_index": 0,
                "explanation": "Computing statistics on the entire dataset leaks information about the test distribution into the training pipeline, leading to overly optimistic evaluation metrics.",
            }
        ],
        "source_attribution": "Google Data Quality Guidelines & Scikit-Learn Documentation (Imputation of missing values)",
    },
}
