# Technical Requirements Document (TRD)

## AI-Driven Evidence Extraction & RAG Pipeline

**Project:** GrowthLens
**Hackathon:** HackMatrix 5.0
**Track:** MISC02 – Continuous Talent Intelligence & Skill Growth
**Feature:** AI-Driven Evidence Extraction & RAG Pipeline
**Implementation Phase:** Backend-first prototype
**Primary Integrations:** GitHub, Jira
**LLM:** Qwen3 8B via Ollama
**RAG:** LangChain + ChromaDB
**Structured Database:** Supabase PostgreSQL

This TRD defines the technical implementation requirements for the evidence-extraction feature described in the MISC02 roadmap. The roadmap calls for automated parsing of GitHub/Jira/internal project-management data, automated skill tagging, and a LangChain + ChromaDB RAG pipeline that can retrieve concrete evidence such as commits, missed questions, or project roadblocks to justify subsequent actions. 

---

## 1. Technical Objective

The objective is to build a backend pipeline that converts raw employee/project activity into **structured, searchable, traceable evidence**.

The technical flow is:

```text
GitHub / Jira
      ↓
External API Integration
      ↓
Raw Evidence Retrieval
      ↓
Evidence Normalization
      ↓
Employee Identity Resolution
      ↓
AI Evidence Extraction
      ↓
Skill / Competency Tagging
      ↓
Supabase PostgreSQL
      ↓
Embedding Generation
      ↓
ChromaDB
      ↓
LangChain Retrieval
      ↓
Qwen3 8B
      ↓
Evidence-Grounded Output
      ↓
Evidence References
```

This layer will later feed the longitudinal competency and recommendation components of GrowthLens.

The broader blueprint describes the platform as combining multiple evidence sources into a longitudinal skill profile, with evidence fusion preceding trend classification and recommendation generation. 

---

# 2. Technical Scope

### Included

The implementation must contain:

* GitHub API integration.
* Jira API integration.
* External identity mapping.
* Evidence ingestion.
* Evidence normalization.
* Evidence deduplication.
* AI evidence extraction.
* Automated skill tagging.
* Competency mapping.
* Supabase persistence.
* Embedding generation.
* ChromaDB indexing.
* Employee-scoped semantic retrieval.
* LangChain RAG orchestration.
* Qwen3 8B generation through Ollama.
* Evidence references.
* Evidence sufficiency handling.
* Confidence metadata.
* Ingestion-run tracking.
* API endpoints.
* Error handling.
* Security controls.
* Automated tests.

### Excluded

This feature must not implement:

* final UI/UX;
* employee dashboard;
* manager dashboard;
* final skill visualization;
* improving/stagnating/declining classification;
* LSTM trajectory model;
* skill half-life forecasting;
* benchmarking;
* mentorship matching;
* what-if simulation;
* full learning-platform integration.

The broader blueprint assigns those capabilities to later GrowthLens layers. 

---

# 3. System Architecture

The backend should use the following logical architecture:

```text
                    ┌───────────────┐
                    │    GitHub     │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ GitHub Client  │
                    └───────┬───────┘
                            │
                            │
                    ┌───────▼───────┐
                    │ Jira Client    │
                    └───────┬───────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Evidence Ingestion  │
                 │     Service         │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ Evidence Normalizer │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ Identity Resolver   │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ Canonical Evidence │
                 └──────────┬──────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      ┌────────────────┐        ┌────────────────┐
      │ Supabase       │        │ Qwen3 8B       │
      │ PostgreSQL     │        │ via Ollama     │
      └───────┬────────┘        └───────┬────────┘
              │                         │
              │                         ▼
              │                ┌─────────────────┐
              │                │ Skill /         │
              │                │ Competency      │
              │                │ Extraction      │
              │                └────────┬────────┘
              │                         │
              └────────────┬────────────┘
                           ▼
                  ┌──────────────────┐
                  │ Embedding Layer  │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │    ChromaDB      │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │ LangChain RAG    │
                  │ Retrieval        │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │ Qwen3 8B         │
                  │ Justification    │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │ Structured API   │
                  │ Response         │
                  └──────────────────┘
```

---

# 4. Technology Requirements

