import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import KPICard from './KPICard';
import DynamicChart from './DynamicChart';
import ChartFullscreen from './ChartFullscreen';
import DateRangePicker from './DateRangePicker';
import SkeletonCard from './SkeletonCard';
import { buildChartOption } from '../../utils/buildChartOption';

/* ---------- fallback demo data (shown when no live data) ---------- */
const demoKpis = [
  { label: 'Casos Novos', value: '14.328', change: '+12,4%' },
  { label: 'Sentenças', value: '11.482', change: '+8,1%' },
  { label: 'Casos Baixados', value: '12.749', change: '+5,3%' },
  { label: 'Taxa Congestionamento', value: '62,7%', change: '-3,2%' },
];

const barOpt = {
  tooltip: { trigger: 'axis' as const },
  legend: { data: ['Casos Novos', 'Sentenças', 'Baixados'], bottom: 0, textStyle: { color: '{{textSecondary}}', fontSize: 11 }, itemWidth: 8, itemHeight: 8, itemGap: 14 },
  grid: { left: 50, right: 16, top: 12, bottom: 48 },
  xAxis: { type: 'category' as const, data: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'], axisLabel: { color: '{{textMuted}}', fontSize: 10 }, axisLine: { lineStyle: { color: '{{border}}' } }, axisTick: { show: false } },
  yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: '{{border}}' } }, axisLabel: { color: '{{textMuted}}', fontSize: 10 } },
  series: [
    { name: 'Casos Novos', type: 'bar', data: [2400, 2100, 2500, 2300, 2650, 2328], itemStyle: { color: '#2563EB', borderRadius: [3, 3, 0, 0] }, barGap: '20%', barCategoryGap: '40%' },
    { name: 'Sentenças', type: 'bar', data: [1900, 1800, 2000, 1700, 1985, 2097], itemStyle: { color: '#6366f1', borderRadius: [3, 3, 0, 0] } },
    { name: 'Baixados', type: 'bar', data: [2100, 2000, 2200, 2050, 2249, 2150], itemStyle: { color: '#f59e0b', borderRadius: [3, 3, 0, 0] } },
  ],
};

const donutOpt = {
  tooltip: { trigger: 'item' as const },
  legend: { data: ['Cível', 'Criminal', 'Família', 'Fazenda', 'Outros'], bottom: 0, textStyle: { color: '{{textSecondary}}', fontSize: 11 }, itemWidth: 8, itemHeight: 8, itemGap: 10 },
  series: [{
    type: 'pie', radius: ['50%', '72%'], center: ['50%', '44%'], avoidLabelOverlap: false,
    label: { show: true, position: 'center', formatter: '{total|14.328}\n{sub|Total}', rich: { total: { fontFamily: "'Source Serif 4'", fontSize: 22, fontWeight: 700, color: '{{textPrimary}}', lineHeight: 30 }, sub: { fontSize: 11, color: '{{textMuted}}', lineHeight: 18 } } },
    labelLine: { show: false },
    data: [
      { value: 5200, name: 'Cível', itemStyle: { color: '#2563EB' } },
      { value: 3100, name: 'Criminal', itemStyle: { color: '#6366f1' } },
      { value: 2800, name: 'Família', itemStyle: { color: '#f59e0b' } },
      { value: 1928, name: 'Fazenda', itemStyle: { color: '#ec4899' } },
      { value: 1300, name: 'Outros', itemStyle: { color: '#8b5cf6' } },
    ],
  }],
};

