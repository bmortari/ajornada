"use client";

import React, { useState } from "react";
import { useEtpPipeline, ItemDFD } from "@/hooks/use-etp-pipeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ── Step config ───────────────────────────────────────────────

const STEPS = [
  { num: 1, title: "Revisão DFD", icon: "📋", desc: "Revisar itens e unidades de medida" },
  { num: 2, title: "CATMAT/CATSERV", icon: "🔍", desc: "Buscar e confirmar códigos do catálogo" },
  { num: 3, title: "Buscar ARPs", icon: "📄", desc: "Verificar Atas de Registro de Preços" },
  { num: 4, title: "Pesquisa Mercado", icon: "💰", desc: "Levantamento IN 65/2021" },
  { num: 5, title: "Deep Research", icon: "🧠", desc: "Entrevista IA para detalhes finais" },
  { num: 6, title: "Gerar ETP", icon: "🚀", desc: "Geração final do documento" },
];

// ── Stepper Header ────────────────────────────────────────────

function StepperHeader({ passoAtual, statusPassos, caminho }: {
  passoAtual: number;
  statusPassos: Record<string, string>;
  caminho: string;
}) {
  return (
    <div className="stepper-header">
      <div className="stepper-track">
        {STEPS.map((step, idx) => {
          const status = statusPassos[String(step.num)] || "pendente";
          const isActive = step.num === passoAtual;
          const isPulado = status === "pulado" || (caminho === "carona" && step.num === 4);
          
          return (
            <React.Fragment key={step.num}>
              {idx > 0 && (
                <div className={`stepper-line ${
                  status === "concluido" || isPulado ? "completed" : ""
                }`} />
              )}
              <div className={`stepper-step ${
                isActive ? "active" : ""
              } ${status === "concluido" ? "completed" : ""} ${
                isPulado ? "skipped" : ""
              }`}>
                <div className="stepper-circle">
                  {status === "concluido" ? "✓" : isPulado ? "—" : step.icon}
                </div>
                <span className="stepper-label">{step.title}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 1: Revisão DFD ───────────────────────────────────────

function Step1DFDReview({ pipeline }: { pipeline: ReturnType<typeof useEtpPipeline> }) {
  const [itens, setItens] = useState<ItemDFD[]>([
    { descricao: "", unidade_medida: "", quantidade: 1 }
  ]);

  const addItem = () => setItens([...itens, { descricao: "", unidade_medida: "", quantidade: 1 }]);
  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ItemDFD, value: string | number) => {
    const updated = [...itens];
    const item = { ...updated[idx], [field]: value } as ItemDFD;
    updated[idx] = item;
    setItens(updated);
  };

  return (
    <div className="step-content">
      <h3>📋 Passo 1: Revisar Itens do DFD</h3>
      {pipeline.state?.descricao_objeto && (
        <Card className="p-4 mb-4 bg-muted/50">
          <p className="text-sm text-muted-foreground mb-1">Objeto:</p>
          <p>{pipeline.state.descricao_objeto}</p>
        </Card>
      )}
      
      <div className="space-y-3">
        {itens.map((item, idx) => (
          <Card key={idx} className="p-3 flex gap-3 items-start">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Descrição do item"
                value={item.descricao}
                onChange={(e) => updateItem(idx, "descricao", e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Unidade (ex: unidade, kg, litro)"
                  value={item.unidade_medida || ""}
                  onChange={(e) => updateItem(idx, "unidade_medida", e.target.value)}
                  className="w-48"
                />
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={item.quantidade || ""}
                  onChange={(e) => updateItem(idx, "quantidade", Number(e.target.value))}
                  className="w-24"
                />
              </div>
            </div>
            {itens.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>✕</Button>
            )}
          </Card>
        ))}
      </div>
      
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={addItem}>+ Adicionar Item</Button>
        <Button 
          onClick={() => pipeline.salvarPasso1(itens)} 
          disabled={pipeline.loading || itens.every(i => !i.descricao)}
        >
          {pipeline.loading ? "Salvando..." : "Concluir Passo 1 →"}
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: CATMAT Search ─────────────────────────────────────

function Step2CATMATSearch({ pipeline }: { pipeline: ReturnType<typeof useEtpPipeline> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    const r = await pipeline.buscarCatalogo(query, 10);
    setResults(r);
    setSearching(false);
  };

  const toggleSelect = (codigo: number) => {
    setSelected(prev => 
      prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
    );
  };

  return (
    <div className="step-content">
      <h3>🔍 Passo 2: Buscar CATMAT/CATSERV</h3>
      
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Descreva o material ou serviço..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={searching || !query}>
          {searching ? "Buscando..." : "🔍 Buscar"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2 mb-4">
          {results.map((r: Record<string, unknown>) => (
            <Card 
              key={String(r.codigo)}
              className={`p-3 cursor-pointer transition-all ${
                selected.includes(Number(r.codigo)) 
                  ? "ring-2 ring-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              }`}
              onClick={() => toggleSelect(Number(r.codigo))}
            >
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={selected.includes(Number(r.codigo))}
                  readOnly
                  className="h-4 w-4"
                />
                <Badge variant={r.tipo === "material" ? "default" : "secondary"}>
                  {r.tipo === "material" ? "📦 MAT" : "🔧 SRV"}
                </Badge>
                <span className="font-mono text-sm">{String(r.codigo)}</span>
                <span className="flex-1 text-sm">{String(r.descricao)}</span>
                <Badge variant="outline">{Number(r.score).toFixed(2)}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <Button 
          onClick={() => pipeline.salvarPasso2(results as never[], selected)}
          disabled={pipeline.loading}
        >
          {pipeline.loading ? "Salvando..." : `Confirmar ${selected.length} códigos →`}
        </Button>
      )}
    </div>
  );
}

// ── Step 3: ARP Search ────────────────────────────────────────

function Step3ARPSearch({ pipeline }: { pipeline: ReturnType<typeof useEtpPipeline> }) {
  const [arps, setArps] = useState<Record<string, unknown>[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const result = await pipeline.buscarARPs();
    setArps(result);
    setSearched(true);
  };

  return (
    <div className="step-content">
      <h3>📄 Passo 3: Verificar Atas de Registro de Preços</h3>
      
      {!searched ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Buscar ARPs vigentes para os {pipeline.state?.codigos_selecionados?.length || 0} códigos selecionados
          </p>
          <Button onClick={handleSearch} disabled={pipeline.loading} size="lg">
            {pipeline.loading ? "Buscando..." : "🔍 Buscar ARPs no ComprasGov"}
          </Button>
        </div>
      ) : arps.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{arps.length} ARPs vigentes encontradas</p>
          {arps.map((arp, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{String(arp.descricaoItem || "Item ARP")}</p>
                  <p className="text-sm text-muted-foreground">
                    Órgão: {String(arp.nomeUnidadeGerenciadora || "—")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fornecedor: {String(arp.nomeRazaoSocialFornecedor || "—")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-green-600">
                    R$ {Number(arp.valorUnitario || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => pipeline.salvarPasso3(arp, "carona")}
                    className="mt-2"
                  >
                    Aderir a esta ARP
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          <div className="border-t pt-4 mt-4">
            <Button 
              variant="secondary" 
              onClick={() => pipeline.salvarPasso3(undefined, "licitacao_nova")}
            >
              Nenhuma ARP adequada → Seguir para licitação nova
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Nenhuma ARP vigente encontrada.</p>
          <Button onClick={() => pipeline.salvarPasso3(undefined, "licitacao_nova")}>
            Prosseguir para Pesquisa de Mercado →
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Market Research ───────────────────────────────────

function Step4MarketResearch({ pipeline }: { pipeline: ReturnType<typeof useEtpPipeline> }) {
  const [fontes, setFontes] = useState("");
  const [mediana, setMediana] = useState("");
  const [menor, setMenor] = useState("");
  const [medio, setMedio] = useState("");

  return (
    <div className="step-content">
      <h3>💰 Passo 4: Pesquisa de Mercado (IN 65/2021)</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Fontes Consultadas</label>
          <Textarea 
            placeholder="Painel de Preços, Contratos Anteriores, Balcão de Preços..."
            value={fontes}
            onChange={(e) => setFontes(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Valor Mediana (R$)</label>
            <Input type="number" value={mediana} onChange={(e) => setMediana(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Menor Preço (R$)</label>
            <Input type="number" value={menor} onChange={(e) => setMenor(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Preço Médio (R$)</label>
            <Input type="number" value={medio} onChange={(e) => setMedio(e.target.value)} />
          </div>
        </div>
        <Button 
          onClick={() => pipeline.salvarPasso4({
            fontes_consultadas: fontes.split(",").map(f => f.trim()),
            valor_mediana: Number(mediana) || null,
            valor_menor: Number(menor) || null,
            valor_medio: Number(medio) || null,
            conformidade_in65: true,
          })}
          disabled={pipeline.loading}
        >
          {pipeline.loading ? "Salvando..." : "Concluir Pesquisa →"}
        </Button>
      </div>
    </div>
  );
}

// ── Step 5: Deep Research ─────────────────────────────────────

function Step5DeepResearch({ pipeline }: { pipeline: ReturnType<typeof useEtpPipeline> }) {
  const [respostas, setRespostas] = useState<Record<string, string>>({
    riscos: "",
    impacto_ambiental: "",
    justificativa_parcelamento: "",
    resultados_pretendidos: "",
  });

  const fields = [
    { key: "riscos", label: "Riscos e providências", placeholder: "Quais os principais riscos da contratação?" },
    { key: "impacto_ambiental", label: "Sustentabilidade / Impacto Ambiental", placeholder: "Há requisitos de sustentabilidade?" },
    { key: "justificativa_parcelamento", label: "Justificativa de Parcelamento", placeholder: "O objeto será parcelado? Justifique." },
    { key: "resultados_pretendidos", label: "Resultados Pretendidos", placeholder: "Quais resultados se espera com a contratação?" },
  ];

  return (
    <div className="step-content">
      <h3>🧠 Passo 5: Informações Complementares</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Preencha as informações adicionais para compor o ETP.
      </p>
      
      <div className="space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-sm font-medium">{f.label}</label>
            <Textarea
              placeholder={f.placeholder}
              value={respostas[f.key] || ""}
              onChange={(e) => setRespostas({ ...respostas, [f.key]: e.target.value })}
              rows={3}
            />
          </div>
        ))}
        <Button
          onClick={() => pipeline.salvarPasso5(respostas)}
          disabled={pipeline.loading}
        >
          {pipeline.loading ? "Salvando..." : "Concluir Deep Research →"}
        </Button>
      </div>
    </div>
  );
}

// ── Step 6: Generate ETP ──────────────────────────────────────

function Step6Generate({ pipeline }: { pipeline: ReturnType<typeof useEtpPipeline> }) {
  return (
    <div className="step-content text-center py-8">
      <h3>🚀 Passo 6: Gerar ETP</h3>
      
      {pipeline.state?.etp_gerado ? (
        <div className="py-8">
          <div className="text-5xl mb-4">🎉</div>
          <h4 className="text-xl font-bold text-green-600 mb-2">ETP Gerado com Sucesso!</h4>
          <p className="text-muted-foreground">
            Gerado em {pipeline.state.data_geracao ? new Date(pipeline.state.data_geracao).toLocaleString("pt-BR") : "—"}
          </p>
        </div>
      ) : (
        <div className="py-8 space-y-4">
          <p className="text-muted-foreground">
            Todos os dados foram coletados. Caminho: <Badge>{pipeline.caminho}</Badge>
          </p>
          <div className="flex flex-col gap-2 items-center">
            <p className="text-sm">
              ✅ {pipeline.state?.itens?.length || 0} itens definidos<br/>
              ✅ {pipeline.state?.codigos_selecionados?.length || 0} códigos CATMAT/CATSERV<br/>
              ✅ Caminho: {pipeline.caminho === "carona" ? "Carona em ARP" : "Licitação Nova"}<br/>
              ✅ Deep Research concluído
            </p>
          </div>
          <Button 
            size="lg"
            onClick={() => pipeline.gerarETP()}
            disabled={pipeline.loading}
          >
            {pipeline.loading ? "Gerando..." : "🚀 Gerar ETP Final"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function ETPPipelineStepper({ projetoId }: { projetoId: string }) {
  const pipeline = useEtpPipeline(projetoId);

  if (pipeline.loading && !pipeline.state) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  if (pipeline.error && !pipeline.state) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-500 mb-4">❌ {pipeline.error}</p>
        <Button onClick={pipeline.carregarEstado}>Tentar novamente</Button>
      </Card>
    );
  }

  // Pipeline não iniciado
  if (pipeline.passoAtual === 0) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Pipeline ETP</h2>
        <p className="text-muted-foreground mb-6">
          Gere o Estudo Técnico Preliminar em 6 passos guiados.
        </p>
        <Button size="lg" onClick={pipeline.iniciar} disabled={pipeline.loading}>
          {pipeline.loading ? "Iniciando..." : "🚀 Iniciar Pipeline"}
        </Button>
      </Card>
    );
  }

  const renderStep = () => {
    switch (pipeline.passoAtual) {
      case 1: return <Step1DFDReview pipeline={pipeline} />;
      case 2: return <Step2CATMATSearch pipeline={pipeline} />;
      case 3: return <Step3ARPSearch pipeline={pipeline} />;
      case 4: return <Step4MarketResearch pipeline={pipeline} />;
      case 5: return <Step5DeepResearch pipeline={pipeline} />;
      case 6: return <Step6Generate pipeline={pipeline} />;
      default: return <Step6Generate pipeline={pipeline} />;
    }
  };

  return (
    <div className="etp-pipeline">
      <StepperHeader
        passoAtual={pipeline.passoAtual}
        statusPassos={pipeline.state?.status_passos || {}}
        caminho={pipeline.caminho}
      />
      
      <Card className="mt-6 p-6">
        {pipeline.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
            {pipeline.error}
          </div>
        )}
        {renderStep()}
      </Card>
      
      {pipeline.passoAtual > 0 && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={pipeline.resetar}>
            ↺ Resetar Pipeline
          </Button>
        </div>
      )}
    </div>
  );
}
