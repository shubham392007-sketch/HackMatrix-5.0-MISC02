# PRD: AI-Driven Evidence Extraction & RAG Pipeline

**Product:** GrowthLens
**HackMatrix 5.0 Track:** MISC02 – Continuous Talent Intelligence & Skill Growth
**Feature:** AI-Driven Evidence Extraction & RAG Pipeline
**Current scope:** Backend-first prototype
**Primary purpose:** Build the evidence foundation required for continuous, evidence-backed talent intelligence.

This PRD is based on the uploaded HackMatrix 5.0 Rule Book, the MISC02 Features & Roadmap document, and the MISC02 GrowthLens Solution Blueprint.   

---

## 1. Product Context

MISC02 is centered on a fundamental limitation of conventional employee assessment: assessments provide disconnected snapshots rather than a continuous picture of how a person's capabilities change over time.

The intended GrowthLens platform combines evidence from assessments, project outcomes, and course completions to construct a longitudinal skill profile. It then needs to determine whether individual competencies are **improving, stagnating, or declining**, attach confidence to those conclusions, and recommend concrete next actions that can be traced back to supporting evidence. 

The MISC02 roadmap specifically proposes an **AI-Driven Evidence Extraction & RAG Pipeline** to reduce manual data entry. It calls for automated parsing of GitHub, Jira, or internal project-management sources for skill tagging, followed by a LangChain + ChromaDB RAG pipeline capable of retrieving specific evidence such as code commits, missed test questions, or project roadblocks to justify a suggested next action. 

This PRD covers that feature only.

---

## 2. Problem Statement

The current evidence pipeline should solve the problem of fragmented, manually entered work evidence.

A conventional system might contain:

> Employee → manually entered skill → manually entered score

The proposed pipeline instead aims for:

> Employee → actual project activity → extracted evidence → identified skills/competencies → searchable evidence → evidence-backed reasoning

The important distinction is that **the AI should interpret evidence, not invent evidence**.

The resulting system should allow a later GrowthLens component to answer questions such as:

* What evidence demonstrates that an employee used a particular competency?
* What project activity supports a skill assessment?
* What recent evidence is relevant to a competency?
* What evidence can justify a suggested development action?

The roadmap explicitly positions the RAG layer as the mechanism through which specific evidence can be retrieved to support contextual justification. 

---

## 3. Product Goal

Build an automated evidence intelligence pipeline that:

1. Ingests evidence from external work sources.
2. Normalizes heterogeneous source data into a common evidence representation.
3. Associates evidence with the correct employee.
4. Extracts relevant skills and competencies.
5. Stores structured evidence for later analytics.
6. Creates semantic representations of evidence.
7. Retrieves relevant evidence based on an employee and competency.
8. Uses retrieved evidence to generate contextual, evidence-backed output.
9. Preserves the connection between generated conclusions and their underlying evidence.

The feature should become the evidence layer on which later trajectory classification and recommendation capabilities can operate.

---

## 4. Scope

### In scope

For this prototype, the feature covers:

* GitHub evidence ingestion.
* Jira evidence ingestion.
* Employee identity mapping.
* Evidence normalization.
* Automated skill tagging.
* Competency association.
* Structured evidence storage.
* Vector indexing.
* Semantic evidence retrieval.
* RAG-based evidence justification.
* Evidence references.
* Evidence sufficiency handling.
* Confidence information.
* Ingestion tracking.
* API layer.
* Backend testing.

The roadmap explicitly identifies GitHub/Jira/internal project-management integration, automated skill tagging, and LangChain + ChromaDB RAG as part of this feature. 

### Out of scope for this feature

Do not implement the following as part of this PRD:

* Final employee dashboard.
* Final manager dashboard.
* Interactive skill graphs.
* Final UI/UX.
* LSTM trajectory classification.
* Improving/stagnating/declining algorithm.
* Skill half-life forecasting.
* Peer benchmarking.
* What-if learning simulator.
* Mentorship matching.
* Full learning-platform integration.

Those belong to broader GrowthLens capabilities described in the blueprint and roadmap. 

---

# 5. Users

