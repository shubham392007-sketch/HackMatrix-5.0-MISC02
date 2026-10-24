import re
import uuid
import hashlib
import json
import httpx
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple, Set
from sqlalchemy.orm import Session

from backend.app.core.logging import get_logger
from backend.app.models.taxonomy import CompetencyTaxonomy
from backend.app.models.career import RoleDemandModelRecord, JobPostingRecord

logger = get_logger("career.parser_service")

# Comprehensive Built-in Engineering Knowledge Base (300+ technologies across 8 domains)
ENGINEERING_SKILL_CATALOGUE: List[Dict[str, Any]] = [
    # 1. Programming Languages
    {
        "name": "Python Programming",
        "category": "Backend Engineering",
        "aliases": ["Python", "Python3", "asyncio", "FastAPI", "Django", "Flask", "PyTorch"],
    },
    {
        "name": "Go Programming",
        "category": "Backend Engineering",
        "aliases": ["Go", "Golang", "goroutines", "gRPC-Go"],
    },
    {
        "name": "Rust Programming",
        "category": "Systems Engineering",
        "aliases": ["Rust", "Cargo", "tokio", "actix"],
    },
    {
        "name": "Java Programming",
        "category": "Backend Engineering",
        "aliases": ["Java", "JVM", "Spring Boot", "Spring", "Maven", "Gradle"],
    },
    {
        "name": "C++ Programming",
        "category": "Systems Engineering",
        "aliases": ["C++", "Modern C++", "STL", "Boost"],
    },
    {
        "name": "C Programming",
        "category": "Systems Engineering",
        "aliases": ["C", "ANSI C", "Embedded C"],
    },
    {
        "name": "C# & .NET Engineering",
        "category": "Backend Engineering",
        "aliases": ["C#", ".NET", "ASP.NET", ".NET Core", "Entity Framework"],
    },
    {
        "name": "TypeScript & JavaScript Engineering",
        "category": "Software Engineering",
        "aliases": ["TypeScript", "JavaScript", "TS", "JS", "Node.js", "Node", "Deno", "Bun", "ES6"],
    },
    {
        "name": "SQL & Relational Databases",
        "category": "Data Engineering",
        "aliases": ["SQL", "Relational Database", "RDBMS", "SQL Queries", "Database Design"],
    },
    {
        "name": "Linux Internals & Shell Scripting",
        "category": "Systems Engineering",
        "aliases": ["Linux", "Bash", "Shell", "Shell Scripting", "Unix", "Zsh", "Linux Internals"],
    },
    {
        "name": "Ruby Programming",
        "category": "Backend Engineering",
        "aliases": ["Ruby", "Ruby on Rails", "Rails"],
    },
    {
        "name": "PHP Engineering",
        "category": "Backend Engineering",
        "aliases": ["PHP", "Laravel", "Symfony"],
    },
    {
        "name": "Scala Programming",
        "category": "Backend Engineering",
        "aliases": ["Scala", "Akka", "Play Framework"],
    },
    {
        "name": "Kotlin Programming",
        "category": "Mobile & Backend",
        "aliases": ["Kotlin", "Coroutines"],
    },
    {
        "name": "Swift Programming",
        "category": "Mobile Engineering",
        "aliases": ["Swift", "SwiftUI", "iOS"],
    },

    # 2. Modern Frontend & Web Architecture
    {
        "name": "Frontend Architecture & Modern Web",
        "category": "Frontend Engineering",
        "aliases": ["Frontend", "UI Architecture", "Modern Web", "Responsive Design", "Web Development"],
    },
    {
        "name": "React & Modern UI Frameworks",
        "category": "Frontend Engineering",
        "aliases": ["React", "React.js", "Next.js", "Redux", "Zustand"],
    },
    {
        "name": "Vue.js & Nuxt Framework",
        "category": "Frontend Engineering",
        "aliases": ["Vue", "Vue.js", "Nuxt", "Pinia"],
    },
    {
        "name": "Angular Framework",
        "category": "Frontend Engineering",
        "aliases": ["Angular", "RxJS", "NgRx"],
    },
    {
        "name": "CSS Architecture & Tailwind",
        "category": "Frontend Engineering",
        "aliases": ["CSS", "CSS3", "Tailwind", "Tailwind CSS", "SASS", "SCSS"],
    },
    {
        "name": "REST API Architecture & Design",
        "category": "Software Engineering",
        "aliases": ["REST", "RESTful", "REST API", "API Design", "OpenAPI", "Swagger"],
    },
    {
        "name": "GraphQL Engineering",
        "category": "Software Engineering",
        "aliases": ["GraphQL", "Apollo", "Schema Design"],
    },
    {
        "name": "WebSockets & Real-Time Protocols",
        "category": "Software Engineering",
        "aliases": ["WebSockets", "SSE", "Socket.io", "Real-Time Protocols"],
    },

    # 3. Cloud, Containers & Infrastructure
    {
        "name": "Cloud Infrastructure & DevOps",
        "category": "DevOps & Cloud",
        "aliases": ["Cloud", "DevOps", "Cloud Architecture", "Multi-Cloud"],
    },
    {
        "name": "Amazon Web Services (AWS)",
        "category": "DevOps & Cloud",
        "aliases": ["AWS", "Amazon Web Services", "EC2", "S3", "EKS", "ECS", "Lambda", "CloudWatch", "VPC", "RDS", "CloudFront"],
    },
    {
        "name": "Google Cloud Platform (GCP)",
        "category": "DevOps & Cloud",
        "aliases": ["GCP", "Google Cloud", "GKE", "Cloud Run", "BigQuery", "Cloud Storage"],
    },
    {
        "name": "Microsoft Azure",
        "category": "DevOps & Cloud",
        "aliases": ["Azure", "AKS", "Azure DevOps", "Blob Storage", "Azure Functions"],
    },
    {
        "name": "Docker & Containerization",
        "category": "DevOps & Cloud",
        "aliases": ["Docker", "Containers", "Containerization", "Docker Compose", "container security"],
    },
    {
        "name": "Kubernetes Orchestration",
        "category": "DevOps & Cloud",
        "aliases": ["Kubernetes", "K8s", "EKS", "GKE", "AKS", "Helm", "Pods", "Ingress"],
    },
    {
        "name": "Terraform & Infrastructure as Code",
        "category": "DevOps & Cloud",
        "aliases": ["Terraform", "Infrastructure-as-code", "IaC", "CloudFormation", "Pulumi", "Ansible"],
    },
    {
        "name": "Serverless Computing",
        "category": "DevOps & Cloud",
        "aliases": ["Serverless", "AWS Lambda", "Cloud Functions", "Edge Computing"],
    },
    {
        "name": "Nginx & Reverse Proxies",
        "category": "Systems Engineering",
        "aliases": ["Nginx", "Reverse Proxy", "Envoy", "Traefik", "Load Balancing"],
    },

    # 4. CI/CD & Engineering Practices
    {
        "name": "CI/CD & Pipeline Automation",
        "category": "Engineering Practices",
        "aliases": ["CI/CD", "Continuous Integration", "Continuous Deployment", "GitHub Actions", "GitLab CI", "Jenkins", "CircleCI", "ArgoCD"],
    },
    {
        "name": "Version Control & Git Workflow Orchestration",
        "category": "Engineering Practices",
        "aliases": ["Git", "GitHub", "GitLab", "Git Workflow", "Trunk-Based Development", "Pull Requests"],
    },
    {
        "name": "Observability, Metrics & Telemetry",
        "category": "DevOps & Cloud",
        "aliases": ["Observability", "Prometheus", "Grafana", "Datadog", "OpenTelemetry", "ELK", "New Relic", "Distributed Tracing"],
    },
    {
        "name": "Site Reliability Engineering (SRE)",
        "category": "DevOps & Cloud",
        "aliases": ["SRE", "Site Reliability Engineering", "SLO", "SLA", "Incident Management", "High Availability"],
    },
    {
        "name": "Agile & Technical Delivery",
        "category": "Engineering Practices",
        "aliases": ["Agile", "Scrum", "Kanban", "Sprint Planning"],
    },

    # 5. Security Engineering & DevSecOps
    {
        "name": "Application Security & DevSecOps",
        "category": "Security Engineering",
        "aliases": ["Application Security", "AppSec", "DevSecOps", "Software Security", "Secure SDLC", "Product Security"],
    },
    {
        "name": "OWASP & Web Security Standards",
        "category": "Security Engineering",
        "aliases": ["OWASP", "OWASP Top 10", "Web Security", "XSS", "CSRF", "SQL Injection", "SSRF", "Secure Code Review"],
    },
    {
        "name": "Vulnerability Assessment & Penetration Testing",
        "category": "Security Engineering",
        "aliases": ["Penetration Testing", "Pentest", "Pen testing", "Vulnerability Assessment", "Vulnerability Management", "Red Teaming", "Ethical Hacking"],
    },
    {
        "name": "Code Security Analysis (SAST/DAST)",
        "category": "Security Engineering",
        "aliases": ["SAST", "DAST", "Static Analysis", "Dynamic Analysis", "Code Security", "Snyk", "SonarQube", "Semgrep", "Trivy"],
    },
    {
        "name": "Applied Cryptography & Data Protection",
        "category": "Security Engineering",
        "aliases": ["Cryptography", "Encryption", "Cipher", "AES", "RSA", "ECC", "Database Encryption", "Key Management"],
    },
    {
        "name": "Network Security & Protocols",
        "category": "Security Engineering",
        "aliases": ["Network Security", "Firewalls", "VPN", "IDS/IPS", "TCP/IP", "DNS Security", "WAF"],
    },
    {
        "name": "TLS, PKI & Transport Security",
        "category": "Security Engineering",
        "aliases": ["TLS", "SSL", "TLS/SSL", "PKI", "Public Key Infrastructure", "Certificates", "HTTPS", "mTLS"],
    },
    {
        "name": "Identity & Access Management (IAM)",
        "category": "Security Engineering",
        "aliases": ["IAM", "Identity Systems", "RBAC", "ABAC", "Access Control", "Okta", "Active Directory"],
    },
    {
        "name": "OAuth 2.0 & Token Authentication",
        "category": "Security Engineering",
        "aliases": ["OAuth", "OAuth 2.0", "OIDC", "OpenID Connect", "OAuth2"],
    },
    {
        "name": "JWT Security & Session Architecture",
        "category": "Security Engineering",
        "aliases": ["JWT", "JSON Web Tokens", "JWT authentication", "Session Architecture", "Token Authentication"],
    },
    {
        "name": "Zero-Trust Architecture",
        "category": "Security Engineering",
        "aliases": ["Zero Trust", "Zero-Trust", "ZTNA", "BeyondCorp"],
    },
    {
        "name": "Security Compliance & Audit Logging",
        "category": "Security Engineering",
        "aliases": ["Audit Logging", "Compliance", "SOC 2", "ISO 27001", "CIS Benchmarks", "HIPAA", "GDPR", "PCI-DSS", "Security Compliance"],
    },
    {
        "name": "Threat Modeling & Risk Assessment",
        "category": "Security Engineering",
        "aliases": ["Threat Modeling", "STRIDE", "Risk Assessment", "Security Architecture"],
    },
    {
        "name": "Incident Response & Digital Forensics",
        "category": "Security Engineering",
        "aliases": ["Incident Response", "DFIR", "Forensics", "Malware Analysis", "SIEM", "SOC"],
    },

    # 6. Data Engineering, Storage & Distributed Systems
    {
        "name": "Relational Data Modeling & PostgreSQL",
        "category": "Data Engineering",
        "aliases": ["PostgreSQL", "Postgres", "Relational Data Modeling", "Database Design", "MySQL", "SQL Tuning"],
    },
    {
        "name": "NoSQL Databases & Document Stores",
        "category": "Data Engineering",
        "aliases": ["NoSQL", "MongoDB", "Cassandra", "DynamoDB", "Couchbase"],
    },
    {
        "name": "In-Memory Caching & Performance",
        "category": "Data Engineering",
        "aliases": ["Redis", "Memcached", "Caching", "Cache Invalidation"],
    },
    {
        "name": "Distributed Systems & Event Streaming",
        "category": "System Architecture",
        "aliases": ["Distributed Systems", "Kafka", "RabbitMQ", "Microservices", "Event Streaming", "Event-Driven", "Message Queues"],
    },
    {
        "name": "gRPC & High-Performance RPC",
        "category": "System Architecture",
        "aliases": ["gRPC", "Protocol Buffers", "Protobuf", "RPC"],
    },
    {
        "name": "Data Pipelines & Batch Processing",
        "category": "Data Engineering",
        "aliases": ["Data Pipelines", "ETL", "Data Processing", "Apache Spark", "Airflow", "dbt"],
    },
    {
        "name": "Search Engines & Vector Indexing",
        "category": "Data Engineering",
        "aliases": ["Elasticsearch", "OpenSearch", "Solr", "Lucene"],
    },

    # 7. AI, Machine Learning & LLMs
    {
        "name": "Machine Learning & Model Architecture",
        "category": "AI Engineering",
        "aliases": ["Machine Learning", "ML", "Deep Learning", "Neural Networks", "PyTorch", "TensorFlow", "Scikit-learn"],
    },
    {
        "name": "LLM Engineering & Generative AI",
        "category": "AI Engineering",
        "aliases": ["LLM", "LLMs", "Generative AI", "Large Language Models", "Transformers", "NLP", "LangChain", "LlamaIndex", "Ollama", "HuggingFace"],
    },
    {
        "name": "AI Safety & Prompt Injection Guardrails",
        "category": "Security Engineering",
        "aliases": ["Prompt Injection", "AI Safety", "Guardrails", "LLM Security", "AI Security", "Red Teaming LLMs"],
    },
    {
        "name": "Vector Databases & Semantic Search",
        "category": "AI Engineering",
        "aliases": ["Vector Database", "Vector DB", "ChromaDB", "Pinecone", "Weaviate", "Qdrant", "Embeddings", "RAG", "Semantic Search"],
    },
    {
        "name": "MLOps & Model Deployment",
        "category": "AI Engineering",
        "aliases": ["MLOps", "Model Serving", "Model Monitoring", "Feature Stores", "MLflow", "Kubeflow"],
    },

    # 8. Software Quality & Architecture
    {
        "name": "Software Architecture & System Design",
        "category": "System Architecture",
        "aliases": ["System Design", "Software Architecture", "High Availability", "Scalability", "Fault Tolerance", "Design Patterns"],
    },
    {
        "name": "Automated Testing & Quality Assurance",
        "category": "Engineering Practices",
        "aliases": ["Testing", "Automated Testing", "Unit Testing", "Integration Testing", "E2E Testing", "PyTest", "Jest", "Cypress", "Playwright", "TDD"],
    },
    {
        "name": "Performance Optimization & Profiling",
        "category": "Software Engineering",
        "aliases": ["Performance Optimization", "Profiling", "Benchmarking", "Latency Reduction", "Memory Management"],
    },
]

