"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Zap, Star } from "lucide-react";
import type { IAModel, Skill, UploadedFile } from "@/types";
import { ModelSelector } from "./model-selector";
import { SkillsSelector } from "./skills-selector";
import { FileAttachment } from "./file-attachment";

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onGenerate: () => void;
  isStreaming: boolean;
  canGenerate: boolean;
  generateMessage: string;
  // Model
  models: IAModel[];
  selectedModel: string;
  onModelSelect: (id: string) => void;
  // Skills
  skills: Skill[];
  selectedSkills: number[];
  onSkillToggle: (id: number) => void;
  // Files
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  // Misc
  artifactType: string;
  disabled?: boolean;
  onForceGenerate?: () => void;
  phase?: string;
  isDeepResearching?: boolean;
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSend,
  onStop,
  onGenerate,
  isStreaming,
  canGenerate,
  generateMessage,
  models,
  selectedModel,
  onModelSelect,
  skills,
  selectedSkills,
  onSkillToggle,
  uploadedFiles,
  onFilesChange,
  artifactType,
  disabled = false,
  onForceGenerate,
  phase = "preparation",
  isDeepResearching = false,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // keep input focused when streaming ends to avoid extra clicks
  useEffect(() => {
    try {
      if (inputRef.current && !isStreaming && phase !== "generation" && !disabled) {
        inputRef.current.focus();
      }
    } catch {}
  }, [isStreaming, phase, disabled]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="border-t bg-background pt-4 pb-3 px-6 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      {/* Generate banner */}
      {canGenerate && !isStreaming && !disabled && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {generateMessage}
            </span>
          </div>
          <Button
            onClick={onGenerate}
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            disabled={disabled}
          >
            <Zap className="h-3.5 w-3.5" />
            Gerar {artifactType.toUpperCase()}
          </Button>
        </div>
      )}

      {/* File attachments */}
      {uploadedFiles.length > 0 && (
        <div className="mb-2">
          <FileAttachment
            uploadedFiles={uploadedFiles}
            onFilesChange={onFilesChange}
            disabled={disabled || isStreaming}
          />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 bg-muted/40 dark:bg-muted/20 border rounded-2xl p-2 pr-3 transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 shadow-sm">

        {/* Text area */}
        <div className="flex-1">
            <Textarea
            ref={inputRef}
            placeholder={`Converse sobre o ${artifactType.toUpperCase()}...`}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="resize-none border-0 shadow-none focus-visible:ring-0 px-2 py-3 text-[15px] bg-transparent min-h-[44px] max-h-[200px]"
            // allow typing while assistant is streaming; only block during artifact generation or deep research
            disabled={disabled || isDeepResearching || phase === "generation"}
          />
        </div>

        {/* Send / Stop */}
        <div className="pb-1 pr-1 flex items-center gap-1">
          {!isStreaming && onForceGenerate && (
            <button
              type="button"
              title="Forçar geração agora"
              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              onClick={onForceGenerate}
              disabled={disabled}
            >
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            </button>
          )}
            {isStreaming ? (
            <Button
              variant="destructive"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0 shadow-sm hover:shadow-md transition-all"
              onClick={onStop}
                disabled={disabled}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0 bg-black text-white shadow-sm hover:shadow-md hover:bg-black/90 transition-all"
              onClick={onSend}
                disabled={(disabled || phase === "generation") || !inputValue.trim()}
            >
              <Send className="h-4 w-4 ml-0.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar row */}
      <div className="flex items-center gap-2 mt-2">
        <FileAttachment
          uploadedFiles={[]}
          onFilesChange={(newFiles) =>
            onFilesChange([...uploadedFiles, ...newFiles])
          }
          disabled={disabled || isDeepResearching || phase === "generation"}
        />
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onSelect={onModelSelect}
          disabled={disabled || isDeepResearching || phase === "generation"}
          compact
        />
        <SkillsSelector
          skills={skills}
          selectedSkills={selectedSkills}
          onToggle={onSkillToggle}
          disabled={disabled || isDeepResearching || phase === "generation"}
        />
        <span className="flex-1" />
        <span className="text-[10px] text-muted-foreground">
          Shift+Enter nova linha • Enter envia
        </span>
      </div>
    </div>
  );
}
