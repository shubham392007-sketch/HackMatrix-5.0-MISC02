# SkillPassport Complete Technology Stack & Traceability Matrix

## 1. Executive Overview & Architecture Foundation

This document defines the authoritative, source-verified **Technology Stack and Architectural Traceability Matrix** for the **SkillPassport** platform. SkillPassport is an enterprise-grade AI-powered skill verification, career intelligence, and recruiter disclosure engine.

Every technology, library, model, driver, and protocol detailed in this document has been directly audited against the executable codebase in `D:\HackMatrix-MISC02`, including `skillpassport-powered-by-growthlens/package.json`, lockfiles, `skillpassport-powered-by-growthlens/requirements.txt`, active Python virtual environments, and configuration files (`backend/app/core/config.py`, `.env`).

---

## 2. Model & Version Reconciliation

Historical documentation and early draft diagrams referenced legacy models and generic stack labels. The table below documents the official reconciliation between historical references and the actual codebase runtime:

| Architectural Component | Historical / Legacy Label | Actual Codebase Implementation | Verified Version & Parameter Specification | Verification Source |
| :--- | :--- | :--- | :--- | :--- |
| **Generative Reasoning LLM** | `qwen2.5:7b-instruct` | `qwen3:8b` | **Qwen 3 (8.2B params)**, GGUF Q4_K_M, Context Window: `8,192 tokens`, Temperature: `0.1` (extraction) / `0.2` (matching), Timeout: `180.0s` | `backend/app/core/config.py:27`, `backend/app/ai/extractor.py:22` |
| **Vector Embedding Model** | Generic "Embeddings" | `nomic-embed-text` | **Nomic Embed Text v1.5**, 768-dimensional dense vectors, Euclidean L2 distance metric | `backend/app/core/config.py:30`, `backend/app/rag/chroma.py:38` |
| **Vision OCR Engine** | Generic "OCR" / Tesseract | `glm-ocr:latest` | **GLM-OCR (1.1B Vision model)** via Ollama multimodal API endpoint + PyMuPDF (`fitz`) rasterization fallback | `backend/app/core/config.py:31`, `backend/app/extraction/ocr_service.py:16` |
| **Relational Database** | Local Postgres | Supabase PostgreSQL | **PostgreSQL 15.8** via Supabase Transaction Pooler (`pooler.supabase.com:6543`), SQLAlchemy `QueuePool` | `backend/app/core/config.py:18`, `.env` |
| **Vector Database** | PostgreSQL pgvector | ChromaDB | **ChromaDB 1.5.9** embedded `PersistentClient` at `backend/data/chroma_db`, collection `skill_passport_evidence` | `backend/app/rag/chroma.py:14`, `requirements.txt` |
| **Object File Storage** | Local Disk / S3 | Supabase Storage S3 | Supabase S3-compatible buckets (`evidence-originals`, `evidence-derivatives`) via Supabase Python SDK `storage3` | `backend/app/core/config.py:23`, `backend/app/api/documents.py:53` |
| **Frontend Framework** | Next.js 14 | Next.js 16 App Router | **Next.js 16.3.6** with Turbopack, React 19.2.8, React-DOM 19.2.8, TypeScript 5.9.3 | `package.json:20`, `package-lock.json` |
| **Styling Engine** | Tailwind CSS v3 | Tailwind CSS v4 | **Tailwind CSS 4.3.3** via `@tailwindcss/postcss 4.3.3`, CSS variables theme tokens | `package.json:42`, `src/app/globals.css` |

---

## 3. Comprehensive 16-Category Technology Stack Breakdown

