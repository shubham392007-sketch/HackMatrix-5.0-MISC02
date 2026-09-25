# GrowthLens — Skill Retention & Future Competency Degradation Risk
## Technical Requirements Document (TRD) — v2

**Version:** 2.0  
**Status:** Ready for Technical Validation and Implementation

---

## 1. Technical Objective

Implement a separate predictive layer for future competency degradation risk using the existing longitudinal GrowthLens dataset.

The existing LSTM trajectory model remains responsible for:

```text
improving
stagnating
declining
```

The new model estimates:

```text
future retention / degradation risk
```

---

## 2. Existing Dataset

Available data:

```text
learners.csv
competencies.csv
evidence.csv
trajectories.csv
trajectory_features.csv
train_val_test_split.csv
feature_importance_sanity_check.csv
dataset_stats.json
```

Dataset characteristics:

```text
8,000 learners
220 teams
12 competencies
51,949 trajectories
518,012 evidence rows
4–16 evidence points per trajectory
approximately 150–365 observation days
```

Existing evidence sources:

```text
assessment
project_outcome
course_completion
```

Source weights:

```text
assessment        = 1.00
project_outcome   = 0.85
course_completion = 0.55
```

---

## 3. Existing ML Task

The current dataset is primarily a trajectory-classification dataset.

Ground-truth labels:

```text
improving
stagnating
declining
```

Existing trend model performance is already strong.

Therefore the retention model must not simply recreate the trajectory-classification task.

---

## 4. New Derived Dataset

Create without modifying original files:

```text
derived_data/
├── decay_prediction_snapshots.csv
└── decay_survival_dataset.csv
```

---

## 5. Temporal Prediction Snapshots

For each trajectory, sort evidence chronologically.

Create multiple prediction cutoffs where enough historical and future evidence exists.

Each snapshot represents:

```text
trajectory_id
learner_id
competency_id
prediction_timestamp
```

For every snapshot:

### Input window

Only evidence:

```text
timestamp <= prediction_timestamp
```

### Future window

Evidence:

```text
timestamp > prediction_timestamp
```

is used only to derive the outcome.

---

## 6. Minimum Snapshot Requirements

Require configurable minimum historical evidence before creating a snapshot.

Example:

```text
MIN_HISTORICAL_EVIDENCE = 3
```

Require sufficient future observation time before declaring a non-event/censored case.

Do not create unreliable snapshots.

---

## 7. Future Degradation Target

The current data does not contain a direct decay target.

Therefore derive:

```text
decay_event
days_to_decay
censored
event_timestamp
future_observation_days
```

### Event definition

A decay event means:

> meaningful future performance degradation relative to the pre-cutoff historical baseline.

Do not use inactivity alone.

Do not use one isolated low score as sufficient evidence.

Use a configurable sustained/confirmed degradation rule.

---

## 8. Target Configuration

Create:

```text
config/retention_config.yaml
```

Example:

```yaml
minimum_historical_evidence: 3
decay_drop_threshold: 10
minimum_confirming_observations: 2
future_horizons_days:
  - 30
  - 60
  - 90
  - 180
risk_thresholds:
  low: 0.30
  medium: 0.60
```

These values are initial configuration and must be validated.

---

## 9. Censoring

If no event occurs before the available observation period ends:

```text
decay_event = 0
censored = 1
```

Do not extrapolate an event beyond the dataset.

---

## 10. Required Retention Dataset Schema

```text
trajectory_id
learner_id
competency_id
prediction_timestamp
historical_feature_end_timestamp

decay_event
days_to_decay
censored
event_timestamp
future_observation_days

historical_mean
historical_std
historical_min
historical_max
recent_mean
recent_std
current_score
historical_peak
recent_vs_historical_change

slope_per_day
slope_per_30d
score_delta
recent_slope
historical_slope

days_since_last_evidence
days_since_last_assessment
days_since_last_project
days_since_last_course

evidence_count_30d
evidence_count_60d
evidence_count_90d
evidence_count_180d

assessment_count_90d
project_count_90d
course_count_90d

average_days_between_evidence
median_days_between_evidence
maximum_evidence_gap
evidence_frequency

source_diversity
assessment_ratio
project_ratio
course_ratio
weighted_mean_score
```

---

## 11. Leakage Prevention

For every feature:

```text
feature_timestamp <= prediction_timestamp
```

must hold.

The following must never be input features:

```text
decay_event
days_to_decay
event_timestamp
future scores
future assessments
future projects
future activity
future evidence
```