| Layer          | Technology                                   | Requirement                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| API            | FastAPI                                      | Required backend API layer                  |
| Database       | Supabase PostgreSQL                          | Structured source of truth                  |
| Authentication | Supabase Auth                                | Use where authentication exists/is required |
| LLM            | Qwen3 8B                                     | Local inference                             |
| LLM Runtime    | Ollama                                       | Local model serving                         |
| RAG Framework  | LangChain                                    | Retrieval/generation orchestration          |
| Vector Store   | ChromaDB                                     | Semantic evidence retrieval                 |
| Source 1       | GitHub API                                   | Project/code evidence                       |
| Source 2       | Jira API                                     | Project/task evidence                       |
| Validation     | Pydantic                                     | Request/response/LLM schema validation      |
| Testing        | Project-appropriate Python testing framework | Unit/integration testing                    |

The MISC02 roadmap explicitly identifies Ollama/local LLMs, ChromaDB, and LangChain as part of the planned technical direction. 

---

# 5. Backend Module Architecture

Recommended structure:

```text
backend/
│
├── main.py
│
├── api/
│   ├── routes/
│   │   ├── health.py
│   │   ├── github.py
│   │   ├── jira.py
│   │   ├── evidence.py
│   │   ├── rag.py
│   │   └── ingestion.py
│   │
│   └── dependencies/
│
├── core/
│   ├── config.py
│   ├── logging.py
│   ├── security.py
│   └── exceptions.py
│
├── db/
│   ├── client.py
│   ├── repositories/
│   └── migrations/
│
├── models/
│
├── schemas/
│
├── integrations/
│   ├── github/
│   │   ├── client.py
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── normalizer.py
│   │
│   └── jira/
│       ├── client.py
│       ├── service.py
│       ├── schemas.py
│       └── normalizer.py
│
├── evidence/
│   ├── service.py
│   ├── normalizer.py
│   ├── deduplication.py
│   └── extraction.py
│
├── llm/
│   ├── service.py
│   ├── ollama.py
│   ├── prompts.py
│   └── schemas.py
│
├── embeddings/
│   └── service.py
│
├── vectorstore/
│   ├── chroma.py
│   └── repository.py
│
├── rag/
│   ├── retriever.py
│   ├── prompts.py
│   ├── generator.py
│   ├── service.py
│   └── schemas.py
│
└── tests/
```

The exact structure can be adapted to the existing repository. The requirement is separation of responsibilities, not a particular directory naming convention.

---

# 6. Configuration Requirements

Create a backend `.env.example`.

Required configuration:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b

CHROMA_HOST=
CHROMA_PORT=

EMBEDDING_PROVIDER=
EMBEDDING_MODEL=

GITHUB_TOKEN=
GITHUB_REPOSITORY_OWNER=
GITHUB_REPOSITORY_NAME=

JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=
```

Actual secrets must never be committed.

The Supabase service-role key must remain backend-only.

---

# 7. GitHub Technical Requirements

## 7.1 Authentication

For the prototype, use a GitHub access token.

OAuth is not required for the first implementation.

The backend must:

1. load the token securely;
2. create an authenticated GitHub client;
3. validate credentials;
4. validate repository access.

---

## 7.2 Data Retrieval

Initially support:

### Commits

Retrieve:

* SHA;
* commit message;
* author;
* timestamp;
* repository;
* URL;
* relevant statistics.

### Pull Requests

Retrieve:

* PR number;
* title;
* body;
* author;
* status;
* created time;
* updated time;
* merged time;
* URL.

Do not ingest an entire repository.

Do not blindly send complete diffs to Qwen3.

Large content must be bounded before entering the LLM context.

---

# 8. Jira Technical Requirements

## 8.1 Authentication

Prototype configuration:

```text
JIRA_BASE_URL
JIRA_EMAIL
JIRA_API_TOKEN
```

The Jira token must remain backend-side.

---

## 8.2 Data Retrieval

Initially support relevant Jira:

* issues;
* summaries;
* descriptions;
* status;
* resolution;
* timestamps;
* project;
* assignee;
* relevant comments.

Do not ingest unrelated Jira data.

---

# 9. Canonical Evidence Schema

All external sources must eventually become:

```json
{
  "evidence_id": "uuid",
  "employee_id": "uuid",
  "source": "github",
  "source_type": "commit",
  "source_reference": "commit-sha-or-url",
  "project_id": "project-id",
  "project_name": "project-name",
  "title": "commit title",
  "content": "normalized evidence content",
  "occurred_at": "timestamp",
  "evidence_type": "project_activity",
  "evidence_strength": 0.82,
  "metadata": {}
}
```

Provider-specific information belongs inside `metadata` when needed.

The core schema must remain provider-independent.

---

# 10. Employee Identity Resolution

External identities require explicit mapping.

Technical model:

```text
integration_identities

