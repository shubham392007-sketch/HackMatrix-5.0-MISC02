# Ollama & Local AI Setup — Skill Passport

Skill Passport uses **Ollama** to run high-performance, private, local Large Language Models (LLMs) and embedding models without transmitting confidential engineering code or private company documents to third-party cloud AI APIs.

---

## 1. Why Qwen3 8B?

The primary model powering work analysis and skill extraction in Skill Passport is **Qwen3 8B** (`qwen3:8b`):

- **Structured Output Reliability**: Excellent adherence to strict JSON schemas, reducing schema-validation failures in the Trust & Governance pipeline.
- **Code & Engineering Comprehension**: High benchmark performance on source code, pull request diffs, git commit syntax, and technical RFC decomposition.
- **Memory Efficiency**: Fits comfortably within 6 GB – 8 GB of GPU VRAM, allowing complete layer offload on consumer and workstation GPUs (NVIDIA RTX 3060/4060, Apple M1/M2/M3 silicon).

---

## 2. Installation & Setup

### 2.1 Install Ollama
Download and install Ollama for your operating system:
- **Windows**: Download the installer from [ollama.ai/download/windows](https://ollama.ai/download/windows).
- **macOS**: Download from [ollama.ai/download/mac](https://ollama.ai/download/mac).
- **Linux**:
  ```bash
  curl -fsSL https://ollama.ai/install.sh | sh
  ```

### 2.2 Verify Ollama Service
Once installed, verify the daemon is running by checking the API endpoint:
```bash
curl http://localhost:11434/api/tags
```
*Expected response:* A JSON object with a list of currently installed models (`{"models": [...]}`).

---

## 3. Pulling Required Models

Skill Passport requires two local models:

### 3.1 Primary Work Analyzer Model (`qwen3:8b`)
```bash
ollama pull qwen3:8b
```
- **Size**: ~4.9 GB
- **Role**: Parses ingested text, separates facts from claims, identifies technologies, extracts skills, and generates confidence scores.

### 3.2 Dense Embedding Model (`nomic-embed-text`)
```bash
ollama pull nomic-embed-text
```
- **Size**: ~274 MB
- **Role**: Computes dense vector embeddings (768 dimensions) for evidence search and retrieval in ChromaDB.

---

## 4. Hardware Sizing & Context Window Optimization

### 4.1 Memory & VRAM Guidelines

| Hardware Configuration | Work Analysis Latency | Execution Mode |
| :--- | :--- | :--- |
| **NVIDIA GPU (>= 6GB VRAM)** | ~2 – 4 seconds | 100% GPU offload (CUDA) |
| **Apple Silicon (M1/M2/M3 with >= 16GB RAM)** | ~2 – 5 seconds | 100% Unified Memory offload (Metal) |
| **CPU Only (x86_64, 8 cores)** | ~12 – 25 seconds | Multi-threaded CPU inference |

### 4.2 Context Window Configuration (`num_ctx: 8192`)

By default, standard Ollama models allocate a 2048-token context window. Skill Passport increases this to **8192 tokens** to accommodate multi-file pull request diffs and detailed documentation:

- **Config Setting**: `OLLAMA_NUM_CTX=8192` in `backend/.env` (mapped via `backend/app/core/config.py`).
- **Application Injection**: In [`backend/app/ai/work_analyzer.py`](../../backend/app/ai/work_analyzer.py), requests to `/api/generate` pass:
  ```python
  payload = {
      "model": settings.ollama_qwen_model,
      "prompt": prompt,
      "stream": False,
      "format": "json",
      "options": {
          "num_ctx": settings.ollama_num_ctx,  # 8192
          "temperature": 0.1,  # Low temperature for deterministic outputs
      }
  }
  ```

> [!TIP]
> Setting `temperature: 0.1` ensures high determinism and reproducible extraction across repeated runs of the same evidence item.

---

## 5. Verification & Testing

### 5.1 Manual Inference Test
Run a quick curl command to verify JSON extraction with Qwen3 8B:

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen3:8b",
  "prompt": "Deconstruct this task: Implemented PostgreSQL connection pooling using SQLAlchemy QueuePool. Output in JSON: {\"technologies\": [...], \"summary\": \"...\"}",
  "stream": false,
  "format": "json"
}'
```

### 5.2 Automated Pytest Suite
Run the automated test suite designed for Ollama integration:
```bash
python -m pytest backend/tests/test_work_analyzer_ollama.py -v
```

---

## 6. The Graceful Fallback Engine

Skill Passport is engineered to be resilient even if the local Ollama instance is not running or experiences a temporary crash:

```text
       ┌────────────────────────┐
       │ Ingested Evidence Item │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │   Call Ollama Qwen3    │
       └───────────┬────────────┘
                   │
         Success? ─┴─ Timeout / Connect Error?
        /                                      \
       ▼                                        ▼
┌────────────────────────┐            ┌────────────────────────┐
│  Structured Model JSON │            │  Deterministic Regex   │
│  (Qwen3 8B Inference)  │            │  & Keyword Heuristic   │
│  fallback_used: False  │            │  fallback_used: True   │
└────────────────────────┘            └────────────────────────┘
```

When Ollama is unreachable:
1. `WorkAnalyzer` catches `httpx.ConnectError` or `httpx.TimeoutException`.
2. A warning is logged: `Ollama unavailable, falling back to deterministic extraction`.
3. The deterministic heuristic parser decomposes the text using regular expressions and taxonomy matching.
4. The record is persisted in `work_analysis_results` with `fallback_used = True` and `fallback_reason = "ollama_unavailable"`.
5. The application UI remains fully functional and displays an indicator that heuristic analysis was used.