Create automated leakage assertions.

If any leakage is found:

```text
FAIL TRAINING PIPELINE
```

---

## 12. Existing Trend Information

Do not use:

```text
trend_ground_truth
```

as a future decay target or as a leakage-prone feature.

If the retention model uses trend information, obtain:

```text
predicted_trend
predicted_trend_confidence
```

from the existing trajectory model.

This creates:

```text
LSTM
↓
Historical trend
↓
Retention model
```

rather than:

```text
Ground truth trend
↓
Retention model
```

---

## 13. Feature Groups

### Recency

```text
days_since_last_evidence
days_since_last_assessment
days_since_last_project
days_since_last_course
```

### Reinforcement

```text
evidence_count_30d
evidence_count_60d
evidence_count_90d
evidence_count_180d
```

### Performance

```text
historical_mean
historical_std
historical_min
historical_max
recent_mean
recent_std
current_score
historical_peak
recent_vs_historical_change
```

### Temporal trajectory

```text
slope_per_day
slope_per_30d
score_delta
recent_slope
historical_slope
```

### Evidence timing

```text
average_days_between_evidence
median_days_between_evidence
maximum_evidence_gap
evidence_frequency
```

### Source diversity

```text
source_diversity
assessment_ratio
project_ratio
course_ratio
weighted_mean_score
```

---

## 14. Model Architecture

### Model A — Existing LSTM

Purpose:

```text
Historical trajectory classification
```

Output:

```text
trend
trend_confidence
```

### Model B — Retention Model

Purpose:

```text
Future degradation-risk estimation
```

Recommended architecture:

```text
Weibull survival baseline
        +
Gradient-boosted survival model
        ↓
Retention risk
```

Candidate gradient-boosted model:

```text
XGBoost survival:cox
```

Alternative survival-compatible implementation may be used if more appropriate.

---

## 15. Why Survival Analysis

The new task is temporal.

We need to estimate:

```text
When might meaningful degradation occur?
```

rather than only:

```text
Will degradation occur?
```

Therefore preserve:

```text
time-to-event
+
censoring
```

where possible.

---

## 16. Model Evaluation

Evaluate:

### Survival

- Concordance Index
- Time-dependent Brier Score
- Integrated Brier Score where available
- Calibration

### Horizon-based

- 30-day
- 60-day
- 90-day
- 180-day

Calculate ROC-AUC and PR-AUC only where appropriate.

---

## 17. Required Ablation Experiments

Run:

### Experiment A

Historical features only.

### Experiment B

Historical + recency.

### Experiment C

Historical + recency + reinforcement.

### Experiment D

All features.

Also run an ablation excluding:

```text
slope_per_30d
score_delta
trend_ground_truth
```

The purpose is to verify that the retention model adds predictive information instead of merely reproducing the existing trajectory classifier.

---

## 18. Split Strategy

The existing trend model may use the established trajectory split.

For retention modeling:

**All snapshots from one `trajectory_id` must remain in one split.**

Never allow:

```text
trajectory T1 snapshot 1 → train
trajectory T1 snapshot 2 → test
```

This would cause leakage.

Use:

```text
trajectory-grouped temporal split
```

and document:

- train trajectory count;
- validation trajectory count;
- test trajectory count;
- snapshot counts in each split;
- cutoff-date ranges.

---

## 19. Model Outputs

Generate:

```text
learner_id
competency_id
prediction_timestamp

historical_trend
historical_trend_confidence

decay_probability_30d
decay_probability_60d
decay_probability_90d
decay_probability_180d

risk_level

estimated_retention_half_life_days

prediction_confidence

last_meaningful_evidence

risk_factors

model_version
```

---

## 20. Confidence

Keep:

```text
risk probability
```

separate from:

```text
prediction confidence
```

Confidence should consider:

- evidence volume;
- evidence recency;
- source diversity;
- historical stability;
- model uncertainty.

---

## 21. Explainability

Use SHAP or another compatible feature-attribution mechanism.

Return user-friendly factors such as:

```text
Low recent reinforcement
Long evidence gap
Recent performance below historical peak
Limited evidence-source diversity
```

Do not expose raw SHAP values directly to users.

---

## 22. Recommendation Engine

Create recommendation logic based on:

```text
risk
+
confidence
+
evidence state
```

Examples:

```text
HIGH + low reinforcement
→ practical project

MEDIUM + stale assessment
→ assessment

HIGH + sufficient evidence
→ project + mentor

LOW
→ optional reinforcement
```

