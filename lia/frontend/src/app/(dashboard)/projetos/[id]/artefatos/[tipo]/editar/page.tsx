"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import api, { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  RefreshCw,
  Loader2,
  Clock,
  Shield,
  Pencil,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

// ===== Types =====

interface CampoConfig {
  label: string;
  tipo: "A" | "B";
  descricao?: string;
  placeholder?: string;
  campo_ia?: string;
  readonly?: boolean;
  fonte?: string;
  input_type?: string;
  input_usuario?: boolean;
  descricao_detalhada?: string;
}

interface ArtefatoData {
  id: number;
  versao: number;
  status: string;
  projeto_id: number;
  data_criacao?: string;
  data_atualizacao?: string;
  data_aprovacao?: string;
  protocolo_sei?: string;
  [key: string]: unknown;
}

interface VersaoInfo {
  versao: number;
  data: string | null;
  id: number;
}

interface ArtefatoResponse {
  artefato: ArtefatoData;
  campos_config: Record<string, CampoConfig>;
  versoes: VersaoInfo[];
}

// Artifact type labels
const TIPO_LABELS: Record<string, string> = {
  dfd: "DFD - Documento de Formalização da Demanda",
  etp: "ETP - Estudo Técnico Preliminar",
  tr: "TR - Termo de Referência",
  riscos: "PGR - Plano de Gerenciamento de Riscos",
  edital: "Edital de Licitação",
  pesquisa_precos: "Pesquisa de Preços",
  checklist_conformidade: "Checklist de Conformidade",
  minuta_contrato: "Minuta de Contrato",
  aviso_publicidade_direta: "Aviso de Dispensa",
  justificativa_fornecedor_escolhido: "Justificativa Fornecedor Escolhido",
  justificativa_excepcionalidade: "Justificativa de Excepcionalidade",
  rdve: "RDVE - Relatório de Vantagem Econômica",
  jva: "JVA - Justificativa Vantagem Adesão",
  tafo: "TAFO - Termo Aceite Fornecedor",
  trs: "TRS - Termo de Referência Simplificado",
  ade: "ADE - Aviso de Dispensa Eletrônica",
  jpef: "JPEF - Justificativa de Preço/Fornecedor",
  ce: "CE - Certidão de Enquadramento",
};

// ===== Main Component =====