The immediate backend feature does not require a polished user interface.

The eventual consumers of the evidence system are:

### Learner / Employee

The broader platform is intended to provide employees with an understanding of their competency development and evidence-backed growth actions.

### Manager / Mentor

The broader platform provides managers with competency and team-level insights.

The blueprint explicitly identifies Learner and Manager as the two principal user roles. 

For the current feature, the primary technical actor is an authenticated application user or administrator configuring evidence integrations.

---

# 6. Core User Journey

The intended workflow is:

```text
Connect GitHub / Jira
        ↓
Validate integration
        ↓
Synchronize project activity
        ↓
Normalize external records
        ↓
Map external identity → employee
        ↓
Create evidence records
        ↓
AI extracts skills / competencies
        ↓
Store structured evidence
        ↓
Generate embeddings
        ↓
Index evidence in ChromaDB
        ↓
Query employee + competency
        ↓
Retrieve relevant evidence
        ↓
Send retrieved evidence to LLM
        ↓
Generate contextual output
        ↓
Attach evidence references
```

This supports the broader architecture described in the GrowthLens blueprint, where evidence is ingested and fused before later analytical and recommendation layers consume it. 

---

# 7. Functional Requirements

## FR-01: GitHub Integration

The system shall support GitHub as an evidence source.

The system should be able to:

* authenticate using configured credentials;
* validate repository access;
* retrieve relevant project activity;
* process commits;
* process pull requests where applicable;
* preserve source references;
* associate activity with an employee;
* prevent duplicate evidence ingestion.

The system should not ingest an entire repository indiscriminately.

Relevant project activity should be transformed into evidence records.

---

## FR-02: Jira Integration

The system shall support Jira as an evidence source.

The system should be able to:

* validate Jira credentials;
* validate the target project;
* retrieve relevant issues and project activity;
* preserve issue references;
* associate activity with employees;
* prevent duplicate ingestion.

GitHub and Jira should ultimately feed the **same evidence-processing pipeline**, rather than creating two independent AI systems.

---

## FR-03: Employee Identity Mapping

External identities must be explicitly associated with internal employees.

For example:

```text
GitHub username
        ↓
External identity mapping
        ↓
GrowthLens employee
```

The system must not assume that:

```text
GitHub username = employee ID
```

or:

```text
Jira email = employee ID
```

If an external identity cannot be mapped, the evidence should not silently be assigned to an employee.

---

## FR-04: Canonical Evidence Model

All external evidence shall be normalized into a common representation.

Conceptually:

```text
Evidence
├── evidence_id
├── employee_id
├── source
├── source_type
├── source_reference
├── project_id
├── project_name
├── title
├── content
├── occurred_at
├── evidence_type
├── evidence_strength
└── metadata
```

The exact implementation may vary, but the important requirement is that downstream AI components should not need provider-specific logic.

---

# 8. Evidence Types

The system should preserve the distinction between different evidence sources.

Examples:

```text
GitHub
├── commit
├── pull request
└── issue

Jira
├── issue
├── comment
├── status change
└── project activity
```

The broader MISC02 architecture also identifies assessments, project outcomes, and course completions as evidence sources. 

However, this feature's prototype integration focus is GitHub and Jira.

---

# 9. Automated Skill Tagging

The system shall use AI to extract skill and competency information from evidence.

Example:

```text
Evidence:

"Optimized Pandas preprocessing and fixed missing-value
handling in the data pipeline."
```

Possible interpretation:

```text
Skills:
Python
Pandas
Data Processing

Competency:
Data Analysis
```

The model's output must remain an interpretation of the evidence.

It must not fabricate:

* projects;
* achievements;
* outcomes;
* skills;
* events;
* performance results.

---

# 10. Skill Taxonomy

Skills should not exist as uncontrolled strings throughout the system.

A configurable taxonomy should provide the basis for consistent tagging.

Conceptually:

```text
Competency
   ↓
Skill
   ↓
Evidence
```

For example:

```text
Data Analysis
├── Python
├── Pandas
├── Data Cleaning
└── Data Visualization
```

