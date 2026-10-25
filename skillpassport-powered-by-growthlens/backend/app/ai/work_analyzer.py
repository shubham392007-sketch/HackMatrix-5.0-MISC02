import json
import re
import time
import urllib.parse
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.logging import get_logger
from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import AIAnalysisRun, WorkAnalysisResult
from backend.app.ai.prompt_injection import prompt_injection_guard
from backend.app.ai.output_validator import output_validator

logger = get_logger("ai.work_analyzer")

WORK_ANALYSIS_SYSTEM_PROMPT = """You are the SkillPassport AI Work Analysis Engine.
Analyze the following professional work artifact and decompose it into structured facts, claims, and inferences.

STRICT GROUNDING & SEPARATION RULES:
1. `observed_facts`: ONLY direct, verifiable facts from the artifact (e.g. "Implemented FastAPI route with Pydantic validation", "Completed Databricks Generative AI course on 2024-03-15", "Modified 8 files in repository").
2. `claimed_information`: Self-reported claims from user descriptions, PR summaries, or resumes that cannot be independently confirmed from the code/document alone.
3. `inferred_attributes`: Reasonable technical deductions (e.g. "System complexity: Medium", "Demonstrates attention to API backward compatibility"). Each inference MUST reference supporting observed facts.
4. `technical_tasks`: Concrete technical tasks performed (e.g. ["Refactored SQL queries", "Added Redis cache", "Wrote unit tests"]).
5. `technologies`: Explicit technologies, frameworks, and libraries observed (e.g. ["Python", "FastAPI", "PostgreSQL", "Docker"]).
6. `demonstrated_skills`: Professional competencies and skills demonstrated by the user in this artifact (e.g. [{"skill": "Statistical Modeling", "proficiency": "Advanced", "justification": "Implemented Weibull survival model"}, {"skill": "Automated Testing", "proficiency": "Intermediate", "justification": "Wrote 11 unit tests with pytest"}]). Cross-reference with candidate skills extracted from the evidence.
7. `uncertainty_flags`: Genuine uncertainties (e.g. "Collaborative commit where contribution percentage is unconfirmed", "No test files present in diff").
8. Dynamic Confidence Score: Evaluate and output a realistic, evidence-grounded `confidence_score` (float between 0.10 and 0.99). Never output a hardcoded or fixed 0.85. Base it on demonstrable code/commit depth, verifiable tasks, and concrete outputs.
9. If text is empty or insufficient: return empty lists with an uncertainty flag explaining why.
10. Output ONLY a valid JSON object matching the exact schema below, with NO markdown backticks or extra commentary.

Schema:
{
  "summary": "1-2 sentence executive summary of the work artifact",
  "role": "Lead Author | Contributor | Recipient | Reviewer",
  "observed_facts": [
    {"fact": "Direct fact from artifact", "type": "code" | "artifact" | "credential" | "process"}
  ],
  "claimed_information": [
    {"claim": "User or document claim", "source": "PR description | User title | Commit message"}
  ],
  "inferred_attributes": [
    {"attribute": "Inferred quality or architectural trait", "supported_by": "Fact index or description"}
  ],
  "technical_tasks": ["Task 1", "Task 2"],
  "technologies": ["Tech 1", "Tech 2"],
  "demonstrated_skills": [
    {"skill": "Skill Name", "proficiency": "Foundational" | "Intermediate" | "Advanced", "justification": "Direct supporting excerpt or reason from artifact"}
  ],
  "uncertainty_flags": [
    {"area": "Attribution | Completeness | Scope", "reason": "Specific uncertainty explanation"}
  ],
  "confidence_score": 0.89
}
"""


# Strict Pydantic Schema for Model & Fallback Outputs
class ObservedFactItem(BaseModel):
    fact: str
    type: str = "artifact"


class ClaimedInfoItem(BaseModel):
    claim: str
    source: str = "Artifact description"


class InferredAttrItem(BaseModel):
    attribute: str
    supported_by: str = ""


class DemonstratedSkillItem(BaseModel):
    skill: str
    proficiency: str = "Intermediate"
    justification: str = ""


class UncertaintyFlagItem(BaseModel):
    area: str
    reason: str


