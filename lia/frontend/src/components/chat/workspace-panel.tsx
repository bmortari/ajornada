"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  RefreshCw,
  Save,
  CheckCircle,
  Loader2,
  FileText,
  Pencil,
  X,
  Check,
  ChevronDown,
  Bot,
  Settings,
  User,
} from "lucide-react";
import type { CampoRemoteConfig, IAModel, Skill, UploadedFile } from "@/types";
import api from "@/lib/api";
import { toast } from "sonner";
import { MarkdownContent } from "./markdown-content";
import { ModelSelector } from "./model-selector";
import { SkillsSelector } from "./skills-selector";
import { FileAttachment } from "./file-attachment";

interface WorkspacePanelProps {
  artifactType: string;
  artifactLabel: string;
  artifactColor: string;
  projetoId: string;
  // Phase
  isGenerating: boolean;
  generationProgress: number;
  currentGeneratingField?: string;
  // Data
  artifactData: Record<string, string>;
  camposConfig: Record<string, CampoRemoteConfig>;
  onUpdateField: (key: string, value: string) => void;
  onRegenerateField: (
    campo: string,
    instrucao: string,
    model?: string,
    skills?: number[],
    files?: UploadedFile[]
  ) => Promise<string>;
  // Streaming
  isStreaming: boolean;
  // AI Config (for regeneration)
  models: IAModel[];
  skills: Skill[];
  selectedModel: string;
  selectedSkills: number[];
  projeto?: any;
  arpData?: any;
  currentUser?: { nome: string; setor: string | null } | null;
}

