import { create } from 'zustand';
import type { Message, DashboardPayload, SchemaInfo, ChatMode, PendingDashboard, SavedDashboard, TerminalLog, ConversationSummary } from '../types/chat';

type Theme = 'dark' | 'light' | 'nativa';

interface AppState {
  // Theme
  theme: Theme;
  setTheme: (t: Theme) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Context Panel
  contextPanelOpen: boolean;
  toggleContextPanel: () => void;

  // Schema Info (for ContextPanel)
  schemaInfo: SchemaInfo | null;
  setSchemaInfo: (info: SchemaInfo) => void;

  // Draft text (for ContextPanel → InputArea injection)
  draftText: string;
  setDraftText: (text: string) => void;

  // Model selector
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // Deep search toggle (busca profunda)
  deepSearch: boolean;
  setDeepSearch: (v: boolean) => void;

  // Chat mode
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;

  // Pending dashboard (from BI agent workspace_ready)
  pendingDashboard: PendingDashboard | null;
  setPendingDashboard: (spec: PendingDashboard | null) => void;

  // Saved dashboards
  savedDashboards: SavedDashboard[];
  saveDashboard: (dashboard: SavedDashboard) => void;
  removeSavedDashboard: (id: string) => void;

  // Workspace
  workspaceOpen: boolean;
  workspacePayload: DashboardPayload | null;
  workspaceTitle: string;
  workspaceKpis: any[];
  workspaceCharts: any[];
  workspaceDimensionFilters: Array<{ dimension: string; title: string; values?: string[]; selectedValue?: string }>;
  workspaceChartDefs: any[];
  workspaceKpiDefs: any[];
  openWorkspace: (payload?: DashboardPayload) => void;
  closeWorkspace: () => void;
  setDimensionFilterValue: (dimension: string, value: string) => void;
  updateWorkspaceFromRequery: (data: any) => void;

  // Wizard
  wizardOpen: boolean;
  openWizard: () => void;
  closeWizard: () => void;

  // Terminal logs (audit trail)
  terminalLogs: TerminalLog[];
  addTerminalLog: (log: TerminalLog) => void;
  clearTerminalLogs: () => void;

  // Chat panel width (for resizable divider)
  chatPanelWidth: number;
  setChatPanelWidth: (w: number) => void;

  // Conversation persistence
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  conversationList: ConversationSummary[];
  setConversationList: (list: ConversationSummary[]) => void;
  loadConversationMessages: (msgs: Message[], convId: string, title: string) => void;

  // Chat
  messages: Message[];
  isStreaming: boolean;
  statusText: string;
  showWelcome: boolean;
  addMessage: (msg: Message) => void;
  updateLastBotMessage: (content: string) => void;
  flushTextToThinking: () => void;
  addThinkingToLastBot: (text: string) => void;
  addChartToLastBot: (chart: any) => void;
  addKpiToLastBot: (kpi: any) => void;
  setShowMarkerOnLastBot: () => void;
  setPendingDashboardOnLastBot: (spec: PendingDashboard) => void;
  setStreaming: (v: boolean) => void;
  setStatusText: (text: string) => void;
  hideWelcome: () => void;
  clearMessages: () => void;
}

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const getInitialModel = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('chatdatajud-model') || DEFAULT_MODEL;
  }
  return DEFAULT_MODEL;
};

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('chatdatajud-theme') as Theme) || 'dark';
  }
  return 'dark';
};

const getInitialMode = (): ChatMode => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('chatdatajud-mode') as ChatMode) || 'conversational';
  }
  return 'conversational';
};

const getSavedDashboards = (): SavedDashboard[] => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('chatdatajud-dashboards');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  return [];
};

