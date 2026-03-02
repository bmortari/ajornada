"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Pencil,
  Circle,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ArtefatoVersao {
  id: number;
  versao: number;
  status: "rascunho" | "aprovado" | "publicado";
  gerado_por_ia: boolean;
  data_criacao: string;
  data_atualizacao: string;
  data_aprovacao: string | null;
}

export interface Artefato {
  tipo: string;
  sigla: string;
  titulo: string;
  total_versoes: number;
  versao_atual: ArtefatoVersao | null;
  versoes: ArtefatoVersao[];
}

interface HorizontalArtifactCardProps {
  artefato: Artefato;
  projetoId: string;
}

const statusConfig = {
  rascunho: {
    icon: Pencil,
    label: "Rascunho",
    variant: "secondary" as const,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
  },
  aprovado: {
    icon: CheckCircle2,
    label: "Aprovado",
    variant: "default" as const,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
  publicado: {
    icon: CheckCircle2,
    label: "Publicado",
    variant: "default" as const,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
};

export function HorizontalArtifactCard({
  artefato,
  projetoId,
}: HorizontalArtifactCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const versaoAtual = artefato.versao_atual;

  const isCotacao = artefato.tipo === "cotacao" || artefato.tipo === "pesquisa_precos";
  const isPortaria = artefato.tipo === "portaria_designacao" || artefato.tipo === "portaria";
  const isSpecializedRoute = isCotacao || isPortaria;

  const getMainActionLink = () => {
    if (isCotacao) return `/projetos/${projetoId}/cotacao`;
    if (isPortaria) return `/projetos/${projetoId}/portaria`;
    return `/projetos/${projetoId}/chat/${artefato.tipo}`;
  };

  const MainActionIcon = isSpecializedRoute ? FileText : MessageSquare;

  if (!versaoAtual) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Circle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {artefato.sigla}
                  </span>
                  <h3 className="font-semibold text-sm">{artefato.titulo}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nenhuma versão criada
                </p>
              </div>
            </div>
            <Link href={getMainActionLink()}>
              <Button variant="outline" size="sm">
                <MainActionIcon className="h-3.5 w-3.5 mr-1.5" />
                {isSpecializedRoute ? "Acessar" : "Criar com IA"}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[versaoAtual.status];
  const StatusIcon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Left: Icon + Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}
              >
                <StatusIcon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {artefato.sigla}
                  </span>
                  <h3 className="font-semibold text-sm truncate">
                    {artefato.titulo}
                  </h3>
                  {versaoAtual.gerado_por_ia && (
                    <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant={config.variant} className="text-xs h-5">
                    {config.label}
                  </Badge>
                  <span>v{versaoAtual.versao}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(versaoAtual.data_atualizacao), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                  {artefato.total_versoes > 1 && (
                    <>
                      <span>•</span>
                      <span>{artefato.total_versoes} versões</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 ml-4">
              <Link href={getMainActionLink()}>
                <Button variant="outline" size="sm">
                  <MainActionIcon className="h-3.5 w-3.5 mr-1.5" />
                  {isSpecializedRoute ? "Acessar" : "Chat"}
                </Button>
              </Link>
              {!isSpecializedRoute && (
                <Link
                  href={`/projetos/${projetoId}/artefatos/${artefato.tipo}/editar`}
                >
                  <Button variant="outline" size="sm">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                </Link>
              )}
              {/* Download moved to individual versions (see below) */}
              {artefato.total_versoes > 1 && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* Versions Timeline */}
          {artefato.total_versoes > 1 && (
            <CollapsibleContent className="mt-4">
              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                  Histórico de Versões
                </h4>
                <div className="space-y-2">
                    {artefato.versoes.map((versao) => {
                    const vConfig = statusConfig[versao.status];
                    const VIcon = vConfig.icon;
                    const isCurrent = versao.id === versaoAtual.id;

                    return (
                      <div
                        key={versao.id}
                        className={`flex items-center justify-between p-2 rounded-md ${
                          isCurrent
                            ? "bg-muted border border-border"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <VIcon className={`h-3 w-3 ${vConfig.color}`} />
                          <span className="text-xs font-mono">
                            v{versao.versao}
                          </span>
                          <Badge
                            variant={vConfig.variant}
                            className="text-xs h-4"
                          >
                            {vConfig.label}
                          </Badge>
                          {versao.gerado_por_ia && (
                            <Sparkles className="h-3 w-3 text-purple-500" />
                          )}
                          {isCurrent && (
                            <Badge variant="outline" className="text-xs h-4">
                              Atual
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(versao.data_criacao), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          <Link
                            href={`/projetos/${projetoId}/artefatos/${artefato.tipo}/editar?versao=${versao.versao}`}
                          >
                            <Button variant="ghost" size="sm" className="h-6">
                              <FileText className="h-3 w-3" />
                            </Button>
                          </Link>
                          {(versao.status === "aprovado" || versao.status === "publicado") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `/api/export/${projetoId}/${artefato.tipo}/docx?versao=${versao.versao}`,
                                  "_blank"
                                )
                              }
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          )}
        </CardContent>
      </Card>
    </Collapsible>
  );
}