id
employee_id
provider
external_user_id
external_username
external_email
created_at
updated_at
```

Example:

```text
EMPLOYEE:
EMP001

GitHub:
username = example-dev

Jira:
email = employee@example.com
```

Both can map to the same employee.

If no mapping exists:

```text
status = unmapped
```

The system must not automatically guess.

---

# 11. Supabase Data Model

Required conceptual tables:

### employees

```text
id
user_id
name
email
role
department
created_at
updated_at
```

### competencies

```text
id
name
description
created_at
updated_at
```

### skills

```text
id
name
description
competency_id
created_at
updated_at
```

### employee_competencies

```text
id
employee_id
competency_id
current_level
created_at
updated_at
```

`current_level` must not be treated as the final longitudinal trajectory calculation.

### integration_identities

```text
id
employee_id
provider
external_user_id
external_username
external_email
created_at
updated_at
```

### integrations

```text
id
provider
owner_id
status
configuration_metadata
created_at
updated_at
```

### evidence

```text
id
employee_id
source
source_type
source_reference
project_id
project_name
title
content
occurred_at
evidence_type
evidence_strength
metadata
created_at
updated_at
```

### evidence_skills

```text
evidence_id
skill_id
extraction_confidence
created_at
```

### evidence_competencies

```text
evidence_id
competency_id
extraction_confidence
created_at
```

### ingestion_runs

```text
id
source
status
started_at
completed_at
records_found
records_processed
records_skipped
records_failed
error_summary
```

Additional recommendation tables should only be introduced when required by the RAG output implementation.

---

# 12. Database Constraints

Implement:

* primary keys;
* foreign keys;
* unique constraints;
* timestamps;
* indexes.

Important indexes:

```text
evidence.employee_id
evidence.source
evidence.source_type
evidence.occurred_at

evidence_skills.skill_id
evidence_competencies.competency_id

integration_identities.employee_id
integration_identities.provider
```

Evidence must support provider-specific deduplication.

---

# 13. Evidence Deduplication

GitHub:

```text
provider + repository + commit SHA
```

Jira:

```text
provider + Jira instance + issue key + relevant version/update
```

If the same evidence is encountered again:

```text
do not create another evidence record
```

The ingestion run should count it as skipped.

---

# 14. AI Extraction Architecture

Create an abstraction:

```text
LLMService
      ↓
OllamaProvider
      ↓
Qwen3 8B
```

Do not scatter direct Ollama calls throughout the application.

Environment:

```text
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
```

The LLM receives canonical evidence, not raw API credentials or unrelated database data.

---

# 15. Extraction Prompt Requirements

The extraction prompt must instruct Qwen3 to:

* summarize supplied evidence;
* identify relevant skills;
* identify relevant competencies;
* classify evidence type;
* estimate evidence strength;
* explain why a skill/competency was identified.

It must explicitly prohibit:

* fabricated evidence;
* unsupported achievements;
* invented project results;
* invented employee behavior;
* unsupported competencies.

---

# 16. LLM Output Schema

Use structured JSON:

```json
{
  "evidence_summary": "Short evidence-grounded summary",
  "skills": [
    {
      "name": "Python",
      "confidence": 0.91
    }
  ],
  "competencies": [
    {
      "name": "Data Analysis",
      "confidence": 0.84
    }
  ],
  "evidence_type": "project_activity",
  "evidence_strength": 0.82,
  "reasoning": "Reason for the extraction"
}
```

Pydantic validation must occur before database persistence.

Invalid output must not silently pass.

---

# 17. Skill Matching

The AI output must be reconciled against the configured taxonomy.

Pipeline:

```text
LLM skill candidate
        ↓
Normalization
        ↓
Taxonomy lookup
        ↓
Existing skill?
    /           \
  YES            NO
   ↓              ↓
Map skill    Unmapped candidate
```

Do not allow uncontrolled competency creation from a single hallucinated model response.

---

# 18. Embedding Architecture

The embedding layer must be independent from the LLM layer.

```text
Evidence
   ↓
