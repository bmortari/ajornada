"""
ChatNormas Agent -- ReAct loop with Reflexion via OpenRouter.
Tools: search_normas, search_web, get_norma_detail, validate_answer, generate_parecer
Modes: chat (vector search + answer), deep_research (vector + EXA + reflexion)
"""

import json
import logging
import re
from typing import AsyncGenerator
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.config import settings
from app.services.llm_client import call_llm
from app.services.embeddings import get_query_embedding
from app.services import db
from app.services.exa_client import ExaClient
from app.services.prompts import (
    SYSTEM_PROMPT_CHAT,
    SYSTEM_PROMPT_DEEP_RESEARCH,
    REFLEXION_PROMPT,
    PARECER_PROMPT,
)

logger = logging.getLogger(__name__)

SPECIAL_TOKEN_PATTERN = re.compile(
    r"<\|(?:eot_id|finetune_right_pad_id|step_id|start_of_turn|end_of_turn|"
    r"im_start|im_end|endoftext|pad|user|assistant|system)\|>|</?s>"
)


def _clean_special_tokens(text: str) -> str:
    return SPECIAL_TOKEN_PATTERN.sub("", text)


# ── Text-based tool call parser (for models that emit <tool_call> instead of native function calling) ──

TEXT_TOOL_CALL_PATTERN = re.compile(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", re.DOTALL)


def _parse_text_tool_calls(text: str) -> tuple[str, list[dict]]:
    """Parse <tool_call>{"name":..., "arguments":{...}}</tool_call> blocks embedded in plain text.

    Returns (cleaned_text, list_of_tool_call_dicts).
    cleaned_text has all <tool_call> tags and their content removed.
    """
    found: list[dict] = []

    def _replacer(m: re.Match) -> str:
        try:
            tc = json.loads(m.group(1))
            if "name" in tc and "arguments" in tc:
                found.append(tc)
        except (json.JSONDecodeError, TypeError):
            pass
        return ""

    cleaned = TEXT_TOOL_CALL_PATTERN.sub(_replacer, text)
    # Strip any bare/unclosed <tool_call> tags left over
    cleaned = re.sub(r"</?tool_call>", "", cleaned).strip()
    return cleaned, found


@dataclass
class StreamChunk:
    type: str
    content: str = ""
    payload: dict | None = None


# ── Tool definitions for OpenAI function calling ──

CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_cnj_site",
            "description": (
                "Pesquisa direto no site oficial do CNJ (cnj.jus.br) "
                "para encontrar noticias, portarias ou resolucoes muito recentes que "
                "ainda nao estao integradas na base vetorial principal."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Consulta de pesquisa web focada no CNJ",
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Numero de resultados (padrao: 5)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_normas",
            "description": (
                "Busca normativos do CNJ na base vetorial por similaridade semantica. "
                "Use SEMPRE antes de responder sobre qualquer normativo. "
                "Retorna os normativos mais relevantes com texto, metadados e score de similaridade."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Texto da busca (pergunta ou termos-chave sobre normativos do CNJ)",
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Numero de resultados (padrao: 8)",
                        "default": 8,
                    },
                    "numero_norma": {
                        "type": "string",
                        "description": "Opcional. Se o usuario pedir uma norma especifica, ex: '350', informe apenas o numero aqui para filtrar exatamente por ela.",
                    },
                    "termo_exato": {
                        "type": "string",
                        "description": "Opcional. Buscar um texto EXATO dentro do documento da norma. Ideal para descricoes especificas que demandam precisao."
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": (
                "Pesquisa na web via EXA para encontrar informacoes complementares "
                "sobre normativos, jurisprudencia, doutrina ou contexto legislativo. "
                "Use para enriquecer respostas com fontes externas."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Consulta de pesquisa web",
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Numero de resultados (padrao: 5)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_norma_detail",
            "description": "Busca detalhes completos de um normativo especifico pelo ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "norma_id": {
                        "type": "string",
                        "description": "ID do normativo na base",
                    },
                },
                "required": ["norma_id"],
            },
        },
    },
]

