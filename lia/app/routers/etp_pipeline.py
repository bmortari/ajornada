"""
Sistema LIA - Router do Pipeline ETP
======================================
Endpoints REST para cada passo do pipeline ETP.

Prefixo: /api/etp-pipeline

Autor: Equipe TRE-GO
Data: Fevereiro 2026
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import logging

from app.database import get_db
from app.models.artefatos import ETP, DFD
from app.services.etp_pipeline import (
    ETPPipelineState, ETPPipelineEngine, CaminhoETP
)
from app.services.compras_service import compras_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request/Response Schemas ───────────────────────────────────

class Passo1Request(BaseModel):
    """Passo 1: Revisar DFD e definir itens."""
    itens: List[Dict[str, Any]] = Field(..., description="Itens com descricao, unidade_medida, quantidade")


class Passo2Request(BaseModel):
    """Passo 2: Confirmar códigos CATMAT/CATSERV."""
    resultados_busca: List[Dict[str, Any]] = Field(default_factory=list, description="Resultados da busca vetorial")
    codigos_selecionados: List[int] = Field(..., description="Códigos confirmados pelo usuário")


class Passo3SelecionarARPRequest(BaseModel):
    """Passo 3: Selecionar ARP ou seguir para licitação nova."""
    arp_selecionada: Optional[Dict[str, Any]] = Field(None, description="ARP escolhida (null = licitação nova)")
    caminho: str = Field("licitacao_nova", description="carona ou licitacao_nova")


class Passo4Request(BaseModel):
    """Passo 4: Dados da pesquisa de mercado."""
    fontes_consultadas: List[str] = Field(default_factory=list)
    valor_mediana: Optional[float] = None
    valor_menor: Optional[float] = None
    valor_medio: Optional[float] = None
    conformidade_in65: bool = False
    detalhes: List[Dict[str, Any]] = Field(default_factory=list)


class Passo5Request(BaseModel):
    """Passo 5: Respostas do deep research."""
    respostas: Dict[str, Any] = Field(..., description="Respostas da entrevista IA")


class PipelineResponse(BaseModel):
    """Resposta padrão do pipeline."""
    sucesso: bool
    passo_atual: int
    estado: Dict[str, Any]
    mensagem: str = ""


# ── Helpers ────────────────────────────────────────────────────

async def get_etp_with_pipeline(projeto_id: int, db: AsyncSession) -> ETP:
    """Busca o ETP do projeto com pipeline state."""
    result = await db.execute(
        select(ETP)
        .where(ETP.projeto_id == projeto_id)
        .order_by(ETP.versao.desc())
    )
    etp = result.scalars().first()
    
    if not etp:
        raise HTTPException(status_code=404, detail=f"ETP não encontrado para projeto {projeto_id}")
    
    return etp


def load_pipeline_state(etp: ETP) -> ETPPipelineState:
    """Carrega o estado do pipeline do ETP."""
    if etp.etp_pipeline_state:
        return ETPPipelineState(**etp.etp_pipeline_state)
    return ETPPipelineState()


async def save_pipeline_state(etp: ETP, state: ETPPipelineState, db: AsyncSession):
    """Salva o estado do pipeline no ETP."""
    etp.etp_pipeline_state = state.model_dump()
    etp.passo_pipeline_atual = state.passo_atual
    await db.commit()


# ── Endpoints ──────────────────────────────────────────────────

@router.get("/{projeto_id}/estado")
async def get_pipeline_estado(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retorna o estado atual do pipeline ETP."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    state = load_pipeline_state(etp)
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=state.passo_atual,
        estado=state.model_dump(),
        mensagem=f"Pipeline no passo {state.passo_atual}"
    )


@router.post("/{projeto_id}/iniciar")
async def iniciar_pipeline(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Inicia o pipeline ETP carregando dados do DFD aprovado."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    
    # Buscar DFD aprovado
    result = await db.execute(
        select(DFD)
        .where(
            DFD.projeto_id == projeto_id,
            DFD.status.in_(["aprovado", "publicado"])
        )
        .order_by(DFD.versao.desc())
    )
    dfd = result.scalars().first()
    
    if not dfd:
        raise HTTPException(
            status_code=400, 
            detail="DFD aprovado não encontrado. Aprove o DFD antes de iniciar o pipeline ETP."
        )
    
    # Criar estado inicial com dados do DFD
    state = ETPPipelineState(
        passo_atual=1,
        dfd_id=dfd.id,
        descricao_objeto=dfd.descricao_objeto or "",
        justificativa=dfd.justificativa or "",
    )
    state.status_passos["1"] = "em_andamento"
    
    await save_pipeline_state(etp, state, db)
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=1,
        estado=state.model_dump(),
        mensagem="Pipeline iniciado! Revise os itens do DFD."
    )


@router.post("/{projeto_id}/passo1/salvar")
async def salvar_passo1(
    projeto_id: int,
    request: Passo1Request,
    db: AsyncSession = Depends(get_db),
):
    """Passo 1: Salvar itens revisados com unidades de medida."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    state = load_pipeline_state(etp)
    
    dfd_data = {
        "id": state.dfd_id,
        "descricao_objeto": state.descricao_objeto,
        "justificativa": state.justificativa,
    }
    
    state = await ETPPipelineEngine.executar_passo1(state, dfd_data, request.itens)
    await save_pipeline_state(etp, state, db)
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=state.passo_atual,
        estado=state.model_dump(),
        mensagem=f"Passo 1 concluído: {len(request.itens)} itens definidos."
    )


