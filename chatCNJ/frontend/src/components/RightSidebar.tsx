import { useAppStore } from '../store/useAppStore';

const SITUACOES = [
  'Vigente',
  'Alterado',
  'Revogado',
  'Revogado parcialmente',
  'Exaurido',
  'Suspenso',
  'Sem efeito'
];

const ORIGENS = [
  'Corregedoria',
  'Diretoria-Geral',
  'Presidência',
  'Presidência e Corregedoria',
  'Secretaria de Estratégia e Projetos',
  'Secretaria-Geral',
  'Secretaria-Geral e Secretaria de Estratégia e Projetos'
];

export default function RightSidebar() {
  const { isRightSidebarOpen, toggleRightSidebar, searchFilters, setSearchFilter, toolsConfig, toggleTool } = useAppStore();

  if (!isRightSidebarOpen) return null;

  const handleSituacaoToggle = (sit: string) => {
    const current = searchFilters.situacoes;
    if (current.includes(sit)) {
      setSearchFilter('situacoes', current.filter(s => s !== sit));
    } else {
      setSearchFilter('situacoes', [...current, sit]);
    }
  };

  const handleOrigemToggle = (orig: string) => {
    const current = searchFilters.origens;
    if (current.includes(orig)) {
      setSearchFilter('origens', current.filter(o => o !== orig));
    } else {
      setSearchFilter('origens', [...current, orig]);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
        onClick={toggleRightSidebar}
      />
      <aside 
        className="fixed right-3 top-3 bottom-3 w-80 z-50 flex flex-col shadow-2xl transition-transform duration-300 translate-x-0 rounded-[1.5rem] overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)'
        }}
      >
        <div className="flex items-center justify-between p-4 border-b bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Configurações do Agente</h2>
          <button 
            onClick={toggleRightSidebar}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Aba de Ferramentas / Poderes */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span>🛠️</span> Ferramentas do Agente
            </h3>
            
            <div className="space-y-1.5 cursor-default">
              <label className="flex flex-row-reverse justify-between items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors border bg-stone-100/50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/50 hover:bg-stone-200/50 dark:hover:bg-stone-700/50">
                <div className="relative flex-shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={useAppStore.getState().deepResearch} onChange={() => useAppStore.getState().toggleDeepResearch()} />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-[100%] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={useAppStore.getState().deepResearch ? { backgroundColor: 'var(--accent)' } : {}}></div>
                </div>
                <div>
                  <div className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                    <span>🧠</span> Deep Research (EXA)
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Pesquisa ultra-profunda reflexiva. Demora mais.</div>
                </div>
              </label>
            </div>
          </section>

          {/* Aba de Modos Específicos */}
          <section>
            <h3 className="text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span>🧠</span> Modos Cognitivos
            </h3>
            <div className="space-y-2">
              <label 
                className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border"
                style={{
                  background: toolsConfig.revisorMinutas ? 'var(--accent)' : 'transparent',
                  borderColor: toolsConfig.revisorMinutas ? 'transparent' : 'var(--border)',
                  color: toolsConfig.revisorMinutas ? 'var(--bg-primary)' : 'inherit'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={toolsConfig.revisorMinutas}
                  onChange={() => toggleTool('revisorMinutas')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold mb-1 flex items-center justify-between">
                    <span>⚖️ Revisor de Minutas</span>
                    {toolsConfig.revisorMinutas && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--bg-primary)' }} />}
                  </div>
                  <div className="text-[10px] leading-tight opacity-80" style={{ color: toolsConfig.revisorMinutas ? 'var(--bg-primary)' : 'var(--text-muted)' }}>
                    O Agente auditará o texto legal anexado, apontando normativos revogados ou incompletos mencionados por você.
                  </div>
                </div>
              </label>

              <label 
                className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border mt-2"
                style={{
                  background: toolsConfig.parecerJuridico ? 'var(--text-primary)' : 'transparent',
                  borderColor: toolsConfig.parecerJuridico ? 'transparent' : 'var(--border)',
                  color: toolsConfig.parecerJuridico ? 'var(--bg-primary)' : 'inherit'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={toolsConfig.parecerJuridico}
                  onChange={() => toggleTool('parecerJuridico')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold mb-1 flex items-center justify-between">
                    <span>📝 Parecerista Jurídico</span>
                    {toolsConfig.parecerJuridico && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--bg-primary)' }} />}
                  </div>
                  <div className="text-[10px] leading-tight opacity-80" style={{ color: toolsConfig.parecerJuridico ? 'var(--bg-primary)' : 'var(--text-muted)' }}>
                    Gera a resposta no formato formal de Parecer Técnico (Da Consulta, Fundamentação e Conclusão).
                  </div>
                </div>
              </label>
            </div>
          </section>

          {/* Filtros Radicais */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span>🗂️</span> Filtros de Pesquisa (BD CNJ)
            </h3>

            <details className="group mb-2 border border-black/5 dark:border-white/5 rounded-2xl bg-black/5 dark:bg-white/5 overflow-hidden transition-all">
              <summary className="p-3 text-[12px] font-semibold cursor-pointer list-none flex justify-between items-center select-none" style={{ color: 'var(--text-primary)' }}>
                <span>Situação <span className="font-normal opacity-60">({searchFilters.situacoes.length})</span></span>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="p-3 pt-0 flex flex-wrap gap-1.5 border-t border-black/5 dark:border-white/5 mt-1">
                {SITUACOES.map(sit => {
                  const isActive = searchFilters.situacoes.includes(sit);
                  return (
                    <button
                      key={sit}
                      onClick={() => handleSituacaoToggle(sit)}
                      className="px-2 py-1 rounded-lg text-[10px] transition-all border font-medium active:scale-95"
                      style={{
                        background: isActive ? 'var(--text-primary)' : 'transparent',
                        color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        borderColor: isActive ? 'transparent' : 'var(--border)'
                      }}
                    >
                      {sit}
                    </button>
                  );
                })}
              </div>
            </details>

            <details className="group mb-2 border border-black/5 dark:border-white/5 rounded-2xl bg-black/5 dark:bg-white/5 overflow-hidden transition-all">
              <summary className="p-3 text-[12px] font-semibold cursor-pointer list-none flex justify-between items-center select-none" style={{ color: 'var(--text-primary)' }}>
                <span>Origem do Ato <span className="font-normal opacity-60">({searchFilters.origens.length})</span></span>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="p-3 pt-0 flex flex-wrap gap-2 border-t border-black/5 dark:border-white/5 mt-2">
                {ORIGENS.map(orig => {
                  const isActive = searchFilters.origens.includes(orig);
                  return (
                    <button
                      key={orig}
                      onClick={() => handleOrigemToggle(orig)}
                      className="px-2 py-1 flex-1 text-center items-center justify-center rounded-lg text-[10px] transition-all border font-medium active:scale-95"
                      style={{
                        background: isActive ? 'var(--text-primary)' : 'transparent',
                        color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        borderColor: isActive ? 'transparent' : 'var(--border)'
                      }}
                    >
                      {orig}
                    </button>
                  );
                })}
              </div>
            </details>

            { (searchFilters.situacoes.length > 0 || searchFilters.origens.length > 0) && (
              <div className="mt-3 p-3 rounded-2xl text-[10px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex gap-2 leading-relaxed">
                <span className="text-lg leading-none">⚠️</span>
                <span>Atenção: A biblioteca do CNJ limitará a busca APENAS aos metadados selecionados acima.</span>
              </div>
            )}
          </section>

        </div>
      </aside>
    </>
  );
}
