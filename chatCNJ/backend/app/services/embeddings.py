"""Embeddings service — generate query embeddings via OpenRouter/OpenAI."""

import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


async def get_query_embedding(client: AsyncOpenAI, text: str, model: str = "baai/bge-m3") -> list[float]:
    """Generate embedding for a search query using OpenRouter's embedding endpoint."""
    try:
        response = await client.embeddings.create(
            model=model,
            input=text,
            extra_headers={
                "HTTP-Referer": "https://chatnormas.app",
                "X-Title": "ChatNormas",
            },
        )
        embedding = response.data[0].embedding
        logger.info("[Embeddings] Generated %d-dim embedding for query", len(embedding))
        return embedding
    except Exception as e:
        logger.error("[Embeddings] Error generating embedding: %s", e)
        raise
