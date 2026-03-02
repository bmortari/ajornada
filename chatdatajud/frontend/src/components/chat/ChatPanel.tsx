import { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import WelcomeScreen from './WelcomeScreen';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import InputArea from './InputArea';

export default function ChatPanel() {
  const { messages, showWelcome, isStreaming, statusText, chatMode } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusText]);

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {showWelcome && messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && statusText && <TypingIndicator text={statusText} />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      {chatMode !== 'reports' && <InputArea />}
    </div>
  );
}
