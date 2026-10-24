import time
import httpx

def test_tiny():
    print("Testing tiny prompt on qwen3:8b...")
    t0 = time.time()
    with httpx.Client(timeout=180.0) as client:
        # stream=True so we see tokens as they arrive!
        with client.stream(
            "POST",
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen3:8b",
                "prompt": "Say 'hello world' and nothing else.",
                "stream": True,
                "options": {
                    "num_predict": 100,
                    "temperature": 0.0,
                }
            }
        ) as response:
            print(f"Connected in {round(time.time() - t0, 2)}s, receiving stream:")
            token_count = 0
            for line in response.iter_lines():
                if line:
                    import json
                    chunk = json.loads(line)
                    response_text = chunk.get("response", "")
                    print(response_text, end="", flush=True)
                    token_count += 1
            print(f"\nDone! Received {token_count} chunks in {round(time.time() - t0, 2)}s")

if __name__ == "__main__":
    test_tiny()
