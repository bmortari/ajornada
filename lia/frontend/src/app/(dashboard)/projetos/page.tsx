"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Projeto } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  FolderOpen,
  Loader2,
  LayoutGrid,
  Pencil,
  Archive,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import "./projetos.css";

// ===== Extended project type with API flags =====
interface ProjetoComFlags extends Projeto {
  titulo?: string;
  arquivado?: boolean;
  tem_dfd?: boolean;
  tem_etp?: boolean;
  tem_pp?: boolean;
  tem_pgr?: boolean;
  tem_tr?: boolean;
  tem_edital?: boolean;
  data_criacao?: string;
  protocolo_sei?: { numero: string; link: string } | null;
}

// ===== Stage flow config (Jinja colors) =====
const ETAPAS_CONFIG = [
  { key: "tem_edital", label: "Edital", color: "#805AD5" },
  { key: "tem_tr", label: "TR", color: "#D69E2E" },
  { key: "tem_etp", label: "ETP", color: "#38A169" },
  { key: "tem_pp", label: "Pesq. Preços", color: "#319795" },
  { key: "tem_pgr", label: "PGR", color: "#E53E3E" },
  { key: "tem_dfd", label: "DFD", color: "#3182CE" },
] as const;

function getEtapaAtual(p: ProjetoComFlags) {
  for (const etapa of ETAPAS_CONFIG) {
    if ((p as unknown as Record<string, unknown>)[etapa.key]) {
      return etapa;
    }
  }
  return { key: "start", label: "Planejamento", color: "#718096" };
}

function countArtefatos(p: ProjetoComFlags): number {
  let count = 0;
  for (const etapa of ETAPAS_CONFIG) {
    if ((p as unknown as Record<string, unknown>)[etapa.key]) count++;
  }
  return count;
}

// ===== Status badge =====
const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  em_andamento: { label: "Em Andamento", variant: "default" },
  concluido: { label: "Concluído", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<ProjetoComFlags[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProjeto, setNewProjeto] = useState({
    nome: "",
    objeto: "",
    unidade_requisitante: "",
  });
  const router = useRouter();

  useEffect(() => {
    fetchProjetos();
  }, []);

  async function fetchProjetos() {
    try {
      const data = await api.get<ProjetoComFlags[]>("/api/projetos");
      setProjetos(data);
    } catch {
      toast.error("Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjeto.nome.trim()) return;
    setCreating(true);
    try {
      const created = await api.post<ProjetoComFlags>("/api/projetos", newProjeto);
      toast.success("Projeto criado com sucesso!");
      setDialogOpen(false);
      setNewProjeto({ nome: "", objeto: "", unidade_requisitante: "" });
      router.push(`/projetos/${created.id}`);
    } catch {
      toast.error("Erro ao criar projeto");
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(id: number) {
    try {
      await api.post(`/api/projetos/${id}/arquivar`, {});
      toast.success("Projeto arquivado com sucesso");
      fetchProjetos(); // Re-fetch — archived project will be hidden
    } catch {
      toast.error("Erro ao arquivar projeto");
    }
  }

  const filtered = useMemo(() => {
    return projetos.filter((p) => {
      const title = p.titulo || p.nome || "";
      const desc = p.descricao || p.objeto || "";
      const matchSearch =
        !search ||
        title.toLowerCase().includes(search.toLowerCase()) ||
        desc.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projetos, search, statusFilter]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="projetos-page">
        {/* Page Header */}
        <div className="projetos-header">
          <div className="projetos-header-left">
            <div className="projetos-icon">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <h1 className="projetos-title">Projetos em Andamento</h1>
              <p className="projetos-subtitle">
                Gerencie seus projetos de contratação
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Novo Projeto</DialogTitle>
                  <DialogDescription>
                    Crie um novo projeto de contratação
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Projeto *</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Aquisição de equipamentos de TI"
                      value={newProjeto.nome}
                      onChange={(e) =>
                        setNewProjeto((p) => ({ ...p, nome: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objeto">Objeto</Label>
                    <Textarea
                      id="objeto"
                      placeholder="Descreva o objeto da licitação..."
                      value={newProjeto.objeto}
                      onChange={(e) =>
                        setNewProjeto((p) => ({ ...p, objeto: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unidade">Unidade Requisitante</Label>
                    <Input
                      id="unidade"
                      placeholder="Ex: Departamento de TI"
                      value={newProjeto.unidade_requisitante}
                      onChange={(e) =>
                        setNewProjeto((p) => ({
                          ...p,
                          unidade_requisitante: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Projeto
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="projetos-filters">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <div className="projetos-count">
            <span>{filtered.length}</span> projeto{filtered.length !== 1 && "s"}
          </div>
        </div>

        {/* Project List */}
        {loading ? (
          <div className="projetos-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="projetos-empty">
            <CardContent className="py-16 text-center">
              <FolderOpen className="h-14 w-14 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="font-semibold text-lg mb-1">
                Nenhum projeto encontrado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || statusFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Crie seu primeiro projeto para começar a gerar artefatos"}
              </p>
              {!search && statusFilter === "all" && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Projeto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="projetos-list">
            {filtered.map((projeto) => {
              const etapa = getEtapaAtual(projeto);
              const statusCfg = STATUS_CONFIG[projeto.status] || {
                label: projeto.status,
                variant: "outline" as const,
              };
              const nArtefatos = countArtefatos(projeto);
              const displayTitle = projeto.titulo || projeto.nome || "Sem título";
              const displayDesc = projeto.descricao || projeto.objeto || null;
              const displayDate = projeto.data_criacao || projeto.created_at;

              return (
                <Card key={projeto.id} className="projeto-row group">
                  {/* Left: ID badge */}
                  <div className="projeto-row-id">
                    <span className="projeto-id-label">PROJETO</span>
                    <span className="projeto-id-num">#{projeto.id}</span>
                  </div>

                  {/* Center: Title + Description + SEI (clickable) */}
                  <Link href={`/projetos/${projeto.id}`} className="projeto-row-main">
                    <h3 className="projeto-row-title">{displayTitle}</h3>
                    {displayDesc && (
                      <p className="projeto-row-desc">{displayDesc}</p>
                    )}
                    {projeto.protocolo_sei && (
                      <div className="projeto-row-sei">
                        <span className="sei-dot" />
                        SEI: <span className="sei-numero">{projeto.protocolo_sei.numero}</span>
                      </div>
                    )}
                  </Link>

                  {/* Badges */}
                  <div className="projeto-row-badges">
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    <span
                      className="stage-badge"
                      style={{ backgroundColor: etapa.color }}
                    >
                      {etapa.label}
                    </span>
                  </div>

                  {/* Meta: unit + date */}
                  <div className="projeto-row-meta">
                    {projeto.unidade_requisitante && (
                      <span className="projeto-row-unidade">
                        {projeto.unidade_requisitante}
                      </span>
                    )}
                    <span className="projeto-row-data">
                      {displayDate
                        ? new Date(displayDate).toLocaleDateString("pt-BR")
                        : "—"}
                    </span>
                  </div>

                  {/* Actions: icon buttons */}
                  <div className="projeto-row-actions">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link href={`/projetos/${projeto.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Abrir / Editar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleArchive(projeto.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Arquivar Projeto</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        {projeto.protocolo_sei ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            style={{ color: 'hsl(142 76% 36%)' }}
                            asChild
                          >
                            <a
                              href={projeto.protocolo_sei.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            asChild
                          >
                            <Link href={`/projetos/${projeto.id}/sei/criar`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {projeto.protocolo_sei ? 'Ver no SEI' : 'Publicar no SEI'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
