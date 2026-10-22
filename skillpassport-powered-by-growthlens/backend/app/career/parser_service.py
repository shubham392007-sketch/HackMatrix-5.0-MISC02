import re
import uuid
import hashlib
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
    Parses unstructured job description text into structured, versioned role competencies
    mapped against the Skill Intelligence canonical taxonomy.
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
    ) -> Dict[str, Any]:
        """
        Parses raw text, extracts requirements and source spans, and normalizes to taxonomy.
        """
        cleaned_text = (raw_text or "").strip()
        if len(cleaned_text) < 40:
            raise ValueError("Job description text is too short. Please provide at least 40 characters of job description.")

        # 1. Infer Title and Seniority if not provided
        inferred_title = title.strip() if title and title.strip() else self._infer_title(cleaned_text)
        inferred_seniority = seniority.strip() if seniority and seniority.strip() else self._infer_seniority(cleaned_text)
        inferred_context = context.strip() if context and context.strip() else "Engineering"

        # 2. Extract Responsibilities
        responsibilities = self._extract_responsibilities(cleaned_text)

        # 3. Load all active taxonomy competencies for canonical alignment
        taxonomy_items = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.status == "active").all()

        extracted_competencies = []
        seen_skill_names = set()

        # For each taxonomy item, search for mentions in the job text
        for comp in taxonomy_items:
            c_name = comp.canonical_name.strip()
            extra_synonyms = COMMON_TAXONOMY_SYNONYMS.get(c_name, [])
            aliases = [c_name] + [a.strip() for a in (comp.aliases or [])] + extra_synonyms

            matched_span = None
            for alias in aliases:
                # Word-boundary search
                pattern = r"(?i)\b" + re.escape(alias) + r"\b"
                match = re.search(pattern, cleaned_text)
                if match:
                    # Extract surrounding sentence or 120-char context window as source span
                    start = max(0, match.start() - 40)
                    end = min(len(cleaned_text), match.end() + 60)
                    matched_span = cleaned_text[start:end].strip()
                    break

            if matched_span and c_name.lower() not in seen_skill_names:
                seen_skill_names.add(c_name.lower())

                # Determine requirement type and importance from context clues
                is_core = bool(re.search(r"(?i)\b(must|required|requirement|minimum|essential|core)\b", matched_span))
                req_type = "core_required" if is_core else "supporting"
                importance = "critical" if is_core else "high"

                # Infer expected level from seniority
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

        # If zero taxonomy items matched, extract prominent keyword clusters as unmapped requirements
        if not extracted_competencies:
            extracted_competencies = self._fallback_keyword_extraction(cleaned_text, inferred_seniority)

        parse_id = f"parsed-{hashlib.sha256(cleaned_text[:100].encode()).hexdigest()[:12]}"

        return {
            "id": parse_id,
            "raw_text": cleaned_text,
            "job_title": inferred_title,
            "company_name": company.strip() if company else "Target Company",
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

    def _infer_title(self, text: str) -> str:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        for line in lines[:3]:
            if len(line) < 60 and re.search(r"(?i)\b(engineer|developer|architect|scientist|lead|manager|analyst)\b", line):
                return line
        return "Software Engineer"

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
            if re.search(r"(?i)\b" + re.escape(kw) + r"\b", text):
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
                    "source_span": f"Explicitly mentioned requirement for {kw}.",
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
