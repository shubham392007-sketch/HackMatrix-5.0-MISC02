import json
import re
import uuid
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.taxonomy import CompetencyTaxonomy
from backend.app.core.logging import get_logger

logger = get_logger("ai.extractor")

SYSTEM_EXTRACTION_PROMPT = """You are the SkillPassport Evidence Extraction Engine.
Analyze the following professional work artifact (code, PR, commit, document, credential, certificate, or portfolio project) and extract structured skills, competencies, and work context.

CRITICAL GROUNDING RULES:
1. Grounding in Verbatim Evidence: Every candidate competency must be directly and concretely substantiated by specific actions, technologies, credentials, or verifiable statements in the source text.
2. Zero Hallucination: Never invent or assume competencies. If the text does not substantiate any competencies, return an empty "competencies": [] array.
3. Names & Identity Guard: A person's name alone is NOT evidence of a competency. However, for course completion certificates, accreditations, and certifications, the specific subject or course title (e.g., 'Sora AI', 'Project Management', 'Android App Development', 'Databricks Generative AI') represents the candidate competency taught and completed.
4. Verbatim Justification: The "justification" field MUST be an exact sentence or quote directly present in the source text showing where the competency is demonstrated.
5. If text is insufficient or empty: return "competencies": [] and "evidence_strength": "insufficient".
6. Output ONLY a valid JSON object matching the exact schema below, with NO markdown backticks or commentary.

Schema:
{
  "summary": "Brief 1-2 sentence executive summary of work or credential demonstrated",
  "evidence_strength": "high" | "medium" | "low" | "insufficient",
  "work_context": {
    "role": "e.g. Lead Developer, Contributor, Recipient, Certified Professional",
    "technologies": ["list", "of", "technologies", "used"],
    "impact": "Concrete outcome, course completion, or scope of contribution"
  },
  "competencies": [
    {
      "name": "Standardized skill/competency name",
      "category": "AI Engineering" | "Backend Engineering" | "Frontend Engineering" | "System Architecture" | "Data Engineering" | "Quality Engineering" | "DevOps & Cloud" | "Project Governance" | "Mobile Engineering" | "Security Engineering" | "General Engineering",
      "confidence_score": 0.85,
      "demonstration_level": "foundational" | "intermediate" | "advanced" | "expert",
      "justification": "Verbatim quote from source text that proves this skill"
    }
  ]
}
"""

