"""
LLM Client — chamada assíncrona ao OpenRouter com retry + fallback.

Usuário escolhe o modelo no frontend, envia no request.
O backend faz até 3 tentativas no modelo primário.
Se falhar → tenta cada modelo na lista de fallback (3 tentativas cada).
Se tudo falhar → retorna erro ao usuário.
"""

import asyncio
import logging
import time

from openai import AsyncOpenAI, APIStatusError

logger = logging.getLogger(__name__)

# Códigos HTTP que NÃO vale a pena retry (erro permanente)
SKIP_CODES = {401, 403, 404}

# Número máximo de tentativas por modelo
MAX_RETRIES = 3

# Pausa entre retries (segundos)
RETRY_DELAY = 2.0

# Headers obrigatórios para OpenRouter
_HEADERS = {
    "HTTP-Referer": "https://chatdatajud.app",
    "X-Title": "ChatDatajud",
}


async def _try_model(client: AsyncOpenAI, model: str, **kwargs):
    """
    Tenta chamar um modelo específico com até MAX_RETRIES tentativas.

    Returns:
        response se sucesso, None se falhar.
    Raises:
        Nada — falhas são logadas e retornam None.
    """
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
            logger.warning(
                "[LLM] Falha %s (tentativa %d, HTTP %d): %s",
                model, attempt, e.status_code, e.message,
            )
            if e.status_code in SKIP_CODES:
                break
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY)

        except Exception as e:
            last_error = e
            logger.warning("[LLM] Falha %s (tentativa %d): %s", model, attempt, e)
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY)

    logger.warning("[LLM] Todas as %d tentativas falharam para %s", MAX_RETRIES, model)
    return None


async def call_llm(
    client: AsyncOpenAI,
    model: str,
    fallback_models: list[str] | None = None,
    **kwargs,
):
    """
    Chama o LLM via OpenRouter com retry + fallback chain.

    Args:
        client: instância AsyncOpenAI configurada para OpenRouter
        model: modelo primário escolhido pelo usuário
        fallback_models: lista opcional de modelos para tentar se o primário falhar
        **kwargs: parâmetros da chamada (messages, tools, stream, max_tokens, etc.)

    Raises:
        RuntimeError se todos os modelos falharem.
    """
    kwargs.pop("model", None)

    # Tenta modelo primário
    response = await _try_model(client, model, **kwargs)
    if response is not None:
        return response

    # Fallback chain
    if fallback_models:
        for fb_model in fallback_models:
            if fb_model == model:
                continue
            logger.info("[LLM] Fallback → tentando %s", fb_model)
            response = await _try_model(client, fb_model, **kwargs)
            if response is not None:
                logger.info("[LLM] Fallback bem-sucedido com %s", fb_model)
                return response

    logger.error("[LLM] Todos os modelos falharam (primário: %s, fallbacks: %s)", model, fallback_models)
    raise RuntimeError(f"Falha ao chamar modelo {model} e todos os fallbacks")


async def check_model_availability(client: AsyncOpenAI, model: str) -> dict:
    """
    Ping rápido para verificar se um modelo está respondendo.
    Envia requisição mínima (max_tokens=1), sem tools.
    """
    start = time.time()
    try:
        await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
            extra_headers=_HEADERS,
        )
        latency = int((time.time() - start) * 1000)
        logger.info("[ModelCheck] %s → disponível (%d ms)", model, latency)
        return {"available": True, "latency_ms": latency, "error": None}
    except APIStatusError as e:
        latency = int((time.time() - start) * 1000)
        logger.warning("[ModelCheck] %s → indisponível (HTTP %d)", model, e.status_code)
        return {"available": False, "latency_ms": latency, "error": f"HTTP {e.status_code}"}
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        logger.warning("[ModelCheck] %s → erro: %s", model, e)
        return {"available": False, "latency_ms": latency, "error": str(e)}
