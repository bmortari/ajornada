import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useAppStore } from '../store/useAppStore';
import type { ModelOption } from '../types/chat';

export default function InputArea() {
  const [text, setText] = useState('');
  const { sendMessage, stopResponse, isStreaming } = useChat();
  const { selectedModel, setSelectedModel, toggleRightSidebar, toolsConfig } = useAppStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [showModels, setShowModels] = useState(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset ping state when model changes
  useEffect(() => {
    setPingStatus('idle');
    setPingLatency(null);
  }, [selectedModel]);

  const handlePing = async () => {
    if (!selectedModel) return;
    setPingStatus('loading');
    setPingLatency(null);
    try {
      const res = await fetch('api/models/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
      });
      const data = await res.json();
      if (data.available) {
        setPingStatus('success');
        setPingLatency(data.latency_ms);
      } else {
        setPingStatus('error');
      }
    } catch {
      setPingStatus('error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('api/extract-text', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setText((prev) => {
          const newText = prev + (prev.endsWith('\n') || prev === '' ? '' : '\n\n') + `[Documento Anexado: ${data.filename}]\n"""\n${data.text}\n"""\n\n`;
          return newText;
        });
      } else {
        alert(data.detail || 'Erro ao extrair texto do arquivo.');
      }
    } catch (error) {
      alert('Erro de conexão ao enviar arquivo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    fetch('api/models')
      .then((r) => r.json())
      .then((d) => setModels(d.models || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <div className="px-4 pb-4 pt-2">
      {/* Chat Input Box */}
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-200"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-end gap-2 p-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".txt,.pdf,.docx" 
            onChange={handleFileUpload} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || isUploading}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/5 shrink-0 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
            title="Anexar documento (PDF, DOCX, TXT)"
          >
            {isUploading ? (
               <span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span>
            ) : (
               <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre normativos do CNJ..."
            className="flex-1 bg-transparent text-sm resize-none outline-none min-h-[44px] max-h-[200px] py-2 px-2"
            style={{ color: 'var(--text-primary)' }}
            rows={1}
            disabled={isStreaming}
          />

          {isStreaming ? (
            <button
              onClick={stopResponse}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 shrink-0"
              style={{ background: '#ef4444', color: '#fff' }}
              title="Parar resposta"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{
                background: text.trim() ? 'var(--text-primary)' : 'var(--bg-tertiary)',
                color: text.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
              }}
              title="Enviar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Controls Row — below chat input */}
      <div className="flex items-center justify-between mt-2.5 px-1">
        <div className="flex items-center gap-2">
          
          {/* Advanced Agent Config Toggle */}
          <button
            onClick={toggleRightSidebar}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 shadow-sm`}
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              border: '1px solid transparent',
            }}
            title="Ajustar habilidades, filtros e modos do ChatCNJ"
          >
            <span>⚙️</span>
            Ajustes do Agente
            {(toolsConfig.revisorMinutas || toolsConfig.searchWeb) && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* Model Selector and Ping Unified */}
          <div className="relative">
            <div
              onClick={() => setShowModels(!showModels)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
              role="button"
              tabIndex={0}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentModel?.free ? 'bg-green-400' : 'bg-amber-400'}`} />
              {currentModel?.label || 'Modelo'}
              <button 
                onClick={(e) => { e.stopPropagation(); handlePing(); }}
                disabled={pingStatus === 'loading'}
                className="ml-1 pl-1.5 border-l opacity-80 hover:opacity-100 transition-opacity"
                style={{ borderColor: 'var(--border)' }}
                title="Verificar latência do modelo atual"
              >
                {pingStatus === 'loading' ? (
                  <span className="animate-ping font-bold text-yellow-500">⚡</span>
                ) : pingStatus === 'success' ? (
                  <span className="text-green-500">⚡ {pingLatency}ms</span>
                ) : pingStatus === 'error' ? (
                  <span className="text-red-500">⚡ Err</span>
                ) : (
                  <span className="hover:scale-110">⚡</span>
                )}
              </button>
            </div>

            {showModels && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowModels(false)} />
                <div
                  className="absolute left-0 bottom-full mb-2 w-72 rounded-xl py-2 shadow-xl z-50"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Modelos Gratuitos
                  </div>
                  {models.filter((m) => m.free).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m.id); setShowModels(false); }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-xs hover:opacity-80 transition-all"
                      style={{
                        color: m.id === selectedModel ? 'var(--text-primary)' : 'var(--text-secondary)',
                        background: m.id === selectedModel ? 'var(--bg-tertiary)' : 'transparent',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="flex-1 font-medium">{m.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.provider}</span>
                    </button>
                  ))}
                  <div className="px-3 py-1.5 mt-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                    Modelos Pagos
                  </div>
                  {models.filter((m) => !m.free).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m.id); setShowModels(false); }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-xs hover:opacity-80 transition-all"
                      style={{
                        color: m.id === selectedModel ? 'var(--text-primary)' : 'var(--text-secondary)',
                        background: m.id === selectedModel ? 'var(--bg-tertiary)' : 'transparent',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="flex-1 font-medium">{m.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.provider}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          ChatCNJ pode cometer erros. Verifique as citações.
        </p>
      </div>
    </div>
  );
}