If evidence contains a capability that cannot be confidently mapped to the existing taxonomy, the system should preserve the candidate rather than silently creating an incorrect competency relationship.

---

# 11. LLM Evidence Extraction

The LLM layer will process normalized evidence.

For the current implementation, the local Qwen3 8B model running through Ollama is the intended model environment.

The LLM should produce structured information such as:

```json
{
  "evidence_summary": "...",
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
  "reasoning": "..."
}
```

The backend must validate the model output before persistence.

The LLM should never directly control database writes.

---

# 12. Evidence Storage

Structured evidence shall be stored in Supabase PostgreSQL.

The database should support relationships between:

```text
Employee
   ↓
Evidence
   ↓
Skill
   ↓
Competency
```

It should also retain:

```text
Evidence
   ↓
Source
   ↓
Original external reference
```

This allows the system to move from an AI-generated statement back to the original GitHub/Jira evidence.

---

# 13. Vector Indexing

The system shall create semantic representations of evidence for retrieval.

Conceptually:

```text
Evidence text
      ↓
Embedding
      ↓
Vector
      ↓
ChromaDB
```

ChromaDB should store enough metadata to associate a vector with:

* evidence ID;
* employee ID;
* source;
* source type;
* competency;
* project;
* date.

ChromaDB is the semantic retrieval layer, not the primary structured database.

---

# 14. RAG Retrieval

The system shall use LangChain and ChromaDB to retrieve evidence relevant to a particular request.

Example:

```text
Employee: EMP001
Competency: Data Processing

Query:
"Find recent evidence related to this employee's
Data Processing competency."
```

The retrieval layer should consider:

* employee;
* competency;
* semantic relevance;
* source;
* time where applicable.

The most important constraint is **employee isolation**.

Evidence belonging to Employee A must never appear in a retrieval result for Employee B.

---

# 15. Evidence Justification Engine

The Evidence Justification Engine is the final layer of this feature.

Its job is not to produce generic AI advice.

Its job is to use retrieved evidence to produce contextual reasoning.

Conceptually:

```text
User/request
     ↓
Retriever
     ↓
Relevant evidence
     ↓
Qwen3
     ↓
Evidence-grounded output
```

The MISC02 feature roadmap explicitly describes this mechanism: when the system suggests a next action, the LLM should retrieve specific evidence such as commits, missed test questions, or project roadblocks to provide contextual justification. 

---

# 16. Evidence Traceability

Every generated conclusion should contain references to its supporting evidence.

Example:

```json
{
  "competency": "Data Processing",
  "action": "Review advanced missing-data handling techniques",
  "justification": "Recent project activity shows repeated work involving missing-value handling.",
  "evidence_refs": [
    "E-102",
    "E-117"
  ],
  "confidence": 0.82,
  "evidence_sufficiency": "sufficient"
}
```

The system must be able to resolve:

```text
E-102
 ↓
Supabase evidence
 ↓
GitHub commit
 ↓
Original source
```

This is fundamental to the explainability requirement.

The broader blueprint explicitly distinguishes observed evidence from modelled interpretations, stating that evidence points should remain visible alongside trend labels, confidence, and recommendations. 

---

# 17. Evidence Sufficiency

The system must be capable of saying that evidence is insufficient.

It should not manufacture an answer simply because the LLM was asked a question.

Example:

```json
{
  "competency": "Communication",
  "action": null,
  "justification": "Insufficient evidence to generate a competency-specific action.",
  "evidence_refs": [],
  "confidence": 0.0,
  "evidence_sufficiency": "insufficient"
}
```

Possible states:

```text
sufficient
limited
insufficient
```

This is particularly important because the broader platform requires confidence and evidence-backed conclusions rather than unsupported assertions. 

---

# 18. Confidence

Confidence should be associated with AI interpretation and evidence sufficiency.

It should not be confused with an employee's actual competency level.

The broader GrowthLens blueprint proposes confidence based on evidence characteristics such as recency and volume rather than simply using the model's raw output probability. 

For this feature, the evidence pipeline should therefore preserve enough information for the later confidence methodology to operate.

The full confidence/trend algorithm is outside this feature's scope.

---

# 19. Data Model

