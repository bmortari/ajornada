"use client";

import { useParams } from "next/navigation";
import ETPPipelineStepper from "@/components/etp-pipeline/etp-pipeline-stepper";
import "@/components/etp-pipeline/etp-pipeline.css";

export default function ETPPipelinePage() {
  const params = useParams();
  const projetoId = params.id as string;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">🚀 Pipeline ETP</h1>
        <p className="text-sm text-muted-foreground">
          Estudo Técnico Preliminar — Geração Assistida em 6 Passos
        </p>
      </div>
      <ETPPipelineStepper projetoId={projetoId} />
    </div>
  );
}
