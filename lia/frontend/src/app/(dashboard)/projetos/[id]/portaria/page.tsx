"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  ExternalLink,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface PortariaInfo {
  portaria_disponivel: boolean;
  motivo?: string;
  id?: number;
  versao?: number;
  status?: string;
  data_criacao?: string;
  data_atualizacao?: string;
  protocolo_sei?: {
    numero: string;
    assunto: string;
    link: string;
    data_publicacao: string;
  } | null;
  dfd_id_referencia?: number;
}

export default function PortariaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projetoId } = use(params);
  const router = useRouter();

  const [info, setInfo] = useState<PortariaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const loadInfo = useCallback(async () => {
    try {
      const data = await api.get<PortariaInfo>(
        `/api/portaria-designacao/${projetoId}/info`
      );
      setInfo(data);
    } catch {
      toast.error("Erro ao carregar informações da portaria");
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const publicarSei = async () => {
    setPublishing(true);
    try {
      const result = await api.post<{
        success: boolean;
        message: string;
        protocolo_sei: PortariaInfo["protocolo_sei"];
      }>(`/api/portaria-designacao/${projetoId}/publicar-sei`);

      toast.success(result.message);
      loadInfo();
    } catch {
      toast.error("Erro ao publicar no SEI");
    } finally {
      setPublishing(false);
    }
  };

  const downloadPdf = () => {
    window.open(`/api/portaria-designacao/${projetoId}/pdf`, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isPublicado = !!info?.protocolo_sei;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/projetos/${projetoId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Portaria de Designação
          </h1>
          <p className="text-sm text-muted-foreground">
            Publicação no SEI - Sistema Eletrônico de Informações
          </p>
        </div>
      </div>

      <Separator />

      {/* Not available */}
      {info && !info.portaria_disponivel && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <h3 className="font-medium">Portaria não disponível</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {info.motivo || "O DFD precisa ser aprovado antes de gerar a Portaria de Designação."}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/projetos/${projetoId}`)}
            >
              Voltar ao Projeto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Portaria available */}
      {info && info.portaria_disponivel && (
        <>
          {/* Status card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-base">
                    Portaria de Designação
                  </CardTitle>
                </div>
                <Badge
                  variant={isPublicado ? "default" : "secondary"}
                  className={isPublicado ? "bg-blue-600" : ""}
                >
                  {isPublicado ? "Publicado" : info.status || "Rascunho"}
                </Badge>
              </div>
              <CardDescription>
                Versão {info.versao} •{" "}
                {info.data_criacao
                  ? new Date(info.data_criacao).toLocaleDateString("pt-BR")
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>

                {!isPublicado && (
                  <Button onClick={publicarSei} disabled={publishing}>
                    {publishing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Publicar no SEI
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Published SEI info */}
          {isPublicado && info.protocolo_sei && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base text-green-800 dark:text-green-200">
                    Publicado com Sucesso
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Protocolo:</span>
                    <span className="font-mono">
                      {info.protocolo_sei.numero}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Assunto:</span>{" "}
                    {info.protocolo_sei.assunto}
                  </div>
                  <div>
                    <span className="font-medium">Data de Publicação:</span>{" "}
                    {new Date(info.protocolo_sei.data_publicacao).toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={info.protocolo_sei.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Abrir no SEI
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
