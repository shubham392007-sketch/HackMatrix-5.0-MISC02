# Skill Passport — Shared Project Context Reference

> **Navigation and Context-Loading Reference for Antigravity and Future Contributors**  
> *Authoritative summary of architecture, domains, data flows, operational constraints, and development guidelines.*

---

## 1. Product Overview & Core Design Principles

**Skill Passport** is an evidence-backed skill intelligence platform designed to replace subjective resumes and keyword-matching parsers with tamper-evident, audit-proof skill credentials derived from real engineering work.

### Core Problems Solved:
1. **Resume Inflation & Keyword Stuffing**: Claims on traditional resumes are decoupled from verifiable proof. Skill Passport requires every claimed competency to cite verifiable work artifacts (commits, PRs, Jira issues, RFCs, documentation).
2. **AI Hallucination in Talent Systems**: Generic LLMs hallucinate skills not substantiated by code. Skill Passport runs a deterministic **7-Point Hallucination Guard** that verifies verbatim textual citations, author attribution, and semantic support.
3. **Data Privacy & IP Protection**: Enterprise source code and internal documentation are never sent to external third-party AI APIs; all inference runs through a local, private **Ollama Qwen3 8B** model.

### Five Core Engineering Principles:
- **Evidence Primacy**: Every skill, proficiency level, and recommendation must link to verifiable work evidence with permanent provenance.
- **Deterministic Governance**: AI outputs are never trusted blindly; they are treated as suggestions until validated by verbatim citation checks and governance gates.
- **Defense in Depth**: External credentials (GitHub PATs, Jira API tokens) are Fernet-encrypted at rest; web scraping rejects private IP subnets (SSRF protection); all data queries strictly enforce `owner_user_id`.
- **Resilient Data Access**: Bounded connection pooling (`pool_size=8`, `max_overflow=0`) with pre-ping validation and an active circuit breaker prevents database connection exhaustion on PostgreSQL/Supabase.
- **Architectural Separation**: Frontend presentation is strictly separated from domain business logic; Next.js proxies API calls to FastAPI, avoiding cross-origin vulnerabilities.

---

## 2. The Four Platform Domains

```text
Evidence Workspace (Domain 1)
       │ (Produces normalized evidence_items with SHA-256 hashes)
       ▼
AI Intelligence (Domain 3)
       │ (Decomposes work into facts/claims; proposes candidate skills via Qwen3 8B)
       ▼
Trust & Governance (Domain 4)
       │ (7-point citation check, conflict resolution, prompt injection quarantine)
       ▼
Skill Intelligence (Domain 2)
         (Standardizes skills against taxonomy; publishes to Canonical Passport Ledger)
```

### Domain 1: Evidence Workspace (`docs/domains/EVIDENCE_WORKSPACE.md`)
- **Responsibility**: Ingestion, raw capture, cryptographic hashing, and normalization of work artifacts.
- **Ingestion Channels**:
  - **GitHub Connector**: PAT-authenticated sync of repos, commits, PRs, byte-level language distributions, and README snapshots.
  - **Jira Connector**: API token sync of closed sprint tickets, stories, acceptance criteria, and story points.
  - **Document Processor**: Multi-format extraction for PDF (`PyMuPDF`), DOCX (`python-docx`), PPTX (`python-pptx`), Markdown, and plain text.
  - **Portfolio Crawler**: SSRF-hardened web crawler (`trafilatura`) validating IP addresses against RFC 1918 subnets and metadata loops.
- **Key Tables**: `connected_sources`, `selected_resources`, `source_sync_runs`, `raw_source_records`, `uploaded_documents`, `document_chunks`, `evidence_items`, `web_crawl_records`.
- **Key Endpoints**: `GET/POST /api/v1/connections/*`, `POST /api/v1/documents/upload`, `POST /api/v1/portfolio/crawl`, `GET /api/v1/evidence/items`.
- **Primary Routes**: `/app/evidence/library`, `/app/evidence/sources`, `/app/evidence/upload`, `/app/evidence/activity`.

