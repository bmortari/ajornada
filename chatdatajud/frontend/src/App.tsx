import { useAppStore } from './store/useAppStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ChatPanel from './components/chat/ChatPanel';
import WorkspacePanel from './components/workspace/WorkspacePanel';
import ContextPanel from './components/context/ContextPanel';
import DashboardWizard from './components/workspace/DashboardWizard';
import { useConversations } from './hooks/useConversations';
import { useEffect, useRef, useCallback, useState } from 'react';
import type { Step4Response } from './types/pipeline';

export default function App() {
  const { theme, workspaceOpen, contextPanelOpen, wizardOpen, closeWizard, openWorkspace, chatPanelWidth, setChatPanelWidth } = useAppStore();
  useConversations(); // auto-save + list refresh
  const dividerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Separate width state for split mode (chat vs workspace)
  const [splitChatPct, setSplitChatPct] = useState(35);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleWizardComplete = (result: Step4Response) => {
    closeWizard();
    openWorkspace({
      title: result.title || 'Painel — Datajud',
      kpis: result.kpis || [],
      charts: result.charts || [],
    });
  };

  const handleWizardCancel = () => {
    closeWizard();
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const startX = e.clientX;
    const startWidth = chatPanelWidth;
    const contentRect = contentEl.getBoundingClientRect();

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newPct = startWidth + (dx / contentRect.width) * 100;
      const clamped = Math.min(Math.max(newPct, 30), 80);
      setChatPanelWidth(clamped);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [chatPanelWidth, setChatPanelWidth]);

  // Mouse handler for split mode (chat vs workspace)
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const startX = e.clientX;
    const startWidth = splitChatPct;
    const contentRect = contentEl.getBoundingClientRect();

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newPct = startWidth + (dx / contentRect.width) * 100;
      const clamped = Math.min(Math.max(newPct, 20), 60);
      setSplitChatPct(clamped);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [splitChatPct]);

  return (
    <div className="app">
      <div className="bg-pattern" />
      <Sidebar />
      <div className="main-area">
        <Header />
        <div className="content" ref={contentRef}>
          {wizardOpen ? (
            <DashboardWizard
              onComplete={handleWizardComplete}
              onCancel={handleWizardCancel}
            />
          ) : (
            <>
              <div
                className={`chat-wrap${workspaceOpen ? ' split' : contextPanelOpen ? ' with-context' : ' full'}`}
                style={
                  workspaceOpen
                    ? { width: `${splitChatPct}%`, flex: 'none' }
                    : !workspaceOpen && contextPanelOpen
                      ? { width: `${chatPanelWidth}%` }
                      : undefined
                }
              >
                <ChatPanel />
              </div>
              {workspaceOpen && (
                <>
                  <div className="resize-divider" onMouseDown={handleSplitMouseDown}>
                    <div className="resize-handle" />
                  </div>
                  <WorkspacePanel />
                </>
              )}
              {!workspaceOpen && contextPanelOpen && (
                <>
                  <div
                    ref={dividerRef}
                    className="resize-divider"
                    onMouseDown={handleMouseDown}
                  >
                    <div className="resize-handle" />
                  </div>
                  <ContextPanel />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
