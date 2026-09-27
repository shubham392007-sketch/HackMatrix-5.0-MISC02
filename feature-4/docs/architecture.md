# Feature 4 Architecture & Design Specification

**Module:** Feature 4 – Growth Intelligence & Manager Insights  
**Author:** GrowthLens Engineering  

---

## 1. System Context & Upstream Dependencies

Feature 4 does not introduce an independent machine learning model, nor does it replicate data ingestion. It acts as an intelligence and presentation layer atop GrowthLens core:

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

### Upstream Sources
- **Evidence Layer**: Supabase PostgreSQL `evidence` table & `RetentionService.evidence_df`.
- **Inference & Trajectory**: `RetentionInferenceEngine` (Weibull AFT model `weibull_model.pkl`), `compute_historical_features` in `ml/retention_features.py`.
- **Classification**: `classify_trend(slope_per_30d)` → `improving`, `stagnating`, `declining`.
- **Confidence**: `prediction_confidence = np.mean([conf_vol, conf_div, conf_rec, conf_stab])`.

---

## 2. Component Architecture

### 2.1 Enhancement 8.3: Auto-Generated Growth Narrative
```
Evidence Filter (Period & Employee)
               ↓
    Evidence Aggregator
               ↓
       Trajectory Facts
               ↓
    Deterministic Claim Builder
               ↓
Structured Claims with Evidence IDs
               ↓
 LLM Narrative Generator (Qwen3 8B)
               ↓
   Claim Verification & Audit
               ↓
Evidence-Linked Growth Narrative
```

- **Claim-First Design**: The structured claim layer is authoritative. The LLM only renders validated facts into concise natural language.
- **Evidence Verification**: Every claim carries explicit `evidence_ids`. Any generated statement without an authoritative underlying record is removed.
- **1:1 Conversation Ready**: Formats output for manager 1:1 check-ins, highlighting key improvements, stagnating areas, and recommended focus areas.

### 2.2 Enhancement 8.4: Peer-Percentile Growth Benchmarking
- **Cohort Formation**: Identifies peers with the same competency track, evaluated over the identical timeframe, starting at a comparable skill baseline ($\pm 15$ points).
- **$k$-Anonymity Guard**: If the cohort size is strictly below `PEER_BENCHMARK_MIN_COHORT_SIZE` (default: 5), benchmarking is suppressed (`privacy_safe: false`).
- **Zero Raw Data Exposure**: Percentile calculation is aggregate-only; peer identities, trajectories, and scores are never transmitted or persisted.

### 2.3 Enhancement 8.5: Evidence Staleness & Confidence Decay
- **Recency Decay**:
  $$\text{Freshness}(t) = \max\left(0, \min\left(100, \left(1 - \frac{\text{Days Since Evidence}}{180}\right) \times 100\right)\right)$$
- **Dynamic Confidence Band**:
  $$\text{Band Width}(t) = \text{Score} \pm (1 - \text{Confidence}(t)) \times 25$$
  As evidence ages, the confidence band expands visually (increasing uncertainty) and lightens in opacity.
- **Safeguard**: Telemetry silence is explicitly reported as *"Limited recent evidence observed"*, never as *"Definite skill decline"*.

### 2.4 Enhancement 8.6: Manager Team Skill Heatmap
- **Matrix Projection**: Team Members $\times$ Competencies.
- **Multi-Modal Accessibility**: Every cell combines color-coded semantics with directional indicator icons:
  - $\uparrow$ **Improving** (Emerald)
  - $\rightarrow$ **Stagnating** (Amber / Slate)
  - $\downarrow$ **Declining** (Rose)
- **Team Gap Analytics**: Aggregates distribution across the team to compute dominant patterns (e.g., *"Stagnation is the dominant observed trend for Cloud Deployment"*).
- **Privacy Barrier**: Aggregate view only; manager cannot drill down into unpermitted private learner evidence.

---

## 3. Data Classification: Observed vs. Modelled

| Dimension | `OBSERVED` Data | `MODELLED` Data |
| :--- | :--- | :--- |
| **Growth Narrative** | Concrete PRs, assessments, course completions with date and score. | Trend classification, velocity interpretation, synthesized narrative prose. |
| **Peer Benchmark** | Learner's historical score delta over period. | Peer growth rate percentile distribution, relative quartile tier. |
| **Confidence Decay**| Timestamp of last verified telemetry point. | 4-factor confidence index, uncertainty band width, freshness decay curve. |
| **Team Heatmap** | Total logged evidence count per member. | Team-wide dominant trend, risk state classification, skill gap synthesis. |
