"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  CheckCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface ProtocoloSEI {
  numero: string;
  assunto: string;
  tema: string;
  link: string;
  data_criacao: string;
}

interface ProjetoSEI {
  id: number;
  titulo?: string;
  nome?: string;
  protocolo_sei?: ProtocoloSEI | null;
}

export default function SEICriarPage() {
  const params = useParams();
  const router = useRouter();
  const projetoId = params.id as string;

  const [projeto, setProjeto] = useState<ProjetoSEI | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [protocolo, setProtocolo] = useState<ProtocoloSEI | null>(null);

  const [form, setForm] = useState({
    assunto: "",
    tema: "Licitação e Contratos",
  });

  useEffect(() => {
    fetchProjeto();
  }, [projetoId]);

  async function fetchProjeto() {
    try {
      const data = await api.get<ProjetoSEI>(`/api/projetos/${projetoId}`);
      setProjeto(data);
      setForm((f) => ({
        ...f,
        assunto: `Contratação referente ao projeto: ${data.titulo || data.nome || ""}`,
      }));
      if (data.protocolo_sei) {
        setProtocolo(data.protocolo_sei);
        setCreated(true);
      }
    } catch {
      toast.error("Projeto não encontrado");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await api.post<{
        message: string;
        protocolo_sei: ProtocoloSEI;
      }>(`/api/projetos/${projetoId}/sei`, form);
      setProtocolo(result.protocolo_sei);
      setCreated(true);
      toast.success("Processo SEI criado com sucesso!");
    } catch {
      toast.error("Erro ao criar processo SEI");
    } finally {
      setCreating(false);
    }
  }

  function copyProtocolo() {
    if (protocolo) {
      navigator.clipboard.writeText(protocolo.numero);
      toast.success("Número copiado!");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayTitle = projeto?.titulo || projeto?.nome || "Projeto";

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Back link */}
      <Link
        href="/projetos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        style={{ textDecoration: "none" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Projetos
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Criar Processo SEI
          </CardTitle>
          <CardDescription>
            Vincular Projeto: <strong>{displayTitle}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Already has protocol */}
          {created && protocolo ? (
            <div className="space-y-6">
              <div
                className="flex items-center gap-3 p-4 rounded-lg"
                style={{
                  background: "hsl(142 76% 36% / 0.08)",
                  border: "1px solid hsl(142 76% 36% / 0.2)",
                }}
              >
                <CheckCircle
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: "hsl(142 76% 36%)" }}
                />
                <p className="text-sm" style={{ margin: 0 }}>
                  Processo SEI criado com sucesso!
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Número do Protocolo
                </Label>
                <div
                  className="mt-2 flex items-center justify-between p-4 rounded-lg"
                  style={{
                    background: "var(--muted)",
                    border: "2px solid var(--border)",
                    fontFamily: "monospace",
                    fontSize: "1.15rem",
                    fontWeight: 600,
                  }}
                >
                  <span>{protocolo.numero}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={copyProtocolo}
                      title="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a
                        href={protocolo.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir no SEI"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              {protocolo.assunto && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Assunto
                  </Label>
                  <p className="text-sm mt-1">{protocolo.assunto}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button asChild className="flex-1">
                  <Link href="/projetos">Voltar para Projetos</Link>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={protocolo.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir no SEI
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            /* Creation form */
            <>
              <div
                className="flex gap-3 items-start p-3 rounded-lg mb-6 text-sm"
                style={{
                  background: "var(--muted)",
                  borderLeft: "3px solid var(--primary)",
                  color: "var(--muted-foreground)",
                }}
              >
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>ℹ️</span>
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  Este formulário simula a integração com o Sistema Eletrônico de
                  Informações (SEI). Os dados inseridos retornarão um número de
                  protocolo fictício para fins de demonstração.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto do Processo *</Label>
                  <Input
                    id="assunto"
                    value={form.assunto}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, assunto: e.target.value }))
                    }
                    required
                    placeholder="Ex: Contratação de serviço de limpeza"
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    O assunto principal que identificará o processo no SEI.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tema">Tema / Classificação</Label>
                    <Input
                      id="tema"
                      value={form.tema}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tema: e.target.value }))
                      }
                      placeholder="Licitação e Contratos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Autuação</Label>
                    <Input
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/projetos">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Número SEI
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
