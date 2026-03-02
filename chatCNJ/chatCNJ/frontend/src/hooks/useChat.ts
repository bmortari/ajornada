import { useAppStore } from '../store/useAppStore';
import type { Message } from '../types/chat';

let idCounter = 0;
const genId = () => `msg-${++idCounter}-${Date.now()}`;

let currentAbortController: AbortController | null = null;

const actions = () => {
  const s = useAppStore.getState();
  return {
    addMessage: s.addMessage,
    updateLastBotMessage: s.updateLastBotMessage,
    addThinkingToLastBot: s.addThinkingToLastBot,
    flushTextToThinking: s.flushTextToThinking,
    addSourcesToLastBot: s.addSourcesToLastBot,
    addWebSourcesToLastBot: s.addWebSourcesToLastBot,
    setStreaming: s.setStreaming,
    setStatusText: s.setStatusText,
    hideWelcome: s.hideWelcome,
  };
};

/** Auto-save conversation to the backend */
async function autoSaveConversation() {
  const state = useAppStore.getState();
  const { messages, activeConversationId, selectedModel, deepResearch } = state;

  if (messages.length < 2) return;

  // Generate a title from the first user message
  const firstUserMsg = messages.find((m) => m.role === 'user');
  const title = firstUserMsg ? firstUserMsg.content.slice(0, 80) : 'Nova conversa';

  // Serialize messages for storage
  const serializedMsgs = messages.map((m) => ({
    role: m.role,
    content: m.content,
    sources: m.sources,
    webSources: m.webSources,
    thinking: m.thinking,
  }));

  const convId = activeConversationId || crypto.randomUUID();

  const convData = {
    id: convId,
    title,
    mode: deepResearch ? 'deep_research' : 'chat',
    model: selectedModel,
    messages: serializedMsgs,
    message_count: serializedMsgs.length,
    updated_at: new Date().toISOString(),
  };

  try {
    const storedStr = localStorage.getItem('chatnormas-conversations') || '[]';
    let conversations = JSON.parse(storedStr);
    
    const idx = conversations.findIndex((c: any) => c.id === convId);
    if (idx >= 0) {
      conversations[idx] = convData;
    } else {
      conversations.unshift(convData);
    }
    
    if (conversations.length > 50) conversations = conversations.slice(0, 50);
    
    localStorage.setItem('chatnormas-conversations', JSON.stringify(conversations));

    // Update active conversation ID
    useAppStore.getState().setActiveConversationId(convId);

    // Refresh conversation list
    useAppStore.getState().setConversationList(
      conversations.map((c: any) => ({
        id: c.id,
        title: c.title,
        updated_at: c.updated_at,
        message_count: c.message_count,
        mode: c.mode,
      }))
    );
  } catch {
    // Silently fail
  }
}

export function useChat() {
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
    const { messages, selectedModel, deepResearch, searchFilters, toolsConfig } = useAppStore.getState();

    a.hideWelcome();

    const userMsg: Message = { id: genId(), role: 'user', content: text };
    a.addMessage(userMsg);
    a.setStreaming(true);
    a.setStatusText('Analisando consulta...');

    const botMsg: Message = { id: genId(), role: 'bot', content: '', streaming: true };
    a.addMessage(botMsg);

    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const abortController = new AbortController();
    currentAbortController = abortController;

    try {
      const response = await fetch('api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          model: selectedModel,
          mode: deepResearch ? 'deep_research' : 'chat',
          filters: searchFilters,
          tools_config: toolsConfig,
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

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const eventData = line.slice(6);
            try {
              const parsed = JSON.parse(eventData);
              switch (eventType) {
                case 'status':
                  a.setStatusText(parsed.message ?? '');
                  break;
                case 'text':
                  a.updateLastBotMessage(parsed.content ?? '');
                  break;
                case 'thinking':
                  a.addThinkingToLastBot(parsed.content ?? '');
                  break;
                case 'thinking_flush':
                  a.flushTextToThinking();
                  break;
                case 'sources':
                  a.addSourcesToLastBot(parsed.sources ?? []);
                  break;
                case 'web_sources':
                  a.addWebSourcesToLastBot(parsed.sources ?? []);
                  break;
                case 'done':
                  break;
                case 'error':
                  a.updateLastBotMessage(`Erro: ${parsed.message ?? 'Erro desconhecido'}`);
                  a.setStatusText('');
                  break;
              }
            } catch {
              if (eventType === 'text') {
                a.updateLastBotMessage(eventData);
              }
            }
            eventType = '';
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        a.updateLastBotMessage(`Desculpe, ocorreu um erro: ${err.message}`);
      }
    }

    currentAbortController = null;
    a.setStreaming(false);
    a.setStatusText('');

    // Auto-save conversation after response completes
    autoSaveConversation();
  }

  return { sendMessage, stopResponse, isStreaming };
}
