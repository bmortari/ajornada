import { useAppStore } from '../store/useAppStore';
import type { Message } from '../types/chat';

let idCounter = 0;
const genId = () => `msg-${++idCounter}-${Date.now()}`;

// Global AbortController for cancelling streaming
let currentAbortController: AbortController | null = null;

// Grab stable action references (these never change)
let termLogId = 0;
const genTermId = () => `tl-${++termLogId}-${Date.now()}`;
const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const actions = () => {
  const s = useAppStore.getState();
  return {
    addMessage: s.addMessage,
    updateLastBotMessage: s.updateLastBotMessage,
    addThinkingToLastBot: s.addThinkingToLastBot,
    addChartToLastBot: s.addChartToLastBot,
    addKpiToLastBot: s.addKpiToLastBot,
    setShowMarkerOnLastBot: s.setShowMarkerOnLastBot,
    setPendingDashboardOnLastBot: s.setPendingDashboardOnLastBot,
    flushTextToThinking: s.flushTextToThinking,
    setStreaming: s.setStreaming,
    setStatusText: s.setStatusText,
    hideWelcome: s.hideWelcome,
    openWorkspace: s.openWorkspace,
    addTerminalLog: s.addTerminalLog,
  };
};

export function useChat() {
  // Subscribe only to isStreaming for stop button state
  const isStreaming = useAppStore((s) => s.isStreaming);

  function stopResponse() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    actions().setStreaming(false);
    actions().setStatusText('');
  }

  async function sendMessage(text: string) {
    const a = actions();
    // Read reactive state at call time (not via subscription)
    const { messages, selectedModel, chatMode, deepSearch } = useAppStore.getState();

    a.hideWelcome();

    // Add user message
    const userMsg: Message = { id: genId(), role: 'user', content: text };
    a.addMessage(userMsg);
    a.setStreaming(true);
    a.setStatusText('Analisando consulta...');

    // Add bot placeholder
    const botMsg: Message = { id: genId(), role: 'bot', content: '', streaming: true };
    a.addMessage(botMsg);

    // Build history for API
    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    let hasCharts = false;

    // Create AbortController for this request
    const abortController = new AbortController();
    currentAbortController = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          model: selectedModel,
          mode: chatMode,
          deep_search: deepSearch,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
            // Process event
            try {
              const parsed = JSON.parse(eventData);
              console.log(`[SSE Event] type=${eventType}`, parsed);
              switch (eventType) {
                case 'status':
                  a.setStatusText(parsed.message ?? '');
                  a.addTerminalLog({
                    id: genTermId(), timestamp: now(), type: 'info',
                    title: parsed.message ?? 'Status',
                  });
                  break;
                case 'text':
                  a.updateLastBotMessage(parsed.content ?? '');
                  break;
                case 'thinking':
                  a.addThinkingToLastBot(parsed.content ?? '');
                  a.addTerminalLog({
                    id: genTermId(), timestamp: now(), type: 'script',
                    title: 'Raciocínio do agente',
                    detail: parsed.content ?? '',
                  });
                  break;
                case 'thinking_flush':
                  a.flushTextToThinking();
                  break;
                case 'chart':
                  console.log('[CHART EVENT] Adding chart:', parsed);
                  a.addChartToLastBot(parsed);
                  hasCharts = true;
                  a.addTerminalLog({
                    id: genTermId(), timestamp: now(), type: 'cube',
                    title: `Gráfico: ${parsed.title || parsed.chart_type || 'chart'}`,
                    detail: JSON.stringify(parsed.data?.slice?.(0, 3) ?? parsed, null, 2),
                  });
                  break;
                case 'kpi':
                  console.log('[KPI EVENT] Adding KPI:', parsed);
                  a.addKpiToLastBot(parsed);
                  hasCharts = true;
                  a.addTerminalLog({
                    id: genTermId(), timestamp: now(), type: 'query',
                    title: `KPI: ${parsed.title || 'indicador'} = ${parsed.value || '?'}`,
                  });
                  break;
                case 'workspace_ready':
                  console.log('[WORKSPACE_READY] Dashboard spec:', parsed);
                  a.setPendingDashboardOnLastBot(parsed);
                  a.addTerminalLog({
                    id: genTermId(), timestamp: now(), type: 'cube',
                    title: 'Dashboard pronto para geração',
                    detail: JSON.stringify(parsed, null, 2),
                  });
                  break;
                case 'done':
                  break;
                case 'error':
                  a.updateLastBotMessage(`Erro: ${parsed.message ?? 'Erro desconhecido'}`);
                  a.addTerminalLog({
                    id: genTermId(), timestamp: now(), type: 'error',
                    title: `Erro: ${parsed.message ?? 'desconhecido'}`,
                  });
                  break;
              }
            } catch (e) {
              // Not JSON, could be raw text
              if (eventType === 'text') {
                a.updateLastBotMessage(eventData);
              }
            }
            eventType = '';
            eventData = '';
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled — do nothing
      } else {
        a.updateLastBotMessage(`Desculpe, ocorreu um erro: ${err.message}`);
      }
    }

    currentAbortController = null;

    // Show workspace marker only for bi_agent mode (not conversational — charts are inline)
    if (hasCharts && chatMode === 'bi_agent') {
      setTimeout(() => {
        a.setShowMarkerOnLastBot();
      }, 200);
    }

    a.setStreaming(false);
    a.setStatusText('');
  }

  return { sendMessage, stopResponse, isStreaming };
}