EmbeddingService
   ↓
Embedding Model
   ↓
Vector
```

Configuration:

```text
EMBEDDING_PROVIDER=
EMBEDDING_MODEL=
```

The exact embedding implementation should follow the existing environment rather than introducing an unnecessary paid API.

The same embedding configuration must be used for:

* indexing;
* querying.

---

# 19. ChromaDB Architecture

ChromaDB stores semantic evidence.

Example document:

```text
"Implemented and optimized a Pandas preprocessing pipeline
with missing-value handling."
```

Metadata:

```json
{
  "evidence_id": "E-102",
  "employee_id": "EMP001",
  "source": "github",
  "source_type": "commit",
  "project_name": "Project X",
  "occurred_at": "2026-09-20T10:30:00",
  "competencies": [
    "Data Processing"
  ]
}
```

ChromaDB must not become the authoritative database.

The authoritative evidence record remains in Supabase.

---

# 20. Retrieval Requirements

The retriever must support metadata filtering.

Minimum:

```text
employee_id
```

Preferred:

```text
employee_id
competency
source
date range
```

Critical rule:

```text
Employee A
     ↓
ONLY Employee A evidence
```

Never perform unrestricted semantic retrieval and filter the results afterward if doing so could allow cross-employee leakage.

---

# 21. LangChain RAG Architecture

Logical implementation:

```text
RAGService
   │
   ├── Query Builder
   │
   ├── Retriever
   │      ↓
   │   ChromaDB
   │
   ├── Evidence Resolver
   │      ↓
   │   Supabase
   │
   ├── Prompt Builder
   │
   ├── Qwen3
   │
   └── Response Validator
```

This keeps retrieval, evidence resolution, prompting, and generation independently testable.

---

# 22. RAG Context Construction

The LLM should not receive uncontrolled vector-store output.

Construct a bounded context:

```text
Employee:
EMP001

Competency:
Data Processing

Retrieved Evidence:

[E-102]
Source: GitHub
Type: Commit
Date: ...
Project: ...
Content: ...

[E-117]
Source: Jira
Type: Issue
Date: ...
Project: ...
Content: ...
```

Only this controlled context should be passed to Qwen3.

---

# 23. Evidence Justification Output

Expected structure:

```json
{
  "competency": "Data Processing",
  "action": "Review advanced missing-data handling techniques",
  "justification": "Recent project evidence shows repeated work involving missing-value handling.",
  "evidence_refs": [
    "E-102",
    "E-117"
  ],
  "confidence": 0.82,
  "evidence_sufficiency": "sufficient"
}
```

The exact wording is generated by Qwen3, but the schema and validation remain under backend control.

---

# 24. Evidence Sufficiency Logic

The system must distinguish:

### Sufficient

Relevant evidence exists and supports the requested context.

### Limited

Some relevant evidence exists, but coverage is weak.

### Insufficient

There is not enough relevant evidence to justify an evidence-specific output.

Example:

```json
{
  "competency": "Communication",
  "action": null,
  "justification": "Insufficient evidence.",
  "evidence_refs": [],
  "confidence": 0.0,
  "evidence_sufficiency": "insufficient"
}
```

The system must not force an LLM-generated action when retrieval produces inadequate evidence.

---

# 25. Evidence Reference Validation

Before returning the RAG response, validate:

```text
For every evidence_ref:

1. Does the ID exist?
2. Was it retrieved for this request?
3. Does it belong to the requested employee?
4. Does it correspond to stored evidence?
```

Invalid references must be removed or cause response validation failure.

---

# 26. API Technical Contract

### Health

```http
GET /api/health
```

### GitHub

```http
POST /api/integrations/github/test
POST /api/integrations/github/sync
GET /api/integrations/github/status
```

### Jira

```http
POST /api/integrations/jira/test
POST /api/integrations/jira/sync
GET /api/integrations/jira/status
```

### Identity

```http
POST /api/integrations/identities/map
```

### Evidence

```http
GET /api/evidence/{employee_id}
GET /api/evidence/{employee_id}/{evidence_id}
POST /api/evidence/process
POST /api/evidence/{evidence_id}/extract
```

### RAG

```http
POST /api/rag/search
POST /api/rag/justify
```

### Ingestion

```http
GET /api/ingestion/runs
GET /api/ingestion/runs/{run_id}
```

FastAPI should expose OpenAPI/Swagger documentation.

---

# 27. Request/Response Validation

Every endpoint must have Pydantic schemas.

Do not expose raw database objects unnecessarily.

Do not return:

* API tokens;
* credentials;
* authorization headers;
* internal service secrets.

---

# 28. Security Architecture

```text
Frontend / Client
       |
       v
