export type ChatMode = 'conversational' | 'bi_agent' | 'deep_research' | 'reports';

export interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  streaming?: boolean;
  thinking?: string[];
  charts?: ChartPayload[];
  kpis?: KPIPayload[];
  showMarker?: boolean;
  pendingDashboard?: PendingDashboard;
}

export interface PendingDashboard {
  filters: Array<{ dimension: string; title: string }>;
  metrics: string[];
  chart_types: string[];
  period?: { date_from: string; date_to: string };
  title?: string;
}

export interface SavedDashboard {
  id: string;
  title: string;
  payload: DashboardPayload;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  model?: string;
  messages: Message[];
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  mode: ChatMode;
  model?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChartPayload {
  chart_type: string;
  title: string;
  data: any[];
  x_field?: string;
  y_field?: string;
  series_field?: string;
  option: Record<string, unknown>;
  span?: string;
}

export interface KPIPayload {
  title: string;
  value: string;
  label: string;
  change?: string;
  changeDirection?: string;
}

export interface DashboardPayload {
  title: string;
  kpis: KPIPayload[];
  charts: ChartPayload[];
  dimension_filters?: Array<{ dimension: string; title: string; values?: string[]; selectedValue?: string }>;
  chart_defs?: any[];
  kpi_defs?: any[];
}

/* ── Schema / Context Panel types ── */

export interface SchemaMeasure {
  name: string;
  title: string;
  shortTitle: string;
  type: string;
}

export interface SchemaDimension {
  name: string;
  title: string;
  shortTitle: string;
  type: string;
}

export interface SchemaTimeDimension {
  name: string;
  title: string;
  shortTitle: string;
}

export interface SchemaCube {
  name: string;
  title: string;
  measures: SchemaMeasure[];
  dimensions: SchemaDimension[];
  timeDimensions: SchemaTimeDimension[];
}

export interface SchemaInfo {
  cubes: SchemaCube[];
  sampleValues: Record<string, string[]>;
  suggestedQuestions: string[];
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: 'query' | 'script' | 'cube' | 'error' | 'info';
  title: string;
  detail?: string;
  duration?: number;
}

/* ── Model Selector types ── */

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  free: boolean;
}
