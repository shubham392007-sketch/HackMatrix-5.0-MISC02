"""Central Ollama Client integrating LangChain ChatOllama and direct HTTP resilience.

Responsible for:
- Low-latency connection to local Ollama daemon
- ChatOllama model initialization with conservative temperature settings
- Sanitized payload handling (never leaking secrets or credentials)
- Structured execution logging with latency measurement
- Fast health probing
"""
import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional, Union
import httpx

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
try:
    from langchain_ollama import ChatOllama
except ImportError:
    from langchain_community.chat_models import ChatOllama

from backend.core.config import get_settings
from backend.core.exceptions import LLMServiceError
from backend.core.logging import get_logger
from backend.core.security import sanitize_for_llm

logger = get_logger("ai.ollama_client")


class OllamaClient:
    """Enterprise-grade local Ollama client wrapping LangChain ChatOllama and HTTP resilience."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 120.0,
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.model = model or settings.ollama_model
        self.timeout = timeout
        self._chat_models: Dict[str, ChatOllama] = {}

    def get_chat_model(self, temperature: float = 0.1, max_tokens: int = 1024) -> ChatOllama:
        """Returns or creates a cached ChatOllama instance with specific temperature."""
        cache_key = f"{self.model}_{temperature}_{max_tokens}"
        if cache_key not in self._chat_models:
            self._chat_models[cache_key] = ChatOllama(
                model=self.model,
                base_url=self.base_url,
                temperature=temperature,
                num_predict=max_tokens,
                format="json",
                client_kwargs={"timeout": self.timeout},
            )
        return self._chat_models[cache_key]

    async def invoke_chat(
        self,
        messages: List[BaseMessage],
        operation: str = "chat_inference",
        temperature: float = 0.1,
        max_tokens: int = 1024,
        timeout: Optional[float] = None,
    ) -> str:
        """Invokes Qwen3 8B via LangChain ChatOllama with strict safety, timeout, and telemetry."""
        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        op_timeout = timeout or self.timeout

        # Ensure all message contents are sanitized of secrets
        sanitized_messages: List[BaseMessage] = []
        for msg in messages:
            clean_content = sanitize_for_llm(str(msg.content))
            if isinstance(msg, SystemMessage):
                sanitized_messages.append(SystemMessage(content=clean_content))
            elif isinstance(msg, HumanMessage):
                sanitized_messages.append(HumanMessage(content=clean_content))
            else:
                sanitized_messages.append(HumanMessage(content=clean_content))

        try:
            chat_model = ChatOllama(
                model=self.model,
                base_url=self.base_url,
                temperature=temperature,
                num_predict=max_tokens,
                format="json",
                client_kwargs={"timeout": op_timeout},
            )
            response = await asyncio.wait_for(chat_model.ainvoke(sanitized_messages), timeout=op_timeout)
            raw_text = str(response.content)

            latency_ms = int((time.perf_counter() - start_time) * 1000)
            logger.info(
                f"Ollama Qwen3 operation succeeded: {operation}",
                extra={
                    "request_id": request_id,
                    "operation": operation,
                    "model": self.model,
                    "latency_ms": latency_ms,
                    "status": "success",
                },
            )
            return raw_text

        except Exception as e:
            # Fall back to direct HTTP client for resiliency
            logger.warning(f"ChatOllama direct invoke encountered {e}, falling back to resilient HTTP chat...")
            try:
                raw_text = await self._http_fallback_generate(
                    messages=sanitized_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=op_timeout,
                )
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                logger.info(
                    f"Ollama Qwen3 fallback operation succeeded: {operation}",
                    extra={
                        "request_id": request_id,
                        "operation": operation,
                        "model": self.model,
                        "latency_ms": latency_ms,
                        "status": "success_fallback",
                    },
                )
                return raw_text
            except Exception as fb_err:
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                logger.error(
                    f"Ollama Qwen3 operation failed: {operation} ({fb_err})",
                    extra={
                        "request_id": request_id,
                        "operation": operation,
                        "model": self.model,
                        "latency_ms": latency_ms,
                        "status": "failure",
                        "error_category": type(fb_err).__name__,
                    },
                )
                raise LLMServiceError(f"Ollama Qwen3 inference error: {str(fb_err)}")

    async def _http_fallback_generate(
        self,
        messages: List[BaseMessage],
        temperature: float = 0.1,
        max_tokens: int = 1024,
        timeout: float = 120.0,
    ) -> str:
        """Resilient direct HTTP call to Ollama /api/chat endpoint."""
        ollama_msgs = []
        for m in messages:
            role = "system" if isinstance(m, SystemMessage) else "user"
            ollama_msgs.append({"role": role, "content": m.content})

        payload = {
            "model": self.model,
            "messages": ollama_msgs,
            "stream": False,
            "format": "json",
            "think": False,
            "options": {
                "temperature": temperature,
                "num_ctx": 4096,
                "num_predict": max_tokens,
            },
        }

        client_timeout = httpx.Timeout(timeout=timeout, connect=5.0)
        async with httpx.AsyncClient(timeout=client_timeout) as client:
            res = await client.post(f"{self.base_url}/api/chat", json=payload)
            if res.status_code == 200:
                data = res.json()
                return data.get("message", {}).get("content", "")
            elif res.status_code == 404:
                raise LLMServiceError(f"Model '{self.model}' not loaded in Ollama. Pull it via 'ollama pull {self.model}'.")
            else:
                raise LLMServiceError(f"Ollama returned HTTP status {res.status_code}")

    async def check_health(self) -> Dict[str, Any]:
        """Verify Ollama server accessibility and Qwen3 8B model presence."""
        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(3.0, connect=1.5)) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                if res.status_code == 200:
                    models = [m.get("name", "") for m in res.json().get("models", [])]
                    has_model = any(self.model in m for m in models)
                    return {
                        "ollama_available": True,
                        "model_available": has_model,
                        "model": self.model,
                        "base_url": self.base_url,
                        "available_models": models,
                        "latency_ms": latency_ms,
                        "status": "ready" if has_model else "model_missing",
                    }
                return {
                    "ollama_available": True,
                    "model_available": False,
                    "model": self.model,
                    "base_url": self.base_url,
                    "latency_ms": latency_ms,
                    "status": "unavailable",
                }
        except Exception as e:
            return {
                "ollama_available": False,
                "model_available": False,
                "model": self.model,
                "base_url": self.base_url,
                "error": str(e),
                "status": "unavailable",
            }
