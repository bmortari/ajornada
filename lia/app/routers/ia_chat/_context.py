"""
Sistema LIA - Chat Context Builders
====================================
Reusable functions for building chat context across all artefact types.
Eliminates context builder duplication from ia_native.py.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any, Optional, TYPE_CHECKING
import logging

from app.models.projeto import Projeto
from app.models.user import User
from app.models.skill import Skill
from app.models.artefatos import DFD, ETP, TR, Riscos, Edital, PesquisaPrecos
from app.models.pac import PAC
from app.services.agents import ChatContext
from app.config import settings

logger = logging.getLogger(__name__)


async def construir_contexto_chat(
    projeto_id: int,
    db: AsyncSession,
    tipo_artefato: str,
    context_deps: Optional[List[str]] = None,
    current_user: Optional[Any] = None,
) -> ChatContext:
    """
    Generic chat context builder.
    Loads project + dependencies based on context_deps list.
    
    Args:
        projeto_id: Project ID
        db: AsyncSession
        tipo_artefato: "dfd", "etp", "pgr", "tr", "edital", "je", etc.
        context_deps: List of artefact keys to load (e.g., ["dfd", "pp", "pgr"])
    
    Returns:
        ChatContext with loaded data
    """
    
    # Default deps: load everything commonly needed
    if context_deps is None:
        context_deps = ["dfd", "pp", "etp", "pgr", "tr"]
    
    # Fetch project
    stmt = select(Projeto).where(Projeto.id == projeto_id)
    result = await db.execute(stmt)
    projeto = result.scalars().first()
    
    if not projeto:
        raise ValueError(f"Projeto {projeto_id} not found")
    
    # Build itens_pac list - fetch from DB using IDs in projeto.itens_pac JSON
    itens_pac = []
    if projeto.itens_pac:
        pac_ids = [item["id"] for item in projeto.itens_pac if isinstance(item, dict) and "id" in item]
        if pac_ids:
            stmt = select(PAC).where(PAC.id.in_(pac_ids))
            result = await db.execute(stmt)
            pac_items = result.scalars().all()
            
            # Build dict with quantities from projeto.itens_pac
            quantities = {item["id"]: item.get("quantidade", 0) for item in projeto.itens_pac if isinstance(item, dict)}
            
            for pac_item in pac_items:
                # Parse valor_previsto - pode ser float ou string "R$15.000,00"
                valor = pac_item.valor_previsto
                if isinstance(valor, str):
                    valor = valor.replace("R$", "").replace(".", "").replace(",", ".").strip()
                try:
                    valor = float(valor) if valor else 0
                except (ValueError, TypeError):
                    valor = 0
                
                # Compute unit value (use model property when available)
                try:
                    valor_por_item = float(pac_item.valor_por_item)
                except Exception:
                    qtd_for_calc = pac_item.quantidade or quantities.get(pac_item.id, 1) or 1
                    valor_por_item = round((valor / qtd_for_calc) if qtd_for_calc else 0, 2)

                itens_pac.append({
                    "id": pac_item.id,
                    "ano": pac_item.ano,
                    "objetivo": pac_item.objetivo,
                    "descricao": pac_item.descricao,
                    "valor_previsto": valor,
                    "valor_por_item": valor_por_item,
                    "quantidade": quantities.get(pac_item.id, 0),
                })
    
    # Load requested artefacts (only approved/published versions)
    context_data = {}
    
    if "dfd" in context_deps:
        stmt = select(DFD).where(
            (DFD.projeto_id == projeto_id) & (DFD.status.in_(["aprovado", "publicado"]))
        ).order_by(DFD.data_criacao.desc()).limit(1)
        result = await db.execute(stmt)
        dfd = result.scalars().first()
        if dfd:
            context_data["dfd"] = {"versao": dfd.versao, "status": dfd.status, **(dfd.dados or {})}
    
    if "pp" in context_deps or "pesquisa_precos" in context_deps:
        stmt = select(PesquisaPrecos).where(
            (PesquisaPrecos.projeto_id == projeto_id) & (PesquisaPrecos.status.in_(["aprovado", "publicado"]))
        ).order_by(PesquisaPrecos.data_criacao.desc()).limit(1)
        result = await db.execute(stmt)
        pp = result.scalars().first()
        if pp:
            context_data["pesquisa_precos"] = {"versao": pp.versao, "status": pp.status, **(pp.dados or {})}
    
    if "etp" in context_deps:
        stmt = select(ETP).where(
            (ETP.projeto_id == projeto_id) & (ETP.status.in_(["aprovado", "publicado"]))
        ).order_by(ETP.data_criacao.desc()).limit(1)
        result = await db.execute(stmt)
        etp = result.scalars().first()
        if etp:
            context_data["etp"] = {"versao": etp.versao, "status": etp.status, **(etp.dados or {})}
    
    if "pgr" in context_deps or "riscos" in context_deps:
        stmt = select(Riscos).where(
            (Riscos.projeto_id == projeto_id) & (Riscos.status.in_(["aprovado", "publicado"]))
        ).order_by(Riscos.data_criacao.desc()).limit(1)
        result = await db.execute(stmt)
        pgr = result.scalars().first()
        if pgr:
            context_data["pgr"] = {"versao": pgr.versao, "status": pgr.status, **(pgr.dados or {})}
    
    if "tr" in context_deps:
        stmt = select(TR).where(
            (TR.projeto_id == projeto_id) & (TR.status.in_(["aprovado", "publicado"]))
        ).order_by(TR.data_criacao.desc()).limit(1)
        result = await db.execute(stmt)
        tr = result.scalars().first()
        if tr:
            context_data["tr"] = {"versao": tr.versao, "status": tr.status, **(tr.dados or {})}
    
    if "edital" in context_deps:
        stmt = select(Edital).where(
            (Edital.projeto_id == projeto_id) & (Edital.status.in_(["aprovado", "publicado"]))
        ).order_by(Edital.data_criacao.desc()).limit(1)
        result = await db.execute(stmt)
        edital = result.scalars().first()
        if edital:
            context_data["edital"] = {"versao": edital.versao, "status": edital.status, **(edital.dados or {})}
    
    # Build ChatContext
    _setor = "Unidade Requisitante"
    _user_nome = ""
    _user_setor = ""
    if current_user:
        _user_nome = getattr(current_user, 'nome', '') or ''
        _user_setor = getattr(current_user, 'setor', '') or ''
        if _user_setor:
            _setor = _user_setor
    context = ChatContext(
        projeto_id=projeto_id,
        projeto_titulo=projeto.titulo,
        setor_usuario=_setor,
        user_nome=_user_nome,
        user_setor=_user_setor,
        itens_pac=itens_pac,
        dfd=context_data.get("dfd"),
        pesquisa_precos=context_data.get("pesquisa_precos"),
        etp=context_data.get("etp"),
        pgr=context_data.get("pgr"),
        tr=context_data.get("tr"),
    )
    
    # Load active skills
    skills = await carregar_skills_ativas(projeto_id, db)
    context.skills = skills
    
    logger.info(f"[Context] Built for {tipo_artefato}: {len(context_data)} artefacts loaded")
    
    return context


async def carregar_skills_ativas(projeto_id: int, db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Load active skills for project (system + user-created).
    
    Returns list of skill dicts with nome, instrucoes, textos_base, etc.
    """
    
    # System skills (escopo='system')
    stmt = select(Skill).where(Skill.escopo == "system").order_by(Skill.nome)
    result = await db.execute(stmt)
    system_skills = result.scalars().all()
    
    # User skills for this project
    stmt = select(Skill).where(
        (Skill.usuario_id != None) & (Skill.ativa == True)
    ).order_by(Skill.nome)
    result = await db.execute(stmt)
    user_skills = result.scalars().all()
    
    # Convert to dicts
    skills = []
    for skill in system_skills + user_skills:
        skills.append({
            "id": skill.id,
            "nome": skill.nome,
            "descricao": skill.descricao,
            "instrucoes": skill.instrucoes,
            "escopo": skill.escopo,
            "tools": skill.tools,
            "textos_base": skill.textos_base or [],
        })
    
    logger.info(f"[Skills] Loaded {len(skills)} skills for projeto {projeto_id}")
    
    return skills


def stream_agent_response(agent_output: str) -> str:
    """
    Format agent output as SSE event.
    Used by factory when streaming responses.
    """
    return f"data: {agent_output}\n\n"
