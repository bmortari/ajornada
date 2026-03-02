"""Pydantic models for conversations."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    id: str
    role: str  # 'user' | 'bot'
    content: str = ""
    thinking: list[str] | None = None
    charts: list[Any] | None = None
    kpis: list[Any] | None = None
    showMarker: bool | None = None
    pendingDashboard: Any | None = None


class ConversationCreate(BaseModel):
    title: str = "Nova Conversa"
    mode: str = "conversational"
    model: str | None = None
    messages: list[ConversationMessage] = Field(default_factory=list)


class ConversationUpdate(BaseModel):
    title: str | None = None
    messages: list[ConversationMessage] | None = None
    model: str | None = None


class ConversationSummary(BaseModel):
    id: uuid.UUID
    title: str
    mode: str
    model: str | None = None
    message_count: int
    created_at: datetime
    updated_at: datetime


class ConversationFull(ConversationSummary):
    messages: list[ConversationMessage]
