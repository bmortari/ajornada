import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { PendingDashboard } from '../../types/chat';

export default function WorkspaceMarker({ pending }: { pending?: PendingDashboard | null }) {
  const openWorkspace = useAppStore((s) => s.openWorkspace);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError('');
    // Read these at click-time, not via subscription
    const { messages, selectedModel } = useAppStore.getState();
    console.log('[WorkspaceMarker] click — messages count:', messages.length);

    // If there's a pending dashboard from BI agent, generate it via backend
    if (pending) {
      setLoading(true);
      try {
        const res = await fetch('/api/pipeline/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: pending.filters || [],
            period: pending.period || null,
            metrics: pending.metrics || [],
            chart_types: pending.chart_types || [],
            model: selectedModel,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Validate: check if dashboard has actual data
        const hasCharts = (data.charts || []).length > 0;
        const hasKpis = (data.kpis || []).some((k: any) => k.value && k.value !== '0' && k.value !== '0.0');
        if (!hasCharts && !hasKpis) {
          setError('Nenhum dado encontrado para os filtros selecionados. Tente ajustar os critérios.');
          return;
        }

        openWorkspace({
          title: pending.title || 'Painel BI — Datajud',
          kpis: data.kpis || [],
          charts: data.charts || [],
          dimension_filters: data.dimension_filters || [],
          chart_defs: data.chart_defs || [],
          kpi_defs: data.kpi_defs || [],
        });
      } catch (err: any) {
        console.error('[WorkspaceMarker] generate error:', err);
        setError('Erro ao gerar o painel. Tente novamente.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Conversational mode: collect charts/kpis from the last bot message
    const lastBot = [...messages].reverse().find((m) => m.role === 'bot');
    console.log('[WS Marker] Last bot message:', lastBot);
    
    if (lastBot) {
      openWorkspace({
        title: 'Painel Analítico — Datajud',
        kpis: lastBot.kpis || [],
        charts: lastBot.charts || [],
      });
    } else {
      openWorkspace();
    }
  };

  return (
    <div className={`ws-marker${loading ? ' ws-marker-loading' : ''}${pending ? ' ws-marker-bi' : ''}`} onClick={handleClick}>
      <div className="ws-marker-icon">
        {loading ? (
          <span className="model-spinner" />
        ) : pending ? (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        )}
      </div>
      <div>
        <h4>{pending ? 'Gerar Painel BI' : 'Abrir no Dashboard'}</h4>
        <span>{error || (pending ? 'Clique para montar o painel automaticamente' : 'Expandir visualizações no workspace')}</span>
      </div>
      <div className="ws-marker-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
