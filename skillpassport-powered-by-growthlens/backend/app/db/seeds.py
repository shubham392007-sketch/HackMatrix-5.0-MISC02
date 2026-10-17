from sqlalchemy.orm import Session
from backend.app.models.taxonomy import CompetencyTaxonomy
from backend.app.core.logging import get_logger
import uuid

logger = get_logger("db.seeds")

INITIAL_TAXONOMY = [
    {
        "canonical_name": "API Architecture & Design",
        "normalized_name": "api architecture design",
        "category": "Backend Engineering",
        "description": "Design and implementation of resilient, high-throughput RESTful, gRPC, and GraphQL APIs.",
        "aliases": ["REST API", "API Design", "FastAPI", "API Integration", "Endpoints"],
    },
    {
        "canonical_name": "Distributed Systems & Event Streaming",
        "normalized_name": "distributed systems event streaming",
        "category": "System Architecture",
        "description": "Architecting decoupled, asynchronous event-driven pipelines, Celery worker orchestration, and message queues.",
        "aliases": ["Event-driven", "Celery", "Kafka", "RabbitMQ", "Message Queues", "Asynchronous Processing"],
    },
    {
        "canonical_name": "Relational Data Modeling & PostgreSQL",
        "normalized_name": "relational data modeling postgresql",
        "category": "Data Engineering",
        "description": "Schema normalization, complex indexing, constraint management, and migration engineering on PostgreSQL.",
        "aliases": ["PostgreSQL", "SQLAlchemy", "Alembic", "SQL Modeling", "Database Optimization"],
    },
    {
        "canonical_name": "Vector Retrieval & Semantic Indexing",
        "normalized_name": "vector retrieval semantic indexing",
        "category": "AI Engineering",
        "description": "Semantic search indexing, embeddings generation (nomic-embed-text), ChromaDB vector stores, and metadata filtering.",
        "aliases": ["ChromaDB", "Vector Search", "Embeddings", "RAG Retrieval", "nomic-embed-text"],
    },
    {
        "canonical_name": "Document Parsing & Optical Character Recognition",
        "normalized_name": "document parsing optical character recognition",
        "category": "Document Intelligence",
        "description": "Multi-format parsing of digital PDFs, DOCX, PPTX and vision-language OCR extraction via GLM-OCR.",
        "aliases": ["PyMuPDF", "GLM-OCR", "Document Extraction", "OCR", "python-docx", "python-pptx"],
    },
    {
        "canonical_name": "Version Control & Git Workflow Orchestration",
        "normalized_name": "version control git workflow orchestration",
        "category": "Engineering Practices",
        "description": "Collaborative version control, pull request review management, commit history curation, and Git automation.",
        "aliases": ["GitHub", "Git", "Pull Requests", "Code Review", "Version Control"],
    },
    {
        "canonical_name": "Agile Project & Work Tracking",
        "normalized_name": "agile project work tracking",
        "category": "Project Governance",
        "description": "Structured issue breakdown, epic/story progression tracking, sprint deliverables, and Jira Cloud integration.",
        "aliases": ["Jira", "Issue Tracking", "Agile", "Work Breakdown", "Sprint Management"],
    },
    {
        "canonical_name": "LLM Structured Extraction & Prompt Engineering",
        "normalized_name": "llm structured extraction prompt engineering",
        "category": "AI Engineering",
        "description": "Instruction prompting of local LLMs (Qwen3 8B), JSON schema-constrained inference, and prompt-injection defense.",
        "aliases": ["Qwen", "LLM Extraction", "Prompt Engineering", "Ollama", "Structured Output"],
    },
    {
        "canonical_name": "Technical Project Management & Delivery",
        "normalized_name": "technical project management delivery",
        "category": "Project Governance",
        "description": "Project lifecycle management, milestone delivery, risk mitigation, stakeholder coordination, and structured work execution.",
        "aliases": ["Project Management", "PMP", "Delivery Management", "Project Planning", "Agile Delivery"],
    },
    {
        "canonical_name": "Artificial Intelligence Foundations & Frameworks",
        "normalized_name": "artificial intelligence foundations frameworks",
        "category": "AI Engineering",
        "description": "Foundation AI models, generative video/image architectures, deep learning concepts, and applied AI frameworks.",
        "aliases": ["Artificial Intelligence", "Generative AI", "Foundation Models", "OpenAI", "Deep Learning"],
    },
    {
        "canonical_name": "Software Quality Assurance & Automated Testing",
        "normalized_name": "software quality assurance automated testing",
        "category": "Quality Engineering",
        "description": "Automated test development, unit and integration test suites, regression testing, and CI verification.",
        "aliases": ["Automated Testing", "Unit Tests", "Integration Tests", "Test Suites", "Quality Assurance", "QA"],
    },
    {
        "canonical_name": "Frontend Architecture & Modern Web",
        "normalized_name": "frontend architecture modern web",
        "category": "Frontend Engineering",
        "description": "Modern web development with React, Next.js, TypeScript, Tailwind CSS, and interactive state management.",
        "aliases": ["React", "Next.js", "TypeScript", "Tailwind CSS", "Frontend Development", "Web UI"],
    },
    {
        "canonical_name": "Data Science & Analytics Practices",
        "normalized_name": "data science analytics practices",
        "category": "Data Engineering",
        "description": "Statistical modeling, predictive analytics, data analysis, and mathematical simulation modeling.",
        "aliases": ["Data Science", "Analytics", "Statistical Modeling", "Survival Analysis", "Predictive Analytics"],
    },
    {
        "canonical_name": "Cloud Infrastructure & DevOps",
        "normalized_name": "cloud infrastructure devops",
        "category": "DevOps & Cloud",
        "description": "Container orchestration, CI/CD pipeline automation, cloud infrastructure, and configuration management.",
        "aliases": ["Docker", "Kubernetes", "AWS", "CI/CD", "DevOps", "Infrastructure as Code"],
    },
    {
        "canonical_name": "Application Security & DevSecOps",
        "normalized_name": "application security devsecops",
        "category": "Security Engineering",
        "description": "Security best practices, credential management, encryption, authentication protocols, and vulnerability remediation.",
        "aliases": ["Security", "Authentication", "JWT", "Encryption", "DevSecOps", "RBAC"],
    },
    {
        "canonical_name": "Technical Leadership & Mentorship",
        "normalized_name": "technical leadership mentorship",
        "category": "Leadership & Strategy",
        "description": "Technical design direction, architectural review, developer mentorship, and engineering roadmap execution.",
        "aliases": ["Architecture Review", "Technical Leadership", "Mentorship", "RFCs", "Design Direction"],
    },
]


def seed_canonical_taxonomy(db: Session) -> int:
    """Seeds the foundational competency taxonomy if table is empty."""
    seeded_count = 0
    for item in INITIAL_TAXONOMY:
        existing = db.query(CompetencyTaxonomy).filter(
            CompetencyTaxonomy.canonical_name == item["canonical_name"]
        ).first()
        if not existing:
            competency = CompetencyTaxonomy(
                id=uuid.uuid4(),
                canonical_name=item["canonical_name"],
                normalized_name=item["normalized_name"],
                category=item["category"],
                description=item["description"],
                aliases=item["aliases"],
                status="active",
                taxonomy_version="v1.0",
            )
            db.add(competency)
            seeded_count += 1
    
    if seeded_count > 0:
        db.commit()
        logger.info(f"Seeded {seeded_count} canonical competencies into taxonomy")
    return seeded_count
