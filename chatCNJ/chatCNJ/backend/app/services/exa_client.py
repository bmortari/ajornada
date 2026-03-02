"""EXA Search Client — deep web research for CNJ norms."""

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

EXA_BASE_URL = "https://api.exa.ai"


class ExaClient:
    def __init__(self, api_key: str, model: str | None = None, base_url: str | None = None, timeout: float = 30.0):
        self.api_key = api_key
        self.model = model or "exa-research"
        self.base_url = base_url or EXA_BASE_URL
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            timeout=timeout,
        )

    async def search(
        self,
        query: str,
        num_results: int = 5,
        use_autoprompt: bool = True,
        type: str = "deep",
        text: bool = True,
        highlights: bool = True,
        include_domains: Optional[list[str]] = None,
    ) -> list[dict]:
        """Search the web via EXA and return results with text/highlights."""
        try:
            payload = {
                "query": query,
                "numResults": num_results,
                "useAutoprompt": use_autoprompt,
                "type": type,
                "contents": {},
            }
            if text:
                payload["contents"]["text"] = {"maxCharacters": 3000}
            if highlights:
                payload["contents"]["highlights"] = {
                    "numSentences": 5,
                    "highlightsPerUrl": 3,
                }
            if include_domains:
                payload["includeDomains"] = include_domains

            response = await self.client.post("/search", json=payload)
            response.raise_for_status()
            data = response.json()

            results = []
            for r in data.get("results", []):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "text": r.get("text", ""),
                    "highlights": r.get("highlights", []),
                    "score": r.get("score", 0),
                    "published_date": r.get("publishedDate", ""),
                })

            logger.info("[EXA] Search '%s' → %d results", query[:50], len(results))
            return results

        except Exception as e:
            logger.error("[EXA] Search error: %s", e)
            return []

    async def find_similar(self, url: str, num_results: int = 5) -> list[dict]:
        """Find pages similar to a given URL."""
        try:
            payload = {
                "url": url,
                "numResults": num_results,
                "contents": {
                    "text": {"maxCharacters": 2000},
                    "highlights": {"numSentences": 3, "highlightsPerUrl": 2},
                },
            }
            response = await self.client.post("/findSimilar", json=payload)
            response.raise_for_status()
            data = response.json()

            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "text": r.get("text", ""),
                    "highlights": r.get("highlights", []),
                }
                for r in data.get("results", [])
            ]
        except Exception as e:
            logger.error("[EXA] findSimilar error: %s", e)
            return []

    async def close(self):
        await self.client.aclose()

    async def research_stream(self, query: str):
        """Perform a deep research query using Exa's OpenAI-compatible streaming API."""
        from openai import AsyncOpenAI
        import traceback
        try:
            client = AsyncOpenAI(base_url=self.base_url, api_key=self.api_key)
            # EXA API expects one of: 'exa' | 'exa-pro' | 'exa-research' | 'exa-research-pro'
            # 'exa-research-fast' is not a valid enum value and causes 400 errors.
            # Use 'exa-research' as a compatible default; allow future override if needed.
            completion = await client.chat.completions.create(
                model=self.model or "exa-research",
                messages=[{"role": "user", "content": query}],
                stream=True,
            )
            async for chunk in completion:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error("[EXA] research_stream error: %s\n%s", e, traceback.format_exc())
            yield f"Error in Exa Research: {str(e)}"
