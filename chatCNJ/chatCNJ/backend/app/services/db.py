"""Database service — asyncpg pool + pgvector similarity search."""

import json
import logging
from typing import Optional

import asyncpg

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def init_pool(dsn: str):
    global _pool
    _pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10)
    logger.info("Postgres pool initialized")


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Postgres pool closed")


def get_pool() -> asyncpg.Pool:
    if not _pool:
        raise RuntimeError("Database pool not initialized")
    return _pool


async def vector_search(query_embedding: list[float], top_k: int = 10, filters: dict = None) -> list[dict]:
    """Search normativos by cosine similarity using pgvector."""
    pool = get_pool()
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    where_clauses = ["1=1"]
    params = [embedding_str, top_k]

    if filters:
        if filters.get("onlyVigentes"):
            where_clauses.append("metadata->>'situacao' = 'Vigente'")
        if filters.get("onlyCorregedoria"):
            where_clauses.append("metadata->>'origem' ILIKE '%Corregedoria%'")
        if filters.get("numero_norma"):
            parts = str(filters["numero_norma"]).split()
            for p in parts:
                p_clean = p.strip().lower()
                if p_clean and p_clean not in ["n", "nº", "de"]:
                    params.append(f"%{p}%")
                    where_clauses.append(f"metadata->>'identificacao' ILIKE ${len(params)}")
        if filters.get("termo_exato"):
            params.append(f"%{filters['termo_exato']}%")
            where_clauses.append(f"document ILIKE ${len(params)}")
            
    where_sql = " AND ".join(where_clauses)
    
    # If there are exact filters, we want BOTH the exact matches AND the purely semantic matches
    # to provide broader context, as requested by the user.
    if filters and (filters.get("numero_norma") or filters.get("termo_exato")):
        # Query 1: Exact Matches (Filtered)
        # Query 2: Pure Semantic Matches (Unfiltered except for active/origin)
        
        base_where_clauses = ["1=1"]
        if filters.get("onlyVigentes"):
            base_where_clauses.append("metadata->>'situacao' = 'Vigente'")
        if filters.get("onlyCorregedoria"):
            base_where_clauses.append("metadata->>'origem' ILIKE '%Corregedoria%'")
        base_where_sql = " AND ".join(base_where_clauses)
        
        query = f"""
            WITH exact_matches AS (
                SELECT id, document, metadata,
                       COALESCE(1 - (embedding <=> $1::vector), 0) + 1.0 AS similarity -- give exact matches a +1.0 boost
                FROM normativos
                WHERE {where_sql}
                ORDER BY embedding <=> $1::vector
                LIMIT $2
            ),
            semantic_matches AS (
                SELECT id, document, metadata,
                       1 - (embedding <=> $1::vector) AS similarity
                FROM normativos
                WHERE {base_where_sql}
                ORDER BY embedding <=> $1::vector
                LIMIT $2
            )
            SELECT * FROM exact_matches
            UNION
            SELECT * FROM semantic_matches
            ORDER BY similarity DESC
            LIMIT $2
        """
    else:
        query = f"""
            SELECT id, document, metadata,
                   1 - (embedding <=> $1::vector) AS similarity
            FROM normativos
            WHERE {where_sql}
            ORDER BY embedding <=> $1::vector
            LIMIT $2
        """

    rows = await pool.fetch(query, *params)

    results = []
    for row in rows:
        meta = row["metadata"]
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except json.JSONDecodeError:
                meta = {}

        results.append({
            "id": row["id"],
            "document": row["document"],
            "metadata": meta,
            "similarity": float(row["similarity"]),
        })

    return results


async def get_norma_by_id(norma_id: str) -> Optional[dict]:
    """Get a specific normativo by ID."""
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT id, document, metadata FROM normativos WHERE id = $1",
        norma_id,
    )
    if not row:
        return None

    meta = row["metadata"]
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except json.JSONDecodeError:
            meta = {}

    return {
        "id": row["id"],
        "document": row["document"],
        "metadata": meta,
    }


async def get_normativos_count() -> int:
    pool = get_pool()
    return await pool.fetchval("SELECT count(*) FROM normativos")


# ── Conversations ──

async def save_conversation(conv_id: str, title: str, mode: str, model: str, messages: list, message_count: int):
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO conversations (id, title, mode, model, messages, message_count, updated_at)
        VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
            title = $2, mode = $3, model = $4,
            messages = $5::jsonb, message_count = $6,
            updated_at = NOW()
        """,
        conv_id, title, mode, model, json.dumps(messages, ensure_ascii=False), message_count,
    )


async def list_conversations(limit: int = 50) -> list[dict]:
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT id, title, mode, model, message_count, created_at, updated_at
        FROM conversations
        ORDER BY updated_at DESC
        LIMIT $1
        """,
        limit,
    )
    return [dict(r) for r in rows]


async def get_conversation(conv_id: str) -> Optional[dict]:
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT * FROM conversations WHERE id = $1::uuid", conv_id
    )
    if not row:
        return None
    result = dict(row)
    if isinstance(result.get("messages"), str):
        result["messages"] = json.loads(result["messages"])
    return result


async def delete_conversation(conv_id: str):
    pool = get_pool()
    await pool.execute("DELETE FROM conversations WHERE id = $1::uuid", conv_id)
