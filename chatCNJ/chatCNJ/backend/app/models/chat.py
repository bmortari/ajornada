"""Chat models (Pydantic)."""

from pydantic import BaseModel


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = []
    model: str = "meta-llama/llama-3.3-70b-instruct:free"
    mode: str = "chat"
    filters: dict = { "situacoes": [], "origens": [] }
    tools_config: dict = {}


class ModelCheckRequest(BaseModel):
    model: str
