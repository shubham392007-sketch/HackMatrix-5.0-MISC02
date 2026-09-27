# GrowthLens Qwen3 Testing Methodology

## 1. Test Suite Architecture
The test suite in `backend/tests/test_qwen_ai.py` tests both deterministic invariants and LLM-driven components:
- `TestLLMOutputValidator`:
  - Stripping `<think>` tags and markdown code blocks.
  - Parsing JSON embedded in natural language prose.
  - Stripping hallucinated evidence references.
- `TestPromptSecurityAndInjectionDefense`:
  - Verifying delimiter containment of adversarial inputs.
  - Short-circuiting zero-evidence inputs without invoking LLM or hallucinating citations.
- `TestAnalyticalInvariants`:
  - Verifying that analytical trends (e.g. `declining`) cannot be altered by LLM text.
  - Verifying recommendation titles and types match catalog specifications.
- `TestOllamaHealthCheck`:
  - Verifying connection to `http://localhost:11434` and presence of `qwen3:8b`.

## 2. Running Tests
```bash
# Run the complete Qwen test suite
.venv\Scripts\python.exe -m pytest backend/tests/test_qwen_ai.py -v
```
