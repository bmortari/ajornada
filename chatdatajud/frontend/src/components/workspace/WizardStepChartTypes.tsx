import type { ChartTypeOption } from '../../types/pipeline';

const CHART_TYPE_INFO: Record<ChartTypeOption, { label: string; icon: string; desc: string }> = {
  bar:   { label: 'Barras',  icon: '📊', desc: 'Compare valores entre categorias' },
  line:  { label: 'Linhas',  icon: '📈', desc: 'Evolução temporal de métricas' },
  pie:   { label: 'Pizza',   icon: '🥧', desc: 'Proporção entre partes do todo' },
  area:  { label: 'Área',    icon: '📉', desc: 'Tendências com volume preenchido' },
  kpi:   { label: 'KPI',     icon: '🎯', desc: 'Indicadores numéricos destacados' },
  table: { label: 'Tabela',  icon: '📋', desc: 'Dados tabulares detalhados' },
};

const ALL_CHART_TYPES: ChartTypeOption[] = ['bar', 'line', 'pie', 'area', 'kpi', 'table'];

interface Props {
  pipeline: {
    state: {
      suggestedChartTypes: ChartTypeOption[];
      chartTypeReasoning: string;
      selectedChartTypes: ChartTypeOption[];
      isLoading: boolean;
    };
    toggleChartType: (ct: ChartTypeOption) => void;
    submitStep3: () => void;
    goToStep: (step: 1 | 2 | 3 | 4) => void;
  };
}

export default function WizardStepChartTypes({ pipeline }: Props) {
  const { state, toggleChartType, submitStep3 } = pipeline;
  const canProceed = state.selectedChartTypes.length > 0;

  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Tipos de Visualização</h3>
      <p className="wizard-step-desc">
        Selecione os tipos de gráficos para o seu painel.
      </p>

      {state.chartTypeReasoning && (
        <div className="wizard-suggestion-box">
          <span className="wizard-suggestion-icon">💡</span>
          <p>{state.chartTypeReasoning}</p>
        </div>
      )}

      <div className="chart-type-grid">
        {ALL_CHART_TYPES.map((ct) => {
          const info = CHART_TYPE_INFO[ct];
          const selected = state.selectedChartTypes.includes(ct);
          const suggested = state.suggestedChartTypes.includes(ct);
          return (
            <div
              key={ct}
              className={`chart-type-card${selected ? ' selected' : ''}${suggested ? ' suggested' : ''}`}
              onClick={() => toggleChartType(ct)}
            >
              <div className="chart-type-icon">{info.icon}</div>
              <div className="chart-type-label">{info.label}</div>
              <div className="chart-type-desc">{info.desc}</div>
              {suggested && <span className="chart-type-badge">sugerido</span>}
              {selected && (
                <div className="chart-type-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="wizard-step-actions">
        <button
          className="wizard-btn secondary"
          onClick={() => pipeline.goToStep(2)}
        >
          Voltar
        </button>
        <button
          className="wizard-btn primary"
          onClick={submitStep3}
          disabled={!canProceed}
        >
          Gerar Dashboard →
        </button>
      </div>
    </div>
  );
}
