import re
import uuid
import hashlib
import json
import httpx
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from backend.app.core.logging import get_logger
from backend.app.models.taxonomy import CompetencyTaxonomy
from backend.app.models.career import RoleDemandModelRecord, JobPostingRecord

logger = get_logger("career.parser_service")

COMMON_TAXONOMY_SYNONYMS: Dict[str, List[str]] = {
    "Python Programming": ["Python", "Python3", "asyncio", "FastAPI", "Django", "Flask", "PyTorch"],
    "Cloud Infrastructure & DevOps": ["Cloud", "DevOps", "Docker", "Kubernetes", "AWS", "GCP", "CI/CD", "containerization"],
    "Relational Data Modeling & PostgreSQL": ["PostgreSQL", "SQL", "Postgres", "Relational Database", "MySQL"],
    "Distributed Systems & Event Streaming": ["Distributed Systems", "Kafka", "RabbitMQ", "Microservices", "Event Streaming"],
    "TypeScript & JavaScript Engineering": ["TypeScript", "JavaScript", "React", "Next.js", "Node.js"],
    "Application Security & DevSecOps": ["Security", "OAuth", "JWT", "DevSecOps", "Vulnerability", "auth"],
    "Version Control & Git Workflow Orchestration": ["Git", "GitHub", "GitLab", "CI/CD"],
    "Frontend Architecture & Modern Web": ["Frontend", "UI", "CSS", "Tailwind", "Responsive"],
}


