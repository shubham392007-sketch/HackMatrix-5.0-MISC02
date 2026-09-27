# GrowthLens Feature 2: Continuous Competency Trajectory & Growth Intelligence Engine
## Machine Learning Methodology & Architecture Specification

---

## 1. Executive Summary

**Feature 2** serves as the central machine learning intelligence layer of the GrowthLens talent intelligence platform. While Feature 1 ingests, normalizes, and embeds raw multi-modal evidence from connected enterprise sources (GitHub, Jira, assessments, project outcomes), Feature 2 models the **longitudinal trajectory** of each employee's competencies independently over time.

### Core Principles & Non-Negotiables:
1. **Independent Competency Trajectories**: Trajectories are strictly computed per `(employee_id, competency_id)` tuple. Under no circumstances are competencies collapsed into an aggregate employee score.
2. **Real Deep Learning (Zero Fabrication)**: Trajectory classifications (`improving`, `stagnating`, `declining`) and probabilities are derived exclusively from a trained PyTorch Long Short-Term Memory (LSTM) sequence neural network. No hardcoded heuristics, random values, or fake ML.
3. **Temporal Causality & Zero Leakage**: Features are engineered using only past observations ($E_0, \dots, E_k$). Train, validation, and test datasets are partitioned chronologically.
4. **Insufficient Evidence Safeguards**: Employees with fewer than 3 historical evidence events for a competency receive an explicit `insufficient_evidence` status with $0.0$ confidence.
5. **Calibrated Confidence & Exponential Freshness**: Confidence is mathematically computed from model softmax probability, historical evidence volume, and continuous half-life temporal decay.
6. **Isolated Counterfactual Simulation**: The What-If Simulator executes hypothetical interventions through the exact same feature extractor and LSTM model without ever mutating production database records.

---

## 2. System Architecture & Pipeline Flow

```mermaid
flowchart TD
    subgraph Feature 1 [Feature 1: Evidence Layer]
        DB[(Supabase PostgreSQL)]
        CSV[misc02_dataset/evidence.csv]
    end

    subgraph Feature 2 [Feature 2: Trajectory Engine]
        Adapter[Feature 1 Evidence Adapter]
        Prep[Evidence Preprocessor & Deduplicator]
        FeatEng[8-Dimensional Temporal Feature Extractor]
        SeqBuilder[Sequence Builder & Pre-Padding Tensor (1, 10, 8)]
        LSTM[PyTorch CompetencyLSTM + Temporal Attention]
        FreshEng[Freshness Decay Engine (Half-Life = 60d)]
        ConfEng[Calibrated Confidence Engine]
        Explainer[Evidence Traceability & Explainability]
    end

    subgraph Persistence & Downstream Consumers
        TrajectoryDB[(public.competency_trajectories)]
        Feature3[Feature 3: Action Engine]
        Feature4[Feature 4: Growth Intelligence]
        WhatIf[Isolated What-If Simulator]
    end

    DB --> Adapter
    CSV --> Adapter
    Adapter --> Prep
    Prep -->|Insufficient < 3| InsufficientFallback[Insufficient Evidence Trajectory]
    Prep -->|Events >= 3| FeatEng
    FeatEng --> SeqBuilder
    SeqBuilder --> LSTM
    LSTM --> ConfEng
    Prep --> FreshEng
    FreshEng --> ConfEng
    ConfEng --> Explainer
    Explainer --> TrajectoryDB
    TrajectoryDB --> Feature3
    TrajectoryDB --> Feature4
    SeqBuilder -.-> WhatIf
    LSTM -.-> WhatIf
```

---

## 3. Mathematical Formulations & Feature Engineering

For each chronological evidence event $E_k$ ($k = 0, \dots, n-1$), the system extracts an 8-dimensional longitudinal feature vector $\mathbf{x}_k \in \mathbb{R}^8$:

| Index | Feature Name | Formula / Definition | Range |
|---|---|---|---|
| $0$ | `score_norm` | $\frac{S_k - 50.0}{50.0}$ (centered at 50) | $[-1.0, 1.0]$ |
| $1$ | `score_missing_flag` | $1.0$ if $S_k$ unobserved, else $0.0$ | $\{0.0, 1.0\}$ |
| $2$ | `evidence_strength` | Extraction confidence weight | $[0.0, 1.0]$ |
| $3$ | `gap_days_norm` | $\min\left(1.0, \frac{t_k - t_{k-1}}{90}\right)$ | $[0.0, 1.0]$ |
| $4$ | `score_delta` | $\frac{S_k - S_{k-1}}{100.0}$ (immediate step velocity) | $[-1.0, 1.0]$ |
| $5$ | `cumulative_delta`| $\frac{S_k - S_0}{100.0}$ (overall velocity from baseline) | $[-1.0, 1.0]$ |
| $6$ | `source_diversity_norm` | $\frac{|\text{Distinct sources up to } k|}{5.0}$ | $[0.0, 1.0]$ |
| $7$ | `recency_norm` | $\min\left(1.0, \frac{t_{\text{now}} - t_k}{180}\right)$ | $[0.0, 1.0]$ |

