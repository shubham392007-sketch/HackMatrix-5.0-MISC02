"""Two-stage structured retry policy for Qwen3 8B operations."""
import json
from typing import Any, Callable, Coroutine, Dict, Optional, Type, TypeVar
from pydantic import BaseModel, ValidationError
from langchain_core.messages import HumanMessage, SystemMessage
from backend.core.logging import get_logger
from backend.app.ai.ollama_client import OllamaClient
from backend.app.ai.validators.llm_output_validator import LLMOutputValidator

logger = get_logger("ai.retry")

T = TypeVar("T", bound=BaseModel)


async def execute_with_structured_retry(
    client: OllamaClient,
    system_prompt: str,
    user_prompt: str,
    schema: Type[T],
    operation_name: str,
    temperature: float = 0.1,
    timeout: float = 60.0,
) -> T:
    """
    Executes prompt with a 2-stage retry mechanism:
    Attempt 1: Standard structured inference.
    Attempt 2: Corrective prompt on JSON or validation error.
    """
    validator = LLMOutputValidator()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]

    # Attempt 1
    raw_response = ""
    try:
        raw_response = await client.invoke_chat(
            messages=messages,
            operation=operation_name,
            temperature=temperature,
            timeout=timeout,
        )
        cleaned = validator.clean_json_string(raw_response)
        parsed = json.loads(cleaned)
        validated = schema.model_validate(parsed)
        return validated
    except (json.JSONDecodeError, ValidationError) as err:
        logger.warning(f"Attempt 1 failed for {operation_name} ({err}). Invoking strict corrective retry...")

    # Attempt 2: Corrective Prompt
    correction_prompt = f"""Your previous response was invalid JSON or failed the required schema.
Error details: {err}

You MUST output ONLY a single valid raw JSON object matching the schema. No thoughts, no explanations, no markdown fences:
{user_prompt}
"""
    retry_messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=correction_prompt),
    ]

    try:
        raw_retry = await client.invoke_chat(
            messages=retry_messages,
            operation=f"{operation_name}_retry",
            temperature=0.0,
            timeout=timeout,
        )
        cleaned_retry = validator.clean_json_string(raw_retry)
        parsed_retry = json.loads(cleaned_retry)
        return schema.model_validate(parsed_retry)
    except Exception as final_err:
        logger.error(f"Structured retry failed permanently for {operation_name}: {final_err}")
        raise final_err
