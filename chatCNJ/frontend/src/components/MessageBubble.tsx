import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types/chat';

function ThinkingBlock({ items, streamingThought, isStreaming }: { items: string[]; streamingThought?: string; isStreaming?: boolean }) {
  const [open, setOpen] = useState(isStreaming ?? false);

  useEffect(() => {
    if (isStreaming !== undefined) {
      setOpen(isStreaming);
    }
  }, [isStreaming]);

  if (!items.length && !streamingThought) return null;

  const totalSteps = items.length + (streamingThought ? 1 : 0);

  return (
    <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--thinking-border)', background: 'var(--thinking-bg)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-all"
        style={{ color: 'var(--accent)' }}
      >
        <span className="text-sm">🧠</span>
        Raciocínio do agente ({totalSteps} {totalSteps === 1 ? 'etapa' : 'etapas'})
        <svg className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {items.map((t, i) => (
            <div key={i} className="text-[11px] italic leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {t.replace(/<\/?think>/g, '').trim()}
            </div>
          ))}
          {streamingThought && (
            <div className="text-[11px] italic leading-relaxed whitespace-pre-wrap animate-pulse" style={{ color: 'var(--text-secondary)' }}>
              {streamingThought}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourcesBlock({ sources }: { sources: any[] }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--source-border)', background: 'var(--source-bg)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium"
        style={{ color: '#22c55e' }}
      >
        <span className="text-sm">📚</span>
        Normativos encontrados ({sources.length})
        <svg className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-md text-xs" style={{ background: 'rgba(34, 197, 94, 0.06)' }}>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                {(s.similarity * 100).toFixed(0)}%
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {s.title || 'Normativo'}
                </div>
                {s.situacao && (
                  <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    s.situacao === 'Vigente' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {s.situacao}
                  </span>
                )}
                <p className="mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{s.snippet}</p>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[10px]" style={{ color: 'var(--accent)' }}>
                    🔗 Ver no site do CNJ
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WebSourcesBlock({ sources }: { sources: any[] }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid #60a5fa', background: 'rgba(96, 165, 250, 0.06)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium"
        style={{ color: '#3b82f6' }}
      >
        <span className="text-sm">🌐</span>
        Fontes web ({sources.length})
        <svg className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="p-2 rounded-md text-xs" style={{ background: 'rgba(96, 165, 250, 0.04)' }}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: '#3b82f6' }}>
                {s.title || s.url}
              </a>
              {s.snippet && (
                <p className="mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{s.snippet}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  let displayContent = message.content || '';
  let streamingThought = '';

  if (displayContent) {
    // Regex allows us to match <think> blocks even if there are multiple or if they contain newlines.
    // We want to pull ALL <think>...</think> content out, and if there's an unclosed <think> at the end, 
    // treat everything after it as the current streaming thought.
    
    // 1. Extract closed think blocks
    const closedThinkRegex = /<think>([\s\S]*?)<\/think>/g;
    let match;
    const closedThoughts: string[] = [];
    
    // We will replace closed blocks with empty strings to remove from display content
    let newDisplayContent = displayContent.replace(closedThinkRegex, (fullMatch, group1) => {
      if (group1.trim()) {
        closedThoughts.push(group1.trim());
      }
      return '';
    });

    // 2. See if there is an unclosed think block at the very end
    const openThinkIndex = newDisplayContent.lastIndexOf('<think>');
    if (openThinkIndex !== -1) {
      const textAfterOpen = newDisplayContent.slice(openThinkIndex + 7).trim();
      streamingThought = textAfterOpen;
      newDisplayContent = newDisplayContent.slice(0, openThinkIndex).trim();
    } else if (closedThoughts.length > 0) {
      // If we found closed thoughts but no streaming thought, 
      // we can just put the last closed thought as the "streaming" one for the UI,
      // or just append them to items. But useChat already flushes them. 
      // We'll leave streamingThought empty, useChat will have already added it to `message.thinking`.
    }

    displayContent = newDisplayContent.trim();
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}`}
        style={{
          background: isUser ? 'var(--user-bubble)' : 'var(--bot-bubble)',
          color: isUser ? 'var(--user-text)' : 'var(--bot-text)',
          boxShadow: 'var(--shadow)',
          border: isUser ? 'none' : '1px solid var(--border)',
        }}
      >
        {/* User message */}
        {isUser && <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>}

        {/* Bot message */}
        {!isUser && (
          <>
            {/* Thinking */}
            {((message.thinking && message.thinking.length > 0) || streamingThought) && (
              <ThinkingBlock items={message.thinking || []} streamingThought={streamingThought} isStreaming={message.streaming} />
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <SourcesBlock sources={message.sources} />
            )}

            {/* Web sources */}
            {message.webSources && message.webSources.length > 0 && (
              <WebSourcesBlock sources={message.webSources} />
            )}

            {/* Content */}
            {displayContent && (
              <div className="markdown-body text-sm mt-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayContent}
                </ReactMarkdown>
              </div>
            )}

            {/* Streaming cursor */}
            {message.streaming && !displayContent && !streamingThought && (
              <div className="flex gap-1 py-1">
                <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="typing-dot w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
