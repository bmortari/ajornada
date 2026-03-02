import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Conversation, ConversationSummary, Message } from '../types/chat';

/**
 * Hook for conversation persistence via backend API.
 * Auto-saves the active conversation after each message.
 */
export function useConversations() {
  const {
    messages, chatMode, selectedModel,
    activeConversationId, setActiveConversationId,
    conversationList, setConversationList,
  } = useAppStore();

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch conversation list ───────────────────────────────
  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations?limit=50');
      if (!res.ok) return;
      const data: ConversationSummary[] = await res.json();
      setConversationList(data);
    } catch (e) {
      console.warn('[Conversations] fetch list error:', e);
    }
  }, [setConversationList]);

  // ── Load a conversation ───────────────────────────────────
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const conv: Conversation = await res.json();

      const store = useAppStore.getState();
      store.setChatMode(conv.mode);
      if (conv.model) store.setSelectedModel(conv.model);
      // Replace messages in store
      store.loadConversationMessages(conv.messages, conv.id, conv.title);
    } catch (e) {
      console.error('[Conversations] load error:', e);
    }
  }, []);

  // ── Create a new conversation ─────────────────────────────
  const createConversation = useCallback(async (msgs: Message[]): Promise<string | null> => {
    try {
      const firstUser = msgs.find((m) => m.role === 'user');
      const title = firstUser
        ? firstUser.content.slice(0, 60).replace(/\n/g, ' ')
        : 'Nova Conversa';

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          mode: chatMode,
          model: selectedModel,
          messages: msgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            thinking: m.thinking || null,
            charts: m.charts || null,
            kpis: m.kpis || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const conv: Conversation = await res.json();
      setActiveConversationId(conv.id);
      fetchList(); // refresh sidebar
      return conv.id;
    } catch (e) {
      console.error('[Conversations] create error:', e);
      return null;
    }
  }, [chatMode, selectedModel, setActiveConversationId, fetchList]);

  // ── Update existing conversation ──────────────────────────
  const updateConversation = useCallback(async (id: string, msgs: Message[]) => {
    try {
      const firstUser = msgs.find((m) => m.role === 'user');
      const title = firstUser
        ? firstUser.content.slice(0, 60).replace(/\n/g, ' ')
        : 'Nova Conversa';

      await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          model: selectedModel,
          messages: msgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            thinking: m.thinking || null,
            charts: m.charts || null,
            kpis: m.kpis || null,
          })),
        }),
      });
      fetchList(); // refresh sidebar
    } catch (e) {
      console.error('[Conversations] update error:', e);
    }
  }, [selectedModel, fetchList]);

  // ── Delete conversation ───────────────────────────────────
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      fetchList();
    } catch (e) {
      console.error('[Conversations] delete error:', e);
    }
  }, [activeConversationId, setActiveConversationId, fetchList]);

  // ── Auto-save: debounce on messages change ────────────────
  useEffect(() => {
    // Only auto-save when there are actual messages (not welcome screen)
    if (messages.length === 0) return;
    // Don't save while streaming
    const { isStreaming } = useAppStore.getState();
    if (isStreaming) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      const convId = useAppStore.getState().activeConversationId;
      if (convId) {
        await updateConversation(convId, messages);
      } else {
        await createConversation(messages);
      }
    }, 1500); // 1.5s debounce

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, createConversation, updateConversation]);

  // ── Load list on mount ────────────────────────────────────
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { fetchList, loadConversation, deleteConversation };
}
