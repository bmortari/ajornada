"""Conversations router — persistence."""

import json
import logging
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import db

logger = logging.getLogger(__name__)
router = APIRouter()


class SaveConversationRequest(BaseModel):
    id: Optional[str] = None
    title: str = "Nova conversa"
    mode: str = "chat"
    model: Optional[str] = None
    messages: list = []


@router.get("/api/conversations")
async def list_conversations():
    convs = await db.list_conversations()
    return {"conversations": convs}


@router.get("/api/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    conv = await db.get_conversation(conv_id)
    if not conv:
        return {"error": "Not found"}, 404
    return conv


@router.post("/api/conversations")
async def save_conversation(req: SaveConversationRequest):
    conv_id = req.id or str(uuid4())
    await db.save_conversation(
        conv_id=conv_id,
        title=req.title,
        mode=req.mode,
        model=req.model or "",
        messages=req.messages,
        message_count=len(req.messages),
    )
    return {"id": conv_id, "status": "saved"}


@router.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    await db.delete_conversation(conv_id)
    return {"status": "deleted"}