### Domain 2: Skill Intelligence (`docs/domains/SKILL_INTELLIGENCE.md`)
- **Responsibility**: Standardized competency taxonomy, proficiency scoring rubrics, evidence-to-skill mappings, and the canonical Skill Passport ledger.
- **Competency Taxonomy**: Curated hierarchy (`competency_taxonomy`) with normalized slugs, domain categories, versions, and synonym aliases (`["Postgres", "pg", "psql"]`).
- **Proficiency Scoring**: 5-level rubric (Foundational, Practitioner, Advanced, Expert, Master) computed from evidence density, artifact strength, peer review, and duration.
- **Verification State Machine**: `suggested` ➔ `pending_review` ➔ `verified` | `rejected` | `disputed`.
- **Key Tables**: `competency_taxonomy`, `evidence_competency_mappings`, `verification_decisions`.
- **Key Endpoints**: `GET /api/v1/passport/skills`, `GET /api/v1/passport/skills/{id}`, `GET /api/v1/passport/candidates`, `GET /api/v1/passport/coverage`, `GET /api/v1/passport/taxonomy`.
- **Primary Routes**: `/app/passport/skills`, `/app/passport/candidates`, `/app/passport/coverage`, `/app/passport/taxonomy`.

### Domain 3: AI Intelligence (`docs/domains/AI_INTELLIGENCE.md`)
- **Responsibility**: Technical work decomposition, skill signal extraction, uncertainty flagging, and semantic vector indexing.
- **Engine**: Local **Ollama** daemon serving `qwen3:8b` at `http://localhost:11434` with an 8192-token context window (`num_ctx: 8192`) and low temperature (`0.1`).
- **4-Part Work Decomposition**:
  - `observed_facts`: Verifiable statements directly present in source text.
  - `claimed_information`: Subjective or self-reported assertions.
  - `inferred_attributes`: Competencies implied by technical context.
  - `technical_tasks`: Concrete technical operations executed.
- **Heuristic Fallback Engine**: If Ollama times out or is offline, automatically executes deterministic regex and taxonomy matching (`fallback_used: true`, `confidence_score: 0.50`).
- **Vector Storage**: ChromaDB (`./chroma_data`) with 768-dimensional `nomic-embed-text` embeddings scoped by `owner_user_id`.
- **Key Tables**: `ai_analysis_runs`, `work_analysis_results`, `evidence_quality_assessments`.
- **Key Endpoints**: `POST /api/v1/ai/analyze-work`, `POST /api/v1/ai/extract-skills`, `GET /api/v1/ai/bootstrap` (atomic dashboard state loader).
- **Primary Routes**: `/app/ai`, `/app/ai/work-analysis`, `/app/ai/skill-extraction`.

### Domain 4: Trust & Governance (`docs/domains/TRUST_AND_GOVERNANCE.md`)
- **Responsibility**: Zero-hallucination verification, citation checking, prompt injection quarantine, conflict resolution, human review, and tamper-evident audit logging.
- **7-Point Hallucination Guard**:
  1. *Verbatim Citation Check*: Validates claim cites exact source substring (`NO_VERBATIM_CITATION`).
  2. *Author Attribution*: Verifies user matches committer/author identity (`AUTHORSHIP_UNVERIFIED`).
  3. *Semantic Support Score*: Cosine similarity `>= 0.75` via ChromaDB (`WEAK_SEMANTIC_SUPPORT`).
  4. *Contradiction Check*: Scans existing verified evidence for conflicting data.
  5. *Schema Validation*: Validates Pydantic structure and taxonomy ID existence.
  6. *Prompt Injection Defense*: Quarantines adversarial jailbreak patterns into `prompt_injection_findings`.
  7. *Audit Logging*: Appends immutable record to `review_audit_events`.