FastAPI
       |
       ├── Supabase
       ├── GitHub
       ├── Jira
       ├── Ollama
       └── ChromaDB
```

External credentials remain on the server side.

The frontend must never directly call GitHub/Jira using stored application credentials.

---

# 29. Failure Handling

### GitHub unavailable

Return:

```text
github_integration_error
```

### Jira unavailable

Return:

```text
jira_integration_error
```

### Ollama unavailable

Return:

```text
llm_service_unavailable
```

### ChromaDB unavailable

Return:

```text
vector_store_unavailable
```

### Supabase unavailable

Return:

```text
database_unavailable
```

### Missing employee mapping

Return:

```text
employee_mapping_required
```

### Insufficient evidence

Return a valid structured response with:

```text
evidence_sufficiency = insufficient
```

---

# 30. Logging Requirements

Structured logging should capture:

```text
run_id
source
employee_id
processing_stage
records_found
records_processed
duration
error_category
```

Never log:

```text
GitHub token
Jira token
Supabase service key
authorization headers
```

---

# 31. Ingestion Pipeline

The complete ingestion process should be:

```text
1. Start ingestion run
        ↓
2. Validate integration
        ↓
3. Fetch external records
        ↓
4. Normalize records
        ↓
5. Resolve employee
        ↓
6. Deduplicate
        ↓
7. Store canonical evidence
        ↓
8. Extract skills/competencies
        ↓
9. Persist AI metadata
        ↓
10. Generate embedding
        ↓
11. Index in ChromaDB
        ↓
12. Update ingestion run
        ↓
13. Return ingestion summary
```

---

# 32. Processing Strategy

The pipeline should avoid unnecessary LLM calls.

For example:

```text
Duplicate evidence
      ↓
Skip
      ↓
No LLM call
```

Only new evidence should enter the extraction pipeline.

Large source content should be bounded before LLM processing.

Embedding generation should happen after canonical evidence has been validated.

---

# 33. Testing Requirements

## Unit Tests

Required:

* canonical evidence validation;
* GitHub normalization;
* Jira normalization;
* deduplication;
* identity mapping;
* skill normalization;
* competency mapping;
* LLM response validation;
* evidence-reference validation;
* evidence sufficiency.

## Integration Tests

Where configured:

* Supabase;
* Ollama;
* ChromaDB;
* GitHub;
* Jira.

## Security Tests

At minimum:

```text
Employee A evidence
        ↓
Employee B query
        ↓
Employee A evidence must NOT appear
```

## RAG Tests

Verify:

```text
Input evidence
      ↓
Retrieval
      ↓
Qwen3
      ↓
evidence_refs
```

Every returned reference must correspond to retrieved evidence.

---

# 34. End-to-End Acceptance Test

Use a controlled real project repository.

Example:

```text
GitHub Commit
"Fix missing-value handling in preprocessing pipeline"
```

Expected pipeline:

```text
GitHub
 ↓
Commit
 ↓
Canonical Evidence
 ↓
Employee Mapping
 ↓
Qwen3
 ↓
Skill extraction
 ↓
Supabase
 ↓
Embedding
 ↓
ChromaDB
```

Then execute:

```text
Query:
"What evidence relates to this employee's data-processing work?"
```

Expected:

```text
ChromaDB
 ↓
Relevant evidence
 ↓
Qwen3
 ↓
Structured justification
 ↓
E-XXX
```

Finally:

```text
E-XXX
 ↓
Supabase
 ↓
GitHub commit
```

The complete trace must work.

---

# 35. Performance Requirements

For the prototype:

* use pagination for external APIs;
* limit retrieved records;
* avoid duplicate processing;
* bound LLM context size;
* bound retrieved evidence count;
* avoid full repository ingestion;
* reuse embeddings when evidence has not changed.

No premature distributed architecture is required.

---

# 36. Observability Requirements

Track:

```text
GitHub records fetched
Jira records fetched

