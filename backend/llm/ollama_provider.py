"""Ollama provider communicating with local Ollama runtime and Qwen3 8B."""
import json
from typing import Any, Dict, Optional
import httpx

from backend.core.config import get_settings
from backend.core.exceptions import LLMServiceError
from backend.core.logging import get_logger
from backend.core.security import sanitize_for_llm

logger = get_logger("llm.ollama_provider")


class OllamaProvider:
    """Handles communication with the local Ollama API server."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 180.0
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.model = model or settings.ollama_model
        self.timeout = timeout

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        format_json: bool = True,
        temperature: float = 0.1
    ) -> str:
        """Call Ollama /api/generate endpoint."""
        clean_prompt = sanitize_for_llm(prompt)
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": clean_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_ctx": 2048,
                "num_predict": 250,
                "top_k": 20,
            }
        }
        if system:
            payload["system"] = sanitize_for_llm(system)
        if format_json:
            payload["format"] = "json"

        url = f"{self.base_url}/api/generate"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "")
                elif res.status_code == 404:
                    raise LLMServiceError(f"Ollama model '{self.model}' not found. Run 'ollama pull {self.model}'")
                else:
                    raise LLMServiceError(f"Ollama invocation error: HTTP {res.status_code}")
        except httpx.ConnectError:
            raise LLMServiceError(f"Could not connect to Ollama at {self.base_url}. Ensure Ollama daemon is running.")
        except httpx.TimeoutException:
            raise LLMServiceError(f"Ollama request timed out after {self.timeout}s.")
        except httpx.RequestError as e:
            raise LLMServiceError(f"Ollama network error: {str(e)}")

    def test_availability(self) -> bool:
        """Synchronously check if Ollama server and target model are accessible."""
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name", "") for m in res.json().get("models", [])]
                    return any(self.model in m for m in models)
                return False
        except Exception:
            return False
