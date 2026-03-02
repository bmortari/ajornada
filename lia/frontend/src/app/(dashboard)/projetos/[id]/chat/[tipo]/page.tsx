"use client";

import { useEffect, useState, useRef, use, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/contexts/auth-context";
import type {
  IAModel,
  IAModelsResponse,
  Skill,
  Projeto,
  PacItem,
  ArtefatoRemoteConfig,
  UploadedFile,
  ChatInitResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChatMessages,
  ChatInput,
  ContextPanel,
  WorkspacePanel,
  ReasoningBlock,
} from "@/components/chat";
import { MarkdownContent } from "@/components/chat/markdown-content";
import { GenerationOverlay } from "@/components/chat/generation-overlay";
import {
  ArrowLeft,
  Bot,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { toast } from "sonner";

// Artifact types → display names
const ARTIFACT_NAMES: Record<string, string> = {
  dfd: "DFD - Documento de Formalização da Demanda",
  etp: "ETP - Estudo Técnico Preliminar",
  tr: "TR - Termo de Referência",
  pgr: "PGR - Plano de Gerenciamento de Riscos",
  riscos: "PGR - Plano de Gerenciamento de Riscos",
  edital: "Edital de Licitação",
  pesquisa_precos: "Pesquisa de Preços",
  jep: "Justificativa de Contratação não Planejada",
  checklist_conformidade: "Checklist de Instrução (AGU/SEGES)",
  rdve: "RDVE - Relatório de Demonstração de Vantagem Econômica",
  jva: "JVA - Justificativa de Vantagem da Adesão",
  tafo: "TAFO - Termo de Aceite do Fornecedor",
  trs: "TRS - Termo de Referência Simplificado",
  ade: "ADE - Aviso de Dispensa Eletrônica",
  jpef: "JPEF - Justificativa de Preço e Escolha de Fornecedor",
  ce: "CE - Certidão de Enquadramento",
  minuta_contrato: "Minuta de Contrato",
  aviso_publicidade_direta: "Aviso de Dispensa de Licitação",
  justificativa_fornecedor_escolhido: "Justificativa do Fornecedor Escolhido",
};

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string; tipo: string }>;
}) {
  const { id, tipo } = use(params);
  const router = useRouter();

  const [inputValue, setInputValue] = useState("");
  const [showPanel, setShowPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [chatWidthPct, setChatWidthPct] = useState(65);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const startX = e.clientX;
    const startWidth = chatWidthPct;
    const contentRect = contentEl.getBoundingClientRect();

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newPct = startWidth + (dx / contentRect.width) * 100;
      const clamped = Math.min(Math.max(newPct, 20), 80);
      setChatWidthPct(clamped);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [chatWidthPct]);
  const { user: currentUser } = useAuth();
  const [models, setModels] = useState<IAModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [pacItems, setPacItems] = useState<PacItem[]>([]);
  const [artifactConfig, setArtifactConfig] =
    useState<ArtefatoRemoteConfig | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dfdData, setDfdData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat hook
  const {
    messages,
    isStreaming,
    isDeepResearching,
    currentReasoning,
    currentContent,
    canGenerate,
    generateMessage,
    phase,
    artifactData,
    generationProgress,
    sendMessage,
    generateArtifact,
    regenerateField,
    stopStreaming,
    setMessages,
    updateField,
  } = useChat({ tipo, projetoId: id });

  // ======== INIT ========
  useEffect(() => {
    async function init() {
      try {
        const [modelsResp, skillsData, projetoData, configData, chatInit] =
          await Promise.all([
            api
              .get<IAModelsResponse>("/api/ia/models")
              .catch(() => ({ models: [], default: "", tiers: {} })),
            api.get<Skill[]>("/api/skills").catch(() => []),
            api.get<Projeto>(`/api/projetos/${id}`).catch(() => null),
            api
              .get<Record<string, ArtefatoRemoteConfig>>(
                "/api/config/artefatos"
              )
              .catch(() => ({} as Record<string, ArtefatoRemoteConfig>)),
            api
              .get<ChatInitResponse>(
                `/api/ia-native/${tipo}/chat/init/${id}`
              )
              .catch(() => null),
          ]);

        // Models
        setModels(modelsResp.models || []);
        setSelectedModel(
          modelsResp.default ||
            (modelsResp.models?.length ? modelsResp.models[0].id : "")
        );

        // Skills — activate all user skills by default
        setSkills(skillsData);
        setSelectedSkills(
          skillsData
            .filter((s: Skill) => s.escopo === "user")
            .map((s: Skill) => s.id)
        );

        // Project
        if (projetoData) {
          setProjeto(projetoData);
          // PAC items are included in the project response
          if (projetoData.itens_pac && Array.isArray(projetoData.itens_pac)) {
            setPacItems(projetoData.itens_pac);
          }
        }

        // Artifact config
        const typedConfig = configData as Record<string, ArtefatoRemoteConfig>;
        if (typedConfig && typedConfig[tipo]) {
          setArtifactConfig(typedConfig[tipo]);
        }

        // Chat init message
        if (chatInit) {
          if (chatInit.dfd_data) {
            setDfdData(chatInit.dfd_data);
          }
          if (chatInit.mensagem_inicial) {
            setMessages([
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: chatInit.mensagem_inicial,
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch {
        toast.error("Erro ao inicializar chat");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [tipo, id, setMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentContent, currentReasoning]);

  // Adjust width when phase changes
  useEffect(() => {
    if (phase === "preparation") {
      setChatWidthPct(65);
    } else {
      setChatWidthPct(35);
    }
  }, [phase]);

  // ======== HANDLERS ========
  async function handleSend() {
    const content = inputValue.trim();
    if (!content || isStreaming) return;
    setInputValue("");
    await sendMessage(
      content,
      selectedModel,
      uploadedFiles.map((f) => f.file_id),
      selectedSkills
    );
  }

  async function handleGenerate() {
    await generateArtifact(selectedModel, selectedSkills);
  }

  function handleSkillToggle(skillId: number) {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  }

  async function handleRegenerateField(
    campo: string,
    instrucao: string,
    model?: string,
    skills?: number[],
    files?: UploadedFile[]
  ) {
    return regenerateField(campo, instrucao, model, skills, files);
  }

  const artifactName =
    artifactConfig?.titulo || ARTIFACT_NAMES[tipo] || tipo.toUpperCase();
  const artifactSigla = artifactConfig?.sigla || tipo.toUpperCase();
  const artifactColor = artifactConfig?.cor || "#3182CE";

  const arpData = useMemo(() => {
    // Find latest message with arpResult
    const msgWithArp = [...messages].reverse().find(m => m.metadata?.arpResult);
    return msgWithArp?.metadata?.arpResult;
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Inicializando chat...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* ===== HEADER ===== */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
        <Link
          href={`/projetos/${id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border mt-1"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              className="text-[10px] px-1.5 py-0"
              style={{ backgroundColor: artifactColor, color: "#fff" }}
            >
              {artifactSigla}
            </Badge>
            <h1 className="text-sm font-semibold truncate">{artifactName}</h1>
          </div>
          {projeto && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {projeto.nome}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              phase === "preparation"
                ? "secondary"
                : phase === "generation"
                  ? "default"
                  : "outline"
            }
            className="text-[10px]"
          >
            {phase === "preparation"
              ? "Preparação"
              : phase === "generation"
                ? "Gerando..."
                : "Workspace"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowPanel(!showPanel)}
            title={showPanel ? "Ocultar painel" : "Mostrar painel"}
          >
            {showPanel ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 min-h-0" ref={contentRef}>
        {/* ===== CHAT AREA (left) ===== */}
        <div
          className="flex flex-col min-w-[280px]"
          style={{ 
            width: showPanel ? `${chatWidthPct}%` : '100%', 
            flex: showPanel ? 'none' : 1,
            transition: 'width 0.1s ease-out'
          }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto py-4 px-4 space-y-4">
              {/* Welcome if no messages */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: `${artifactColor}15`,
                      color: artifactColor,
                    }}
                  >
                    <Bot className="h-7 w-7" />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">
                    Assistente {artifactSigla}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Sou a <strong>LIA</strong>, sua assistente para elaboração
                    do {artifactName} conforme a Lei 14.133/2021. Me conte sobre
                    sua necessidade para começarmos!
                  </p>
                </div>
              )}

              {/* Message list */}
              <ChatMessages messages={messages} />

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {currentReasoning && (
                      <ReasoningBlock
                        content={currentReasoning}
                        defaultExpanded
                      />
                    )}
                    {currentContent && phase === "preparation" && (
                      <div className="inline-block rounded-2xl rounded-bl-md px-4 py-2.5 bg-muted text-sm border shadow-sm">
                        <MarkdownContent
                          content={currentContent}
                          className="prose-sm dark:prose-invert"
                        />
                      </div>
                    )}
                    {phase === "generation" && currentContent && (
                      <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm">Construindo as seções do documento...</span>
                      </div>
                    )}
                    {!currentContent && !currentReasoning && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Pensando...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <ChatInput
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={handleSend}
            onStop={stopStreaming}
            onGenerate={handleGenerate}
            onForceGenerate={handleGenerate}
            isStreaming={isStreaming}
            canGenerate={canGenerate}
            generateMessage={generateMessage}
            models={models}
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
            skills={skills}
            selectedSkills={selectedSkills}
            onSkillToggle={handleSkillToggle}
            uploadedFiles={uploadedFiles}
            onFilesChange={setUploadedFiles}
            artifactType={tipo}
            disabled={phase === "generation"}
            phase={phase}
            isDeepResearching={isDeepResearching}
          />
        </div>

        {/* ===== RIGHT PANEL ===== */}
        {showPanel && (
          <>
            <div 
              className="w-1.5 cursor-col-resize relative z-10 flex items-center justify-center shrink-0 bg-transparent hover:bg-accent/50 active:bg-accent/50 transition-colors"
              onMouseDown={handleMouseDown}
            >
              <div className="w-[3px] h-10 rounded-full bg-border transition-colors hover:bg-primary" />
            </div>
            <div className="flex-1 flex flex-col border-l bg-card min-w-[280px] hidden md:flex min-w-0">
            {phase === "preparation" ? (
              <ContextPanel
                projeto={projeto}
                pacItems={pacItems}
                artifactConfig={artifactConfig}
                artifactType={tipo}
                uploadedFilesCount={uploadedFiles.length}
                dfdData={dfdData}
              />
            ) : phase === "generation" ? (
              <GenerationOverlay
                artifactLabel={artifactName}
                artifactSigla={artifactSigla}
                artifactColor={artifactColor}
                generationProgress={generationProgress}
              />
            ) : (
              <WorkspacePanel
                artifactType={tipo}
                artifactLabel={artifactSigla}
                artifactColor={artifactColor}
                projetoId={id}
                isGenerating={false}
                generationProgress={generationProgress}
                artifactData={artifactData}
                camposConfig={artifactConfig?.campos_config || {}}
                onUpdateField={updateField}
                onRegenerateField={handleRegenerateField}
                isStreaming={isStreaming}
                models={models}
                skills={skills}
                selectedModel={selectedModel}
                selectedSkills={selectedSkills}
                projeto={projeto}
                arpData={arpData}
                currentUser={currentUser}
              />
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
