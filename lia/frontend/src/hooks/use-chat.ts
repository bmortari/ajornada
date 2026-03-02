import { useState, useCallback, useRef, useEffect } from "react";
import { streamSSE, createAbortController, type SSEEvent } from "@/lib/sse";
import type { ChatMessage, UploadedFile } from "@/types";

interface UseChatOptions {
  tipo: string;
  projetoId: string;
}

type ChatPhase = "preparation" | "generation" | "workspace";

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isDeepResearching: boolean;
  currentReasoning: string;
  currentContent: string;
  canGenerate: boolean;
  generateMessage: string;
  phase: ChatPhase;
  artifactData: Record<string, string>;
  generationProgress: number;
  sendMessage: (
    content: string,
    model?: string,
    files?: string[],
    skills?: number[]
  ) => Promise<void>;
  generateArtifact: (model?: string, skills?: number[]) => Promise<void>;
  regenerateField: (
    campo: string,
    instrucao: string,
    model?: string,
    skills?: number[],
    files?: UploadedFile[]
  ) => Promise<string>;
  stopStreaming: () => void;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setPhase: React.Dispatch<React.SetStateAction<ChatPhase>>;
  setArtifactData: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  updateField: (key: string, value: string) => void;
}

export function useChat({ tipo, projetoId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDeepResearching, setIsDeepResearching] = useState(false);
  const [currentReasoning, setCurrentReasoning] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [canGenerate, setCanGenerate] = useState(false);
  const [generateMessage, setGenerateMessage] = useState("");
  const [phase, setPhase] = useState<ChatPhase>("preparation");
  const [artifactData, setArtifactData] = useState<Record<string, string>>({});
  const [generationProgress, setGenerationProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  // keep a ref in sync so callbacks can read latest messages synchronously
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(
    async (
      content: string,
      model?: string,
      files?: string[],
      skills?: number[]
    ) => {
      if (isStreaming) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      // append message to UI immediately
      setMessages((prev) => [...prev, userMessage]);

      setIsStreaming(true);
      setCurrentContent("");
      setCurrentReasoning("");

      const controller = createAbortController();
      abortRef.current = controller;

      // Use ref to ensure we have the latest messages (including the just-pushed user message)
      const history = [...messagesRef.current, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        let finalContent = "";
        let finalReasoning = "";

        await streamSSE({
          url: `/api/ia-native/${tipo}/chat/${projetoId}`,
          body: {
            mensagem: content,
            modelo: model,
            historico: history,
            arquivos: files || [],
            skills: skills || [],
          },
          signal: controller.signal,
          onMessage: (event) => {
            switch (event.type) {
              case "reasoning":
                // Accumulate reasoning chunks (TRUE STREAMING)
                finalReasoning += event.content || "";
                setCurrentReasoning(finalReasoning);
                break;
              case "chunk":
                // Accumulate content chunks (TRUE STREAMING)
                finalContent += event.content || "";
                setCurrentContent(finalContent);
                break;
              case "action":
                if (event.action === "generate") {
                  setCanGenerate(true);
                  setGenerateMessage(
                    event.message || "Informações suficientes! Pronto para gerar."
                  );
                } else if (event.action === "search_arp") {
                  setIsDeepResearching(true);
                  // We append a system message to indicate research has started
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      role: "system" as const, // We might need to add system to ChatMessage type if not there, or use assistant
                      content: `Iniciando pesquisa em bases de Atas de Registro de Preços para "${event.arguments ? JSON.parse(event.arguments).palavra_chave : 'o objeto'}"...`,
                      timestamp: new Date(),
                      metadata: { searchArpArgs: event.arguments }
                    },
                  ]);
                  
                  // Trigger backend deep research tool
                  triggerDeepResearch(event.arguments);
                }
                break;
              case "done":
                // Only add assistant message if there is actual content
                if (finalContent) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      role: "assistant" as const,
                      content: finalContent,
                      reasoning: finalReasoning || undefined,
                      timestamp: new Date(),
                    },
                  ]);
                }
                setCurrentContent("");
                setCurrentReasoning("");
                setIsStreaming(false);
                break;
              case "error":
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant" as const,
                    content: `Erro: ${event.error || "Falha na comunicação com a IA"}`,
                    timestamp: new Date(),
                  },
                ]);
                setIsStreaming(false);
                setCurrentContent("");
                setCurrentReasoning("");
                break;
            }
          },
          onError: (err) => {
            if (err.name !== "AbortError") {
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: "assistant" as const,
                  content: "Erro na comunicação com o servidor.",
                  timestamp: new Date(),
                },
              ]);
            }
            setIsStreaming(false);
            setCurrentContent("");
            setCurrentReasoning("");
          },
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setIsStreaming(false);
          setIsDeepResearching(false);
        }
      }
    },
    [isStreaming, messages, tipo, projetoId]
  );

  const triggerDeepResearch = useCallback(async (argsStr?: string) => {
    try {
      let args = {};
      if (argsStr) {
        try { args = JSON.parse(argsStr); } catch (e) {}
      }
      
      const response = await fetch(`/api/ia-native/${tipo}/tools/search_arp/${projetoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== "undefined" && localStorage.getItem("lia_token") 
              ? { 'Authorization': `Bearer ${localStorage.getItem("lia_token")}` } 
              : {})
        },
        body: JSON.stringify(args)
      });
      
      if (!response.ok) throw new Error("Falha na pesquisa profunda");
      
      const result = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.message || "Pesquisa concluída. Foram encontradas atas compatíveis e os campos do ETP foram pré-preenchidos. O que deseja fazer?",
          timestamp: new Date(),
          metadata: { arpResult: result.data }
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Erro durante a pesquisa de ARPs: ${(err as Error).message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsDeepResearching(false);
    }
  }, [tipo, projetoId]);

  const generateArtifact = useCallback(
    async (model?: string, skills?: number[]) => {
      if (isStreaming) return;

      setPhase("generation");
      setIsStreaming(true);
      setCurrentContent("");
      setCurrentReasoning("");
      setGenerationProgress(0);

      const controller = createAbortController();
      abortRef.current = controller;

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        let totalFields = 0;
        let completedFields = 0;
        let accumulatedReasoning = "";
        let accumulatedContent = "";

        await streamSSE({
          url: `/api/ia-native/${tipo}/chat/${projetoId}/gerar`,
          body: { modelo: model, historico: history, skills: skills || [] },
          signal: controller.signal,
          onMessage: (event) => {
            switch (event.type) {
              case "reasoning":
                // Accumulate reasoning chunks (TRUE STREAMING)
                accumulatedReasoning += event.content || "";
                setCurrentReasoning(accumulatedReasoning);
                break;
              case "chunk":
                // Accumulate content chunks (TRUE STREAMING)
                accumulatedContent += event.content || "";
                setCurrentContent(accumulatedContent);
                break;
              case "action":
                if (event.action === "field_start") {
                  totalFields = Math.max(totalFields, completedFields + 1);
                } else if (event.action === "field_complete" && event.campo) {
                  completedFields++;
                  setArtifactData((prev) => ({
                    ...prev,
                    [event.campo!]: event.content || "",
                  }));
                  if (totalFields > 0) {
                    setGenerationProgress(
                      Math.round((completedFields / totalFields) * 100)
                    );
                  }
                }
                break;
              case "complete":
                if (event.data && typeof event.data === "object") {
                  setArtifactData((prev) => ({
                    ...prev,
                    ...(event.data as Record<string, string>),
                  }));
                }
                setPhase("workspace");
                setGenerationProgress(100);
                setIsStreaming(false);
                setCurrentContent("");
                setCurrentReasoning("");
                setCanGenerate(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant" as const,
                    content:
                      "✅ Artefato gerado com sucesso! Revise os campos no painel à direita.",
                    timestamp: new Date(),
                  },
                ]);
                break;
              case "error":
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant" as const,
                    content: `Erro na geração: ${event.error}`,
                    timestamp: new Date(),
                  },
                ]);
                setPhase("preparation");
                setIsStreaming(false);
                setCurrentContent("");
                setCurrentReasoning("");
                break;
            }
          },
          onError: () => {
            setPhase("preparation");
            setIsStreaming(false);
          },
        });
      } catch {
        setPhase("preparation");
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, tipo, projetoId]
  );

  const regenerateField = useCallback(
    async (
      campo: string,
      instrucao: string,
      model?: string,
      skills?: number[],
      files?: UploadedFile[]
    ): Promise<string> => {
      if (isStreaming) return "";

      setIsStreaming(true);
      setCurrentContent("");

      const controller = createAbortController();
      abortRef.current = controller;

      let result = "";

      // Prepare attachments payload
      const attachments = files?.map((f) => ({
        file_id: f.file_id,
        filename: f.filename,
        extracted_text: f.extracted_text,
      })) || [];

      try {
        await streamSSE({
          url: `/api/ia-native/${tipo}/chat/${projetoId}/regenerar-campo`,
          body: {
            campo,
            instrucao,
            modelo: model,
            skills: skills || [],
            arquivos: attachments,
          },
          signal: controller.signal,
          onMessage: (event) => {
            switch (event.type) {
              case "chunk":
                // Accumulate chunks (TRUE STREAMING)
                result += event.content || "";
                setCurrentContent(result);
                break;
              case "done":
                if (event.content) {
                  result = event.content;
                }
                setArtifactData((prev) => ({
                  ...prev,
                  [campo]: result,
                }));
                setIsStreaming(false);
                setCurrentContent("");
                break;
              case "error":
                setIsStreaming(false);
                setCurrentContent("");
                break;
            }
          },
          onError: () => {
            setIsStreaming(false);
            setCurrentContent("");
          },
        });
      } catch {
        setIsStreaming(false);
      }

      return result;
    },
    [isStreaming, tipo, projetoId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentContent("");
    setCurrentReasoning("");
    setCanGenerate(false);
    setPhase("preparation");
    setArtifactData({});
    setGenerationProgress(0);
  }, []);

  const updateField = useCallback((key: string, value: string) => {
    setArtifactData((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
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
    clearMessages,
    setMessages,
    setPhase,
    setArtifactData,
    updateField,
  };
}
