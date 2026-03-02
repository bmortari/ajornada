import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type {
  WizardState,
  WizardStep,
  SelectedFilter,
  PeriodFilter,
  SelectedMetric,
  Step1Response,
  Step2Response,
  Step3Response,
  Step4Response,
  FilterDimensionWithValues,
  MetricOption,
  ChartTypeOption,
} from '../types/pipeline';

const ALL_CHART_TYPES: ChartTypeOption[] = ['bar', 'line', 'pie', 'area', 'kpi', 'table'];

const initialState: WizardState = {
  step: 1,
  isLoading: false,
  error: null,
  availableDimensions: [],
  suggestedDimensions: [],
  selectedFilters: [],
  period: null,
  allMetrics: [],
  suggestedMetrics: [],
  suggestionReasoning: '',
  selectedMetrics: [],
  availableChartTypes: ALL_CHART_TYPES,
  suggestedChartTypes: [],
  chartTypeReasoning: '',
  selectedChartTypes: [],
  dashboardResult: null,
};

export function usePipeline() {
  const [state, setState] = useState<WizardState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Step 1: Load filter dimensions ────────────────────────

  const loadFilters = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const resp = await fetch('/api/pipeline/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: Step1Response = await resp.json();
      setState(s => ({
        ...s,
        isLoading: false,
        availableDimensions: data.dimensions,
        suggestedDimensions: data.suggested,
      }));
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message }));
    }
  }, []);

  // ── Filter selection ──────────────────────────────────────

  const toggleFilterDimension = useCallback((dim: FilterDimensionWithValues) => {
    setState(s => {
      const key = `${dim.cube}.${dim.name}`;
      const exists = s.selectedFilters.find(f => f.dimension === key);
      if (exists) {
        return { ...s, selectedFilters: s.selectedFilters.filter(f => f.dimension !== key) };
      }
      if (s.selectedFilters.length >= 3) return s;
      return {
        ...s,
        selectedFilters: [
          ...s.selectedFilters,
          { dimension: key, operator: 'equals', values: [] },
        ],
      };
    });
  }, []);

  const setFilterValues = useCallback((dimension: string, values: string[]) => {
    setState(s => ({
      ...s,
      selectedFilters: s.selectedFilters.map(f =>
        f.dimension === dimension ? { ...f, values } : f
      ),
    }));
  }, []);

  const setPeriod = useCallback((period: PeriodFilter | null) => {
    setState(s => ({ ...s, period }));
  }, []);

  // ── Step 2: Get metric suggestions ────────────────────────

  const submitStep1 = useCallback(async () => {
    const current = stateRef.current;
    const model = useAppStore.getState().selectedModel;
    setState(s => ({ ...s, step: 2, isLoading: true, error: null }));
    try {
      const resp = await fetch('/api/pipeline/step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: current.selectedFilters,
          period: current.period,
          model,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: Step2Response = await resp.json();
      setState(s => ({
        ...s,
        isLoading: false,
        allMetrics: data.all_metrics,
        suggestedMetrics: data.suggested_metrics,
        suggestionReasoning: data.suggestion_reasoning,
        selectedMetrics: data.suggested_metrics.map(name => ({ name })),
      }));
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message }));
    }
  }, []);

  // ── Metric selection ──────────────────────────────────────

  const toggleMetric = useCallback((metric: MetricOption) => {
    setState(s => {
      const exists = s.selectedMetrics.find(m => m.name === metric.name);
      if (exists) {
        return { ...s, selectedMetrics: s.selectedMetrics.filter(m => m.name !== metric.name) };
      }
      return { ...s, selectedMetrics: [...s.selectedMetrics, { name: metric.name }] };
    });
  }, []);

  // ── Step 3: Get chart type suggestions ────────────────────

  const submitStep2 = useCallback(async () => {
    const current = stateRef.current;
    const model = useAppStore.getState().selectedModel;
    setState(s => ({ ...s, step: 3, isLoading: true, error: null }));
    try {
      const resp = await fetch('/api/pipeline/step3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: current.selectedFilters,
          metrics: current.selectedMetrics,
          model,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: Step3Response = await resp.json();
      setState(s => ({
        ...s,
        isLoading: false,
        suggestedChartTypes: data.suggested_chart_types,
        chartTypeReasoning: data.reasoning,
        selectedChartTypes: [...data.suggested_chart_types],
      }));
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message }));
    }
  }, []);

  // ── Chart type selection ──────────────────────────────────

  const toggleChartType = useCallback((ct: ChartTypeOption) => {
    setState(s => {
      const exists = s.selectedChartTypes.includes(ct);
      if (exists) {
        return { ...s, selectedChartTypes: s.selectedChartTypes.filter(c => c !== ct) };
      }
      return { ...s, selectedChartTypes: [...s.selectedChartTypes, ct] };
    });
  }, []);

  // ── Step 4: Generate dashboard ────────────────────────────

  const submitStep3 = useCallback(async () => {
    const current = stateRef.current;
    const model = useAppStore.getState().selectedModel;
    setState(s => ({ ...s, step: 4, isLoading: true, error: null }));
    try {
      const resp = await fetch('/api/pipeline/step4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: current.selectedFilters,
          period: current.period,
          metrics: current.selectedMetrics,
          chart_types: current.selectedChartTypes,
          model,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: Step4Response = await resp.json();
      setState(s => ({ ...s, isLoading: false, dashboardResult: data }));
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message }));
    }
  }, []);

  // ── Navigation ────────────────────────────────────────────

  const goToStep = useCallback((step: WizardStep) => {
    setState(s => ({ ...s, step, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    loadFilters,
    toggleFilterDimension,
    setFilterValues,
    setPeriod,
    submitStep1,
    toggleMetric,
    submitStep2,
    toggleChartType,
    submitStep3,
    goToStep,
    reset,
  };
}
