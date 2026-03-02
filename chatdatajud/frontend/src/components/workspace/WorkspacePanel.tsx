import { useAppStore } from '../../store/useAppStore';
import DashboardGrid from './DashboardGrid';

export default function WorkspacePanel() {
  const { workspaceOpen, workspaceTitle, closeWorkspace, saveDashboard, workspaceKpis, workspaceCharts } = useAppStore();

  const handleSave = () => {
    saveDashboard({
      id: `dash-${Date.now()}`,
      title: workspaceTitle || 'Painel Analítico',
      payload: {
        title: workspaceTitle || 'Painel Analítico',
        kpis: workspaceKpis,
        charts: workspaceCharts,
      },
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className={`workspace ${workspaceOpen ? 'open' : ''}`}>
      <div className="ws-header">
        <div className="ws-tabs">
          <div className="ws-tab active">
            {workspaceTitle || 'Painel Analítico'}
          </div>
        </div>
        <div className="ws-header-actions">
          <button className="ws-save" onClick={handleSave} title="Salvar painel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
          <button className="ws-close" onClick={closeWorkspace}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="ws-body">
        <DashboardGrid />
      </div>
    </div>
  );
}
