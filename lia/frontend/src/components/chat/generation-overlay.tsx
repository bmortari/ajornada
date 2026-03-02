"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GenerationOverlayProps {
  artifactLabel: string;
  artifactSigla: string;
  artifactColor: string;
  generationProgress: number;
  currentGeneratingField?: string;
}

const GENERATION_MESSAGES = [
  "Analisando dados do projeto...",
  "Consultando base de conhecimento...",
  "Elaborando conteúdo estruturado...",
  "Aplicando normas e diretrizes...",
  "Formatando documento...",
  "Validando informações...",
];

export function GenerationOverlay({
  artifactLabel,
  artifactSigla,
  artifactColor,
  generationProgress,
  currentGeneratingField,
}: GenerationOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % GENERATION_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background p-8">
      {/* Animated icon */}
      <div className="relative mb-8">
        {/* Outer pulsing circle */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{
            backgroundColor: artifactColor,
            width: "120px",
            height: "120px",
          }}
        />
        
        {/* Middle rotating circle */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background: `conic-gradient(from 0deg, ${artifactColor}00, ${artifactColor})`,
            width: "120px",
            height: "120px",
          }}
        />
        
        {/* Inner static circle with icon */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            backgroundColor: `${artifactColor}15`,
            width: "120px",
            height: "120px",
          }}
        >
          <div
            className="absolute inset-4 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: artifactColor,
              color: "#fff",
            }}
          >
            <FileText className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <Badge
          className="text-xs px-2 py-0.5"
          style={{ backgroundColor: artifactColor, color: "#fff" }}
        >
          {artifactSigla}
        </Badge>
        <h2 className="text-xl font-semibold">Gerando {artifactLabel}</h2>
      </div>

      {/* Cycling message */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 min-h-6">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <p className="animate-in fade-in duration-300" key={messageIndex}>
          {GENERATION_MESSAGES[messageIndex]}
        </p>
      </div>

      {/* Current field */}
      {currentGeneratingField && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 animate-in slide-in-from-bottom-2 duration-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Gerando: {currentGeneratingField}</span>
        </div>
      )}

      {/* Progress bar removed per UI request */}

      {/* Hint */}
      <p className="text-xs text-muted-foreground mt-8 text-center max-w-md">
        A IA está elaborando o conteúdo com base nas informações fornecidas.
        <br />
        Em breve você poderá revisar e editar cada campo.
      </p>
    </div>
  );
}
