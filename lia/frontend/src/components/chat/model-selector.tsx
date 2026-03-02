"use client";

import { useState } from "react";
import type { IAModel, IAModelsResponse } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import api from "@/lib/api";

interface ModelSelectorProps {
  models: IAModel[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
  tiers?: IAModelsResponse["tiers"];
  disabled?: boolean;
  compact?: boolean;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelect,
  disabled,
  compact,
}: ModelSelectorProps) {
  const selectedModelObj = models.find((m) => m.id === selectedModel);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ ms: number; ok: boolean } | null>(null);

  async function handlePing(e: React.MouseEvent) {
    e.stopPropagation();
    if (!selectedModel || pinging) return;
    setPinging(true);
    setPingResult(null);
    try {
      const res = await api.get<{ tempo_ms: number; status: string }>(
        `/api/ping-modelo/${encodeURIComponent(selectedModel)}`
      );
      setPingResult({ ms: res.tempo_ms, ok: res.status === "online" });
    } catch {
      setPingResult({ ms: 0, ok: false });
    } finally {
      setPinging(false);
    }
  }

  return (
    <div className="flex items-center rounded-md border overflow-hidden" style={{ height: compact ? '28px' : '32px' }}>
      <Select value={selectedModel} onValueChange={onSelect} disabled={disabled}>
        <SelectTrigger
          className={`border-0 rounded-none shadow-none focus:ring-0 ${compact ? "h-7 text-[11px] w-36" : "h-8 text-xs w-44"}`}
        >
          <SelectValue placeholder="Modelo IA">
            {selectedModelObj && (
              <span className="flex items-center gap-1.5 truncate">
                <span>{selectedModelObj.icon || "🤖"}</span>
                <span className="truncate">{selectedModelObj.name}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
      <SelectContent className="max-h-72">
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} className="text-xs">
            <div className="flex items-center gap-2">
              <span>{model.icon || "🤖"}</span>
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                {model.description && (
                  <span className="text-[10px] text-muted-foreground">
                    {model.description}
                  </span>
                )}
              </div>
              {model.tier === "free" && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600"
                >
                  Free
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
      {/* Divider */}
      <div className="w-px bg-border self-stretch" />
      {/* Ping button + latency */}
      <button
        type="button"
        onClick={handlePing}
        disabled={disabled || pinging}
        title="Testar modelo"
        className="px-1.5 flex items-center justify-center gap-0.5 hover:bg-muted transition-colors disabled:opacity-50"
        style={{ height: '100%' }}
      >
        <Zap className={`h-3.5 w-3.5 ${
          pinging ? 'text-amber-300 animate-pulse' :
          pingResult === null ? 'text-amber-500' :
          pingResult.ok ? 'text-emerald-500' : 'text-red-500'
        }`} />
        {pingResult !== null && (
          <span className={`text-[10px] font-mono leading-none ${
            pingResult.ok ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {pingResult.ok ? `${pingResult.ms}ms` : 'ERR'}
          </span>
        )}
      </button>
    </div>
  );
}
