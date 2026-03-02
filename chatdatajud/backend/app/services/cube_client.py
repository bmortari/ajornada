import httpx
import asyncio
import logging
import jwt
import time

logger = logging.getLogger(__name__)


class CubeClient:
    def __init__(self, base_url: str, secret: str):
        self.base_url = base_url
        self.secret = secret
        # Persistent HTTP client with connection pooling
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the persistent async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=60.0,
                limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            )
        return self._client

    async def close(self):
        """Close the persistent HTTP client. Call on app shutdown."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _generate_token(self) -> str:
        payload = {"iat": int(time.time()), "exp": int(time.time()) + 3600}
        return jwt.encode(payload, self.secret, algorithm="HS256")

    def _headers(self) -> dict:
        return {
            "Authorization": self._generate_token(),
            "Content-Type": "application/json",
        }

    async def query(self, cube_query: dict, max_retries: int = 10) -> dict:
        """POST /v1/load — Execute query on Cube.js and return data."""
        url = f"{self.base_url}/load"
        client = await self._get_client()
        for attempt in range(max_retries):
            try:
                resp = await client.post(
                    url, json={"query": cube_query}, headers=self._headers()
                )
                data = resp.json()
                # Cube.js may return continue_wait if pre-agg is building
                if isinstance(data, dict) and data.get("error") == "Continue wait":
                    wait_time = min(2 ** attempt, 30)
                    logger.info(
                        f"Cube.js continue_wait, retrying in {wait_time}s..."
                    )
                    await asyncio.sleep(wait_time)
                    continue
                resp.raise_for_status()
                return data
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 502 and attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
                raise
        return {"error": "Max retries exceeded", "data": []}

    async def get_meta(self) -> dict:
        """GET /v1/meta — Return complete schema."""
        url = f"{self.base_url}/meta"
        client = await self._get_client()
        resp = await client.get(url, headers=self._headers(), timeout=30.0)
        resp.raise_for_status()
        return resp.json()

    async def health_check(self) -> bool:
        try:
            meta = await self.get_meta()
            return "cubes" in meta
        except Exception:
            return False
