# GrowthLens — Skill Retention & Future Competency Degradation Risk
## Product Requirements Document (PRD) — v2

**Version:** 2.0  
**Status:** Ready for Technical Validation and Implementation

---

## 1. Product Overview

GrowthLens is a continuous talent-intelligence platform that combines longitudinal evidence from assessments, project outcomes, course completions and other competency-related activity.

The existing dataset is primarily designed for **historical trajectory classification**. It contains:

- 8,000 learners
- 220 teams
- 12 competencies
- 51,949 trajectories
- 518,012 evidence rows
- 4–16 evidence points per trajectory
- approximately 150–365 days of observation

The existing trajectory labels are:

- improving
- stagnating
- declining

The new feature adds a separate predictive capability:

> **Skill Retention & Future Competency Degradation Risk**

The feature estimates whether future evidence indicates meaningful competency degradation after a prediction cutoff.

It does **not** claim to measure biological, cognitive, or literal human skill decay.

---

## 2. Problem Statement

The existing GrowthLens trajectory system answers:

> **What has happened to this competency over time?**

The new feature should answer:

> **Given the evidence available now, what is the future risk that competency performance will meaningfully deteriorate?**

This distinction is necessary because a learner can have:

```text
Historical trend = Improving
```

while simultaneously having:

```text
Recent reinforcement = Low
Future degradation risk = Elevated
```

The feature therefore complements rather than replaces the existing trajectory model.

---

## 3. Existing Dataset and Its Role

The current dataset was generated for longitudinal trajectory modeling.

### Core files

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

The existing evidence sources are:

```text
assessment
project_outcome
course_completion
```

with source-confidence weights:

```text
assessment       = 1.00
project_outcome  = 0.85
course_completion = 0.55
```

The existing trajectory model has a strong baseline and must remain a separate ML task.

---

## 4. Product Goal

Build a retention-risk feature that:

1. Uses only information available before a prediction timestamp.
2. Creates temporal prediction snapshots from existing evidence.
3. Derives a future degradation event from post-cutoff evidence.
4. Preserves censoring where no event is observed.
5. Estimates future retention/degradation risk.
6. Separates historical trajectory from future risk.
7. Provides prediction confidence.
8. Explains the major contributing factors.
9. Produces evidence-linked recommendations.
10. Supports future What-If simulation.

---

## 5. Critical Product Principle

### Historical decline ≠ future degradation risk

**Historical decline**

Means the observed evidence has already deteriorated.

Example:

```text
92 → 87 → 81 → 76 → 70
Historical trend = declining
```

**Future degradation risk**

Means the evidence available at the prediction cutoff suggests increased probability of future deterioration.

Example:

```text
60 → 72 → 81 → 88
Historical trend = improving

Recent reinforcement = low
Future risk = potentially elevated
```

The system must not treat inactivity alone as proof of skill loss.

---

## 6. Product Terminology

Use these terms in the product:

### Preferred

- Skill retention
- Retention risk
- Future competency degradation risk
- Estimated retention half-life
- Model confidence
- Evidence gap
- Reinforcement gap

### Avoid

- Cognitive decay
- Biological skill decay
- Guaranteed skill loss
- Skill has disappeared
- Employee is losing ability

The model is a synthetic-data prototype and estimates future performance degradation risk.

---

## 7. Target Users

### Learner / Employee

The learner can:

- view historical trend;
- view retention risk;
- understand why risk increased;
- inspect supporting evidence;
- receive reinforcement recommendations;
- run a What-If simulation.

### Manager / Mentor

The manager can:

- view aggregate retention risk;
- identify competencies requiring reinforcement;
- inspect evidence;
- support development conversations.

---

## 8. User Stories

### US-01

As a learner, I want to see future retention risk for each competency so that I can decide which skills may need reinforcement.

### US-02

As a learner, I want to understand why retention risk increased.

### US-03

As a learner, I want to distinguish historical skill trajectory from future retention risk.

### US-04

As a learner, I want a recommendation linked to the evidence that caused the risk.

### US-05

As a manager, I want to see aggregate retention risk across my team.

### US-06

As a manager, I want to inspect the evidence behind a retention-risk prediction.

---

## 9. Feature Scope

### In Scope

- Temporal prediction-snapshot generation
- Future degradation-event derivation
- Survival dataset creation
- Retention-risk modeling
- Risk probabilities for multiple horizons
- Retention half-life estimation
- Prediction confidence
- Explainability
- Evidence-linked recommendations
- API integration
- Dashboard integration
- What-If simulation
- Model evaluation
- Model/version tracking

### Out of Scope — v2

- Real employee HR decisions
- Medical or psychological inference
- Biological skill-decay measurement
- Automated employee evaluation
- Automated hiring/termination decisions
- Real-world decay claims from synthetic data

