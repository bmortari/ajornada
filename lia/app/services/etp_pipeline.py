"""
Sistema LIA - ETP Pipeline State & Engine
============================================
Máquina de estados para o pipeline de 6 passos do ETP.

Passos:
  1. Revisão DFD + Unidades de Medida
  2. Dedução CATMAT/CATSERV (busca vetorial)
  3. Busca ARPs (ComprasGov API)
  4. Pesquisa de Mercado (IN 65/2021) — só se não fizer carona
  5. Deep Research (entrevista IA)
  6. Geração final do ETP

Autor: Equipe TRE-GO
Data: Fevereiro 2026
"""
from __future__ import annotations

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ── Enums ──────────────────────────────────────────────────────

class CaminhoETP(str, Enum):
    """Caminho que o ETP seguirá após o passo 3."""
    INDEFINIDO = "indefinido"
    CARONA = "carona"              # Adesão a ARP existente
    LICITACAO_NOVA = "licitacao_nova"  # Processo licitatório novo


class StatusPasso(str, Enum):
    """Status de um passo individual."""
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    PULADO = "pulado"


# ── Sub-modelos ────────────────────────────────────────────────

class ItemDFD(BaseModel):
    """Item extraído do DFD para o pipeline."""
    descricao: str
    unidade_medida: Optional[str] = None
    quantidade: Optional[float] = None
    justificativa: Optional[str] = None


class CatalogMatch(BaseModel):
    """Resultado de busca vetorial no catálogo."""
    tipo: str                    # "material" ou "servico"
    codigo: int                  # Código CATMAT/CATSERV
    descricao: str
    score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)
    selecionado: bool = False    # Usuário confirmou?


class ARPEncontrada(BaseModel):
    """ARP encontrada na API do ComprasGov."""
    numero_ata: Optional[str] = None
    orgao_gerenciador: Optional[str] = None
    fornecedor: Optional[str] = None
    valor_unitario: Optional[float] = None
    valor_total: Optional[float] = None
    data_vigencia_final: Optional[str] = None
    saldo_disponivel: Optional[float] = None
    url_pncp: Optional[str] = None
    dados_completos: Dict[str, Any] = Field(default_factory=dict)


class PesquisaMercado(BaseModel):
    """Dados da pesquisa de mercado IN 65/2021."""
    fontes_consultadas: List[str] = Field(default_factory=list)
    valor_mediana: Optional[float] = None
    valor_menor: Optional[float] = None
    valor_medio: Optional[float] = None
    conformidade_in65: bool = False
    detalhes: List[Dict[str, Any]] = Field(default_factory=list)


# ── Estado Principal do Pipeline ───────────────────────────────

class ETPPipelineState(BaseModel):
    """
    Estado acumulado do pipeline ETP.
    Persistido como JSON no campo `etp_pipeline_state` do modelo ETP.
    """
    passo_atual: int = 0          # 0 = não iniciado, 1-6 = em andamento
    status_passos: Dict[str, str] = Field(default_factory=lambda: {
        "1": StatusPasso.PENDENTE,
        "2": StatusPasso.PENDENTE,
        "3": StatusPasso.PENDENTE,
        "4": StatusPasso.PENDENTE,
        "5": StatusPasso.PENDENTE,
        "6": StatusPasso.PENDENTE,
    })
    
    # Passo 1 — DFD
    dfd_id: Optional[int] = None
    descricao_objeto: Optional[str] = None
    justificativa: Optional[str] = None
    itens: List[ItemDFD] = Field(default_factory=list)
    
    # Passo 2 — CATMAT/CATSERV
    codigos_catalogo: List[CatalogMatch] = Field(default_factory=list)
    codigos_selecionados: List[int] = Field(default_factory=list)
    
    # Passo 3 — ARPs
    arps_encontradas: List[ARPEncontrada] = Field(default_factory=list)
    arp_selecionada: Optional[ARPEncontrada] = None
    caminho: CaminhoETP = CaminhoETP.INDEFINIDO
    
    # Passo 4 — Pesquisa de Mercado (só se caminho == LICITACAO_NOVA)
    pesquisa_mercado: Optional[PesquisaMercado] = None
    
    # Passo 5 — Deep Research
    perguntas_respondidas: Dict[str, Any] = Field(default_factory=dict)
    
    # Passo 6 — Geração
    etp_gerado: bool = False
    data_geracao: Optional[str] = None
    
    # Timestamps
    criado_em: str = Field(default_factory=lambda: datetime.now().isoformat())
    atualizado_em: str = Field(default_factory=lambda: datetime.now().isoformat())

    def atualizar(self):
        """Marca timestamp de atualização."""
        self.atualizado_em = datetime.now().isoformat()
    
    def avancar_passo(self, passo: int):
        """Marca passo como concluído e avança."""
        self.status_passos[str(passo)] = StatusPasso.CONCLUIDO
        if passo < 6:
            proximo = passo + 1
            # Se caminho é carona e passo atual é 3, pular passo 4
            if self.caminho == CaminhoETP.CARONA and proximo == 4:
                self.status_passos["4"] = StatusPasso.PULADO
                proximo = 5
            self.passo_atual = proximo
            self.status_passos[str(proximo)] = StatusPasso.EM_ANDAMENTO
        self.atualizar()
    
    def iniciar_passo(self, passo: int):
        """Marca passo como em andamento."""
        self.passo_atual = passo
        self.status_passos[str(passo)] = StatusPasso.EM_ANDAMENTO
        self.atualizar()


