import { useAppStore } from '../../store/useAppStore';
import { useConversations } from '../../hooks/useConversations';
import type { ChatMode } from '../../types/chat';

const APPS: { id: ChatMode | 'wizard'; label: string; icon: string; description: string; devMode?: boolean }[] = [
  { id: 'conversational', label: 'Conversar', icon: '💬', description: 'Perguntas livres com gráficos inline' },
  { id: 'bi_agent', label: 'Criar Painel', icon: '📊', description: 'Dashboard completo via conversa' },
  { id: 'deep_research', label: 'Análise Estatística', icon: '🔬', description: 'Análise estatística detalhada' },
  { id: 'reports', label: 'Relatórios Gerenciais', icon: '📋', description: 'Relatórios com gráficos e textos', devMode: true },
  { id: 'wizard', label: 'Construtor de Painel', icon: '🧩', description: 'Assistente passo-a-passo' },
];

const MODE_ICONS: Record<string, string> = {
  conversational: '💬',
  bi_agent: '📊',
  deep_research: '🔬',
  reports: '📋',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function Sidebar() {
  const {
    sidebarCollapsed, toggleSidebar, theme, setTheme, clearMessages,
    openWizard, chatMode, setChatMode,
    savedDashboards, removeSavedDashboard, openWorkspace,
    conversationList, activeConversationId,
  } = useAppStore();

  const { loadConversation, deleteConversation } = useConversations();

  const handleAppClick = (app: typeof APPS[0]) => {
    if (app.id === 'wizard') {
      openWizard();
    } else {
      const mode = app.id as ChatMode;
      if (mode !== chatMode) {
        setChatMode(mode);
        clearMessages();
      }
    }
  };

  return (
    <nav className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <svg viewBox="0 0 26 26" fill="none">
              <path d="M13 4L13 18" stroke="var(--text-secondary)" strokeWidth="1.6" />
              <path d="M7 7L19 7" stroke="var(--text-secondary)" strokeWidth="1.6" />
              <path d="M7 7L5 12Q7 14.5 9 12Z" fill="none" stroke="var(--text-secondary)" strokeWidth="1.2" />
              <path d="M19 7L17 12Q19 14.5 21 12Z" fill="none" stroke="var(--text-secondary)" strokeWidth="1.2" />
              <rect x="9.5" y="18" width="7" height="2.5" rx="1" fill="none" stroke="var(--text-secondary)" strokeWidth="1.2" />
            </svg>
          </div>
          <div className="sidebar-name">Chat<span>Datajud</span></div>
        </div>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      {/* Nova Conversa - top */}
      <div className="sidebar-new-chat" onClick={clearMessages} title="Nova Conversa">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Nova Conversa</span>
      </div>

      <div className="sidebar-divider" />

      {/* Aplicações - 5 items */}
      <div className="sidebar-apps">
        <div className="sidebar-label">Aplicações</div>
        {APPS.map((app) => (
          <div
            key={app.id}
            className={`sidebar-app-item${!app.devMode && app.id !== 'wizard' && app.id === chatMode ? ' active' : ''}${app.devMode ? ' dev-mode' : ''}`}
            onClick={() => handleAppClick(app)}
            title={app.devMode ? 'Em Desenvolvimento' : app.description}
          >
            <span className="sidebar-app-icon">{app.icon}</span>
            <span className="sidebar-app-label">{app.label}</span>
            {app.devMode && <span className="sidebar-dev-badge">dev</span>}
          </div>
        ))}
      </div>

      <div className="sidebar-divider" />

      {/* Histórico de Conversas */}
      <div className="sidebar-section sidebar-history">
        {conversationList.length > 0 && (
          <>
            <div className="sidebar-label">Histórico</div>
            <div className="sidebar-conv-list">
              {conversationList.map((conv) => (
                <div
                  key={conv.id}
                  className={`sidebar-conv-item${conv.id === activeConversationId ? ' active' : ''}`}
                  onClick={() => loadConversation(conv.id)}
                  title={`${conv.title}\n${conv.message_count} mensagens • ${timeAgo(conv.updated_at)}`}
                >
                  <span className="sidebar-conv-icon">{MODE_ICONS[conv.mode] || '💬'}</span>
                  <div className="sidebar-conv-info">
                    <span className="sidebar-conv-title">{conv.title}</span>
                    <span className="sidebar-conv-meta">{timeAgo(conv.updated_at)}</span>
                  </div>
                  <button
                    className="sidebar-conv-delete"
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    title="Excluir conversa"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="12" height="12">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {savedDashboards.length > 0 && (
          <>
            <div className="sidebar-label">Meus Painéis</div>
            {savedDashboards.map((d) => (
              <div
                key={d.id}
                className="sidebar-item sidebar-saved"
                onClick={() => openWorkspace({ title: d.title, kpis: d.payload.kpis, charts: d.payload.charts })}
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>{d.title}</span>
                <button
                  className="sidebar-saved-delete"
                  onClick={(e) => { e.stopPropagation(); removeSavedDashboard(d.id); }}
                  title="Remover painel"
                >
                  ×
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="theme-switcher">
          <button className={`theme-btn${theme === 'dark' ? ' active' : ''}`} onClick={() => setTheme('dark')}>
            🌙 <span>Escuro</span>
          </button>
          <button className={`theme-btn${theme === 'light' ? ' active' : ''}`} onClick={() => setTheme('light')}>
            ☀️ <span>Claro</span>
          </button>
          <button className={`theme-btn${theme === 'nativa' ? ' active' : ''}`} onClick={() => setTheme('nativa')}>
            🌿 <span>Nativa</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
