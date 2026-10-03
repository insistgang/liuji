import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
INITIAL_BACKOFF = 1.0  # seconds
CONNECT_TIMEOUT = 10.0
READ_TIMEOUT = 60.0
EXPECTED_RESPONSE_FIELDS = {
    "score",
    "grammar_issues",
    "vocabulary_suggestions",
    "structure_feedback",
    "overall_comment",
    "model_essay",
}


def _get_mock_feedback() -> str:
    """Return mock feedback when no API key is configured."""
    return json.dumps({
        "score": 10,
        "grammar_issues": [
            {"original": "(示例)", "corrected": "(示例)", "explanation": "请配置 LLM API Key 以获取真实的AI批改反馈"}
        ],
        "vocabulary_suggestions": [
            {"original_word": "(示例)", "suggestion": "(示例)", "reason": "请在 .env 文件中设置 LLM_API_KEY"}
        ],
        "structure_feedback": "AI批改功能需要配置LLM API。请在backend/.env中设置LLM_BASE_URL、LLM_API_KEY和LLM_MODEL。",
        "overall_comment": "当前为模拟反馈。配置API后将获得真实的AI批改。",
        "model_essay": "（需要配置LLM API后生成）",
    })


def _is_retryable(exc: Exception) -> bool:
    """Determine if an exception is worth retrying."""
    if isinstance(exc, httpx.TimeoutException):
        return True
    if isinstance(exc, httpx.ConnectError):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code >= 500
    return False


def _validate_response(content: str) -> str:
    """Validate that the LLM response contains expected JSON fields."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}") from e

    if not isinstance(data, dict):
        raise ValueError("LLM response is not a JSON object")

    missing = EXPECTED_RESPONSE_FIELDS - data.keys()
    if missing:
        raise ValueError(f"LLM response missing fields: {missing}")

    return content


async def call_llm(system_prompt: str, user_prompt: str) -> str:
    """Call an OpenAI-compatible LLM API with retry and validation."""
    if not settings.LLM_API_KEY:
        logger.warning("LLM_API_KEY not configured, returning mock feedback")
        return _get_mock_feedback()

    timeout = httpx.Timeout(connect=CONNECT_TIMEOUT, read=READ_TIMEOUT, write=30.0, pool=10.0)
    last_exc: Exception | None = None

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info("LLM request attempt %d/%d", attempt, MAX_RETRIES)
                response = await client.post(
                    f"{settings.LLM_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.LLM_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.LLM_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.7,
                        "response_format": {"type": "json_object"},
                    },
                )
                response.raise_for_status()
                data: dict[str, Any] = response.json()
                content = data["choices"][0]["message"]["content"]

                validated = _validate_response(content)
                logger.info("LLM request succeeded on attempt %d", attempt)
                return validated

            except (httpx.HTTPStatusError, httpx.TimeoutException, httpx.ConnectError, ValueError) as exc:
                last_exc = exc

                if not _is_retryable(exc):
                    logger.error("Non-retryable LLM error: %s", exc)
                    raise

                if attempt < MAX_RETRIES:
                    wait = INITIAL_BACKOFF * (2 ** (attempt - 1))
                    logger.warning(
                        "Retryable error on attempt %d/%d: %s — retrying in %.1fs",
                        attempt, MAX_RETRIES, exc, wait,
                    )
                    import asyncio
                    await asyncio.sleep(wait)
                else:
                    logger.error("All %d LLM attempts failed: %s", MAX_RETRIES, exc)

    raise RuntimeError(f"LLM request failed after {MAX_RETRIES} attempts") from last_exc


ESSAY_FEEDBACK_PROMPT = """You are a CET-6 writing examiner. Analyze the student's essay and return a JSON response with exactly these fields:
{
  "score": <number 0-15>,
  "grammar_issues": [
    {"original": "the problematic text", "corrected": "the corrected text", "explanation": "explanation in Chinese"}
  ],
  "vocabulary_suggestions": [
    {"original_word": "word used", "suggestion": "better word", "reason": "reason in Chinese"}
  ],
  "structure_feedback": "paragraph organization analysis in Chinese",
  "overall_comment": "brief encouraging summary in Chinese",
  "model_essay": "an improved version of this essay"
}
Respond ONLY with valid JSON. All explanations should be in Chinese."""
