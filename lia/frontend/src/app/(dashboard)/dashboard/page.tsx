"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  FileText,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";

interface DashboardData {
  total_projetos: number;
  total_artefatos: number;
  artefatos_ia: number;
  taxa_ia: number;
  projetos_em_andamento: number;
  projetos_concluidos: number;
  projetos_recentes: Array<{
    id: number;
    nome: string;
    status: string;
    created_at: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        // Fetch projects to compute stats
        const projetos = await api.get<Array<{
          id: number;
          nome: string;
          status: string;
          created_at: string;
        }>>("/api/projetos");

        const total = projetos.length;
        const emAndamento = projetos.filter(
          (p) => p.status === "em_andamento" || p.status === "ativo"
        ).length;
        const concluidos = projetos.filter(
          (p) => p.status === "concluido"
        ).length;

        setData({
          total_projetos: total,
          total_artefatos: 0,
          artefatos_ia: 0,
          taxa_ia: 0,
          projetos_em_andamento: emAndamento,
          projetos_concluidos: concluidos,
          projetos_recentes: projetos.slice(0, 5),
        });
      } catch {
        // If API fails, show empty state
        setData({
          total_projetos: 0,
          total_artefatos: 0,
          artefatos_ia: 0,
          taxa_ia: 0,
          projetos_em_andamento: 0,
          projetos_concluidos: 0,
          projetos_recentes: [],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {user?.nome?.split(" ")[0] || "Usuário"} 👋
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo do seu sistema de licitações.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Projetos"
          value={data?.total_projetos}
          icon={FolderOpen}
          loading={loading}
        />
        <StatsCard
          title="Em Andamento"
          value={data?.projetos_em_andamento}
          icon={Clock}
          loading={loading}
        />
        <StatsCard
          title="Concluídos"
          value={data?.projetos_concluidos}
          icon={TrendingUp}
          loading={loading}
        />
        <StatsCard
          title="Artefatos Gerados"
          value={data?.total_artefatos}
          icon={FileText}
          description={
            data?.artefatos_ia
              ? `${data.artefatos_ia} com IA (${data.taxa_ia}%)`
              : undefined
          }
          loading={loading}
        />
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Projetos Recentes</CardTitle>
              <CardDescription>
                Últimos projetos criados no sistema
              </CardDescription>
            </div>
            <Link
              href="/projetos"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : data?.projetos_recentes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum projeto ainda</p>
              <p className="text-sm">
                Crie seu primeiro projeto para começar.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.projetos_recentes.map((projeto) => (
                <Link
                  key={projeto.id}
                  href={`/projetos/${projeto.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {projeto.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(projeto.created_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={projeto.status} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{value ?? 0}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ativo: { label: "Ativo", variant: "default" },
    em_andamento: { label: "Em Andamento", variant: "default" },
    concluido: { label: "Concluído", variant: "secondary" },
    rascunho: { label: "Rascunho", variant: "outline" },
    cancelado: { label: "Cancelado", variant: "destructive" },
  };

  const config = variants[status] || {
    label: status,
    variant: "outline" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
