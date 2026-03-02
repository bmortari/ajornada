import { useState } from 'react';
import { useSchemaInfo } from '../../hooks/useSchemaInfo';
import { useAppStore } from '../../store/useAppStore';
import type { SchemaCube } from '../../types/chat';

/* ── Cube label helper ── */
const CUBE_LABELS: Record<string, { label: string; icon: string }> = {
  casos_novos:   { label: 'Casos Novos',   icon: '📥' },
  sentencas:     { label: 'Sentenças',      icon: '⚖' },
  casos_baixados:{ label: 'Casos Baixados', icon: '📤' },
  casos_pendentes:{ label: 'Casos Pendentes', icon: '⏳' },
  datamart:      { label: 'Datamart Geral', icon: '🗃' },
};

function cubeMeta(name: string) {
  return CUBE_LABELS[name] || { label: name, icon: '📊' };
}

/* ── Collapsible Cube Card ── */
function CubeCard({ cube, sampleValues }: { cube: SchemaCube; sampleValues: Record<string, string[]> }) {
  const [open, setOpen] = useState(false);
  const meta = cubeMeta(cube.name);

  return (
    <div className="ctx-cube-card">
      <button className="ctx-cube-header" onClick={() => setOpen(!open)}>
        <span className="ctx-cube-icon">{meta.icon}</span>
        <span className="ctx-cube-name">{meta.label}</span>
        <span className="ctx-cube-count">{cube.measures.length}m · {cube.dimensions.length}d</span>
        <svg
          className="ctx-chevron"
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      {open && (
        <div className="ctx-cube-body">
          <div className="ctx-section-label">Métricas</div>
          <div className="ctx-chips">
            {cube.measures.map((m) => (
              <span key={m.name} className="ctx-chip measure" title={m.name}>
                {m.shortTitle || m.title}
              </span>
            ))}
          </div>

          <div className="ctx-section-label">Dimensões</div>
          <div className="ctx-chips">
            {cube.dimensions.map((d) => (
              <span key={d.name} className="ctx-chip dimension" title={d.name}>
                {d.shortTitle || d.title}
              </span>
            ))}
          </div>

          {cube.timeDimensions.length > 0 && (
            <>
              <div className="ctx-section-label">Tempo</div>
              <div className="ctx-chips">
                {cube.timeDimensions.map((td) => (
                  <span key={td.name} className="ctx-chip time" title={td.name}>
                    {td.shortTitle || td.title}
                  </span>
                ))}
              </div>
            </>
          )}

          {cube.dimensions.slice(0, 4).map((d) => {
            const vals = sampleValues[d.name];
            if (!vals || vals.length === 0) return null;
            return (
              <div key={d.name} className="ctx-sample">
                <div className="ctx-sample-label">{d.shortTitle || d.title}</div>
                <div className="ctx-sample-values">
                  {vals.slice(0, 5).map((v) => (
                    <span key={v} className="ctx-sample-val">{v}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Terminal Log Entry ── */
function TerminalEntry({ log }: { log: import('../../types/chat').TerminalLog }) {
  const [open, setOpen] = useState(false);
  const typeIcons: Record<string, string> = {
    query: '🔍', script: '⚙️', cube: '🧊', error: '❌', info: 'ℹ️',
  };
  const typeColors: Record<string, string> = {
    query: 'var(--accent)', script: 'var(--success)', cube: '#60a5fa',
    error: 'var(--danger)', info: 'var(--text-tertiary)',
  };

  return (
    <div className="terminal-entry" onClick={() => log.detail && setOpen(!open)}>
      <div className="terminal-entry-header">
        <span className="terminal-entry-icon">{typeIcons[log.type] || 'ℹ️'}</span>
        <span className="terminal-entry-title">{log.title}</span>
        <span className="terminal-entry-time">{log.timestamp}</span>
        {log.duration != null && (
          <span className="terminal-entry-duration" style={{ color: typeColors[log.type] }}>
            {log.duration}ms
          </span>
        )}
      </div>
      {open && log.detail && (
        <pre className="terminal-entry-detail">{log.detail}</pre>
      )}
    </div>
  );
}

/* ── Main Panel ── */
export default function ContextPanel() {
  const { schemaInfo, loading } = useSchemaInfo();
  const { setDraftText, terminalLogs, contextPanelOpen, toggleContextPanel } = useAppStore();
  const [tab, setTab] = useState<'dados' | 'filtros' | 'terminal'>('dados');

  if (loading || !schemaInfo) {
    return (
      <aside className="context-panel">
        <div className="ctx-loading">
          <div className="ctx-spinner" />
          <span>Carregando schema...</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="context-panel">
      {/* Header with Cube.js status & toggle */}
      <div className="ctx-header">
        <div className="ctx-header-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span>Dados Disponíveis</span>
          <div className="ctx-status"><div className="ctx-dot" /> Cube.js</div>
        </div>
        <button
          className="ctx-toggle-btn"
          onClick={toggleContextPanel}
          title="Ocultar painel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Tab bar: Schema / Filtros Rápidos / Terminal */}
      <div className="ctx-tabs">
        <button className={`ctx-tab${tab === 'dados' ? ' active' : ''}`} onClick={() => setTab('dados')}>
          Schema
        </button>
        <button className={`ctx-tab${tab === 'filtros' ? ' active' : ''}`} onClick={() => setTab('filtros')}>
          Filtros Rápidos
        </button>
        <button className={`ctx-tab${tab === 'terminal' ? ' active' : ''}`} onClick={() => setTab('terminal')}>
          Terminal
        </button>
      </div>

      {/* Content */}
      <div className="ctx-content">
        {tab === 'dados' && (
          <>
            {/* Summary */}
            <div className="ctx-summary">
              <div className="ctx-stat">
                <span className="ctx-stat-value">{schemaInfo.cubes.length}</span>
                <span className="ctx-stat-label">cubos</span>
              </div>
              <div className="ctx-stat">
                <span className="ctx-stat-value">
                  {schemaInfo.cubes.reduce((n, c) => n + c.measures.length, 0)}
                </span>
                <span className="ctx-stat-label">métricas</span>
              </div>
              <div className="ctx-stat">
                <span className="ctx-stat-value">
                  {schemaInfo.cubes.reduce((n, c) => n + c.dimensions.length, 0)}
                </span>
                <span className="ctx-stat-label">dimensões</span>
              </div>
            </div>

            {/* Cube cards */}
            <div className="ctx-cubes">
              {schemaInfo.cubes.map((cube) => (
                <CubeCard
                  key={cube.name}
                  cube={cube}
                  sampleValues={schemaInfo.sampleValues}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'filtros' && (
          <>
            {Object.keys(schemaInfo.sampleValues).length > 0 ? (
              <div className="ctx-filters-section">
                {Object.entries(schemaInfo.sampleValues).map(([dim, vals]) => {
                  const dimLabel = dim.split('.').pop() || dim;
                  return (
                    <div key={dim} className="ctx-filter-group">
                      <div className="ctx-filter-label">{dimLabel}</div>
                      <div className="ctx-filter-values">
                        {vals.slice(0, 6).map((v) => (
                          <button
                            key={v}
                            className="ctx-filter-btn"
                            onClick={() => {
                              setDraftText(`Mostre os dados filtrados por ${dimLabel} = "${v}"`);
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ctx-empty">Nenhum filtro disponível.</div>
            )}
          </>
        )}

        {tab === 'terminal' && (
          <div className="ctx-terminal">
            {terminalLogs.length === 0 ? (
              <div className="ctx-terminal-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                <span>Os cálculos, scripts e consultas executadas aparecerão aqui para auditoria.</span>
              </div>
            ) : (
              terminalLogs.map((log) => (
                <TerminalEntry key={log.id} log={log} />
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