# Fallback taxonomy keyword mappings for rule-based matching
TAXONOMY_KEYWORD_MAP = {
    "API Architecture & Design": {
        "keywords": ["api", "rest", "restful", "graphql", "endpoint", "endpoints", "fastapi", "swagger", "openapi", "grpc", "postman", "route", "routing", "controller"],
        "category": "Backend Engineering",
    },
    "Distributed Systems & Event Streaming": {
        "keywords": ["distributed", "kafka", "event", "events", "microservice", "microservices", "rabbitmq", "pubsub", "cluster", "concurrency", "asyncio", "celery", "queue", "worker", "redis"],
        "category": "System Architecture",
    },
    "Relational Data Modeling & PostgreSQL": {
        "keywords": ["postgres", "postgresql", "sql", "index", "indexing", "query", "queries", "database", "orm", "alembic", "migration", "migrations", "sqlalchemy", "relational", "schema"],
        "category": "Data Engineering",
    },
    "Vector Retrieval & Semantic Indexing": {
        "keywords": ["vector", "chromadb", "embeddings", "embedding", "rag", "retrieval", "semantic", "indexing", "nomic", "similarity", "cosine", "faiss", "pinecone"],
        "category": "AI Engineering",
    },
    "Document Parsing & Optical Character Recognition": {
        "keywords": ["document", "pdf", "pymupdf", "fitz", "ocr", "parsing", "docx", "pptx", "trafilatura", "extractor", "chunking", "text extraction"],
        "category": "Document Intelligence",
    },
    "Version Control & Git Workflow Orchestration": {
        "keywords": ["git", "github", "commit", "commits", "pull request", "pull requests", "merge", "branch", "branches", "repository", "code review", "feat(", "fix(", "chore(", "refactor("],
        "category": "Engineering Practices",
    },
    "Agile Project & Work Tracking": {
        "keywords": ["jira", "sprint", "sprints", "backlog", "scrum", "kanban", "agile", "user story", "story point", "burndown"],
        "category": "Project Governance",
    },
    "LLM Structured Extraction & Prompt Engineering": {
        "keywords": ["llm", "prompt", "qwen", "ollama", "gpt", "model", "temperature", "tokens", "structured extraction", "hallucination", "inference"],
        "category": "AI Engineering",
    },
    "Cloud Infrastructure & DevOps": {
        "keywords": ["docker", "kubernetes", "k8s", "aws", "cloud", "ci/cd", "pipeline", "pipelines", "terraform", "github actions", "deploy", "deployment", "linux", "container", "containerization"],
        "category": "DevOps & Cloud",
    },
    "Frontend Architecture & Modern Web": {
        "keywords": ["react", "next.js", "nextjs", "tailwind", "typescript", "javascript", "frontend", "ui", "ux", "component", "components", "css", "html", "web", "what-if simulator", "risk gauge", "dashboard", "simulator"],
        "category": "Frontend Engineering",
    },
    "Application Security & DevSecOps": {
        "keywords": ["security", "auth", "jwt", "encryption", "fernet", "ssrf", "vulnerability", "security audit", "auth token", "security tokens", "rbac", "permissions"],
        "category": "Security Engineering",
    },
    "Technical Leadership & Mentorship": {
        "keywords": ["lead", "led", "architect", "architected", "review", "reviewed", "mentor", "mentored", "design document", "roadmap", "strategy", "rfc", "specification"],
        "category": "Leadership & Strategy",
    },
    "Artificial Intelligence Foundations & Frameworks": {
        "keywords": [
            "ai fluency",
            "ai framework",
            "ai frameworks",
            "anthropic",
            "artificial intelligence",
            "foundation models",
            "generative ai",
            "deep learning",
            "machine learning",
            "sora",
            "sora ai",
            "openai",
            "video generation",
            "diffusion models",
            "ai for beginners",
            "llm",
            "large language models",
        ],
        "category": "AI Engineering",
    },
    "Mobile Application Distribution & Store Publishing": {
        "keywords": ["google play", "play store", "app store", "store listing", "android deployment", "play console", "app distribution", "mobile release", "testflight", "play store listing"],
        "category": "Mobile & Release Engineering",
    },
    "Data Science & Analytics Practices": {
        "keywords": ["data science", "data science & analytics", "analytics practices", "data-driven approach", "business analytics", "data analytics", "statistical analysis", "statistical modeling", "weibull", "survival model", "survival analysis", "decay risk", "risk gauge", "simulator", "what-if simulator", "simulation", "predictive modeling"],
        "category": "Data Engineering",
    },
    "Software Quality Assurance & Automated Testing": {
        "keywords": ["automated tests", "passing tests", "passing automated tests", "unit test", "unit tests", "integration test", "integration tests", "test suite", "test suites", "testing", "test coverage", "pytest", "jest", "cypress", "playwright", "regression test", "test cases"],
        "category": "Quality Engineering",
    },
    "Technical Project Management & Delivery": {
        "keywords": [
            "project management",
            "project management 101",
            "project manager",
            "pmp",
            "prince2",
            "simplilearn project management",
            "agile delivery",
            "project lifecycle",
            "scrum",
            "kanban",
            "sprint planning",
            "risk management",
            "scope management",
            "stakeholder management",
            "project planning",
            "work breakdown structure",
            "milestone tracking",
        ],
        "category": "Project Governance",
    },
    "Data Structures & Algorithms": {
        "keywords": [
            "dsa",
            "algorithm",
            "algorithms",
            "data structure",
            "data structures",
            "binary search",
            "tree",
            "trees",
            "binary tree",
            "graph",
            "graphs",
            "dynamic programming",
            "dp",
            "time complexity",
            "space complexity",
            "complexity",
            "big-o",
            "sorting",
            "quicksort",
            "mergesort",
            "linked list",
            "stack",
            "queue",
            "heap",
            "recursion",
            "backtracking",
            "buy and sell",
            "two sum",
            "leetcode",
            "sliding window",
            "hash table",
            "hash map",
        ],
        "category": "Backend Engineering",
    },
    "C++ Systems Development": {
        "keywords": [
            "c++",
            "cpp",
            "cxx",
            "stl",
            "pointer",
            "pointers",
            "template",
            "templates",
            "vector<",
            "std::",
            "valgrind",
            "cmake",
            "gcc",
            "clang",
            "memory management",
        ],
        "category": "Backend Engineering",
    },
    "Python Programming": {
        "keywords": [
            "python",
            "pytest",
            "pip",
            "venv",
            "pandas",
            "numpy",
            "matplotlib",
            "scikit",
            "flask",
            "django",
            "asyncio",
            "python3",
        ],
        "category": "Backend Engineering",
    },
    "Java & JVM Engineering": {
        "keywords": [
            "java",
            "jvm",
            "spring",
            "spring boot",
            "maven",
            "gradle",
            "hibernate",
            "junit",
            "jdk",
        ],
        "category": "Backend Engineering",
    },
    "Algorithmic Problem Solving & Optimization": {
        "keywords": [
            "space and time complexity",
            "time complexity",
            "space complexity",
            "algorithmic",
            "leetcode",
            "complexity analysis",
            "runtime analysis",
            "optimization problem",
            "buy and sell",
        ],
        "category": "Engineering Practices",
    },
    "TypeScript & JavaScript Engineering": {
        "keywords": [
            "typescript",
            "javascript",
            "node.js",
            "nodejs",
            "npm",
            "yarn",
            "pnpm",
            "es6",
            "async/await",
        ],
        "category": "Frontend Engineering",
    },
}


