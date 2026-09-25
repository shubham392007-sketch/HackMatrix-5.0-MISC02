# GrowthLens — Continuous Talent Intelligence & Skill Retention Engine
**HackMatrix 5.0 Track:** MISC02 – Continuous Talent Intelligence & Skill Growth  
**Implementation:** Dual-Module Talent Intelligence Platform  
**Technologies:** FastAPI, Parametric Weibull Survival Analysis, Supabase PostgreSQL, Ollama (Qwen3 8B), ChromaDB, LangChain, Vanilla Modern Web Dashboard

---

## 1. System Architecture & File Structure

GrowthLens is structured into two complementary subsystems:
1. **Feature 1 (`backend/`)**: AI-driven Evidence Extraction, Identity Resolution & Scoped RAG Justification Engine.
2. **Feature 2 (`ml/`, `routers/`, `services/`, `static/`, `main.py`)**: Skill Retention & Decay Risk Survival Prediction, Counterfactual "What-If" Simulation, and Next-Action Recommendations.

```text
HackMatrix-5.0-MISC02/
├── backend/                       # Feature 1: Evidence Extraction & RAG Pipeline
│   ├── api/routes/                # Routers (health, github, jira, rag, identities, evidence)
│   ├── core/                      # Config, logging, custom exceptions
│   ├── embeddings/                # Vector embeddings
│   ├── llm/                       # LLM integration (Ollama / Qwen3 8B)
│   ├── rag/                       # Scoped retrieval justification engine
│   ├── static/                    # Feature 1 Developer Workbench
│   └── main.py                    # Feature 1 FastAPI server
│
├── ml/                            # Feature 2: Retention ML Pipeline & Inference
│   ├── build_retention_dataset.py # Extracts longitudinal snapshots from misc02_dataset/
│   ├── retention_features.py      # Core NumPy temporal feature engineering pipeline
│   ├── train_retention_weibull.py # Reproducible Weibull AFT training & artifact persistence
│   ├── retention_inference.py     # Production inference, survival curves & What-If simulator
│   └── compare_models.py          # Benchmarking suite (Weibull vs XGBoost vs CoxPH)
│
├── routers/                       # Feature 2 & Recommendations API Routers
│   ├── retention.py               # Retention risk assessment & What-If simulation endpoints
│   └── recommendations.py         # Next-action recommendations & mentorship pairing
│
├── services/                      # Feature 2 Backend Services
│   ├── retention_service.py       # In-memory dataset cache & orchestration engine
│   ├── mentorship_service.py      # Peer mentorship matching service
│   └── youtube_service.py         # Tutorial recommendation service
│
├── models/
│   ├── recommendations.py         # SQLAlchemy database models
│   └── retention/                 # Persisted ML binaries (weibull_model.pkl, scaler.pkl, metadata.json)
│
├── static/                        # Feature 2 Web UI
│   └── index.html                 # Clean, tabbed Retention & What-If dashboard
│
├── tests/                         # Comprehensive Automated Test Suites
│   ├── test_retention_model.py    # Retention model mathematical & API tests (9 tests)
│   ├── test_retention_leakage.py  # Temporal non-leakage & horizon integrity tests
│   ├── test_retention_split.py    # Grouped split trajectory isolation tests
│   └── conftest.py                # Pytest configuration & environment paths
│
├── misc02_dataset/                # Competition synthetic dataset (8k learners, 518k evidence rows)
├── derived_data/                  # Processed survival dataset (decay_survival_dataset.csv)
├── reports/                       # Model evaluation benchmarks and comparison markdown
├── main.py                        # Feature 2 Production FastAPI Server
├── pyproject.toml                 # uv project configuration and dependencies
└── README.md                      # Platform documentation
```

---

## 2. Feature 2: Skill Retention & Decay Risk Intelligence

Feature 2 uses survival analysis (Parametric Weibull Accelerated Failure Time) to predict the risk of skill decay before proficiency drops.

### Core Capabilities:
- **Parametric Survival Function ($S(t)$)**: Predicts absolute probability of skill retention at 30, 60, 90, and 180 days.
- **90-Day Decay Risk Score**: Calibrated probability metric ($0.0$ to $1.0$) indicating decay urgency.
- **Mathematical Factor Attribution**: Decomposes Weibull hazard ratios ($\beta_i \cdot z_i$) into plain-English root causes (e.g. downward momentum, practice gaps, low activity volume).
- **What-If Counterfactual Simulator**: Simulates hypothetical interventions (hands-on projects, formal exams, courses) and computes the counterfactual risk reduction and lifespan gained in real time.

### Model Benchmarks:
| Metric | Weibull AFT (Deployed) | Survival GBM (XGBoost) |
| :--- | :--- | :--- |
| **Concordance Index (C-Index)** | **0.7939** | 0.8042 |
| **30-Day Retention AUC** | **0.8110** | 0.8229 |
| **60-Day Retention AUC** | **0.8216** | 0.8303 |
| **90-Day Retention AUC** | **0.8289** | 0.8347 |
| **180-Day Retention AUC** | **0.8472** | 0.8472 |
| **Brier Score** | **0.1366** | N/A (Cox relative hazard only) |

---

## 3. Running the Applications

### Feature 2 Dashboard & Retention Engine (Default):
```bash
# Start the primary dashboard server on port 8000
uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- **Web Dashboard:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Feature 1 Evidence Extraction & RAG Pipeline:
```bash
# Start the Feature 1 backend on port 8080
uv run uvicorn backend.main:app --host 127.0.0.1 --port 8080 --reload
```
- **Feature 1 API Docs:** [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

---

## 4. Running Tests

Run the full retention verification suite:
```bash
# Run all model, temporal leakage, and split tests
.venv/Scripts/pytest.exe tests/ -v
```
All 11 tests pass with zero warnings:
- `test_feature_leakage`: Confirms observation duration $\ge 0$ and no lookahead.
- `test_model_artifacts_exist`: Verifies `weibull_model.pkl`, `scaler.pkl`, and `model_metadata.json`.
- `test_model_metadata_structure`: Verifies metadata schema and C-index $\ge 0.75$.
- `test_survival_probability_monotonicity`: Verifies $S(30d) \ge S(60d) \ge S(90d) \ge S(180d) \in [0, 1]$.
- `test_directional_sensitivity`: Confirms improving trajectories strictly exhibit lower decay risk.
- `test_counterfactual_simulation_reduces_risk`: Validates intervention simulation math.
- `test_model_performance_on_dataset`: Validates held-out sample C-index $\ge 0.78$.
- `test_api_retention_endpoint`: Tests `GET /api/v1/learner/{id}/retention`.
- `test_api_simulate_endpoint`: Tests `POST /api/v1/learner/{id}/retention/simulate`.
- `test_api_learners_endpoint`: Tests `GET /api/v1/learners`.
- `test_split_grouping`: Verifies 0% trajectory overlap between train and test splits.

---

## 5. API Reference (Feature 2)

- `GET /api/v1/learner/{learner_id}/retention`: Returns real-time decay risk, survival curve, and key risk factors.
- `POST /api/v1/learner/{learner_id}/retention/simulate`: Evaluates a counterfactual learning action and outputs risk delta.
- `GET /api/v1/learners`: Returns sample learners catalog for demonstration.
- `GET /api/v1/learner/{learner_id}/competencies`: Returns tracked competencies for a learner.
- `GET /api/v1/learner/{learner_id}/recommendations`: Returns next-action tutorials and peer mentorship matches.
- `POST /api/v1/manager/mentorship/request`: Dispatches a peer mentorship request.
