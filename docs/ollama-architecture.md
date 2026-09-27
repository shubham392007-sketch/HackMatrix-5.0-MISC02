# GrowthLens Ollama Qwen3 8B Architecture

## 1. System Overview
GrowthLens integrates a local instance of the **Ollama Qwen3 8B** model as its central LLM intelligence layer. This integration strictly complies with HackMatrix 5.0 constraints:
- **Zero External Paid LLM APIs**: All language modeling runs on the local daemon (`http://localhost:11434`).
- **No Direct LLM Access**: The frontend never connects directly to Ollama; all requests flow through authenticated FastAPI backend endpoints.
- **Deterministic Math / Analytical Decoupling**: Numerical calculations (Weibull decay probabilities, scoring, rankings) remain deterministic and cannot be overridden by LLM generations.
- **Air-Gapped Privacy**: Zero employee data or repository access tokens leave the host machine.

---

## 2. High-Level Component Topology

```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
│                                                             │
│  ┌─────────────────┐   ┌────────────────┐   ┌────────────┐  │
│  │ Feature 1       │   │ Feature 2      │   │ Feature 3  │  │
│  │ Ingestion & RAG │   │ Retention &    │   │ Next-Action│  │
│  │ Pipeline        │   │ Trajectory     │   │ Engine     │  │
│  └────────┬────────┘   └───────┬────────┘   └─────┬──────┘  │
│           │                    │                  │         │
│           └────────────────────┼──────────────────┘         │
│                                │                            │
│                                ▼                            │
│                 ┌─────────────────────────────┐             │
│                 │    Central QwenService      │             │
│                 │ (Singleton Intelligence     │             │
│                 │  Gateway)                   │             │
│                 └──────────────┬──────────────┘             │
│                                │                            │
│                  ┌─────────────┴────────────┐               │
│                  ▼                          ▼               │
│         ┌─────────────────┐       ┌─────────────────┐       │
│         │ LLM Output      │       │ LangChain       │       │
│         │ Validator       │       │ ChatOllama      │       │
│         │ (Citation Check)│       │ Client          │       │
│         └────────┬────────┘       └────────┬────────┘       │
└──────────────────┼─────────────────────────┼────────────────┘
                   │                         │
                   ▼                         ▼
         ┌─────────────────┐       ┌─────────────────┐
         │ PostgreSQL /    │       │ Local Ollama    │
         │ Supabase        │       │ Daemon          │
         │ Evidence Table  │       │ (Port 11434)    │
         └─────────────────┘       └─────────────────┘
```

---

## 3. Communication Protocols & Boundaries
- **Transport**: HTTP REST over `localhost:11434` with LangChain `ChatOllama` wrapper and `asyncio.wait_for` hard timeouts.
- **Data Exchange**: Pure JSON format (`format="json"` in payload).
- **Timeouts**: Hard timeout ceiling (45s for complex synthesis, 15s for extraction/explanation) with deterministic grounded fallback structures.
- **Secret Scrubbing**: Automatic redaction of credentials, tokens, and authorization headers across all logging channels.
