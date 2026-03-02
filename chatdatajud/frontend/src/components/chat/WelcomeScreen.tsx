import { useChat } from '../../hooks/useChat';
import { useAppStore } from '../../store/useAppStore';
import type { ChatMode } from '../../types/chat';

/* ── Conversational suggestions ── */
const conversationalSuggestions = [
  {
    text: 'Quantos casos novos no último trimestre?',
    full: 'Quantos casos novos foram registrados no último trimestre?',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    text: 'Evolução mensal por órgão',
    full: 'Mostre a evolução mensal de casos novos por órgão julgador',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
        <path d="M3 3v18h18" /><path d="M7 16l4-6 4 3 5-7" />
      </svg>
    ),
  },
  {
    text: 'Montar painel analítico completo',
    full: 'Crie um painel analítico completo de casos novos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    text: 'Quais dados estão disponíveis?',
    full: 'Quais dados estão disponíveis para análise?',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
];

/* ── BI layout cards ── */
const biLayouts = [
  {
    id: 'executive',
    title: 'Executivo',
    desc: '3 cards + 1 gráfico de linha + 1 pizza',
    filters: 2, cards: 3, charts: 2,
    preview: (
      <div className="bi-preview bi-executive">
        <div className="bp-kpi" /><div className="bp-kpi" /><div className="bp-kpi" />
        <div className="bp-line" /><div className="bp-pie" />
      </div>
    ),
  },
  {
    id: 'comparative',
    title: 'Comparativo',
    desc: '2 cards + barras agrupadas + tabela',
    filters: 3, cards: 2, charts: 2,
    preview: (
      <div className="bi-preview bi-comparative">
        <div className="bp-kpi" /><div className="bp-kpi" />
        <div className="bp-bar" /><div className="bp-table" />
      </div>
    ),
  },
  {
    id: 'temporal',
    title: 'Série Temporal',
    desc: '4 cards + área + barras empilhadas',
    filters: 2, cards: 4, charts: 2,
    preview: (
      <div className="bi-preview bi-temporal">
        <div className="bp-kpi" /><div className="bp-kpi" /><div className="bp-kpi" /><div className="bp-kpi" />
        <div className="bp-area" /><div className="bp-stacked" />
      </div>
    ),
  },
  {
    id: 'detailed',
    title: 'Detalhado',
    desc: '2 cards + 2 gráficos + tabela + filtros',
    filters: 4, cards: 2, charts: 3,
    preview: (
      <div className="bi-preview bi-detailed">
        <div className="bp-kpi" /><div className="bp-kpi" />
        <div className="bp-chart" /><div className="bp-chart" />
        <div className="bp-table-full" />
      </div>
    ),
  },
];

/* ── Deep Research stat options ── */
const researchOptions = [
  {
    text: 'Análise de Correlação',
    full: 'Realize uma análise de correlação entre as métricas disponíveis no Datajud, identificando relações significativas.',
    icon: '🔗',
    desc: 'Correlação entre métricas',
  },
  {
    text: 'Teste de Hipóteses',
    full: 'Execute testes de hipóteses comparando diferentes períodos e categorias dos dados do Datajud.',
    icon: '🧪',
    desc: 'Comparação estatística',
  },
  {
    text: 'Análise de Tendência',
    full: 'Faça análise de tendência temporal dos principais indicadores do Datajud com decomposição sazonal.',
    icon: '📈',
    desc: 'Tendência e sazonalidade',
  },
  {
    text: 'Análise de Outliers',
    full: 'Identifique outliers e anomalias estatísticas nos dados do Datajud usando métodos robustos.',
    icon: '🎯',
    desc: 'Detecção de anomalias',
  },
  {
    text: 'Distribuição e Normalidade',
    full: 'Analise a distribuição dos dados e teste a normalidade das variáveis disponíveis.',
    icon: '📊',
    desc: 'Teste de normalidade',
  },
  {
    text: 'Regressão e Previsão',
    full: 'Construa um modelo de regressão para prever tendências de casos nos próximos meses.',
    icon: '🔮',
    desc: 'Modelagem preditiva',
  },
];

/* ── Reports intro ── */
const reportTypes = [
  {
    text: 'Relatório de Produtividade',
    full: 'Gere um relatório gerencial de produtividade com gráficos comparativos, textos analíticos e indicadores de desempenho por órgão.',
    icon: '📊',
    desc: 'Produtividade por órgão',
  },
  {
    text: 'Panorama Trimestral',
    full: 'Gere um relatório panorâmico trimestral contendo evolução de indicadores, análise textual e gráficos comparativos.',
    icon: '📅',
    desc: 'Visão geral do período',
  },
  {
    text: 'Relatório de Acervo',
    full: 'Gere um relatório gerencial do acervo processual com gráficos de evolução, distribuição e texto analítico sobre tendências.',
    icon: '📚',
    desc: 'Análise do acervo',
  },
  {
    text: 'Relatório Personalizado',
    full: 'Vamos criar um relatório gerencial personalizado. Quais indicadores e análises você gostaria de incluir?',
    icon: '✏️',
    desc: 'Monte seu relatório',
  },
];