- **Human Review Queue**: Low-confidence claims (`< 0.70`), conflicts, and injection alerts route to `/app/ai/review-queue`.
- **Key Tables**: `hallucination_guard_results`, `output_validation_runs`, `evidence_conflicts`, `prompt_injection_findings`, `human_review_tasks`, `review_audit_events`.
- **Key Endpoints**: `GET /api/v1/ai/guard/results`, `GET /api/v1/ai/validations`, `GET /api/v1/ai/conflicts`, `POST /api/v1/ai/review-tasks/{id}/resolve`, `GET /api/v1/ai/audit`.
- **Primary Routes**: `/app/ai/guard`, `/app/ai/validation`, `/app/ai/conflicts`, `/app/ai/prompt-injection`, `/app/ai/review-queue`, `/app/ai/audit`.

---

## 3. End-to-End Cross-Domain Data Flow

```text
[Raw Artifact: GitHub/Jira/PDF/Web]
              │
              ▼ (1. Ingestion)
[uploaded_documents / raw_source_records] ──► SHA-256 Checksum Check (Idempotency)
              │
              ▼ (2. Normalization)
[evidence_items] ──► Provenance Pointers, Attribution Tagging, Quality Scoring (0–100)
              │
              ▼ (3. AI Work Analysis)
[Prompt Injection Filter] ──► [Ollama Qwen3 8B (num_ctx: 8192)] 
              │               (Fallback: Regex/Taxonomy if Ollama offline)
              ▼
[work_analysis_results] ──► facts, claims, inferred skills, technical tasks
              │
              ▼ (4. Trust & Governance Multi-Gate)
[Hallucination Guard] ──► Verbatim Citation Check ──► Author Attribution Check ──► Semantic Support >= 0.75
              ├── Fails Citation ──► [Rejected]
              ├── Uncertainty / Conflict ──► [human_review_tasks]
              └── Passes All 7 Gates ──► [verification_decisions: VERIFIED]
              │
              ▼ (5. Ledger Update)
[Canonical Skill Passport] ──► Aggregated Verified Skills + Proficiency Badges + Clickable Citations
```

---

## 4. Technology Stack & Runtime Allocation

| Layer | Technology | Version / Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Application** | Next.js (App Router) | `16.3.6` (Turbopack, React 19) | Client interface running at `http://localhost:3001` |
| **UI Styling** | Tailwind CSS v4 | Neobrutalist design tokens | Scalloped cards, high-contrast borders, pastel accents |
| **Backend API** | FastAPI | `0.115+` (Uvicorn ASGI) | High-throughput REST API running at `http://127.0.0.1:8001` |
| **Database & ORM** | PostgreSQL (Supabase) | SQLAlchemy `2.0`, Alembic | Relational data persistence with 27 models |
| **Connection Pool** | SQLAlchemy QueuePool | `pool_size=8`, `max_overflow=0` | Prevents Supabase 15-connection limit exhaustion |
| **Reliability Layer** | Database Circuit Breaker | 5 consecutive failures / 15s reset | Isolates downstream database failures (`HTTP 503`) |
| **AI Inference** | Ollama | `qwen3:8b` (`num_ctx: 8192`, `temp: 0.1`)| Private local work analysis and skill signal extraction |
| **Vector Embeddings** | ChromaDB / nomic-embed-text | 768 dimensions (`./chroma_data`) | Semantic similarity scoring for Hallucination Guard |
| **Document Processing** | PyMuPDF, python-docx, pptx | Direct binary parsers | Text extraction from PDF, Word, and PowerPoint |
| **Web Crawling** | Trafilatura, BeautifulSoup4 | SSRF-hardened crawler | Portfolio and article distillation with IP blacklisting |
| **Token Cryptography** | Fernet (AES-128 + HMAC) | Sourced via master env key | Encryption at rest for external GitHub/Jira credentials |
| **Background Processing**| Celery + Redis / Async Pool | `ThreadPoolExecutor` fallback | Asynchronous ingestion jobs and document parsing |

---

## 5. Key Data Concepts & Trust Distinctions

It is critical never to confuse extraction with verification:

