# Feature 4 Privacy Architecture & Safeguards

**Module:** Feature 4 – Growth Intelligence & Manager Insights  
**Standard:** Strict Aggregate Privacy & k-Anonymity Guardrails  

---

## 1. Core Privacy Tenets

1. **Non-Identifiability**: A learner's peer benchmark comparison never reveals the names, IDs, scores, or ranking positions of any other employee.
2. **$k$-Anonymity Cohort Gating**: Benchmarks require a configurable minimum cohort threshold ($k \ge 3$, default $5$). Below this threshold, percentiles are completely suppressed.
3. **No Raw Peer Telemetry**: APIs never return peer distribution arrays, histograms with single-count buckets, or un-bucketed cohort sizes.
4. **Authorized Manager Scoping**: Managers only access team-level aggregate matrices for their authorized organizational department. Detailed personal evidence is never uninvitedly exposed.
5. **Secret Redaction**: All API responses pass through sanitization layers to guarantee zero exposure of GitHub PATs, Jira tokens, or JWTs.

---

## 2. Peer Benchmarking Privacy Safeguards

### 2.1 Configuration
```python
PEER_BENCHMARK_MIN_COHORT_SIZE = int(os.getenv("PEER_BENCHMARK_MIN_COHORT_SIZE", "5"))
```

### 2.2 Suppression Decision Tree
```
Is Cohort Size >= PEER_BENCHMARK_MIN_COHORT_SIZE?
  ├── NO  ──> Suppress benchmark (return "Not enough comparable peers to provide a privacy-safe benchmark.")
  └── YES ──> Is Cohort Range > 0?
                ├── NO  ──> Suppress benchmark (avoid division by zero / identical score leakage)
                └── YES ──> Compute empirical percentile rank. Return bucketed cohort size (e.g. "10-25 peers").
```

### 2.3 Differential Query Protection
- Cohort sizes are always returned in coarse buckets:
  - `< 5`: Suppressed
  - `5–9 peers`
  - `10–25 peers`
  - `25–50 peers`
  - `50+ peers`
- Prevents differential inference attacks where subtracting query outputs across periods isolates individual contributors.

---

## 3. Manager Heatmap Privacy Boundaries

- **Cell Representation**: Cells show trend icons ($\uparrow, \rightarrow, \downarrow$), confidence tiers, and freshness states.
- **Evidence Containment**: Clicking a cell in the team heatmap **does not** fetch raw commit diffs, PR descriptions, or assessment questions.
- **Drill-down Authorization**: Only individual 1:1 briefing mode with explicit learner/manager authorization can inspect linked evidence records.
