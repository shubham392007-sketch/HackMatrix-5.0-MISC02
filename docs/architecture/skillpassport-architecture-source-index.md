# SkillPassport Architecture Source Index & Implementation Audit

## 1. Executive Summary & Repository Scope

This document serves as the authoritative companion audit index for the **SkillPassport Complete System Architecture Explorer** (`skillpassport-system-architecture.html`), generated via the Archify deterministic compiler.

### Repository Architecture & Technology Overview
- **Root Repository**: `D:\HackMatrix-MISC02`
- **Frontend Application**: `skillpassport-powered-by-growthlens/` (Next.js 16.3.6 App Router with Turbopack, React 19.2.8, React-DOM 19.2.8, TypeScript 5.9.3, Tailwind CSS 4.3.3)
- **Backend Application**: `skillpassport-powered-by-growthlens/backend/` (FastAPI 0.133.1 ASGI, Uvicorn 0.41.0, SQLAlchemy 2.0.51 QueuePool, Pydantic 2.13.0)
- **Local AI Inference Engine**: Ollama running locally at `http://localhost:11434`:
  - Generative Reasoning: `qwen3:8b` (8.2B Q4_K_M, `num_ctx: 8192`, `ollama_timeout_seconds: 180.0`)
  - Vector Embeddings: `nomic-embed-text` (768-dimensional dense vectors, Euclidean L2 distance)
  - Document OCR Vision: `glm-ocr:latest` (1.1B Vision model via Ollama multimodal endpoint + PyMuPDF 1.25.5 fallback)
