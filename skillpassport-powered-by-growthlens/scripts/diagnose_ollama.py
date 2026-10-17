import time
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from backend.app.ai.work_analyzer import WORK_ANALYSIS_SYSTEM_PROMPT

def test_ollama():
    t0 = time.time()
    print("Testing Ollama connection to http://localhost:11434...")
    
    # 1. Check tags
    with httpx.Client(timeout=10.0) as client:
        r = client.get("http://localhost:11434/api/tags")
        print("Tags Status:", r.status_code)
        models = [m.get("name") for m in r.json().get("models", [])]
        print("Available models:", models)

    # 2. Test small chat with qwen3:8b
    print("\nSending chat request to qwen3:8b with timeout=120s...")
    sample_prompt = (
        "Source Provider: resume\n"
        "Artifact Title: Test Software Engineer Resume\n"
        "Claimed Contribution: author\n\n"
        "Content:\n"
        "Senior Backend Engineer with 5 years experience. Built REST APIs using Python, FastAPI, and PostgreSQL. "
        "Containerized applications using Docker and orchestrated services with Kubernetes. "
        "Configured Redis caching to reduce database query latency by 40%."
    )
    
    t_start = time.time()
    try:
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "qwen3:8b",
                    "messages": [
                        {"role": "system", "content": WORK_ANALYSIS_SYSTEM_PROMPT},
                        {"role": "user", "content": sample_prompt},
                    ],
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.0, "num_predict": 1024},
                },
            )
            dur = round(time.time() - t_start, 2)
            print(f"Chat response received in {dur}s! HTTP Status: {resp.status_code}")
            if resp.status_code == 200:
                body = resp.json()
                msg = body.get("message", {}).get("content", "")
                print(f"Content length: {len(msg)}")
                print(f"Content preview:\n{msg[:400]}")
            else:
                print(f"Error response: {resp.text}")
    except Exception as e:
        dur = round(time.time() - t_start, 2)
        print(f"Chat FAILED after {dur}s with {type(e).__name__}: {repr(e)}")

if __name__ == "__main__":
    test_ollama()