class WorkAnalysisOutput(BaseModel):
    summary: str
    role: str = "Contributor"
    observed_facts: List[ObservedFactItem] = Field(default_factory=list)
    claimed_information: List[ClaimedInfoItem] = Field(default_factory=list)
    inferred_attributes: List[InferredAttrItem] = Field(default_factory=list)
    technical_tasks: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)
    demonstrated_skills: List[DemonstratedSkillItem] = Field(default_factory=list)
    uncertainty_flags: List[UncertaintyFlagItem] = Field(default_factory=list)
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)

    @model_validator(mode="before")
    @classmethod
    def normalize_input(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        
            
        # 2. Confidence score normalization (e.g. 85 -> 0.85)
        raw_conf = data.get("confidence_score")
        if raw_conf is not None:
            try:
                conf = float(raw_conf)
                if conf > 1.0:
                    conf = conf / 100.0 if conf <= 100.0 else 0.85
                data["confidence_score"] = max(0.05, min(0.99, conf))
            except (ValueError, TypeError):
                data["confidence_score"] = 0.85
        else:
            data["confidence_score"] = 0.85
            
        # 3. Normalize observed_facts
        facts = data.get("observed_facts")
        if isinstance(facts, list):
            norm_facts = []
            for f in facts:
                if isinstance(f, str):
                    norm_facts.append({"fact": f, "type": "artifact"})
                elif isinstance(f, dict):
                    norm_facts.append({
                        "fact": str(f.get("fact") or f.get("description") or f.get("text") or ""),
                        "type": str(f.get("type") or "artifact")
                    })
            data["observed_facts"] = norm_facts

        # 4. Normalize claimed_information
        claims = data.get("claimed_information")
        if isinstance(claims, list):
            norm_claims = []
            for c in claims:
                if isinstance(c, str):
                    norm_claims.append({"claim": c, "source": "Artifact description"})
                elif isinstance(c, dict):
                    norm_claims.append({
                        "claim": str(c.get("claim") or c.get("text") or ""),
                        "source": str(c.get("source") or "Artifact description")
                    })
            data["claimed_information"] = norm_claims

        # 5. Normalize inferred_attributes
        attrs = data.get("inferred_attributes")
        if isinstance(attrs, list):
            norm_attrs = []
            for a in attrs:
                if isinstance(a, str):
                    norm_attrs.append({"attribute": a, "supported_by": ""})
                elif isinstance(a, dict):
                    norm_attrs.append({
                        "attribute": str(a.get("attribute") or a.get("name") or ""),
                        "supported_by": str(a.get("supported_by") or "")
                    })
            data["inferred_attributes"] = norm_attrs

        # 6. Normalize demonstrated_skills
        skills = data.get("demonstrated_skills")
        if isinstance(skills, list):
            norm_skills = []
            for s in skills:
                if isinstance(s, str):
                    norm_skills.append({"skill": s, "proficiency": "Intermediate", "justification": ""})
                elif isinstance(s, dict):
                    norm_skills.append({
                        "skill": str(s.get("skill") or s.get("name") or ""),
                        "proficiency": str(s.get("proficiency") or "Intermediate"),
                        "justification": str(s.get("justification") or "")
                    })
            data["demonstrated_skills"] = norm_skills

        # 7. Normalize uncertainty_flags
        uncs = data.get("uncertainty_flags")
        if isinstance(uncs, list):
            norm_uncs = []
            for u in uncs:
                if isinstance(u, str):
                    norm_uncs.append({"area": "Scope", "reason": u})
                elif isinstance(u, dict):
                    norm_uncs.append({
                        "area": str(u.get("area") or "Scope"),
                        "reason": str(u.get("reason") or u.get("explanation") or "")
                    })
            data["uncertainty_flags"] = norm_uncs

        # 8. Normalize technical_tasks and technologies
        for list_key in ("technical_tasks", "technologies"):
            val = data.get(list_key)
            if isinstance(val, list):
                data[list_key] = [str(x) for x in val if x]
            elif val is not None:
                data[list_key] = [str(val)]

        return data


class WorkAnalyzerService:
    def __init__(self):
        self.settings = get_settings()
        self.ollama_url = self.settings.ollama_base_url.rstrip("/")
        self.model = self.settings.ollama_qwen_model

    def _sanitize_netloc(self, url: str) -> str:
        """Extracts hostname and port safely without credentials or paths."""
        try:
            parsed = urllib.parse.urlparse(url)
            return parsed.netloc or url
        except Exception:
            return "unknown-host"

    async def analyze_evidence_item(
        self,
        db: Session,
        evidence_id: uuid.UUID,
        owner_user_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Runs structured work analysis on a persisted Domain 1 EvidenceItem.
        Strictly differentiates local Ollama Qwen3 8B inference from deterministic rule-based fallback.
        """
        evidence = db.query(EvidenceItem).filter(
            EvidenceItem.id == evidence_id,
            EvidenceItem.owner_user_id == owner_user_id,
        ).first()

        if not evidence:
            raise ValueError(f"Evidence {evidence_id} not found or not owned by user")

        # 1. Scan for prompt injection in source text
        source_text = (evidence.extracted_excerpt or "") + "\n" + (evidence.description or "")
        prompt_injection_guard.record_findings_if_any(
            db=db,
            owner_user_id=owner_user_id,
            evidence_id=evidence_id,
            source_type=evidence.source_provider,
            text=source_text,
        )
        safe_text = prompt_injection_guard.sanitize_content(source_text)

        # 2. Create AIAnalysisRun record
        run_id = uuid.uuid4()
        analysis_run = AIAnalysisRun(
            id=run_id,
            owner_user_id=owner_user_id,
            input_evidence_ids=[str(evidence_id)],
            content_hash=evidence.content_hash or "",
            analysis_type="work_analysis",
            status="running",
            model_name=self.model,
            prompt_version="v1.0",
            schema_version="v1.0",
            validator_version="v1.0",
            processing_warnings=[],
            output_record_refs={},
        )
        db.add(analysis_run)
        db.commit()

        # 3. Handle empty / insufficient evidence directly (Grounded Trust Invariant)
        words = safe_text.strip().split() if safe_text else []
        if not safe_text or len(words) < 4 or evidence.evidence_strength == "insufficient":
            result_data = {
                "summary": "Artifact contains insufficient text to identify demonstrable engineering tasks.",
                "role": "Recipient",
                "observed_facts": [
                    {"fact": f"Uploaded artifact title: {evidence.title}", "type": "artifact"}
                ],
                "claimed_information": [],
                "inferred_attributes": [],
                "technical_tasks": [],
                "technologies": [],
                "uncertainty_flags": [
                    {"area": "Completeness", "reason": "Text content contains minimal words or identity-only information"}
                ],
                "confidence_score": 0.20,
            }
            return self._persist_analysis_result(
                db=db,
                analysis_run=analysis_run,
                evidence=evidence,
                data=result_data,
                analysis_method="rule_based",
                model_name=None,
                model_version=None,
                fallback_used=False,
                fallback_reason=None,
                analysis_status="insufficient_evidence",
                validation_status="valid",
            )

        # 4. Query candidate skills extracted in Domain 1 for this evidence item
        from backend.app.models.taxonomy import EvidenceCompetencyMapping, CompetencyTaxonomy
        cand_maps = db.query(EvidenceCompetencyMapping, CompetencyTaxonomy).join(
            CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id
        ).filter(
            EvidenceCompetencyMapping.evidence_id == evidence_id,
            EvidenceCompetencyMapping.owner_user_id == owner_user_id,
        ).all()
        extracted_skills_list = [
            {
                "name": tax.canonical_name,
                "category": tax.category,
                "proficiency": m.proficiency_level or "Intermediate",
                "justification": m.supporting_excerpt or m.rationale or "",
            }
            for m, tax in cand_maps
        ]
        candidate_skill_names = [s["name"] for s in extracted_skills_list]

        # 5. Invoke Ollama Qwen3 8B with calibrated context window
        # Calibrate context window to ensure 100% layer offloading to RTX 4050 6GB GPU
        # 4096 tokens fits in ~5.2 GB total VRAM; 8192 tokens fits in ~5.8 GB total VRAM.
        configured_ctx = int(getattr(self.settings, "ollama_num_ctx", 8192))
        if len(safe_text) < 8000:
            ctx_tokens = 4096
        else:
            ctx_tokens = min(configured_ctx, 8192)

        max_chars = int(ctx_tokens * 2.8)
        content_payload = safe_text
        truncated = False
        truncated_chars = 0
        if len(content_payload) > max_chars:
            truncated = True
            truncated_chars = len(content_payload) - max_chars
            content_payload = content_payload[:max_chars] + f"\n\n[Content truncated to {max_chars} characters for context budget]"

        user_prompt = (
            f"Source Provider: {evidence.source_provider}\n"
            f"Artifact Title: {evidence.title}\n"
            f"Claimed Contribution: {evidence.attribution_status}\n"
            f"Candidate Skills Extracted in Evidence Ingestion: {', '.join(candidate_skill_names) if candidate_skill_names else 'None'}\n\n"
            f"Content:\n{content_payload}"
        )

        endpoint_netloc = self._sanitize_netloc(self.ollama_url)
        # Keep interactive work analysis timeout bounded (120s) so local LLM inference completes reliably
        timeout_seconds = float(getattr(self.settings, "ollama_work_analysis_timeout_seconds", getattr(self.settings, "ollama_timeout_seconds", 120.0)))

        parsed_data = None
        fallback_used = False
        fallback_reason = None
        failure_stage = "pre_call"
        start_time = time.monotonic()

        try:
            failure_stage = "connecting"
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                failure_stage = "inference_request"
                resp = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": WORK_ANALYSIS_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        "format": "json",
                        "stream": False,
                        "think": False,
                        "options": {
                            "temperature": 0.0,
                            "num_predict": 1024,
                            "num_ctx": ctx_tokens,
                            "num_gpu": 99,
                            "num_thread": 8,
                        },
                    },
                )
                duration_ms = int((time.monotonic() - start_time) * 1000)

                failure_stage = "http_response_eval"
                resp.raise_for_status()

                failure_stage = "output_parsing"
                body = resp.json()
                msg = body.get("message", {})
                raw_content = msg.get("content", "")

                if not raw_content and msg.get("thinking"):
                    raw_content = msg.get("thinking", "")

                if not raw_content:
                    raise ValueError("Ollama returned empty message content")

                # Clean markdown backticks and thinking tags if present
                cleaned = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)

                match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
                if not match:
                    raise ValueError("No JSON object found in Ollama output")

                json_dict = json.loads(match.group(0))

                failure_stage = "pydantic_validation"
                validated_model = WorkAnalysisOutput(**json_dict)
                parsed_data = validated_model.model_dump()

        except httpx.ConnectError as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            fallback_used = True
            fallback_reason = "ollama_connection_refused"
            logger.warning(
                f"Ollama call for work analysis failed (ConnectError: Connection refused to {endpoint_netloc}). "
                f"Endpoint: {endpoint_netloc}, Model: {self.model}, Duration: {duration_ms}ms, "
                f"Stage: {failure_stage}, RunID: {run_id}, EvidenceID: {evidence_id}. "
                "Falling back to rule-based engine.",
                extra={
                    "exception_class": "ConnectError",
                    "safe_message": f"Connection refused to {endpoint_netloc}",
                    "failure_stage": failure_stage,
                    "model_name": self.model,
                    "endpoint": endpoint_netloc,
                    "duration_ms": duration_ms,
                    "run_id": str(run_id),
                    "evidence_id": str(evidence_id),
                    "fallback_used": True,
                    "fallback_reason": fallback_reason,
                },
            )

        except httpx.TimeoutException as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            fallback_used = True
            fallback_reason = "ollama_timeout"
            exc_name = type(e).__name__
            logger.warning(
                f"Ollama call for work analysis failed ({exc_name}: Request timed out after {duration_ms}ms, limit {timeout_seconds}s). "
                f"Endpoint: {endpoint_netloc}, Model: {self.model}, Duration: {duration_ms}ms, "
                f"Stage: {failure_stage}, RunID: {run_id}, EvidenceID: {evidence_id}. "
                "Falling back to rule-based engine.",
                extra={
                    "exception_class": exc_name,
                    "safe_message": f"Request timed out after {duration_ms}ms (limit {timeout_seconds}s)",
                    "failure_stage": failure_stage,
                    "model_name": self.model,
                    "endpoint": endpoint_netloc,
                    "duration_ms": duration_ms,
                    "run_id": str(run_id),
                    "evidence_id": str(evidence_id),
                    "fallback_used": True,
                    "fallback_reason": fallback_reason,
                },
            )

        except httpx.HTTPStatusError as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            fallback_used = True
            status_code = e.response.status_code if e.response else "unknown"
            fallback_reason = f"ollama_http_{status_code}"
            logger.warning(
                f"Ollama call for work analysis failed (HTTPStatusError: HTTP {status_code}). "
                f"Endpoint: {endpoint_netloc}, Model: {self.model}, Duration: {duration_ms}ms, "
                f"Stage: {failure_stage}, RunID: {run_id}, EvidenceID: {evidence_id}. "
                "Falling back to rule-based engine.",
                extra={
                    "exception_class": "HTTPStatusError",
                    "safe_message": f"Ollama HTTP {status_code}",
                    "http_status": status_code,
                    "failure_stage": failure_stage,
                    "model_name": self.model,
                    "endpoint": endpoint_netloc,
                    "duration_ms": duration_ms,
                    "run_id": str(run_id),
                    "evidence_id": str(evidence_id),
                    "fallback_used": True,
                    "fallback_reason": fallback_reason,
                },
            )

        except Exception as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            fallback_used = True
            exc_name = type(e).__name__
            safe_msg = str(e) or f"Error encountered during stage: {failure_stage}"
            fallback_reason = "invalid_model_response" if failure_stage in ("output_parsing", "pydantic_validation") else "ollama_invocation_error"
            logger.warning(
                f"Ollama call for work analysis failed ({exc_name}: {safe_msg}). "
                f"Endpoint: {endpoint_netloc}, Model: {self.model}, Duration: {duration_ms}ms, "
                f"Stage: {failure_stage}, RunID: {run_id}, EvidenceID: {evidence_id}. "
                "Falling back to rule-based engine.",
                extra={
                    "exception_class": exc_name,
                    "safe_message": safe_msg,
                    "failure_stage": failure_stage,
                    "model_name": self.model,
                    "endpoint": endpoint_netloc,
                    "duration_ms": duration_ms,
                    "run_id": str(run_id),
                    "evidence_id": str(evidence_id),
                    "fallback_used": True,
                    "fallback_reason": fallback_reason,
                },
            )

        # 5. Fallback determination without fabricating results
        if not parsed_data or not isinstance(parsed_data, dict):
            fallback_used = True
            if not fallback_reason:
                fallback_reason = "fallback_triggered"
            parsed_data = self._rule_based_work_analysis(evidence, safe_text, extracted_skills_list)
            analysis_method = "rule_based"
            actual_model = None
            model_ver = None
        else:
            analysis_method = "ollama"
            actual_model = self.model
            model_ver = "qwen3:8b"

        # Cross-evaluate demonstrated skills with Domain 1 evidence extraction
        raw_skills = parsed_data.get("demonstrated_skills", []) if parsed_data else []
        processed_skills = []
        seen_names_lower = set()

        for item in raw_skills:
            if isinstance(item, dict):
                s_name = item.get("skill") or item.get("name") or ""
                s_prof = item.get("proficiency", "Intermediate")
                s_just = item.get("justification", "")
            elif isinstance(item, str):
                s_name = item
                s_prof = "Intermediate"
                s_just = ""
            else:
                continue

            if not s_name:
                continue
            s_lower = s_name.lower().strip()
            if s_lower in seen_names_lower:
                continue
            seen_names_lower.add(s_lower)

            # Check if this skill matches or relates to one extracted in Evidence section
            matched_ext = next((ext for ext in extracted_skills_list if ext["name"].lower() in s_lower or s_lower in ext["name"].lower()), None)
            corroborated = matched_ext is not None
            cat = matched_ext["category"] if matched_ext else "Technical"
            if matched_ext and not s_just:
                s_just = matched_ext["justification"]

            processed_skills.append({
                "name": s_name,
                "proficiency": s_prof,
                "category": cat,
                "corroborated_with_evidence": corroborated,
                "justification": s_just,
            })

        # Ensure all candidate skills extracted from this evidence item in Domain 1 are included
        for ext in extracted_skills_list:
            ext_lower = ext["name"].lower().strip()
            if not any(ext_lower in s or s in ext_lower for s in seen_names_lower):
                seen_names_lower.add(ext_lower)
                processed_skills.append({
                    "name": ext["name"],
                    "proficiency": ext["proficiency"],
                    "category": ext["category"],
                    "corroborated_with_evidence": True,
                    "justification": ext["justification"],
                })

        parsed_data["demonstrated_skills"] = processed_skills

        # 6. Validate output schema & semantic constraints
        val_res = output_validator.validate_work_analysis_output(
            raw_output=parsed_data,
            db=db,
            owner_user_id=owner_user_id,
            run_id=run_id,
        )
        validation_status = "valid" if val_res.get("schema_valid") and val_res.get("semantic_valid") else "warning"
        if not val_res.get("schema_valid"):
            analysis_run.processing_warnings.append({"type": "schema_warning", "errors": val_res.get("errors", [])})

        analysis_status = parsed_data.get("status", "completed")

        return self._persist_analysis_result(
            db=db,
            analysis_run=analysis_run,
            evidence=evidence,
            data=parsed_data,
            analysis_method=analysis_method,
            model_name=actual_model,
            model_version=model_ver,
            fallback_used=fallback_used,
            fallback_reason=fallback_reason,
            analysis_status=analysis_status,
            validation_status=validation_status,
            truncated=truncated,
            truncated_chars=truncated_chars,
        )

    def _persist_analysis_result(
        self,
        db: Session,
        analysis_run: AIAnalysisRun,
        evidence: EvidenceItem,
        data: Dict[str, Any],
        analysis_method: str = "ollama",
        model_name: Optional[str] = "qwen3:8b",
        model_version: Optional[str] = "v1.0",
        fallback_used: bool = False,
        fallback_reason: Optional[str] = None,
        analysis_status: str = "completed",
        validation_status: str = "valid",
        truncated: bool = False,
        truncated_chars: int = 0,
    ) -> Dict[str, Any]:
        """Saves WorkAnalysisResult and updates AIAnalysisRun with explicit audit metadata."""
        result_id = uuid.uuid4()
        raw_cs = data.get("confidence_score")
        calc_conf = None
        if raw_cs is not None:
            try:
                cs_val = float(str(raw_cs).replace("%", "").strip())
                if cs_val > 1.0:
                    cs_val = cs_val / 100.0
                if 0.10 <= cs_val <= 0.99:
                    calc_conf = round(cs_val, 2)
            except (ValueError, TypeError):
                pass

        if calc_conf is None:
            n_facts = len(data.get("observed_facts", []))
            n_tasks = len(data.get("technical_tasks", []))
            n_techs = len(data.get("technologies", []))
            n_skills = len(data.get("demonstrated_skills", []))
            calc_conf = round(min(0.60 + (n_facts * 0.04) + (n_tasks * 0.05) + (n_techs * 0.03) + (n_skills * 0.03), 0.95), 2)

        work_res = WorkAnalysisResult(
            id=result_id,
            run_id=analysis_run.id,
            owner_user_id=evidence.owner_user_id,
            evidence_id=evidence.id,
            observed_facts=data.get("observed_facts", []),
            claimed_information=data.get("claimed_information", []),
            inferred_attributes=data.get("inferred_attributes", []),
            technical_tasks=data.get("technical_tasks", []),
            technologies=data.get("technologies", []),
            uncertainty_flags=data.get("uncertainty_flags", []),
            confidence_score=calc_conf,
            summary=data.get("summary", ""),
            role_identified=data.get("role", "Contributor"),
            analysis_method=analysis_method,
            model_name=model_name,
            model_version=model_version,
            fallback_used=fallback_used,
            fallback_reason=fallback_reason,
            analysis_status=analysis_status,
            validation_status=validation_status,
        )
        db.add(work_res)

        analysis_run.status = "completed" if analysis_status != "failed" else "failed"
        analysis_run.completed_at = datetime.utcnow()
        analysis_run.model_name = model_name or "rule_based"
        analysis_run.output_record_refs = {"work_analysis_id": str(result_id)}
        warnings_list = list(analysis_run.processing_warnings or [])
        if fallback_used and fallback_reason:
            warnings_list.append({"type": "fallback_used", "reason": fallback_reason})
        if truncated:
            warnings_list.append({
                "type": "content_truncated",
                "truncated_chars": truncated_chars,
                "message": f"Input content exceeded context budget and was truncated by {truncated_chars} characters.",
            })
        analysis_run.processing_warnings = warnings_list
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(analysis_run, "processing_warnings")
        db.commit()

        return {
            "analysis_id": str(result_id),
            "run_id": str(analysis_run.id),
            "evidence_id": str(evidence.id),
            "title": evidence.title,
            "source_type": evidence.source_provider,
            "summary": work_res.summary,
            "role": work_res.role_identified,
            "observed_facts": work_res.observed_facts,
            "claimed_information": work_res.claimed_information,
            "inferred_attributes": work_res.inferred_attributes,
            "technical_tasks": work_res.technical_tasks,
            "technologies": work_res.technologies,
            "demonstrated_skills": data.get("demonstrated_skills", []),
            "uncertainty_flags": work_res.uncertainty_flags,
            "confidence_score": work_res.confidence_score,
            "analysis_method": work_res.analysis_method,
            "model_name": work_res.model_name,
            "model_version": work_res.model_version,
            "fallback_used": work_res.fallback_used,
            "fallback_reason": work_res.fallback_reason,
            "analysis_status": work_res.analysis_status,
            "validation_status": work_res.validation_status,
            "truncated": truncated,
            "truncated_chars": truncated_chars,
            "created_at": work_res.created_at.isoformat() if work_res.created_at else None,
        }

    def _rule_based_work_analysis(
        self,
        evidence: EvidenceItem,
        text: str,
        extracted_skills: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Deterministic extractor of facts, claims, and technologies.
        STRICT TRUST CONSTRAINTS:
        - Never fabricates tasks or observations.
        - Grounded solely in verbatim excerpt sentences.
        - Preserves uncertainty explicitly.
        - Does not assign inflated default confidence percentages.
        """
        lower = text.lower() if text else ""
        facts = []
        tasks = []
        technologies = []
        uncertainties = [
            {
                "area": "Analysis Method",
                "reason": "Generated using deterministic rule-based engine due to local model outage or timeout. Grounded strictly in verbatim artifact text.",
            }
        ]

        # 1. Detect verifiable technologies
        TECH_LIST = [
            "Python", "FastAPI", "React", "TypeScript", "JavaScript", "PostgreSQL",
            "Docker", "Kubernetes", "Redis", "Celery", "Next.js", "Tailwind CSS",
            "ChromaDB", "Ollama", "Git", "GitHub", "SQLAlchemy", "PyTorch", "AWS"
        ]
        for tech in TECH_LIST:
            if re.search(r"\b" + re.escape(tech.lower()) + r"\b", lower):
                technologies.append(tech)

        # 2. Extract genuine sentences as observed facts
        sentences = [s.strip() for s in re.split(r"[\n\.\?!]", text) if len(s.strip()) > 15]
        for s in sentences[:4]:
            facts.append({"fact": s[:200], "type": "artifact"})

        # 3. Tasks from genuine action verbs present in verbatim sentences (never fabricated)
        action_verbs = ["implemented", "built", "created", "refactored", "designed", "configured", "tested", "deployed", "completed"]
        for s in sentences:
            if any(w in s.lower() for w in action_verbs):
                tasks.append(s[:150])
            if len(tasks) >= 4:
                break

        if evidence.is_collaborative:
            uncertainties.append({
                "area": "Attribution",
                "reason": "Collaborative repository/artifact; specific line-level contribution requires verification."
            })

        # Honest confidence calculation: 0.70 only if multiple verifiable facts and tasks/techs exist
        has_demonstrable_work = len(facts) >= 1 and (len(tasks) > 0 or len(technologies) > 0 or bool(extracted_skills))
        confidence = 0.70 if has_demonstrable_work else 0.40

        # Inferred attributes: ONLY if supporting tasks exist
        inferred = []
        if tasks:
            inferred.append({
                "attribute": "Demonstrated technical task execution",
                "supported_by": f"{len(tasks)} observed technical task(s)"
            })

        claims = []
        if evidence.description and len(evidence.description.strip()) > 5:
            claims.append({
                "claim": evidence.description[:200],
                "source": "Artifact description"
            })

        summary = (
            f"Technical work artifact from {evidence.source_provider} demonstrating {len(technologies)} engineering tools."
            if technologies
            else f"Technical work artifact from {evidence.source_provider}."
        )

        return {
            "summary": summary,
            "role": "Author" if evidence.attribution_status == "author" else "Contributor",
            "observed_facts": facts or [{"fact": evidence.title, "type": "artifact"}],
            "claimed_information": claims,
            "inferred_attributes": inferred,
            "technical_tasks": tasks,
            "technologies": sorted(list(set(technologies))),
            "demonstrated_skills": extracted_skills or [],
            "uncertainty_flags": uncertainties,
            "confidence_score": confidence,
            "status": "completed" if has_demonstrable_work else "insufficient_evidence",
        }


work_analyzer = WorkAnalyzerService()