---

## 10. New Data-Processing Layer

The existing dataset does not directly contain:

```text
decay_event
days_to_decay
censored
outcome_timestamp
```

Therefore the product must first create a derived retention dataset.

Pipeline:

```text
Existing Evidence
       ↓
Temporal Prediction Cutoffs
       ↓
Pre-Cutoff Historical Evidence
       +
Post-Cutoff Future Evidence
       ↓
Future Degradation Event
       ↓
Censoring
       ↓
Decay Survival Dataset
```

---

## 11. Prediction Snapshot

A prediction snapshot represents:

```text
ONE learner
+
ONE competency
+
ONE prediction timestamp
```

Only evidence on or before the prediction timestamp may be used as input.

Example:

```text
Day 0
Day 15
Day 32
Day 60
Day 95
Day 130
Day 170
Day 210
```

Possible prediction cutoff:

```text
Day 95
```

Input:

```text
Day 0 → Day 95
```

Future outcome:

```text
Day 95 → Day 210
```

---

## 12. Future Degradation Event

A retention event must be defined as **meaningful future performance degradation**, not inactivity.

The event should require configurable evidence of sustained or sufficiently large deterioration.

Recommended configurable parameters:

```text
DECAY_DROP_THRESHOLD
MIN_CONFIRMING_OBSERVATIONS
FUTURE_HORIZON_DAYS
```

The exact values must be validated against the generated dataset before final model training.

---

## 13. Censoring

If the observation period ends before meaningful future degradation is observed:

```text
decay_event = 0
censored = 1
```

The system must not invent an event beyond the available data.

---

## 14. Model Relationship

GrowthLens should contain two separate ML layers.

```text
                    Evidence
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
     Historical Model       Retention Model
          LSTM              Survival Analysis
            │                     │
            ▼                     ▼
     Trend + Confidence      Future Risk
            │                     │
            └──────────┬──────────┘
                       ▼
              GrowthLens Intelligence
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
         Evidence  Recommendation What-If
```

The existing `trend_ground_truth` must not be used as a future-decay target.

If trend information is used by the retention model, use the **predicted trend and confidence from the existing trajectory model**, not the ground-truth label.

---

## 15. Expected Output

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

## 16. Risk Levels

Initial thresholds may be configured as:

```text
LOW     < 0.30
MEDIUM  0.30–0.60
HIGH    > 0.60
```

These are starting values only.

Thresholds must be validated and potentially tuned using validation data.

---

## 17. Confidence

Confidence is independent of risk.

Example:

```text
decay_probability = 0.72
prediction_confidence = 0.42
```

This is valid when the model predicts elevated risk but evidence is limited.

Confidence should consider:

- evidence volume;
- evidence recency;
- source diversity;
- historical stability;
- model uncertainty.

---

## 18. Recommendations

Examples:

```text
HIGH RISK + LOW REINFORCEMENT
→ practical project

MEDIUM RISK + STALE ASSESSMENT
→ assessment

HIGH RISK + SUFFICIENT EVIDENCE
→ project + mentor

LOW RISK
→ optional reinforcement
```

Every recommendation should reference supporting evidence.

---

## 19. What-If Simulation

The feature should eventually support:

```text
Current evidence
      ↓
Current risk
      ↓
Hypothetical reinforcement
      ↓
Updated feature state
      ↓
Model prediction
      ↓
Projected risk
```

Possible actions:

- assessment;
- project;
- course;
- repeated practice.

Results must be labelled:

> Model simulation

and not a guaranteed outcome.

---

## 20. Success Criteria

The feature is successful when:

- valid temporal prediction snapshots can be created;
- future degradation events can be derived;
- censoring is correctly handled;
- leakage tests pass;
- sufficient event volume exists for modeling;
- survival models train successfully;
- model performance is evaluated on held-out trajectories;
- risk predictions are generated;
- explanations are available;
- API integration works;
- frontend integration works;
- recommendations are evidence-linked.

If the derived event is too sparse or unreliable, implementation must stop and report that finding instead of forcing a survival model.

---

## 21. Product Metrics

### Model Metrics

- Concordance Index
- Time-dependent Brier Score
- Integrated Brier Score where available
- Calibration
- 30/60/90/180-day survival performance
- Horizon-specific ROC-AUC where appropriate
- Horizon-specific PR-AUC where appropriate

### Product Metrics

- Explanation coverage
- Recommendation evidence coverage
- False-warning rate
- Missed-risk rate
- Percentage of predictions with sufficient evidence

---

## 22. Future Extensions

Future versions may integrate:

- GitHub;
- Jira;
- RAG;
- automated evidence extraction;
- micro-learning;
- mentorship matching;
- manager heatmaps;
- external LMS/assessment systems.

