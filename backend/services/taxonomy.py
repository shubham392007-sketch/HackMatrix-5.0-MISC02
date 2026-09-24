"""Skill Taxonomy Service: normalization, lookup, seeding, and unmapped tracking."""
import re
from typing import Any, Dict, List, Optional, Tuple
from backend.db.client import get_supabase_client
from backend.core.logging import get_logger

logger = get_logger("services.taxonomy")

# Known synonyms for canonical normalization
SYNONYM_MAP: Dict[str, str] = {
    "py": "Python",
    "python3": "Python",
    "js": "JavaScript",
    "ts": "TypeScript",
    "postgres": "PostgreSQL",
    "psql": "PostgreSQL",
    "fast-api": "FastAPI",
    "fast_api": "FastAPI",
    "k8s": "Kubernetes",
    "docker-compose": "Docker",
    "git-workflow": "Git",
    "unit-tests": "Unit Testing",
    "unittest": "Unit Testing",
    "ci-cd": "CI/CD",
    "cicd": "CI/CD",
    "rag": "RAG",
    "retrieval-augmented-generation": "RAG",
    "pandas": "Pandas",
    "numpy": "NumPy",
}

DEFAULT_SEED_TAXONOMY = [
    {
        "competency": "Backend Engineering & API Development",
        "description": "Designing, building, and maintaining server-side applications, REST APIs, and microservices.",
        "skills": [
            "Python", "FastAPI", "Django", "REST APIs", "Microservices",
            "SQLAlchemy", "Pydantic", "AsyncIO", "API Design", "Authentication"
        ]
    },
    {
        "competency": "Data Processing & Analytics",
        "description": "ETL pipelines, data transformation, vector indexing, and exploratory data analysis.",
        "skills": [
            "Pandas", "NumPy", "Data Cleaning", "Data Pipelines", "ETL",
            "ChromaDB", "Vector Embeddings", "RAG", "Data Modeling"
        ]
    },
    {
        "competency": "Database Systems & Storage",
        "description": "Relational and non-relational database design, query optimization, and schema migrations.",
        "skills": [
            "PostgreSQL", "Supabase", "SQL", "Database Migrations",
            "Database Indexing", "Connection Pooling", "Query Optimization"
        ]
    },
    {
        "competency": "DevOps & Cloud Infrastructure",
        "description": "Containerization, orchestration, automation, and continuous delivery.",
        "skills": [
            "Docker", "Kubernetes", "CI/CD", "Linux", "Environment Configuration",
            "Logging & Observability"
        ]
    },
    {
        "competency": "Quality Assurance & Testing",
        "description": "Automated testing, test-driven development, and defect troubleshooting.",
        "skills": [
            "Pytest", "Unit Testing", "Integration Testing", "Defect Debugging",
            "API Testing", "Test Automation"
        ]
    },
    {
        "competency": "Technical Communication & Collaboration",
        "description": "Project coordination, documentation, peer code review, and requirements tracing.",
        "skills": [
            "Git", "GitHub", "Jira", "Code Review", "Technical Documentation",
            "Requirements Analysis"
        ]
    }
]


class TaxonomyService:
    """Manages the competency and skill taxonomy in Supabase PostgreSQL."""

    def __init__(self):
        self.client = get_supabase_client()

    def seed_initial_taxonomy(self) -> Dict[str, int]:
        """Seeds standard competencies and skills into Supabase if empty."""
        comp_count = 0
        skill_count = 0

        for category in DEFAULT_SEED_TAXONOMY:
            comp_name = category["competency"]
            # Check or insert competency
            existing = self.client.table("competencies").select("id").eq("name", comp_name).execute()
            if existing.data:
                comp_id = existing.data[0]["id"]
            else:
                res = self.client.table("competencies").insert({
                    "name": comp_name,
                    "description": category["description"],
                }).execute()
                comp_id = res.data[0]["id"]
                comp_count += 1

            # Check or insert skills
            for skill_name in category["skills"]:
                sk_existing = self.client.table("skills").select("id").eq("name", skill_name).execute()
                if not sk_existing.data:
                    self.client.table("skills").insert({
                        "name": skill_name,
                        "competency_id": comp_id,
                        "description": f"{skill_name} skill under {comp_name}"
                    }).execute()
                    skill_count += 1

        logger.info(f"Seeded taxonomy: {comp_count} new competencies, {skill_count} new skills")
        return {"competencies_added": comp_count, "skills_added": skill_count}

    def normalize_skill_name(self, raw_name: str) -> str:
        """Normalizes skill name through canonical synonym mapping and title case."""
        cleaned = re.sub(r"[^\w\s-]", "", raw_name).strip()
        lower = cleaned.lower()
        if lower in SYNONYM_MAP:
            return SYNONYM_MAP[lower]
        return cleaned

    def resolve_skill(self, candidate_name: str, evidence_id: Optional[str] = None, confidence: float = 0.8) -> Tuple[Optional[str], Optional[str]]:
        """
        Attempts to match candidate skill against existing taxonomy.
        Returns: (skill_id, competency_id) if matched, or (None, None) if unmapped.
        If unmapped, records candidate into unmapped_skill_candidates table.
        """
        norm_name = self.normalize_skill_name(candidate_name)

        # 1. Exact match (case insensitive)
        res = self.client.table("skills").select("id, name, competency_id").ilike("name", norm_name).execute()
        if res.data:
            match = res.data[0]
            return match["id"], match["competency_id"]

        # 2. Record as unmapped candidate so no invalid competencies are hallucinated
        if evidence_id:
            try:
                self.client.table("unmapped_skill_candidates").insert({
                    "name": candidate_name,
                    "evidence_id": evidence_id,
                    "extraction_confidence": float(confidence),
                }).execute()
            except Exception as e:
                logger.warning(f"Could not record unmapped skill candidate '{candidate_name}': {e}")

        return None, None

    def resolve_competency(self, candidate_name: str) -> Optional[str]:
        """Matches a candidate competency against existing taxonomy (case insensitive)."""
        res = self.client.table("competencies").select("id").ilike("name", candidate_name.strip()).execute()
        if res.data:
            return res.data[0]["id"]
        # Partial match
        res_all = self.client.table("competencies").select("id, name").execute()
        cand_lower = candidate_name.lower()
        for comp in res_all.data or []:
            if comp["name"].lower() in cand_lower or cand_lower in comp["name"].lower():
                return comp["id"]
        return None

    def list_all_competencies(self) -> List[Dict[str, Any]]:
        """Returns all competencies."""
        res = self.client.table("competencies").select("*").order("name").execute()
        return res.data or []

    def list_skills_by_competency(self, competency_id: str) -> List[Dict[str, Any]]:
        """Returns skills linked to a competency."""
        res = self.client.table("skills").select("*").eq("competency_id", competency_id).order("name").execute()
        return res.data or []
