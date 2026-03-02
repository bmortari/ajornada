"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PacItem } from "@/types";

interface SelectedItem {
  pacItem: PacItem;
  quantidade: number;
}

export default function PacPage() {
  const [items, setItems] = useState<PacItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchPac() {
      try {
        const data = await api.get<PacItem[]>("/api/pac");
        setItems(data);
        setError(null);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Erro ao carregar itens do PAC";
        setError(errorMsg);
        console.error("PAC fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPac();
  }, []);

  const filteredItems = items.filter((item) =>
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.set(itemId, 1);
    }
    setSelectedItems(newSelected);
  };

  const updateQuantity = (itemId: number, quantidade: number) => {
    if (quantidade < 1) return;
    const newSelected = new Map(selectedItems);
    newSelected.set(itemId, quantidade);
    setSelectedItems(newSelected);
  };

  const handleCreateProject = async (isExtraPac: boolean = false) => {
    if (!projectName.trim()) {
      alert("Por favor, informe o nome do projeto");
      return;
    }

    setCreating(true);
    try {
      const selectedPacItems = isExtraPac 
        ? [] 
        : Array.from(selectedItems.entries()).map(([id, quantidade]) => ({
            id,  // Backend espera "id", não "pac_item_id"
            quantidade,
          }));

      const payload = {
        nome: projectName,
        descricao: projectDescription,
        itens_pac: selectedPacItems,
      };

      console.log("📤 Enviando payload:", JSON.stringify(payload, null, 2));

      await api.post("/api/projetos", payload);

      setShowModal(false);
      setProjectName("");
      setProjectDescription("");
      setSelectedItems(new Map());
      
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("❌ Erro ao criar projeto:", err);
      if (err instanceof Error && 'data' in err) {
        console.error("📋 Detalhes do erro:", (err as any).data);
      }
      alert("Erro ao criar projeto. Veja o console para detalhes.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando itens do PAC...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-destructive text-xl mb-4">❌ {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Plano Anual de Contratações (PAC)
        </h1>
        <p className="text-muted-foreground">
          Selecione um ou mais itens do PAC para criar um novo projeto
        </p>
      </div>

      {/* Barra de ações */}
      <div className="flex gap-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="Buscar por descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[300px] px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
        />
        
        {/* Botão Extra-PAC */}
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-semibold flex items-center gap-2 border border-border"
        >
          <span>+</span>
          Projeto Extra-PAC
        </button>

        {selectedItems.size > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-success text-white rounded-lg hover:bg-success-light font-semibold flex items-center gap-2"
          >
            <span>✓</span>
            Criar Projeto ({selectedItems.size} {selectedItems.size === 1 ? 'item' : 'itens'})
          </button>
        )}
      </div>

      {/* Lista de itens */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isSelected = selectedItems.has(item.id);
          const quantidade = selectedItems.get(item.id) || 1;

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-5 transition-all bg-card ${
                isSelected
                  ? "border-primary shadow-md"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItemSelection(item.id)}
                  className="mt-1 w-5 h-5 text-primary rounded focus:ring-2 focus:ring-ring cursor-pointer"
                />

                {/* Conteúdo */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground uppercase">
                        {item.descricao || "Sem descrição"}
                      </h3>
                      {item.detalhamento && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.detalhamento}
                        </p>
                      )}
                    </div>
                    
                    {item.valor_previsto && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Valor Previsto</div>
                        <div className="text-lg font-bold text-success">
                          {item.valor_previsto}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detalhes em grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                    {item.unidade && (
                      <div>
                        <span className="text-muted-foreground">Unidade:</span>{" "}
                        <span className="font-medium text-foreground">{item.unidade}</span>
                      </div>
                    )}
                    {item.quantidade && (
                      <div>
                        <span className="text-muted-foreground">Qtd. PAC:</span>{" "}
                        <span className="font-medium text-foreground">{item.quantidade}</span>
                      </div>
                    )}
                    {item.prioridade && (
                      <div>
                        <span className="text-muted-foreground">Prioridade:</span>{" "}
                        <span className="font-medium text-foreground">{item.prioridade}</span>
                      </div>
                    )}
                    {item.tipo_contratacao && (
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>{" "}
                        <span className="font-medium text-foreground">{item.tipo_contratacao}</span>
                      </div>
                    )}
                    {item.unidade_tecnica && (
                      <div>
                        <span className="text-muted-foreground">Un. Técnica:</span>{" "}
                        <span className="font-medium text-foreground">{item.unidade_tecnica}</span>
                      </div>
                    )}
                    {item.unidade_administrativa && (
                      <div>
                        <span className="text-muted-foreground">Un. Admin:</span>{" "}
                        <span className="font-medium text-foreground">{item.unidade_administrativa}</span>
                      </div>
                    )}
                    {item.fase && (
                      <div>
                        <span className="text-muted-foreground">Fase:</span>{" "}
                        <span className="font-medium text-foreground">{item.fase}</span>
                      </div>
                    )}
                    {item.catmat_catser && (
                      <div>
                        <span className="text-muted-foreground">CATMAT/CATSER:</span>{" "}
                        <span className="font-medium text-foreground">{item.catmat_catser}</span>
                      </div>
                    )}
                  </div>

                  {/* Campo de quantidade */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <label className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          Quantidade para o projeto:
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={quantidade}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-24 px-3 py-1 bg-card border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum item encontrado
        </div>
      )}

      {/* Modal de criação de projeto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-foreground">
                {selectedItems.size > 0 ? "Criar Projeto do PAC" : "Criar Projeto Extra-PAC"}
              </h2>

              {/* Itens selecionados */}
              {selectedItems.size > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 text-foreground">Itens do PAC selecionados:</h3>
                  <div className="bg-secondary/50 rounded p-3 space-y-2 max-h-40 overflow-y-auto border border-border">
                    {Array.from(selectedItems.entries()).map(([id, quantidade]) => {
                      const item = items.find((i) => i.id === id);
                      return (
                        <div key={id} className="flex justify-between text-sm">
                          <span className="text-foreground">{item?.descricao}</span>
                          <span className="font-medium text-primary">
                            Qtd: {quantidade}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedItems.size === 0 && (
                <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm text-foreground">
                    ℹ️ Este projeto será criado <strong>sem itens do PAC</strong> (Extra-PAC).
                  </p>
                </div>
              )}

              {/* Formulário */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nome do Projeto *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                    placeholder="Ex: Aquisição de equipamentos 2026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                    placeholder="Descreva o objetivo do projeto..."
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setProjectName("");
                    setProjectDescription("");
                  }}
                  disabled={creating}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-secondary disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleCreateProject(selectedItems.size === 0)}
                  disabled={creating || !projectName.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-semibold"
                >
                  {creating ? "Criando..." : "Criar Projeto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
