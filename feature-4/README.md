# Feature 4 – Growth Intelligence & Manager Insights

**Project:** GrowthLens – Continuous Talent Intelligence & Skill Growth  
**Track:** MISC02 (HackMatrix 5.0)  
**Status:** Feature 4 is locally implemented and is intentionally not pushed to GitHub. Zero Git operations were performed.

---

## 1. Purpose & Scope

Feature 4 synthesizes the longitudinal analytical outputs of GrowthLens (Feature 1 evidence ingestion, Feature 2 trajectory modelling, and Feature 3 actionable recommendations) into high-impact intelligence artifacts for learners and engineering managers.

It combines four core enhancements:
1. **8.3 Auto-Generated Growth Narrative**: Plain-language, evidence-grounded performance and development summaries with interactive claim-to-evidence drilldown.
2. **8.4 Peer-Percentile Growth Benchmarking**: Privacy-safe, $k$-anonymized growth rate comparisons against peers starting from a comparable proficiency level.
3. **8.5 Evidence Staleness & Confidence Decay Visualization**: Longitudinal uncertainty bands and recency meters that communicate aging evidence without misinterpreting telemetry gaps as skill loss.
4. **8.6 Manager Team Skill Heatmap**: An accessible matrix of employee × competency trends (↑, →, ↓) with aggregate skill-gap insights, robust manager privacy boundaries, and flexible filtering.

---

## 2. Directory Architecture & Modular Isolation

All Feature 4 components reside strictly within this dedicated directory:

```
feature-4/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── privacy.md
│   ├── confidence-methodology.md
│   └── implementation-map.md
├── backend/
│   ├── __init__.py
│   ├── api/
│   │   ├── growth_narrative.py
│   │   ├── peer_benchmark.py
│   │   ├── confidence_decay.py
│   │   ├── team_heatmap.py
│   │   └── router.py
│   ├── services/
│   │   ├── narrative_service.py
│   │   ├── evidence_link_service.py
│   │   ├── benchmark_service.py
│   │   ├── confidence_decay_service.py
│   │   └── heatmap_service.py
│   ├── models/
│   │   ├── narrative_models.py
│   │   ├── benchmark_models.py
│   │   ├── confidence_models.py
│   │   └── heatmap_models.py
│   ├── repositories/
│   │   ├── narrative_repository.py
│   │   ├── benchmark_repository.py
│   │   └── heatmap_repository.py
│   ├── schemas/
│   │   ├── narrative_schema.py
│   │   ├── benchmark_schema.py
│   │   ├── confidence_schema.py
│   │   └── heatmap_schema.py
│   ├── utils/
│   │   ├── evidence_utils.py
│   │   ├── privacy_utils.py
│   │   └── date_utils.py
│   └── tests/
│       ├── test_narrative.py
│       ├── test_benchmark.py
│       ├── test_confidence_decay.py
│       └── test_heatmap.py
└── frontend/
    ├── index.html
    └── static/
        ├── feature4.css
        └── feature4.js
```

---

## 3. Authoritative Data Flow & Principles

```
                  EXISTING GROWTHLENS
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      Evidence       Trajectory      Confidence
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                   FEATURE 4
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Narrative         Benchmark       Confidence
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                  Manager Heatmap
```

- **Observed vs. Modelled Separation**: Raw evidence events (commits, PRs, Jira tickets, courses, assessments) are marked as **`OBSERVED`**. Trends, decay risk, and percentiles are marked as **`MODELLED`**.
- **Zero Hallucination Safeguard**: The narrative engine enforces a deterministic claim-first aggregation pipeline. The LLM only translates verified claims into plain prose; any claim lacking verified evidence references is rejected.
- **Privacy by Design**: Benchmarking enforces configurable $k$-anonymity (`PEER_BENCHMARK_MIN_COHORT_SIZE`). Small cohorts are suppressed. Zero individual peer scores or identities are returned.
- **Dynamic Staleness**: Confidence decays dynamically when no new evidence arrives, widening trajectory bands and shifting freshness indicators (`Fresh` → `Aging` → `Stale`) without claiming skill decline.
- **Manager Privacy Boundaries**: The Team Heatmap presents aggregate matrix trends. Detailed evidence cannot be drilled into without explicit authorization.

---

## 4. How to Run Feature 4 Locally

1. **Start the GrowthLens Backend** (from project root):
   ```powershell
   .venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Access Feature 4 Growth Intelligence Dashboard**:
   - Web Browser: `http://127.0.0.1:8000/feature4`
   - OpenAPI Documentation: `http://127.0.0.1:8000/docs#/Feature%204%3A%20Growth%20Intelligence`

3. **Run Feature 4 Automated Test Suite**:
   ```powershell
   .venv\Scripts\pytest feature-4/backend/tests -v
   ```

---

## 5. Compliance & Git Notice

> [!IMPORTANT]
> **NO GIT OPERATIONS WERE PERFORMED.**  
> Feature 4 was developed entirely within the local environment. No commits, branches, merges, or remote pushes were executed.
