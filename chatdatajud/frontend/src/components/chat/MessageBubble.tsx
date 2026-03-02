import { useState } from 'react';
import { formatBold } from '../../utils/formatters';
import type { Message } from '../../types/chat';
import WorkspaceMarker from './WorkspaceMarker';
import DynamicChart from '../workspace/DynamicChart';
import { buildChartOption } from '../../utils/buildChartOption';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const { role, content, streaming, thinking, showMarker } = message;
  const [thinkingOpen, setThinkingOpen] = useState(false);

  const avatar = role === 'user' ? 'JR' : '⚖';
  const label = role === 'user' ? 'Você' : 'ChatDatajud';
  const hasThinking = thinking && thinking.length > 0;

  return (
    <>
      <div className={`msg ${role === 'user' ? 'user' : 'bot'}`}>
        <div className="msg-avatar">{avatar}</div>
        <div className="msg-body">
          <div className="msg-label">{label}</div>

          {/* Thinking accordion */}
          {hasThinking && (
            <div className="thinking-accordion">
              <button
                className="thinking-toggle"
                onClick={() => setThinkingOpen(!thinkingOpen)}
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: thinkingOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                Raciocínio ({thinking!.length} {thinking!.length === 1 ? 'etapa' : 'etapas'})
              </button>
              {thinkingOpen && (
                <div className="thinking-content">
                  {thinking!.map((t, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: formatBold(t) }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="msg-bubble">
            <p
              className={streaming && !content ? 'cursor' : ''}
              dangerouslySetInnerHTML={{ __html: formatBold(content) || (streaming ? '' : '') }}
            />
          </div>
          {/* Inline KPIs */}
          {message.kpis && message.kpis.length > 0 && (
            <div className="inline-kpis">
              {message.kpis.map((kpi, i) => (
                <div key={i} className="inline-kpi">
                  <span className="inline-kpi-value">{kpi.value}</span>
                  <span className="inline-kpi-label">{kpi.label || kpi.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Inline Charts */}
          {message.charts && message.charts.length > 0 && (
            <div className="inline-charts">
              {message.charts.map((chart, i) => {
                const option = chart.option && Object.keys(chart.option).length > 0
                  ? chart.option
                  : buildChartOption(chart);
                return (
                  <div key={i} className="inline-chart-card">
                    {chart.title && <div className="inline-chart-title">{chart.title}</div>}
                    <DynamicChart option={option} height={180} />
                  </div>
                );
              })}
            </div>
          )}

          {role === 'bot' && content && !streaming && (
            <div className="msg-meta">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
              Datajud/CNJ via Cube.js
            </div>
          )}
        </div>
      </div>
      {showMarker && <WorkspaceMarker pending={message.pendingDashboard} />}
    </>
  );
}
