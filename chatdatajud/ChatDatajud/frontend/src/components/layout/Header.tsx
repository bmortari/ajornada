import { useAppStore } from '../../store/useAppStore';

export default function Header() {
  const { contextPanelOpen, toggleContextPanel } = useAppStore();

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-badge">Beta</div>
      </div>
      <div className="header-right">
        {!contextPanelOpen && (
          <button
            className="header-ctx-toggle"
            onClick={toggleContextPanel}
            title="Mostrar dados disponíveis"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </button>
        )}
        <div className="header-user">JR</div>
      </div>
    </header>
  );
}
