"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import type { Projeto } from "@/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface ArtefatoResumo {
  tipo: string;
  nome: string;
  status: string;
  projeto_id: number;
  projeto_nome: string;
}

const TIPO_LABELS: Record<string, string> = {
  dfd: "DFD",
  etp: "ETP",
  tr: "TR",
  pgr: "PGR",
  edital: "Edital",
  pesquisa_precos: "Pesquisa de Preços",
  justificativa_excepcionalidade: "JE",
  checklist_conformidade: "Checklist",
  rdve: "RDVE",
  jva: "JVA",
  trs: "TRS",
  ade: "ADE",
  jpef: "JPEF",
};

export default function ArtefatosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.get<Projeto[]>("/api/projetos");
        setProjetos(data);
      } catch {
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Artefatos</h1>
        <p className="text-muted-foreground">
          Visão geral dos artefatos em todos os projetos
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar projetos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : projetos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-lg mb-1">Nenhum artefato</h3>
            <p className="text-sm text-muted-foreground">
              Crie projetos e gere artefatos via chat com IA
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projetos
            .filter(
              (p) =>
                !search ||
                p.nome.toLowerCase().includes(search.toLowerCase())
            )
            .map((projeto) => (
              <Link key={projeto.id} href={`/projetos/${projeto.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {projeto.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(projeto.created_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                      <Badge variant="outline">{projeto.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
