import { useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';

export default function ChatPanel() {
  const messages = useAppStore((s) => s.messages);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const statusText = useAppStore((s) => s.statusText);
  const deepResearch = useAppStore((s) => s.deepResearch);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusText]);

  return (
    <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Status indicator */}
        {isStreaming && statusText && (
          <div className="flex flex-col gap-2 px-4 py-3 animate-fade-in">
            {deepResearch && (
              <div className="flex items-center gap-2 self-start px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <span className="animate-pulse">🔬</span>
                Deep Research Ativo
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--text-primary)' }} />
                <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--text-primary)' }} />
                <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--text-primary)' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{statusText}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <InputArea />
    </div>
  );
}
