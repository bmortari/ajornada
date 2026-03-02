"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import type { Projeto } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, Lock, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  HorizontalArtifactCard,
  type Artefato,
} from "@/components/artifacts/horizontal-artifact-card";
import "./projeto-dashboard.css";

// --- Types ---
interface ArtefatosResponse {
  artefatos: Artefato[];
}

interface FluxoEtapa {
  tipo: string;
  sigla: string;
  nome: string;
  estado: "completed" | "active" | "locked";
  liberado: boolean;
  dependencias: string[];
  branch?: string | null;
}

interface FluxoResponse {
  etapas: FluxoEtapa[];
  active_branch: string | null;
  branch_info: {
    cor: string;
    cor_bg: string;
    cor_text: string;
    label: string;
  } | null;
}

const BRANCH_UI: Record<string, { cor: string; label: string }> = {
  adesao: { cor: "#10B981", label: "ADESÃO" },
  dispensa: { cor: "#F97316", label: "DISPENSA" },
  licitacao: { cor: "#8B5CF6", label: "LICITAÇÃO" },
  direta: { cor: "#EC4899", label: "CONTRATAÇÃO DIRETA" },
};

export default function ProjetoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [artefatos, setArtefatos] = useState<Artefato[]>([]);
  const [fluxo, setFluxo] = useState<FluxoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedStep, setHighlightedStep] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [projetoData, artefatosData, fluxoData] = await Promise.all([
          api.get<Projeto>(`/api/projetos/${id}`),
          api.get<ArtefatosResponse>(`/api/projetos/${id}/artefatos`),
          api.get<FluxoResponse>(`/api/projetos/${id}/fluxo`),
        ]);
        setProjeto(projetoData);
        setArtefatos(artefatosData.artefatos);
        setFluxo(fluxoData);
      } catch {
        toast.error("Erro ao carregar projeto");
        router.push("/projetos");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, router]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="dashboard-grid mt-8">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!projeto || !fluxo) return null;

  // Renderiza a Sidebar (Stepper)
  const renderSidebar = () => {
    let lastBranch: string | null = null;

    return (
      <aside className="flow-sidebar">
        <div className="flow-sidebar-title">Fluxo de Desenvolvimento</div>
        <div className="stepper">
          {fluxo.etapas.map((etapa, index) => {
            const isHighlight = highlightedStep === etapa.tipo;
            
            // Check if branch changed to render separator
            const branchChanged = etapa.branch && etapa.branch !== lastBranch;
            if (etapa.branch) lastBranch = etapa.branch;

            return (
              <div key={etapa.tipo}>
                {branchChanged && (
                  <div className="branch-sep">
                    <span 
                      className="branch-sep-dot" 
                      style={{ background: BRANCH_UI[etapa.branch!].cor }} 
                    />
                    <span 
                      className="branch-sep-label" 
                      style={{ color: BRANCH_UI[etapa.branch!].cor }}
                    >
                      {BRANCH_UI[etapa.branch!].label}
                    </span>
                  </div>
                )}

                <div
                  className={`step ${isHighlight ? "is-highlight" : ""}`}
                  data-state={etapa.estado}
                  onClick={() => scrollToCard(etapa.tipo)}
                >
                  <div className="step-dot">
                    {etapa.estado === "completed" ? (
                      <Check className="h-2 w-2" />
                    ) : etapa.estado === "active" ? (
                      <span>●</span>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="step-row">
                    <div className="flex items-center justify-between">
                      <span
                        className="step-sigla"
                        style={etapa.estado === "active" ? { color: "var(--primary)" } : etapa.estado === "completed" ? { color: "#10B981" } : {}}
                      >
                        {etapa.sigla}
                      </span>
                      {etapa.estado === "completed" && (
                        <Check className="h-3 w-3 text-emerald-500" />
                      )}
                      {etapa.estado === "locked" && (
                        <Lock className="h-3 w-3 text-muted-foreground/60" />
                      )}
                    </div>
                    <span className="step-name">{etapa.nome}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* FIM step */}
          {fluxo.active_branch && (
            <div className="step" data-state="locked" style={{ opacity: 0.4 }}>
              <div className="step-dot" style={{ borderColor: "#10B981", background: "#F0FDF4" }}>
                🏁
              </div>
              <div className="step-row">
                <span className="step-name italic text-muted-foreground text-[0.7rem] mt-1">
                  Conclusão
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  };

  const scrollToCard = (tipo: string) => {
    const card = document.getElementById(`card-${tipo}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedStep(tipo);
      // Reset highlight after 1.5s
      setTimeout(() => setHighlightedStep(null), 1500);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto min-h-[calc(100vh-100px)]">
      {/* Header com botão de voltar simulando Jinja */}
      <div className="flex items-start gap-4 mb-2">
        <Link 
          href="/projetos" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border mt-1"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="flex-1 min-w-0" style={{ marginLeft: '-0.25rem' }}>
          <h1 className="text-3xl font-bold tracking-tight truncate text-foreground mb-1">
            Controle de Artefatos
          </h1>
          <p className="text-muted-foreground text-sm line-clamp-1">
            padrap Projeto 3: {projeto.nome}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {fluxo.branch_info && (
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
              style={{ background: fluxo.branch_info.cor_bg, color: fluxo.branch_info.cor_text }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: fluxo.branch_info.cor }} />
              {fluxo.branch_info.label}
            </div>
          )}
        </div>
      </div>

      <div className="h-6" />

      {/* Grid: Cards (Left) + Stepper (Right) */}
      <div className="dashboard-grid">
        <div className="flex flex-col pb-20">
          {fluxo.etapas.map((etapa, i) => {
            // Find artifact data from the second API response
            const artefatoData = artefatos.find((a) => a.tipo === etapa.tipo);
            if (!artefatoData) return null; // Fallback se não existir configs

            // Inject the disabled/locked state so the HorizontalArtifactCard knows
            const isLocked = etapa.estado === "locked";
            
            return (
              <div key={etapa.tipo} className="relative">
                {/* Separator between cards */}
                {i > 0 && (
                  <div 
                    className="h-[2px] w-full my-6"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }}
                  />
                )}

                <div 
                  id={`card-${etapa.tipo}`}
                  className={`transition-all duration-300 rounded-xl ${highlightedStep === etapa.tipo ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                >
                  {/* Especial: Título de JEP Custom */}
                  {etapa.tipo === "jep" && (
                    <div className="mb-2 px-1 flex items-center gap-2">
                       <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-none transition-none">
                         OBRIGATÓRIO
                       </Badge>
                       <span className="text-xs text-muted-foreground font-medium">Contratações fora do PAC exigem justificativa</span>
                    </div>
                  )}

                  <div className={isLocked ? "opacity-60 pointer-events-none grayscale-[0.2]" : ""}>
                    <HorizontalArtifactCard
                      artefato={artefatoData}
                      projetoId={id}
                    />
                  </div>

                  {isLocked && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-xl cursor-not-allowed">
                       <Badge variant="secondary" className="shadow-sm">
                         <Lock className="h-3 w-3 mr-1" />
                         Requer: {etapa.dependencias.join(", ")}
                       </Badge>
                    </div>
                  )}

                  {/* Especial: Portaria de designação embaixo do DFD (se DFD aprovado) */}
                  {etapa.tipo === "dfd" && artefatoData.versao_atual?.status === "publicado" && (
                    <a 
                      href={`/api/portaria-designacao/${id}/print`}
                      target="_blank"
                      className="pd-action"
                    >
                      <FileText className="h-4 w-4" />
                      Ver Portaria de Designação vinculada
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Painel lateral direito */}
        {renderSidebar()}
      </div>
    </div>
  );
}
