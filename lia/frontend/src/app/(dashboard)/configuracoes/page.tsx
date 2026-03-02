"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import type { Skill } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sun,
  Moon,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  User,
  Settings,
  Cpu,
  Shield,
  Palette,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import "./configuracoes.css";

type Theme = "light" | "dark";

type TabId = "modelos" | "usuarios" | "habilidades" | "temas" | "perfil";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabConfig[] = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "modelos", label: "Modelos de IA", icon: Cpu },
  { id: "usuarios", label: "Usuários", icon: Shield },
  { id: "habilidades", label: "Habilidades", icon: Zap },
  { id: "temas", label: "Temas", icon: Palette },
];

const themeOptions: {
  value: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  { value: "light", label: "Claro", icon: Sun, description: "Fundo branco com texto escuro" },
  { value: "dark", label: "Escuro", icon: Moon, description: "Fundo cinza escuro com texto claro" },
];

interface ModeloPing {
  status: "idle" | "loading" | "online" | "offline" | "rate_limited" | "error";
  tempo_ms?: number;
  mensagem?: string;
}

interface IAModelInfo {
  id: string;
  name: string;
  description?: string;
  tier?: string;
  icon?: string;
}

interface IAModelsAPIResponse {
  models: IAModelInfo[];
  default: string;
  tiers: Record<string, { name: string; color: string }>;
}

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("perfil");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<number | null>(null);
  const [modelStatus, setModelStatus] = useState<Record<string, ModeloPing>>({});
  const [iaModels, setIaModels] = useState<IAModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [skillForm, setSkillForm] = useState({
    nome: "",
    descricao: "",
    instrucoes: "",
  });

  const fetchSkills = useCallback(async () => {
    try {
      const data = await api.get<Skill[]>("/api/skills");
      setSkills(data);
    } catch {
      // Skills endpoint may not exist yet
    } finally {
      setLoadingSkills(false);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const data = await api.get<IAModelsAPIResponse>("/api/ia/models");
      setIaModels(data.models);
      setDefaultModel(data.default);
    } catch {
      // Fallback if API not available
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
    fetchModels();
  }, [fetchSkills, fetchModels]);

  function openCreateDialog() {
    setEditSkill(null);
    setSkillForm({ nome: "", descricao: "", instrucoes: "" });
    setDialogOpen(true);
  }

  function openEditDialog(skill: Skill) {
    setEditSkill(skill);
    setSkillForm({
      nome: skill.nome,
      descricao: skill.descricao || "",
      instrucoes: skill.instrucoes || "",
    });
    setDialogOpen(true);
  }

  async function handleSaveSkill(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editSkill) {
        await api.put(`/api/skills/${editSkill.id}`, skillForm);
        toast.success("Skill atualizada!");
      } else {
        await api.post("/api/skills", skillForm);
        toast.success("Skill criada!");
      }
      setDialogOpen(false);
      fetchSkills();
    } catch {
      toast.error("Erro ao salvar skill");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSkill(id: number) {
    try {
      await api.delete(`/api/skills/${id}`);
      toast.success("Skill removida");
      fetchSkills();
    } catch {
      toast.error("Erro ao remover skill");
    }
  }

  async function pingModelo(modeloNome: string) {
    setModelStatus((prev) => ({
      ...prev,
      [modeloNome]: { status: "loading" },
    }));
    try {
      const data = await api.get<{ status: string; tempo_ms?: number; mensagem?: string }>(
        `/api/ping-modelo/${encodeURIComponent(modeloNome)}`
      );
      setModelStatus((prev) => ({
        ...prev,
        [modeloNome]: {
          status: data.status as ModeloPing["status"],
          tempo_ms: data.tempo_ms,
          mensagem: data.mensagem,
        },
      }));
    } catch {
      setModelStatus((prev) => ({
        ...prev,
        [modeloNome]: { status: "error", mensagem: "Erro de conexão" },
      }));
    }
  }

  const systemSkills = skills.filter((s) => s.escopo === "system");
  const userSkills = skills.filter((s) => s.escopo !== "system");

  return (
    <div className="config-page">
      {/* Page Header */}
      <div className="config-page-header">
        <div className="config-page-icon">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="config-page-title">Configurações</h1>
          <p className="config-page-subtitle">Gerencie as preferências do sistema</p>
        </div>
      </div>

      {/* Main container with vertical tabs */}
      <div className="config-container">
        {/* Vertical tab navigation */}
        <nav className="config-tabs">
          <ul>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    className={`config-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content area */}
        <div className="config-content">

          {/* ===== PERFIL ===== */}
          {activeTab === "perfil" && (
            <section className="config-section">
              <h2>Perfil do Usuário</h2>

              <div className="profile-grid">
                <div className="profile-field">
                  <span className="profile-label">Nome</span>
                  <span className="profile-value">{user?.nome || "—"}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">E-mail</span>
                  <span className="profile-value">{user?.email || "—"}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Perfil</span>
                  <Badge variant="outline" className="mt-1">
                    {user?.perfil || "—"}
                  </Badge>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Setor</span>
                  <span className="profile-value">{user?.setor || "—"}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Cargo</span>
                  <span className="profile-value">{user?.cargo || "—"}</span>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Status</span>
                  <Badge variant={user?.is_active ? "default" : "destructive"} className="mt-1">
                    {user?.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </section>
          )}

          {/* ===== MODELOS DE IA ===== */}
          {activeTab === "modelos" && (
            <section className="config-section">
              <h2>Modelos de IA</h2>

              {loadingModels ? (
                <div className="modelos-list">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skill-skeleton" style={{ height: 52 }} />
                  ))}
                </div>
              ) : iaModels.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum modelo disponível.</p>
              ) : (
                <div className="modelos-list">
                  {iaModels.map((modelo) => {
                    const ping = modelStatus[modelo.id] || { status: "idle" };
                    const isDefault = modelo.id === defaultModel;
                    return (
                      <div key={modelo.id} className="modelo-item">
                        <span className="modelo-icon-emoji">{modelo.icon || "🤖"}</span>
                        <div className="modelo-info">
                          <span className="modelo-nome">
                            {modelo.name}
                            {isDefault && <Badge variant="outline" className="ml-2 text-[10px]">Padrão</Badge>}
                          </span>
                          <span className="modelo-desc">{modelo.description}</span>
                        </div>
                        <button
                          className={`modelo-ping-btn ${ping.status === "loading" ? "spinning" : ""}`}
                          onClick={() => pingModelo(modelo.id)}
                          disabled={ping.status === "loading"}
                          title="Verificar status"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <span className={`modelo-status modelo-status-${ping.status}`}>
                          {ping.status === "idle" && "Verificar"}
                          {ping.status === "loading" && "⏳ Pingando..."}
                          {ping.status === "online" && `🟢 Online${ping.tempo_ms ? ` (${ping.tempo_ms}ms)` : ""}`}
                          {ping.status === "rate_limited" && "🟡 Rate Limited"}
                          {ping.status === "offline" && "🔴 Offline"}
                          {ping.status === "error" && `⚠️ ${ping.mensagem || "Erro"}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="modelos-hint">
                Todos os modelos são servidos via OpenRouter. Clique no botão para verificar a disponibilidade em tempo real.
              </div>
            </section>
          )}

          {/* ===== USUÁRIOS ===== */}
          {activeTab === "usuarios" && (
            <section className="config-section">
              <h2>Usuários e Permissões</h2>

              <Card className="admin-card">
                <CardContent className="p-6 flex gap-5 items-start">
                  <div className="admin-icon-box">
                    <Shield className="h-8 w-8" />
                  </div>
                  <div className="admin-info">
                    <CardTitle className="text-base mb-2">Painel Administrativo</CardTitle>
                    <CardDescription className="mb-4">
                      Para gerenciamento avançado de usuários, permissões, grupos e visualização direta dos dados do
                      banco (SQLAdmin), acesse o painel dedicado.
                    </CardDescription>
                    <Button asChild>
                      <a href="/admin" target="_blank" rel="noopener noreferrer">
                        Acessar Painel Admin
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ===== HABILIDADES (SKILLS) ===== */}
          {activeTab === "habilidades" && (
            <section className="config-section">
              <div className="skills-header">
                <div>
                  <h2>Habilidades (Skills)</h2>
                  <p className="skills-subtitle">
                    Personalize o comportamento da IA com instruções customizadas
                  </p>
                </div>
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Skill
                </Button>
              </div>

              <div className="skills-info-banner">
                <span className="info-icon">💡</span>
                <div>
                  <strong>O que são Habilidades?</strong>
                  <p>
                    Skills são instruções que modificam como a IA gera seus documentos.
                    Por exemplo: ser mais rigoroso com citações legais, incluir critérios ambientais,
                    ou usar linguagem simplificada. Associe skills aos seus projetos para personalizar a geração.
                  </p>
                </div>
              </div>

              {loadingSkills ? (
                <div className="skills-loading">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skill-skeleton" />
                  ))}
                </div>
              ) : (
                <>
                  {/* System Skills */}
                  {systemSkills.length > 0 && (
                    <div className="skills-group">
                      <h3 className="skills-group-title">Skills do Sistema</h3>
                      <div className="skills-list">
                        {systemSkills.map((skill) => (
                          <div key={skill.id} className={`skill-card ${expandedSkill === skill.id ? "expanded" : ""}`}>
                            <div
                              className="skill-card-header"
                              onClick={() =>
                                setExpandedSkill(expandedSkill === skill.id ? null : skill.id)
                              }
                            >
                              <span className="skill-card-icon">⚙️</span>
                              <div className="skill-card-info">
                                <span className="skill-card-nome">{skill.nome}</span>
                                {skill.descricao && (
                                  <span className="skill-card-desc">{skill.descricao}</span>
                                )}
                              </div>
                              <Badge className="skill-badge-system">Sistema</Badge>
                              {expandedSkill === skill.id ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            {expandedSkill === skill.id && (
                              <div className="skill-card-body">
                                <label>Instruções</label>
                                <pre className="skill-instrucoes">
                                  {skill.instrucoes || "(Sem instruções)"}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User Skills */}
                  <div className="skills-group">
                    <h3 className="skills-group-title">Minhas Skills</h3>
                    {userSkills.length === 0 ? (
                      <div className="skills-empty">
                        <span className="empty-icon">📭</span>
                        <p>Você ainda não criou nenhuma habilidade personalizada.</p>
                        <Button variant="outline" size="sm" onClick={openCreateDialog}>
                          Criar Primeira Skill
                        </Button>
                      </div>
                    ) : (
                      <div className="skills-list">
                        {userSkills.map((skill) => (
                          <div key={skill.id} className={`skill-card ${expandedSkill === skill.id ? "expanded" : ""}`}>
                            <div
                              className="skill-card-header"
                              onClick={() =>
                                setExpandedSkill(expandedSkill === skill.id ? null : skill.id)
                              }
                            >
                              <span className="skill-card-icon">🧩</span>
                              <div className="skill-card-info">
                                <span className="skill-card-nome">{skill.nome}</span>
                                {skill.descricao && (
                                  <span className="skill-card-desc">{skill.descricao}</span>
                                )}
                              </div>
                              <Badge variant={skill.ativa ? "default" : "outline"} className="text-[10px]">
                                {skill.ativa ? "Ativa" : "Inativa"}
                              </Badge>
                              <div className="skill-card-actions" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditDialog(skill)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteSkill(skill.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              {expandedSkill === skill.id ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            {expandedSkill === skill.id && (
                              <div className="skill-card-body">
                                <label>Instruções</label>
                                <pre className="skill-instrucoes">
                                  {skill.instrucoes || "(Sem instruções)"}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ===== TEMAS ===== */}
          {activeTab === "temas" && (
            <section className="config-section">
              <h2>Temas</h2>
              <p className="section-desc">Escolha a aparência do sistema</p>

              <div className="temas-grid">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={`tema-card ${theme === opt.value ? "active" : ""}`}
                    >
                      <Icon className="h-8 w-8" />
                      <span className="tema-label">{opt.label}</span>
                      <span className="tema-desc">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Skill Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSaveSkill}>
            <DialogHeader>
              <DialogTitle>
                {editSkill ? "Editar Skill" : "Nova Skill"}
              </DialogTitle>
              <DialogDescription>
                Configure uma habilidade para a IA usar nos chats
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="skill-nome">Nome *</Label>
                <Input
                  id="skill-nome"
                  value={skillForm.nome}
                  onChange={(e) =>
                    setSkillForm((s) => ({ ...s, nome: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-desc">Descrição</Label>
                <Input
                  id="skill-desc"
                  value={skillForm.descricao}
                  onChange={(e) =>
                    setSkillForm((s) => ({
                      ...s,
                      descricao: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-inst">Instruções</Label>
                <Textarea
                  id="skill-inst"
                  value={skillForm.instrucoes}
                  onChange={(e) =>
                    setSkillForm((s) => ({
                      ...s,
                      instrucoes: e.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Instruções que a IA deve seguir quando esta skill estiver ativa..."
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
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editSkill ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