def is_insufficient_or_identity_only(text: str) -> bool:
    """
    Checks whether the extracted text is too sparse, only contains a person's name/identity,
    is placeholder text, or is a transaction receipt/invoice that cannot substantiate any competencies.
    """
    if not text:
        return True
    cleaned = text.strip()
    words = cleaned.split()
    if len(words) < 4:
        return True
    # If the text only consists of 1-3 capitalized name words (e.g. 'Shubham Pokale')
    if len(words) <= 3 and all(w.replace(".", "").isalpha() for w in words):
        return True
    # Placeholder strings like "[Page 1: Image/Diagram Content..."
    if cleaned.startswith("[Page") and "embedded image(s)]" in cleaned and len(words) <= 12:
        return True
    # Payment receipt / invoice check (contains invoice/order #/paid in full without any technical context)
    lower = cleaned.lower()
    if any(k in lower for k in ["invoice receipt", "order receipt", "payment receipt", "receipt:", "order #", "paid in full"]) and not any(
        tech in lower for tech in ["software", "engineering", "developer", "architecture", "algorithm", "python", "javascript", "cloud", "framework", "certif"]
    ):
        return True
    return False


def validate_and_filter_competencies(competencies: List[Dict[str, Any]], source_text: str) -> List[Dict[str, Any]]:
    """
    Validates each candidate competency against the source text.
    Rejects any competency whose justification does not appear in the source text,
    is only a person's name, or is generic fallback text.
    """
    if not source_text or not competencies:
        return []

    clean_source = source_text.lower()
    valid_competencies = []

    for comp in competencies:
        name = comp.get("name", "").strip()
        justification = comp.get("justification", "").strip()

        # 1. Reject generic fallback names
        if name.lower() in [
            "general engineering & problem solving",
            "general engineering",
            "problem solving",
            "unknown",
        ]:
            logger.warning(f"Rejecting generic fallback competency '{name}'")
            continue

        # 2. Reject if justification is empty or only a name
        if is_insufficient_or_identity_only(justification):
            logger.warning(f"Rejecting competency '{name}': justification is empty or name-only ('{justification}')")
            continue

        # 3. Check if justification (or substantial part of it) exists in source text
        just_lower = justification.lower()
        clean_just = re.sub(r"[^\w\s]", "", just_lower).strip()
        clean_src = re.sub(r"[^\w\s]", "", clean_source).strip()

        just_words = [w for w in clean_just.split() if len(w) > 3]
        if just_words:
            matching_words = sum(1 for w in just_words if w in clean_src)
            match_ratio = matching_words / len(just_words)
            if match_ratio < 0.6:
                logger.warning(f"Rejecting candidate competency '{name}': justification not substantiated in source text")
                continue
        elif clean_just not in clean_src:
            logger.warning(f"Rejecting candidate competency '{name}': justification not found in source text")
            continue

        valid_competencies.append(comp)

    return valid_competencies


