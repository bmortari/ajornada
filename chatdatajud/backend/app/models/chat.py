from typing import Optional

from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    summary: str | None = None  # Turn summary for cross-turn context


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []
    model: str = "meta-llama/llama-3.3-70b-instruct:free"
    mode: str = "conversational"  # "conversational" | "bi_agent" | "deep_research"
    deep_search: bool = False  # User-controlled: activates more ReAct iterations


class ModelCheckRequest(BaseModel):
    model: str


class ChatResponse(BaseModel):
    content: str
    charts: list[dict] = []
    kpis: list[dict] = []