DEEP_RESEARCH_TOOLS = CHAT_TOOLS + [
    {
        "type": "function",
        "function": {
            "name": "validate_answer",
            "description": (
                "REFLEXION: Auto-valida a resposta antes de entregar ao usuario. "
                "Verifica precisao das citacoes, completude, consistencia e vigencia dos normativos. "
                "Use SEMPRE no modo deep research antes da resposta final."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "proposed_answer": {
                        "type": "string",
                        "description": "A resposta que voce pretende dar ao usuario",
                    },
                    "sources_used": {
                        "type": "string",
                        "description": "Lista das fontes usadas (normativos + URLs)",
                    },
                    "original_question": {
                        "type": "string",
                        "description": "A pergunta original do usuario",
                    },
                },
                "required": ["proposed_answer", "sources_used", "original_question"],
            },
        },
    },
]

class NormasAgent:
    def __init__(self, exa_client: ExaClient | None = None):
        self.client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
        )
        self.exa_client = exa_client

    def _build_system_prompt(self, mode: str = "chat") -> str:
        if mode == "deep_research":
            return SYSTEM_PROMPT_DEEP_RESEARCH
        return SYSTEM_PROMPT_CHAT

    def _build_messages(self, message: str, history: list[dict], mode: str = "chat") -> list[dict]:
        messages = [{"role": "system", "content": self._build_system_prompt(mode)}]

        history_limit = 20 if mode == "deep_research" else 10
        for h in history[-history_limit:]:
            msg = {"role": h["role"], "content": h["content"]}
            messages.append(msg)

        messages.append({"role": "user", "content": message})
        return messages

    async def _execute_tool(self, tool_name: str, tool_input: dict, filters: dict = None) -> str:
        """Execute a tool and return the result as string."""
        if filters is None:
            filters = {}
        try:
            if tool_name == "search_normas":
                query = tool_input.get("query", "")
                top_k = tool_input.get("top_k", 8)
                numero_norma = tool_input.get("numero_norma")
                termo_exato = tool_input.get("termo_exato")

                tool_filters = dict(filters) if filters else {}
                if numero_norma:
                    tool_filters["numero_norma"] = numero_norma
                    # CRITICAL FIX: Se o usuário/agente buscou EXPLICITAMENTE pelo número da norma (ex: "331"), 
                    # devemos ignorar o filtro de "apenas vigentes" para conseguir encontrar a norma mesmo que
                    # ela esteja "Alterada" ou "Revogada".
                    if "onlyVigentes" in tool_filters:
                        del tool_filters["onlyVigentes"]
                if termo_exato:
                    tool_filters["termo_exato"] = termo_exato

                try:
                    embedding = await get_query_embedding(self.client, query)
                    results = await db.vector_search(embedding, top_k=top_k, filters=tool_filters)

                    if not results:
                        return json.dumps({
                            "success": True,
                            "results": [],
                            "message": "Nenhum normativo encontrado para esta busca. Tente reformular com outros termos.",
                        }, ensure_ascii=False)

                    # Format results for the LLM
                    formatted = []
                    for r in results:
                        meta = r.get("metadata", {})
                        formatted.append({
                            "id": r["id"],
                            "similarity": round(r["similarity"], 4),
                            "identificacao": meta.get("identificacao", "N/A"),
                            "ementa": meta.get("ementa", ""),
                            "situacao": meta.get("situacao", "N/A"),
                            "origem": meta.get("origem", ""),
                            "fonte": meta.get("fonte", ""),
                            "document_url": meta.get("document_id", ""),
                            "texto": r["document"][:1500],
                        })

                    return json.dumps({
                        "success": True,
                        "total_results": len(formatted),
                        "results": formatted,
                    }, ensure_ascii=False)

                except Exception as e:
                    logger.error("search_normas error: %s", e, exc_info=True)
                    return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

            elif tool_name == "search_web":
                query = tool_input.get("query", "")
                num_results = tool_input.get("num_results", 5)

                if not self.exa_client:
                    return json.dumps({
                        "success": False,
                        "error": "EXA client not configured. Web search unavailable.",
                    }, ensure_ascii=False)

                results = await self.exa_client.search(query, num_results=num_results)

                return json.dumps({
                    "success": True,
                    "total_results": len(results),
                    "results": results,
                }, ensure_ascii=False)
            elif tool_name == "search_cnj_site":
                query = tool_input.get("query", "")
                num_results = tool_input.get("num_results", 5)

                if not self.exa_client:
                    return json.dumps({
                        "success": False,
                        "error": "EXA client not configured. CNJ web search unavailable.",
                    }, ensure_ascii=False)

                results = await self.exa_client.search(
                    query, 
                    num_results=num_results,
                    include_domains=["cnj.jus.br"]
                )

                return json.dumps({
                    "success": True,
                    "total_results": len(results),
                    "results": results,
                }, ensure_ascii=False)
            elif tool_name == "get_norma_detail":
                norma_id = tool_input.get("norma_id", "")
                norma = await db.get_norma_by_id(norma_id)

                if not norma:
                    return json.dumps({
                        "success": False,
                        "error": f"Normativo com ID '{norma_id}' nao encontrado.",
                    }, ensure_ascii=False)

                return json.dumps({
                    "success": True,
                    "norma": norma,
                }, ensure_ascii=False)

            elif tool_name == "validate_answer":
                # Reflexion: return the validation prompt for the LLM to self-check
                return json.dumps({
                    "success": True,
                    "instruction": REFLEXION_PROMPT,
                    "proposed_answer": tool_input.get("proposed_answer", ""),
                    "sources_used": tool_input.get("sources_used", ""),
                    "original_question": tool_input.get("original_question", ""),
                }, ensure_ascii=False)

            elif tool_name == "generate_parecer":
                return json.dumps({
                    "success": True,
                    "instruction": PARECER_PROMPT,
                    "tema": tool_input.get("tema", ""),
                    "contexto": tool_input.get("contexto", ""),
                }, ensure_ascii=False)

            return json.dumps({"error": f"Unknown tool: {tool_name}"})

        except Exception as e:
            logger.error("_execute_tool error: %s", e, exc_info=True)
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)

    @staticmethod
    def _estimate_tokens(messages: list[dict]) -> int:
        total = 0
        for m in messages:
            content = m.get("content", "")
            if content:
                total += len(content)
            for tc in m.get("tool_calls", []):
                total += len(tc.get("function", {}).get("arguments", ""))
        return total // 4

    @staticmethod
    def _compress_tool_results(messages: list[dict], max_tokens: int = 100_000) -> list[dict]:
        estimated = sum(len(m.get("content", "")) // 4 for m in messages)
        if estimated <= max_tokens:
            return messages

        compressed = [messages[0]]
        middle = messages[1:-4]
        tail = messages[-4:]

        for m in middle:
            if m.get("role") == "tool":
                content = m.get("content", "")
                try:
                    parsed = json.loads(content)
                    if parsed.get("success") and "results" in parsed:
                        count = len(parsed["results"])
                        parsed["results"] = parsed["results"][:3]
                        parsed["_compressed"] = f"Comprimido: mostrando 3 de {count} resultados."
                        m = {**m, "content": json.dumps(parsed, ensure_ascii=False)}
                except (json.JSONDecodeError, TypeError):
                    pass
            compressed.append(m)

        return compressed + tail

    async def stream(
        self,
        message: str,
        history: list[dict],
        model: str = "meta-llama/llama-3.3-70b-instruct:free",
        mode: str = "chat",
        filters: dict = None,
        tools_config: dict | None = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Delegate streaming to the specialized agent router."""
        from app.services.agents.router import agent_router
        
        async for chunk in agent_router(
            self, message, history, model, mode, filters, tools_config
        ):
            yield chunk
