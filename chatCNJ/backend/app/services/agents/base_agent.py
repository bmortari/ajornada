import json
import logging
import re
from dataclasses import dataclass
from typing import AsyncGenerator

from openai import AsyncOpenAI
from app.config import settings
from app.services import db
from app.services.llm_client import call_llm
from app.services.embeddings import get_query_embedding

logger = logging.getLogger(__name__)

SPECIAL_TOKEN_PATTERN = re.compile(
    r"<\|(?:eot_id|finetune_right_pad_id|step_id|start_of_turn|end_of_turn|"
    r"im_start|im_end|endoftext|pad|user|assistant|system)\|>|</?s>"
)

TEXT_TOOL_CALL_PATTERN = re.compile(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", re.DOTALL)

def _clean_special_tokens(text: str) -> str:
    return SPECIAL_TOKEN_PATTERN.sub("", text)

def _parse_text_tool_calls(text: str) -> tuple[str, list[dict]]:
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
    cleaned = re.sub(r"</?tool_call>", "", cleaned).strip()
    return cleaned, found

@dataclass
class StreamChunk:
    type: str
    content: str = ""
    payload: dict | None = None

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
                        "description": "Opcional. Nome/Tipo e número se o usuario pedir uma norma especifica. Ex: 'Resolução 331' ou apenas '350'. Informar o tipo evita confundir Portarias com Resoluções do mesmo número."
                    },
                    "termo_exato": {
                        "type": "string",
                        "description": "Opcional. Buscar um texto EXATO dentro do documento da norma. Ideal para descricoes especificas."
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

class BaseAgent:
    """Base generic ReAct Agent loop, supporting Loop Prevention, Robust JSON Parsing, and streaming."""
    
    SYSTEM_PROMPT = "Você é um AI assistente útil."
    
    def __init__(self, agent_instance):
        self.agent_instance = agent_instance # the main NormasAgent containing clients
        self.client = agent_instance.client
        self.exa_client = agent_instance.exa_client

    def build_system_prompt(self, mode: str) -> str:
        return self.SYSTEM_PROMPT

    def build_messages(self, message: str, history: list[dict], mode: str) -> list[dict]:
        messages = [{"role": "system", "content": self.build_system_prompt(mode)}]
        history_limit = 20 if mode == "deep_research" else 10
        for h in history[-history_limit:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})
        return messages

    async def execute_tool(self, tool_name: str, tool_input: dict, filters: dict = None) -> str:
        return await self.agent_instance._execute_tool(tool_name, tool_input, filters=filters)

    def _compress_tool_results(self, messages: list[dict], max_tokens: int = 100_000) -> list[dict]:
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
        
        if filters is None: filters = {}
        if tools_config is None: tools_config = {}

        messages = self.build_messages(message, history, mode)
        
        base_tools = DEEP_RESEARCH_TOOLS if mode == "deep_research" else CHAT_TOOLS
        
        # Filter available tools based on frontend UI configuration
        available_tools = []
        for t in base_tools:
            name = t["function"]["name"]
            if name == "search_web" and tools_config.get("searchWeb") is False:
                continue
            if name == "search_cnj_site" and tools_config.get("searchCnjSite") is False:
                continue
            if name == "search_normas" and tools_config.get("searchNormas") is False:
                continue
            available_tools.append(t)
            
        tools_to_pass = available_tools
        available_tools_names = [t["function"]["name"] for t in available_tools]

        max_iterations = 40 if mode == "deep_research" else 20
        planning_hint = {
            "role": "system",
            "content": (
                "Para planejar ou raciocinar internamente ANTES de responder ou usar ferramentas, você DEVE englobar o seu texto nas tags <think> e </think>. "
                "Tudo dentro de <think> será considerado seu pensamento interno. "
                "Se já buscou várias vezes sem sucesso, responda com o que encontrou em vez de repetir buscas."
            ),
        }
        messages.insert(1, planning_hint)

        # Loop Prevention trackers
        called_tools = set()
        query_hashes = {} # Track identical tool calls. format: hash(tool_name + args) -> int (count)

        for iteration in range(max_iterations):
            messages = self._compress_tool_results(messages)

            # Once validate_answer is called, remove it.
            if tools_to_pass:
                if "validate_answer" in called_tools:
                    tools_to_pass = [t for t in tools_to_pass if t["function"]["name"] != "validate_answer"]
                if not tools_to_pass:
                    tools_to_pass = None

            try:
                response_stream = await call_llm(
                    self.client,
                    model=model,
                    fallback_models=settings.openrouter_fallback_models,
                    max_tokens=4096 if mode != "deep_research" else 8192,
                    messages=messages,
                    tools=tools_to_pass,
                    stream=True,
                )
            except Exception as e:
                logger.error("OpenRouter API error: %s", e)
                yield StreamChunk(type="text", content=f"Erro ao processar sua consulta: {str(e)}")
                return

            text_content = ""
            reasoning_content = ""
            tool_calls_acc: dict[int, dict] = {}
            has_tool_calls = False

            try:
                async for chunk in response_stream:
                    if not chunk.choices: continue
                    delta = chunk.choices[0].delta
                    
                    r_content = getattr(delta, "reasoning", None)
                    if r_content: reasoning_content += r_content

                    if delta and delta.content:
                        clean = _clean_special_tokens(delta.content)
                        if clean:
                            text_content += clean
                            if not has_tool_calls:
                                yield StreamChunk(type="text", content=clean)

                            if not has_tool_calls and "<tool_call>" in text_content:
                                cleaned_text, parsed_tcs = _parse_text_tool_calls(text_content)
                                if parsed_tcs:
                                    has_tool_calls = True
                                    text_content = cleaned_text
                                    base_idx = max(tool_calls_acc.keys()) + 1 if tool_calls_acc else 0
                                    for i, tc in enumerate(parsed_tcs):
                                        idx = base_idx + i
                                        tool_calls_acc[idx] = {
                                            "id": f"text_tc_{iteration}_{idx}",
                                            "type": "function",
                                            "function": {
                                                "name": tc["name"],
                                                "arguments": json.dumps(tc.get("arguments", {}), ensure_ascii=False),
                                            },
                                        }
                                    break

                    if delta and delta.tool_calls:
                        has_tool_calls = True
                        for tc_delta in delta.tool_calls:
                            idx = tc_delta.index
                            if idx not in tool_calls_acc:
                                tool_calls_acc[idx] = {
                                    "id": tc_delta.id,
                                    "type": "function",
                                    "function": {"name": tc_delta.function.name or "", "arguments": tc_delta.function.arguments or ""}
                                }
                            else:
                                if tc_delta.function.name:
                                    tool_calls_acc[idx]["function"]["name"] += tc_delta.function.name
                                if tc_delta.function.arguments:
                                    tool_calls_acc[idx]["function"]["arguments"] += tc_delta.function.arguments
            except Exception as e:
                yield StreamChunk(type="text", content=f"Erro durante o streaming: {str(e)}")
                return

            # Fallback for plain text <tool_call> blocks
            if not has_tool_calls and text_content and "<tool_call>" in text_content:
                cleaned_text, parsed_tcs = _parse_text_tool_calls(text_content)
                if parsed_tcs:
                    has_tool_calls = True
                    text_content = cleaned_text
                    for i, tc in enumerate(parsed_tcs):
                        tool_calls_acc[i] = {
                            "id": f"text_tc_{iteration}_{i}",
                            "type": "function",
                            "function": {
                                "name": tc["name"],
                                "arguments": json.dumps(tc.get("arguments", {}), ensure_ascii=False),
                            },
                        }

            if reasoning_content.strip():
                yield StreamChunk(type="thinking", content=reasoning_content.strip())

            # Handle tools
            if has_tool_calls and tool_calls_acc:
                if text_content.strip():
                    yield StreamChunk(type="thinking_flush", content=text_content.strip())

                tool_calls_list = list(tool_calls_acc.values())
                messages.append({
                    "role": "assistant",
                    "content": text_content or " ",
                    "tool_calls": tool_calls_list,
                })

                for tc in tool_calls_list:
                    tool_name = tc["function"]["name"]

                    if tool_name not in available_tools_names:
                        logger.warning("Blocked hallucinated tool call: %s", tool_name)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": json.dumps({
                                "success": False,
                                "error": f"A ferramenta '{tool_name}' não existe. Você não pode usá-la."
                            }, ensure_ascii=False),
                        })
                        yield StreamChunk(type="status", content=f"Ignorando ferramenta inválida ({tool_name})...")
                        continue

                    raw_args = tc["function"]["arguments"]
                    
                    # Robust JSON Parser Fallback
                    try:
                        tool_input = json.loads(raw_args)
                    except json.JSONDecodeError:
                        # Attempt to fix markdown wrapped json like ```json { ... } ```
                        cleaned_args = re.sub(r'```json\s*', '', raw_args)
                        cleaned_args = re.sub(r'```\s*$', '', cleaned_args).strip()
                        try:
                            tool_input = json.loads(cleaned_args)
                        except json.JSONDecodeError as parse_err:
                            logger.warning("Tool arg parse error: %s | raw: %.200s", parse_err, raw_args)
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "content": json.dumps({
                                    "success": False,
                                    "error": "CRITICAL ERROR: JSON malformado nos argumentos da ferramenta. "
                                             "Você MUST retornar um JSON estrito, sem formatação markdown ou texto extra. "
                                             "Verifique se fechou todas as chaves e aspas corretamente."
                                }, ensure_ascii=False),
                            })
                            continue

                    # Infinite Loop Prevention
                    call_hash = f"{tool_name}_{json.dumps(tool_input, sort_keys=True)}"
                    query_hashes[call_hash] = query_hashes.get(call_hash, 0) + 1
                    
                    if query_hashes[call_hash] >= 3:
                        logger.warning(f"Prevented Infinite Loop on {tool_name} with args {tool_input}")
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": json.dumps({
                                "success": False,
                                "error": "LOOP INFINITO DETECTADO: Você tentou realizar exatamente a mesma consulta várias vezes e falhou. Pare de buscar e responda com o que você encontrou até o momento."
                            }, ensure_ascii=False),
                        })
                        yield StreamChunk(type="status", content=f"Desistindo dessa linha de pesquisa (buscas repetidas).")
                        continue

                    called_tools.add(tool_name)

                    status_map = {
                        "search_normas": "Buscando normativos na base do CNJ...",
                        "search_cnj_site": "Pesquisando noticias no site do CNJ...",
                        "search_web": "Pesquisando na web via EXA...",
                        "get_norma_detail": "Buscando detalhes do normativo...",
                        "validate_answer": "Validando a resposta..."
                    }
                    yield StreamChunk(type="status", content=status_map.get(tool_name, f"Executando {tool_name}..."))

                    # Execute Tool
                    if tool_name == "search_web" and mode == "deep_research" and self.exa_client:
                        query = tool_input.get("query", "")
                        full_text = ""
                        yield StreamChunk(type="thinking", content="\n\n**[EXA DEEP RESEARCH REPORT]**\n")
                        async for text_chunk in self.exa_client.research_stream(query):
                            full_text += text_chunk
                            yield StreamChunk(type="thinking", content=text_chunk)
                        yield StreamChunk(type="thinking", content="\n\n")

                        try:
                            links = re.findall(r'\[([^\]]+)\]\((https?://[^\)]+)\)', full_text)
                            if links:
                                web_sources = []
                                seen_urls = set()
                                for title, url in links:
                                    if url not in seen_urls:
                                        web_sources.append({
                                            "title": title.strip() or url,
                                            "url": url,
                                            "snippet": f"Fonte referenciada na pesquisa Exa: {title}"
                                        })
                                        seen_urls.add(url)
                                yield StreamChunk(type="web_sources", payload={"sources": web_sources})
                        except Exception: pass

                        result = json.dumps({"success": True, "source": "exa-research", "report": full_text}, ensure_ascii=False)
                    else:
                        logger.error(f">>> EXECUTING TOOL {tool_name} WITH ARGS: {tool_input}")
                        result = await self.execute_tool(tool_name, tool_input, filters=filters)
                        logger.error(f"<<< TOOL RESULT LENGTH: {len(result)}")

                    messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

                    if tool_name == "search_normas":
                        try:
                            parsed = json.loads(result)
                            if parsed.get("success") and parsed.get("results"):
                                sources = [{
                                    "id": r.get("id", ""),
                                    "title": r.get("identificacao", "Normativo"),
                                    "snippet": r.get("texto", "")[:200],
                                    "similarity": r.get("similarity", 0),
                                    "situacao": r.get("situacao", ""),
                                    "url": r.get("document_url", ""),
                                } for r in parsed["results"]]
                                yield StreamChunk(type="sources", payload={"sources": sources})
                        except Exception: pass

                    if tool_name in ["search_web", "search_cnj_site"]:
                        try:
                            parsed = json.loads(result)
                            if parsed.get("success") and parsed.get("results"):
                                web_sources = [{
                                    "title": r.get("title", ""),
                                    "url": r.get("url", ""),
                                    "snippet": (r.get("highlights", [""])[0] if r.get("highlights") else r.get("text", "")[:200]),
                                } for r in parsed["results"]]
                                yield StreamChunk(type="web_sources", payload={"sources": web_sources})
                        except Exception: pass

                yield StreamChunk(type="status", content="Interpretando resultados...")
                continue

            else:
                if not text_content.strip() and not reasoning_content.strip():
                    yield StreamChunk(type="text", content="Não consegui formular uma resposta técnica. Por favor, reformule a pergunta.")
                return

        # Force break after max_iterations
        yield StreamChunk(type="status", content="Limite de buscas atingido. Formulando resposta final com o que encontrei...")
        messages.append({
            "role": "system",
            "content": (
                "🚨 LIMITE DE BUSCAS ATINGIDO 🚨\n"
                "Você OBRIGATORIAMENTE deve fornecer uma resposta final para o usuário AGORA, "
                "baseando-se EXCLUSIVAMENTE em todo o contexto e documentos que você já encontrou. "
                "Não repita buscas, processe o status das normas que você já tem em mãos e entregue a resposta."
            )
        })
        try:
            response_stream = await call_llm(
                self.client, model=model, fallback_models=settings.openrouter_fallback_models,
                max_tokens=4096 if mode != "deep_research" else 8192, messages=messages, tools=None, stream=True,
            )
            async for chunk in response_stream:
                if not chunk.choices: continue
                delta = chunk.choices[0].delta
                r_content = getattr(delta, "reasoning", None)
                if r_content: yield StreamChunk(type="thinking", content=r_content)
                if delta.content:
                    clean = _clean_special_tokens(delta.content)
                    if clean: yield StreamChunk(type="text", content=clean)
        except Exception as e:
            yield StreamChunk(type="text", content=f"\n\n*Aviso: Erro na síntese final ({str(e)}).*")