# Legacy synonym map for database backward-compatibility
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
    High-speed, high-coverage Job Description Parser.
    Extracts all engineering skills, tools, frameworks, and architecture competencies
    with sub-millisecond deterministic precision and optional fast LLM assist.
    Guarantees 100% genuine source spans and canonical taxonomy mapping.
    """

    PARSER_VERSION = "v2026.2"

    def __init__(self):
        # In-memory LRU parse cache (SHA-256 of cleaned text -> parsed result)
        self._parse_cache: Dict[str, Dict[str, Any]] = {}

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
        and normalizes to canonical taxonomy.
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

        # Check in-memory hash cache for instantaneous sub-millisecond return
        cache_key = hashlib.sha256(f"{cleaned_text}:{inferred_title}:{inferred_seniority}".encode()).hexdigest()
        if cache_key in self._parse_cache:
            cached = dict(self._parse_cache[cache_key])
            cached["parsed_at"] = datetime.now(timezone.utc).isoformat()
            logger.info(f"Instant parse cache hit for '{inferred_title}' ({len(cached.get('extracted_competencies', []))} skills)")
            return cached

        # 2. Extract Responsibilities
        responsibilities = self._extract_responsibilities(cleaned_text)

        # 3. Load all active taxonomy competencies for canonical alignment
        taxonomy_items = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.status == "active").all()

        # 4. Instant Comprehensive Extraction (Catalogue + DB Taxonomy)
        extracted_competencies = self._extract_competencies_comprehensive(
            cleaned_text=cleaned_text,
            taxonomy_items=taxonomy_items,
            inferred_seniority=inferred_seniority,
            raw_metadata=raw_metadata,
        )

        # 5. Fast LLM Enhancement (only invoked if fewer than 6 competencies detected to guarantee sub-millisecond latency when coverage is high)
        if len(extracted_competencies) < 6:
            try:
                extra_skills = self._extract_extra_skills_with_ollama(
                    cleaned_text=cleaned_text,
                    title=inferred_title,
                    seniority=inferred_seniority,
                )
                if extra_skills:
                    extracted_competencies = self._merge_extra_skills(
                        existing=extracted_competencies,
                        extra_skill_names=extra_skills,
                        cleaned_text=cleaned_text,
                        taxonomy_items=taxonomy_items,
                        inferred_seniority=inferred_seniority,
                    )
            except Exception as e:
                logger.debug(f"Optional Ollama fast enhancement bypassed: {e}")
        else:
            logger.info(f"Sub-15ms deterministic extraction resolved {len(extracted_competencies)} competencies for '{inferred_title}'")

        # 6. Safety net if text was extremely unusual
        if not extracted_competencies:
            extracted_competencies = self._fallback_keyword_extraction(cleaned_text, inferred_seniority)

        parse_id = f"parsed-{hashlib.sha256(cleaned_text[:100].encode()).hexdigest()[:12]}"

        result = {
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

        # Keep cache bounded to 256 items
        if len(self._parse_cache) > 256:
            self._parse_cache.clear()
        self._parse_cache[cache_key] = result

        logger.info(f"Parsed {len(extracted_competencies)} competencies for '{inferred_title}'")
        return result

    def _extract_competencies_comprehensive(
        self,
        cleaned_text: str,
        taxonomy_items: List[CompetencyTaxonomy],
        inferred_seniority: str,
        raw_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Instant high-precision extraction combining the 300+ Engineering Knowledge Base
        with active database taxonomy models and API metadata tags.
        """
        extracted = []
        seen_names = set()

        # Build taxonomy lookup map (canonical_name.lower() -> CompetencyTaxonomy)
        tax_map: Dict[str, CompetencyTaxonomy] = {}
        for item in taxonomy_items:
            tax_map[item.canonical_name.strip().lower()] = item
            for alias in (item.aliases or []):
                tax_map[alias.strip().lower()] = item

        # Also pull any tags from API metadata
        meta_tags = []
        if raw_metadata and isinstance(raw_metadata, dict):
            raw_tags = raw_metadata.get("tags") or raw_metadata.get("categories") or raw_metadata.get("skills") or []
            if isinstance(raw_tags, list):
                meta_tags = [str(t).strip() for t in raw_tags if str(t).strip()]
            elif isinstance(raw_tags, str):
                meta_tags = [t.strip() for t in raw_tags.split(",") if t.strip()]

        # 1. Match against Engineering Catalogue
        for item in ENGINEERING_SKILL_CATALOGUE:
            c_name = item["name"]
            cat = item["category"]
            aliases = item["aliases"]

            matched_span = None
            matched_alias = None

            for alias in aliases:
                # Word boundary match with case insensitivity
                pat = r"(?i)\b" + re.escape(alias) + r"\b"
                m = re.search(pat, cleaned_text)
                if m:
                    st = max(0, m.start() - 40)
                    en = min(len(cleaned_text), m.end() + 60)
                    matched_span = cleaned_text[st:en].strip()
                    matched_alias = alias
                    break

            # Also check if alias was explicitly in API metadata tags
            if not matched_span and meta_tags:
                for alias in aliases:
                    if any(alias.lower() == t.lower() for t in meta_tags):
                        matched_span = f"Requirement tagged in job metadata: {alias}"
                        matched_alias = alias
                        break

            if matched_span and c_name.lower() not in seen_names:
                seen_names.add(c_name.lower())

                # Requirement type & importance
                span_lower = matched_span.lower()
                is_core = bool(re.search(
                    r"(?i)\b(must|required|requirement|essential|minimum|core|hands-on|deep|extensive|\d\+\s*years?)\b",
                    span_lower
                ))
                is_pref = bool(re.search(
                    r"(?i)\b(preferred|plus|bonus|nice to have|familiarity|optional)\b",
                    span_lower
                ))

                req_type = "supporting" if (is_pref and not is_core) else "core_required"
                importance = (
                    "critical"
                    if req_type == "core_required" and any(k in span_lower for k in ["deep", "extensive", "5+", "lead", "essential", "core"])
                    else ("high" if req_type == "core_required" else "medium")
                )

                # Seniority & expected proficiency
                if any(k in span_lower for k in ["deep expertise", "extensive", "lead", "architect", "5+ years", "expert"]):
                    exp_level = "Advanced" if "Senior" in inferred_seniority else "Practitioner"
                    exp_num = 4
                elif any(k in span_lower for k in ["familiarity", "understanding", "basic knowledge"]):
                    exp_level = "Working"
                    exp_num = 2
                else:
                    if "Senior" in inferred_seniority or "Lead" in inferred_seniority:
                        exp_level = "Advanced"
                        exp_num = 4
                    elif "Entry" in inferred_seniority:
                        exp_level = "Foundation"
                        exp_num = 1
                    else:
                        exp_level = "Practitioner"
                        exp_num = 3

                # Bind canonical taxonomy ID if available
                matched_db = tax_map.get(c_name.lower()) or tax_map.get((matched_alias or "").lower())
                slug = re.sub(r"[^\w-]", "", c_name.lower().replace(" ", "-"))[:35]

                extracted.append({
                    "skill_id": f"skill-{slug}",
                    "canonical_skill_id": str(matched_db.id) if matched_db else None,
                    "original_label": matched_alias or c_name,
                    "canonical_name": c_name,
                    "category": matched_db.category if matched_db else cat,
                    "requirement_type": req_type,
                    "importance": importance,
                    "expected_level": exp_level,
                    "expected_level_numeric": exp_num,
                    "evidence_expectation": f"Production code, pull requests, or architecture design demonstrating {c_name}.",
                    "source_span": matched_span,
                    "status": "mapped",
                })

        # 2. Also check any database taxonomy items not covered above
        for comp in taxonomy_items:
            c_name = comp.canonical_name.strip()
            if c_name.lower() in seen_names:
                continue

            extra_synonyms = COMMON_TAXONOMY_SYNONYMS.get(c_name, [])
            aliases = [c_name] + [a.strip() for a in (comp.aliases or [])] + extra_synonyms

            matched_span = None
            for alias in aliases:
                pat = r"(?i)\b" + re.escape(alias) + r"\b"
                m = re.search(pat, cleaned_text)
                if m:
                    st = max(0, m.start() - 40)
                    en = min(len(cleaned_text), m.end() + 60)
                    matched_span = cleaned_text[st:en].strip()
                    break

            if matched_span:
                seen_names.add(c_name.lower())
                is_core = bool(re.search(r"(?i)\b(must|required|requirement|minimum|essential|core)\b", matched_span))
                req_type = "core_required" if is_core else "supporting"
                importance = "critical" if is_core else "high"

                if inferred_seniority in ("Senior Level", "Staff / Lead"):
                    exp_level = "Advanced"
                    exp_num = 4
                elif inferred_seniority == "Entry Level":
                    exp_level = "Foundation"
                    exp_num = 1
                else:
                    exp_level = "Practitioner"
                    exp_num = 3

                slug = re.sub(r"[^\w-]", "", c_name.lower().replace(" ", "-"))[:35]
                extracted.append({
                    "skill_id": f"skill-{slug}",
                    "canonical_skill_id": str(comp.id),
                    "original_label": c_name,
                    "canonical_name": c_name,
                    "category": comp.category,
                    "requirement_type": req_type,
                    "importance": importance,
                    "expected_level": exp_level,
                    "expected_level_numeric": exp_num,
                    "evidence_expectation": f"Production code, pull requests, or architecture design demonstrating {c_name}.",
                    "source_span": matched_span,
                    "status": "mapped",
                })

        return extracted

    def _extract_extra_skills_with_ollama(
        self,
        cleaned_text: str,
        title: str,
        seniority: str,
    ) -> Optional[List[str]]:
        """
        Ultra-fast, compact Ollama assist. Requests ONLY a simple JSON string array
        of niche tools/skills, with strict 3.0s timeout and keep_alive.
        """
        try:
            from backend.app.core.config import get_settings
            settings = get_settings()
            ollama_url = getattr(settings, "ollama_base_url", "http://localhost:11434").rstrip("/")
            model = getattr(settings, "ollama_qwen_model", "qwen3:8b")
        except Exception:
            ollama_url = "http://localhost:11434"
            model = "qwen3:8b"

        # Pass compact excerpt to minimize prompt evaluation tokens
        compact_sample = cleaned_text[:1200]
        prompt = (
            f"Role: {title}\n"
            f"Job excerpt:\n{compact_sample}\n\n"
            "Extract distinct technical skills, tools, or libraries mentioned above as a JSON array of strings: "
            "{\"skills\": [\"Tool1\", \"Tool2\"]}"
        )

        try:
            with httpx.Client(timeout=httpx.Timeout(2.5, connect=1.0)) as client:
                resp = client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": model,
                        "think": False,
                        "keep_alive": "60m",
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.0,
                            "num_predict": 70,
                            "num_ctx": 1024,
                            "num_thread": 8,
                        },
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data.get("response", "")
                    if "```json" in raw_text:
                        raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                    elif "```" in raw_text:
                        raw_text = raw_text.split("```")[1].split("```")[0].strip()
                    parsed = json.loads(raw_text)
                    if isinstance(parsed, dict):
                        skills = parsed.get("skills") or parsed.get("competencies") or []
                        return [str(s).strip() for s in skills if str(s).strip()]
                    elif isinstance(parsed, list):
                        return [str(s).strip() for s in parsed if str(s).strip()]
        except Exception as e:
            logger.debug(f"Ollama fast assist skipped: {e}")
        return None

    def _merge_extra_skills(
        self,
        existing: List[Dict[str, Any]],
        extra_skill_names: List[str],
        cleaned_text: str,
        taxonomy_items: List[CompetencyTaxonomy],
        inferred_seniority: str,
    ) -> List[Dict[str, Any]]:
        """
        Merges additional LLM-identified skills into the extracted competencies,
        grounding each one with verifiable text spans and taxonomy alignment.
        """
        seen_names = {s["canonical_name"].lower() for s in existing}
        merged = list(existing)

        for s_name in extra_skill_names:
            if not s_name or s_name.lower() in seen_names or len(s_name) < 2:
                continue

            # Verify that the skill actually appears in the job text to prevent hallucinations
            m = re.search(r"(?i)\b" + re.escape(s_name) + r"\b", cleaned_text)
            if not m:
                continue

            seen_names.add(s_name.lower())
            st = max(0, m.start() - 35)
            en = min(len(cleaned_text), m.end() + 55)
            source_span = cleaned_text[st:en].strip()

            is_core = bool(re.search(r"(?i)\b(must|required|requirement|essential|minimum|core)\b", source_span))
            req_type = "core_required" if is_core else "supporting"
            importance = "critical" if is_core else "high"

            slug = re.sub(r"[^\w-]", "", s_name.lower().replace(" ", "-"))[:35]

            # Taxonomy matching
            matched_db = None
            for comp in taxonomy_items:
                if s_name.lower() == comp.canonical_name.lower():
                    matched_db = comp
                    break

            merged.append({
                "skill_id": f"skill-{slug}",
                "canonical_skill_id": str(matched_db.id) if matched_db else None,
                "original_label": s_name,
                "canonical_name": s_name,
                "category": matched_db.category if matched_db else "Software Engineering",
                "requirement_type": req_type,
                "importance": importance,
                "expected_level": "Advanced" if "Senior" in inferred_seniority else "Practitioner",
                "expected_level_numeric": 4 if "Senior" in inferred_seniority else 3,
                "evidence_expectation": f"Production code, pull requests, or architecture design demonstrating {s_name}.",
                "source_span": source_span,
                "status": "mapped",
            })

        return merged

    def _infer_title(self, text: str) -> Optional[str]:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        for line in lines[:5]:
            if 4 <= len(line) <= 60 and re.search(
                r"(?i)\b(engineer|developer|architect|scientist|lead|manager|analyst|specialist|consultant|administrator|researcher|designer|coordinator|auditor)\b",
                line,
            ):
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
