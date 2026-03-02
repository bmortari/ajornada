/* Types for the Dashboard Builder Pipeline */

export interface FilterDimensionWithValues {
  name: string;
  title: string;
  cube: string;
  type: string;
  values: string[];
}

export interface Step1Response {
  dimensions: FilterDimensionWithValues[];
  suggested: string[];
}

export interface SelectedFilter {
  dimension: string;   // "cube.field"
  operator: string;
  values: string[];
}

export interface PeriodFilter {
  date_from: string;   // "YYYY-MM-DD"
  date_to: string;
}

export interface MetricOption {
  name: string;        // "cube.measure"
  title: string;
  cube: string;
  type: string;
}

export interface Step2Response {
  all_metrics: MetricOption[];
  suggested_metrics: string[];
  suggestion_reasoning: string;
}

export interface SelectedMetric {
  name: string;
}

/* Step 3 — Chart Type suggestions */
export type ChartTypeOption = 'bar' | 'line' | 'pie' | 'area' | 'kpi' | 'table';

export interface Step3Response {
  suggested_chart_types: ChartTypeOption[];
  reasoning: string;
}

/* Step 4 — Final dashboard generation */
export interface Step4Response {
  title: string;
  kpis: any[];
  charts: any[];
}

export type WizardStep = 1 | 2 | 3 | 4;

export interface WizardState {
  step: WizardStep;
  isLoading: boolean;
  error: string | null;

  // Step 1
  availableDimensions: FilterDimensionWithValues[];
  suggestedDimensions: string[];
  selectedFilters: SelectedFilter[];
  period: PeriodFilter | null;

  // Step 2
  allMetrics: MetricOption[];
  suggestedMetrics: string[];
  suggestionReasoning: string;
  selectedMetrics: SelectedMetric[];

  // Step 3
  availableChartTypes: ChartTypeOption[];
  suggestedChartTypes: ChartTypeOption[];
  chartTypeReasoning: string;
  selectedChartTypes: ChartTypeOption[];

  // Step 4
  dashboardResult: Step4Response | null;
}