### Pre-Padding & Attention Masking
Input sequences are padded to a fixed maximum length $T = 10$. If an employee sequence has $m < 10$ events ($m \ge 3$), the sequence is pre-padded with zero vectors at positions $0 \dots (10 - m - 1)$. An attention mask $\mathbf{m} \in \{0, 1\}^{10}$ marks valid observations ($1$) versus padded slots ($0$), ensuring the LSTM attention layer ignores padded steps.

---

## 4. PyTorch LSTM Model Specification

```
CompetencyLSTM(
  (lstm): LSTM(input_size=8, hidden_size=32, num_layers=1, batch_first=True)
  (attention): TemporalAttention(
    (attn): Sequential(
      (0): Linear(in_features=32, out_features=16)
      (1): Tanh()
      (2): Linear(in_features=16, out_features=1)
    )
  )
  (classifier): Sequential(
    (0): Linear(in_features=32, out_features=16)
    (1): ReLU()
    (2): Dropout(p=0.2)
    (3): Linear(in_features=16, out_features=3)
  )
)
```

- **Output Classes**:
  - `0`: Declining
  - `1`: Stagnating
  - `2`: Improving
- **Softmax Layer**: Guarantees $\sum_{c=0}^2 P(c) = 1.0$.

---

## 5. Confidence & Freshness Modeling

### Continuous Exponential Freshness Decay
Evidence freshness follows an exponential half-life decay model with half-life $H = 60$ days:
$$\lambda = \frac{\ln(2)}{60} \approx 0.01155$$
$$F(\Delta t) = \max\left(0.05, \exp(-\lambda \cdot \Delta t)\right)$$

| Days Elapsed | Freshness State | Multiplier $F(\Delta t)$ |
|---|---|---|
| $0 - 30$ days | `fresh` | $1.00 \to 0.71$ |
| $31 - 60$ days | `recent` | $0.70 \to 0.50$ |
| $61 - 90$ days | `aging` | $0.49 \to 0.35$ |
| $> 90$ days | `stale` | $< 0.35$ |

### Calibrated Confidence Formula
$$C = P(\hat{y}) \cdot \Big[ 0.40 \cdot V(n) + 0.35 \cdot F(\Delta t) + 0.25 \cdot Q \Big]$$
where:
- $P(\hat{y}) \in [0.33, 1.0]$ is the model softmax probability of the predicted class.
- $V(n) = \min(1.0, 0.40 + 0.075 \cdot n)$ is evidence volume scaling (reaches $1.0$ at 8 observations).
- $F(\Delta t)$ is the continuous freshness decay multiplier.
- $Q \in [0.4, 1.0]$ is the mean historical evidence extraction strength.
- Confidence is strictly clamped to $[0.10, 0.98]$ (no unrealistic 100% assertions). For `insufficient_evidence`, $C = 0.0$.

---

## 6. Real Model Evaluation & Benchmark Results

The model was trained on the chronological development dataset using class-weighted Cross-Entropy loss and evaluated on a held-out test split of 169 temporal sequences:

- **Model Version**: `feature2_lstm_v1`
- **Total Test Sequences**: 169
- **Overall Accuracy**: **80.47%** (vs. **43.79%** majority baseline)
- **Macro Precision**: **85.21%**
- **Macro Recall**: **84.73%**
- **Macro F1 Score**: **0.8140**
- **Test Loss**: **0.5482**

### Per-Class Performance Breakdown:
| Trajectory Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| **Declining** | 100.0% | 96.08% | **0.9800** | 51 |
| **Stagnating** | 97.73% | 58.11% | **0.7288** | 74 |
| **Improving** | 57.89% | 100.0% | **0.7333** | 44 |

### Confusion Matrix (Test Set):
```
                Predicted Declining   Predicted Stagnating   Predicted Improving
True Declining          49                     1                      1
True Stagnating          0                    43                     31
True Improving           0                     0                     44
```

---

## 7. Isolated What-If Counterfactual Simulator

The simulator (`backend/feature2/what_if.py`) allows employees and managers to explore prospective reinforcement interventions (e.g. assessments, project outcomes, course completions) without polluting production telemetry:

1. **Baseline Evaluation**: Computes the current trajectory using genuine historical evidence.
2. **Transient In-Memory Injection**: A single synthetic event with `is_counterfactual=True` is appended to the transient sequence.
3. **Identical Deep Pipeline**: The sequence is transformed by `TemporalFeatureExtractor` and processed by the exact same `CompetencyLSTM` model.
4. **Delta Calculation**: Computes class probability deltas ($\Delta P$) and confidence delta ($\Delta C$).
5. **Database Immutability**: Production evidence tables and `competency_trajectories` remain completely untouched.

---

## 8. API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/trajectories/{employee_id}` | GET | Returns all competency trajectories for an employee. |
| `/api/v1/trajectories/{employee_id}/{competency_id}` | GET | Returns single competency trajectory with evidence citations. |
| `/api/v1/trajectories/simulate` | POST | Executes isolated What-If counterfactual simulation. |
| `/api/v1/model/status` | GET | Returns active PyTorch model health, parameters, and metadata. |
| `/api/v1/model/evaluation` | GET | Returns authoritative evaluation report and confusion matrix. |
| `/api/v1/model/retrain` | POST | Triggers retraining of the Feature 2 LSTM model. |