| Concept | Status | Trust Level | Authoritative Source |
| :--- | :--- | :--- | :--- |
| **Raw Artifact** | Ingested | Unverified | `raw_source_records`, `uploaded_documents` |
| **Observed Fact** | Analyzed | Verifiable | `work_analysis_results.observed_facts` (Verbatim in text) |
| **Claimed Info** | Analyzed | Subjective | `work_analysis_results.claimed_information` (Self-reported) |
| **Candidate Skill**| Proposed | Suggested | `evidence_competency_mappings` with `status="suggested"` |
| **Verified Skill** | Cleared Gates | **Authoritative** | `evidence_competency_mappings` with `status="verified"` & `verification_decisions` |
| **Audit Event** | Appended | **Immutable** | `review_audit_events` (Cannot be edited or deleted) |

> [!IMPORTANT]
> A successful Ollama response, high confidence score, or dense vector match **does not constitute a verified skill**. Only claims passing all 7 gates of the Hallucination Guard (or approved via human review override with an audit log) become verified credentials.

---

## 6. Architecture Decisions & Operational Constraints

1. **Vercel Root Directory**:
   - The repository root contains `skillpassport-powered-by-growthlens/`.
   - Vercel deployments must configure **Root Directory** as `skillpassport-powered-by-growthlens`.
2. **Frontend-to-Backend Proxy**:
   - The browser communicates with `http://localhost:3001`.
   - Next.js rewrites `/api/v1/:path*` directly to `http://127.0.0.1:8001/api/v1/:path*`, avoiding CORS issues.
3. **Strict Bounded Connection Pool**:
   - `DB_POOL_SIZE = 8`, `DB_MAX_OVERFLOW = 0`, `DB_POOL_TIMEOUT = 20.0`, `DB_POOL_PRE_PING = True`.
   - **Never increase these values** without verifying database connection tier limits.
4. **Credential Isolation**:
   - Personal Access Tokens are encrypted with Fernet before database writes.
   - REST API responses mask or omit credentials; tokens are decrypted strictly in memory at invocation time.
5. **SSRF Defense**:
   - All crawled URLs are resolved against DNS and validated against IP blacklists (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`).
6. **Local AI Privacy**:
   - Zero source code or documents are transmitted to public cloud LLMs (OpenAI, Anthropic). All analysis runs through local Ollama.

---

## 7. Canonical Documentation Index

Before modifying any domain, consult the relevant first-party documentation:

| Topic / Area | Canonical Guide |
| :--- | :--- |
| **Master Documentation Index** | [`docs/README.md`](docs/README.md) |
| **Domain Architecture Overview**| [`docs/domains/README.md`](docs/domains/README.md) |
| **Evidence Workspace (Domain 1)**| [`docs/domains/EVIDENCE_WORKSPACE.md`](docs/domains/EVIDENCE_WORKSPACE.md) |
| **Skill Intelligence (Domain 2)** | [`docs/domains/SKILL_INTELLIGENCE.md`](docs/domains/SKILL_INTELLIGENCE.md) |
| **AI Intelligence (Domain 3)** | [`docs/domains/AI_INTELLIGENCE.md`](docs/domains/AI_INTELLIGENCE.md) |
| **Trust & Governance (Domain 4)**| [`docs/domains/TRUST_AND_GOVERNANCE.md`](docs/domains/TRUST_AND_GOVERNANCE.md) |
| **System Architecture** | [`docs/architecture/SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md) |
| **Data Flow & Pipelines** | [`docs/architecture/DATA_FLOW.md`](docs/architecture/DATA_FLOW.md) |
| **Database Schema & 27 Models** | [`docs/architecture/DATABASE_AND_DATA_MODEL.md`](docs/architecture/DATABASE_AND_DATA_MODEL.md) |
| **Authentication & RBAC** | [`docs/architecture/AUTHENTICATION_AND_AUTHORIZATION.md`](docs/architecture/AUTHENTICATION_AND_AUTHORIZATION.md) |
| **Background Processing** | [`docs/architecture/BACKGROUND_JOBS.md`](docs/architecture/BACKGROUND_JOBS.md) |
| **Local Development Walkthrough**| [`docs/setup/LOCAL_DEVELOPMENT.md`](docs/setup/LOCAL_DEVELOPMENT.md) |
| **Environment Variables Dictionary**| [`docs/setup/ENVIRONMENT_VARIABLES.md`](docs/setup/ENVIRONMENT_VARIABLES.md) |
| **Database & Pooling Setup** | [`docs/setup/DATABASE_SETUP.md`](docs/setup/DATABASE_SETUP.md) |
| **Ollama & Model Sizing** | [`docs/setup/OLLAMA_SETUP.md`](docs/setup/OLLAMA_SETUP.md) |
| **Troubleshooting & Diagnostics**| [`docs/setup/TROUBLESHOOTING.md`](docs/setup/TROUBLESHOOTING.md) |
| **Contributing Standards** | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| **Security Policy** | [`SECURITY.md`](SECURITY.md) |

