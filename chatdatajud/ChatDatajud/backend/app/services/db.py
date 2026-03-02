"""Database connection pool (asyncpg)."""

import logging
import asyncpg

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_pool(dsn: str, *, min_size: int = 2, max_size: int = 10) -> asyncpg.Pool:
    """Create and cache the connection pool."""
    global _pool
    _pool = await asyncpg.create_pool(dsn, min_size=min_size, max_size=max_size)
    logger.info("Postgres connection pool created (%s–%s connections)", min_size, max_size)
    return _pool


async def get_pool() -> asyncpg.Pool:
    """Return the active pool (raises if not initialised)."""
    if _pool is None:
        raise RuntimeError("Database pool not initialised — call init_pool first")
    return _pool


async def close_pool() -> None:
    """Gracefully close the pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Postgres connection pool closed")
