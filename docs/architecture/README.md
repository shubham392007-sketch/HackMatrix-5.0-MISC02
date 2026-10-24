# SkillPassport System Architecture Explorer

This directory contains the complete, source-grounded system architecture documentation for **SkillPassport**, generated using **Archify** (a deterministic, typed JSON-IR architecture renderer and validation engine).

---

## 1. Deliverables in this Directory

| File | Purpose |
| :--- | :--- |
| **`skillpassport-system-architecture.html`** | **Primary Deliverable**: Standalone, interactive HTML architecture explorer with light/dark themes, 5 guided story views, search, focus filtering, ChromaDB vector indexing, and node inspector with embedded technology stack badges and cards. |
| **`skillpassport-system-architecture.architecture.json`** | **Archify Source Model**: Validated JSON-IR representation modeling all components (Frontend, Backend, ChromaDB, Ollama Embeddings, Ollama Qwen3, GLM-OCR, Supabase PostgreSQL, Storage Vault), boundaries, connections, Git repository evidence, and native Archify technology cards. |
| **`skillpassport-technology-stack.md`** | **Technology Stack & Traceability Matrix**: Comprehensive, source-verified breakdown of all 16 technology categories, model version reconciliations (Qwen 3 8B, Nomic-Embed-Text, GLM-OCR), and component-level data flows. |
| **`skillpassport-architecture-source-index.md`** | **Source Traceability Index**: Comprehensive audit mapping every domain, route, endpoint, vector schema, extraction pipeline, database model, and failure recovery path to executable codebase files. |
| **`README.md`** | This guide explaining how to view, validate, and regenerate the architecture diagram. |

---

## 2. How to View the Architecture Diagram

### Option A: Local Web Server (Recommended)
With the Next.js development server running (`localhost:3001`), the interactive architecture is hosted at:
👉 **[http://localhost:3001/archify/generated/skillpassport-system-architecture.html](http://localhost:3001/archify/generated/skillpassport-system-architecture.html)**

You can also browse the full Archify visualization portal at:
👉 **[http://localhost:3001/archify/index.html](http://localhost:3001/archify/index.html)**

### Option B: Direct File Opening
You can open `docs/architecture/skillpassport-system-architecture.html` directly in any modern web browser (Google Chrome, Microsoft Edge, Safari, Firefox). The file is completely self-contained with embedded vector styles and interactive JavaScript runtime.

---

## 3. How to Validate & Regenerate with Archify

Archify is globally linked via `npm link` in this environment. You can validate and compile the diagram from the project root:

```powershell
# 1. Run Archify diagnostic health check
archify doctor

# 2. Validate JSON-IR layout constraints and source evidence (0 errors, 0 warnings)
archify validate architecture docs/architecture/skillpassport-system-architecture.architecture.json --quality standard --repo-root .

# 3. Render interactive HTML deliverable
archify render architecture docs/architecture/skillpassport-system-architecture.architecture.json docs/architecture/skillpassport-system-architecture.html --quality standard --repo-root .

# 4. Run geometric SVG checks (0 errors, 0 warnings)
archify check docs/architecture/skillpassport-system-architecture.html
```

---

## 4. Architecture Views & Guided Journeys

The interactive explorer includes 5 predefined guided journeys accessible from the top toolbar:

1. **`1. Candidate Onboarding`**: Traces candidate registration, email verification fallback, session validation, and profile initialization into PostgreSQL.
2. **`2. Ingestion, Chunking & ChromaDB`**: Follows workplace evidence from GitHub/Jira/Files through GLM-OCR, deterministic text normalization, `DocumentChunk` creation, `nomic-embed-text` vectorization, and ChromaDB persistent storage.
3. **`3. Semantic Retrieval, RAG & AI Guard`**: Visualizes Euclidean vector distance querying, candidate grounding, Hallucination Guard verification against evidence vectors, and Canonical Competency Taxonomy mapping.
4. **`4. Role Intelligence & Learning Gaps`**: Visualizes target role mapping, market demand alignment, skill-gap analysis, dynamic confidence scoring, and personalized learning roadmaps.
5. **`5. Sharing Permissions Sync & Recruiter Gate`**: Follows Content Builder, Sharing Permissions synchronization, Create Share Link token snapshots, public recruiter projection (`/p/:token`), and recruiter inquiries.
