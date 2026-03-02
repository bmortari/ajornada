"""
Sistema LIA - Chat Router Factory
==================================
Generic factory that creates 4 chat endpoints for any artefact type.

Eliminates 80% code duplication across DFD, ETP, PGR, TR, Edital, etc.
Each config defines only its differences:
- Agent classes
- Generation marker
- Context dependencies
- Optional extra fields
"""

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, List, Optional, Type
from dataclasses import dataclass
import json
import logging
import asyncio
from datetime import datetime

from app.database import get_db
from app.config import settings
from app.auth import current_active_user as auth_get_current_user
from app.models.user import User
from app.schemas.ia_schemas import ChatMessageInput, ChatGenerateInput, ChatInitResponse, RegenerarCampoInput, Message
from app.services.agents import ConversationalAgent
from app.services.pac_service import PacService
from app.services.agents.tools.search_arp import search_arp_tool
from ._context import carregar_skills_ativas, stream_agent_response

logger = logging.getLogger(__name__)


@dataclass
class ArtefactChatConfig:
    """Configuration for an artefact chat endpoint factory"""
    tipo: str  # "dfd", "etp", "pgr", "tr", "edital", "pesquisa_precos", "je"
    label: str  # "Documento de Formalização da Demanda"
    marker: str  # "[GERAR_DFD]"
    agent_chat_class: Type[ConversationalAgent]  # DFDChatAgent, etc.
    context_deps: List[str]  # ["dfd", "pp"] — which artefacts to load
    campos_extra: Optional[Dict[str, Any]] = None  # Extra fields per artefact
    persistido: bool = True  # Whether artefact has a DB model (False for JE)