Evidence created
Evidence skipped
Evidence failed

Skills extracted
Competencies extracted

Embedding successes
Embedding failures

ChromaDB retrievals

RAG generations
RAG failures

Insufficient-evidence responses
```

Simple structured application logs are sufficient for this stage.

---

# 37. Development Sequence

The implementation should be executed in this order:

```text
Phase 0
Repository audit
        ↓
Phase 1
Backend foundation
        ↓
Phase 2
Supabase schema
        ↓
Phase 3
Canonical evidence model
        ↓
Phase 4
GitHub integration
        ↓
Phase 5
Jira integration
        ↓
Phase 6
Identity mapping
        ↓
Phase 7
Qwen3 extraction
        ↓
Phase 8
Skill taxonomy
        ↓
Phase 9
Embeddings + ChromaDB
        ↓
Phase 10
LangChain retrieval
        ↓
Phase 11
Evidence Justification Engine
        ↓
Phase 12
Traceability
        ↓
Phase 13
Pipeline orchestration
        ↓
Phase 14
Ingestion tracking
        ↓
Phase 15
API layer
        ↓
Phase 16
Security
        ↓
Phase 17
Error handling
        ↓
Phase 18
Testing
        ↓
Phase 19
End-to-end validation
```

This sequencing keeps the implementation aligned with the backend-first development plan.

---

# 38. Definition of Done

The feature is technically complete when all of the following work:

```text
[✓] FastAPI starts
[✓] Supabase connection works
[✓] Ollama connection works
[✓] Qwen3 8B responds
[✓] ChromaDB works
[✓] GitHub authentication works
[✓] Jira authentication works
[✓] GitHub data is ingested
[✓] Jira data is ingested
[✓] Employee identities are mapped
[✓] Evidence is normalized
[✓] Duplicate evidence is prevented
[✓] Skills are extracted
[✓] Competencies are mapped
[✓] Evidence is stored in Supabase
[✓] Evidence is embedded
[✓] Evidence is indexed in ChromaDB
[✓] Employee-scoped retrieval works
[✓] LangChain RAG works
[✓] Qwen3 produces structured output
[✓] Evidence references are returned
[✓] References resolve to real evidence
[✓] Insufficient evidence is handled
[✓] Cross-employee leakage test passes
[✓] Secrets are protected
[✓] API documentation works
[✓] Critical tests pass
[✓] End-to-end GitHub pipeline works
[✓] End-to-end Jira pipeline works
```

---

# 39. Technical Relationship to the Next GrowthLens Layer

This feature should expose a clean evidence interface for the later intelligence engine:

```text
Evidence Record
      ↓
Employee
      ↓
Competency
      ↓
Timestamp
      ↓
Evidence strength
      ↓
Source
```

The next layer can then construct:

```text
Employee
   ↓
Competency
   ↓
Time-ordered evidence
   ↓
Trajectory analysis
   ↓
Improving / Stagnating / Declining
   ↓
Confidence
   ↓
Development action
```

The MISC02 blueprint specifically describes time-ordered competency evidence feeding the trajectory model, while recommendations are subsequently grounded in evidence. 

Therefore, the key technical design decision is to **preserve provenance and timestamps now**. If those are lost during ingestion, the later longitudinal intelligence layer cannot reliably reconstruct an employee's development trajectory.

---

## 40. Final Technical Principle

The feature should not be treated as "a chatbot connected to GitHub and Jira."

Its actual architecture is:

```text
                 REAL WORK
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
       GitHub                Jira
          │                   │
          └─────────┬─────────┘
                    ↓
             EVIDENCE LAYER
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
      Supabase             Qwen3
      structured          extraction
          │                   │
          └─────────┬─────────┘
                    ↓
              Skill Mapping
                    │
                    ↓
               Embeddings
                    │
                    ↓
                ChromaDB
                    │
                    ↓
              LangChain RAG
                    │
                    ↓
                Qwen3 8B
                    │
                    ↓
          Evidence-grounded output
                    │
                    ↓
             Evidence references
                    │
                    ↓
             Original source
```

That is the technical foundation required for the broader MISC02 objective of turning fragmented employee activity into a continuous, evidence-backed view of capability. The blueprint explicitly frames evidence fusion as the foundation for the later trajectory, confidence, and recommendation layers. 