### 3.1. Frontend Application
- **Framework**: [Next.js 16.3.6](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L20) (App Router architecture, React Server Components & Client boundary components, Turbopack dev compiler).
- **Core UI Runtime**: [React 19.2.8](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L21) and [React-DOM 19.2.8](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L22).
- **Language**: [TypeScript 5.9.3](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L44) (Strict typechecking, isolatedModules, comprehensive schema definitions).
- **Styling & Design System**: [Tailwind CSS 4.3.3](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L42) with `@tailwindcss/postcss 4.3.3`, `@tailwindcss/typography`, and CSS variables custom palette (`#0F172A`, `#1E293B`, `#2563EB`, `#10B981`, `#F59E0B`, `#EF4444`).
- **Icons & Visuals**: [Lucide React 1.55.0](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L24) (semantic iconography) and [Lottie-Web 5.13.0](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L25) (smooth vector animations).
- **Frontend State Management**: React Context API (`EvidenceContext.tsx`, `AuthContext.tsx`, `ThemeContext.tsx`) with optimistic local UI updates and synchronization hooks.
- **Client Supabase SDK**: [`@supabase/ssr 0.12.7`](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L18) and [`@supabase/supabase-js 2.117.3`](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/package.json#L19).
- **Quality & Linting**: ESLint `9.39.5` with `eslint-config-next 16.3.6`.

### 3.2. Backend Application & API
- **Framework**: [FastAPI 0.133.1](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/main.py#L1) (high-throughput asynchronous ASGI web framework).
- **ASGI Server**: [Uvicorn 0.41.0](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/main.py#L90) with uvloop event-loop acceleration.
- **Data Validation & Settings**: [Pydantic 2.13.0](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/schemas/evidence.py#L1) and [pydantic-settings 2.13.1](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/core/config.py#L1) (`BaseSettings` environment management).
- **HTTP Client**: [HTTPX 0.28.1](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/ai/extractor.py#L3) (asynchronous connection pooling for Ollama LLM queries and external APIs).
- **CORS & Middleware**: Starlette `1.0.1` CORSMiddleware with strict allow-origins (`http://localhost:3000`, `http://localhost:3001`, production domains).
- **API Documentation**: OpenAPI 3.1.0 with Swagger UI (`/docs`) and ReDoc (`/redoc`).

### 3.3. Authentication & Identity
- **Provider**: Supabase Auth (GoTrue) with JWT Bearer Token validation.
- **Client-Side Auth**: `@supabase/ssr` cookies and browser sessions.
- **Server-Side Verification**: [PyJWT 2.11.0](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/api/deps.py#L1) and [cryptography 46.0.7](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/requirements.txt#L20) verifying RS256/HS256 tokens against `SUPABASE_JWT_SECRET`.
- **Identity Fallback**: Local dev email verification bypass and token generation for air-gapped testing (`backend/app/api/auth.py`).
- **Role-Based Access Control**: Strict principal scopes (`candidate`, `reviewer`, `recruiter`, `admin`).

### 3.4. Relational Database & ORM
- **Database Engine**: **PostgreSQL 15.8** hosted on Supabase Cloud.
- **Connection Mode**: Supabase Session / Transaction Pooler via port `6543` (`pooler.supabase.com:6543`).
- **ORM**: [SQLAlchemy 2.0.51](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/db/session.py#L1) with both `AsyncSession` (via asyncpg / psycopg) and scoped `Session` with `QueuePool` (pool size: 10, max overflow: 20, pool pre-ping: enabled).
- **Database Driver**: [psycopg2-binary 2.9.11](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/requirements.txt#L5).
- **Schema Migrations**: [Alembic 1.18.5](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/requirements.txt#L4) with linear version history (`alembic/versions/`).
- **Key Tables**: `user_profiles`, `documents`, `document_chunks`, `evidence_items`, `candidate_skills`, `verified_skills`, `canonical_skills`, `skill_relationships`, `human_review_tasks`, `ai_guard_audit_logs`, `career_targets`, `role_benchmarks`, `skill_gap_analyses`, `user_passport_configs`, `share_links`, `recruiter_messages`, `user_notifications`.

### 3.5. Object & File Storage
- **Storage Provider**: Supabase Storage (AWS S3-compatible blob backend).
- **Client Library**: [Supabase Python SDK 2.31.0](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/core/config.py#L4) with `storage3 2.31.0`.
- **Buckets**:
  - `evidence-originals`: Immutable raw binary evidence (PDF, DOCX, PPTX, JPG, PNG).
  - `evidence-derivatives`: Extracted image crops, OCR overlays, and exported PDF passports.
- **Access Policy**: Private buckets accessed via time-limited signed URLs (TTL: 3,600 seconds) or authorized backend proxies.

### 3.6. Document Extraction, Parsing & OCR
- **PDF Extraction**: [PyMuPDF 1.25.5 (`fitz`)](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/extraction/document_extractor.py#L12) for layout-preserving text, metadata, and page rendering to high-res pixmaps (300 DPI).
- **Word Processing (DOCX)**: [python-docx 1.2.0](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/extraction/document_extractor.py#L13) with table extraction, header hierarchy preservation, and XML block normalization.
- **Presentations (PPTX)**: [python-pptx 1.0.2](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/extraction/document_extractor.py#L14) with slide-by-slide shape traversal, speaker notes ingestion, and table extraction.
- **Raster Images & Graphics**: [Pillow 11.3.0 (`PIL`)](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/extraction/ocr_service.py#L6) for color space conversion, contrast enhancement, and thumbnail generation.
- **Vision OCR Engine**: [GLM-OCR (`glm-ocr:latest`)](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/extraction/ocr_service.py#L16) executed via Ollama Multimodal API, providing visual bounding-box coordinate tracking and markdown table extraction.
- **Web Content & Articles**: [Trafilatura 2.3.1](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/api/portfolio.py#L12) and [BeautifulSoup4 4.15.0](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/extraction/document_extractor.py#L15) with strict boilerplate removal and SSRF protection.

### 3.7. Embeddings & Vector Search
- **Vector Database**: [ChromaDB 1.5.9](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/rag/chroma.py#L14) embedded `PersistentClient`.
- **Vector Store Persistence**: Local disk storage at `backend/data/chroma_db` (fully persistent, SQLite + Parquet index engine).
- **Embedding Model**: `nomic-embed-text` (via Ollama `http://localhost:11434/api/embeddings`).
- **Embedding Vector Dimension**: **768 dimensions** (dense float32 vectors).
- **Distance Metric**: Euclidean L2 Distance (`"hnsw:space": "l2"`).
- **Collection**: `skill_passport_evidence`.
- **Search Capabilities**: Top-K nearest neighbor retrieval, distance threshold filtering, metadata filtering by `user_id` and `document_id`.

### 3.8. Generative AI & LLM Inference
- **Inference Server**: [Ollama](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/backend/app/core/config.py#L26) local server at `http://localhost:11434`.
- **Primary Model**: `qwen3:8b` (Qwen 3 8.2B parameters, Q4_K_M quantized GGUF).
- **Context Window**: `num_ctx: 8192` tokens.
- **Timeout**: `ollama_timeout_seconds: 180.0s`.
- **Inference Tasks**:
  - Unstructured skill candidate extraction with structured JSON schemas (`backend/app/ai/extractor.py`).
  - Evidence-claim grounding and Hallucination Guard scoring (`backend/app/ai/guard.py`).
  - Career role competency matching and skill gap synthesis (`backend/app/api/career.py`).
  - Personalized project-based learning curriculum generation (`backend/app/api/learning.py`).

### 3.9. Indexing Lifecycle & Data Pipelines
- **Pipeline Stages**:
  1. **Upload & Storage**: Raw binary saved to Supabase Storage `evidence-originals`.
  2. **Extraction**: Text extracted via PyMuPDF/python-docx/GLM-OCR.
  3. **Normalization**: Deterministic regex cleaning (`clean_text()`), newline collapsing, whitespace stripping.
  4. **Chunking**: Sliding window chunking (500-1000 tokens) with 100-token overlap, stored in `document_chunks`.
  5. **Embedding**: Batched calls to Ollama `nomic-embed-text` generating 768-dim vectors.
  6. **Vector Upsert**: Upsert to ChromaDB `skill_passport_evidence` with document metadata.
  7. **RAG Retrieval**: Real-time semantic similarity retrieval for AI reasoning and validation.

### 3.10. Workplace & External Integrations
- **GitHub Integration**: GitHub REST API v3 / GraphQL API via HTTPX (`backend/app/models/connection.py`), extracting repositories, pull request diffs, code commits, and PR reviews.
- **Jira Integration**: Jira Cloud REST API v3 (`backend/app/integrations/jira_connector.py`), ingesting completed epics, user stories, issue comments, and changelogs.
- **Web Portfolio Scraper**: Trafilatura web scraper with SSRF IP validator (`backend/app/api/portfolio.py`), extracting projects, publications, and case studies.

### 3.11. Background Jobs & Asynchronous Processing
- **Queue Framework**: [Celery 5.6.3](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/requirements.txt#L24) configured for distributed asynchronous task execution.
- **Message Broker / Result Backend**: [Redis 5.4.1](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/requirements.txt#L25) (`redis://localhost:6379/0`).
- **Inline Asynchronous Tasks**: FastAPI `BackgroundTasks` used for non-blocking local vector synchronization, email notifications, and audit logging.
- **Sync Runs**: Managed via `sync_runs` table tracking status, error traces, items ingested, and execution time.

### 3.12. Caching & Realtime Communication
- **Realtime Notifications**: Supabase Realtime (PostgreSQL WAL logical replication via WebSockets) syncing notifications and verification status changes to the client.
- **Client Resilience**: 15-second automatic polling fallback in React `EvidenceContext.tsx` if WebSocket connection is interrupted.
- **In-Memory Cache**: LRU caching for canonical taxonomy terms and role benchmark definitions to minimize repetitive database queries.

### 3.13. Security, Validation & Governance
- **Request Validation**: Pydantic v2 strict schemas enforcing input formats, string lengths, and payload boundaries.
- **Database Protection**: Parameterized queries via SQLAlchemy preventing SQL injection.
- **SSRF Protection**: Strict IP address and hostname validator in web crawl pipeline blocking private IP ranges (`10.0.0.0/8`, `127.0.0.0/8`, `192.168.0.0/16`, AWS metadata `169.254.169.254`).
- **Cryptographic Tokens**: Cryptographically secure random tokens (`secrets.token_urlsafe(32)`) for public passport share links with optional expiry and password hashing.
- **AI Hallucination Guard**: Multi-factor trust scoring comparing claims against raw evidence excerpts and ChromaDB vector proximity; claims < 0.70 confidence routed to `human_review_tasks`.
- **Public Projection Security**: Recruiter view (`/p/:token`) executes strict projection logic stripping unverified skills, confidential evidence files, and candidate personal contact info unless explicitly authorized in `sharing_permissions`.

### 3.14. Testing & Quality Assurance
- **Backend Test Framework**: [PyTest 8.4.2](file:///d:/HackMatrix-MISC02/skillpassport-powered-by-growthlens/requirements.txt#L28) with `pytest-asyncio 0.26.3`.
- **Archify Validation**: `archify validate architecture` (strict AST and constraint engine) and `archify check` (geometric SVG renderer check).
- **Code Linting & Formatting**: ESLint 9, Flake8, Black, TypeScript `tsc --noEmit`.

### 3.15. Deployment & Runtime Infrastructure
- **Operating System Target**: Windows 11 / Linux (Ubuntu 22.04 LTS / Debian 12).
- **Frontend Runtime**: Node.js 20+ LTS executing Next.js on port `3001` (dev) / `3000` (prod).
- **Backend Runtime**: Python 3.11+ ASGI process executing Uvicorn on port `8001`.
- **AI Runtime**: Ollama daemon on port `11434` with GPU acceleration (NVIDIA CUDA / DirectML).
- **Database Infrastructure**: Supabase Cloud managed PostgreSQL on port `6543`.

### 3.16. Observability, Logging & Failure Recovery
- **Application Logging**: Python standard `logging` with structured JSON format and log rotation.
- **Health Checks**: Comprehensive health endpoint at `GET /api/v1/health` checking:
  - Database connectivity (`SELECT 1`).
  - ChromaDB heartbeat (`chroma_store.client.heartbeat()`).
  - Ollama connectivity (`GET http://localhost:11434/api/tags`).
- **Audit Logging**: `ai_guard_audit_logs` table persisting all LLM prompts, input excerpts, generated claims, confidence scores, and verification outcomes.
- **Failure Recovery**: Exponential backoff on Ollama HTTP queries (up to 3 retries), graceful document extraction fallback (from native text to OCR), and circuit-breaker patterns on workplace API integrations.

---

## 4. End-to-End Component-to-Technology Traceability Matrix

The table below maps every domain and component to its verified technology stack, package versions, data flow dependencies, executable source files, and implementation status:

| Domain | Component Name | Technology & Verified Version | Purpose & Architectural Responsibility | Dependencies & Data Flow | Executable Source Reference | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Domain 1** | Candidate Portal | Next.js 16.3.6, React 19.2.8, Tailwind CSS 4.3.3 | Main entrypoint for candidates to register, manage evidence, view skills, and configure passports. | Connects to Next.js Client Context and invokes FastAPI endpoints via HTTP. | `src/app/page.tsx`, `src/app/app/dashboard/page.tsx` | Verified in Source & Runtime |
| **Domain 1** | Auth & Identity | Supabase Auth, PyJWT 2.11.0, cryptography 46.0.7 | Manages user registration, email verification, JWT bearer token signing, and session validation. | Issues JWT tokens used in HTTP `Authorization: Bearer` headers across all protected endpoints. | `backend/app/api/auth.py`, `src/app/login/page.tsx`, `src/app/auth/verify-email/page.tsx` | Verified in Source & Runtime |
| **Domain 1** | Profile Provisioning | FastAPI 0.133.1, SQLAlchemy 2.0.51, PostgreSQL 15.8 | Initializes user profiles, onboarding preferences, current job titles, and career goals. | Writes to `user_profiles` table upon successful email verification. | `backend/app/api/profile.py`, `backend/app/models/user_profile.py` | Verified in Source & Runtime |
| **Domain 2** | Multi-Format Ingest | PyMuPDF 1.25.5, python-docx 1.2.0, python-pptx 1.0.2 | Extracts text and structure from uploaded PDF, DOCX, and PPTX files. | Receives multipart uploads, extracts text, writes raw file to Supabase Storage. | `backend/app/extraction/document_extractor.py`, `backend/app/api/documents.py` | Verified in Source & Runtime |
| **Domain 2** | Vision OCR Engine | GLM-OCR (`glm-ocr:latest`), Ollama, Pillow 11.3.0 | Transcribes scanned documents, screenshots, and visual certificates with coordinate tracking. | Triggered when PyMuPDF detects < 50 characters of native text per page. | `backend/app/extraction/ocr_service.py`, `backend/app/core/config.py` | Verified in Source & Runtime |
| **Domain 2** | Chunking & Normalize | Python re, Pydantic 2.13.0, SQLAlchemy 2.0.51 | Cleans text, collapses whitespace, splits text into 500-1000 token sliding chunks with overlap. | Takes raw extracted text, writes chunk records to `document_chunks` table. | `backend/app/extraction/document_extractor.py`, `backend/app/models/document.py` | Verified in Source & Runtime |
| **Domain 2** | Storage Vault | Supabase Storage (`storage3 2.31.0`), AWS S3 API | Secure, encrypted cloud object storage for immutable raw evidence and extracted artifacts. | Stores uploaded files into `evidence-originals` bucket; generates time-limited signed URLs. | `backend/app/core/config.py`, `backend/app/api/documents.py` | Verified in Source & Runtime |
| **Domain 2** | Workplace VCS & Jira | HTTPX 0.28.1, Jira REST API v3, GitHub API | Integrates workplace activity data (GitHub commits/PRs, Jira issues/epics). | Pulls work activity, writes to `sync_runs` and creates `evidence_items`. | `backend/app/integrations/jira_connector.py`, `backend/app/api/connections.py` | Verified in Source & Runtime |
| **Domain 2** | Web Portfolio Crawl | Trafilatura 2.3.1, BeautifulSoup4 4.15.0, ipaddress | Ingests candidate portfolio URLs, blog posts, and technical writeups with SSRF protection. | Validates host IP, fetches HTML, extracts clean markdown, creates `evidence_items`. | `backend/app/api/portfolio.py`, `backend/app/models/web_crawl.py` | Verified in Source & Runtime |
| **Domain 2** | Vector Embeddings | Ollama `nomic-embed-text`, HTTPX 0.28.1 | Generates 768-dimensional dense vector embeddings for document chunks and queries. | Receives chunk text, returns float32 vector array to `ChromaEvidenceStore`. | `backend/app/core/config.py`, `backend/app/rag/chroma.py` | Verified in Source & Runtime |
| **Domain 2** | ChromaDB Vector Store | ChromaDB 1.5.9, SQLite, Parquet, HNSW index | Embedded vector database providing high-speed semantic nearest-neighbor search. | Persists vectors to `backend/data/chroma_db`; provides vector distance querying for RAG. | `backend/app/rag/chroma.py`, `backend/app/api/evidence.py` | Verified in Source & Runtime |
| **Domain 3** | Evidence Core | FastAPI 0.133.1, Pydantic 2.13.0, SQLAlchemy 2.0.51 | Central catalog managing ingested evidence items, verification metadata, and tags. | Manages `evidence_items` table; exposes REST API for evidence management. | `backend/app/api/evidence.py`, `backend/app/models/evidence.py` | Verified in Source & Runtime |
| **Domain 3** | Ollama Qwen3 8B LLM | Ollama `qwen3:8b` (8.2B Q4_K_M, num_ctx: 8192) | Deep semantic reasoning engine for skill extraction, claim validation, and career matching. | Receives prompts with retrieved evidence context, returns structured JSON responses. | `backend/app/ai/extractor.py`, `backend/app/core/config.py` | Verified in Source & Runtime |
| **Domain 3** | Hallucination Guard | Python, SQLAlchemy 2.0.51, PostgreSQL 15.8 | Evaluates generated skill claims against raw evidence excerpts and ChromaDB vector distance. | Calculates confidence score (0.0-1.0); writes audit records to `ai_guard_audit_logs`. | `backend/app/ai/guard.py`, `backend/app/models/ai_governance.py` | Verified in Source & Runtime |
| **Domain 3** | Human Review Queue | Next.js 16.3.6, FastAPI 0.133.1, SQLAlchemy 2.0.51 | Interface for human reviewers to inspect, approve, or reject skill claims flagged by AI Guard. | Queries `human_review_tasks`; updates `candidate_skills` status upon human decision. | `backend/app/models/ai_governance.py`, `src/app/app/ai/review-queue/page.tsx` | Verified in Source & Runtime |
| **Domain 3** | Human Reviewer | Web Browser, Next.js Client Components | Subject matter expert or manager reviewing low-confidence claims. | Interacts with Review Queue UI; performs manual verification. | `src/app/app/ai/review-queue/page.tsx` | Verified in Source & Runtime |
| **Domain 4** | Skill Verification | FastAPI 0.133.1, SQLAlchemy 2.0.51, PostgreSQL 15.8 | Transitions verified claims into immutable, authoritative skill credentials. | Writes verified skills into `verified_skills` table with cryptographic checksums. | `backend/app/api/passport.py`, `backend/app/models/passport.py` | Verified in Source & Runtime |
| **Domain 4** | Canonical Taxonomy | SQLAlchemy 2.0.51, PostgreSQL 15.8 | Hierarchical skill taxonomy mapping extracted variants to standardized industry concepts. | Maps `candidate_skills` to `canonical_skills` and `skill_relationships`. | `backend/app/models/taxonomy.py`, `src/app/app/passport/taxonomy/page.tsx` | Verified in Source & Runtime |
| **Domain 5** | Career & Role Match | FastAPI 0.133.1, Ollama `qwen3:8b`, PostgreSQL 15.8 | Analyzes skill alignment against target role benchmarks; identifies skill gaps. | Reads `verified_skills`, queries `role_benchmarks`, writes `skill_gap_analyses`. | `backend/app/api/career.py`, `backend/app/models/career.py` | Verified in Source & Runtime |
| **Domain 5** | Learn & Grow | Next.js 16.3.6, FastAPI 0.133.1, Ollama `qwen3:8b` | Synthesizes personalized learning roadmaps, courses, and hands-on projects to close skill gaps. | Reads `skill_gap_analyses`, invokes Ollama to generate roadmaps and recommended projects. | `src/app/app/learning/page.tsx`, `src/app/app/learning/roadmaps/[pathId]/page.tsx` | Verified in Source & Runtime |
| **Domain 6** | Passport Builder | Next.js 16.3.6, React 19.2.8, Lucide React | Visual editor for selecting verified skills, featured evidence, bio, and custom sections. | Edits passport drafts; synchronizes with `user_passport_configs` in PostgreSQL. | `src/app/app/passport/builder/page.tsx`, `backend/app/api/sharing.py` | Verified in Source & Runtime |
| **Domain 6** | Permissions Sync | FastAPI 0.133.1, PostgreSQL 15.8, Next.js 16.3.6 | Configures and persists fine-grained profile, skill, and evidence disclosure permissions. | Writes to `user_passport_configs.sharing_permissions`; auto-seeds Create Share Link wizard. | `backend/app/api/sharing.py`, `src/app/app/passport/permissions/page.tsx` | Verified in Source & Runtime |
| **Domain 6** | Share Link Generator | Python secrets, Pydantic 2.13.0, PostgreSQL 15.8 | Generates cryptographically secure share links (`/p/:token`) with snapshot permissions. | Creates `share_links` records with unique `share_token`, expiry, and access control flags. | `backend/app/api/sharing.py`, `src/app/app/passport/share/page.tsx` | Verified in Source & Runtime |
| **Domain 6** | Public Recruiter View | Next.js 16.3.6 (Edge-compatible), Tailwind CSS 4.3.3 | Renders read-only, projection-filtered passport to external recruiters across 8 templates. | Fetches `GET /api/v1/sharing/public/{token}`, strictly omitting unverified or private data. | `src/app/p/[shareId]/page.tsx`, `src/components/passport/TemplateSelector.tsx` | Verified in Source & Runtime |
| **Domain 6** | Recruiter Messaging | FastAPI 0.133.1, PostgreSQL 15.8, Supabase Realtime | Ingests recruiter inquiries and interview requests; creates candidate notifications. | Writes to `recruiter_messages` and `user_notifications`; triggers Supabase Realtime event. | `backend/app/api/sharing.py`, `backend/app/models/sharing.py` | Verified in Source & Runtime |
| **Domain 6** | Recruiter | External Web Browser, Desktop / Mobile | Hiring manager or talent partner reviewing verified credentials and evidence. | Accesses public passport URL; submits recruiter inquiry. | `src/app/p/[shareId]/page.tsx` | Verified in Source & Runtime |
| **Cross-Cutting** | Background Workers | Celery 5.6.3, Redis 5.4.1, FastAPI BackgroundTasks | Asynchronous execution of heavy document parsing, vector indexing, and sync runs. | Receives async tasks from FastAPI; executes out-of-band; updates database status. | `requirements.txt`, `backend/app/api/connections.py` | Configured & Ready |
| **Cross-Cutting** | Supabase PostgreSQL | PostgreSQL 15.8, PgBouncer (:6543) | Primary relational persistent database for application state, metadata, and security. | Connects to FastAPI via SQLAlchemy `QueuePool` on port `6543`. | `backend/app/core/config.py`, `backend/app/db/session.py` | Verified in Source & Runtime |

---

## 5. Architectural Boundaries & Data Flow Pathways

The SkillPassport system is organized into four distinct runtime boundaries:

```
+---------------------------------------------------------------------------------------------------------+
|                                        EXTERNAL ACTORS BOUNDARY                                         |
|                                                                                                         |
|   [Candidate Portal]                 [Human Reviewer]                     [Recruiter Persona]           |
|   (Next.js 16 Client)                (Next.js 16 Client)                  (Web Browser / Read-Only)     |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼ HTTP / TLS 1.3
+---------------------------------------------------------------------------------------------------------+
|                                        APPLICATION TIER BOUNDARY                                        |
|                                                                                                         |
|   Next.js 16 App Router (Port 3001)                                                                     |
|   ├── React 19 Client Components & Hooks (EvidenceContext, AuthContext)                                 |
|   └── Turbopack Fast Refresh & TypeScript 5.9 Type Validation                                          |
|                                                                                                         |
|   FastAPI Asynchronous Web Engine (Port 8001)                                                           |
|   ├── Route Controllers (auth, profile, documents, evidence, ai, career, passport, sharing, vault)      |
|   ├── PyMuPDF 1.25.5 / python-docx 1.2.0 / python-pptx 1.0.2 / Trafilatura 2.3.1 Ingestion Handlers     |
|   ├── Hallucination Guard & Trust Engine (Evidence excerpt cross-checking)                              |
|   └── Public Projection Filter (Strict unverified claim stripping for /p/:token)                       |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                        ┌────────────────────────────┴────────────────────────────┐
                        ▼                                                         ▼
+-----------------------------------------------+       +-------------------------------------------------+
|               AI TIER BOUNDARY                |       |             PERSISTENCE TIER BOUNDARY           |
|                                               |       |                                                 |
|   Ollama Daemon (Port 11434)                  |       |   Supabase Cloud PostgreSQL 15.8 (Port 6543)    |
|   ├── qwen3:8b (8.2B, num_ctx: 8192)          |       |   ├── 22 Relational Tables with Foreign Keys    |
|   ├── nomic-embed-text (768-dim Embeddings)   |       |   └── SQLAlchemy 2.0.51 QueuePool Connection    |
|   └── glm-ocr:latest (1.1B Vision OCR)        |       |                                                 |
|                                               |       |   Supabase S3 Storage Vault                     |
|   Local Persistent ChromaDB (Port/Disk)       |       |   ├── evidence-originals (Raw binaries)         |
|   ├── ChromaDB 1.5.9 (PersistentClient)       |       |   └── evidence-derivatives (Crops/PDFs)         |
|   ├── backend/data/chroma_db Storage          |       |                                                 |
|   └── collection: skill_passport_evidence     |       |   External Workplace APIs                       |
|       (Euclidean L2 distance search)          |       |   ├── GitHub REST v3 & GraphQL APIs             |
|                                               |       |   └── Jira Cloud REST API v3                    |
+-----------------------------------------------+       +-------------------------------------------------+
```

---

## 6. Verification Commands & Health Audit

To verify the technology stack components and runtime health, run the following diagnostic commands from the repository root:

```powershell
# 1. Check Node.js and Next.js frontend dependencies
cd skillpassport-powered-by-growthlens
npm list next react react-dom typescript tailwindcss @supabase/ssr @supabase/supabase-js

# 2. Check Python backend dependencies
pip list | Select-String "fastapi|uvicorn|sqlalchemy|alembic|chromadb|pymupdf|httpx|celery|redis"

# 3. Check local Ollama models and context parameters
ollama list
ollama show qwen3:8b --parameters
ollama show nomic-embed-text --parameters

# 4. Check backend API health endpoint (verifies DB, ChromaDB, and Ollama)
curl.exe -s http://127.0.0.1:8001/api/v1/health | ConvertFrom-Json | Format-List

# 5. Check Archify architecture diagram compilation and geometric checks
cd ..
archify validate architecture docs/architecture/skillpassport-system-architecture.architecture.json --quality standard --repo-root .
archify check docs/architecture/skillpassport-system-architecture.html
```
