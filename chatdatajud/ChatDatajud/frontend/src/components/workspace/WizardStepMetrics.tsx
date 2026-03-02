import type { usePipeline } from '../../hooks/usePipeline';
import type { MetricOption } from '../../types/pipeline';

interface Props {
  pipeline: ReturnType<typeof usePipeline>;
}

export default function WizardStepMetrics({ pipeline }: Props) {
  const { state, toggleMetric, submitStep2 } = pipeline;

  const isSelected = (metric: MetricOption) =>
    state.selectedMetrics.some(m => m.name === metric.name);

  const isSuggested = (metric: MetricOption) =>
    state.suggestedMetrics.includes(metric.name);

  const hasMetrics = state.selectedMetrics.length > 0;

  // Group metrics by cube
  const grouped = state.allMetrics.reduce<Record<string, MetricOption[]>>((acc, m) => {
    (acc[m.cube] = acc[m.cube] || []).push(m);
    return acc;
  }, {});

  const cubeLabels: Record<string, string> = {
    casos_novos: 'Casos Novos',
    casos_baixados: 'Casos Baixados',
    casos_pendentes: 'Casos Pendentes',
    sentencas: 'Sentencas',
    datamart: 'Datamart',
  };

  if (state.isLoading) {
    return (
      <div className="wizard-loading">
        <div className="wizard-spinner" />
        <p>A IA esta analisando seus filtros...</p>
      </div>
    );
  }

  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Confirme as metricas</h3>
      <p className="wizard-step-desc">
        A IA sugeriu metricas com base nos seus filtros. Voce pode alterar a selecao.
      </p>

      {/* AI reasoning callout */}
      {state.suggestionReasoning && (
        <div className="ai-callout">
          <div className="ai-callout-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              <line x1="9" y1="21" x2="15" y2="21" />
            </svg>
          </div>
          <span>{state.suggestionReasoning}</span>
        </div>
      )}

      {/* Metrics grouped by cube */}
      {Object.entries(grouped).map(([cube, metrics]) => (
        <div key={cube} className="metric-group">
          <div className="metric-group-label">
            {cubeLabels[cube] || cube}
          </div>
          <div className="metric-list">
            {metrics.map((metric) => (
              <button
                key={metric.name}
                className={`metric-item ${isSelected(metric) ? 'selected' : ''}`}
                onClick={() => toggleMetric(metric)}
              >
                <div className="metric-item-info">
                  <span className="metric-item-title">{metric.title}</span>
                  <span className="metric-item-name">{metric.name}</span>
                </div>
                <div className="metric-item-badges">
                  <span className="cube-badge">{metric.type}</span>
                  {isSuggested(metric) && (
                    <span className="suggested-badge">sugerido</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Generate button */}
      <div className="wizard-step-actions">
        <button
          className="wizard-btn primary"
          disabled={!hasMetrics || state.isLoading}
          onClick={submitStep2}
        >
          Gerar Dashboard
        </button>
      </div>
    </div>
  );
}
