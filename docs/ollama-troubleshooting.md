# GrowthLens Ollama Troubleshooting & Operation Guide

## 1. Verifying Ollama Status
Check if Ollama is running and has the `qwen3:8b` model pulled:
```bash
# Check service health via GrowthLens API
curl http://localhost:8000/api/ai/health

# Or directly query the Ollama daemon
curl http://localhost:11434/api/tags
```

Expected output:
```json
{
  "ollama_available": true,
  "model_available": true,
  "model": "qwen3:8b",
  "base_url": "http://localhost:11434",
  "status": "ready"
}
```

## 2. Common Issues & Solutions

### Model Not Found
- **Symptom**: `model_available: false` in `/api/ai/health`.
- **Fix**: Pull the Qwen3 8B model via terminal:
  ```bash
  ollama pull qwen3:8b
  ```

### Ollama Not Running
- **Symptom**: Connection refused on port 11434 (`ollama_available: false`).
- **Fix**: Start the Ollama application or daemon:
  ```bash
  ollama serve
  ```

### High CPU Latency on Local Generation
- **Symptom**: Requests take >20 seconds when GPU acceleration is unavailable.
- **Mitigation**: GrowthLens automatically applies:
  - Strict token limits (`max_tokens: 512` for narrative, `256` for extraction).
  - Hard timeouts with grounded deterministic fallbacks (`_generate_grounded_fallback`), guaranteeing zero frontend downtime or frozen states.

### JSON Formatting Drift
- **Symptom**: Model produces reasoning traces or markdown wrappers.
- **Mitigation**: The central `LLMOutputValidator` automatically cleanses `<think>...</think>` traces and extracts valid JSON objects, with two-stage corrective prompting fallback.
