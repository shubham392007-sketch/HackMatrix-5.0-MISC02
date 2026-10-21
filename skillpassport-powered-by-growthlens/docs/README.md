# Skill Passport Documentation Hub

Welcome to the **Skill Passport** developer and architecture documentation. This directory provides comprehensive guides for onboarding collaborators, understanding system architecture, and contributing across all four core domains.

---

## 1. Documentation Index

### 🚀 Setup & Operations (`docs/setup/`)
- [**Local Development Guide**](setup/LOCAL_DEVELOPMENT.md): Step-by-step local launch instructions (Windows PowerShell and Bash), port allocations, and first-run verification.
- [**Dependencies & System Requirements**](setup/DEPENDENCIES.md): Detailed breakdown of system runtimes, Python packages (`requirements.txt`), Node modules (`package.json`), and Ollama models.
- [**Environment Variables Reference**](setup/ENVIRONMENT_VARIABLES.md): Complete dictionary of all frontend and backend configuration variables, types, defaults, and security sensitivities.
- [**Database Setup & Connection Guide**](setup/DATABASE_SETUP.md): PostgreSQL provisioning, Supabase connection pooler vs direct connection, Alembic migrations, and the database circuit breaker.
- [**Ollama & Local AI Setup**](setup/OLLAMA_SETUP.md): Local Qwen3 8B installation, GPU acceleration, 8192 context window tuning, and heuristic fallback mechanics.
- [**Troubleshooting & Diagnostic Runbook**](setup/TROUBLESHOOTING.md): Known failure modes, error messages, root cause analysis, and verified resolutions.
- [**Pre-Flight Verification Checklist**](setup/VERIFICATION_CHECKLIST.md): 6-stage testing checklist to confirm local environment readiness.

---

### 🏛️ System Architecture (`docs/architecture/`)
- [**System Architecture**](architecture/SYSTEM_ARCHITECTURE.md): Multi-tier architecture overview, component boundaries, network ports, and security perimeters.
- [**Data Flow & Pipelines**](architecture/DATA_FLOW.md): Sequence diagrams tracing data from raw artifact ingestion through AI decomposition, governance gates, and passport ledger updates.
- [**Database & Data Model Catalog**](architecture/DATABASE_AND_DATA_MODEL.md): Relational catalog of all 27 SQLAlchemy ORM models, foreign keys, relationships, and Supabase Storage bucket bindings.
- [**Authentication, Authorization & Security**](architecture/AUTHENTICATION_AND_AUTHORIZATION.md): Supabase JWT auth, user ownership isolation (`owner_user_id`), RBAC, and Fernet credential cryptography.
- [**Background Jobs & Asynchronous Processing**](architecture/BACKGROUND_JOBS.md): Ingestion task state machines, Celery + Redis queues, in-memory async pool, and telemetry.

---

### 📦 Domain Technical Guides (`docs/domains/`)
- [**Domain Architecture Index**](domains/README.md): Overview and responsibility matrix across all four platform domains.
- [**Domain 1: Evidence Workspace**](domains/EVIDENCE_WORKSPACE.md): GitHub & Jira source sync, document processing (PDF, DOCX, PPTX), SSRF-hardened web crawling, and evidence normalization.
- [**Domain 2: Skill Intelligence**](domains/SKILL_INTELLIGENCE.md): Canonical competency taxonomy, evidence-to-skill mappings, proficiency rubrics, and the verified Skill Passport ledger.
- [**Domain 3: AI Intelligence**](domains/AI_INTELLIGENCE.md): Ollama Qwen3 8B work analyzer, prompt templates, structured JSON decomposition, fallback engine, and ChromaDB vector search.
- [**Domain 4: Trust & Governance**](domains/TRUST_AND_GOVERNANCE.md): 7-point Hallucination Guard, output validation, contradiction resolution, prompt injection defense, human review queue, and audit trail.

---

## 2. Reading Guides by Contributor Role

### 🎨 If you are a Frontend Engineer
Start with these documents to understand the UI architecture, design tokens, and client state:
1. [Local Development Guide](setup/LOCAL_DEVELOPMENT.md) — Launch the frontend on port 3001.
2. [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) — Review Next.js proxy rewrites to `:8001`.
3. [Skill Intelligence Guide](domains/SKILL_INTELLIGENCE.md) — Understand how the canonical passport and candidate skills are structured.
4. [Trust & Governance Guide](domains/TRUST_AND_GOVERNANCE.md) — Review the 7 governance sub-pages under `/app/ai`.

---

### 🧠 If you are an AI / ML Engineer
Focus on local inference, prompt engineering, structured schemas, and vector retrieval:
1. [Ollama & Local AI Setup](setup/OLLAMA_SETUP.md) — Configure `qwen3:8b` with `num_ctx: 8192`.
2. [AI Intelligence Guide](domains/AI_INTELLIGENCE.md) — Deep dive into the 4-part work decomposition prompt and JSON output schema.
3. [Trust & Governance Guide](domains/TRUST_AND_GOVERNANCE.md) — Understand the 7-stage Hallucination Guard and golden dataset evaluation suites.
4. [Data Flow & Pipelines](architecture/DATA_FLOW.md) — Trace how model outputs flow into candidate mappings.

---

### ⚙️ If you are a Backend / Platform Engineer
Focus on APIs, database connection pooling, reliability, and background queues:
1. [Local Development Guide](setup/LOCAL_DEVELOPMENT.md) — Set up Python virtual environment and run Uvicorn on port 8001.
2. [Database Setup & Connection Guide](setup/DATABASE_SETUP.md) — Master Alembic migrations and connection pool limits (`pool_size=8`, `max_overflow=0`).
3. [Database & Data Model Catalog](architecture/DATABASE_AND_DATA_MODEL.md) — Full reference for all 27 SQLAlchemy models.
4. [Background Jobs & Asynchronous Processing](architecture/BACKGROUND_JOBS.md) — Celery worker vs in-memory fallback runner.

---

### 🛡️ If you are a Security & Compliance Auditor
Focus on credential encryption, data isolation, and auditability:
1. [Security Policy](../SECURITY.md) — Vulnerability reporting and isolation standards.
2. [Authentication & Authorization](architecture/AUTHENTICATION_AND_AUTHORIZATION.md) — Fernet token vault and `owner_user_id` query scoping.
3. [Trust & Governance Guide](domains/TRUST_AND_GOVERNANCE.md) — Immutable append-only audit trail in `review_audit_events`.
