"use client";

import React, { useState } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";

interface ReasoningBlockProps {
  content: string;
  defaultExpanded?: boolean;
}

export const ReasoningBlock = React.memo(function ReasoningBlock({
  content,
  defaultExpanded = false,
}: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain className="h-3 w-3" />
        <span>Raciocínio</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      {expanded && (
        <div className="mt-1.5 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-muted-foreground/20 max-h-48 overflow-y-auto">
          {content}
        </div>
      )}
    </div>
  );
});
