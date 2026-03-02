"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

export interface ItemDFD {
  descricao: string;
  unidade_medida?: string;
  quantidade?: number;
  justificativa?: string;
}

export interface CatalogMatch {
  tipo: string;
  codigo: number;
  descricao: string;
  score: number;
  metadata: Record<string, unknown>;
  selecionado: boolean;
}

export interface ARPEncontrada {
  numero_ata?: string;
  orgao_gerenciador?: string;
  fornecedor?: string;
  valor_unitario?: number;
  valor_total?: number;
  data_vigencia_final?: string;
  saldo_disponivel?: number;
  url_pncp?: string;
  dados_completos: Record<string, unknown>;
}

export interface ETPPipelineState {
  passo_atual: number;
  status_passos: Record<string, string>;
  dfd_id?: number;
  descricao_objeto?: string;
  justificativa?: string;
  itens: ItemDFD[];
  codigos_catalogo: CatalogMatch[];
  codigos_selecionados: number[];
  arps_encontradas: ARPEncontrada[];
  arp_selecionada?: ARPEncontrada;
  caminho: string;
  pesquisa_mercado?: Record<string, unknown>;
  perguntas_respondidas: Record<string, unknown>;
  etp_gerado: boolean;
  data_geracao?: string;
}

interface PipelineResponse {
  sucesso: boolean;
  passo_atual: number;
  estado: ETPPipelineState;
  mensagem: string;
}

interface SearchResult {
  id: string;
  tipo: string;
  codigo: number;
  descricao: string;
  score: number;
  [key: string]: unknown;
}

// ── Hook ──────────────────────────────────────────────────────

export function useEtpPipeline(projetoId: string) {
  const [state, setState] = useState<ETPPipelineState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE = `/api/etp-pipeline/${projetoId}`;

  // Carregar estado
  const carregarEstado = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<PipelineResponse>(`${BASE}/estado`);
      setState(res.estado);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar pipeline";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  useEffect(() => {
    carregarEstado();
  }, [carregarEstado]);

  // Iniciar pipeline
  const iniciar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<PipelineResponse>(`${BASE}/iniciar`);
      setState(res.estado);
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao iniciar";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Passo 1: Salvar itens
  const salvarPasso1 = useCallback(async (itens: ItemDFD[]) => {
    setLoading(true);
    try {
      const res = await api.post<PipelineResponse>(`${BASE}/passo1/salvar`, { itens });
      setState(res.estado);
      return res;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro no passo 1");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Passo 2: Buscar catálogo
  const buscarCatalogo = useCallback(async (query: string, topK = 10, tipo?: string) => {
    try {
      const params = new URLSearchParams({ query, top_k: String(topK) });
      if (tipo) params.set("tipo", tipo);
      const res = await api.get<{ resultados: SearchResult[] }>(
        `${BASE}/passo2/buscar?${params}`
      );
      return res.resultados;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro na busca");
      return [];
    }
  }, [BASE]);

  // Passo 2: Confirmar códigos
  const salvarPasso2 = useCallback(async (
    resultados: SearchResult[],
    selecionados: number[]
  ) => {
    setLoading(true);
    try {
      const res = await api.post<PipelineResponse>(`${BASE}/passo2/salvar`, {
        resultados_busca: resultados,
        codigos_selecionados: selecionados,
      });
      setState(res.estado);
      return res;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro no passo 2");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Passo 3: Buscar ARPs
  const buscarARPs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ arps_encontradas: Record<string, unknown>[] }>(
        `${BASE}/passo3/buscar-arps`
      );
      return res.arps_encontradas;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao buscar ARPs");
      return [];
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Passo 3: Selecionar ARP
  const salvarPasso3 = useCallback(async (
    arpSelecionada?: Record<string, unknown>,
    caminho = "licitacao_nova"
  ) => {
    setLoading(true);
    try {
      const res = await api.post<PipelineResponse>(`${BASE}/passo3/salvar`, {
        arp_selecionada: arpSelecionada || null,
        caminho,
      });
      setState(res.estado);
      return res;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro no passo 3");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Passo 4: Pesquisa de mercado
  const salvarPasso4 = useCallback(async (pesquisa: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await api.post<PipelineResponse>(`${BASE}/passo4/salvar`, pesquisa);
      setState(res.estado);
      return res;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro no passo 4");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Passo 5: Deep research
  const salvarPasso5 = useCallback(async (respostas: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await api.post<PipelineResponse>(`${BASE}/passo5/salvar`, { respostas });
      setState(res.estado);
      return res;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro no passo 5");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Passo 6: Gerar ETP
  const gerarETP = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post<PipelineResponse>(`${BASE}/passo6/gerar`);
      setState(res.estado);
      return res;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar ETP");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Resetar
  const resetar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post<PipelineResponse>(`${BASE}/resetar`);
      setState(res.estado);
      return res;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao resetar");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  return {
    state,
    loading,
    error,
    passoAtual: state?.passo_atual ?? 0,
    caminho: state?.caminho ?? "indefinido",
    // Actions
    carregarEstado,
    iniciar,
    salvarPasso1,
    buscarCatalogo,
    salvarPasso2,
    buscarARPs,
    salvarPasso3,
    salvarPasso4,
    salvarPasso5,
    gerarETP,
    resetar,
  };
}