const MODE_HEADERS: Record<ChatMode, { title: string; subtitle: string }> = {
  conversational: {
    title: 'ChatDatajud',
    subtitle: 'Inteligência analítica sobre dados do Datajud. Pergunte em linguagem natural e receba análises, painéis e relatórios.',
  },
  bi_agent: {
    title: 'Criar Painel',
    subtitle: 'Escolha um layout para começar. Depois basta informar o nome e os detalhes do painel.',
  },
  deep_research: {
    title: 'Pesquisa Profunda',
    subtitle: 'Análise estatística detalhada com relatório técnico. Escolha um tipo de análise ou descreva sua pergunta.',
  },
  reports: {
    title: 'Relatórios Gerenciais',
    subtitle: 'Gere relatórios intercalando gráficos e textos analíticos de forma padronizada e profissional.',
  },
};

export default function WelcomeScreen() {
  const { sendMessage } = useChat();
  const { chatMode } = useAppStore();
  const header = MODE_HEADERS[chatMode] ?? MODE_HEADERS['conversational'];

  if (chatMode === 'reports') {
    return (
      <div className="welcome">
        <div className="welcome-icon" style={{ background: 'rgba(234,179,8,.12)', border: '1px solid rgba(234,179,8,.25)' }}>
          <svg viewBox="0 0 30 30" fill="none" stroke="#ca9a04" strokeWidth="1.6" strokeLinecap="round">
            <path d="M15 10v6M15 19v1" />
            <circle cx="15" cy="15" r="11" />
          </svg>
        </div>
        <h2 style={{ color: 'var(--text-primary)' }}>Relatórios Gerenciais</h2>
        <p className="welcome-sub">
          Funcionalidade em desenvolvimento. Em breve você poderá gerar relatórios como estes:
        </p>
        <div className="report-options" style={{ opacity: 0.45, pointerEvents: 'none', filter: 'grayscale(0.4)' }}>
          {reportTypes.map((r) => (
            <div key={r.text} className="report-card">
              <span className="report-icon">{r.icon}</span>
              <div className="report-text">
                <span className="report-title">{r.text}</span>
                <span className="report-desc">{r.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', borderRadius: '20px',
          background: 'rgba(234,179,8,.12)', border: '1px solid rgba(234,179,8,.3)',
          fontSize: '.8rem', fontWeight: 600, color: '#ca9a04', marginTop: '4px',
        }}>
          🚧 Em Desenvolvimento
        </div>
      </div>
    );
  }

  return (
    <div className="welcome">
      <div className="welcome-icon">
        <svg viewBox="0 0 30 30" fill="none">
          <path d="M15 5L15 21" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 8L22 8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 8L5.5 14Q8 17 10.5 14Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M22 8L19.5 14Q22 17 24.5 14Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <rect x="11" y="21" width="8" height="3" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </div>
      <h2>{header.title.includes('Chat') ? <>Chat<span>Datajud</span></> : header.title}</h2>
      <p className="welcome-sub">{header.subtitle}</p>

      {/* ── Conversational: classic suggestions ── */}
      {chatMode === 'conversational' && (
        <div className="suggestions">
          {conversationalSuggestions.map((s) => (
            <button key={s.text} className="suggestion" onClick={() => sendMessage(s.full)}>
              <div className="si">{s.icon}</div>
              {s.text}
            </button>
          ))}
        </div>
      )}

      {/* ── BI: layout cards 2x2 ── */}
      {chatMode === 'bi_agent' && (
        <div className="bi-layouts">
          {biLayouts.map((l) => (
            <button
              key={l.id}
              className="bi-layout-card"
              onClick={() =>
                sendMessage(
                  `Quero o layout "${l.title}": ${l.filters} filtros, ${l.cards} cards (métricas) e ${l.charts} gráficos. Nome do painel:`
                )
              }
            >
              {l.preview}
              <div className="bi-layout-info">
                <span className="bi-layout-title">{l.title}</span>
                <span className="bi-layout-desc">{l.desc}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Deep Research: stat cards ── */}
      {chatMode === 'deep_research' && (
        <div className="research-options">
          {researchOptions.map((r) => (
            <button key={r.text} className="research-card" onClick={() => sendMessage(r.full)}>
              <span className="research-icon">{r.icon}</span>
              <div className="research-text">
                <span className="research-title">{r.text}</span>
                <span className="research-desc">{r.desc}</span>
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
