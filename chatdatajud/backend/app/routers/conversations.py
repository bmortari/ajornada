"""CRUD router for conversations."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.models.conversation import (
    ConversationCreate,
    ConversationFull,
    ConversationMessage,
    ConversationSummary,
    ConversationUpdate,
)
from app.services.db import get_pool

router = APIRouter(prefix="/api/conversations", tags=["conversations"])
logger = logging.getLogger(__name__)


# ── helpers ──────────────────────────────────────────────────────
def _row_to_summary(row: dict) -> ConversationSummary:
    msgs = row["messages"] if isinstance(row["messages"], list) else json.loads(row["messages"])
    return ConversationSummary(
        id=row["id"],
        title=row["title"],
        mode=row["mode"],
        model=row.get("model"),
        message_count=len(msgs),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_full(row: dict) -> ConversationFull:
    msgs = row["messages"] if isinstance(row["messages"], list) else json.loads(row["messages"])
    return ConversationFull(
        id=row["id"],
        title=row["title"],
        mode=row["mode"],
        model=row.get("model"),
        message_count=len(msgs),
        messages=[ConversationMessage(**m) for m in msgs],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


# ── LIST ─────────────────────────────────────────────────────────
@router.get("", response_model=list[ConversationSummary])
async def list_conversations(limit: int = 50, offset: int = 0):
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT * FROM conversations ORDER BY updated_at DESC LIMIT $1 OFFSET $2",
        limit,
        offset,
    )
    return [_row_to_summary(dict(r)) for r in rows]


# ── GET one ──────────────────────────────────────────────────────
@router.get("/{conv_id}", response_model=ConversationFull)
async def get_conversation(conv_id: uuid.UUID):
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM conversations WHERE id = $1", conv_id)
    if not row:
        raise HTTPException(404, "Conversa não encontrada")
    return _row_to_full(dict(row))


# ── CREATE ───────────────────────────────────────────────────────
@router.post("", response_model=ConversationFull, status_code=201)
async def create_conversation(body: ConversationCreate):
    pool = await get_pool()
    msgs_json = json.dumps([m.model_dump() for m in body.messages])
    row = await pool.fetchrow(
        """INSERT INTO conversations (title, mode, model, messages)
           VALUES ($1, $2, $3, $4::jsonb)
           RETURNING *""",
        body.title,
        body.mode,
        body.model,
        msgs_json,
    )
    return _row_to_full(dict(row))


# ── UPDATE (patch) ──────────────────────────────────────────────
@router.put("/{conv_id}", response_model=ConversationFull)
async def update_conversation(conv_id: uuid.UUID, body: ConversationUpdate):
    pool = await get_pool()

    # Build dynamic SET clause
    sets: list[str] = []
    vals: list = []
    idx = 1

    if body.title is not None:
        sets.append(f"title = ${idx}")
        vals.append(body.title)
        idx += 1

    if body.messages is not None:
        sets.append(f"messages = ${idx}::jsonb")
        vals.append(json.dumps([m.model_dump() for m in body.messages]))
        idx += 1

    if body.model is not None:
        sets.append(f"model = ${idx}")
        vals.append(body.model)
        idx += 1

    if not sets:
        raise HTTPException(422, "Nada para atualizar")

    sets.append(f"updated_at = ${idx}")
    vals.append(datetime.now(timezone.utc))
    idx += 1

    vals.append(conv_id)
    query = f"UPDATE conversations SET {', '.join(sets)} WHERE id = ${idx} RETURNING *"

    row = await pool.fetchrow(query, *vals)
    if not row:
        raise HTTPException(404, "Conversa não encontrada")
    return _row_to_full(dict(row))


# ── DELETE ───────────────────────────────────────────────────────
@router.delete("/{conv_id}", status_code=204)
async def delete_conversation(conv_id: uuid.UUID):
    pool = await get_pool()
    result = await pool.execute("DELETE FROM conversations WHERE id = $1", conv_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Conversa não encontrada")