@router.get("/{projeto_id}/passo2/buscar")
async def buscar_catalogo(
    projeto_id: int,
    query: str,
    top_k: int = 10,
    tipo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Passo 2: Busca vetorial no catálogo CATMAT/CATSERV."""
    from catalogo.search import CatalogoSearcher
    
    searcher = CatalogoSearcher()
    results = searcher.search(
        query=query,
        top_k=top_k,
        tipo_filtro=tipo,
        apenas_ativos=True,
    )
    
    return {
        "sucesso": True,
        "query": query,
        "resultados": [r.to_dict() for r in results],
        "total": len(results),
    }


@router.post("/{projeto_id}/passo2/salvar")
async def salvar_passo2(
    projeto_id: int,
    request: Passo2Request,
    db: AsyncSession = Depends(get_db),
):
    """Passo 2: Confirmar códigos CATMAT/CATSERV selecionados."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    state = load_pipeline_state(etp)
    
    state = await ETPPipelineEngine.executar_passo2(
        state, request.resultados_busca, request.codigos_selecionados
    )
    await save_pipeline_state(etp, state, db)
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=state.passo_atual,
        estado=state.model_dump(),
        mensagem=f"Passo 2 concluído: {len(request.codigos_selecionados)} códigos confirmados."
    )


@router.get("/{projeto_id}/passo3/buscar-arps")
async def buscar_arps(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Passo 3: Busca automática de ARPs vigentes nos códigos selecionados."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    state = load_pipeline_state(etp)
    
    if not state.codigos_selecionados:
        raise HTTPException(
            status_code=400,
            detail="Nenhum código CATMAT/CATSERV selecionado. Complete o passo 2 primeiro."
        )
    
    # Buscar ARPs na API real do ComprasGov
    arps = await compras_service.buscar_arps_vigentes(
        codigos_catmat=state.codigos_selecionados,
        max_resultados_por_codigo=10,
    )
    
    return {
        "sucesso": True,
        "codigos_pesquisados": state.codigos_selecionados,
        "arps_encontradas": arps,
        "total": len(arps),
    }


@router.post("/{projeto_id}/passo3/salvar")
async def salvar_passo3(
    projeto_id: int,
    request: Passo3SelecionarARPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Passo 3: Selecionar ARP ou optar por licitação nova."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    state = load_pipeline_state(etp)
    
    # Buscar ARPs atuais caso não estejam no state
    arps_raw = [arp.model_dump() for arp in state.arps_encontradas] if state.arps_encontradas else []
    
    state = await ETPPipelineEngine.executar_passo3(
        state,
        arps=arps_raw,
        arp_selecionada=request.arp_selecionada,
        caminho=request.caminho,
    )
    await save_pipeline_state(etp, state, db)
    
    msg = "Carona em ARP selecionada! Pulando pesquisa de mercado." if state.caminho == CaminhoETP.CARONA else "Licitação nova: prosseguindo para pesquisa de mercado."
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=state.passo_atual,
        estado=state.model_dump(),
        mensagem=msg,
    )


@router.post("/{projeto_id}/passo4/salvar")
async def salvar_passo4(
    projeto_id: int,
    request: Passo4Request,
    db: AsyncSession = Depends(get_db),
):
    """Passo 4: Salvar pesquisa de mercado IN 65/2021."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    state = load_pipeline_state(etp)
    
    if state.caminho == CaminhoETP.CARONA:
        raise HTTPException(status_code=400, detail="Passo 4 não aplicável para carona em ARP.")
    
    state = await ETPPipelineEngine.executar_passo4(state, request.model_dump())
    await save_pipeline_state(etp, state, db)
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=state.passo_atual,
        estado=state.model_dump(),
        mensagem="Passo 4 concluído: pesquisa de mercado registrada."
    )


@router.post("/{projeto_id}/passo5/salvar")
async def salvar_passo5(
    projeto_id: int,
    request: Passo5Request,
    db: AsyncSession = Depends(get_db),
):
    """Passo 5: Salvar respostas do deep research."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    state = load_pipeline_state(etp)
    
    state = await ETPPipelineEngine.executar_passo5(state, request.respostas)
    await save_pipeline_state(etp, state, db)
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=state.passo_atual,
        estado=state.model_dump(),
        mensagem="Passo 5 concluído: deep research finalizado. Pronto para gerar o ETP!"
    )


@router.post("/{projeto_id}/passo6/gerar")
async def gerar_etp(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Passo 6: Gerar o ETP final com todos os dados acumulados."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    state = load_pipeline_state(etp)
    
    # Verificar pré-condição: passo 5 concluído
    if state.status_passos.get("5") != "concluido":
        raise HTTPException(
            status_code=400,
            detail="Complete o passo 5 (Deep Research) antes de gerar o ETP."
        )
    
    state = await ETPPipelineEngine.executar_passo6(state)
    await save_pipeline_state(etp, state, db)
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=6,
        estado=state.model_dump(),
        mensagem="🎉 ETP gerado com sucesso!"
    )


@router.post("/{projeto_id}/resetar")
async def resetar_pipeline(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Reseta o pipeline para recomeçar do zero."""
    etp = await get_etp_with_pipeline(projeto_id, db)
    
    state = ETPPipelineState()
    await save_pipeline_state(etp, state, db)
    
    return PipelineResponse(
        sucesso=True,
        passo_atual=0,
        estado=state.model_dump(),
        mensagem="Pipeline resetado."
    )