The minimum conceptual data model is:

```text
Employee
   │
   ├── Integration Identity
   │       ├── GitHub
   │       └── Jira
   │
   ├── Evidence
   │       │
   │       ├── Skills
   │       ├── Competencies
   │       └── Source Reference
   │
   └── Competency Relationships
```

Supporting system entities:

```text
Integration
Ingestion Run
Skill
Competency
Evidence
Recommendation
Recommendation Evidence
```

The broader roadmap also identifies database entities such as Users, Skills, Evidence Sources, and Logs as foundational architecture. 

---

# 20. API Requirements

The backend should expose APIs conceptually covering:

### GitHub

```text
POST /api/integrations/github/test
POST /api/integrations/github/sync
GET  /api/integrations/github/status
```

### Jira

```text
POST /api/integrations/jira/test
POST /api/integrations/jira/sync
GET  /api/integrations/jira/status
```

### Identity

```text
POST /api/integrations/identities/map
```

### Evidence

```text
GET  /api/evidence/{employee_id}
GET  /api/evidence/{employee_id}/{evidence_id}
POST /api/evidence/process
POST /api/evidence/{evidence_id}/extract
```

### RAG

```text
POST /api/rag/search
POST /api/rag/justify
```

### Ingestion

```text
GET /api/ingestion/runs
GET /api/ingestion/runs/{run_id}
```

### Health

```text
GET /api/health
```

These are implementation-level APIs for this feature, while the blueprint's broader API contract covers learner competencies, trajectories, evidence, recommendations, and summaries. 

---

# 21. Ingestion Run Management

Each synchronization should be tracked.

Example:

```text
Run ID: RUN-001
Source: GitHub
Status: completed

Records found: 50
Processed: 45
Skipped: 4
Failed: 1
```

Possible statuses:

```text
pending
running
completed
partial
failed
```

This provides visibility into the ingestion pipeline and makes failures diagnosable.

---

# 22. Security Requirements

Credentials for external integrations must remain backend-side.

The system must never:

* return GitHub tokens;
* return Jira API tokens;
* log tokens;
* put tokens into ChromaDB;
* put tokens into LLM prompts;
* expose Supabase service-role credentials to the frontend.

Employee evidence must be isolated by employee identity.

The evidence retrieval layer must validate that retrieved evidence belongs to the requested employee.

---

# 23. Non-Functional Requirements

### Reliability

Failure of GitHub, Jira, Ollama, Supabase, or ChromaDB should produce a controlled error rather than crashing the entire API.

### Traceability

Every generated evidence-backed output must be traceable to stored evidence.

### Modularity

Adding another evidence source later should not require rewriting the RAG pipeline.

### Reproducibility

Database schema and setup should be reproducible from the repository.

### Testability

External integrations should be separable from unit tests through fixtures/mocks where appropriate.

### Scalability

The architecture should allow additional evidence sources to be added later. The blueprint explicitly identifies additional assessment platforms and evidence-source types as future extensions. 

---

# 24. Error Scenarios

The system must handle:

| Scenario                    | Expected behavior                  |
| --------------------------- | ---------------------------------- |
| Invalid GitHub token        | Return authentication failure      |
| Repository unavailable      | Return repository error            |
| Jira authentication failure | Return authentication failure      |
| Jira project unavailable    | Return project error               |
| External identity missing   | Mark evidence as unmapped          |
| Duplicate evidence          | Skip duplicate                     |
| Ollama unavailable          | Return controlled AI-service error |
| Invalid LLM JSON            | Validate/retry/fail safely         |
| ChromaDB unavailable        | Return vector-store error          |
| Supabase unavailable        | Return database error              |
| No relevant evidence        | Return insufficient evidence       |
| Cross-employee retrieval    | Reject/prevent                     |

---

# 25. Success Metrics

For this feature, success means the following pipeline works end-to-end:

```text
GitHub/Jira
    ↓
Real evidence
    ↓
Canonical evidence
    ↓
Employee mapping
    ↓
AI skill extraction
    ↓
Supabase
    ↓
Embedding
    ↓
ChromaDB
    ↓
Employee-scoped retrieval
    ↓
Qwen3
    ↓
Structured justification
    ↓
Evidence references
```