export default function ArtefatoEditarPage({
  params,
}: {
  params: Promise<{ id: string; tipo: string }>;
}) {
  const { id: projetoId, tipo } = use(params);
  const router = useRouter();

  const [artefato, setArtefato] = useState<ArtefatoData | null>(null);
  const [camposConfig, setCamposConfig] = useState<Record<string, CampoConfig>>({});
  const [versoes, setVersoes] = useState<VersaoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  // Load artifact data
  const loadArtefato = useCallback(
    async (artefatoId?: number) => {
      try {
        // If no specific id, get the latest for this project
        let data: ArtefatoResponse;
        if (artefatoId) {
          data = await api.get<ArtefatoResponse>(`/api/${tipo}/${artefatoId}`);
        } else {
          // Need to find the artifact for this project
          // Try listing via project endpoint
          const projData = await api.get<{ artefatos?: Record<string, { id: number }> }>(
            `/api/projetos/${projetoId}`
          );
          const artId = projData.artefatos?.[tipo]?.id;
          if (!artId) {
            toast.error("Artefato não encontrado. Gere o artefato via chat primeiro.");
            router.push(`/projetos/${projetoId}`);
            return;
          }
          data = await api.get<ArtefatoResponse>(`/api/${tipo}/${artId}`);
        }

        setArtefato(data.artefato);
        setCamposConfig(data.campos_config);
        setVersoes(data.versoes);

        // Initialize field values from artifact data
        const values: Record<string, string> = {};
        for (const campo of Object.keys(data.campos_config)) {
          const val = data.artefato[campo];
          if (val !== null && val !== undefined) {
            values[campo] = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
          } else {
            values[campo] = "";
          }
        }
        setFieldValues(values);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          toast.error("Artefato não encontrado");
          router.push(`/projetos/${projetoId}`);
        } else {
          toast.error("Erro ao carregar artefato");
        }
      } finally {
        setLoading(false);
      }
    },
    [tipo, projetoId, router]
  );

  useEffect(() => {
    loadArtefato();
  }, [loadArtefato]);

  // Save a single field
  const saveField = useCallback(
    async (campo: string) => {
      if (!artefato) return;
      setSaving(true);
      try {
        await api.post(`/api/${tipo}/editar-campo`, {
          artefato_id: artefato.id,
          campo,
          valor: fieldValues[campo],
        });
        toast.success(`Campo "${camposConfig[campo]?.label}" salvo`);
        setEditingField(null);
      } catch {
        toast.error("Erro ao salvar campo");
      } finally {
        setSaving(false);
      }
    },
    [artefato, tipo, fieldValues, camposConfig]
  );

  // Approve artifact
  const aprovar = useCallback(async () => {
    if (!artefato) return;
    try {
      await api.post(`/api/${tipo}/${artefato.id}/aprovar`);
      toast.success("Artefato aprovado!");
      loadArtefato(artefato.id);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.data as { detail?: string })?.detail;
        toast.error(detail || "Erro ao aprovar");
      }
    }
  }, [artefato, tipo, loadArtefato]);

  // Create new version
  const novaVersao = useCallback(async () => {
    if (!artefato) return;
    try {
      const result = await api.post<{ id: number }>(`/api/${tipo}/${artefato.id}/nova-versao`);
      toast.success("Nova versão criada!");
      setLoading(true);
      loadArtefato(result.id);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.data as { detail?: string })?.detail;
        toast.error(detail || "Erro ao criar nova versão");
      }
    }
  }, [artefato, tipo, loadArtefato]);

  // Delete artifact
  const deletar = useCallback(async () => {
    if (!artefato) return;
    try {
      await api.delete(`/api/${tipo}/${artefato.id}`);
      toast.success("Artefato removido");
      router.push(`/projetos/${projetoId}`);
    } catch {
      toast.error("Erro ao remover artefato");
    }
  }, [artefato, tipo, projetoId, router]);

  // Switch version
  const switchVersao = useCallback(
    (versaoId: number) => {
      setLoading(true);
      loadArtefato(versaoId);
    },
    [loadArtefato]
  );

  // Export handlers
  const exportDocx = useCallback(() => {
    window.open(`/api/export/${projetoId}/${tipo}/docx`, "_blank");
  }, [projetoId, tipo]);

  const exportPdf = useCallback(() => {
    if (!artefato) return;
    window.open(`/api/export/pdf/${tipo}/${artefato.id}`, "_blank");
  }, [tipo, artefato]);

  // Toggle field expand
  const toggleField = useCallback((campo: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(campo)) {
        next.delete(campo);
      } else {
        next.add(campo);
      }
      return next;
    });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!artefato) return null;

  const isPublicado = !!artefato.protocolo_sei;
  const isAprovado = artefato.status === "aprovado";
  const canEdit = !isPublicado;
  const titulo = TIPO_LABELS[tipo] || tipo.toUpperCase();

  // Group fields: Type A (system/user) and Type B (AI-generated)
  const camposA = Object.entries(camposConfig).filter(([, c]) => c.tipo === "A");
  const camposB = Object.entries(camposConfig).filter(([, c]) => c.tipo === "B");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/projetos/${projetoId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{titulo}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  isPublicado ? "default" : isAprovado ? "default" : "secondary"
                }
                className={
                  isPublicado
                    ? "bg-blue-600"
                    : isAprovado
                    ? "bg-green-600"
                    : ""
                }
              >
                {isPublicado ? "Publicado (SEI)" : artefato.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Versão {artefato.versao}
              </span>
              {artefato.data_atualizacao && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(artefato.data_atualizacao).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Version selector */}
          {versoes.length > 1 && (
            <Select
              value={String(artefato.id)}
              onValueChange={(v) => switchVersao(Number(v))}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versoes.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    v{v.versao}{" "}
                    {v.data
                      ? `(${new Date(v.data).toLocaleDateString("pt-BR")})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={exportDocx}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar DOCX</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={exportPdf}>
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar PDF</TooltipContent>
          </Tooltip>

          {canEdit && !isAprovado && (
            <Button onClick={aprovar} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Aprovar
            </Button>
          )}

          {canEdit && (
            <Button variant="outline" onClick={novaVersao}>
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Nova Versão
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {isPublicado && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="py-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Artefato publicado no SEI (Protocolo: {artefato.protocolo_sei}).
              Edição bloqueada.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Type A fields (system / user input) */}
      {camposA.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Dados do Documento
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {camposA.map(([campo, config]) => (
              <FieldCardCompact
                key={campo}
                campo={campo}
                config={config}
                value={fieldValues[campo] || ""}
                canEdit={canEdit && !config.readonly}
                saving={saving}
                onChange={(v) =>
                  setFieldValues((prev) => ({ ...prev, [campo]: v }))
                }
                onSave={() => saveField(campo)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Type B fields (AI-generated) */}
      {camposB.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Conteúdo Gerado por IA
          </h2>
          <div className="space-y-3">
            {camposB.map(([campo, config]) => (
              <FieldCardFull
                key={campo}
                campo={campo}
                config={config}
                value={fieldValues[campo] || ""}
                canEdit={canEdit}
                saving={saving}
                isExpanded={expandedFields.has(campo)}
                isEditing={editingField === campo}
                onToggle={() => toggleField(campo)}
                onStartEdit={() => setEditingField(campo)}
                onCancelEdit={() => setEditingField(null)}
                onChange={(v) =>
                  setFieldValues((prev) => ({ ...prev, [campo]: v }))
                }
                onSave={() => saveField(campo)}
                projetoId={projetoId}
                tipo={tipo}
              />
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      {canEdit && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-destructive">
                Zona de Perigo
              </h3>
              <p className="text-xs text-muted-foreground">
                Remover permanentemente este artefato
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Excluir Artefato
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar exclusão</DialogTitle>
                  <DialogDescription>
                    Esta ação não pode ser desfeita. O artefato será removido
                    permanentemente.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" onClick={deletar}>
                    Sim, excluir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </div>
  );
}

// ===== Compact field card for Type A fields =====

function FieldCardCompact({
  campo,
  config,
  value,
  canEdit,
  saving,
  onChange,
  onSave,
}: {
  campo: string;
  config: CampoConfig;
  value: string;
  canEdit: boolean;
  saving: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
}) {
  const isReadonly = config.readonly || !canEdit;

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-3 space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {config.label}
          {config.readonly && (
            <Badge variant="outline" className="ml-2 text-[10px] py-0">
              Automático
            </Badge>
          )}
        </label>
        {isReadonly ? (
          <p className="text-sm">{value || "—"}</p>
        ) : config.input_type === "date" ? (
          <div className="flex gap-2">
            <Input
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="text-sm h-8"
            />
            <Button size="sm" variant="ghost" onClick={onSave} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={config.placeholder}
              className="text-sm h-8"
            />
            <Button size="sm" variant="ghost" onClick={onSave} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Full field card for Type B fields (AI-generated, expandable) =====

function FieldCardFull({
  campo,
  config,
  value,
  canEdit,
  saving,
  isExpanded,
  isEditing,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onChange,
  onSave,
  projetoId,
  tipo,
}: {
  campo: string;
  config: CampoConfig;
  value: string;
  canEdit: boolean;
  saving: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  projetoId: string;
  tipo: string;
}) {
  const hasContent = value && value.trim().length > 0;
  const isJson = config.input_type === "json";
  const preview = hasContent
    ? value.length > 200
      ? value.substring(0, 200) + "..."
      : value
    : "Não preenchido";

  return (
    <Card className="shadow-sm">
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
            <Badge variant="outline" className="text-[10px] py-0">
              IA
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {hasContent ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {!isExpanded && (
          <CardDescription className="text-xs line-clamp-1 mt-1">
            {preview}
          </CardDescription>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {config.descricao && (
            <p className="text-xs text-muted-foreground italic">
              {config.descricao}
            </p>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={config.placeholder}
                rows={isJson ? 12 : 6}
                className="text-sm font-mono resize-y"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div
                className={`text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-96 overflow-y-auto ${
                  isJson ? "font-mono text-xs" : ""
                }`}
              >
                {hasContent ? value : "Não preenchido"}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={onStartEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (value) {
                        navigator.clipboard.writeText(value);
                        toast.success("Copiado!");
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