export function WorkspacePanel({
  artifactType,
  artifactLabel,
  artifactColor,
  projetoId,
  isGenerating,
  generationProgress,
  artifactData,
  camposConfig,
  onUpdateField,
  onRegenerateField,
  isStreaming,
  models,
  skills,
  selectedModel,
  selectedSkills,
  projeto,
  arpData,
  currentUser,
}: WorkspacePanelProps) {
  const [saving, setSaving] = useState(false);
  const [selectedArps, setSelectedArps] = useState<string[]>([]);

  const iaFields = Object.entries(camposConfig).filter(
    ([, cfg]) => cfg.tipo === "B"
  );
  const autoFields = Object.entries(camposConfig).filter(
    ([, cfg]) => cfg.tipo === "A" && cfg.readonly
  );
  const userFields = Object.entries(camposConfig).filter(
    ([, cfg]) => cfg.tipo === "A" && cfg.input_usuario
  );

  const handleSave = useCallback(
    async (status: "rascunho" | "aprovado") => {
      setSaving(true);
      try {
        await api.post("/api/ia/artefato/salvar", {
          projeto_id: parseInt(projetoId),
          tipo_artefato: artifactType,
          artefato_data: {
            ...artifactData,
            audit_metadata: {
              ...((artifactData as any).audit_metadata || {}),
              selected_arps: selectedArps
            }
          },
          status,
        });
        toast.success(
          status === "aprovado"
            ? `${artifactLabel} aprovado com sucesso!`
            : `${artifactLabel} salvo como rascunho`
        );
      } catch {
        toast.error(`Erro ao salvar ${artifactLabel}`);
      } finally {
        setSaving(false);
      }
    },
    [projetoId, artifactType, artifactLabel, artifactData]
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded"
              style={{
                backgroundColor: `${artifactColor}15`,
                color: artifactColor,
              }}
            >
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{artifactLabel}</h3>
              <p className="text-[10px] text-muted-foreground">
                {isGenerating ? "Gerando campos..." : "Revise e edite os campos"}
              </p>
            </div>
          </div>
          {isGenerating && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {generationProgress}%
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        {isGenerating && (
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        )}

        {/* Auto fields (system) */}
        {autoFields.length > 0 && (
          <div className="space-y-3 pb-3 border-b mb-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Dados do Sistema
            </p>
            <div className="grid grid-cols-1 gap-0 border border-border/60 bg-muted/10 rounded-lg overflow-hidden">
              {autoFields.map(([key, cfg]) => {
                // Derive values from PAC items, projeto, and current user
                const pacItems: any[] = projeto?.itens_pac || [];
                let autoValue = artifactData[key];
                if (!autoValue) {
                  if (key === "setor_requisitante") {
                    autoValue =
                      currentUser?.setor ||
                      projeto?.unidade_requisitante ||
                      pacItems[0]?.unidade_administrativa ||
                      "—";
                  } else if (key.includes("responsavel") || key.includes("autor")) {
                    autoValue = currentUser?.nome || "Usuário Logado";
                  } else if (key === "grau_prioridade") {
                    if (pacItems.length > 0) {
                      const minPri = Math.min(...pacItems.map((i: any) => i.prioridade ?? 99).filter((p: number) => p !== 99));
                      autoValue = minPri <= 1 ? "Alta" : minPri <= 3 ? "Normal" : "Baixa";
                    } else {
                      autoValue = "Normal";
                    }
                  } else if (key === "alinhamento_estrategico") {
                    const objetivos = [...new Set(pacItems.map((i: any) => i.objetivo || i.iniciativa).filter(Boolean))];
                    autoValue = objetivos.length > 0 ? objetivos.join(" / ") : projeto?.descricao || "—";
                  } else if (key === "alinhamento_pca" || key.includes("pac")) {
                    if (pacItems.length > 0) {
                      const descs = pacItems.slice(0, 3).map((i: any) => {
                        const d = i.descricao || i.objeto || "Item";
                        return `#${i.id}: ${typeof d === "string" ? d.slice(0, 60) : d}`;
                      });
                      autoValue = `${pacItems.length} item(s): ${descs.join("; ")}${pacItems.length > 3 ? " ..." : ""}`;
                    } else {
                      autoValue = "Sem vínculo PAC";
                    }
                  } else if (key === "valor_estimado" || key.includes("estimativa") || key === "valor_previsto") {
                    // Use valor_por_item (unit price) when available, fallback to valor_previsto
                    const total = pacItems.reduce((sum: number, i: any) => {
                      const vpi = i.valor_por_item;
                      if (vpi != null && !isNaN(Number(vpi)) && Number(vpi) > 0) {
                        return sum + Number(vpi) * (i.quantidade || 1);
                      }
                      const v = parseFloat(String(i.valor_previsto || "0").replace(/[^\d.,]/g, "").replace(",", "."));
                      return sum + (isNaN(v) ? 0 : v);
                    }, 0);
                    autoValue = total > 0
                      ? `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : "R$ 0,00 (Em apuração)";
                  } else if (key === "numero_dfd" || key.includes("numero")) {
                    autoValue = `DFD-${projetoId}`;
                  }
                }

                return (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3 py-2 text-xs border-b last:border-0 border-border/40 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-1.5 sm:w-1/3 shrink-0">
                      <Settings className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span className="text-muted-foreground/80 font-medium">{cfg.label}</span>
                    </div>
                    <div className="flex-1 font-semibold text-foreground/90">
                      {autoValue || cfg.placeholder || "Automático"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ARP Deep Research Section */}
        {arpData && arpData.atas_encontradas && arpData.atas_encontradas.length > 0 && (
          <div className="space-y-3 pb-3 border-b mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-500/15 text-blue-500">
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Atas de Registro de Preços Encontradas</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              A pesquisa profunda localizou {arpData.atas_encontradas.length} ata(s). Selecione as que deseja utilizar ("pegar carona") neste projeto.
            </p>
            <div className="grid gap-2">
              {arpData.atas_encontradas.map((ata: any) => (
                <Card key={ata.id} className="shadow-sm border-blue-200/50 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{ata.numero} - {ata.descricao}</p>
                        <p className="text-[11px] text-muted-foreground">Fornecedor: {ata.fornecedor}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] h-4 leading-none bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">{ata.categoria}</Badge>
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            R$ {ata.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto hover:text-blue-500 cursor-pointer underline">
                             Ver no SEI
                          </span>
                        </div>
                      </div>
                      <div className="pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedArps.includes(ata.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedArps([...selectedArps, ata.id]);
                              } else {
                                setSelectedArps(selectedArps.filter(id => id !== ata.id));
                              }
                            }}
                          />
                          <span className="text-[10px] font-medium">Pegar Carona</span>
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* IA Generated fields */}
        {iaFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Campos Gerados pela IA
            </p>
            {iaFields.map(([key, cfg]) => (
              <ArtifactFieldCard
                key={key}
                fieldKey={key}
                config={cfg}
                value={artifactData[cfg.campo_ia || key] || artifactData[key] || ""}
                onUpdate={(val) => onUpdateField(cfg.campo_ia || key, val)}
                onRegenerate={(instrucao, model, skillIds, files) =>
                  onRegenerateField(cfg.campo_ia || key, instrucao, model, skillIds, files)
                }
                disabled={isStreaming || isGenerating}
                models={models}
                skills={skills}
                selectedModel={selectedModel}
                selectedSkills={selectedSkills}
              />
            ))}
          </div>
        )}

        {/* User fields */}
        {userFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Campos do Usuário
            </p>
            {userFields.map(([key, cfg]) => (
              <Card key={key} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      {cfg.label}
                    </label>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-4 gap-0.5"
                    >
                      <User className="h-2.5 w-2.5" />
                      <span>Usuário</span>
                    </Badge>
                  </div>
                  {cfg.input_type === "date" ? (
                    <input
                      type="date"
                      value={artifactData[key] || ""}
                      onChange={(e) => onUpdateField(key, e.target.value)}
                      className="w-full text-xs rounded-md border border-input bg-background px-3 py-1.5"
                      disabled={isGenerating}
                    />
                  ) : (
                    <input
                      type="text"
                      value={artifactData[key] || ""}
                      onChange={(e) => onUpdateField(key, e.target.value)}
                      placeholder={cfg.placeholder}
                      className="w-full text-xs rounded-md border border-input bg-background px-3 py-1.5"
                      disabled={isGenerating}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Save actions */}
        {!isGenerating && Object.keys(artifactData).length > 0 && (
          <div className="flex gap-2 pt-2 border-t sticky bottom-0 bg-background pb-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => handleSave("rascunho")}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar Rascunho
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => handleSave("aprovado")}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              Aprovar
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// Individual editable + regenerable field
function ArtifactFieldCard({
  fieldKey,
  config,
  value,
  onUpdate,
  onRegenerate,
  disabled,
  models,
  skills,
  selectedModel,
  selectedSkills,
}: {
  fieldKey: string;
  config: CampoRemoteConfig;
  value: string;
  onUpdate: (value: string) => void;
  onRegenerate: (
    instrucao: string,
    model?: string,
    skillIds?: number[],
    files?: UploadedFile[]
  ) => Promise<string>;
  disabled: boolean;
  models: IAModel[];
  skills: Skill[];
  selectedModel: string;
  selectedSkills: number[];
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenAccordion, setShowRegenAccordion] = useState(false);
  const [regenInstrucao, setRegenInstrucao] = useState("");
  const [regenModel, setRegenModel] = useState(selectedModel);
  const [regenSkills, setRegenSkills] = useState<number[]>(selectedSkills);
  const [regenFiles, setRegenFiles] = useState<UploadedFile[]>([]);

  const handleSaveEdit = () => {
    onUpdate(editValue);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(value);
    setEditing(false);
  };

  const handleRegenerate = async () => {
    if (!regenInstrucao.trim()) return;
    setRegenerating(true);
    try {
      await onRegenerate(regenInstrucao, regenModel, regenSkills, regenFiles);
      setShowRegenAccordion(false);
      setRegenInstrucao("");
      setRegenFiles([]);
      toast.success("Campo regenerado com sucesso!");
    } finally {
      setRegenerating(false);
    }
  };

  const toggleRegenAccordion = () => {
    setShowRegenAccordion(!showRegenAccordion);
    if (!showRegenAccordion) {
      // Reset to current defaults when opening
      setRegenModel(selectedModel);
      setRegenSkills(selectedSkills);
      setRegenFiles([]);
      setRegenInstrucao("");
    }
  };

  const handleSkillToggle = (skillId: number) => {
    setRegenSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  // Sync value when it changes externally (e.g. after regeneration)
  if (!editing && value !== editValue) {
    setEditValue(value);
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-[11px] font-semibold">
              {config.label}
            </CardTitle>
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 h-4 gap-0.5"
            >
              <Bot className="h-2.5 w-2.5" />
              <span>IA</span>
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {!editing && !disabled && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditing(true)}
                  title="Editar"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={toggleRegenAccordion}
                  title="Regenerar com IA"
                  disabled={regenerating}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`}
                  />
                </Button>
              </>
            )}
            {editing && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-emerald-600"
                  onClick={handleSaveEdit}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={handleCancelEdit}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-2">
        {/* Field value */}
        {editing ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            className="text-xs"
          />
        ) : (
          <div className="text-xs prose prose-sm dark:prose-invert max-w-none">
            {value ? (
              <MarkdownContent content={value} />
            ) : (
              <span className="text-muted-foreground italic">
                {config.placeholder || "Aguardando geração..."}
              </span>
            )}
          </div>
        )}

        {/* Regeneration accordion */}
        <Collapsible open={showRegenAccordion && !editing}>
          <CollapsibleContent className="space-y-2 pt-2 border-t animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-1.5 mb-1">
              <RefreshCw className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Regenerar Campo
              </span>
            </div>

            {/* Instruction input */}
            <Textarea
              value={regenInstrucao}
              onChange={(e) => setRegenInstrucao(e.target.value)}
              placeholder="Descreva como deseja melhorar este campo. Ex: Mais detalhado, incluir normas ABNT, simplificar linguagem..."
              rows={2}
              className="text-xs"
            />

            {/* AI Config */}
            <div className="flex items-center gap-2">
              <ModelSelector
                models={models}
                selectedModel={regenModel}
                onSelect={setRegenModel}
                disabled={regenerating}
                compact
              />
              <SkillsSelector
                skills={skills}
                selectedSkills={regenSkills}
                onToggle={handleSkillToggle}
                disabled={regenerating}
              />
            </div>

            {/* File attachment */}
            {regenFiles.length > 0 && (
              <div className="pt-1">
                <FileAttachment
                  uploadedFiles={regenFiles}
                  onFilesChange={setRegenFiles}
                  disabled={regenerating}
                />
              </div>
            )}
            {regenFiles.length === 0 && (
              <div className="flex justify-start">
                <FileAttachment
                  uploadedFiles={[]}
                  onFilesChange={(newFiles) =>
                    setRegenFiles([...regenFiles, ...newFiles])
                  }
                  disabled={regenerating}
                />
              </div>
            )}

            {/* Submit button */}
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={handleRegenerate}
              disabled={regenerating || !regenInstrucao.trim()}
            >
              {regenerating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Regenerando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  <span>Regenerar com IA</span>
                </>
              )}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