Every recommendation should include evidence references.

---

## 23. API

Implement:

```http
GET /api/v1/learner/{learner_id}/retention

GET /api/v1/learner/{learner_id}/retention/{competency_id}
```

Example:

```json
{
  "learner_id": "L001",
  "competency_id": "C003",
  "historical_trend": "improving",
  "historical_trend_confidence": 0.91,
  "decay_probability_30d": 0.12,
  "decay_probability_60d": 0.19,
  "decay_probability_90d": 0.31,
  "decay_probability_180d": 0.47,
  "risk_level": "MEDIUM",
  "estimated_retention_half_life_days": 168,
  "prediction_confidence": 0.79,
  "risk_factors": [],
  "recommendations": []
}
```

---

## 24. Database

```sql
CREATE TABLE skill_retention_predictions (
    prediction_id UUID PRIMARY KEY,
    learner_id VARCHAR NOT NULL,
    competency_id VARCHAR NOT NULL,
    prediction_timestamp TIMESTAMP NOT NULL,
    decay_probability_30d FLOAT,
    decay_probability_60d FLOAT,
    decay_probability_90d FLOAT,
    decay_probability_180d FLOAT,
    risk_level VARCHAR,
    estimated_retention_half_life_days FLOAT,
    prediction_confidence FLOAT,
    model_version VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Add indexes on:

```text
learner_id
competency_id
prediction_timestamp
```

---

## 25. What-If Simulation

Input:

```text
assessment
project
course
practice
```

Flow:

```text
Current state
↓
Current risk
↓
Hypothetical reinforcement
↓
Updated feature state
↓
Retention model
↓
Projected risk
```

Clearly label as:

```text
MODEL SIMULATION
```

---

## 26. Frontend

Add a Retention Risk section to the existing competency detail page.

Display:

```text
Historical Trend
Trend Confidence

Retention Risk
30-day probability
60-day probability
90-day probability
180-day probability

Estimated retention half-life

Risk factors

Evidence

Recommended action

What-If simulator
```

---

## 27. Model Artifacts

```text
models/
└── retention/
    ├── weibull_baseline.pkl
    ├── survival_model.pkl
    ├── feature_config.json
    ├── model_metadata.json
    └── evaluation.json
```

---

## 28. Required Files

```text
derived_data/
    decay_prediction_snapshots.csv
    decay_survival_dataset.csv

ml/
    retention_features.py
    build_retention_dataset.py
    survival_baseline.py
    survival_model.py
    train_retention.py
    evaluate_retention.py
    retention_inference.py
    explain_retention.py

config/
    retention_config.yaml

models/
    retention/

reports/
    retention_model_report.md
    retention_evaluation.json

tests/
    test_retention_features.py
    test_retention_leakage.py
    test_retention_split.py
    test_retention_targets.py
```

---

## 29. Testing

Automated tests must cover:

- chronological ordering;
- prediction cutoff;
- future evidence exclusion;
- event generation;
- censoring;
- grouped splitting;
- missing evidence;
- sparse evidence;
- irregular intervals;
- model training;
- inference;
- API output;
- recommendations.

---

## 30. Validation Gate

Before model training, generate:

```text
Valid snapshots
Decay events
Censored cases
Event rate
Median future observation horizon
Snapshots per trajectory
```

If the event rate is too low or the event definition is unstable:

**do not force survival modeling.**

Report the problem and propose a revised target.

---

## 31. Final Technical Report

Generate:

```text
reports/retention_model_report.md
```

Include:

1. Dataset characteristics
2. Snapshot construction
3. Event definition
4. Censoring
5. Feature engineering
6. Leakage prevention
7. Split methodology
8. Baseline model
9. Survival model
10. Metrics
11. Ablation results
12. Noisy-case results
13. Calibration
14. Limitations
15. Example predictions
16. Next improvements

---

## 32. Important Technical Constraints

Do not:

- regenerate the original data;
- modify original CSVs;
- use future evidence as input;
- use `trend_ground_truth` as a decay target;
- split snapshots from the same trajectory across train/test;
- equate inactivity with degradation;
- claim literal human skill decay;
- report metrics without evaluation.

Do:

- preserve the existing LSTM;
- derive temporal prediction snapshots;
- preserve time-to-event and censoring;
- prevent leakage;
- use grouped splitting;
- separate risk from confidence;
- explain predictions;
- keep recommendations evidence-linked;
- document the synthetic proxy nature of the target.
