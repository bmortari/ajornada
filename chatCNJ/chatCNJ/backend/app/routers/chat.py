"""Chat router — SSE streaming endpoint."""

import json
import logging
import io

from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.models.chat import ChatRequest, ModelCheckRequest
from app.services.agent import NormasAgent
from app.services.llm_client import check_model_availability

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/models/check")
async def check_model(body: ModelCheckRequest, req: Request):
    """Check model availability with a fast ping."""
    client = req.app.state.agent.client
    result = await check_model_availability(client, body.model)
    return result


@router.post("/api/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """Extrai texto de arquivos (TXT, PDF, DOCX) enviados pelo frontend."""
    filename = file.filename.lower()
    content = await file.read()
    text = ""
    
    try:
        if filename.endswith(".txt"):
            text = content.decode("utf-8")
        elif filename.endswith(".pdf"):
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        elif filename.endswith(".docx"):
            import docx
            doc_d = docx.Document(io.BytesIO(content))
            text = "\n".join([para.text for para in doc_d.paragraphs])
        else:
            raise HTTPException(status_code=400, detail="Formato não suportado. Use TXT, PDF ou DOCX.")
            
        return {"text": text.strip(), "filename": file.filename}
    except Exception as e:
        logger.error("Error extracting text from %s: %s", filename, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")

@router.post("/api/chat")
async def chat(request: ChatRequest, req: Request):
    """Streaming via Server-Sent Events."""
    agent: NormasAgent = req.app.state.agent

    async def event_generator():
        try:
            async for chunk in agent.stream(
                request.message,
                [h.model_dump() for h in request.history],
                model=request.model,
                mode=request.mode,
                filters=request.filters,
                tools_config=request.tools_config,
            ):
                if chunk.type == "status":
                    yield {
                        "event": "status",
                        "data": json.dumps({"message": chunk.content}, ensure_ascii=False),
                    }
                elif chunk.type == "text":
                    yield {
                        "event": "text",
                        "data": json.dumps({"content": chunk.content}, ensure_ascii=False),
                    }
                elif chunk.type == "thinking":
                    yield {
                        "event": "thinking",
                        "data": json.dumps({"content": chunk.content}, ensure_ascii=False),
                    }
                elif chunk.type == "thinking_flush":
                    yield {
                        "event": "thinking_flush",
                        "data": json.dumps({"content": chunk.content}, ensure_ascii=False),
                    }
                elif chunk.type == "sources":
                    yield {
                        "event": "sources",
                        "data": json.dumps(chunk.payload, ensure_ascii=False),
                    }
                elif chunk.type == "web_sources":
                    yield {
                        "event": "web_sources",
                        "data": json.dumps(chunk.payload, ensure_ascii=False),
                    }

            yield {"event": "done", "data": "{}"}

        except Exception as e:
            logger.error("SSE error: %s", e, exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"message": str(e)}, ensure_ascii=False),
            }

    return EventSourceResponse(event_generator())