- **Vector Database**: Embedded persistent ChromaDB instance (`ChromaDB 1.5.9` via `chromadb.PersistentClient`) at `backend/data/chroma_db`, managing collection `skill_passport_evidence`.
- **Relational Database & Storage**: Supabase Managed PostgreSQL 15.8 (`pooler.supabase.com:6543`) with SQLAlchemy `QueuePool` and Supabase Storage S3 buckets (`evidence-originals`, `evidence-derivatives`).
- **Complete Traceability Matrix**: For exhaustive package versions, data flow dependencies, and runtime implementation status across all 16 architectural categories, consult [skillpassport-technology-stack.md](file:///d:/HackMatrix-MISC02/docs/architecture/skillpassport-technology-stack.md).

---

## 2. Implementation Truth Classification

Every architectural subsystem within SkillPassport has been audited directly against the executable codebase:

| Subsystem / Flow | Implementation Status | Grounding Source Files |
| :--- | :--- | :--- |
| **Authentication & Profile Provisioning** | **Implemented & Verified in Code** | `backend/app/api/auth.py`, `backend/app/api/profile.py`, `backend/app/models/user_profile.py`, `src/app/login/page.tsx`, `src/app/auth/verify-email/page.tsx` |
| **Multi-Format Extraction (PDF/DOCX/PPTX)** | **Implemented & Verified in Code** | `backend/app/extraction/document_extractor.py`, `backend/app/extraction/engine.py`, `backend/app/api/documents.py` |
| **Vision OCR (GLM-OCR via Ollama)** | **Implemented & Verified in Code** | `backend/app/extraction/ocr_service.py`, `backend/app/core/config.py` (`glm-ocr`), PyMuPDF fitz rendering |
| **Chunking & Text Normalization** | **Implemented & Verified in Code** | `backend/app/extraction/document_extractor.py` (`clean_text`), `backend/app/models/document.py` (`document_chunks`) |
| **ChromaDB Vector Store** | **Implemented & Verified in Code** | `backend/app/rag/chroma.py` (`ChromaEvidenceStore`), `backend/app/api/evidence.py` (`/search`), `backend/app/api/health.py` |
| **Ollama Dense Vector Embeddings** | **Implemented & Verified in Code** | `backend/app/core/config.py` (`nomic-embed-text`), `backend/app/rag/chroma.py` |
| **GitHub & Jira Workplace Connectors** | **Implemented & Verified in Code** | `backend/app/api/connections.py`, `backend/app/models/connection.py`, `backend/app/models/sync_run.py`, `backend/app/integrations/jira_connector.py` |
| **Web Portfolio Ingestion** | **Implemented & Verified in Code** | `backend/app/api/portfolio.py`, `backend/app/models/web_crawl.py` (SSRF protected) |
| **Evidence Intelligence Core** | **Implemented & Verified in Code** | `backend/app/api/evidence.py`, `backend/app/models/evidence.py`, `src/app/app/evidence/library/page.tsx` |
| **Ollama Qwen3 8B Skill Extraction** | **Implemented & Verified in Code** | `backend/app/api/ai.py`, `backend/app/ai/extractor.py`, `backend/app/core/config.py` (`qwen3:8b`, `num_ctx: 8192`) |
| **Hallucination Guard & Trust Engine** | **Implemented & Verified in Code** | `backend/app/models/ai_governance.py`, `backend/app/ai/guard.py`, `src/app/app/ai/guard/page.tsx` |
| **Human Review Queue & Verification** | **Implemented & Verified in Code** | `backend/app/models/ai_governance.py` (`human_review_tasks`), `backend/app/api/passport.py`, `src/app/app/ai/review-queue/page.tsx` |
| **Canonical Skills & Taxonomy** | **Implemented & Verified in Code** | `backend/app/models/taxonomy.py`, `backend/app/api/passport.py`, `src/app/app/passport/skills/page.tsx`, `src/app/app/passport/taxonomy/page.tsx` |
| **Career & Role Intelligence** | **Implemented & Verified in Code** | `backend/app/api/career.py`, `backend/app/models/career.py`, `src/app/app/career/page.tsx`, `src/app/app/career/match/page.tsx` |
| **Learn & Grow Diagnostic & Roadmap** | **Implemented & Verified in Code** | `src/app/app/learning/page.tsx`, `src/app/app/learning/roadmaps/[pathId]/page.tsx`, `src/app/app/learning/projects/page.tsx` |
| **Sharing Permissions Synchronization** | **Implemented & Verified in Code** | `backend/app/api/sharing.py`, `backend/app/models/sharing.py` (`user_passport_configs.sharing_permissions`), `src/app/app/passport/permissions/page.tsx` |
| **Create Share Link & Token Snapshots** | **Implemented & Verified in Code** | `backend/app/api/sharing.py` (`POST /links`), `backend/app/models/sharing.py` (`share_links`), `src/app/app/passport/share/page.tsx` |
| **8 Passport Templates Architecture** | **Implemented & Verified in Code** | `src/types/sharing.ts`, `src/components/passport/TemplateSelector.tsx`, `src/app/p/[shareId]/page.tsx` |
| **Public Recruiter View & Projection** | **Implemented & Verified in Code** | `backend/app/api/sharing.py` (`GET /public/{token}`), `src/app/p/[shareId]/page.tsx` (Strict unverified claim stripping) |
| **Recruiter Messaging & Inquiries** | **Implemented & Verified in Code** | `backend/app/api/sharing.py` (`POST /public/{token}/inquiries`), `backend/app/models/sharing.py` (`recruiter_messages`, `user_notifications`) |
| **Evidence Vault & Settings** | **Implemented & Verified in Code** | `backend/app/api/vault.py`, `src/app/app/settings/vault/page.tsx`, `src/app/app/settings/profile/page.tsx` |
| **Supabase Realtime Notifications** | **Partially Verified (Local Polling Fallback Active)** | `src/context/EvidenceContext.tsx` (Supabase Realtime channel with 15s auto-retry fallback) |
| **Automated Background Bulk Re-Indexer** | **Planned / Unimplemented** | Inline upsert per document exists; background batch collection re-vectorization across embedding model versions is currently manual/unimplemented. |

---

## 3. ChromaDB & Vector Architecture Deep-Dive

### A. ChromaDB Instance Configuration
- **File Implementation**: `backend/app/rag/chroma.py`
- **Class**: `ChromaEvidenceStore`
- **Deployment Mode**: Embedded `chromadb.PersistentClient` with persistent file storage on disk.
- **Persistence Path**: `backend/data/chroma_db` (resolves relative to `backend/app/rag/chroma.py`).
- **Telemetry**: `ChromaSettings(anonymized_telemetry=False)` (air-gapped privacy).
- **Health Check**: `chroma_store.client.heartbeat()` exposed on `GET /api/v1/health`.

### B. Collection Schema & Parameters
- **Collection Name**: `"skill_passport_evidence"`
- **Collection Metadata**: `{"description": "SkillPassport Domain 1 Evidence Vectors"}`
- **Vector Document String Template**:
  ```
  Title: {title}
  Description: {description}
  Excerpt: {excerpt}
  ```
- **Metadata Key-Value Schema**:
  - `owner_user_id` (str): UUID of the authenticated candidate (enforces strict tenant isolation).
  - `source_provider` (str): Source type identifier (`document_upload`, `github`, `jira`, `web_portfolio`).
  - `category` (str): Functional domain (`engineering`, `design`, `management`, `certification`, etc.).
  - `strength` (str): Evidence depth evaluation (`insufficient`, `low`, `medium`, `strong`).
  - `verification_status` (str): Current review state (`unreviewed`, `verified`, `flagged_for_human_review`).
  - `title` (str): Truncated title string (first 100 characters).

### C. Similarity Metric & Distance Mapping
- **Metric**: Euclidean ($L_2$) distance.
- **Relevance Score Formulation**:
  ```python
  relevance_score = round(max(0.0, 1.0 - distance), 3)
  ```
  Distances under 1.0 yield positive relevance scores ($0.0 \dots 1.0$); distant items are capped at $0.0$.

### D. Semantic Search API & Tenant Isolation
- **Endpoint**: `POST /api/v1/evidence/search`
- **Handler**: `backend/app/api/evidence.py` (`search_evidence_vectors`)
- **Query Filter Enforcement**:
  ```python
  where_filter = {"owner_user_id": str(owner_user_id)}
  if category:
      where_filter = {
          "$and": [
              {"owner_user_id": str(owner_user_id)},
              {"category": str(category)}
          ]
      }
  ```
  Candidate users can **never** search or retrieve vectors belonging to other users.

---

## 4. Document Ingestion, Chunking & Indexing Pipeline

```
[Raw File / External Source]
        │
        ▼ (Stage 1: Source Registration & SHA-256 Deduplication)
[UploadedDocument / IngestionJob] ──► [PostgreSQL: uploaded_documents]
        │
        ▼ (Stage 2: Original File Persistence)
[Supabase Storage: evidence-originals] (private_storage_key)
        │
        ▼ (Stage 3: Multi-Format Extraction)
   ┌────┴──────────────────────────────┐
   ▼                                   ▼
[PyMuPDF / docx / pptx]        [GLM-OCR Vision Engine]
(Digital text extraction)      (Triggered if text < 150 chars or visual scan)
   └────┬──────────────────────────────┘
        │
        ▼ (Stage 4: Text Normalization & Clean)
[clean_text()] (Whitespace, control chars, unicode formatting)
        │
        ▼ (Stage 5: Deterministic Chunking)
[DocumentChunk Records] ──► [PostgreSQL: document_chunks (chunk_hash, page_num)]
        │
        ▼ (Stage 6: Vector Embedding & Taxonomy Mapping)
   ┌────┴───────────────────────────────────────┐
   ▼                                            ▼
[Ollama nomic-embed-text]              [Domain 1 Extraction Engine]
(768-dim dense vector)                 (Candidate Competencies extraction)
   │                                            │
   ▼                                            ▼
[ChromaDB Store: skill_passport_evidence]   [PostgreSQL: evidence_competency_mappings]
(Upsert by evidence_id + owner metadata)   (Status: 'candidate', confidence score)
```

### Stage 1 — Source Registration & Deduplication
- Files uploaded via `POST /api/v1/documents/upload`.
- SHA-256 hash calculated over raw file bytes.
- If existing document exists with identical hash for the user: returns existing record (`status: already_exists`), preventing duplicate token consumption and duplicate vector pollution.

### Stage 2 — Original Content Persistence
- Stored in private Supabase Storage vault (`evidence-originals` bucket).
- Path: `{user_id}/{sha256[:12]}_{filename}`.
- Relational mapping in `uploaded_documents` preserves `storage_bucket` and `private_storage_key`.
- **Architectural distinction**: Vector records in ChromaDB do **not** replace original files; ChromaDB stores dense text embeddings, PostgreSQL stores structured metadata, and Supabase Storage stores binary source bytes.

### Stage 3 — Content Extraction
- **PDF**: PyMuPDF (`fitz`). Evaluates page content. If text is $< 150$ characters or $< 25$ words or identity-only, triggers `ocr_service.ocr_fitz_page()` using `glm-ocr:latest`. Merges digital text with visual OCR text.
- **DOCX**: `python-docx`. Extracts headings into structured sections and parses tables.
- **PPTX**: `python-pptx`. Parses slides, shape text frames, and presenter notes.
- **TXT / MD**: Direct UTF-8 decode.
- **GitHub**: Commits, PR bodies, README text.
- **Jira**: Issue summaries, descriptions, acceptance criteria via JQL.

### Stage 4 — Text Normalization
- Handled in `backend/app/extraction/document_extractor.py` via `clean_text()`:
  - Replaces `\r`, `\t`, `\f`, `\v` with standard space.
  - Collapses redundant multiple spaces to single space.
  - Normalizes multiple linebreaks to `\n\n`.
  - Preserves code blocks and indentation structure.

### Stage 5 — Chunking & Chunk Hash Generation
- Generated per-page (PDF), per-section (DOCX), or per-slide (PPTX).
- Each chunk record in `document_chunks` includes:
  - `document_id`: UUID reference to parent document.
  - `page_or_slide_number`: integer index.
  - `section_title`: Section or heading title.
  - `chunk_index`: Sequence number.
  - `original_text`: Raw extracted text.
  - `normalized_text`: Cleaned text.
  - `extraction_method`: (`pymupdf_direct`, `pymupdf_ocr_merged`, `docx_parser`, `pptx_parser`).
  - `chunk_hash`: SHA-256 hash of the chunk text for cache verification.

### Stage 6 — Embedding Generation & Vector Upsert
- Handled via `chroma_store.index_evidence_item(...)`:
  - Builds document string combining Title, Description, and Excerpt.
  - Invokes `nomic-embed-text` embedding pipeline.
  - Performs `collection.upsert(ids=[evidence_id], documents=[doc_text], metadatas=[metadata])`.
  - Upsert semantics guarantee idempotency: re-running indexing updates the vector in place without creating duplicate records.

---

## 5. Relational State vs ChromaDB Vector State

| Architectural Property | Supabase PostgreSQL (`:6543`) | ChromaDB (`backend/data/chroma_db`) | Supabase Storage (`evidence-originals`) |
| :--- | :--- | :--- | :--- |
| **Role in Architecture** | Authoritative System of Record | Vector Retrieval & Semantic Search Engine | Binary Vault for Original Files |
| **Data Kept** | User accounts, evidence metadata, taxonomy ontology, verified skills, share links, messages | Dense 768-dim embeddings, search document strings, metadata filters | Raw PDF, DOCX, PPTX, PNG, JPG source binaries |
| **Consistency Mode** | ACID Transactions, Foreign Keys, RLS | In-memory HNSW index + local DuckDB persistence | Immutable object storage with signed URL access |
| **Tenant Isolation** | PostgreSQL Row-Level Security (`owner_user_id`) | Query filter: `where={"owner_user_id": str(user_id)}` | User folder paths: `{user_id}/*` |
| **Update Lifecycle** | SQLAlchemy transactions (`db.commit()`) | `collection.upsert()` by `evidence_id` | Overwrite or unique SHA-256 storage key |
| **Deletion Lifecycle** | Cascade delete or soft delete (`is_deleted=True`) | Explicit `collection.delete(ids=[evidence_id])` | `storage_manager.delete_file(storage_key)` |

---

## 6. Downstream Domain Consumers of Vector Retrieval

### 1. Evidence Workspace (Domain 1)
- Enables candidate semantic discovery: `POST /api/v1/evidence/search`.
- Candidate types natural language query ("Kubernetes cluster deployment"), ChromaDB returns top-k matching evidence items ranked by relevance score ($1.0 - \text{distance}$).

### 2. AI Intelligence & Hallucination Guard (Domain 2)
- When candidate claims are extracted by Ollama `qwen3:8b`, the Hallucination Guard (`backend/app/ai/guard.py`) performs vector retrieval against the user's indexed evidence chunks.
- If an extracted skill claim cannot be grounded in retrieved evidence excerpts with high semantic similarity, the claim is flagged with `unsubstantiated_claim` and routed to the Human Review Queue.

### 3. Canonical Skill Verification (Domain 2 / 6)
- Reviewers and admin auditors evaluate evidence against taxonomy skills (`backend/app/models/taxonomy.py`).
- Verification updates the evidence item in PostgreSQL and updates ChromaDB metadata (`verification_status: "verified"`), ensuring subsequent vector queries reflect verified status.

### 4. Career Intelligence & Role Alignment (Domain 3)
- Role requirement profiles query candidate evidence vectors to evaluate competency demonstration strength.
- Dynamic confidence scoring blends vector proximity with demonstration level.

### 5. Learn & Grow Roadmap Generator (Domain 4)
- Identifies skill gaps by finding competencies with missing or low-similarity evidence vectors, prioritizing roadmap steps.

### 6. Sharing Permissions & Public Recruiter Link (Domain 6)
- When a candidate configures Sharing Permissions, they specify evidence disclosure depth (`shareSummary=true, allowDetail=false`).
- In public recruiter view (`/p/:token`), ChromaDB is **never** exposed directly to public clients. The backend projection (`GET /api/v1/sharing/public/{token}`) evaluates the token's immutable permissions snapshot and returns only permitted sanitized excerpts.

---

## 7. Guided Story Flows (Meta Views in Architecture Explorer)

The interactive explorer (`skillpassport-system-architecture.html`) includes 5 guided visual journeys:

1. **Journey 1: Candidate Onboarding**
   - Candidate signup $\rightarrow$ Next.js Auth UI $\rightarrow$ FastAPI Auth Service $\rightarrow$ PostgreSQL profile persistence.
2. **Journey 2: Ingestion, Chunking & ChromaDB Indexing**
   - Document upload $\rightarrow$ PyMuPDF/GLM-OCR extraction $\rightarrow$ Text normalization $\rightarrow$ `DocumentChunk` creation $\rightarrow$ `nomic-embed-text` vectorization $\rightarrow$ ChromaDB upsert.
3. **Journey 3: Semantic Retrieval, RAG & Hallucination Guard**
   - Query execution $\rightarrow$ ChromaDB tenant-isolated vector search $\rightarrow$ Context assembly $\rightarrow$ Ollama Qwen3 evaluation $\rightarrow$ Citation grounding.
4. **Journey 4: Role Intelligence & Learning Gaps**
   - Career role profile selection $\rightarrow$ Verified competency matching $\rightarrow$ Skill-gap diagnosis $\rightarrow$ Personalized learning roadmap.
5. **Journey 5: Sharing Permissions Sync & Recruiter Gate**
   - Saved sharing permissions $\rightarrow$ Create share link pre-population $\rightarrow$ Immutable token snapshot $\rightarrow$ Public recruiter projection $\rightarrow$ Inquiries and messaging.

---

## 8. Failure Modes & Resilience Engineering

| Component | Failure Condition | Architectural Impact | Implemented Mitigation / Recovery |
| :--- | :--- | :--- | :--- |
| **ChromaDB Vector Store** | Local persistent file lock or corruption | Semantic search fails; vector index unreachable | `engine.py` wraps ChromaDB indexing in `try...except`, logging warnings without aborting relational database transactions. Relational records and files persist cleanly. Health check detects heartbeat. |
| **Ollama Local LLM** | Inference timeout (>180s) or crash | Generative extraction fails | Deterministic keyword-based extraction fallback (`_rule_based_extraction`) ensures candidate competencies are still populated. |
| **GLM-OCR Vision Engine** | Complex scanned image fails OCR | Text unreadable | PyMuPDF direct text layer used as fallback; document marked as `insufficient_content` with honest reason code rather than fabricating claims. |
| **Embedding Model Drift** | Changing `nomic-embed-text` to alternative model | Existing vectors in different vector space | **Architecture Gap Identified**: Vectors must be purged and re-indexed. Recommended enhancement: Add collection versioning (`skill_passport_evidence_v2`). |
| **Supabase Pooler** | Port 6543 connection pool exhausted | 503 Service Unavailable | SQLAlchemy `QueuePool` with automatic transaction rollback and connection pool recycling. |
| **Evidence Deletion** | Candidate deletes evidence item | Potential orphan vectors in ChromaDB | `DELETE /api/v1/evidence/{id}` explicitly invokes `chroma_store.delete_evidence_item(str(item.id))` before deleting database entities, ensuring zero orphaned vectors. |

---

## 9. Source Code File Reference Table

| Architecture Node | Type | Primary Source Implementation |
| :--- | :--- | :--- |
| `candidate` | External | User browser session accessing `http://localhost:3001` |
| `admin_reviewer` | External | Reviewer accessing `/app/ai/review-queue` |
| `recruiter` | External | Public recruiter accessing `/p/:token` |
| `fe_auth_app` | Frontend | `skillpassport-powered-by-growthlens/src/app/login/page.tsx` |
| `fe_evidence` | Frontend | `skillpassport-powered-by-growthlens/src/app/app/evidence/page.tsx` |
| `fe_ai_gov` | Frontend | `skillpassport-powered-by-growthlens/src/app/app/ai/guard/page.tsx` |
| `fe_skills` | Frontend | `skillpassport-powered-by-growthlens/src/app/app/passport/skills/page.tsx` |
| `fe_career` | Frontend | `skillpassport-powered-by-growthlens/src/app/app/career/page.tsx` |
| `fe_passport` | Frontend | `skillpassport-powered-by-growthlens/src/app/app/passport/share/page.tsx` |
| `fe_public` | Frontend | `skillpassport-powered-by-growthlens/src/app/p/[shareId]/page.tsx` |
| `be_auth_profile` | Backend | `skillpassport-powered-by-growthlens/backend/app/api/auth.py` |
| `be_evidence_ingest`| Backend | `skillpassport-powered-by-growthlens/backend/app/api/evidence.py`, `backend/app/extraction/engine.py` |
| `be_ai_guard` | Backend | `skillpassport-powered-by-growthlens/backend/app/ai/guard.py`, `backend/app/api/ai.py` |
| `be_skill_taxonomy` | Backend | `skillpassport-powered-by-growthlens/backend/app/api/passport.py`, `backend/app/models/taxonomy.py` |
| `be_career_engine` | Backend | `skillpassport-powered-by-growthlens/backend/app/api/career.py` |
| `be_sharing_api` | Backend | `skillpassport-powered-by-growthlens/backend/app/api/sharing.py` |
| `be_public_proj` | Backend | `skillpassport-powered-by-growthlens/backend/app/api/sharing.py` (`GET /public/{token}`) |
| `ext_sources` | External | GitHub REST API v3, Jira Cloud REST API v3 (`backend/app/integrations/jira_connector.py`) |
| `ai_ocr` | Cloud | GLM-OCR (`backend/app/extraction/ocr_service.py`, `backend/app/core/config.py`) |
| `ai_embed` | Cloud | Ollama Embeddings (`nomic-embed-text`, `backend/app/core/config.py`) |
| `ai_ollama` | Cloud | Ollama Qwen3 8B (`qwen3:8b`, `backend/app/ai/extractor.py`) |
| `storage_blobs` | Database | Supabase Storage (`backend/app/storage/file_storage.py`) |
| `chroma_db` | Database | ChromaDB Store (`backend/app/rag/chroma.py`, `backend/data/chroma_db`) |
| `db_postgres` | Database | Supabase PostgreSQL Pooler (`backend/app/db/session.py`, `backend/app/models/`) |
