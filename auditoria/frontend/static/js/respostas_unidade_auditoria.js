document.addEventListener('DOMContentLoaded', () => {

    // --- Dados de Exemplo ---
    const timelineData = {
        'REQ-001': {
            title: 'Linha do Tempo do Item: REQ-001 - Relatório de Governança e Gestão das Aquisições',
            timeline: [
                {
                    icon: 'uil-envelope-upload',
                    color: 'text-blue-500',
                    title: 'Requisição Enviada',
                    time: '12 de Setembro de 2025',
                    body: 'O item foi solicitado à Coordenadoria de Licitações.'
                },
                {
                    icon: 'uil-check-circle',
                    color: 'text-green-500',
                    title: 'Resposta Recebida',
                    time: '17 de Setembro de 2025',
                    body: 'A unidade respondeu com 2 anexos.'
                }
            ],
            anexos: [
                { name: 'respostas_auditoria.pdf', icon: 'uil-file-pdf' },
                { name: 'justificativas.xlsx', icon: 'uil-file-spreadsheet-alt' }
            ],
            iaPanel: {
                icon: 'uil-check-circle',
                color: 'text-green-500',
                text: 'Análise preliminar indica que a resposta parece completa. Os anexos são dos tipos esperados (PDF, Planilha).'
            }
        },
        'REQ-003': {
            title: 'Linha do Tempo do Item: REQ-003',
            timeline: [
                {
                    icon: 'uil-envelope-upload',
                    color: 'text-blue-500',
                    title: 'Requisição Enviada',
                    time: '14 de Setembro de 2025',
                    body: 'O item foi solicitado à Seção de Almoxarifado.'
                },
                {
                    icon: 'uil-check-circle',
                    color: 'text-green-500',
                    title: 'Resposta Recebida',
                    time: '16 de Setembro de 2025',
                    body: 'A unidade respondeu com 1 anexo.'
                },
                {
                    icon: 'uil-file-search-alt',
                    color: 'text-blue-500',
                    title: 'Marcação para Análise',
                    time: '16 de Setembro de 2025',
                    body: 'O item foi marcado para análise aprofundada pela equipe de auditoria.'
                }
            ],
            anexos: [
                { name: 'inventario_estoque.docx', icon: 'uil-file-word' }
            ],
            iaPanel: {
                icon: 'uil-exclamation-triangle',
                color: 'text-yellow-500',
                text: 'A resposta contém o anexo esperado, mas o texto da resposta é muito breve. Recomenda-se verificação manual.'
            }
        },
        'REQ-004': {
            title: 'Linha do Tempo do Item: REQ-004',
            timeline: [
                {
                    icon: 'uil-envelope-upload',
                    color: 'text-blue-500',
                    title: 'Requisição Enviada',
                    time: '15 de Setembro de 2025',
                    body: 'O item foi solicitado à Diretoria Geral.'
                },
                 {
                    icon: 'uil-check-circle',
                    color: 'text-green-500',
                    title: 'Resposta Recebida',
                    time: '17 de Setembro de 2025',
                    body: 'A unidade respondeu com 1 anexo inicial.'
                },
                {
                    icon: 'uil-comment-alt-plus',
                    color: 'text-purple-500',
                    title: 'Solicitação de Complementação',
                    time: '18 de Setembro de 2025',
                    body: 'Foi solicitado um cronograma detalhado que não constava na resposta original. A unidade enviou mais 2 anexos.'
                }
            ],
            anexos: [
                { name: 'resposta_inicial.pdf', icon: 'uil-file-pdf' },
                { name: 'cronograma_v1.xlsx', icon: 'uil-file-spreadsheet-alt' },
                { name: 'cronograma_detalhado_v2.docx', icon: 'uil-file-word' }
            ],
            iaPanel: {
                icon: 'uil-info-circle',
                color: 'text-blue-500',
                text: 'Aguardando análise da equipe de auditoria sobre os documentos complementares.'
            }
        }
    };

    // --- Inicialização do Modal via API do Flowbite ---
    const modalElement = document.getElementById('timeline-modal');
    // Opções do modal (se necessário, por enquanto usando defaults)
    const modalOptions = {
        placement: 'center-center',
        backdrop: 'static',
        closable: true
    };
    const modal = new Modal(modalElement, modalOptions);

    // --- Seletores de Elementos do Conteúdo do Modal ---
    const modalTitle = document.getElementById('modal-title');
    const modalTimeline = document.getElementById('modal-timeline');
    const modalAnexos = document.getElementById('modal-anexos');
    const modalIaPanel = document.getElementById('modal-ia-panel');

    // --- Adiciona Event Listeners aos Botões "Abrir Resposta" ---
    const openModalButtons = document.querySelectorAll('.open-timeline-button');

    openModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const itemId = button.getAttribute('data-item-id');
            const data = timelineData[itemId];

            if (data) {
                // 1. Atualiza o título do modal
                modalTitle.textContent = data.title;

                // 2. Constrói a Linha do Tempo
                modalTimeline.innerHTML = data.timeline.map(item => `
                    <li class="mb-6 ms-6">
                        <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            <i class="${item.icon} ${item.color} text-lg"></i>
                        </span>
                        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            <div class="items-center justify-between mb-3 sm:flex">
                                <time class="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">${item.time}</time>
                                <div class="text-sm font-semibold text-gray-900 dark:text-white">${item.title}</div>
                            </div>
                            <div class="p-3 text-xs italic font-normal text-gray-500 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300">${item.body}</div>
                        </div>
                    </li>
                `).join('');

                // 3. Constrói a Lista de Anexos
                modalAnexos.innerHTML = data.anexos.length > 0 ? data.anexos.map(anexo => `
                    <li class="flex items-center justify-between p-2 bg-gray-100 rounded-md dark:bg-gray-800">
                        <div class="flex items-center">
                            <i class="${anexo.icon} text-gray-500 dark:text-gray-400 mr-2 text-lg"></i>
                            <span class="text-sm font-medium">${anexo.name}</span>
                        </div>
                        <div>
                           <a href="#" class="text-primary-600 hover:underline text-sm" title="Verificar Hash e Antivírus"><i class="uil uil-shield-check"></i> Verificar</a>
                           <a href="#" class="text-primary-600 hover:underline text-sm ml-3" title="Baixar Anexo"><i class="uil uil-download-alt"></i> Baixar</a>
                        </div>
                    </li>
                `).join('') : '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo encontrado.</p>';

                // 4. Constrói o Painel da IA
                modalIaPanel.innerHTML = `
                    <div class="flex items-start">
                        <i class="${data.iaPanel.icon} ${data.iaPanel.color} text-2xl mr-3"></i>
                        <p>${data.iaPanel.text}</p>
                    </div>
                `;

                // 5. Exibe o modal
                modal.show();
            }
        });
    });

    // Lógica para fechar o modal (o data-modal-hide deve funcionar, mas isso é uma garantia)
    const closeModalButtons = document.querySelectorAll('[data-modal-hide="timeline-modal"]');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.hide();
        });
    });
});