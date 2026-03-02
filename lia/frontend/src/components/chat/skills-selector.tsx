"use client";

import { useState } from "react";
import type { Skill } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Check } from "lucide-react";

interface SkillsSelectorProps {
  skills: Skill[];
  selectedSkills: number[];
  onToggle: (skillId: number) => void;
  disabled?: boolean;
}

export function SkillsSelector({
  skills,
  selectedSkills,
  onToggle,
  disabled,
}: SkillsSelectorProps) {
  const [open, setOpen] = useState(false);

  // Ordena para que as do usuário (user) fiquem no topo
  const sortedSkills = [...skills].sort((a, b) => {
    if (a.escopo === "user" && b.escopo !== "user") return -1;
    if (a.escopo !== "user" && b.escopo === "user") return 1;
    return 0;
  });

  const selectedCount = selectedSkills.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-1 px-2"
          disabled={disabled || skills.length === 0}
        >
          <Sparkles className="h-3 w-3" />
          Habilidades
          {selectedCount > 0 && (
            <Badge
              variant="secondary"
              className="h-4 min-w-4 px-1 text-[9px] bg-primary/10 text-primary"
            >
              {selectedCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto p-1">
        {sortedSkills.map((skill) => (
          <SkillItem
            key={skill.id}
            skill={skill}
            selected={selectedSkills.includes(skill.id)}
            onToggle={onToggle}
          />
        ))}

        {skills.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            Nenhuma habilidade disponível
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SkillItem({
  skill,
  selected,
  onToggle,
}: {
  skill: Skill;
  selected: boolean;
  onToggle: (id: number) => void;
}) {
  return (
    <button
      onClick={() => onToggle(skill.id)}
      className={`w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent ${
        selected ? "bg-accent/50" : ""
      }`}
    >
      <div
        className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          selected
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30"
        }`}
      >
        {selected && <Check className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {skill.nome}
          {skill.escopo === "system" && (
            <span className="ml-1.5 text-[9px] text-muted-foreground font-normal bg-muted px-1 py-0.5 rounded uppercase">Padrão</span>
          )}
        </p>
        {skill.descricao && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">
            {skill.descricao}
          </p>
        )}
      </div>
    </button>
  );
}
