import { useState, useRef, useCallback, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAppStore } from '../../store/useAppStore';
import type { ModelOption } from '../../types/chat';

/* ── Catálogo de modelos com suporte a tool_call ── */
const MODELS: ModelOption[] = [
  { id: 'anthropic/claude-3-haiku', label: 'Anthropic: Claude 3 Haiku', provider: 'Anthropic', free: false },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Meta: Llama 3.3 70B Instruct', provider: 'OpenRouter', free: true },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral: Mistral Small 3.1 24B', provider: 'OpenRouter', free: true },
  { id: 'arcee-ai/trinity-large-preview:free', label: 'Arcee AI: Trinity Large Preview', provider: 'OpenRouter', free: true },
  { id: 'stepfun/step-3.5-flash:free', label: 'StepFun: Step 3.5 Flash', provider: 'OpenRouter', free: true },
  { id: 'z-ai/glm-4.5-air:free', label: 'Z.ai: GLM 4.5 Air', provider: 'OpenRouter', free: true },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'NVIDIA: Nemotron 3 Nano 30B A3B', provider: 'OpenRouter', free: true },
  { id: 'openai/gpt-oss-120b:free', label: 'OpenAI: gpt-oss-120b', provider: 'OpenRouter', free: true },
  { id: 'upstage/solar-pro-3:free', label: 'Upstage: Solar Pro 3', provider: 'OpenRouter', free: true },
  { id: 'arcee-ai/trinity-mini:free', label: 'Arcee AI: Trinity Mini', provider: 'OpenRouter', free: true },
  { id: 'nvidia/nemotron-nano-9b-v2:free', label: 'NVIDIA: Nemotron Nano 9B V2', provider: 'OpenRouter', free: true },
  { id: 'nvidia/nemotron-nano-12b-v2-vl:free', label: 'NVIDIA: Nemotron Nano 12B V2 VL', provider: 'OpenRouter', free: true },
  { id: 'openai/gpt-oss-20b:free', label: 'OpenAI: gpt-oss-20b', provider: 'OpenRouter', free: true },
  { id: 'qwen/qwen3-coder:free', label: 'Qwen: Qwen3 Coder', provider: 'OpenRouter', free: true },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen: Qwen3 Next 80B A3B Instruct', provider: 'OpenRouter', free: true },
  { id: 'google/gemma-3-27b-it:free', label: 'Google: Gemma 3 27B', provider: 'OpenRouter', free: true },
  { id: 'qwen/qwen3-4b:free', label: 'Qwen: Qwen3 4B', provider: 'OpenRouter', free: true },
];

type CheckStatus = 'idle' | 'checking' | 'available' | 'unavailable';

