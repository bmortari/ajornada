"use client";

import { useEffect, useState, use } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Search,
  Loader2,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Save,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface CotacaoParams {
  projeto_id: number;
  codigo_catmat: number;
  tipo_catalogo: string;
  pesquisar_familia_pdm?: boolean;
  estado?: string;
  incluir_detalhes_pncp?: boolean;
}

interface ItemCotacao {
  numero_compra: string;
  descricao: string;
  unidade_medida: string;
  preco_unitario: number;
  quantidade: number;
  fornecedor: string;
  uasg: string;
  data_compra: string;
  is_outlier?: boolean;
  modalidade?: string;
  orgao?: string;
}

interface Estatisticas {
  preco_medio: number;
  preco_mediana: number;
  preco_minimo: number;
  preco_maximo: number;
  desvio_padrao: number;
  coeficiente_variacao: number;
  quantidade_itens: number;
}

interface CotacaoResult {
  versao_api: string;
  data_geracao: string;
  item: {
    codigo_catmat: number;
    tipo_catalogo: string;
    descricao: string;
    unidade_medida: string;
  };
  cotacao: {
    objeto: string;
    justificativa: string;
    responsavel: string;
  };
  estatisticas: Estatisticas;
  itens: ItemCotacao[];
  fonte: {
    api: string;
    url: string;
  };
}

export default function CotacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projetoId } = use(params);
  const router = useRouter();

  const [codigoCatmat, setCodigoCatmat] = useState("");
  const [tipoCatalogo, setTipoCatalogo] = useState("material");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CotacaoResult | null>(null);

  const pesquisar = async () => {
    if (!codigoCatmat) {
      toast.error("Informe o código CATMAT/CATSERV");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await api.post<CotacaoResult>("/api/cotacao/gerar", {
        projeto_id: Number(projetoId),
        codigo_catmat: Number(codigoCatmat),
        tipo_catalogo: tipoCatalogo,
        estado: estado || undefined,
        incluir_detalhes_pncp: false,
      });
      setResult(data);
      toast.success(`${data.itens.length} itens encontrados`);
    } catch {
      toast.error("Erro na pesquisa de preços");
    } finally {
      setLoading(false);
    }
  };

  const salvar = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await api.post("/api/cotacao/salvar", {
        projeto_id: Number(projetoId),
        cotacao_data: result,
        valor_total: result.estatisticas.preco_medio,
      });
      toast.success("Pesquisa de preços salva como artefato!");
      router.push(`/projetos/${projetoId}`);
    } catch {
      toast.error("Erro ao salvar pesquisa");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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
          <h1 className="text-xl font-bold tracking-tight">Pesquisa de Preços</h1>
          <p className="text-sm text-muted-foreground">
            Consulta automática ao portal Compras.gov.br
          </p>
        </div>
      </div>

      <Separator />

      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parâmetros de Busca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Código CATMAT/CATSERV *</label>
              <Input
                type="number"
                placeholder="Ex: 150130"
                value={codigoCatmat}
                onChange={(e) => setCodigoCatmat(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tipo</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={tipoCatalogo}
                onChange={(e) => setTipoCatalogo(e.target.value)}
              >
                <option value="material">Material</option>
                <option value="servico">Serviço</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Estado (UF)</label>
              <Input
                placeholder="Ex: GO"
                maxLength={2}
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <Button onClick={pesquisar} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Pesquisar Preços
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Item info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {result.item.descricao}
              </CardTitle>
              <CardDescription>
                CATMAT: {result.item.codigo_catmat} | Tipo: {result.item.tipo_catalogo} |
                Unidade: {result.item.unidade_medida}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Statistics */}
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              label="Preço Médio"
              value={formatCurrency(result.estatisticas.preco_medio)}
              icon={BarChart3}
            />
            <StatCard
              label="Preço Mediana"
              value={formatCurrency(result.estatisticas.preco_mediana)}
              icon={DollarSign}
            />
            <StatCard
              label="Menor Preço"
              value={formatCurrency(result.estatisticas.preco_minimo)}
              icon={TrendingDown}
              color="text-green-600"
            />
            <StatCard
              label="Maior Preço"
              value={formatCurrency(result.estatisticas.preco_maximo)}
              icon={TrendingUp}
              color="text-red-500"
            />
          </div>

          {/* Items table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Itens Encontrados ({result.itens.length})
                </CardTitle>
                <Button onClick={salvar} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar como Artefato
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 px-2 font-medium">Fornecedor</th>
                      <th className="py-2 px-2 font-medium">UASG</th>
                      <th className="py-2 px-2 font-medium text-right">Preço Unit.</th>
                      <th className="py-2 px-2 font-medium text-right">Qtd</th>
                      <th className="py-2 px-2 font-medium">Data</th>
                      <th className="py-2 px-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.itens.map((item, i) => (
                      <tr
                        key={i}
                        className={`border-b ${
                          item.is_outlier
                            ? "bg-amber-50 dark:bg-amber-950/20"
                            : ""
                        }`}
                      >
                        <td className="py-2 px-2 max-w-[200px] truncate">
                          {item.fornecedor || "—"}
                        </td>
                        <td className="py-2 px-2">{item.uasg}</td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatCurrency(item.preco_unitario)}
                        </td>
                        <td className="py-2 px-2 text-right">{item.quantidade}</td>
                        <td className="py-2 px-2 text-xs">
                          {item.data_compra
                            ? new Date(item.data_compra).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="py-2 px-2">
                          {item.is_outlier && (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-300 text-[10px]"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Outlier
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Source info */}
          <p className="text-xs text-muted-foreground text-center">
            Fonte: {result.fonte.api} • Gerado em:{" "}
            {new Date(result.data_geracao).toLocaleString("pt-BR")}
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-lg font-semibold ${color || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