class EvidenceExtractorAI:
    def __init__(self):
        self.settings = get_settings()
        self.ollama_url = self.settings.ollama_base_url.rstrip("/")
        self.model = self.settings.ollama_qwen_model

    async def extract_structured_evidence(
        self,
        text_content: str,
        source_provider: str = "document",
        db: Optional[Session] = None,
        source_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Sends excerpt to local Ollama (qwen3:8b) for structured extraction.
        Falls back to rule-based taxonomy mapping if Ollama is unavailable or times out.
        Guarantees zero fabrication: if text is empty, name-only, or insufficient,
        returns 0 candidate competencies with insufficient evidence strength.
        """
        # Guard: If text is insufficient or name-only, do not extract fake skills
        if is_insufficient_or_identity_only(text_content):
            logger.info("Content deemed insufficient or identity-only; returning 0 candidate competencies.")
            return {
                "summary": "Document contains insufficient text to identify candidate competencies.",
                "evidence_strength": "insufficient",
                "extraction_quality": "insufficient_content",
                "quality_reason": "Source text contains only recipient identity or minimal words without demonstrable competency context.",
                "work_context": {
                    "role": "Recipient",
                    "technologies": [],
                    "impact": "Insufficient text content",
                },
                "competencies": [],
            }

        prompt_parts = [f"Source Provider: {source_provider}"]
        if source_metadata and source_metadata.get("repository_languages"):
            langs_str = ", ".join([
                f"{l['name']} ({l.get('percentage', 0)}%)"
                for l in source_metadata["repository_languages"][:5]
            ])
            prompt_parts.append(
                f"Repository Context Languages: {langs_str}\n"
                "(Note: Repository languages indicate code environment composition, NOT individual contributor proficiency. "
                "Only propose candidate competencies that are genuinely demonstrated by the content below.)"
            )

        ctx_tokens = getattr(self.settings, "ollama_num_ctx", 16384)
        max_content_chars = int(ctx_tokens * 2.8)
        content_to_send = text_content
        if len(content_to_send) > max_content_chars:
            content_to_send = (
                text_content[:max_content_chars]
                + f"\n\n[Notice: Source text exceeded context budget ({len(text_content)} chars) and was deterministically truncated to {max_content_chars} characters for {self.model} with {ctx_tokens} token context]"
            )

        prompt_parts.append(f"\nContent:\n{content_to_send}")
        prompt_text = "\n".join(prompt_parts)

        extracted_data = None
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_EXTRACTION_PROMPT},
                            {"role": "user", "content": prompt_text},
                        ],
                        "format": "json",
                        "stream": False,
                        "think": False,
                        "options": {
                            "temperature": 0.0,
                            "num_predict": 2048,
                            "num_ctx": ctx_tokens,
                        },
                    },
                )
                if resp.status_code == 200:
                    msg = resp.json().get("message", {})
                    raw_content = msg.get("content", "") or msg.get("thinking", "")
                    cleaned = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
                    cleaned = re.sub(r"^```json\s*", "", cleaned)
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
                    if match:
                        json_str = match.group(0)
                        try:
                            extracted_data = json.loads(json_str)
                        except json.JSONDecodeError:
                            sanitized = re.sub(r",\s*([\]}])", r"\1", json_str)
                            extracted_data = json.loads(sanitized)
                        logger.info(f"Ollama structured extraction succeeded using {self.model}: {len(extracted_data.get('competencies', []))} competencies proposed")
                else:
                    logger.warning(f"Ollama extraction request returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"Ollama LLM extraction error ({e}). Using deterministic fallback.")

        if not extracted_data:
            extracted_data = self._rule_based_extraction(text_content, source_provider, source_metadata)

        # Strictly validate and filter competencies against source text
        raw_comps = extracted_data.get("competencies") or []
        valid_comps = validate_and_filter_competencies(raw_comps, text_content)
        extracted_data["competencies"] = valid_comps

        if not valid_comps:
            extracted_data["evidence_strength"] = "insufficient"
            if not extracted_data.get("summary") or "demonstrating" in extracted_data.get("summary", "").lower():
                extracted_data["summary"] = "Source content contained insufficient evidence to substantiate candidate competencies."

        # Align extracted competencies against database canonical taxonomy
        if db and valid_comps:
            extracted_data = self._align_with_taxonomy(extracted_data, db)

        return extracted_data

    def _rule_based_extraction(
        self,
        text: str,
        source_provider: str,
        source_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Deterministic keyword-based evidence extractor fallback."""
        if is_insufficient_or_identity_only(text):
            return {
                "summary": "Document contains insufficient text to identify candidate competencies.",
                "evidence_strength": "insufficient",
                "work_context": {
                    "role": "Recipient",
                    "technologies": [],
                    "impact": "Insufficient text content",
                },
                "competencies": [],
            }

        lower_text = text.lower()
        sentences = [s.strip() for s in re.split(r"[\n\.\?!]", text) if len(s.strip()) > 8]
        matched_comps = []
        techs = set()

        for canonical_name, meta in TAXONOMY_KEYWORD_MAP.items():
            keywords = meta["keywords"]
            category = meta["category"]
            matches = [k for k in keywords if re.search(r"\b" + re.escape(k) + r"\b", lower_text)]
            if matches:
                techs.update(matches)
                confidence = min(0.70 + (len(matches) * 0.06), 0.95)

                # Locate verbatim sentence as justification
                verbatim_sentence = None
                for sent in sentences:
                    sent_lower = sent.lower()
                    if any(k in sent_lower for k in matches):
                        if not is_insufficient_or_identity_only(sent):
                            verbatim_sentence = sent[:250].strip()
                            break

                if not verbatim_sentence:
                    for m_word in matches:
                        pos = lower_text.find(m_word)
                        if pos != -1:
                            start_p = max(0, pos - 40)
                            end_p = min(len(text), pos + len(m_word) + 80)
                            cand = text[start_p:end_p].strip()
                            if not is_insufficient_or_identity_only(cand):
                                verbatim_sentence = cand
                                break

                if not verbatim_sentence:
                    verbatim_sentence = text[:150].strip()

                justification = verbatim_sentence

                matched_comps.append({
                    "name": canonical_name,
                    "category": category,
                    "confidence_score": round(confidence, 2),
                    "demonstration_level": "advanced" if len(matches) >= 3 else "intermediate",
                    "justification": justification,
                })

        # CRITICAL: Never inject General Engineering fallback when 0 skills match!
        if not matched_comps:
            return {
                "summary": "Source content contained insufficient evidence to substantiate candidate competencies.",
                "evidence_strength": "insufficient",
                "work_context": {
                    "role": "Contributor",
                    "technologies": [],
                    "impact": "Insufficient evidence detected",
                },
                "competencies": [],
            }

        return {
            "summary": f"Artifact from {source_provider} demonstrating technical capability.",
            "evidence_strength": "high" if len(matched_comps) >= 2 else "medium",
            "work_context": {
                "role": "Engineer / Contributor",
                "technologies": sorted(list(techs))[:10],
                "impact": f"Verified implementation across {len(matched_comps)} competency domains",
            },
            "competencies": matched_comps,
        }

    def _align_with_taxonomy(self, data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Cross-references extracted competencies with canonical taxonomy table."""
        try:
            canonical_records = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.status == "active").all()
            name_map = {c.canonical_name.lower(): str(c.id) for c in canonical_records}
            category_map = {c.canonical_name.lower(): c.category for c in canonical_records}

            for comp in data.get("competencies", []):
                comp_name = comp.get("name", "").strip()
                comp_lower = comp_name.lower()
                # Direct match
                matched_id = name_map.get(comp_lower)
                if not matched_id:
                    # Partial match
                    for c_name, c_id in name_map.items():
                        if c_name in comp_lower or comp_lower in c_name:
                            matched_id = c_id
                            comp["category"] = category_map[c_name]
                            break

                # If completely new canonical competency, register it
                if not matched_id and comp_name:
                    new_tax = CompetencyTaxonomy(
                        id=uuid.uuid4(),
                        canonical_name=comp_name,
                        normalized_name=comp_lower,
                        category=comp.get("category", "General Engineering"),
                        description=f"Candidate competency: {comp_name}",
                        status="active",
                        taxonomy_version="v1.0",
                    )
                    db.add(new_tax)
                    db.flush()
                    matched_id = str(new_tax.id)
                    name_map[comp_lower] = matched_id

                comp["canonical_taxonomy_id"] = matched_id
        except Exception as e:
            logger.warning(f"Taxonomy alignment error: {e}")

        return data


ai_extractor = EvidenceExtractorAI()
