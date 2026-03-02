import { useAppStore } from '../store/useAppStore';
import { useEffect, useState } from 'react';

function ShareModal({ shareUrl, onClose, copied, setCopied }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Compartilhar</h3>
        <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>Copie o link abaixo para compartilhar o Assistente:</p>
        <div className="flex gap-2 items-center">
          <input readOnly value={shareUrl} className="flex-1 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-primary)' }} />
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch (e) {
                const el = document.createElement('textarea');
                el.value = shareUrl;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }
            }}
            className="px-3 py-2 rounded-lg font-medium"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const { theme, setTheme } = useAppStore();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = 'https://ajornada.top';

  return (
    <>
      <header
      className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
      style={{ background: 'transparent' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent)' }}>
          C
        </div>
        <h1 className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Assistente CNJ
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => setIsShareOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          <span className="hidden sm:inline">Compartilhar</span>
        </button>
        <a href="https://github.com/bmortari/chatCNJ" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-4 h-4 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
          <span className="hidden sm:inline">GitHub</span>
        </a>
        <a href="mailto:bruno.mortari@tre-go.jus.br" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <span className="hidden sm:inline">Contato</span>
        </a>

        <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }}></div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>

      {/* Share modal temporarily removed to avoid parser errors during dev */}
    </>
  );
}
