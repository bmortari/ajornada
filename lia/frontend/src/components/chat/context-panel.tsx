"use client";

import { useState } from "react";
import type { Projeto, PacItem, ArtefatoRemoteConfig } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Package,
  FileText,
  Info,
} from "lucide-react";

interface ContextPanelProps {
  projeto: Projeto | null;
  pacItems: PacItem[];
  artifactConfig: ArtefatoRemoteConfig | null;
  artifactType: string;
  uploadedFilesCount: number;
  dfdData?: Record<string, any> | null;
}

export function ContextPanel({
  projeto,
  pacItems,
  artifactConfig,
  artifactType,
  uploadedFilesCount,
  dfdData,
}: ContextPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Contexto</h3>
        </div>

        {/* Informações Adicionais — sempre no topo */}
        <ContextCard
          title="Informações Adicionais"
          icon={<Info className="h-3.5 w-3.5" />}
          color="#2D3748"
          defaultOpen
        >
          <AdditionalInfo />
        </ContextCard>

        {/* ETP Crucial Guidelines */}
        {artifactType === "etp" && (
          <ContextCard
            title="Diretrizes Iniciais"
            icon={<Info className="h-3.5 w-3.5" />}
            color="#DD6B20"
            defaultOpen
          >
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Para um <strong>ETP preciso</strong> e apto a buscar ARPs, a IA precisa entender 4 pontos fundamentais durante a nossa conversa:
              </p>
              <div className="space-y-2 mt-2">
                <div className="rounded-md border p-2 space-y-1 text-[11px] bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50">
                  <span className="font-semibold text-orange-800 dark:text-orange-400 block border-b border-orange-200/50 dark:border-orange-900/50 pb-1 mb-1">
                    1. A Necessidade Real
                  </span>
                  <p className="text-muted-foreground">Qual o problema exato que precisamos resolver?</p>
                </div>
                <div className="rounded-md border p-2 space-y-1 text-[11px] bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50">
                  <span className="font-semibold text-orange-800 dark:text-orange-400 block border-b border-orange-200/50 dark:border-orange-900/50 pb-1 mb-1">
                    2. Quantitativo e Escala
                  </span>
                  <p className="text-muted-foreground">Qual o volume estimado dessa contratação?</p>
                </div>
                <div className="rounded-md border p-2 space-y-1 text-[11px] bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50">
                  <span className="font-semibold text-orange-800 dark:text-orange-400 block border-b border-orange-200/50 dark:border-orange-900/50 pb-1 mb-1">
                    3. Contexto e Impacto
                  </span>
                  <p className="text-muted-foreground">Onde será aplicado e quem será beneficiado?</p>
                </div>
                <div className="rounded-md border p-2 space-y-1 text-[11px] bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50">
                  <span className="font-semibold text-orange-800 dark:text-orange-400 block border-b border-orange-200/50 dark:border-orange-900/50 pb-1 mb-1">
                    4. Requisitos Específicos
                  </span>
                  <p className="text-muted-foreground">Existem exigências técnicas obrigatórias?</p>
                </div>
              </div>
            </div>
          </ContextCard>
        )}

        {/* Project Info */}
        {projeto && (
          <>
          <ContextCard
            title="Projeto"
            icon={<FolderOpen className="h-3.5 w-3.5" />}
            color="#3182CE"
            defaultOpen
          >
            <div className="space-y-1.5">
              <ContextItem label="Nome" value={projeto.nome} />
              {projeto.objeto && (
                <ContextItem label="Objeto" value={projeto.objeto} />
              )}
              <ContextItem label="Status" value={projeto.status} />
              {projeto.unidade_requisitante && (
                <ContextItem
                  label="Unidade"
                  value={projeto.unidade_requisitante}
                />
              )}
              {projeto.modalidade && (
                <ContextItem label="Modalidade" value={projeto.modalidade} />
              )}
              {projeto.valor_estimado && (
                <ContextItem
                  label="Valor Estimado"
                  value={`R$ ${projeto.valor_estimado.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}`}
                />
              )}
            </div>
          </ContextCard>
          </>
        )}

        {/* DFD Approved Context (ETP only) */}
        {dfdData && artifactType === "etp" && (
          <ContextCard
            title="DFD Aprovado"
            icon={<FileText className="h-3.5 w-3.5" />}
            color="#805AD5"
            defaultOpen
          >
            <div className="space-y-2">
              <div className="rounded-md border p-2 space-y-1 text-[11px] bg-muted/20">
                <span className="font-semibold text-muted-foreground block border-b pb-1 mb-1">
                  Objeto
                </span>
                <p className="line-clamp-3 text-foreground/80">
                  {dfdData.descricao_objeto || "Objeto não especificado."}
                </p>
              </div>

              {dfdData.justificativa && (
                <div className="rounded-md border p-2 space-y-1 text-[11px] bg-muted/20">
                  <span className="font-semibold text-muted-foreground block border-b pb-1 mb-1">
                    Justificativa
                  </span>
                  <p className="line-clamp-3 text-foreground/80">
                    {dfdData.justificativa}
                  </p>
                </div>
              )}

              {dfdData.alinhamento_estrategico && (
                <div className="rounded-md border p-2 space-y-1 text-[11px] bg-muted/20">
                  <span className="font-semibold text-muted-foreground block border-b pb-1 mb-1">
                    Alinhamento Estratégico
                  </span>
                  <p className="line-clamp-3 text-foreground/80">
                    {dfdData.alinhamento_estrategico}
                  </p>
                </div>
              )}
            </div>
          </ContextCard>
        )}

        {/* PAC Items */}
        {pacItems.length > 0 && (
          <ContextCard
            title="Itens do PAC"
            icon={<Package className="h-3.5 w-3.5" />}
            color="#319795"
            badge={String(pacItems.length)}
          >
            <div className="space-y-2">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-muted/50 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Total Itens
                  </p>
                  <p className="text-sm font-semibold">{pacItems.length}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Valor Estimado
                  </p>
                  <p className="text-sm font-semibold text-emerald-600">
                    R${" "}
                    {pacItems
                      .reduce((sum, item) => {
                        const unit =
                          (item as any).valor_por_item ||
                          (item.valor_previsto
                            ? parseFloat(String(item.valor_previsto)) / (item.quantidade || 1)
                            : 0);
                        const qty = item.quantidade || 1;
                        return sum + unit * qty;
                      }, 0)
                      .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Item list */}
              {pacItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border p-2 space-y-1 text-[11px]"
                >
                  <p className="font-medium line-clamp-2">
                    {item.descricao || "Sem descrição"}
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>
                      Qtd: {item.quantidade || 1}
                    </span>
                    {(item as any).valor_por_item && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600">
                          R$ {(item as any).valor_por_item.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </>
                    )}
                  </div>
                  {item.catmat_catser && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {item.catmat_catser}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ContextCard>
        )}

        {/* Knowledge base count */}
        {uploadedFilesCount > 0 && (
          <ContextCard
            title="Base de Conhecimento"
            icon={<FileText className="h-3.5 w-3.5" />}
            color="#D69E2E"
          >
            <p className="text-xs text-muted-foreground">
              {uploadedFilesCount} arquivo(s) anexado(s) para contexto
            </p>
          </ContextCard>
        )}
      </div>
    </ScrollArea>
  );
}

// Reusable collapsible context card
function ContextCard({
  title,
  icon,
  color,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="shadow-sm">
      <CardHeader
        className="px-3 py-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <div
              className="p-1 rounded"
              style={{
                backgroundColor: color ? `${color}15` : undefined,
                color: color || undefined,
              }}
            >
              {icon}
            </div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {badge && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {badge}
              </Badge>
            )}
          </div>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {open && <CardContent className="px-3 pb-3 pt-0">{children}</CardContent>}
    </Card>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-sm text-muted-foreground font-medium min-w-16 shrink-0">
        {label}:
      </span>
      <span className="text-sm line-clamp-2">{value}</span>
    </div>
  );
}

function AdditionalInfo() {
  const [dataPretendida, setDataPretendida] = useState("");
  const [gestor, setGestor] = useState("");
  const [fiscal, setFiscal] = useState("");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Data Pretendida para Contratação</label>
        <input
          type="date"
          value={dataPretendida}
          onChange={(e) => setDataPretendida(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Gestor do Contrato</label>
          <Input
            value={gestor}
            onChange={(e) => setGestor(e.target.value)}
            placeholder="Nome do gestor"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Fiscal do Contrato</label>
          <Input
            value={fiscal}
            onChange={(e) => setFiscal(e.target.value)}
            placeholder="Nome do fiscal"
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