---

## 8. Local Setup & Execution Guide

### Prerequisites:
- **Node.js**: v20.x or v22.x LTS
- **Python**: v3.11.x or v3.12.x
- **Ollama**: Installed locally with `qwen3:8b` and `nomic-embed-text`
- **PostgreSQL**: Supabase instance or local Postgres 15+

### Installation & Launch:
```bash
cd skillpassport-powered-by-growthlens

# 1. Setup Environment Files
cp .env.example .env.local
cp .env.example backend/.env

# 2. Frontend Dependencies
npm install

# 3. Backend Dependencies
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1 | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

# 4. Database Schema Migration
cd backend && alembic upgrade head && cd ..

# 5. Launch Backend API (Terminal 1)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload

# 6. Launch Frontend (Terminal 2)
npm run dev # Runs on http://localhost:3001
```

---

## 9. Testing & Quality Expectations

Before pushing or opening a PR:
1. **Backend Tests**:
   ```bash
   python -m pytest backend/tests -v
   ```
2. **Frontend Type-Check & Build**:
   ```bash
   npm run lint
   npm run build
   ```
3. **Commit Conventions**: Use Conventional Commits with domain scopes (`feat(evidence): ...`, `fix(governance): ...`, `test(ai): ...`).

---

## 10. Known Gaps, Inconsistencies & Implementation Realities

1. **Celery Worker vs In-Memory Fallback**:
   - While `backend/app/workers/celery_app.py` is configured, local development defaults to an in-memory `ThreadPoolExecutor` if `REDIS_URL` is omitted.
2. **Ollama Hardware Sensitivity**:
   - Running `qwen3:8b` on CPU-only machines can take 12–25 seconds per analysis run; tests mock the Ollama client via `unittest.mock` or use the heuristic fallback.
3. **Direct Database Session in Tests**:
   - Integration tests in `backend/tests/` use SQLite in-memory or mock fixtures. Real Postgres connections must observe the 8-connection ceiling.
4. **Multi-Domain Workspaces**:
   - The frontend contains supplementary domain sections (e.g., `/app/career`, `/app/learning`) that build on top of Domains 1–4. The 4 foundational domains remain the authoritative core.

---

## 11. Mandatory Checklist for Starting Any New Task

Before writing or modifying code:
- [ ] **Identify the Responsible Domain**: Does this belong to Evidence Workspace (1), Skill Intelligence (2), AI Intelligence (3), or Trust & Governance (4)?
- [ ] **Read Canonical Documentation**: Check the corresponding domain doc in `docs/domains/`.
- [ ] **Inspect Existing Code**: Confirm actual models in `backend/app/models/`, routes in `backend/app/api/`, or UI components in `src/components/`. Do not recreate existing utilities.
- [ ] **Respect Connection Limits**: Ensure all new DB operations use `Depends(get_db)` or scoped session managers.
- [ ] **Verify Provenance & Trust**: Never persist synthetic skills without citation backing or bypass the Hallucination Guard.
- [ ] **Verify Locally**: Run `pytest` on affected test suites and `npx tsc --noEmit` before concluding the task.