const lineOpt = {
  tooltip: { trigger: 'axis' as const },
  legend: { data: ['Taxa Congestionamento', 'Meta CNJ'], bottom: 0, textStyle: { color: '{{textSecondary}}', fontSize: 11 }, itemWidth: 14, itemHeight: 2, itemGap: 14 },
  grid: { left: 50, right: 16, top: 12, bottom: 48 },
  xAxis: { type: 'category' as const, data: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'], axisLabel: { color: '{{textMuted}}', fontSize: 10 }, axisLine: { lineStyle: { color: '{{border}}' } }, axisTick: { show: false } },
  yAxis: { type: 'value' as const, min: 50, max: 80, splitLine: { lineStyle: { color: '{{border}}' } }, axisLabel: { color: '{{textMuted}}', fontSize: 10, formatter: '{value}%' } },
  series: [
    { name: 'Taxa Congestionamento', type: 'line', data: [68, 66, 65, 64, 63.5, 62.7], smooth: true, lineStyle: { color: '#2563EB', width: 2 }, itemStyle: { color: '#2563EB' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(37,99,235,0.15)' }, { offset: 1, color: 'rgba(37,99,235,0)' }] } }, symbol: 'circle', symbolSize: 5 },
    { name: 'Meta CNJ', type: 'line', data: [60, 60, 60, 60, 60, 60], lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 1.5 }, itemStyle: { color: '#ef4444' }, symbol: 'none' },
  ],
};

const tableData = [
  { vara: '1ª Vara Cível', novos: 1243, sentencas: 987, taxa: '68,2%' },
  { vara: '2ª Vara Criminal', novos: 1087, sentencas: 1102, taxa: '55,1%' },
  { vara: '3ª Vara de Família', novos: 892, sentencas: 845, taxa: '61,0%' },
  { vara: 'Vara da Fazenda Pública', novos: 756, sentencas: 698, taxa: '72,4%' },
  { vara: 'JEC — Juizado Especial', novos: 2341, sentencas: 2156, taxa: '48,3%' },
];

export default function DashboardGrid() {
  const {
    workspaceKpis, workspaceCharts, workspaceDimensionFilters,
    workspaceChartDefs, workspaceKpiDefs, workspaceTitle,
    setDimensionFilterValue, updateWorkspaceFromRequery,
  } = useAppStore();

  const [requeryLoading, setRequeryLoading] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState<{ option: Record<string, unknown>; title: string } | null>(null);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Re-trigger animation on chart data change
  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [workspaceCharts, workspaceKpis]);

  const hasLiveData = workspaceChartDefs.length > 0;
  const hasChartResults = workspaceCharts.length > 0;
  const kpis = hasLiveData ? workspaceKpis : demoKpis;

  /* ── Perform requery ──────────────────────────────────────── */
  const doRequery = useCallback(async (overrideFilters?: any[], overridePeriod?: { from: string; to: string } | null) => {
    const currentFilters = useAppStore.getState().workspaceDimensionFilters;
    const filters = overrideFilters || currentFilters;
    const activeFilters = filters
      .filter((f: any) => f.selectedValue && f.selectedValue !== '__all__')
      .map((f: any) => ({ dimension: f.dimension, operator: 'equals', values: [f.selectedValue] }));

    const chartDefs = useAppStore.getState().workspaceChartDefs;
    const kpiDefs = useAppStore.getState().workspaceKpiDefs;
    if (!chartDefs.length) return;

    const p = overridePeriod !== undefined ? overridePeriod : period;

    setRequeryLoading(true);
    try {
      const body: any = {
        chart_defs: chartDefs,
        kpi_defs: kpiDefs,
        filters: activeFilters,
        title: useAppStore.getState().workspaceTitle,
      };
      if (p && p.from && p.to) {
        body.period = { date_from: p.from, date_to: p.to };
      }
      const res = await fetch('/api/pipeline/requery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      updateWorkspaceFromRequery(data);
    } catch (err) {
      console.error('[DashboardGrid] requery error:', err);
    } finally {
      setRequeryLoading(false);
    }
  }, [period, updateWorkspaceFromRequery]);

  const handleFilterChange = useCallback(async (dimension: string, value: string) => {
    setDimensionFilterValue(dimension, value);
    const currentFilters = useAppStore.getState().workspaceDimensionFilters;
    const updated = currentFilters.map((f) =>
      f.dimension === dimension ? { ...f, selectedValue: value } : f
    );
    await doRequery(updated);
  }, [setDimensionFilterValue, doRequery]);

  const handleDateRangeChange = useCallback(async (from: string, to: string) => {
    const newPeriod = from && to ? { from, to } : null;
    setPeriod(newPeriod);
    await doRequery(undefined, newPeriod);
  }, [doRequery]);

  return (
    <>
      <div className="dash-grid">
        {/* ── Toolbar: Filters + Date picker + Style selector ── */}
        {(workspaceDimensionFilters.length > 0 || hasLiveData) && (
          <div className="dash-toolbar">
            <div className="dash-toolbar-left">
              {workspaceDimensionFilters.map((f, i) => (
                f.values && f.values.length > 0 ? (
                  <select
                    key={i}
                    className="dash-filter-select"
                    value={f.selectedValue || '__all__'}
                    onChange={(e) => handleFilterChange(f.dimension, e.target.value)}
                    disabled={requeryLoading}
                  >
                    <option value="__all__">{f.title} — Todos</option>
                    {f.values.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <span key={i} className="dash-filter-pill">{f.title}</span>
                )
              ))}
              {hasLiveData && (
                <DateRangePicker onRangeChange={handleDateRangeChange} disabled={requeryLoading} />
              )}
              {requeryLoading && <span className="model-spinner" style={{ marginLeft: 8, width: 16, height: 16 }} />}
            </div>
          </div>
        )}

        {/* ── KPIs ── */}
        {requeryLoading ? (
          <>
            <SkeletonCard type="kpi" />
            <SkeletonCard type="kpi" />
            <SkeletonCard type="kpi" />
            <SkeletonCard type="kpi" />
          </>
        ) : (
          kpis.map((k: any, i: number) => (
            <div key={i} className={`col-3 dash-card-enter ${mounted ? 'visible' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
              <KPICard
                label={k.label}
                value={k.value}
                change={k.change}
                sparkline={k.sparkline}
                measure={k.measure}
              />
            </div>
          ))
        )}

        {/* ── Charts ── */}
        {requeryLoading ? (
          <>
            <SkeletonCard type="chart" span="col-6" />
            <SkeletonCard type="chart" span="col-6" />
            <SkeletonCard type="chart" span="col-12" />
          </>
        ) : hasLiveData && hasChartResults ? (
          workspaceCharts.map((c: any, i: number) => {
            const delay = (kpis.length + i) * 60;
            // Table chart
            if (c.chart_type === 'table' && Array.isArray(c.data) && c.data.length > 0) {
              const cols: string[] = Array.isArray(c.x_field) ? c.x_field : Object.keys(c.data[0]);
              const spanClass = c.span ? c.span.includes('span-') ? c.span.replace('span-', 'col-') : c.span : 'col-6';
              return (
                <div key={i} className={`${spanClass} dash-card-enter ${mounted ? 'visible' : ''}`} style={{ animationDelay: `${delay}ms` }}>
                  <div className="dash-card">
                    <div className="dash-card-header">
                      <h4>{c.title}</h4>
                    </div>
                    <div className="mini-table">
                      <table>
                        <thead><tr>{cols.map((col: string) => <th key={col}>{col}</th>)}</tr></thead>
                        <tbody>
                          {c.data.slice(0, 50).map((row: any, ri: number) => (
                            <tr key={ri}>{cols.map((col: string) => <td key={col}>{row[col] ?? ''}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            }

            // ECharts
            const option = c.option || buildChartOption(c);
            const spanClass = c.span ? c.span.includes('span-') ? c.span.replace('span-', 'col-') : c.span : 'col-6';
            const description = c.description || '';
            return (
              <div key={i} className={`${spanClass} dash-card-enter ${mounted ? 'visible' : ''}`} style={{ animationDelay: `${delay}ms` }}>
                <div className="dash-card">
                  <div className="dash-card-header">
                    <div className="dash-card-title-group">
                      <h4>{c.title}</h4>
                      {c.y_field && (
                        <span className="dash-card-subtitle">{c.y_field.split('.').pop()}</span>
                      )}
                    </div>
                    <div className="dash-card-actions">
                      {description && (
                        <span className="dash-card-info" title={description}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        </span>
                      )}
                      <button
                        className="dash-card-expand"
                        onClick={() => setFullscreenChart({ option, title: c.title })}
                        title="Expandir"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                          <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <DynamicChart option={option} height={220} />
                </div>
              </div>
            );
          })
        ) : hasLiveData ? (
          /* No data for current filters */
          <div className="col-12 dash-card-enter visible" style={{ gridColumn: '1 / -1' }}>
            <div className="dash-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, opacity: 0.7 }}>
              <div style={{ textAlign: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', opacity: 0.5 }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Nenhum dado encontrado para os filtros selecionados.</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Tente ajustar os filtros ou o período.</p>
              </div>
            </div>
          </div>
        ) : (
          /* Demo charts */
          <>
            <div className={`dash-card-enter ${mounted ? 'visible' : ''}`} style={{ animationDelay: '240ms' }}>
              <div className="dash-card col-8">
                <div className="dash-card-header"><h4>Movimentação Processual — 1º Semestre 2024</h4></div>
                <DynamicChart option={barOpt} height={220} />
              </div>
            </div>
            <div className={`dash-card-enter ${mounted ? 'visible' : ''}`} style={{ animationDelay: '300ms' }}>
              <div className="dash-card col-4">
                <div className="dash-card-header"><h4>Distribuição por Competência</h4></div>
                <DynamicChart option={donutOpt} height={220} />
              </div>
            </div>
            <div className={`dash-card-enter ${mounted ? 'visible' : ''}`} style={{ animationDelay: '360ms' }}>
              <div className="dash-card col-6">
                <div className="dash-card-header"><h4>Taxa de Congestionamento (Tendência)</h4></div>
                <DynamicChart option={lineOpt} height={200} />
              </div>
            </div>
            <div className={`dash-card-enter ${mounted ? 'visible' : ''}`} style={{ animationDelay: '420ms' }}>
              <div className="dash-card col-6">
                <div className="dash-card-header"><h4>Performance por Vara</h4></div>
                <div className="mini-table">
                  <table>
                    <thead>
                      <tr><th>Vara / Unidade</th><th>Casos Novos</th><th>Sentenças</th><th>Tx. Cong.</th></tr>
                    </thead>
                    <tbody>
                      {tableData.map((r) => (
                        <tr key={r.vara}>
                          <td>{r.vara}</td>
                          <td>{r.novos.toLocaleString('pt-BR')}</td>
                          <td>{r.sentencas.toLocaleString('pt-BR')}</td>
                          <td>{r.taxa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Fullscreen modal ── */}
      {fullscreenChart && (
        <ChartFullscreen
          option={fullscreenChart.option}
          title={fullscreenChart.title}
          onClose={() => setFullscreenChart(null)}
        />
      )}
    </>
  );
}
