# GrowthLens - Ollama Qwen3 8B Integration Audit

**Date:** 2026-09-28  
**System:** GrowthLens Continuous Talent Intelligence Platform  
**Target LLM:** Ollama `qwen3:8b` via `http://localhost:11434` (configurable via `OLLAMA_BASE_URL` & `OLLAMA_MODEL`)  
**Specification Reference:** HackMatrix 5.0 Qwen3 8B Integration Master Protocol  

---

## 1. Executive Summary & Architectural Integrity

The GrowthLens platform is structured around a continuous evidence-first intelligence philosophy across 4 interconnected features:
1. **Feature 1:** Evidence Intelligence & Automated Evidence Ingestion Engine (GitHub, Jira, Canonical Normalization, Qwen3 8B Extraction, Supabase PostgreSQL, ChromaDB Vector Store, RAG Justification).
2. **Feature 2:** Continuous Skill Trajectory & Decay Risk Engine (Deterministic Weibull hazard modeling, Half-life estimation, Counterfactual What-If simulator).
3. **Feature 3:** Next-Action Recommendation & Mentorship Engine (Declining skill triggers, YouTube tutorial curriculum, Internal peer mentorship routing).
4. **Feature 4:** Growth Intelligence & Longitudinal Talent Analytics (Auto-generated narrative summaries, Peer benchmarks, Confidence decay analysis, Team skill heatmap).

### Critical Constraint Adherence
- **LLM Role:** Qwen3 8B acts strictly as an **intelligence, explanation, and extraction layer**. It is **NOT** the source of truth, does **NOT** calculate raw scores or mathematical trajectories, and does **NOT** bypass recommendation catalogs or authorization rules.
- **Source of Truth:** PostgreSQL / Supabase for relational records; Weibull analytical models for trajectories; ChromaDB for employee-isolated vector search; FastAPI backend for authorization and access control.
- **Traceability:** Every claim, skill tag, or recommendation explanation produced by Qwen3 **must** cite verifiable evidence references (`evidence_refs`) backed by database records. Fabricated evidence IDs are rejected and trigger strict fallback to `INSUFFICIENT_EVIDENCE`.
- **Security & Privacy:** Credentials (GitHub PATs, Jira tokens, Supabase keys) are strictly sanitized prior to LLM interaction and never logged or stored in vector metadata.

---

## 2. Current Architecture & Integration Inventory

| Subsystem | Existing Implementation | Current State | Target Qwen3 8B Architecture |
| :--- | :--- | :--- | :--- |
| **LLM Runtime** | `backend/llm/ollama_provider.py` | Direct HTTP client to Ollama `/api/generate` | Centralized `ChatOllama` (`langchain_ollama`) + robust fallback HTTP client |
| **LLM Service** | `backend/llm/service.py` | Basic skill extraction helper | Central `QwenService` in `backend/app/ai/qwen_service.py` supporting all 4 features |
| **Prompt Management** | `backend/llm/prompts.py`, `backend/rag/prompts.py` | Scattered string builders | Modular prompt templates (`backend/app/ai/prompts/`) with delimiter protection |
| **Structured Output** | `backend/llm/schemas.py`, `backend/rag/schemas.py` | Partial Pydantic models | Central schemas (`backend/app/ai/schemas/`) with strict validation & retry |
| **Output Validation** | In-file regexes | Ad-hoc | Dedicated `LLMOutputValidator` (`backend/app/ai/validators/`) verifying evidence IDs in DB |
| **Vector Search (RAG)** | `backend/vectorstore/repository.py` | ChromaDB collection with `employee_id` filter | LangChain + ChromaDB pipeline with explicit delimiter shielding against prompt injection |
| **Feature 1 Link** | `backend/services/ingestion.py` | Calls `llm_service.extract_skills_from_evidence` | Integrates with central `QwenService.extract_evidence()` |
| **Feature 2 Link** | `routers/retention.py`, `services/retention_service.py` | Pure analytical Weibull output | Integrates with `QwenService.explain_trend()` to explain trajectories |
| **Feature 3 Link** | `routers/recommendations.py` | Rule-based YouTube & mentor router | Integrates with `QwenService.explain_recommendation()` grounded in evidence |
| **Feature 4 Link** | `feature-4/backend/` | Pre-computed statistical summaries | Integrates with `QwenService.generate_narrative()` with evidence citation tags |

---

## 3. Existing Feature Dependencies & Data Flows

```
[Raw Sources: GitHub / Jira]
        │
        ▼
[Normalizers & Identity Resolver]
        │
        ▼
[Canonical Evidence (Pydantic)]
        │
        ├─────────────────────────────────────────┐
        ▼                                         ▼
[Supabase PostgreSQL (Source of Truth)]   [Central Qwen Service (Ollama Qwen3 8B)]
        │                                         │
        │ ◄───────────────────────────────────────┘ (Extracted skills, competencies, summaries)
        ▼
[ChromaDB Vector Store (Embeddings + Metadata)]
        │
        ▼
[RAG Evidence Retriever (Strict employee_id Isolation)]
        │
        ▼
[Qwen3 8B RAG Justification Engine (Delimiter Shielding)]
        │
        ├────────────────────────┬────────────────────────┐
        ▼                        ▼                        ▼
[Feature 2 Trajectory]   [Feature 3 Next-Action]   [Feature 4 Growth Narrative]
(Weibull explanations)  (Why this tutorial/mentor)  (Cited employee story)
```