class JobDescriptionParserService:
    """
    Parses unstructured job description text and API metadata into structured, versioned role competencies
    mapped against the Skill Intelligence canonical taxonomy.
    Employs local Ollama (qwen3:8b) for deep LLM-driven skill extraction, reasoning, and multi-tier
    classification, backed by deterministic keyword & taxonomy fallback.
    """

    PARSER_VERSION = "v2026.1"

    def parse_job_text(
        self,
        db: Session,
        raw_text: str,
        title: Optional[str] = None,
        company: Optional[str] = None,
        seniority: Optional[str] = None,
        context: Optional[str] = None,
        source_url: Optional[str] = None,
        location: Optional[str] = None,
        employment_type: Optional[str] = None,
        salary_min: Optional[float] = None,
        salary_max: Optional[float] = None,
        salary_currency: Optional[str] = None,
        raw_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Parses raw text and API metadata, extracts requirements and source spans,
        and normalizes to canonical taxonomy using local Ollama with deterministic fallback.
        """
        cleaned_text = (raw_text or "").strip()
        if len(cleaned_text) < 40:
            raise ValueError("Job description text is too short. Please provide at least 40 characters of job description.")

        # 1. Infer Title and Seniority if not provided
        inferred_title = (title or "").strip()
        if not inferred_title:
            inferred_title = self._infer_title(cleaned_text) or "Not specified in source"
        inferred_seniority = seniority.strip() if seniority and seniority.strip() else self._infer_seniority(cleaned_text)
        inferred_context = context.strip() if context and context.strip() else "Engineering"

        # 2. Extract Responsibilities
        responsibilities = self._extract_responsibilities(cleaned_text)

        # 3. Load all active taxonomy competencies for canonical alignment
        taxonomy_items = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.status == "active").all()

        # 4. Attempt LLM-driven extraction and classification via Ollama
        ollama_skills = self._extract_competencies_with_ollama(
            cleaned_text=cleaned_text,
            title=inferred_title,
            company=company,
            seniority=inferred_seniority,
            context=inferred_context,
            location=location,
            employment_type=employment_type,
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=salary_currency,
            raw_metadata=raw_metadata,
        )

        extracted_competencies = []
        if ollama_skills and len(ollama_skills) > 0:
            extracted_competencies = self._ground_and_deduplicate_competencies(
                raw_skills=ollama_skills,
                taxonomy_items=taxonomy_items,
                cleaned_text=cleaned_text,
                inferred_seniority=inferred_seniority,
            )
            logger.info(f"Ollama extracted and classified {len(extracted_competencies)} competencies for '{inferred_title}'")
        else:
            logger.info(f"Ollama extraction bypassed/empty; employing deterministic taxonomy fallback for '{inferred_title}'")
            extracted_competencies = self._extract_competencies_deterministic(
                cleaned_text=cleaned_text,
                taxonomy_items=taxonomy_items,
                inferred_seniority=inferred_seniority,
            )

        # 5. Fallback safety net if still zero competencies found
        if not extracted_competencies:
            extracted_competencies = self._fallback_keyword_extraction(cleaned_text, inferred_seniority)

        parse_id = f"parsed-{hashlib.sha256(cleaned_text[:100].encode()).hexdigest()[:12]}"

        return {
            "id": parse_id,
            "raw_text": cleaned_text,
            "job_title": inferred_title,
            "company_name": company.strip() if company and company.strip() else "Not specified in source",
            "seniority": inferred_seniority,
            "context": inferred_context,
            "source_url": source_url,
            "responsibilities": responsibilities,
            "extracted_competencies": extracted_competencies,
            "total_extracted": len(extracted_competencies),
            "parser_version": self.PARSER_VERSION,
            "parsed_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
        }

    def _extract_competencies_with_ollama(
        self,
        cleaned_text: str,
        title: str,
        company: Optional[str] = None,
        seniority: Optional[str] = None,
        context: Optional[str] = None,
        location: Optional[str] = None,
        employment_type: Optional[str] = None,
        salary_min: Optional[float] = None,
        salary_max: Optional[float] = None,
        salary_currency: Optional[str] = None,
        raw_metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Queries local Ollama (qwen3:8b) to think through the role, analyze the API metadata,
        and extract all technical, architectural, and operational competencies with classification.
        """
        try:
            from backend.app.core.config import get_settings
            settings = get_settings()
            ollama_url = getattr(settings, "ollama_base_url", "http://localhost:11434").rstrip("/")
            model = getattr(settings, "ollama_qwen_model", "qwen3:8b")
            timeout_sec = float(getattr(settings, "effective_assessment_timeout_seconds", getattr(settings, "ollama_timeout_seconds", 50.0)) or 50.0)
            if timeout_sec > 60.0:
                timeout_sec = 55.0  # Keep API latency bounded
        except Exception:
            ollama_url = "http://localhost:11434"
            model = "qwen3:8b"
            timeout_sec = 50.0

        # Construct comprehensive metadata block from API
        meta_lines = []
        if title:
            meta_lines.append(f"Role Title: {title}")
        if company:
            meta_lines.append(f"Company: {company}")
        if seniority:
            meta_lines.append(f"Seniority Tier: {seniority}")
        if context:
            meta_lines.append(f"Industry Context: {context}")
        if location:
            meta_lines.append(f"Location: {location}")
        if employment_type:
            meta_lines.append(f"Employment Type: {employment_type}")
        if salary_min or salary_max:
            sal_curr = salary_currency or "USD"
            meta_lines.append(f"Compensation: {salary_min or ''} - {salary_max or ''} {sal_curr}".strip())
        if raw_metadata and isinstance(raw_metadata, dict):
            tags = raw_metadata.get("tags") or raw_metadata.get("categories") or raw_metadata.get("skills")
            if tags:
                meta_lines.append(f"API Metadata Tags: {tags if isinstance(tags, str) else ', '.join(map(str, tags))}")

        metadata_block = "\n".join(meta_lines) if meta_lines else "None provided"

        # Truncate raw text safely to avoid unbounded context window
        text_sample = cleaned_text[:3500]

        prompt = (
            "You are an expert AI Career and Skills Intelligence Engine.\n"
            "Analyze the following job description and API metadata to extract ALL technical skills, tools, frameworks, and engineering competencies required or preferred for this role.\n\n"
            f"Job Metadata from API:\n{metadata_block}\n\n"
            f"Job Description Text:\n{text_sample}\n\n"
            "Identify 8 to 18 distinct competencies needed for this role. For each competency, classify:\n"
            "- canonical_name: Clean, standardized skill or technology title (e.g. 'Kubernetes', 'Python', 'MLflow', 'PostgreSQL', 'CI/CD Automation', 'Data Drift Monitoring')\n"
            "- category: Competency category (e.g. 'MLOps', 'Cloud Infrastructure', 'Programming', 'Data Engineering', 'System Architecture', 'DevSecOps', 'Backend Engineering', 'Frontend Engineering')\n"
            "- requirement_type: 'core_required' (if essential, must-have, or core responsibility) or 'supporting' (if preferred, nice-to-have, bonus, or secondary)\n"
            "- importance: 'critical', 'high', or 'medium'\n"
            "- expected_level: 'Foundation', 'Working', 'Practitioner', 'Advanced', or 'Expert'\n"
            "- expected_level_numeric: integer 1 to 5 corresponding to expected_level\n"
            "- evidence_expectation: brief phrase describing concrete practical artifact (under 10 words)\n"
            "- source_span: exact or close excerpt from the job description (under 12 words)\n\n"
            "Respond strictly with a JSON object format: {\"skills\": [ ... ]}"
        )

        try:
            with httpx.Client(timeout=timeout_sec) as client:
                resp = client.post(
                    f"{ollama_url}/api/chat",
                    json={
                        "model": model,
                        "think": False,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.1,
                            "num_ctx": 2048,
                            "num_predict": 850,
                        },
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    msg = data.get("message", {})
                    content = msg.get("content", "")
                    return self._parse_and_repair_json(content)
                else:
                    logger.warning(f"Ollama returned HTTP {resp.status_code}: {resp.text[:200]}")
                    return None
        except Exception as e:
            logger.debug(f"Ollama skills extraction call skipped ({e})")
            return None

    def _parse_and_repair_json(self, text: str) -> Optional[List[Dict[str, Any]]]:
        """
        Parses JSON output from Ollama with automatic truncation repair
        to salvage complete skill objects even if max tokens was reached.
        """
        if not text:
            return None
        c = text.strip()
        if "```json" in c:
            c = c.split("```json")[1].split("```")[0].strip()
        elif "```" in c:
            c = c.split("```")[1].split("```")[0].strip()

        # Try direct parse first
        try:
            data = json.loads(c)
            if isinstance(data, dict):
                return data.get("skills") or data.get("competencies") or []
            elif isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass

        # Robust repair for truncated JSON array of objects
        last_brace_idx = c.rfind("}")
        if last_brace_idx != -1:
            repaired = c[:last_brace_idx + 1]
            open_brackets = repaired.count("[") - repaired.count("]")
            open_braces = repaired.count("{") - repaired.count("}")
            for _ in range(open_brackets):
                repaired += "\n]"
            for _ in range(open_braces):
                repaired += "\n}"
            try:
                data = json.loads(repaired)
                if isinstance(data, dict):
                    return data.get("skills") or data.get("competencies") or []
                elif isinstance(data, list):
                    return data
            except Exception as e:
                logger.debug(f"JSON repair attempt failed: {e}")
        return None

    def _ground_and_deduplicate_competencies(
        self,
        raw_skills: List[Dict[str, Any]],
        taxonomy_items: List[CompetencyTaxonomy],
        cleaned_text: str,
        inferred_seniority: str,
    ) -> List[Dict[str, Any]]:
        """
        Grounds LLM-extracted competencies against the active CompetencyTaxonomy database.
        Ensures each distinct skill has a clean, unique slug and classification,
        binding to canonical_skill_id where matches exist and synthesizing clean entries for new skills.
        """
        grounded = []
        seen_names = set()

        for item in raw_skills:
            if not isinstance(item, dict):
                continue
            s_name = (item.get("canonical_name") or item.get("name") or "").strip()
            if not s_name or s_name.lower() in seen_names:
                continue
            seen_names.add(s_name.lower())

            # Attempt matching against active database taxonomy
            matched_db_comp = None
            for comp in taxonomy_items:
                c_name = comp.canonical_name.strip()
                aliases = [c_name] + [a.strip() for a in (comp.aliases or [])] + COMMON_TAXONOMY_SYNONYMS.get(c_name, [])
                for alias in aliases:
                    if s_name.lower() == alias.lower() or s_name.lower() in alias.lower() or alias.lower() in s_name.lower():
                        matched_db_comp = comp
                        break
                if matched_db_comp:
                    break

            # Requirement type normalization
            req_type = item.get("requirement_type", "core_required")
            if req_type not in ("core_required", "supporting"):
                req_type = "core_required" if "core" in str(req_type).lower() or "must" in str(req_type).lower() else "supporting"

            # Importance normalization
            importance = item.get("importance", "high")
            if importance not in ("critical", "high", "medium"):
                importance = "critical" if req_type == "core_required" else "high"

            # Expected level normalization
            exp_level = item.get("expected_level")
            valid_levels = ("Foundation", "Working", "Practitioner", "Advanced", "Expert")
            if exp_level not in valid_levels:
                if "Senior" in inferred_seniority or "Lead" in inferred_seniority:
                    exp_level = "Advanced"
                elif "Entry" in inferred_seniority:
                    exp_level = "Foundation"
                else:
                    exp_level = "Practitioner"

            exp_num = item.get("expected_level_numeric")
            level_map = {"Foundation": 1, "Working": 2, "Practitioner": 3, "Advanced": 4, "Expert": 5}
            if not isinstance(exp_num, int) or not (1 <= exp_num <= 5):
                exp_num = level_map.get(exp_level, 3)

            # Source span preservation
            source_span = (item.get("source_span") or "").strip()
            if not source_span or len(source_span) < 5:
                # Find occurrence in cleaned text
                m = re.search(r"(?i)\b" + re.escape(s_name) + r"\b", cleaned_text)
                if m:
                    st = max(0, m.start() - 30)
                    en = min(len(cleaned_text), m.end() + 50)
                    source_span = cleaned_text[st:en].strip()
                else:
                    source_span = f"Requirement derived from {s_name} in job description."

            slug = re.sub(r"[^\w-]", "", s_name.lower().replace(" ", "-"))[:35]
            category = item.get("category") or (matched_db_comp.category if matched_db_comp else "Software Engineering")

            grounded.append({
                "skill_id": f"skill-{slug}",
                "canonical_skill_id": str(matched_db_comp.id) if matched_db_comp else None,
                "original_label": s_name,
                "canonical_name": s_name,
                "category": category,
                "requirement_type": req_type,
                "importance": importance,
                "expected_level": exp_level,
                "expected_level_numeric": exp_num,
                "evidence_expectation": item.get("evidence_expectation") or f"Production code, pull requests, or architecture design demonstrating {s_name}.",
                "source_span": source_span,
                "status": "mapped",
            })

        # Also merge any active taxonomy items mentioned directly in the text that Ollama missed
        for comp in taxonomy_items:
            c_name = comp.canonical_name.strip()
            if c_name.lower() in seen_names:
                continue

            extra_synonyms = COMMON_TAXONOMY_SYNONYMS.get(c_name, [])
            aliases = [c_name] + [a.strip() for a in (comp.aliases or [])] + extra_synonyms

            matched_span = None
            for alias in aliases:
                pattern = r"(?i)\b" + re.escape(alias) + r"\b"
                match = re.search(pattern, cleaned_text)
                if match:
                    st = max(0, match.start() - 40)
                    en = min(len(cleaned_text), match.end() + 60)
                    matched_span = cleaned_text[st:en].strip()
                    break

            if matched_span:
                seen_names.add(c_name.lower())
                is_core = bool(re.search(r"(?i)\b(must|required|requirement|minimum|essential|core)\b", matched_span))
                req_type = "core_required" if is_core else "supporting"
                importance = "critical" if is_core else "high"

                if inferred_seniority in ("Senior Level", "Staff / Lead"):
                    expected_level = "Advanced"
                    expected_numeric = 4
                elif inferred_seniority == "Entry Level":
                    expected_level = "Foundation"
                    expected_numeric = 1
                else:
                    expected_level = "Practitioner"
                    expected_numeric = 3

                grounded.append({
                    "skill_id": f"skill-{c_name.lower().replace(' ', '-')}",
                    "canonical_skill_id": str(comp.id),
                    "original_label": c_name,
                    "canonical_name": c_name,
                    "category": comp.category,
                    "requirement_type": req_type,
                    "importance": importance,
                    "expected_level": expected_level,
                    "expected_level_numeric": expected_numeric,
                    "evidence_expectation": f"Production code, pull requests, or architecture design demonstrating {c_name}.",
                    "source_span": matched_span,
                    "status": "mapped",
                })

        return grounded

    def _extract_competencies_deterministic(
        self,
        cleaned_text: str,
        taxonomy_items: List[CompetencyTaxonomy],
        inferred_seniority: str,
    ) -> List[Dict[str, Any]]:
        """
        Deterministic regex and database taxonomy matching fallback when Ollama is offline or slow.
        """
        extracted_competencies = []
        seen_skill_names = set()

        for comp in taxonomy_items:
            c_name = comp.canonical_name.strip()
            extra_synonyms = COMMON_TAXONOMY_SYNONYMS.get(c_name, [])
            aliases = [c_name] + [a.strip() for a in (comp.aliases or [])] + extra_synonyms

            matched_span = None
            for alias in aliases:
                pattern = r"(?i)\b" + re.escape(alias) + r"\b"
                match = re.search(pattern, cleaned_text)
                if match:
                    start = max(0, match.start() - 40)
                    end = min(len(cleaned_text), match.end() + 60)
                    matched_span = cleaned_text[start:end].strip()
                    break

            if matched_span and c_name.lower() not in seen_skill_names:
                seen_skill_names.add(c_name.lower())

                is_core = bool(re.search(r"(?i)\b(must|required|requirement|minimum|essential|core)\b", matched_span))
                req_type = "core_required" if is_core else "supporting"
                importance = "critical" if is_core else "high"

                if inferred_seniority in ("Senior Level", "Staff / Lead"):
                    expected_level = "Advanced"
                    expected_numeric = 4
                elif inferred_seniority == "Entry Level":
                    expected_level = "Foundation"
                    expected_numeric = 1
                else:
                    expected_level = "Practitioner"
                    expected_numeric = 3

                extracted_competencies.append({
                    "skill_id": f"skill-{c_name.lower().replace(' ', '-')}",
                    "canonical_skill_id": str(comp.id),
                    "original_label": c_name,
                    "canonical_name": c_name,
                    "category": comp.category,
                    "requirement_type": req_type,
                    "importance": importance,
                    "expected_level": expected_level,
                    "expected_level_numeric": expected_numeric,
                    "evidence_expectation": f"Production code, pull requests, or architecture design demonstrating {c_name}.",
                    "source_span": matched_span,
                    "status": "mapped",
                })

        return extracted_competencies

    def _infer_title(self, text: str) -> Optional[str]:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        for line in lines[:5]:
            if 4 <= len(line) <= 60 and re.search(r"(?i)\b(engineer|developer|architect|scientist|lead|manager|analyst|specialist|consultant|administrator|researcher|designer|coordinator|auditor)\b", line):
                cleaned = re.sub(r"(?i)^(role|title|position|job\s*title)\s*[:\-]\s*", "", line).strip()
                if cleaned:
                    return cleaned
        return None

    def _infer_seniority(self, text: str) -> str:
        t_lower = text.lower()
        if "staff" in t_lower or "principal" in t_lower or "lead" in t_lower or "architect" in t_lower:
            return "Staff / Lead"
        if "senior" in t_lower or "sr." in t_lower or "5+ years" in t_lower or "7+ years" in t_lower:
            return "Senior Level"
        if "junior" in t_lower or "entry" in t_lower or "intern" in t_lower or "new grad" in t_lower:
            return "Entry Level"
        return "Mid Level"

    def _extract_responsibilities(self, text: str) -> List[str]:
        responsibilities = []
        # Find bullet points
        bullet_matches = re.findall(r"(?:^|\n)\s*[-•*]\s*(.+)", text)
        for b in bullet_matches:
            b_clean = b.strip()
            if 15 <= len(b_clean) <= 150:
                responsibilities.append(b_clean)
            if len(responsibilities) >= 5:
                break
        if not responsibilities:
            responsibilities = [
                "Design and maintain scalable technical infrastructure and microservices.",
                "Collaborate with product and engineering stakeholders to deliver mission-critical features.",
                "Review code changes, maintain rigorous testing standards, and optimize latency.",
            ]
        return responsibilities

    def _fallback_keyword_extraction(self, text: str, seniority: str) -> List[Dict[str, Any]]:
        tech_keywords = [
            ("Python", "Programming"),
            ("FastAPI", "Backend Engineering"),
            ("PostgreSQL", "Database Architecture"),
            ("Docker", "Containerization"),
            ("Kubernetes", "Cloud Infrastructure"),
            ("React", "Frontend Engineering"),
            ("TypeScript", "Programming"),
            ("Machine Learning", "AI & Machine Learning"),
            ("System Architecture", "System Design"),
            ("REST API", "Software Engineering"),
        ]
        results = []
        for kw, cat in tech_keywords:
            pattern = r"(?i)\b" + re.escape(kw) + r"\b"
            match = re.search(pattern, text)
            if match:
                start = max(0, match.start() - 40)
                end = min(len(text), match.end() + 60)
                matched_span = text[start:end].strip()
                results.append({
                    "skill_id": f"skill-{kw.lower().replace(' ', '-')}",
                    "canonical_skill_id": None,
                    "original_label": kw,
                    "canonical_name": kw,
                    "category": cat,
                    "requirement_type": "core_required",
                    "importance": "high",
                    "expected_level": "Advanced" if "Senior" in seniority else "Practitioner",
                    "expected_level_numeric": 4 if "Senior" in seniority else 3,
                    "evidence_expectation": f"Demonstrated engineering experience with {kw}.",
                    "source_span": matched_span,
                    "status": "mapped",
                })
        return results

    def save_custom_role_model(
        self,
        db: Session,
        user_id: uuid.UUID,
        parsed_data: Dict[str, Any],
    ) -> RoleDemandModelRecord:
        """
        Persists a reviewed custom role model without mutating the global curated catalogue.
        """
        title = parsed_data.get("job_title", "Custom Technical Role")
        role_slug = re.sub(r"[^\w-]", "", title.lower().replace(" ", "-"))[:30]
        role_id = f"role-custom-{role_slug}-{str(uuid.uuid4())[:8]}"
        version = f"v{datetime.now(timezone.utc).strftime('%Y%m%d')}.1"

        new_role = RoleDemandModelRecord(
            role_id=role_id,
            version=version,
            title=title,
            seniority=parsed_data.get("seniority", "Mid Level"),
            context=parsed_data.get("context", "Custom Opportunity"),
            description=f"Custom role model derived from job description for {parsed_data.get('company_name', 'Target Employer')}.",
            provenance=f"User-parsed job description ({parsed_data.get('company_name', 'External')}) via {self.PARSER_VERSION}",
            source_type="custom_parsed_job",
            owner_user_id=user_id,
            competencies=parsed_data.get("extracted_competencies", []),
            is_active=True,
        )
        db.add(new_role)
        db.commit()
        db.refresh(new_role)
        logger.info(f"Saved custom role demand model: {role_id} [v{version}] for user {user_id}")
        return new_role


parser_service = JobDescriptionParserService()
