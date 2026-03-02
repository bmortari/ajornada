from typing import AsyncGenerator
from app.services.agents.base_agent import StreamChunk
from app.services.agents.specialists import ChatAgent, RevisorAgent, PareceristaAgent

async def agent_router(
    agent_instance,
    message: str,
    history: list[dict],
    model: str,
    mode: str,
    filters: dict,
    tools_config: dict
) -> AsyncGenerator[StreamChunk, None]:
    """
    Routes the user request to the appropriate specialized ReAct Agent
    based on the toggled tools/modes.
    """
    if tools_config.get("revisorMinutas", False):
        yield StreamChunk(type="status", content="Iniciando auditoria especializada da minuta...")
        specialist = RevisorAgent(agent_instance)
    elif tools_config.get("parecerJuridico", False):
        yield StreamChunk(type="status", content="Preparando estrutura formal do Parecer Técnico...")
        specialist = PareceristaAgent(agent_instance)
    else:
        yield StreamChunk(type="status", content="Analisando sua consulta...")
        specialist = ChatAgent(agent_instance)

    # Route stream execution to the assigned specialist
    async for chunk in specialist.stream(
        message=message,
        history=history,
        model=model,
        mode=mode,
        filters=filters,
        tools_config=tools_config
    ):
        yield chunk
