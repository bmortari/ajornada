"""
LLM Client — async OpenRouter calls with retry + fallback.
Adapted from chatDatajud pattern.
"""

import asyncio
import logging
import time

from openai import AsyncOpenAI, APIStatusError

logger = logging.getLogger(__name__)

SKIP_CODES = {401, 403, 404}
MAX_RETRIES = 3
RETRY_DELAY = 2.0

_HEADERS = {
    "HTTP-Referer": "https://chatnormas.app",
    "X-Title": "ChatNormas",
}


async def _try_model(client: AsyncOpenAI, model: str, **kwargs):
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info("[LLM] %s (tentativa %d/%d)", model, attempt, MAX_RETRIES)
            response = await client.chat.completions.create(
                model=model,
                extra_headers=_HEADERS,
                **kwargs,
            )
            logger.info("[LLM] Sucesso com %s", model)
            return response
        except APIStatusError as e:
            last_error = e
            logger.warning("[LLM] Falha %s (tentativa %d, HTTP %d): %s", model, attempt, e.status_code, e.message)
            if e.status_code in SKIP_CODES:
                break
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY)
        except Exception as e:
            last_error = e
            logger.warning("[LLM] Falha %s (tentativa %d): %s", model, attempt, e)
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY)

    return None


async def call_llm(client: AsyncOpenAI, model: str, fallback_models: list[str] | None = None, **kwargs):
    kwargs.pop("model", None)

    response = await _try_model(client, model, **kwargs)
    if response is not None:
        return response

    if fallback_models:
        for fb_model in fallback_models:
            if fb_model == model:
                continue
            logger.info("[LLM] Fallback → tentando %s", fb_model)
            response = await _try_model(client, fb_model, **kwargs)
            if response is not None:
                return response

    raise RuntimeError(f"Falha ao chamar modelo {model} e todos os fallbacks")


async def check_model_availability(client: AsyncOpenAI, model: str) -> dict:
    start = time.time()
    try:
        await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
            extra_headers=_HEADERS,
        )
        latency = int((time.time() - start) * 1000)
        return {"available": True, "latency_ms": latency, "error": None}
    except APIStatusError as e:
        latency = int((time.time() - start) * 1000)
        return {"available": False, "latency_ms": latency, "error": f"HTTP {e.status_code}"}
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        return {"available": False, "latency_ms": latency, "error": str(e)}