export const useAppStore = create<AppState>((set) => ({
  // Theme
  theme: getInitialTheme(),
  setTheme: (t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('chatdatajud-theme', t);
    set({ theme: t });
  },

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Context Panel
  contextPanelOpen: true,
  toggleContextPanel: () => set((s) => ({ contextPanelOpen: !s.contextPanelOpen })),

  // Schema Info
  schemaInfo: null,
  setSchemaInfo: (info) => set({ schemaInfo: info }),

  // Draft text
  draftText: '',
  setDraftText: (text) => set({ draftText: text }),

  // Model selector
  selectedModel: getInitialModel(),
  setSelectedModel: (model) => {
    localStorage.setItem('chatdatajud-model', model);
    set({ selectedModel: model });
  },

  // Deep search toggle
  deepSearch: typeof window !== 'undefined' ? localStorage.getItem('chatdatajud-deepsearch') === 'true' : false,
  setDeepSearch: (v) => {
    localStorage.setItem('chatdatajud-deepsearch', String(v));
    set({ deepSearch: v });
  },

  // Chat mode
  chatMode: getInitialMode(),
  setChatMode: (mode) => {
    localStorage.setItem('chatdatajud-mode', mode);
    set({ chatMode: mode });
  },

  // Pending dashboard
  pendingDashboard: null,
  setPendingDashboard: (spec) => set({ pendingDashboard: spec }),

  // Saved dashboards
  savedDashboards: getSavedDashboards(),
  saveDashboard: (dashboard) => set((s) => {
    const updated = [...s.savedDashboards, dashboard];
    localStorage.setItem('chatdatajud-dashboards', JSON.stringify(updated));
    return { savedDashboards: updated };
  }),
  removeSavedDashboard: (id) => set((s) => {
    const updated = s.savedDashboards.filter(d => d.id !== id);
    localStorage.setItem('chatdatajud-dashboards', JSON.stringify(updated));
    return { savedDashboards: updated };
  }),

  // Workspace
  workspaceOpen: false,
  workspacePayload: null,
  workspaceTitle: 'Painel Analítico',
  workspaceKpis: [],
  workspaceCharts: [],
  workspaceDimensionFilters: [],
  workspaceChartDefs: [],
  workspaceKpiDefs: [],
  openWorkspace: (payload) =>
    set({
      workspaceOpen: true,
      workspacePayload: payload || null,
      workspaceTitle: payload?.title || 'Painel Analítico',
      workspaceKpis: payload?.kpis || [],
      workspaceCharts: payload?.charts || [],
      workspaceDimensionFilters: payload?.dimension_filters || [],
      workspaceChartDefs: payload?.chart_defs || [],
      workspaceKpiDefs: payload?.kpi_defs || [],
    }),
  closeWorkspace: () => set({ workspaceOpen: false }),
  setDimensionFilterValue: (dimension, value) =>
    set((s) => ({
      workspaceDimensionFilters: s.workspaceDimensionFilters.map((f) =>
        f.dimension === dimension ? { ...f, selectedValue: value } : f
      ),
    })),
  updateWorkspaceFromRequery: (data) =>
    set({
      workspaceKpis: data.kpis || [],
      workspaceCharts: data.charts || [],
      workspaceChartDefs: data.chart_defs || [],
      workspaceKpiDefs: data.kpi_defs || [],
    }),

  // Wizard
  wizardOpen: false,
  openWizard: () => set({ wizardOpen: true, workspaceOpen: false }),
  closeWizard: () => set({ wizardOpen: false }),

  // Terminal logs
  terminalLogs: [],
  addTerminalLog: (log) => set((s) => ({ terminalLogs: [...s.terminalLogs, log] })),
  clearTerminalLogs: () => set({ terminalLogs: [] }),

  // Chat panel width
  chatPanelWidth: 72,
  setChatPanelWidth: (w) => set({ chatPanelWidth: w }),

  // Conversation persistence
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  conversationList: [],
  setConversationList: (list) => set({ conversationList: list }),
  loadConversationMessages: (msgs, convId, _title) =>
    set({
      messages: msgs,
      activeConversationId: convId,
      showWelcome: false,
      workspaceOpen: false,
      wizardOpen: false,
    }),

  // Chat
  messages: [],
  isStreaming: false,
  statusText: '',
  showWelcome: true,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastBotMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          // Append content (streaming) — keep streaming:true
          msgs[i] = { ...msgs[i], content: (msgs[i].content || '') + content };
          break;
        }
      }
      return { messages: msgs };
    }),
  flushTextToThinking: () =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          const currentContent = msgs[i].content || '';
          if (currentContent.trim()) {
            msgs[i] = {
              ...msgs[i],
              thinking: [...(msgs[i].thinking || []), currentContent.trim()],
              content: '',
            };
          }
          break;
        }
      }
      return { messages: msgs };
    }),
  addThinkingToLastBot: (text) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          msgs[i] = { ...msgs[i], thinking: [...(msgs[i].thinking || []), text] };
          break;
        }
      }
      return { messages: msgs };
    }),
  addChartToLastBot: (chart) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          msgs[i] = { ...msgs[i], charts: [...(msgs[i].charts || []), chart] };
          break;
        }
      }
      return { messages: msgs };
    }),
  addKpiToLastBot: (kpi) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          msgs[i] = { ...msgs[i], kpis: [...(msgs[i].kpis || []), kpi] };
          break;
        }
      }
      return { messages: msgs };
    }),
  setShowMarkerOnLastBot: () =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          msgs[i] = { ...msgs[i], showMarker: true };
          break;
        }
      }
      return { messages: msgs };
    }),
  setPendingDashboardOnLastBot: (spec) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          msgs[i] = { ...msgs[i], pendingDashboard: spec, showMarker: true };
          break;
        }
      }
      return { messages: msgs, pendingDashboard: spec };
    }),
  setStreaming: (v) => set({ isStreaming: v }),
  setStatusText: (text) => set({ statusText: text }),
  hideWelcome: () => set({ showWelcome: false }),
  clearMessages: () => set({ messages: [], showWelcome: true, workspaceOpen: false, wizardOpen: false, workspacePayload: null, pendingDashboard: null, activeConversationId: null }),
}));
