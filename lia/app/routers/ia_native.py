"""
Sistema LIA - Router de IA Nativa (Python + OpenRouter)
========================================================
Endpoints para geração de artefatos usando agentes Python nativos.

ARQUITETURA MODULAR (v2):
- Chat endpoints: app/routers/ia_chat/ (factory pattern)
- Cada artefato tem sua config em app/routers/ia_chat/{tipo}.py
- Generic endpoints: aqui embaixo

Endpoints de Chat (via factory):
- GET /{tipo}/chat/init/{projeto_id}
- POST /{tipo}/chat/{projeto_id}
- POST /{tipo}/chat/{projeto_id}/gerar
- POST /{tipo}/chat/{projeto_id}/regenerar-campo

Endpoints Genéricos (aqui):
- POST /{tipo}/gerar/stream — Direct generation (sem chat)
- POST /{tipo}/gerar — Generate JSON (sync)
- POST /{tipo}/regenerar-campo/stream — Regen single field
- GET /agentes — List all agents
- GET /agentes/{tipo} — Get agent fields

Autor: Equipe TRE-GO
Data: Fevereiro 2026
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import logging

from app.database import get_db
from app.config import settings
from app.models.projeto import Projeto
from app.models.user import User
from app.auth import current_active_user as auth_get_current_user
from app.models.artefatos import DFD, ETP, TR, Riscos, Edital
from app.services.agents import (
    DFDAgent, ETPAgent, PGRAgent, TRAgent, EditalAgent,
    RDVEAgent, JVAAgent, TRSAgent, ADEAgent, JPEFAgent, CEAgent
)
from app.services.deep_research import deep_research_service
from app.schemas.ia_schemas import DeepResearchRequest
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

router = APIRouter(tags=["🧠 IA Nativa"])

# ========== IMPORT CHAT ROUTERS FROM FACTORY ==========
from app.routers.ia_chat import combined_router as chat_routers
router.include_router(chat_routers, prefix="")  # Routes: /dfd/chat/init, /etp/chat/init, etc.


# ========== AGENT REGISTRY ==========
AGENT_REGISTRY = {
    # Fluxo Principal (Licitação Normal)
    "dfd": {"class": DFDAgent, "label": "Documento de Formalização da Demanda"},
    "etp": {"class": ETPAgent, "label": "Estudo Técnico Preliminar"},
    "pgr": {"class": PGRAgent, "label": "Plano de Gerenciamento de Riscos"},
    "riscos": {"class": PGRAgent, "label": "Plano de Gerenciamento de Riscos"},  # Alias
    "tr": {"class": TRAgent, "label": "Termo de Referência"},
    "edital": {"class": EditalAgent, "label": "Edital de Licitação"},
    # Fluxo Adesão a Ata
    "rdve": {"class": RDVEAgent, "label": "Relatório de Vantagem Econômica"},
    "jva": {"class": JVAAgent, "label": "Justificativa de Vantagem e Adesão"},
    # Fluxo Dispensa por Valor Baixo
    "trs": {"class": TRSAgent, "label": "Termo de Referência Simplificado"},
    "ade": {"class": ADEAgent, "label": "Aviso de Dispensa Eletrônica"},
    "jpef": {"class": JPEFAgent, "label": "Justificativa de Preço e Escolha de Fornecedor"},
    "ce": {"class": CEAgent, "label": "Certidão de Enquadramento"},
}


# ========== GENERIC ENDPOINTS (any artefact) ==========

@router.get("/agentes")
async def listar_agentes() -> JSONResponse:
    """List all available agents and their config"""
    agents = []
    for tipo, info in AGENT_REGISTRY.items():
        agents.append({
            "tipo": tipo,
            "label": info["label"],
            "campos": getattr(info["class"], "campos", [])
        })
    return JSONResponse({"agentes": agents})


@router.get("/agentes/{tipo}")
async def obter_agente(tipo: str) -> JSONResponse:
    """Get agent config and fields for specific artefact type"""
    if tipo not in AGENT_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Agent tipo '{tipo}' not found")
    
    info = AGENT_REGISTRY[tipo]
    return JSONResponse({
        "tipo": tipo,
        "label": info["label"],
        "campos": getattr(info["class"], "campos", []),
        "system_prompt": getattr(info["class"], "system_prompt", ""),
    })


@router.post("/{tipo}/gerar/stream")
async def gerar_artefato_stream(
    tipo: str,
    projeto_id: int,
    prompt_adicional: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_get_current_user),
):
    """
    Direct generation without chat — stream response as SSE.
    
    For artefacts that don't use conversational flow.
    """
    
    if tipo not in AGENT_REGISTRY:
        raise HTTPException(status_code=400, detail=f"Invalid artefact type: {tipo}")
    
    # Fetch project
    stmt = select(Projeto).where(Projeto.id == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalars().first()
    
    if not projeto:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Build minimal context
    contexto = {
        "projeto_id": projeto.id,
        "projeto_titulo": projeto.titulo,
        "itens_pac": [],
    }
    
    # Create agent and generate
    AgentClass = AGENT_REGISTRY[tipo]["class"]
    agent = AgentClass()
    
    async def stream_response():
        """TRUE STREAMING - send incremental chunks"""
        try:
            json_buffer = ""  # Accumulate only for final parsing
            async for chunk in agent.gerar(contexto, prompt_adicional):
                json_buffer += chunk
                # Send ONLY the new chunk (not accumulated buffer)
                yield {
                    "event": "chunk",
                    "data": json.dumps({'content': chunk}, ensure_ascii=False)
                }

            # Try to parse final JSON
            try:
                parsed = json.loads(json_buffer.strip())
                yield {
                    "event": "complete",
                    "data": json.dumps({'success': True, 'data': parsed}, ensure_ascii=False)
                }
            except json.JSONDecodeError:
                yield {
                    "event": "complete",
                    "data": json.dumps({'success': True, 'raw': json_buffer}, ensure_ascii=False)
                }
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({'error': str(e)}, ensure_ascii=False)
            }
    
    return EventSourceResponse(stream_response())


@router.post("/{tipo}/gerar")
async def gerar_artefato_sync(
    tipo: str,
    projeto_id: int,
    prompt_adicional: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_get_current_user),
) -> Dict[str, Any]:
    """
    Synchronous generation — returns complete JSON (no streaming).
    
    Warning: Can be slow for large artifacts.
    """
    
    if tipo not in AGENT_REGISTRY:
        raise HTTPException(status_code=400, detail=f"Invalid artefact type: {tipo}")
    
    # Fetch project
    stmt = select(Projeto).where(Projeto.id == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalars().first()
    
    if not projeto:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Build context
    contexto = {
        "projeto_id": projeto.id,
        "projeto_titulo": projeto.titulo,
        "itens_pac": [],
    }
    
    # Generate
    AgentClass = AGENT_REGISTRY[tipo]["class"]
    agent = AgentClass()
    
    try:
        json_buffer = ""
        async for chunk in agent.gerar(contexto, prompt_adicional):
            json_buffer += chunk
        
        # Parse result
        parsed = json.loads(json_buffer.strip())
        return {"success": True, "data": parsed}
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON response: {str(e)}")
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== DEEP RESEARCH ==========

@router.post("/deep-research/stream")
async def stream_deep_research(
    request: DeepResearchRequest,
    current_user: User = Depends(auth_get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint de streaming para Deep Research.
    Retorna eventos SSE com o progresso da pesquisa.
    """
    return StreamingResponse(
        deep_research_service.stream_research(request.topic, request.context),
        media_type="text/event-stream"
    )
