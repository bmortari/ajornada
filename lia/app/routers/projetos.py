"""
Sistema LIA - Router de Projetos
=================================
Endpoints para CRUD de projetos de contratação

Autor: Equipe TRE-GO
Data: Janeiro 2026
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, model_validator
from app.database import get_db
from app.utils.datetime_utils import now_brasilia
from app.models.projeto import Projeto
from app.routers.ia_chat._context import construir_contexto_chat
from app.models.user import User
from app.auth import current_active_user as get_current_user
from app.config import ProjetoStatus
import logging

logger = logging.getLogger(__name__)


# ========== SCHEMAS ==========

class ItemPacProjeto(BaseModel):
    """Schema para item PAC vinculado ao projeto com quantidade específica"""
    id: int
    quantidade: Optional[float] = None  # Quantidade específica para este projeto (None = usa quantidade do PAC)

class ProjetoCreate(BaseModel):
    """Schema para criação de projeto - aceita campos do frontend (nome/objeto) e do backend (titulo/descricao)"""
    # Aceita tanto 'titulo' quanto 'nome' (frontend)
    titulo: Optional[str] = Field(None, max_length=300)
    nome: Optional[str] = Field(None, max_length=300)
    # Aceita tanto 'descricao' quanto 'objeto' (frontend)
    descricao: Optional[str] = None
    objeto: Optional[str] = None
    # Frontend pode não enviar estes campos
    prompt_inicial: Optional[str] = None
    itens_pac: Optional[List[ItemPacProjeto]] = []
    intra_pac: Optional[bool] = True
    unidade_requisitante: Optional[str] = None

    @model_validator(mode="after")
    def resolve_fields(self):
        # Resolve titulo: aceita 'nome' como alias de 'titulo'
        if not self.titulo and self.nome:
            self.titulo = self.nome
        if not self.titulo:
            raise ValueError("titulo ou nome é obrigatório")
        # Resolve descricao: aceita 'objeto' como alias de 'descricao'
        if not self.descricao and self.objeto:
            self.descricao = self.objeto
        # prompt_inicial padrão: usa descricao ou titulo
        if not self.prompt_inicial:
            self.prompt_inicial = self.descricao or self.titulo or ""
        return self

class ProjetoUpdate(BaseModel):
    """Schema para atualização de projeto"""
    titulo: Optional[str] = Field(None, max_length=300)
    nome: Optional[str] = Field(None, max_length=300)
    descricao: Optional[str] = None
    objeto: Optional[str] = None
    status: Optional[str] = None
    intra_pac: Optional[bool] = None

    @model_validator(mode="after")
    def resolve_fields(self):
        if not self.titulo and self.nome:
            self.titulo = self.nome
        if not self.descricao and self.objeto:
            self.descricao = self.objeto
        return self

class ProjetoResponse(BaseModel):
    """Schema de resposta de projeto com todos os 18 artefatos"""
    id: int
    titulo: str
    descricao: Optional[str] = None
    usuario_id: int
    prompt_inicial: Optional[str] = None
    itens_pac: Optional[List] = None
    intra_pac: bool = True
    status: str
    arquivado: bool = False
    data_criacao: datetime
    data_atualizacao: datetime

    # Aliases para compatibilidade com frontend
    nome: Optional[str] = None
    objeto: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    unidade_requisitante: Optional[str] = None
    protocolo_sei: Optional[dict] = None
    
    # Fluxo Principal (7 artefatos)
    tem_dfd: bool = False
    tem_etp: bool = False
    tem_pp: bool = False
    tem_pgr: bool = False
    tem_tr: bool = False
    tem_edital: bool = False
    tem_pd: bool = False
    
    # Adesão a Ata (3 artefatos)
    tem_rdve: bool = False
    tem_jva: bool = False
    tem_tafo: bool = False
    
    # Dispensa Valor Baixo (4 artefatos)
    tem_trs: bool = False
    tem_ade: bool = False
    tem_jpef: bool = False
    tem_ce: bool = False
    
    # Licitação Normal (2 artefatos)
    tem_chk: bool = False
    tem_mc: bool = False
    
    # Contratação Direta (2 artefatos)
    tem_apd: bool = False
    tem_jfe: bool = False
    
    class Config:
        from_attributes = True

# ========== HELPERS ==========

def _safe_bool(val) -> bool:
    """Converte None para False (propriedades tem_* retornam None quando relationship não carregada)"""
    return bool(val) if val is not None else False

def _build_response(p: Projeto, itens_pac=None, **extra_flags) -> ProjetoResponse:
    """Constrói ProjetoResponse com aliases de compatibilidade frontend"""
    return ProjetoResponse(
        id=p.id,
        titulo=p.titulo,
        descricao=p.descricao,
        nome=p.titulo,
        objeto=p.descricao,
        created_at=p.data_criacao,
        updated_at=p.data_atualizacao,
        usuario_id=p.usuario_id,
        prompt_inicial=p.prompt_inicial,
        itens_pac=itens_pac if itens_pac is not None else p.itens_pac,
        intra_pac=bool(p.intra_pac) if p.intra_pac is not None else True,
        status=p.status,
        arquivado=bool(p.arquivado) if p.arquivado is not None else False,
        protocolo_sei=p.protocolo_sei,
        data_criacao=p.data_criacao,
        data_atualizacao=p.data_atualizacao,
        tem_dfd=_safe_bool(getattr(p, 'tem_dfd', False)),
        tem_etp=_safe_bool(getattr(p, 'tem_etp', False)),
        tem_pp=_safe_bool(getattr(p, 'tem_pp', False)),
        tem_pgr=_safe_bool(getattr(p, 'tem_pgr', False)),
        tem_tr=_safe_bool(getattr(p, 'tem_tr', False)),
        tem_edital=_safe_bool(getattr(p, 'tem_edital', False)),
        tem_pd=_safe_bool(getattr(p, 'tem_pd', False)),
        tem_rdve=_safe_bool(getattr(p, 'tem_rdve', False)),
        tem_jva=_safe_bool(getattr(p, 'tem_jva', False)),
        tem_tafo=_safe_bool(getattr(p, 'tem_tafo', False)),
        tem_trs=_safe_bool(getattr(p, 'tem_trs', False)),
        tem_ade=_safe_bool(getattr(p, 'tem_ade', False)),
        tem_jpef=_safe_bool(getattr(p, 'tem_jpef', False)),
        tem_ce=_safe_bool(getattr(p, 'tem_ce', False)),
        tem_chk=_safe_bool(getattr(p, 'tem_chk', False)),
        tem_mc=_safe_bool(getattr(p, 'tem_mc', False)),
        tem_apd=_safe_bool(getattr(p, 'tem_apd', False)),
        tem_jfe=_safe_bool(getattr(p, 'tem_jfe', False)),
        **extra_flags
    )

# ========== ROUTER ==========

router = APIRouter()

# ========== ENDPOINTS ==========

@router.get("", response_model=List[ProjetoResponse])
async def listar_projetos(
    status: Optional[str] = None,
    incluir_arquivados: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista projetos do usuário autenticado (exclui arquivados por padrão)"""
    query = select(Projeto).filter(Projeto.usuario_id == current_user.id)

    if not incluir_arquivados:
        query = query.filter(Projeto.arquivado == 0)

    if status:
        query = query.filter(Projeto.status == status)

    # Carregar relacionamentos necessários para as propriedades tem_*
    query = query.options(
        selectinload(Projeto.dfds),
        selectinload(Projeto.riscos),
        selectinload(Projeto.pesquisas_precos),
        selectinload(Projeto.etps),
        selectinload(Projeto.trs),
        selectinload(Projeto.editais)
    )

    query = query.order_by(Projeto.data_criacao.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    projetos = result.scalars().all()

    return [_build_response(p) for p in projetos]

@router.post("", response_model=ProjetoResponse, status_code=status.HTTP_201_CREATED)
async def criar_projeto(
    projeto_data: ProjetoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um novo projeto de contratação"""
    logger.info(f"📥 Criar projeto - User: {current_user.email}, Data: {projeto_data.model_dump()}")
    # Converter itens_pac para formato JSON (lista de dicts)
    itens_pac_list = projeto_data.itens_pac or []
    itens_pac_json = [item.model_dump() for item in itens_pac_list]
    
    # Determinar se é intra-PAC ou extra-PAC
    intra_pac = bool(itens_pac_json) if projeto_data.intra_pac is None else projeto_data.intra_pac

    novo_projeto = Projeto(
        titulo=projeto_data.titulo,
        descricao=projeto_data.descricao,
        usuario_id=current_user.id,
        prompt_inicial=projeto_data.prompt_inicial or "",
        itens_pac=itens_pac_json,
        intra_pac=1 if intra_pac else 0,
        status=ProjetoStatus.RASCUNHO,
        data_criacao=now_brasilia(),
        data_atualizacao=now_brasilia()
    )
    
    db.add(novo_projeto)
    await db.commit()
    await db.refresh(novo_projeto)
    
    # É um projeto novo, então não tem artefatos. Não precisamos de eager loading aqui
    # pois as listas de relação estarão vazias ou não inicializadas, mas as propriedades
    # devem tratar isso (len(self.dfds) vai falhar se não estiver carregado).
    # O ideal é recarregar com opções ou inicializar listas vazias.
    # Vamos fazer um refresh com loading para garantir.
    
    query = select(Projeto).where(Projeto.id == novo_projeto.id).options(
        selectinload(Projeto.dfds),
        selectinload(Projeto.riscos),
        selectinload(Projeto.pesquisas_precos),
        selectinload(Projeto.etps),
        selectinload(Projeto.trs),
        selectinload(Projeto.editais)
    )
    result = await db.execute(query)
    novo_projeto = result.scalars().first()
    
    return _build_response(novo_projeto)

@router.get("/{projeto_id}", response_model=ProjetoResponse)
async def obter_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtém detalhes de um projeto específico"""
    query = select(Projeto).filter(
        Projeto.id == projeto_id,
        Projeto.usuario_id == current_user.id
    ).options(
        selectinload(Projeto.dfds),
        selectinload(Projeto.riscos),
        selectinload(Projeto.pesquisas_precos),
        selectinload(Projeto.etps),
        selectinload(Projeto.trs),
        selectinload(Projeto.editais)
    )
    
    result = await db.execute(query)
    projeto = result.scalars().first()

    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    # Enrich itens_pac using the same logic as chat context builder so
    # frontend receives PAC items with valor_previsto and quantidade.
    try:
        context = await construir_contexto_chat(projeto_id=projeto.id, db=db, tipo_artefato="dfd", context_deps=["dfd", "pp"]) 
        itens_pac_enriquecido = context.itens_pac
    except Exception:
        itens_pac_enriquecido = projeto.itens_pac

    return _build_response(projeto, itens_pac=itens_pac_enriquecido)

@router.put("/{projeto_id}", response_model=ProjetoResponse)
async def atualizar_projeto(
    projeto_id: int,
    projeto_data: ProjetoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza um projeto existente"""
    # Precisamos carregar opções também aqui para o retorno
    query = select(Projeto).filter(
        Projeto.id == projeto_id,
        Projeto.usuario_id == current_user.id
    ).options(
        selectinload(Projeto.dfds),
        selectinload(Projeto.riscos),
        selectinload(Projeto.pesquisas_precos),
        selectinload(Projeto.etps),
        selectinload(Projeto.trs),
        selectinload(Projeto.editais)
    )
    
    result = await db.execute(query)
    projeto = result.scalars().first()
    
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )
    
    # Atualizar campos fornecidos
    if projeto_data.titulo is not None:
        projeto.titulo = projeto_data.titulo
    if projeto_data.descricao is not None:
        projeto.descricao = projeto_data.descricao
    if projeto_data.status is not None:
        projeto.status = projeto_data.status
    if projeto_data.intra_pac is not None:
        projeto.intra_pac = 1 if projeto_data.intra_pac else 0  # Armazena como 1 (True) ou 0 (False)
    
    projeto.data_atualizacao = now_brasilia()
    
    await db.commit()
    await db.refresh(projeto)
    
    return _build_response(projeto)

@router.post("/{projeto_id}/arquivar")
async def arquivar_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Arquiva um projeto (não exclui, apenas oculta da listagem)"""
    result = await db.execute(select(Projeto).filter(
        Projeto.id == projeto_id,
        Projeto.usuario_id == current_user.id
    ))
    projeto = result.scalars().first()
    
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )
    
    projeto.arquivado = 1
    projeto.data_atualizacao = now_brasilia()
    await db.commit()
    
    return {"message": "Projeto arquivado com sucesso", "id": projeto_id}


@router.post("/{projeto_id}/desarquivar")
async def desarquivar_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Desarquiva um projeto (volta para listagem ativa)"""
    result = await db.execute(select(Projeto).filter(
        Projeto.id == projeto_id,
        Projeto.usuario_id == current_user.id
    ))
    projeto = result.scalars().first()
    
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )
    
    projeto.arquivado = 0
    projeto.data_atualizacao = now_brasilia()
    await db.commit()
    
    return {"message": "Projeto desarquivado com sucesso", "id": projeto_id}


class SEICreateRequest(BaseModel):
    """Schema para criação de processo SEI"""
    assunto: str = Field(..., min_length=5, max_length=500)
    tema: str = Field("Licitação e Contratos", max_length=200)


@router.post("/{projeto_id}/sei")
async def criar_processo_sei(
    projeto_id: int,
    sei_data: SEICreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Simula a criação de processo no SEI.
    Gera um protocolo fictício e vincula ao projeto.
    """
    import random

    result = await db.execute(select(Projeto).filter(
        Projeto.id == projeto_id,
        Projeto.usuario_id == current_user.id
    ))
    projeto = result.scalars().first()

    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    if projeto.protocolo_sei:
        return {
            "message": "Projeto já possui protocolo SEI",
            "protocolo_sei": projeto.protocolo_sei
        }

    # Gerar número de protocolo simulado
    ano = now_brasilia().year
    seq = random.randint(10000, 99999)
    numero = f"{seq:05d}.{random.randint(100000, 999999):06d}/{ano}-{random.randint(10, 99):02d}"

    protocolo = {
        "numero": numero,
        "assunto": sei_data.assunto,
        "tema": sei_data.tema,
        "link": f"https://sei.tre-go.gov.br/sei/modulos/pesquisa/md_pesq_documento_consulta_externa.php?{numero}",
        "data_criacao": now_brasilia().isoformat(),
    }

    projeto.protocolo_sei = protocolo
    projeto.data_atualizacao = now_brasilia()
    await db.commit()

    return {
        "message": "Processo SEI criado com sucesso",
        "protocolo_sei": protocolo
    }

@router.get("/{projeto_id}/fluxo")
async def obter_fluxo_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna o estado do fluxo de artefatos do projeto"""
    from app.services.fluxo_engine import calcular_fluxo

    query = select(Projeto).filter(
        Projeto.id == projeto_id,
        Projeto.usuario_id == current_user.id
    ).options(
        selectinload(Projeto.dfds),
        selectinload(Projeto.etps),
        selectinload(Projeto.trs),
        selectinload(Projeto.riscos),
        selectinload(Projeto.editais),
        selectinload(Projeto.pesquisas_precos),
        selectinload(Projeto.justificativas_excepcionalidade),
        selectinload(Projeto.relatorios_vantagem_economica),
        selectinload(Projeto.justificativas_vantagem_adesao),
        selectinload(Projeto.termos_aceite_fornecedor),
        selectinload(Projeto.trs_simplificados),
        selectinload(Projeto.avisos_dispensa_eletronica),
        selectinload(Projeto.justificativas_preco_escolha),
        selectinload(Projeto.certidoes_enquadramento),
        selectinload(Projeto.checklists_conformidade),
        selectinload(Projeto.minutas_contrato),
        selectinload(Projeto.avisos_publicidade_direta),
        selectinload(Projeto.justificativas_fornecedor_escolhido),
    )

    result = await db.execute(query)
    projeto = result.scalars().first()

    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    fluxo = calcular_fluxo(projeto)

    # Return exactly the fields needed by the frontend stepper
    etapas = []
    for etapa in fluxo.get("etapas", []):
        etapas.append({
            "tipo": etapa["tipo"],
            "sigla": etapa["sigla"],
            "nome": etapa["titulo"],
            "estado": etapa["estado"],
            "status": etapa["estado"], # Keep for backward compatibility
            "liberado": etapa["liberado"],
            "dependencias": etapa["faltando"],
            "branch": etapa.get("branch")
        })

    from app.services.fluxo_engine import obter_cor_branch
    active_branch = fluxo.get("active_branch")
    branch_info = obter_cor_branch(active_branch) if active_branch else None

    return {
        "etapas": etapas,
        "active_branch": active_branch,
        "branch_info": branch_info
    }


@router.get("/{projeto_id}/artefatos")
async def listar_artefatos_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna todos os artefatos do projeto com versões e status"""
    from app.models.artefatos import DFD, ETP, TR, Riscos, Edital, PesquisaPrecos
    from app.models.artefatos import PortariaDesignacao, RelatorioVantagemEconomica
    from app.models.artefatos import JustificativaVantagemAdesao, TermoAceiteFornecedorOrgao
    from app.models.artefatos import TRSimplificado, AvisoDispensaEletronica
    from app.models.artefatos import JustificativaPrecoEscolhaFornecedor, CertidaoEnquadramento
    from app.models.artefatos import ChecklistConformidade, MinutaContrato
    from app.models.artefatos import AvisoPublicidadeDireta, JustificativaFornecedorEscolhido
    from app.models.artefatos import JustificativaExcepcionalidade

    query = select(Projeto).filter(
        Projeto.id == projeto_id,
        Projeto.usuario_id == current_user.id
    ).options(
        selectinload(Projeto.dfds),
        selectinload(Projeto.etps),
        selectinload(Projeto.trs),
        selectinload(Projeto.riscos),
        selectinload(Projeto.editais),
        selectinload(Projeto.pesquisas_precos),
        selectinload(Projeto.portarias_designacao),
        selectinload(Projeto.justificativas_excepcionalidade),
        selectinload(Projeto.relatorios_vantagem_economica),
        selectinload(Projeto.justificativas_vantagem_adesao),
        selectinload(Projeto.termos_aceite_fornecedor),
        selectinload(Projeto.trs_simplificados),
        selectinload(Projeto.avisos_dispensa_eletronica),
        selectinload(Projeto.justificativas_preco_escolha),
        selectinload(Projeto.certidoes_enquadramento),
        selectinload(Projeto.checklists_conformidade),
        selectinload(Projeto.minutas_contrato),
        selectinload(Projeto.avisos_publicidade_direta),
        selectinload(Projeto.justificativas_fornecedor_escolhido),
    )

    result = await db.execute(query)
    projeto = result.scalars().first()

    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )

    # Build response with all artefacts and their versions
    artefatos = []

    # Configuration for each artefact type
    artefato_configs = [
        ("dfd", "DFD", "Documento de Formalização da Demanda", projeto.dfds),
        ("etp", "ETP", "Estudo Técnico Preliminar", projeto.etps),
        ("tr", "TR", "Termo de Referência", projeto.trs),
        ("pgr", "PGR", "Plano de Gerenciamento de Riscos", projeto.riscos),
        ("edital", "Edital", "Edital de Licitação", projeto.editais),
        ("pesquisa_precos", "PP", "Pesquisa de Preços", projeto.pesquisas_precos),
        ("justificativa_excepcionalidade", "JEP", "Justificativa de Excepcionalidade", projeto.justificativas_excepcionalidade),
        ("portaria_designacao", "PD", "Portaria de Designação", projeto.portarias_designacao),
        ("rdve", "RDVE", "Relatório de Vantagem Econômica", projeto.relatorios_vantagem_economica),
        ("jva", "JVA", "Justificativa de Vantagem da Adesão", projeto.justificativas_vantagem_adesao),
        ("tafo", "TAFO", "Termo de Aceite do Fornecedor", projeto.termos_aceite_fornecedor),
        ("trs", "TRS", "Termo de Referência Simplificado", projeto.trs_simplificados),
        ("ade", "ADE", "Aviso de Dispensa Eletrônica", projeto.avisos_dispensa_eletronica),
        ("jpef", "JPEF", "Justificativa de Preço e Escolha", projeto.justificativas_preco_escolha),
        ("ce", "CE", "Certidão de Enquadramento", projeto.certidoes_enquadramento),
        ("checklist_conformidade", "CHK", "Checklist de Conformidade", projeto.checklists_conformidade),
        ("minuta_contrato", "MC", "Minuta de Contrato", projeto.minutas_contrato),
        ("aviso_publicidade_direta", "APD", "Aviso de Publicidade Direta", projeto.avisos_publicidade_direta),
        ("justificativa_fornecedor_escolhido", "JFE", "Justificativa do Fornecedor Escolhido", projeto.justificativas_fornecedor_escolhido),
    ]

    for tipo, sigla, titulo, versoes_list in artefato_configs:
        versoes = []
        for artefato in sorted(versoes_list, key=lambda x: x.versao, reverse=True):
            versoes.append({
                "id": artefato.id,
                "versao": artefato.versao,
                "status": artefato.status,
                "gerado_por_ia": artefato.gerado_por_ia,
                "data_criacao": artefato.data_criacao.isoformat(),
                "data_atualizacao": artefato.data_atualizacao.isoformat(),
                "data_aprovacao": artefato.data_aprovacao.isoformat() if artefato.data_aprovacao else None,
            })

        artefatos.append({
            "tipo": tipo,
            "sigla": sigla,
            "titulo": titulo,
            "total_versoes": len(versoes),
            "versao_atual": versoes[0] if versoes else None,
            "versoes": versoes,
        })

    return {"artefatos": artefatos}
