import { create } from 'zustand';
import type { Message, ModelOption, ConversationSummary } from '../types/chat';

type Theme = 'dark' | 'light';

interface AppState {
  theme: Theme;
  setTheme: (t: Theme) => void;

  selectedModel: string;
  setSelectedModel: (model: string) => void;

  deepResearch: boolean;
  toggleDeepResearch: () => void;

  searchFilters: {
    situacoes: string[];
    origens: string[];
  };
  setSearchFilter: (type: 'situacoes' | 'origens', values: string[]) => void;

  toolsConfig: {
    searchNormas: boolean;
    searchCnjSite: boolean;
    searchWeb: boolean;
    revisorMinutas: boolean;
    parecerJuridico: boolean;
  };
  toggleTool: (tool: keyof ReturnType<typeof useAppStore>['toolsConfig']) => void;

  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;

  messages: Message[];
  isStreaming: boolean;
  statusText: string;
  showWelcome: boolean;

  addMessage: (msg: Message) => void;
  updateLastBotMessage: (content: string) => void;
  addThinkingToLastBot: (text: string) => void;
  flushTextToThinking: () => void;
  addSourcesToLastBot: (sources: any[]) => void;
  addWebSourcesToLastBot: (sources: any[]) => void;
  setStreaming: (v: boolean) => void;
  setStatusText: (text: string) => void;
  hideWelcome: () => void;
  clearMessages: () => void;

  conversationList: ConversationSummary[];
  setConversationList: (list: ConversationSummary[]) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  loadConversationMessages: (msgs: Message[], convId: string) => void;
}

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('chatnormas-theme') as Theme) || 'dark';
  }
  return 'dark';
};

const getInitialModel = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('chatnormas-model') || DEFAULT_MODEL;
  }
  return DEFAULT_MODEL;
};

export const useAppStore = create<AppState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('chatnormas-theme', t);
    set({ theme: t });
  },

  selectedModel: getInitialModel(),
  setSelectedModel: (model) => {
    localStorage.setItem('chatnormas-model', model);
    set({ selectedModel: model });
  },

  deepResearch: false,
  toggleDeepResearch: () => set((s) => ({ deepResearch: !s.deepResearch })),

  searchFilters: {
    situacoes: [],
    origens: [],
  },
  setSearchFilter: (type, values) =>
    set((s) => ({
      searchFilters: {
        ...s.searchFilters,
        [type]: values,
      },
    })),

  toolsConfig: {
    searchNormas: true,
    searchCnjSite: true,
    searchWeb: false,
    revisorMinutas: false,
    parecerJuridico: false,
  },
  toggleTool: (tool) =>
    set((s) => {
      const isActivating = !s.toolsConfig[tool];
      const newConfig = { ...s.toolsConfig, [tool]: isActivating };

      // Enforce single selection between Revisor and Parecerista
      if (tool === 'revisorMinutas' && isActivating) {
        newConfig.parecerJuridico = false;
      } else if (tool === 'parecerJuridico' && isActivating) {
        newConfig.revisorMinutas = false;
      }

      return {
        toolsConfig: newConfig,
      };
    }),

  isRightSidebarOpen: false,
  toggleRightSidebar: () => set((s) => ({ isRightSidebarOpen: !s.isRightSidebarOpen })),

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
          msgs[i] = { ...msgs[i], content: (msgs[i].content || '') + content };
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

  flushTextToThinking: () =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          const currentContent = msgs[i].content || '';
          if (currentContent.trim()) {
            const cleanContent = currentContent.replace(/<\/?think>/g, '').trim();
            msgs[i] = {
              ...msgs[i],
              thinking: [...(msgs[i].thinking || []), cleanContent],
              content: '',
            };
          }
          break;
        }
      }
      return { messages: msgs };
    }),

  addSourcesToLastBot: (sources) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          msgs[i] = { ...msgs[i], sources: [...(msgs[i].sources || []), ...sources] };
          break;
        }
      }
      return { messages: msgs };
    }),

  addWebSourcesToLastBot: (sources) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'bot') {
          msgs[i] = { ...msgs[i], webSources: [...(msgs[i].webSources || []), ...sources] };
          break;
        }
      }
      return { messages: msgs };
    }),

  setStreaming: (v) => set({ isStreaming: v }),
  setStatusText: (text) => set({ statusText: text }),
  hideWelcome: () => set({ showWelcome: false }),
  clearMessages: () =>
    set({ messages: [], showWelcome: true, activeConversationId: null }),

  conversationList: [],
  setConversationList: (list) => set({ conversationList: list }),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  loadConversationMessages: (msgs, convId) =>
    set({ messages: msgs, activeConversationId: convId, showWelcome: false }),
}));
