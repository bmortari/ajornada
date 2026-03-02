import { useChat } from '../hooks/useChat';
import InputArea from './InputArea';

const SUGGESTIONS = [
  { icon: '📋', text: 'O que diz a Resolução 350 do CNJ sobre acesso à justiça?' },
  { icon: '💼', text: 'Quais normas regulam o teletrabalho no Judiciário?' },
  { icon: '🔒', text: 'Como funciona a LGPD no âmbito do Poder Judiciário segundo o CNJ?' },
  { icon: '⚖️', text: 'Gere um parecer sobre as normas de conciliação e mediação do CNJ' },
  { icon: '📊', text: 'Quais são as diretrizes do CNJ para gestão de precedentes?' },
  { icon: '🏛️', text: 'O que estabelece a Resolução 331 sobre processos eletrônicos?' },
];

export default function WelcomeScreen() {
  const { sendMessage } = useChat();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        <div className="max-w-3xl w-full animate-fade-in">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-4xl shadow-lg"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
              ⚖
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Olá! Sou o <span style={{ color: 'var(--accent)' }}>ChatCNJ</span>
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Assistente de IA especializado em normativos do CNJ.
              Pergunte sobre resoluções, recomendações, provimentos e mais.
            </p>
          </div>

          {/* Suggestion cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s.text)}
                className="group text-left p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{s.icon}</span>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {s.text}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input always at bottom */}
      <InputArea />
    </div>
  );
}
