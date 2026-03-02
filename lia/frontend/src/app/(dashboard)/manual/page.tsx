import './manual.css';
import './manual_fluxo.css';

export default function ManualPage() {
    return (
        <div className="manual-page-container">










<div className="page-header">
    <div className="page-header-left">
        <div className="page-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
        </div>
        <div>
            <h1 className="page-title">Manual do Sistema LIA</h1>
            <p className="page-subtitle">Licitações com Inteligência Artificial</p>
        </div>
    </div>
</div>


<div className="quick-nav">
    <a href="#sobre" className="quick-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Sobre o Sistema
    </a>
    <a href="#fluxo-processo" className="quick-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
            <line x1="4" y1="21" x2="20" y2="21" />
        </svg>
        Fluxo Licitatório
    </a>
    <a href="#artefatos" className="quick-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
        Artefatos
    </a>
    <a href="#usuarios" className="quick-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
        Usuários
    </a>
    <a href="#fundamentacao" className="quick-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        Legislação
    </a>
    <a href="#atalhos" className="quick-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
        </svg>
        Integrações
    </a>
</div>


<div className="manual-section" id="sobre">
    <div className="section-header">
        <div className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        </div>
        <div>
            <h2 className="section-title">Sobre o Sistema LIA</h2>
            <p className="section-description">Entenda o propósito e os benefícios da plataforma</p>
        </div>
    </div>

    <div className="content-card">
        <h3>🎯 O que é o Sistema LIA?</h3>
        <p>O <strong>Sistema LIA (Licitações com Inteligência Artificial)</strong> é uma plataforma desenvolvida para o
            TRE-GO que otimiza e automatiza o processo de elaboração de documentos licitatórios, integrando Inteligência
            Artificial para acelerar e padronizar a criação de artefatos.</p>

        <div className="highlight-box">
            <h4>✨ Principais Benefícios</h4>
            <ul>
                <li><strong>Agilidade:</strong> Reduz drasticamente o tempo de elaboração de documentos</li>
                <li><strong>Padronização:</strong> Garante conformidade com normas e melhores práticas</li>
                <li><strong>Qualidade:</strong> Utiliza IA para sugerir conteúdos completos e bem estruturados</li>
                <li><strong>Rastreabilidade:</strong> Mantém histórico completo de versões e alterações</li>
                <li><strong>Integração:</strong> Conecta-se ao PAC 2025 e bases de dados governamentais</li>
            </ul>
        </div>
    </div>
</div>


<div className="manual-section" id="fluxo-processo">
    <div className="section-header">
        <div className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
                <line x1="4" y1="21" x2="20" y2="21" />
            </svg>
        </div>
        <div>
            <h2 className="section-title">Fluxo do Processo Licitatório</h2>
            <p className="section-description">Visualização completa do processo e das decisões automáticas do sistema</p>
        </div>
    </div>

    
    <div className="fluxo-legenda">
        <div className="legenda-item">
            <div className="legenda-dot" ></div>
            Início / Fim
        </div>
        <div className="legenda-item">
            <div className="legenda-dot" ></div>
            Artefato / Documento
        </div>
        <div className="legenda-item">
            <div className="legenda-diamond" ></div>
            Gateway (Decisão)
        </div>
        <div className="legenda-item">
            <div className="legenda-dot" ></div>
            Fluxo ARP
        </div>
        <div className="legenda-item">
            <div className="legenda-dot" ></div>
            Fluxo Dispensa
        </div>
        <div className="legenda-item">
            <div className="legenda-dot" ></div>
            Fluxo Licitação
        </div>
    </div>

    <div className="fluxo-container">
        <div className="fluxo-visual">

            
            <div className="fluxo-start">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                Início do Processo
            </div>

            
            <div className="fluxo-connector">
                <div className="fluxo-connector-line"></div>
                <div className="fluxo-connector-arrow"></div>
            </div>

            
            <div className="fluxo-gateway">
                <div className="gateway-diamond gateway-pac">
                    <span className="gateway-diamond-inner">?</span>
                </div>
                <span className="gateway-label">Item consta no PAC?</span>
                <span className="gateway-sublabel">projeto.intra_pac</span>
            </div>

            
            <div className="fluxo-branches branches-2">
                
                <div className="fluxo-branch">
                    <span className="branch-condition condition-yes">SIM - Está no PAC</span>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-dfd" data-tooltip="Sempre obrigatório - ponto de partida">
                        <div className="fluxo-node-icon">DFD</div>
                        <div className="fluxo-node-info">
                            <h4>Documento de Formalização da Demanda</h4>
                            <p>Formaliza a necessidade da contratação</p>
                        </div>
                    </div>
                </div>

                
                <div className="fluxo-branch">
                    <span className="branch-condition condition-no">NÃO - Fora do PAC</span>
                    <div className="branch-condition-detail">intra_pac = False</div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-je">
                        <div className="fluxo-node-icon">JE</div>
                        <div className="fluxo-node-info">
                            <h4>Justificativa de Excepcionalidade</h4>
                            <p>Justifica contratação fora do PAC</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-dfd">
                        <div className="fluxo-node-icon">DFD</div>
                        <div className="fluxo-node-info">
                            <h4>Documento de Formalização da Demanda</h4>
                            <p>Formaliza a necessidade da contratação</p>
                        </div>
                    </div>
                </div>
            </div>

            
            <div className="fluxo-connector">
                <div className="fluxo-connector-line" style={{ height: '32px', }}></div>
                <div className="fluxo-connector-arrow"></div>
            </div>

            
            <div className="fluxo-node node-etp">
                <div className="fluxo-node-icon">ETP</div>
                <div className="fluxo-node-info">
                    <h4>Estudo Técnico Preliminar</h4>
                    <p>Opção do usuário: Pesquisa de ARP (Atas de Registro de Preço)</p>
                </div>
            </div>

            
            <div className="fluxo-connector">
                <div className="fluxo-connector-line"></div>
                <div className="fluxo-connector-arrow"></div>
            </div>

            
            <div className="fluxo-gateway">
                <div className="gateway-diamond gateway-etp">
                    <span className="gateway-diamond-inner">?</span>
                </div>
                <span className="gateway-label">Qual modalidade sugerida?</span>
                <span className="gateway-sublabel">etps.modalidade_sugerida</span>
            </div>

            
            <div className="fluxo-branches branches-3">

                
                <div className="fluxo-branch">
                    <span className="branch-condition condition-arp">Adesão a ARP</span>
                    <div className="branch-condition-detail">modalidade_sugerida = adesao_ata</div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-rdve">
                        <div className="fluxo-node-icon">RDVE</div>
                        <div className="fluxo-node-info">
                            <h4>Rel. Demonstração Vantagem Econômica</h4>
                            <p>Demonstra vantagem econômica da adesão</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-jva">
                        <div className="fluxo-node-icon">JVA</div>
                        <div className="fluxo-node-info">
                            <h4>Justificativa da Vantagem da Adesão</h4>
                            <p>Justifica a opção pela adesão à ata</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-tafo">
                        <div className="fluxo-node-icon">TAFO</div>
                        <div className="fluxo-node-info">
                            <h4>Termo de Aceite Fornecedor/Órgão</h4>
                            <p>Aceite do fornecedor e órgão gerenciador</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-end">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        FIM DO PROCESSO
                    </div>
                </div>

                
                <div className="fluxo-branch">
                    <span className="branch-condition condition-baixo">Dispensa Valor Baixo</span>
                    <div className="branch-condition-detail">modalidade_sugerida = dispensa_valor_baixo</div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-trs">
                        <div className="fluxo-node-icon">TRS</div>
                        <div className="fluxo-node-info">
                            <h4>TR Simplificado</h4>
                            <p>Termo de referência simplificado</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-ade">
                        <div className="fluxo-node-icon">ADE</div>
                        <div className="fluxo-node-info">
                            <h4>Aviso de Dispensa Eletrônica</h4>
                            <p>Publicação do aviso de dispensa</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-jpef">
                        <div className="fluxo-node-icon">JPEF</div>
                        <div className="fluxo-node-info">
                            <h4>Justificativa de Preço e Fornecedor</h4>
                            <p>Justifica preço e escolha do fornecedor</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-ce">
                        <div className="fluxo-node-icon">CE</div>
                        <div className="fluxo-node-info">
                            <h4>Certidão de Enquadramento</h4>
                            <p>Certifica enquadramento na dispensa</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-end">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        FIM DO PROCESSO
                    </div>
                </div>

                
                <div className="fluxo-branch">
                    <span className="branch-condition condition-normal">Licitação Normal</span>
                    <div className="branch-condition-detail">modalidade_sugerida = licitacao_normal</div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-pp">
                        <div className="fluxo-node-icon">PP</div>
                        <div className="fluxo-node-info">
                            <h4>Pesquisa de Preço</h4>
                            <p>Levantamento de preços de mercado</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-pgr">
                        <div className="fluxo-node-icon">PGR</div>
                        <div className="fluxo-node-info">
                            <h4>Plano de Gestão de Riscos</h4>
                            <p>Identificação e mitigação de riscos</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>
                    <div className="fluxo-node node-tr">
                        <div className="fluxo-node-icon">TR</div>
                        <div className="fluxo-node-info">
                            <h4>Termo de Referência</h4>
                            <p>Especificações completas da contratação</p>
                        </div>
                    </div>
                    <div className="fluxo-connector">
                        <div className="fluxo-connector-line"></div>
                        <div className="fluxo-connector-arrow"></div>
                    </div>

                    
                    <div className="fluxo-gateway">
                        <div className="gateway-diamond gateway-tr">
                            <span className="gateway-diamond-inner">?</span>
                        </div>
                        <span className="gateway-label">Tipo de contratação?</span>
                        <span className="gateway-sublabel">trs.contratacao_direta</span>
                    </div>

                    
                    <div className="fluxo-sub-branches">
                        
                        <div className="fluxo-branch">
                            <span className="branch-condition condition-direta">Contratação Direta</span>
                            <div className="branch-condition-detail">contratacao_direta = true</div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-node node-adl">
                                <div className="fluxo-node-icon">ADL</div>
                                <div className="fluxo-node-info">
                                    <h4>Aviso Dispensa Licitação</h4>
                                    <p>Publicação da dispensa</p>
                                </div>
                            </div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-node node-jf">
                                <div className="fluxo-node-icon">JF</div>
                                <div className="fluxo-node-info">
                                    <h4>Justificativa do Fornecedor</h4>
                                    <p>Justifica a escolha do fornecedor</p>
                                </div>
                            </div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-node node-ed">
                                <div className="fluxo-node-icon">ED</div>
                                <div className="fluxo-node-info">
                                    <h4>Edital</h4>
                                    <p>Documento oficial do certame</p>
                                </div>
                            </div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-node node-mc">
                                <div className="fluxo-node-icon">MC</div>
                                <div className="fluxo-node-info">
                                    <h4>Minuta de Contrato</h4>
                                    <p>Minuta do contrato administrativo</p>
                                </div>
                            </div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-end">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                FIM
                            </div>
                        </div>

                        
                        <div className="fluxo-branch">
                            <span className="branch-condition condition-licit">Licitação</span>
                            <div className="branch-condition-detail">contratacao_direta = false</div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-node node-chk">
                                <div className="fluxo-node-icon">CHK</div>
                                <div className="fluxo-node-info">
                                    <h4>Checklist de Instrução</h4>
                                    <p>AGU/SEGES - verificação documental</p>
                                </div>
                            </div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-node node-ed">
                                <div className="fluxo-node-icon">ED</div>
                                <div className="fluxo-node-info">
                                    <h4>Edital</h4>
                                    <p>Documento oficial do certame</p>
                                </div>
                            </div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-node node-mc">
                                <div className="fluxo-node-icon">MC</div>
                                <div className="fluxo-node-info">
                                    <h4>Minuta de Contrato</h4>
                                    <p>Minuta do contrato administrativo</p>
                                </div>
                            </div>
                            <div className="fluxo-connector">
                                <div className="fluxo-connector-line"></div>
                                <div className="fluxo-connector-arrow"></div>
                            </div>
                            <div className="fluxo-end">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                FIM
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    
    <div className="content-card" style={{ marginTop: '2.5rem', }}>
        <h3>Referência de Artefatos</h3>
        <p>Todos os documentos gerados pelo sistema durante o processo licitatório:</p>
        <table className="artefatos-ref-table">
            <thead>
                <tr>
                    <th>Sigla</th>
                    <th>Documento</th>
                    <th>Fluxo</th>
                    <th>Regra de Ativação</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><span className="sigla-badge" >DFD</span></td>
                    <td>Documento de Formalização da Demanda</td>
                    <td>Todos</td>
                    <td>Sempre obrigatório</td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >JE</span></td>
                    <td>Justificativa de Excepcionalidade</td>
                    <td>Todos (se fora do PAC)</td>
                    <td><code>projeto.intra_pac = False</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >ETP</span></td>
                    <td>Estudo Técnico Preliminar</td>
                    <td>Todos</td>
                    <td>Sempre obrigatório (após DFD)</td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >RDVE</span></td>
                    <td>Relatório de Demonstração de Vantagem Econômica</td>
                    <td>Adesão ARP</td>
                    <td><code>etps.modalidade_sugerida = adesao_ata</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >JVA</span></td>
                    <td>Justificativa da Vantagem da Adesão</td>
                    <td>Adesão ARP</td>
                    <td><code>etps.modalidade_sugerida = adesao_ata</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >TAFO</span></td>
                    <td>Termo de Aceite do Fornecedor e do Órgão Gerenciador</td>
                    <td>Adesão ARP</td>
                    <td><code>etps.modalidade_sugerida = adesao_ata</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >TRS</span></td>
                    <td>TR Simplificado</td>
                    <td>Dispensa Valor Baixo</td>
                    <td><code>etps.modalidade_sugerida = dispensa_valor_baixo</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >ADE</span></td>
                    <td>Aviso de Dispensa Eletrônica</td>
                    <td>Dispensa Valor Baixo</td>
                    <td><code>etps.modalidade_sugerida = dispensa_valor_baixo</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >JPEF</span></td>
                    <td>Justificativa de Preço e Escolha do Fornecedor</td>
                    <td>Dispensa Valor Baixo</td>
                    <td><code>etps.modalidade_sugerida = dispensa_valor_baixo</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >CE</span></td>
                    <td>Certidão de Enquadramento</td>
                    <td>Dispensa Valor Baixo</td>
                    <td><code>etps.modalidade_sugerida = dispensa_valor_baixo</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >PP</span></td>
                    <td>Pesquisa de Preço</td>
                    <td>Licitação Normal</td>
                    <td><code>etps.modalidade_sugerida = licitacao_normal</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >PGR</span></td>
                    <td>Plano de Gestão de Riscos</td>
                    <td>Licitação Normal</td>
                    <td><code>etps.modalidade_sugerida = licitacao_normal</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >TR</span></td>
                    <td>Termo de Referência</td>
                    <td>Licitação Normal</td>
                    <td><code>etps.modalidade_sugerida = licitacao_normal</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >ADL</span></td>
                    <td>Aviso de Dispensa de Licitação</td>
                    <td>Contratação Direta</td>
                    <td><code>trs.contratacao_direta = true</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >JF</span></td>
                    <td>Justificativa do Fornecedor</td>
                    <td>Contratação Direta</td>
                    <td><code>trs.contratacao_direta = true</code></td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >ED</span></td>
                    <td>Edital</td>
                    <td>Licitação / Contratação Direta</td>
                    <td>Final de ambos os fluxos</td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >MC</span></td>
                    <td>Minuta de Contrato</td>
                    <td>Licitação / Contratação Direta</td>
                    <td>Final de ambos os fluxos</td>
                </tr>
                <tr>
                    <td><span className="sigla-badge" >CHK</span></td>
                    <td>Checklist de Instrução (AGU/SEGES)</td>
                    <td>Licitação</td>
                    <td><code>trs.contratacao_direta = false</code></td>
                </tr>
            </tbody>
        </table>
    </div>
</div>


<div className="manual-section" id="artefatos">
    <div className="section-header">
        <div className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
        </div>
        <div>
            <h2 className="section-title">Tipos de Artefatos</h2>
            <p className="section-description">Documentos que podem ser criados no sistema</p>
        </div>
    </div>

    <div className="artefatos-grid">
        <div className="artefato-card" data-color="slate">
            <div className="artefato-header">
                <div className="artefato-icon">DFD</div>
                <h3>Documento de Formalização da Demanda</h3>
            </div>
            <p><strong>Dependências:</strong> Nenhuma (sempre liberado)</p>
            <p><strong>Função:</strong> Ponto de partida que formaliza a necessidade da contratação, detalhando o objeto, justificativa e requisitos.</p>
        </div>

        <div className="artefato-card" data-color="rose">
            <div className="artefato-header">
                <div className="artefato-icon">JE</div>
                <h3>Justificativa de Excepcionalidade</h3>
            </div>
            <p><strong>Dependências:</strong> Requer DFD</p>
            <p><strong>Função:</strong> Justifica a contratação rápida quando o item não se encontra no PAC.</p>
        </div>

        <div className="artefato-card" data-color="rose">
            <div className="artefato-header">
                <div className="artefato-icon">PGR</div>
                <h3>Plano de Gerenciamento de Riscos</h3>
            </div>
            <p><strong>Dependências:</strong> Requer DFD</p>
            <p><strong>Função:</strong> Identifica, avalia e propõe medidas de mitigação para riscos do projeto de contratação.</p>
        </div>

        <div className="artefato-card" data-color="teal">
            <div className="artefato-header">
                <div className="artefato-icon">PP</div>
                <h3>Pesquisa de Preços</h3>
            </div>
            <p><strong>Dependências:</strong> Requer DFD</p>
            <p><strong>Função:</strong> Realiza cotação de preços utilizando dados do PNCP e Compras.gov, com IA para análise estatística.</p>
        </div>

        <div className="artefato-card" data-color="sage">
            <div className="artefato-header">
                <div className="artefato-icon">ETP</div>
                <h3>Estudo Técnico Preliminar</h3>
            </div>
            <p><strong>Dependências:</strong> Requer DFD + PGR + PP</p>
            <p><strong>Função:</strong> Documento técnico detalhado que fundamenta a escolha da solução de contratação.</p>
        </div>

        <div className="artefato-card" data-color="violet">
            <div className="artefato-header">
                <div className="artefato-icon">RDVE</div>
                <h3>Relatório de Demonstração de Vantagem Econômica</h3>
            </div>
            <p><strong>Dependências:</strong> Adesão ARP</p>
            <p><strong>Função:</strong> Demonstra vantajosidade na adesão de Atas de Registro de Preços.</p>
        </div>

        <div className="artefato-card" data-color="amber">
            <div className="artefato-header">
                <div className="artefato-icon">JVA</div>
                <h3>Justificativa da Vantagem da Adesão</h3>
            </div>
            <p><strong>Dependências:</strong> Adesão ARP</p>
            <p><strong>Função:</strong> Complementa o RDVE justificando o benefício para a administração.</p>
        </div>

        <div className="artefato-card" data-color="teal">
            <div className="artefato-header">
                <div className="artefato-icon">TAFO</div>
                <h3>Termo de Aceite do Fornecedor e do Órgão</h3>
            </div>
            <p><strong>Dependências:</strong> Adesão ARP</p>
            <p><strong>Função:</strong> Assinatura de concordância mútua para realizar a adesão na Ata de Preços.</p>
        </div>

        <div className="artefato-card" data-color="copper">
            <div className="artefato-header">
                <div className="artefato-icon">TRS</div>
                <h3>TR Simplificado</h3>
            </div>
            <p><strong>Dependências:</strong> Dispensa Valor Baixo</p>
            <p><strong>Função:</strong> Um Termo de Referência enxuto próprio para dispensas eletrônicas.</p>
        </div>

        <div className="artefato-card" data-color="rose">
            <div className="artefato-header">
                <div className="artefato-icon">ADE</div>
                <h3>Aviso de Dispensa Eletrônica</h3>
            </div>
            <p><strong>Dependências:</strong> Dispensa Valor Baixo</p>
            <p><strong>Função:</strong> Documento para publicação pública formalizando a inexigibilidade de certame.</p>
        </div>

        <div className="artefato-card" data-color="indigo">
            <div className="artefato-header">
                <div className="artefato-icon">JPEF</div>
                <h3>Justificativa de Preço e Fornecedor</h3>
            </div>
            <p><strong>Dependências:</strong> Dispensa Valor Baixo</p>
            <p><strong>Função:</strong> Esclarece por que aquele fornecedor possui o melhor custo-benefício rápido.</p>
        </div>

        <div className="artefato-card" data-color="steel">
            <div className="artefato-header">
                <div className="artefato-icon">CE</div>
                <h3>Certidão de Enquadramento</h3>
            </div>
            <p><strong>Dependências:</strong> Dispensa Valor Baixo</p>
            <p><strong>Função:</strong> Atesta que a contratação se adequa à lei quanto a valores anuais.</p>
        </div>

        <div className="artefato-card" data-color="amber">
            <div className="artefato-header">
                <div className="artefato-icon">TR</div>
                <h3>Termo de Referência</h3>
            </div>
            <p><strong>Dependências:</strong> Requer ETP</p>
            <p><strong>Função:</strong> Define especificações técnicas, obrigações, prazos e condições da contratação.</p>
        </div>

        <div className="artefato-card" data-color="copper">
            <div className="artefato-header">
                <div className="artefato-icon">ADL</div>
                <h3>Aviso de Dispensa de Licitação</h3>
            </div>
            <p><strong>Dependências:</strong> Contratação Direta</p>
            <p><strong>Função:</strong> Semelhante ao ADE, mas formal para dispensas previstas de imediato.</p>
        </div>

        <div className="artefato-card" data-color="indigo">
            <div className="artefato-header">
                <div className="artefato-icon">JF</div>
                <h3>Justificativa do Fornecedor</h3>
            </div>
            <p><strong>Dependências:</strong> Contratação Direta</p>
            <p><strong>Função:</strong> Endossa a legalidade do fornecedor direto escolhido.</p>
        </div>

        <div className="artefato-card" data-color="violet">
            <div className="artefato-header">
                <div className="artefato-icon">ED</div>
                <h3>Edital de Licitação</h3>
            </div>
            <p><strong>Dependências:</strong> Requer TR</p>
            <p><strong>Função:</strong> Documento oficial da licitação, com todas as regras, critérios e condições do certame.</p>
        </div>

        <div className="artefato-card" data-color="sage">
            <div className="artefato-header">
                <div className="artefato-icon">MC</div>
                <h3>Minuta de Contrato</h3>
            </div>
            <p><strong>Dependências:</strong> Final de Fluxos</p>
            <p><strong>Função:</strong> Contrato provisório a ser assinado pelo fornecedor do certame licitatório.</p>
        </div>

        <div className="artefato-card" data-color="copper">
            <div className="artefato-header">
                <div className="artefato-icon">CHK</div>
                <h3>Checklist de Instrução (AGU/SEGES)</h3>
            </div>
            <p><strong>Dependências:</strong> Licitação</p>
            <p><strong>Função:</strong> Validação de compliance antes da publicação oficial.</p>
        </div>
    </div>
</div>


<div className="manual-section" id="fundamentacao">
    <div className="section-header">
        <div className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
        </div>
        <div>
            <h2 className="section-title">Fundamentação Legal</h2>
            <p className="section-description">Base normativa que sustenta o sistema e o processo licitatório</p>
        </div>
    </div>

    <div className="content-card">
        <h3>📜 Normas Aplicáveis</h3>
        <ul>
            <li><strong>Lei nº 14.133/2021</strong> — Nova Lei de Licitações e Contratos Administrativos, base para todo o fluxo processual do sistema.</li>
            <li><strong>Decreto nº 11.462/2023</strong> — Regulamenta a Lei nº 14.133 no âmbito da administração federal.</li>
            <li><strong>IN SEGES/ME nº 58/2022</strong> — Dispõe sobre o Plano Anual de Contratações (PAC) e Estudo Técnico Preliminar (ETP).</li>
            <li><strong>IN SEGES/ME nº 65/2021</strong> — Orienta o procedimento de Pesquisa de Preços para contratações federais.</li>
            <li><strong>Res. CNJ nº 468/2022</strong> — Diretrizes de contratações para o Poder Judiciário.</li>
        </ul>
    </div>
</div>


<div className="manual-section" id="atalhos">
    <div className="section-header">
        <div className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
        </div>
        <div>
            <h2 className="section-title">Atalhos e Integrações</h2>
            <p className="section-description">Funcionalidades avançadas para aumentar a produtividade</p>
        </div>
    </div>

    <div className="tips-grid">
        <div className="tip-card tip-info">
            <div className="tip-icon">🤖</div>
            <h4>Assistente IA</h4>
            <p>Use o chat com IA para gerar rascunhos de artefatos automaticamente. Ele conhece o contexto do projeto e sugere conteúdos completos.</p>
        </div>

        <div className="tip-card tip-success">
            <div className="tip-icon">📊</div>
            <h4>Integração PNCP</h4>
            <p>A Pesquisa de Preços se conecta diretamente ao Portal Nacional de Contratações Públicas para buscar dados reais.</p>
        </div>

        <div className="tip-card tip-warning">
            <div className="tip-icon">📋</div>
            <h4>Exportação Múltipla</h4>
            <p>Exporte qualquer artefato em PDF ou DOCX. Os documentos saem formatados conforme os padrões do TRE-GO.</p>
        </div>

        <div className="tip-card tip-primary">
            <div className="tip-icon">🔗</div>
            <h4>Versionamento</h4>
            <p>Cada artefato possui histórico completo de versões. Restaure qualquer versão anterior com um clique.</p>
        </div>
    </div>
</div>


<div className="manual-section" id="usuarios">
    <div className="section-header">
        <div className="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        </div>
        <div>
            <h2 className="section-title">Tipos de Usuários</h2>
            <p className="section-description">Perfis e permissões no sistema</p>
        </div>
    </div>

    <div className="users-grid">
        <div className="user-card">
            <div className="user-badge" >Administrador</div>
            <h3>👨‍💼 Administrador</h3>
            <ul>
                <li>Acesso total ao sistema</li>
                <li>Gerencia usuários e permissões</li>
                <li>Configura parâmetros globais</li>
                <li>Acessa todos os projetos</li>
            </ul>
        </div>

        <div className="user-card">
            <div className="user-badge" >Gestor</div>
            <h3>📊 Gestor de Licitações</h3>
            <ul>
                <li>Cria e gerencia projetos</li>
                <li>Aprova artefatos</li>
                <li>Exporta documentos finais</li>
                <li>Acompanha processo completo</li>
            </ul>
        </div>

        <div className="user-card">
            <div className="user-badge" >Técnico</div>
            <h3>⚙️ Técnico Elaborador</h3>
            <ul>
                <li>Cria e edita artefatos</li>
                <li>Utiliza ferramentas de IA</li>
                <li>Realiza pesquisas de preços</li>
                <li>Submete para aprovação</li>
            </ul>
        </div>

        <div className="user-card">
            <div className="user-badge" >Consultor</div>
            <h3>👁️ Consultor</h3>
            <ul>
                <li>Visualiza projetos e artefatos</li>
                <li>Exporta relatórios</li>
                <li>Sem permissão de edição</li>
                <li>Acesso somente leitura</li>
            </ul>
        </div>
    </div>
</div>


<div className="manual-section">
    <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #f6ad55 0%, #dd6b20 100%)', }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
        </div>
        <div>
            <h2 className="section-title">Dicas e Boas Práticas</h2>
            <p className="section-description">Recomendações para melhor uso do sistema</p>
        </div>
    </div>

    <div className="tips-grid">
        <div className="tip-card tip-success">
            <div className="tip-icon">✅</div>
            <h4>Use a IA com Sabedoria</h4>
            <p>A IA é uma ferramenta poderosa, mas sempre revise e adapte o conteúdo gerado à realidade específica do
                seu projeto.</p>
        </div>

        <div className="tip-card tip-info">
            <div className="tip-icon">💡</div>
            <h4>Mantenha Versões</h4>
            <p>Crie novas versões antes de fazer alterações significativas. O sistema mantém histórico completo para
                auditoria.</p>
        </div>

        <div className="tip-card tip-warning">
            <div className="tip-icon">⚠️</div>
            <h4>Siga as Dependências</h4>
            <p>Respeite a ordem de criação dos artefatos. Cada documento depende de informações dos anteriores.</p>
        </div>

        <div className="tip-card tip-primary">
            <div className="tip-icon">🔍</div>
            <h4>Pesquisa de Preços</h4>
            <p>Utilize filtros e parâmetros avançados para obter cotações mais precisas e atualizadas.</p>
        </div>
    </div>
</div>


<div className="manual-footer">
    <div className="footer-content">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
            <h3>Precisa de mais ajuda?</h3>
            <p>Entre em contato com o suporte técnico do TRE-GO ou consulte a documentação técnica completa.</p>
        </div>
    </div>
</div>

        </div>
    );
}
