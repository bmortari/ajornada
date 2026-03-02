"""
Sistema LIA - Router de Modelos de IA
======================================
Endpoint para gerenciar modelos disponíveis do OpenRouter
"""

import time
import logging
from fastapi import APIRouter
from typing import Dict, Any
from openai import AsyncOpenAI

from app.config import settings, AVAILABLE_MODELS, MODEL_TIERS

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/ia/models")
async def list_available_models() -> Dict[str, Any]:
    """
    Lista modelos disponíveis do OpenRouter para seleção pelo usuário.
    
    Returns:
        Dict contendo lista de modelos e modelo padrão
    """
    return {
        "models": AVAILABLE_MODELS,
        "default": settings.OPENROUTER_DEFAULT_MODEL,
        "tiers": MODEL_TIERS
    }


@router.get("/api/ia/models/current")
async def get_current_model() -> Dict[str, str]:
    """
    Retorna o modelo padrão configurado.
    
    Returns:
        Dict com ID e nome do modelo atual
    """
    return {
        "id": settings.OPENROUTER_DEFAULT_MODEL,
        "name": "Trinity Mini (Padrão)"
    }


@router.get("/api/ping-modelo/{modelo_nome:path}")
async def ping_modelo(modelo_nome: str) -> Dict[str, Any]:
    """
    Verifica se um modelo está disponível no OpenRouter enviando
    uma requisição mínima de completion.
    
    Returns:
        Dict com status ('online', 'offline', 'rate_limited') e tempo em ms
    """
    if not settings.OPENROUTER_API_KEY:
        return {
            "status": "error",
            "mensagem": "API Key não configurada"
        }

    client = AsyncOpenAI(
        api_key=settings.OPENROUTER_API_KEY,
        base_url=settings.OPENROUTER_BASE_URL,
        timeout=15,
    )

    start = time.monotonic()
    try:
        response = await client.chat.completions.create(
            model=modelo_nome,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)

        return {
            "status": "online",
            "tempo_ms": elapsed_ms,
            "mensagem": f"OK ({elapsed_ms}ms)"
        }

    except Exception as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        error_str = str(e).lower()
        logger.warning(f"Ping modelo {modelo_nome}: {e}")

        if "rate" in error_str or "429" in error_str:
            return {
                "status": "rate_limited",
                "tempo_ms": elapsed_ms,
                "mensagem": "Rate limited"
            }

        return {
            "status": "offline",
            "tempo_ms": elapsed_ms,
            "mensagem": str(e)[:120]
        }