def criar_chat_router(config: ArtefactChatConfig) -> APIRouter:
    """
    Factory: creates 4 endpoints for an artefact's chat flow.
    
    Args:
        config: ArtefactChatConfig with tipo, agent_class, context_deps, etc.
    
    Returns:
        APIRouter with endpoints:
        - GET /chat/init/{projeto_id}
        - POST /chat/{projeto_id}
        - POST /chat/{projeto_id}/gerar
        - POST /chat/{projeto_id}/regenerar-campo
    """
    
    router = APIRouter()
    
    # Import here to avoid circular imports
    from ._context import construir_contexto_chat
    
    # ========== INIT ==========
    @router.get("/chat/init/{projeto_id}", response_model=ChatInitResponse)
    async def init_chat(
        projeto_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(auth_get_current_user),
    ):
        """Inicializa conversa com contexto do projeto"""
        logger.info(f"[{config.tipo.upper()} Chat Init] Projeto {projeto_id}")
        
        try:
            context = await construir_contexto_chat(
                projeto_id=projeto_id,
                db=db,
                tipo_artefato=config.tipo,
                context_deps=config.context_deps
            )
            
            skills = await carregar_skills_ativas(projeto_id, db)
            
            dfd_context = context.dfd if getattr(context, 'dfd', None) else None
            
            return ChatInitResponse(
                projeto_id=projeto_id,
                projeto_titulo=context.projeto_titulo,
                setor_usuario=context.setor_usuario,
                welcome_message=f"Bem-vindo ao fluxo de {config.label}! 🚀",
                initial_fields=[],  # Pode ser customizado por config
                skills_ativas=skills,
                dfd_data=dfd_context
            )
        except Exception as e:
            logger.error(f"[{config.tipo.upper()} Init] Erro: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    
    # ========== CHAT ==========
    @router.post("/chat/{projeto_id}")
    async def chat_message(
        projeto_id: int,
        body: ChatMessageInput,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(auth_get_current_user),
    ):
        """Chat stream — responde mensagens do usuário"""
        logger.info(f"[{config.tipo.upper()} Chat] Projeto {projeto_id}, msg: {body.content[:50]}...")
        
        try:
            # Build context
            context = await construir_contexto_chat(
                projeto_id=projeto_id,
                db=db,
                tipo_artefato=config.tipo,
                context_deps=config.context_deps,
                current_user=current_user,
            )
            
            # Convert history to Message objects
            history = [
                Message(role=msg["role"], content=msg["content"])
                for msg in body.history
            ]
            
            # Create agent
            modelo_ia = body.model or settings.OPENROUTER_DEFAULT_MODEL
            agent = config.agent_chat_class(model_override=modelo_ia)
            
            async def stream_chat():
                """SSE stream for chat response - TRUE STREAMING (incremental chunks)"""
                content_buffer = ""  # Only for marker detection
                marker_sent = False
                chunk_count = 0
                try:
                    logger.info(f"[{config.tipo.upper()} Chat] Starting stream for message: {body.content[:50]}...")
                    async for chunk_data in agent.chat(
                        message=body.content,
                        history=history,
                        context=context,
                        attachments=body.attachments or []
                    ):
                        chunk_count += 1
                        if chunk_data["type"] == "reasoning":
                            # Send reasoning chunk incrementally
                            yield {
                                "event": "reasoning",
                                "data": json.dumps({'content': chunk_data["content"]}, ensure_ascii=False)
                            }

                        elif chunk_data["type"] == "content":
                            # Send ONLY the new chunk (not accumulated buffer)
                            chunk_text = chunk_data["content"]
                            content_buffer += chunk_text  # Track for marker detection
                            yield {
                                "event": "chunk",
                                "data": json.dumps({'content': chunk_text}, ensure_ascii=False)
                            }

                        elif chunk_data["type"] == "action" and chunk_data.get("action") == "generate":
                            if not marker_sent:
                                marker_sent = True
                                yield {
                                    "event": "action",
                                    "data": json.dumps({"action": "generate"}, ensure_ascii=False)
                                }

                        # Check for generation marker (legacy string matching — only exact marker, not loose phrases)
                        if not marker_sent and config.marker in content_buffer:
                            marker_sent = True
                            yield {
                                "event": "action",
                                "data": json.dumps({"action": "generate"}, ensure_ascii=False)
                            }

                    # Stream finished — send done event
                    logger.info(f"[{config.tipo.upper()} Chat] Stream completed. Total chunks: {chunk_count}")
                    yield {
                        "event": "done",
                        "data": json.dumps({}, ensure_ascii=False)
                    }

                except Exception as e:
                    logger.error(f"[{config.tipo.upper()} Chat] Stream error: {e}", exc_info=True)
                    yield {
                        "event": "error",
                        "data": json.dumps({'error': str(e)}, ensure_ascii=False)
                    }
            
            return EventSourceResponse(stream_chat(), media_type="text/event-stream")
        
        except Exception as e:
            logger.error(f"[{config.tipo.upper()} Chat] Erro: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    
    # ========== GENERATE ==========
    @router.post("/chat/{projeto_id}/gerar")
    async def gerar_from_chat(
        projeto_id: int,
        body: ChatGenerateInput,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(auth_get_current_user),
    ):
        """Generate artefact from chat history — SSE stream"""
        logger.info(f"[{config.tipo.upper()} Gen] Projeto {projeto_id}")
        
        try:
            # Build context
            context = await construir_contexto_chat(
                projeto_id=projeto_id,
                db=db,
                tipo_artefato=config.tipo,
                context_deps=config.context_deps
            )
            
            # Convert history to Message objects
            messages = [
                Message(role=msg["role"], content=msg["content"])
                for msg in body.history
            ]
            
            # Add attachments/skills to context
            if body.attachments:
                textos_anexos = []
                for att in body.attachments:
                    if att.get("extracted_text"):
                        textos_anexos.append(f"[{att.get('filename', 'arquivo')}]: {att['extracted_text']}")
                if textos_anexos:
                    context.dados_coletados['base_conhecimento'] = "\n\n".join(textos_anexos)
            
            # Create agent
            modelo_ia = body.model or settings.OPENROUTER_DEFAULT_MODEL
            agent = config.agent_chat_class(model_override=modelo_ia)
            
            async def stream_generation():
                """SSE stream for generation - TRUE STREAMING (incremental chunks)"""
                json_buffer = ""  # Accumulate for final JSON parsing only
                try:
                    async for chunk_data in agent.gerar(context, messages):
                        if chunk_data["type"] == "reasoning":
                            # Send reasoning chunk incrementally (not accumulated)
                            yield {
                                "event": "reasoning",
                                "data": json.dumps({'content': chunk_data["content"]}, ensure_ascii=False)
                            }

                        elif chunk_data["type"] == "content":
                            # Send ONLY the new chunk (not accumulated buffer)
                            chunk_text = chunk_data["content"]
                            json_buffer += chunk_text  # Accumulate for final parsing
                            yield {
                                "event": "chunk",
                                "data": json.dumps({'content': chunk_text}, ensure_ascii=False)
                            }
                            await asyncio.sleep(0)

                    # Try to parse final JSON
                    try:
                        # Clean up JSON: remove markdown backticks if present
                        cleaned = json_buffer.strip()
                        if cleaned.startswith('```json'):
                            cleaned = cleaned[7:]
                        if cleaned.startswith('```'):
                            cleaned = cleaned[3:]
                        if cleaned.endswith('```'):
                            cleaned = cleaned[:-3]

                        artefato_data = json.loads(cleaned)
                        logger.info(f"[{config.tipo.upper()} Gen] JSON generated: {len(artefato_data)} fields")
                        yield {
                            "event": "complete",
                            "data": json.dumps({'success': True, 'data': artefato_data}, ensure_ascii=False)
                        }
                    except json.JSONDecodeError as e:
                        logger.error(f"[{config.tipo.upper()} Gen] JSON parse error: {e}")
                        logger.error(f"[{config.tipo.upper()} Gen] Raw buffer (first 500 chars): {json_buffer[:500]}")
                        yield {
                            "event": "error",
                            "data": json.dumps({'error': f'JSON parse error: {str(e)}'}, ensure_ascii=False)
                        }

                except Exception as e:
                    logger.error(f"[{config.tipo.upper()} Gen] Error: {e}")
                    yield {
                        "event": "error",
                        "data": json.dumps({'error': str(e)}, ensure_ascii=False)
                    }
            
            return EventSourceResponse(stream_generation())
        
        except Exception as e:
            logger.error(f"[{config.tipo.upper()} Gen] Erro: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    
    # ========== REGENERATE FIELD ==========
    @router.post("/chat/{projeto_id}/regenerar-campo")
    async def regenerar_campo(
        projeto_id: int,
        body: RegenerarCampoInput,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(auth_get_current_user),
    ):
        """Regenerate a single field — SSE stream with skills and attachments support"""
        logger.info(f"[{config.tipo.upper()} Regen] Campo '{body.campo}' do projeto {projeto_id}")
        
        try:
            # Build context
            context = await construir_contexto_chat(
                projeto_id=projeto_id,
                db=db,
                tipo_artefato=config.tipo,
                context_deps=config.context_deps
            )
            
            # Load and inject skills if provided
            if body.skills:
                from sqlalchemy import select
                from app.models.skill import Skill
                
                result = await db.execute(
                    select(Skill).where(Skill.id.in_(body.skills), Skill.ativo == True)
                )
                skills = result.scalars().all()
                
                if skills:
                    skill_instructions = []
                    for skill in skills:
                        if skill.instrucoes:
                            skill_instructions.append(f"[Skill: {skill.nome}]\n{skill.instrucoes}")
                        # Add textos_base (knowledge base) if available
                        if skill.textos_base:
                            context.dados_coletados['base_conhecimento_skill'] = skill.textos_base
                    
                    if skill_instructions:
                        context.dados_coletados['skills_instructions'] = "\n\n".join(skill_instructions)
                        logger.info(f"[{config.tipo.upper()} Regen] Loaded {len(skills)} skills")
            
            # Add attachments to context if provided
            if body.attachments:
                textos_anexos = []
                for att in body.attachments:
                    if att.get("extracted_text"):
                        textos_anexos.append(f"[{att.get('filename', 'arquivo')}]: {att['extracted_text']}")
                if textos_anexos:
                    context.dados_coletados['documentos_anexados'] = "\n\n".join(textos_anexos)
                    logger.info(f"[{config.tipo.upper()} Regen] Added {len(textos_anexos)} attachments to context")
            
            # Create agent
            modelo_ia = body.model or settings.OPENROUTER_DEFAULT_MODEL
            agent = config.agent_chat_class(model_override=modelo_ia)
            
            # Convert context to dict for regenerar_campo (if needed)
            from dataclasses import asdict
            context_dict = asdict(context)
            
            async def stream_regen():
                """SSE stream for field regeneration - TRUE STREAMING (incremental chunks)"""
                content_buffer = ""  # Accumulate for final 'done' event only
                first_chunk_trimmed = False
                try:
                    async for chunk in agent.regenerar_campo(
                        campo=body.campo,
                        contexto=context_dict,
                        valor_atual=body.valor_atual,
                        instrucoes=body.prompt_adicional,
                    ):
                        # Trim leading whitespace from the very first non-empty chunk
                        if not first_chunk_trimmed and chunk.strip():
                            chunk = chunk.lstrip()
                            first_chunk_trimmed = True

                        content_buffer += chunk  # Accumulate for final event
                        # Send ONLY the new chunk (not accumulated buffer)
                        yield {
                            "event": "chunk",
                            "data": json.dumps({'content': chunk}, ensure_ascii=False)
                        }
                        await asyncio.sleep(0)

                    logger.info(f"[{config.tipo.upper()} Regen] Complete para '{body.campo}'")
                    yield {
                        "event": "done",
                        "data": json.dumps({'campo': body.campo, 'content': content_buffer}, ensure_ascii=False)
                    }

                except Exception as e:
                    logger.error(f"[{config.tipo.upper()} Regen] Error: {e}")
                    yield {
                        "event": "error",
                        "data": json.dumps({'error': str(e)}, ensure_ascii=False)
                    }
            
            return EventSourceResponse(stream_regen())
        
        except Exception as e:
            logger.error(f"[{config.tipo.upper()} Regen] Erro: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    # ========== TOOLS ==========
    @router.post("/tools/search_arp/{projeto_id}")
    async def run_search_arp_tool(
        projeto_id: int,
        body: dict,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(auth_get_current_user),
    ):
        """Executa a ferramenta de pesquisa de ARP"""
        logger.info(f"[{config.tipo.upper()} Tool] search_arp for projeto {projeto_id}")
        
        try:
            codigo_catalogo = body.get("codigo_catalogo", "")
            palavra_chave = body.get("palavra_chave", "")
            valor_estimado = float(body.get("valor_estimado", 0.0))
            
            result = await search_arp_tool(
                codigo_catalogo=codigo_catalogo,
                palavra_chave=palavra_chave,
                valor_estimado=valor_estimado
            )
            
            # Format message for the assistant
            msg_enquadra = "o valor está DENTRO do limite de dispensa" if result["enquadra_dispensa_licitacao"] else "o valor ULTRAPASSA o limite de dispensa"
            message = (
                f"Pesquisa concluída! Encontrei {len(result['atas_encontradas'])} ata(s) compatível(is). "
                f"Além disso, considerando o valor estimado de R$ {valor_estimado:,.2f}, {msg_enquadra} "
                f"(limite aplicável: R$ {result['limite_dispensa_aplicado']:,.2f}). "
                "Já pré-preenchi os campos do ETP com essas informações.\n\n"
                "Para seguir em frente, você prefere tentar participar de alguma dessas ATAS ou realizar uma contratação tradicional?"
            )
            
            return {
                "success": True,
                "message": message,
                "data": result
            }
        except Exception as e:
            logger.error(f"[{config.tipo.upper()} Tool] Erro em search_arp: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    return router