export default function InputArea() {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, stopResponse } = useChat();
  const { isStreaming, draftText, setDraftText, selectedModel, setSelectedModel, deepSearch, setDeepSearch } = useAppStore();
  const [openDD, setOpenDD] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [modelFilter, setModelFilter] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);

  // When draftText is set from ContextPanel, inject it into the textarea
  useEffect(() => {
    if (draftText) {
      setText(draftText);
      setDraftText('');
      textareaRef.current?.focus();
    }
  }, [draftText, setDraftText]);

  // Focus filter input when model dropdown opens
  useEffect(() => {
    if (openDD === 'ddModel') {
      setTimeout(() => filterRef.current?.focus(), 50);
    } else {
      setModelFilter('');
    }
  }, [openDD]);

  const autoGrow = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, ta.dataset.maxH ? +ta.dataset.maxH : 240)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setText('');
    // reset height after send
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) { ta.style.height = 'auto'; }
    });
  }, [text, isStreaming, sendMessage]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const toggleDropdown = (id: string) => {
    setOpenDD((prev) => (prev === id ? null : id));
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setOpenDD(null);
    setCheckStatus('idle');
  };

  const handleCheckModel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (checkStatus === 'checking') return;
    setCheckStatus('checking');
    try {
      const res = await fetch('/api/models/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
      });
      const data = await res.json();
      setCheckStatus(data.available ? 'available' : 'unavailable');
      // Auto-reset after 4s
      setTimeout(() => setCheckStatus('idle'), 4000);
    } catch {
      setCheckStatus('unavailable');
      setTimeout(() => setCheckStatus('idle'), 4000);
    }
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel);
  const currentLabel = currentModel?.label || selectedModel.split('/').pop()?.replace(':free', '') || 'Modelo';

  const filteredModels = modelFilter
    ? MODELS.filter(
        (m) =>
          m.label.toLowerCase().includes(modelFilter.toLowerCase()) ||
          m.provider.toLowerCase().includes(modelFilter.toLowerCase()) ||
          m.id.toLowerCase().includes(modelFilter.toLowerCase())
      )
    : MODELS;

  // Group by provider
  const grouped = filteredModels.reduce<Record<string, ModelOption[]>>((acc, m) => {
    (acc[m.provider] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="input-area" onClick={() => setOpenDD(null)}>
      <div className="input-box">
        <textarea
          ref={textareaRef}
          rows={1}
          data-max-h="240"
          placeholder="Pergunte sobre os dados do Datajud..."
          value={text}
          onChange={(e) => { setText(e.target.value); autoGrow(); }}
          onKeyDown={handleKey}
          onInput={autoGrow}
        />
        <button className="send-btn" onClick={isStreaming ? stopResponse : handleSend} title={isStreaming ? 'Parar resposta' : 'Enviar'}>
          {isStreaming ? (
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>
      <div className="resources" onClick={(e) => e.stopPropagation()}>
        {/* Model selector chip */}
        <button
          className={`res-chip model-chip${checkStatus === 'available' ? ' model-ok' : ''}${checkStatus === 'unavailable' ? ' model-err' : ''}`}
          onClick={() => toggleDropdown('ddModel')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
          <span className="chip-label">{currentLabel}</span>
          {currentModel?.free && <span className="model-badge">free</span>}
          {checkStatus === 'checking' && <span className="model-spinner" />}
          {checkStatus === 'available' && <span className="model-status ok">✓</span>}
          {checkStatus === 'unavailable' && <span className="model-status err">✗</span>}
        </button>

        {/* Ping button */}
        <button
          className="res-chip ping-chip"
          onClick={handleCheckModel}
          title="Verificar disponibilidade do modelo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </button>

        {/* Busca Profunda toggle */}
        <button
          className={`res-chip deep-search-chip${deepSearch ? ' deep-search-active' : ''}`}
          onClick={() => setDeepSearch(!deepSearch)}
          title={deepSearch ? 'Busca Profunda ativada (mais iterações)' : 'Ativar Busca Profunda'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <path d="M11 8v6M8 11h6" />
          </svg>
          <span className="chip-label">{deepSearch ? 'Busca Profunda: ON' : 'Busca Profunda'}</span>
        </button>

        <div className="res-chip-wrap">
          <button className="res-chip" onClick={() => toggleDropdown('ddAttach')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <span className="chip-label">Anexar</span>
          </button>
          <div className={`dropdown attach-dropdown${openDD === 'ddAttach' ? ' open' : ''}`}>
            <div className="dropdown-label">Anexar Arquivo</div>
            <div className="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
              Documento (PDF, DOCX)
            </div>
            <div className="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
              Planilha (CSV, XLSX)
            </div>
            <div className="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              Imagem
            </div>
          </div>
        </div>

        {/* Model dropdown */}
        <div className={`dropdown model-dropdown${openDD === 'ddModel' ? ' open' : ''}`}>
          <div className="dropdown-label">Selecionar Modelo</div>
          <div className="model-filter-wrap">
            <input
              ref={filterRef}
              className="model-filter"
              placeholder="Filtrar modelos..."
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="model-list">
            {Object.entries(grouped).map(([provider, models]) => (
              <div key={provider}>
                <div className="model-provider">{provider}</div>
                {models.map((m) => (
                  <div
                    key={m.id}
                    className={`dropdown-item model-item${m.id === selectedModel ? ' active' : ''}`}
                    onClick={() => handleSelectModel(m.id)}
                  >
                    <span className="model-item-label">{m.label}</span>
                    <span className="model-item-meta">
                      {m.free && <span className="model-badge">free</span>}
                      {!m.free && <span className="model-badge paid">paid</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {filteredModels.length === 0 && (
              <div className="dropdown-item" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                Nenhum modelo encontrado
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
