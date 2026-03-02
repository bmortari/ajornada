"""
Schemas Pydantic para o módulo de ARP (Ata de Registro de Preços)
Endpoints da API de Dados Abertos - /modulo-arp/

Autor: Equipe TRE-GO
Data: Fevereiro 2026
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date


class ItemARP(BaseModel):
    """Item de uma Ata de Registro de Preços do ComprasGov"""
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)
    
    # Identificação da Ata
    numero_ata: Optional[str] = Field(None, alias="numeroAtaRegistroPreco")
    codigo_unidade_gerenciadora: Optional[str] = Field(None, alias="codigoUnidadeGerenciadora")
    nome_unidade_gerenciadora: Optional[str] = Field(None, alias="nomeUnidadeGerenciadora")
    numero_compra: Optional[str] = Field(None, alias="numeroCompra")
    ano_compra: Optional[str] = Field(None, alias="anoCompra")
    codigo_modalidade: Optional[str] = Field(None, alias="codigoModalidadeCompra")
    nome_modalidade: Optional[str] = Field(None, alias="nomeModalidadeCompra")
    
    # Datas
    data_assinatura: Optional[datetime] = Field(None, alias="dataAssinatura")
    data_vigencia_inicial: Optional[date] = Field(None, alias="dataVigenciaInicial")
    data_vigencia_final: Optional[date] = Field(None, alias="dataVigenciaFinal")
    
    # Item
    numero_item: Optional[str] = Field(None, alias="numeroItem")
    codigo_item: Optional[int] = Field(None, alias="codigoItem")
    descricao_item: Optional[str] = Field(None, alias="descricaoItem")
    tipo_item: Optional[str] = Field(None, alias="tipoItem")
    quantidade_homologada: Optional[float] = Field(None, alias="quantidadeHomologadaItem")
    
    # Fornecedor
    classificacao_fornecedor: Optional[str] = Field(None, alias="classificacaoFornecedor")
    ni_fornecedor: Optional[str] = Field(None, alias="niFornecedor")
    nome_fornecedor: Optional[str] = Field(None, alias="nomeRazaoSocialFornecedor")
    quantidade_vencedor: Optional[float] = Field(None, alias="quantidadeHomologadaVencedor")
    
    # Valores
    valor_unitario: Optional[float] = Field(None, alias="valorUnitario")
    valor_total: Optional[float] = Field(None, alias="valorTotal")
    maximo_adesao: Optional[float] = Field(None, alias="maximoAdesao")
    
    # Controle PNCP
    id_compra: Optional[str] = Field(None, alias="idCompra")
    numero_controle_pncp_compra: Optional[str] = Field(None, alias="numeroControlePncpCompra")
    numero_controle_pncp_ata: Optional[str] = Field(None, alias="numeroControlePncpAta")
    
    # PDM
    codigo_pdm: Optional[int] = Field(None, alias="codigoPdm")
    nome_pdm: Optional[str] = Field(None, alias="nomePdm")
    
    # Quantidades
    quantidade_empenhada: Optional[float] = Field(None, alias="quantidadeEmpenhada")
    percentual_maior_desconto: Optional[float] = Field(None, alias="percentualMaiorDesconto")
    situacao_sicaf: Optional[str] = Field(None, alias="situacaoSicaf")
    
    # Auditoria
    data_inclusao: Optional[datetime] = Field(None, alias="dataHoraInclusao")
    data_atualizacao: Optional[datetime] = Field(None, alias="dataHoraAtualizacao")
    data_exclusao: Optional[datetime] = Field(None, alias="dataHoraExclusao")
    item_excluido: Optional[bool] = Field(None, alias="itemExcluido")
    
    @property
    def vigente(self) -> bool:
        """Verifica se a ARP está vigente na data atual."""
        if not self.data_vigencia_final:
            return False
        hoje = date.today()
        inicio = self.data_vigencia_inicial or date.min
        return inicio <= hoje <= self.data_vigencia_final
    
    @property
    def saldo_disponivel(self) -> Optional[float]:
        """Calcula saldo remanescente para adesão."""
        if self.maximo_adesao is not None and self.quantidade_empenhada is not None:
            return max(0, self.maximo_adesao - self.quantidade_empenhada)
        return self.maximo_adesao
    
    @property
    def url_pncp(self) -> Optional[str]:
        """Constrói URL do PNCP para a ata."""
        if self.numero_controle_pncp_ata:
            return f"https://pncp.gov.br/app/atas/{self.numero_controle_pncp_ata}"
        if self.numero_controle_pncp_compra:
            return f"https://pncp.gov.br/app/editais/{self.numero_controle_pncp_compra}"
        return None


class RespostaARP(BaseModel):
    """Resposta da API de consulta de ARPs"""
    resultado: List[ItemARP] = Field(default_factory=list)
    total_registros: int = Field(0, alias="totalRegistros")
    total_paginas: int = Field(0, alias="totalPaginas")
    paginas_restantes: int = Field(0, alias="paginasRestantes")
