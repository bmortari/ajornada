import type { usePipeline } from '../../hooks/usePipeline';
import type { FilterDimensionWithValues } from '../../types/pipeline';

interface Props {
  pipeline: ReturnType<typeof usePipeline>;
}

export default function WizardStepFilters({ pipeline }: Props) {
  const { state, toggleFilterDimension, setFilterValues, setPeriod, submitStep1 } = pipeline;

  const isSelected = (dim: FilterDimensionWithValues) =>
    state.selectedFilters.some(f => f.dimension === `${dim.cube}.${dim.name}`);

  const isSuggested = (dim: FilterDimensionWithValues) =>
    state.suggestedDimensions.includes(dim.name);

  const getFilterValues = (dim: FilterDimensionWithValues) => {
    const key = `${dim.cube}.${dim.name}`;
    const filter = state.selectedFilters.find(f => f.dimension === key);
    return filter?.values || [];
  };

  const toggleValue = (dim: FilterDimensionWithValues, value: string) => {
    const key = `${dim.cube}.${dim.name}`;
    const current = getFilterValues(dim);
    if (current.includes(value)) {
      setFilterValues(key, current.filter(v => v !== value));
    } else {
      setFilterValues(key, [...current, value]);
    }
  };

  const hasValidFilters = state.selectedFilters.some(f => f.values.length > 0);

  if (state.isLoading && state.availableDimensions.length === 0) {
    return (
      <div className="wizard-loading">
        <div className="wizard-spinner" />
        <p>Carregando filtros disponiveis...</p>
      </div>
    );
  }

  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Selecione ate 3 filtros</h3>
      <p className="wizard-step-desc">
        Escolha as dimensoes para filtrar os dados do seu dashboard.
      </p>

      {/* Filter dimension chips */}
      <div className="filter-chips">
        {state.availableDimensions.map((dim) => (
          <button
            key={dim.name}
            className={`filter-chip ${isSelected(dim) ? 'selected' : ''} ${isSuggested(dim) ? 'suggested' : ''}`}
            onClick={() => toggleFilterDimension(dim)}
            disabled={!isSelected(dim) && state.selectedFilters.length >= 3}
          >
            {dim.title}
          </button>
        ))}
      </div>

      {/* Value panels for selected filters */}
      {state.selectedFilters.map((filter) => {
        const dim = state.availableDimensions.find(
          d => `${d.cube}.${d.name}` === filter.dimension
        );
        if (!dim) return null;

        return (
          <div key={filter.dimension} className="filter-values-panel">
            <div className="filter-values-header">
              <span className="filter-values-title">{dim.title}</span>
              <span className="filter-values-count">
                {filter.values.length} selecionado{filter.values.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="filter-values-list">
              {dim.values.map((val) => (
                <label key={val} className="filter-value-item">
                  <input
                    type="checkbox"
                    checked={filter.values.includes(val)}
                    onChange={() => toggleValue(dim, val)}
                  />
                  <span>{val}</span>
                </label>
              ))}
              {dim.values.length === 0 && (
                <span className="filter-values-empty">Nenhum valor encontrado</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Period selection */}
      <div className="filter-period-section">
        <h4 className="wizard-section-label">Periodo (opcional)</h4>
        <div className="period-row">
          <input
            type="date"
            value={state.period?.date_from || ''}
            onChange={(e) =>
              setPeriod(
                e.target.value
                  ? { date_from: e.target.value, date_to: state.period?.date_to || '' }
                  : null
              )
            }
            placeholder="De"
          />
          <span className="period-separator">ate</span>
          <input
            type="date"
            value={state.period?.date_to || ''}
            onChange={(e) =>
              setPeriod(
                e.target.value
                  ? { date_from: state.period?.date_from || '', date_to: e.target.value }
                  : null
              )
            }
            placeholder="Ate"
          />
        </div>
      </div>

      {/* Next button */}
      <div className="wizard-step-actions">
        <button
          className="wizard-btn primary"
          disabled={!hasValidFilters || state.isLoading}
          onClick={submitStep1}
        >
          {state.isLoading ? 'Carregando...' : 'Proximo'}
        </button>
      </div>
    </div>
  );
}
