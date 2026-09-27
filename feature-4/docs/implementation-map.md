# Feature 4 Implementation Map & System Audit (Phase 0)

**Project:** GrowthLens – Continuous Talent Intelligence & Skill Growth  
**Track:** MISC02 (HackMatrix 5.0)  
**Status:** Audit Complete · Implementation Phase: Local Only · Zero Git Operations  

---

## 1. Architectural Overview & Data Flow

Feature 4 converts existing GrowthLens analytical outputs into manager- and learner-facing intelligence across four integrated enhancements:
1. **8.3 Auto-Generated Growth Narrative**
2. **8.4 Peer-Percentile Growth Benchmarking**
3. **8.5 Evidence Staleness & Confidence Decay Visualization**
4. **8.6 Manager Team Skill Heatmap**

```
                  EXISTING GROWTHLENS (Features 1, 2, 3)
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
                 Evidence       Trajectory     Confidence
                     │              │              │
                     └──────────────┼──────────────┘
                                    ▼
                      FEATURE 4 CONSUMPTION LAYER
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
8.3 Narrative               8.4 Benchmark               8.5 Confidence
 (Claims + LLM)          (k-Anonymity Cohort)         (Staleness & Bands)
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
                          8.6 Manager Heatmap
                       (Team Matrix & Skill Gaps)
```

---

## 2. Existing Subsystems Audit

| Category | Existing Service / File | Endpoints / Artifacts | Feature 4 Consumer & Usage |
| :--- | :--- | :--- | :--- |
| **Evidence Pipeline (Feature 1)** | `backend/services/ingestion.py`<br>`backend/db/repositories/evidence.py` | `GET /api/evidence`<br>`GET /api/evidence/{id}`<br>Supabase `evidence` table | Narrative generator consumes verified evidence events for claim support and drill-down inspection. |
| **Identity & Auth (Feature 1)** | `backend/core/auth.py`<br>`backend/api/routes/auth.py`<br>`backend/api/routes/employees.py` | `POST /api/auth/login`<br>`GET /api/employees`<br>`GET /api/employees/{id}` | Role-based access control (Learner vs Manager) and team membership resolution via `department`. |
| **Inference Engine (Feature 2)** | `ml/retention_inference.py`<br>`models/retention/weibull_model.pkl` | `RetentionInferenceEngine.predict_from_features()` | Reused directly; Feature 4 **does not** introduce a competing ML model. |
| **Trajectory & Feature Pipeline (Feature 2)** | `ml/retention_features.py`<br>`services/retention_service.py` | `RetentionService.get_retention_assessment()`<br>`RetentionService.get_learner_evidence()` | Trajectory points, temporal slope (`slope_per_30d`), and trend classification (`improving`, `stagnating`, `declining`). |
| **Confidence & Recency (Feature 2)** | `ml/retention_features.py` (`compute_historical_features`)<br>`services/what_if_service.py` | `prediction_confidence`<br>`days_since_last_evidence`<br>`calculate_freshness()` | 4-factor confidence formula (volume, diversity, recency, stability) and dynamic freshness decay used in confidence bands. |
| **Action Recommendations (Feature 3)** | `routers/recommendations.py` | `GET /api/v1/learner/{id}/recommendations` | Next-action suggestions and mentorship matches surfaced in Manager 1:1 briefing mode. |
| **LLM Infrastructure (Feature 1)** | `backend/llm/ollama_provider.py`<br>`backend/llm/service.py` | Local Ollama (`qwen3:8b`) with JSON mode & grounded fallback | Natural language expression of structured claims in the Growth Narrative. |

---

## 3. Authoritative Source of Truth Mapping

| Information Type | Authoritative Existing Source | Feature 4 Treatment |
| :--- | :--- | :--- |
| **Observed Evidence** | Supabase `evidence` table / `RetentionService.evidence_df` | Tagged as **`OBSERVED`**. Claims link strictly to real `evidence_id`s. |
| **Modelled Trend** | `ml/retention_features.py` (`classify_trend`) | Tagged as **`MODELLED`**. Represented using directional icons (↑, →, ↓) + color. |
| **Modelled Confidence** | `ml/retention_features.py` (`prediction_confidence`) | Tagged as **`MODELLED`**. Dynamic confidence band reflecting evidence recency. |
| **Peer Growth Percentile** | Computed in `feature-4/backend/services/benchmark_service.py` | Tagged as **`MODELLED (AGGREGATE)`**. Suppressed if cohort < `k`. Zero peer data leakage. |
| **Team Skill Gap** | Computed in `feature-4/backend/services/heatmap_service.py` | Tagged as **`MODELLED (TEAM AGGREGATE)`**. Dominant trend insights generated from matrix counts. |

---

## 4. Privacy & Compliance Matrix

| Feature | Privacy Rule | Enforcement Mechanism |
| :--- | :--- | :--- |
| **8.3 Narrative** | No subjective personality judgments; no unauthorized evidence exposure. | Claim-first generation with deterministic verification; employee scope validation. |
| **8.4 Benchmark** | No peer IDs, names, raw scores, or cohort distributions returned. | Configurable `PEER_BENCHMARK_MIN_COHORT_SIZE` ($k \ge 3$, default $5$). Suppression on small cohorts. |
| **8.5 Confidence** | Stale evidence must never be reported as "skill declined". | Distinct "Evidence Aging / Stale" vs trend labeling; neutral phrasing. |
| **8.6 Heatmap** | Manager cannot drill into unpermitted private evidence uninvited. | Matrix returns aggregate trends and confidence; evidence inspection requires explicit authorization. |

---

## 5. Local Isolation & Git Safeguards

- Root Folder: `feature-4/`
- **Zero Git Modifications**:
  - No `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`.
  - No new branches or PRs.
  - All logic and assets strictly reside in `feature-4/`.
