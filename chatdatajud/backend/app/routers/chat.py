import json
import logging

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.models.chat import ChatRequest, ModelCheckRequest
from app.services.llm_agent import LLMAgent
from app.services.llm_client import check_model_availability

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/models/check")
async def check_model(body: ModelCheckRequest, req: Request):
    """Verifica disponibilidade de um modelo via ping rápido."""
    client = req.app.state.agent.client
    result = await check_model_availability(client, body.model)
    return result


@router.post("/api/chat")
async def chat(request: ChatRequest, req: Request):
    """Streaming via Server-Sent Events."""
    agent: LLMAgent = req.app.state.agent

    async def event_generator():
        try:
            async for chunk in agent.stream(
                request.message,
                [h.model_dump() for h in request.history],
                model=request.model,
                mode=request.mode,
                deep_search=request.deep_search,
            ):
                if chunk.type == "status":
                    yield {
                        "event": "status",
                        "data": json.dumps(
                            {"message": chunk.content}, ensure_ascii=False
                        ),
                    }
                elif chunk.type == "text":
                    yield {
                        "event": "text",
                        "data": json.dumps(
                            {"content": chunk.content}, ensure_ascii=False
                        ),
                    }
                elif chunk.type == "thinking":
                    yield {
                        "event": "thinking",
                        "data": json.dumps(
                            {"content": chunk.content}, ensure_ascii=False
                        ),
                    }
                elif chunk.type == "thinking_flush":
                    yield {
                        "event": "thinking_flush",
                        "data": json.dumps(
                            {"content": chunk.content}, ensure_ascii=False
                        ),
                    }
                elif chunk.type == "chart":
                    yield {
                        "event": "chart",
                        "data": json.dumps(chunk.payload, ensure_ascii=False),
                    }
                elif chunk.type == "kpi":
                    yield {
                        "event": "kpi",
                        "data": json.dumps(chunk.payload, ensure_ascii=False),
                    }
                elif chunk.type == "workspace_ready":
                    yield {
                        "event": "workspace_ready",
                        "data": json.dumps(chunk.payload, ensure_ascii=False),
                    }
                elif chunk.type == "turn_summary":
                    yield {
                        "event": "turn_summary",
                        "data": json.dumps(
                            {"summary": chunk.content}, ensure_ascii=False
                        ),
                    }

            yield {"event": "done", "data": "{}"}

        except Exception as e:
            logger.error(f"SSE error: {e}", exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"message": str(e)}, ensure_ascii=False),
            }

    return EventSourceResponse(event_generator())
