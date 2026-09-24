# GrowthLens — AI-Driven Evidence Extraction & RAG Pipeline
**HackMatrix 5.0 Track:** MISC02 – Continuous Talent Intelligence & Skill Growth  
**Implementation:** Backend-First Prototype  
**Technologies:** FastAPI, Supabase PostgreSQL, Ollama (Qwen3 8B), ChromaDB, LangChain

---

## 1. Architecture Overview

GrowthLens establishes an automated, evidence-grounded talent intelligence pipeline:

```text
REAL WORK ACTIVITY (GitHub / Jira)
       │
       ▼
EVIDENCE INGESTION SERVICE
       │
       ▼
CANONICAL EVIDENCE NORMALIZER
       │
       ▼
EMPLOYEE IDENTITY RESOLVER (integration_identities)
       │
       ▼
AI EVIDENCE EXTRACTION (Local Qwen3 8B via Ollama)
       │
       ▼
SKILL TAXONOMY NORMALIZER (competencies & skills in Supabase)
       │
       ├───► Supabase PostgreSQL (Structured Source of Truth)
       │
       ▼
LOCAL ONNX EMBEDDINGS (all-MiniLM-L6-v2)
       │
       ▼
CHROMADB VECTOR STORE (growthlens_evidence)
       │
       ▼
EMPLOYEE-SCOPED RETRIEVAL (Strict Isolation Filter)
       │
       ▼
LANGCHAIN RAG JUSTIFICATION ENGINE (Qwen3 8B)
       │
       ▼
EVIDENCE-GROUNDED OUTPUT + TRACEABLE REFERENCES
```

---

## 2. Global Architecture & Security Rules

1. **Evidence is the source of truth:** The LLM interprets evidence; it never manufactures evidence.
2. **Traceability:** Every AI conclusion outputs internal `evidence_refs` verifiable against Supabase and original GitHub/Jira sources.
3. **Employee Isolation:** Employee A's evidence is filtered strictly at the database layer and can NEVER leak to Employee B.
4. **Credential Security:** GitHub/Jira credentials and the Supabase Service Role Key are strictly backend-only and never appear in logs, prompts, vector stores, or API responses.
5. **Honest Insufficiency:** If evidence is lacking, the engine explicitly outputs `"evidence_sufficiency": "insufficient"` and `"action": null` rather than hallucinating advice.

---

## 3. Setup Instructions

### Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager
- [Ollama](https://ollama.com/) with `qwen3:8b` model pulled (`ollama pull qwen3:8b`)
- Supabase Project

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the credentials:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Secret service-role key
- `DATABASE_URL`: PostgreSQL direct connection string
- `OLLAMA_BASE_URL`: `http://localhost:11434`
- `OLLAMA_MODEL`: `qwen3:8b`
- `GITHUB_TOKEN`: Personal Access Token (for GitHub sync)
- `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`: Jira Cloud credentials

### Installation
Install all dependencies using `uv`:
```bash
uv sync
```

### Database Migrations
Apply the initial schema:
```bash
.venv/Scripts/python.exe run_migration.py
```
This sets up 13 tables:
- `employees`
- `competencies`
- `skills`
- `employee_competencies`
- `integration_identities`
- `integrations`
- `evidence` (with dedup constraint on `source, source_reference`)
- `evidence_skills`
- `evidence_competencies`
- `ingestion_runs`
- `unmapped_skill_candidates`
- `recommendations`
- `recommendation_evidence`

---

## 4. Running the Backend

Start the FastAPI application:
```bash
.venv/Scripts/python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```
Interactive API documentation:
- **Swagger UI:** [http://localhost:8080/docs](http://localhost:8080/docs)
- **ReDoc:** [http://localhost:8080/redoc](http://localhost:8080/redoc)

---

## 5. API Reference

### Health
- `GET /api/health`: Comprehensive health check of FastAPI, Supabase, Ollama, and ChromaDB.

### Integrations (GitHub & Jira)
- `POST /api/integrations/github/test`: Test GitHub token and rate limits.
- `GET /api/integrations/github/status`: Inspect GitHub integration status.
- `POST /api/integrations/github/sync`: Synchronize commits and PRs, extract skills, and index vectors.
- `POST /api/integrations/jira/test`: Test Jira credentials.
- `GET /api/integrations/jira/status`: Inspect Jira integration status.
- `POST /api/integrations/jira/sync`: Synchronize Jira issues, extract skills, and index vectors.

### Identity Mapping
- `POST /api/integrations/identities/map`: Map an external GitHub username or Jira email to an employee ID.
- `GET /api/integrations/identities/{employee_id}`: List all identities registered to an employee.

### Evidence Management
- `GET /api/evidence/{employee_id}`: List chronological evidence for an employee.
- `GET /api/evidence/{employee_id}/{evidence_id}`: Detail view of single evidence with extracted skills/competencies.
- `POST /api/evidence/process`: Ingest a manual canonical evidence item.
- `POST /api/evidence/{evidence_id}/extract`: Trigger on-demand AI skill extraction for an evidence item.

### RAG & Intelligence
- `POST /api/rag/search`: Semantic vector search scoped strictly to an employee.
- `POST /api/rag/justify`: Execute Evidence Justification Engine (Qwen3 8B RAG) for a competency.

### Ingestion Tracking
- `GET /api/ingestion/runs`: History of all sync runs with counts (found, processed, skipped, failed).
- `GET /api/ingestion/runs/{run_id}`: Detailed diagnostics for an ingestion run.

---

## 6. Running Tests

Run the full automated test suite:
```bash
.venv/Scripts/python.exe -m pytest backend/tests/ -v
```

Tests include:
- `test_evidence_schema.py`: Canonical evidence validation and bounding.
- `test_normalization.py`: GitHub and Jira raw-to-canonical normalization.
- `test_identity_mapping.py`: External identity resolution and rejection of unmapped entities.
- `test_extraction.py`: Qwen3 structured JSON parsing and confidence boundary enforcement.
- `test_taxonomy.py`: Synonym normalization, taxonomy resolution, and unmapped candidate tracking.
- `test_security.py`: Cross-employee vector isolation and leak prevention.
- `test_rag.py`: Prompt builder, hallucinated reference stripping, and insufficient evidence handling.
- `test_e2e_pipeline.py`: Full multi-source ingestion, AI extraction, vector indexing, and RAG justification.

---

## 7. Current Limitations & Next Steps

- **Round 01 Scope:** Trajectory classification (LSTM / improving / stagnating / declining) is deliberately deferred to the subsequent GrowthLens module as specified in the blueprint.
- **OAuth:** Direct personal access tokens are utilized for the prototype; full OAuth 2.0 app flow will be implemented in subsequent phases.
- **Web UI:** Minimal test interface and Swagger UI provided; production dashboard to be developed separately.
