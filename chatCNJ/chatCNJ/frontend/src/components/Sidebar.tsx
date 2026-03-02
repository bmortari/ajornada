import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ConversationSummary } from '../types/chat';

export default function Sidebar() {
  const {
    conversationList, setConversationList,
    activeConversationId, loadConversationMessages,
    clearMessages,
  } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);

  // Load conversation list on mount
  useEffect(() => {
    try {
      const storedStr = localStorage.getItem('chatnormas-conversations') || '[]';
      const conversations = JSON.parse(storedStr);
      setConversationList(
        conversations.map((c: any) => ({
          id: c.id,
          title: c.title,
          updated_at: c.updated_at,
          message_count: c.message_count,
          mode: c.mode,
        }))
      );
    } catch {}
  }, []);

  const handleNewChat = () => {
    clearMessages();
  };

  const handleLoadConversation = (conv: ConversationSummary) => {
    try {
      const storedStr = localStorage.getItem('chatnormas-conversations') || '[]';
      const conversations = JSON.parse(storedStr);
      const found = conversations.find((c: any) => c.id === conv.id);
      if (found && found.messages) {
        loadConversationMessages(found.messages, conv.id);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteConversation = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      const storedStr = localStorage.getItem('chatnormas-conversations') || '[]';
      let conversations = JSON.parse(storedStr);
      conversations = conversations.filter((c: any) => c.id !== convId);
      localStorage.setItem('chatnormas-conversations', JSON.stringify(conversations));
      
      setConversationList(
        conversations.map((c: any) => ({
          id: c.id,
          title: c.title,
          updated_at: c.updated_at,
          message_count: c.message_count,
          mode: c.mode,
        }))
      );
    } catch {
      // ignore
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `${diffMins}min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  if (collapsed) {
    return (
      <aside
        className="flex flex-col items-center py-4 gap-3"
        style={{
          width: '52px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          title="Expandir sidebar"
        >
          <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={handleNewChat}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
          title="Nova conversa"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: '280px',
        minWidth: '280px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
          >
            ⚖
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            ChatCNJ
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-all"
          style={{ color: 'var(--text-muted)' }}
          title="Recolher sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="px-3 py-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
          style={{
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            boxShadow: '0 2px 8px var(--shadow)',
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Conversa
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {conversationList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Nenhuma conversa salva
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversationList.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => handleLoadConversation(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group cursor-pointer ${
                  conv.id === activeConversationId ? '' : 'hover:opacity-80'
                }`}
                style={{
                  background: conv.id === activeConversationId ? 'var(--accent-glow)' : 'transparent',
                  border: conv.id === activeConversationId ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: conv.id === activeConversationId ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      {conv.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {conv.message_count} msg
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(conv.updated_at)}
                      </span>
                      {conv.mode === 'deep_research' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                          🔬
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-all hover:bg-red-500/20"
                    style={{ color: 'var(--text-muted)' }}
                    title="Excluir conversa"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
          88k+ normativos do CNJ
        </p>
      </div>
    </aside>
  );
}