---

## 4. Files Designated for Modification & Addition

### New Files to Create (Central AI Module: `backend/app/ai/`)
1. `backend/app/ai/__init__.py`
2. `backend/app/ai/ollama_client.py` - Reusable `ChatOllama` / HTTP client with safe logging, timeouts, and health checking.
3. `backend/app/ai/qwen_service.py` - Central orchestrator for all Qwen3 8B operations.
4. `backend/app/ai/health.py` - Deep health check for Ollama connection, model availability, and latency.
5. `backend/app/ai/retry.py` - Two-stage structured retry with strict correction prompts.
6. `backend/app/ai/prompts/`:
   - `__init__.py`
   - `system_prompt.py` (Central system prompt with delimiter instructions)
   - `evidence_extraction.py`
   - `skill_tagging.py`
   - `rag_justification.py`
   - `trend_explanation.py`
   - `recommendation_explanation.py`
   - `narrative_generation.py`
   - `insufficient_evidence.py`
7. `backend/app/ai/schemas/`:
   - `__init__.py`
   - `evidence_schema.py`
   - `skill_schema.py`
   - `justification_schema.py`
   - `trend_schema.py`
   - `recommendation_schema.py`
   - `narrative_schema.py`
8. `backend/app/ai/validators/`:
   - `__init__.py`
   - `llm_output_validator.py` - Verifies evidence references against Supabase records; strips hallucinated references.
9. `backend/api/routes/ai.py` - Internal authenticated FastAPI endpoints (`/api/ai/health`, `/api/ai/evidence/extract`, `/api/ai/trends/explain`, etc.).
10. `backend/tests/test_qwen_ai.py` - Comprehensive unit and integration test suite for the Qwen layer.
11. Complete technical documentation in `docs/`:
    - `docs/ollama-architecture.md`
    - `docs/qwen-integration.md`
    - `docs/qwen-prompt-design.md`
    - `docs/qwen-security.md`
    - `docs/qwen-testing.md`
    - `docs/ollama-troubleshooting.md`

### Files to Update
1. `backend/main.py` & root `main.py`: Register `/api/ai` router.
2. `backend/services/ingestion.py`: Connect to central `QwenService`.
3. `backend/rag/generator.py` & `backend/rag/service.py`: Wire into `QwenService` for RAG justification.
4. `routers/retention.py`: Connect trajectory explanation to `QwenService.explain_trend`.
5. `routers/recommendations.py`: Connect action justification to `QwenService.explain_recommendation`.
6. `.env.example`: Ensure `OLLAMA_BASE_URL` and `OLLAMA_MODEL` are documented cleanly.

### Files That Must NOT Be Modified
- `frontend/src/` core UI layout, styling, and design components (preserving the Pedyssey/Neo-Editorial visual language).
- `models/weibull_model.py` and core mathematical hazard/decay functions.
- `backend/db/client.py` (Supabase database connection).
- `backend/core/security.py` core cryptographic and token handling logic.
- `.env` (Never commit or push).

---

## 5. Security & Isolation Matrix

| Layer | Threat Vector | Mitigation Strategy |
| :--- | :--- | :--- |
| **Ingestion** | Malicious commit/issue text | Delimiter encapsulation (`<RETRIEVED_EVIDENCE>`); prompt instructs Qwen to treat content as data only. |
| **Multi-Tenancy** | Cross-employee evidence leak | Strict `employee_id` filter mandatory on vector queries and relational queries before reaching LLM. |
| **Hallucination** | Invented evidence IDs / metrics | `LLMOutputValidator` validates every cited ID against database; auto-strips invalid IDs; defaults to `insufficient_evidence`. |
| **Model Drift** | Changed trend interpretations | Qwen strictly prohibited from altering deterministic trend status (`improving`, `stagnating`, `declining`). |
| **Credentials** | Secret leakage in prompts or logs | Regex sanitizers strip JWTs, API tokens, PATs before LLM ingestion and before writing to structured logs. |

---

## 6. Execution Plan & Gate Criteria

- **Phase 1:** Repository audit & documentation (COMPLETE).
- **Phase 2:** Ollama client & connection health verification.
- **Phase 3:** Central Qwen service, schemas, prompts, retry, and validators.
- **Phase 4:** Feature 1 Evidence Extraction integration.
- **Phase 5:** Feature 1 RAG pipeline integration.
- **Phase 6:** Feature 2 Trajectory & What-If explanation integration.
- **Phase 7:** Feature 3 Recommendation explanation integration.
- **Phase 8:** Feature 4 Growth Narrative & Manager summary integration.
- **Phase 9:** Security, isolation, and prompt injection testing.
- **Phase 10:** Full end-to-end pipeline verification and technical documentation.