The system should demonstrate that an AI-generated conclusion can be traced back to actual source evidence.

---

# 26. Acceptance Criteria

The feature is complete when:

* GitHub can be connected and synchronized.
* Jira can be connected and synchronized.
* External identities can be mapped to employees.
* GitHub and Jira produce the same canonical evidence structure.
* Evidence is persisted in Supabase.
* Skills and competencies can be extracted from evidence.
* Evidence can be embedded and indexed in ChromaDB.
* Semantic retrieval works.
* Retrieval is employee-specific.
* LangChain orchestrates the RAG flow.
* Qwen3 generates structured output using retrieved evidence.
* Generated output contains evidence references.
* Evidence references resolve to real evidence.
* The system explicitly reports insufficient evidence.
* Duplicate evidence is prevented.
* Credentials are not exposed.
* Critical pipeline tests pass.
* The entire process can be demonstrated through APIs without requiring the final UI.

---

# 27. MVP Definition

For the first working MVP, the smallest complete demonstration should be:

```text
1 Employee
      ↓
1 GitHub repository
      ↓
Real commits / PRs
      ↓
Evidence extraction
      ↓
Skill tagging
      ↓
Supabase
      ↓
ChromaDB
      ↓
"Show evidence related to Python"
      ↓
Retrieved commits
      ↓
Qwen3
      ↓
Contextual explanation
      ↓
Evidence references
```

Then repeat the same pipeline with Jira.

That is a much better MVP than trying to build the entire GrowthLens dashboard before proving that the **evidence engine actually works**.

---

# 28. Relationship to the Complete GrowthLens Product

This feature is not the complete MISC02 solution.

It establishes the evidence layer:

```text
                    CURRENT FEATURE
                         │
GitHub ───────┐          │
              ↓          │
Jira ───────→ Evidence Engine
              │          │
              ↓          ↓
           Skills    ChromaDB/RAG
              │          │
              └────┬─────┘
                   ↓
          Evidence-backed output
                   │
                   ↓
             FUTURE MODULES
                   │
          ┌────────┴────────┐
          ↓                 ↓
   Trajectory Model    Recommendation
          ↓                 ↓
 Improving /           Next Action
 Stagnating /             │
 Declining                ↓
          └────────┬────────┘
                   ↓
             GrowthLens
```

The broader blueprint describes the trajectory layer as an LSTM-based sequence classifier consuming time-ordered competency evidence and producing improving/stagnating/declining labels with confidence. 

That distinction matters: **this feature supplies the evidence. It should not prematurely pretend to be the trajectory model.**

---

# 29. HackMatrix 5.0 Relevance

The official Round 01 rules require teams to demonstrate at least **30–40% of the proposed solution**, provide a working prototype, submit a prototype video, and demonstrate clear alignment with the problem statement. The Round 01 evaluation allocates points across Innovativeness, Problem Understanding & Solution Fit, Tech Stack, Presentation, UI/UX, GitHub Maintenance, Documentation, and Social Impact.  

For the eventual complete prototype, this feature provides a particularly important technical foundation because the MISC02 blueprint explicitly identifies **multi-source evidence fusion, explainable trend classification, confidence, and evidence-linked recommendations** as the central mapping from the problem statement to demonstrable functionality. 

The official rules also require all team members to contribute to the GitHub repository and warn against trivial or single-member contribution patterns. 

---

# 30. Future Dependency

Once this feature is stable, its output becomes input for the next GrowthLens layers:

```text
Evidence
   ↓
Time-ordered competency evidence
   ↓
Trajectory classification
   ↓
Confidence
   ↓
Strengths / gaps
   ↓
Next-action recommendations
```

The roadmap's development sequence places AI/evidence integration after the foundation and core trajectory logic, with local LLMs via Ollama or cloud APIs, ChromaDB for unstructured data, and prompt templates for evidence-backed next actions. 

So the engineering principle for this feature is simple:

**Build the evidence layer correctly now, because every later intelligence layer depends on the quality, provenance, and temporal structure of this evidence.**