# ── Pipeline Engine ────────────────────────────────────────────

class ETPPipelineEngine:
    """
    Orquestra os passos do pipeline ETP.
    Cada método `executar_passoN` recebe o state, executa lógica,
    e retorna o state atualizado.
    """
    
    @staticmethod
    async def executar_passo1(
        state: ETPPipelineState,
        dfd_data: Dict[str, Any],
        itens: List[Dict[str, Any]],
    ) -> ETPPipelineState:
        """
        Passo 1: Revisar DFD e definir itens com unidades.
        """
        state.iniciar_passo(1)
        
        state.dfd_id = dfd_data.get("id")
        state.descricao_objeto = dfd_data.get("descricao_objeto", "")
        state.justificativa = dfd_data.get("justificativa", "")
        
        state.itens = [ItemDFD(**item) for item in itens]
        
        state.avancar_passo(1)
        logger.info(f"[Pipeline] Passo 1 concluído: {len(state.itens)} itens")
        return state
    
    @staticmethod
    async def executar_passo2(
        state: ETPPipelineState,
        resultados_busca: List[Dict[str, Any]],
        codigos_selecionados: List[int],
    ) -> ETPPipelineState:
        """
        Passo 2: Deduzir CATMAT/CATSERV via busca vetorial.
        Recebe resultados da busca e os códigos que o usuário confirmou.
        """
        state.iniciar_passo(2)
        
        state.codigos_catalogo = [CatalogMatch(**r) for r in resultados_busca]
        state.codigos_selecionados = codigos_selecionados
        
        # Marcar selecionados
        for match in state.codigos_catalogo:
            match.selecionado = match.codigo in codigos_selecionados
        
        state.avancar_passo(2)
        logger.info(f"[Pipeline] Passo 2 concluído: {len(codigos_selecionados)} códigos selecionados")
        return state
    
    @staticmethod
    async def executar_passo3(
        state: ETPPipelineState,
        arps: List[Dict[str, Any]],
        arp_selecionada: Optional[Dict[str, Any]] = None,
        caminho: str = "indefinido",
    ) -> ETPPipelineState:
        """
        Passo 3: Buscar e selecionar ARP.
        Se arp_selecionada → caminho = carona (pula passo 4)
        Se não → caminho = licitacao_nova (vai pro passo 4)
        """
        state.iniciar_passo(3)
        
        state.arps_encontradas = [ARPEncontrada(**arp) for arp in arps]
        
        if arp_selecionada:
            state.arp_selecionada = ARPEncontrada(**arp_selecionada)
            state.caminho = CaminhoETP.CARONA
        else:
            state.caminho = CaminhoETP(caminho) if caminho != "indefinido" else CaminhoETP.LICITACAO_NOVA
        
        state.avancar_passo(3)
        logger.info(f"[Pipeline] Passo 3 concluído: caminho={state.caminho}")
        return state
    
    @staticmethod
    async def executar_passo4(
        state: ETPPipelineState,
        pesquisa: Dict[str, Any],
    ) -> ETPPipelineState:
        """
        Passo 4: Pesquisa de Mercado IN 65/2021.
        Só é executado se caminho == LICITACAO_NOVA.
        """
        if state.caminho == CaminhoETP.CARONA:
            logger.info("[Pipeline] Passo 4 pulado (carona em ARP)")
            state.status_passos["4"] = StatusPasso.PULADO
            state.passo_atual = 5
            state.atualizar()
            return state
        
        state.iniciar_passo(4)
        state.pesquisa_mercado = PesquisaMercado(**pesquisa)
        state.avancar_passo(4)
        logger.info("[Pipeline] Passo 4 concluído: pesquisa de mercado realizada")
        return state
    
    @staticmethod
    async def executar_passo5(
        state: ETPPipelineState,
        respostas: Dict[str, Any],
    ) -> ETPPipelineState:
        """
        Passo 5: Deep Research — respostas da entrevista IA.
        """
        state.iniciar_passo(5)
        state.perguntas_respondidas = respostas
        state.avancar_passo(5)
        logger.info("[Pipeline] Passo 5 concluído: deep research")
        return state
    
    @staticmethod
    async def executar_passo6(
        state: ETPPipelineState,
    ) -> ETPPipelineState:
        """
        Passo 6: Marcar ETP como gerado.
        A geração em si é feita pelo ETPAgent com o state completo como contexto.
        """
        state.iniciar_passo(6)
        state.etp_gerado = True
        state.data_geracao = datetime.now().isoformat()
        state.avancar_passo(6)
        logger.info("[Pipeline] Passo 6 concluído: ETP gerado!")
        return state
