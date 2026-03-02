document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const campoInstrucoes = document.getElementById('instrucoes');
    const campoPlanoLongoPrazo = document.getElementById('upload-plano-longo-prazo');
    const campoPlanoAnual = document.getElementById('upload-plano-anual');
    
    const uploadAreas = document.querySelectorAll('.cursor-pointer input.file-input');
    
    // Botões
    const btnGerarPlanoTrabalho = document.getElementById('btn-gerar-plano-trabalho');
    const containerBotoesVisualizar = document.getElementById('btn-container-visualizar');
    const btnVisualizarPlanoTrabalho = document.getElementById('btn-visualizar-plano-trabalho');
    const btnGerarNovo = document.getElementById('btn-gerar-novo');
    
    // Controles de UI
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar');
    let progressInterval = null;

    // --- ELEMENTOS DO MODAL DE CURADORIA ---
    const modalCuradoriaEl = document.getElementById('modal-curadoria');
    const btnEditarCuradoria = document.getElementById('btn-editar-curadoria');
    const editorCuradoria = document.getElementById('editor-curadoria');
    const btnSalvarCuradoria = document.getElementById('btn-salvar-curadoria');

    // --- VARIÁVEIS DE ESTADO ---
    let conteudoPlanoTrabalhoGerado = null;
    let documentoEmCuradoria = null;

    // --- INICIALIZAÇÃO DOS MODAIS (Flowbite) ---
    let instanciaModalPrevia = null;
    let instanciaModalCuradoria = null;

    // ==================================================================
    // FUNÇÃO PARA LIMPAR TAGS INDESEJADAS DO HTML
    // ==================================================================
    function limparHTMLGerado(html) {
        if (!html) return '';
        html = html.replace(/^```+[a-z]*\n?/i, '').replace(/\n?```+$/i, '');
        html = html.replace(/<lang\s*=\s*[^>]*>/gi, '');
        html = html.replace(/^```html\s*/i, '').replace(/\s*```$/i, '');
        html = html.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        html = html.trim();
        if (!html.toLowerCase().includes('<!doctype')) {
            if (!html.toLowerCase().includes('<html')) {
                html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documento</title>
</head>
<body>
    ${html}
</body>
</html>`;
            }
        }
        return html;
    }

    // ==================================================================
    // FUNÇÃO PARA PREPARAR HTML PARA PDF (preservando UTF-8)
    // ==================================================================
    function prepararHTMLParaPDF(html) {
        html = limparHTMLGerado(html);
        if (!html.includes('charset="UTF-8"') && !html.includes('charset=UTF-8')) {
            html = html.replace('<head>', '<head>\n    <meta charset="UTF-8">');
        }
        return html;
    }

    // ==================================================================
    // FUNÇÃO PARA REINICIAR A INTERFACE
    // ==================================================================
    function resetarInterface() {
        containerBotoesVisualizar.classList.add('hidden');
        btnGerarPlanoTrabalho.classList.remove('hidden');
        campoInstrucoes.value = '';
        uploadAreas.forEach(input => {
            input.value = '';
            input.dispatchEvent(new Event('change', { 'bubbles': true }));
        });
        conteudoPlanoTrabalhoGerado = null;
        documentoEmCuradoria = null;
        btnGerarPlanoTrabalho.disabled = false;
        document.getElementById('container-upload').scrollIntoView({ behavior: 'smooth' });
    }

    // ==================================================================
    // LÓGICA DE UPLOAD E UI INICIAL
    // ==================================================================
    uploadAreas.forEach(input => {
        const label = input.closest('label');
        const fileNameDisplay = label.querySelector('.text-xs');
        const defaultText = fileNameDisplay.textContent;
        const updateFileName = () => {
            if (input.files.length > 0) {
                fileNameDisplay.textContent = input.files[0].name;
                label.classList.add('outline', 'outline-2', 'outline-offset-2', 'outline-primary-500');
            } else {
                fileNameDisplay.textContent = defaultText;
                label.classList.remove('outline', 'outline-2', 'outline-offset-2', 'outline-primary-500');
            }
        };
        label.addEventListener('dragover', (e) => { e.preventDefault(); label.classList.add('bg-gray-200', 'dark:bg-gray-600'); });
        label.addEventListener('dragleave', () => { label.classList.remove('bg-gray-200', 'dark:bg-gray-600'); });
        label.addEventListener('drop', (e) => {
            e.preventDefault();
            label.classList.remove('bg-gray-200', 'dark:bg-gray-600');
            if (e.dataTransfer.files.length > 0) {
                input.files = e.dataTransfer.files;
                updateFileName();
            }
        });
        input.addEventListener('change', updateFileName);
    });

    // ==================================================================
    // INICIALIZAÇÃO DE MODAIS E LISTENERS DE EVENTOS
    // ==================================================================
    const modalPreviaEl = document.getElementById('modal-previa');
    if (modalPreviaEl) instanciaModalPrevia = new Modal(modalPreviaEl);
    
    if (modalCuradoriaEl) instanciaModalCuradoria = new Modal(modalCuradoriaEl, { closable: false, backdrop: 'static' });
    
    ['modal-previa', 'modal-curadoria'].forEach(id => {
        document.querySelectorAll(`[data-modal-hide="${id}"]`).forEach(button => {
            button.addEventListener('click', () => {
                const instance = [instanciaModalPrevia, instanciaModalCuradoria].find(inst => inst && inst._targetEl.id === id);
                if (instance) instance.hide();
            });
        });
    });

    btnGerarPlanoTrabalho.addEventListener('click', () => {
        if (!validarArquivos()) return;
        exibirLoading(true);
        btnGerarPlanoTrabalho.disabled = true;

        const formData = new FormData();
        if(campoPlanoLongoPrazo.files[0]) formData.append('plano_auditoria_longo_prazo', campoPlanoLongoPrazo.files[0]);
        if(campoPlanoAnual.files[0]) formData.append('plano_auditoria_anual', campoPlanoAnual.files[0]);
        
        formData.append('prompt_usuario', campoInstrucoes.value);

        fetch(`${window.location.origin}/gerar-plano-trabalho`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(async response => {
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.reply) {
                conteudoPlanoTrabalhoGerado = limparHTMLGerado(data.reply);
                btnGerarPlanoTrabalho.classList.add('hidden');
                containerBotoesVisualizar.classList.remove('hidden');
            } else {
                exibirErro('Resposta incompleta do servidor.');
                btnGerarPlanoTrabalho.disabled = false;
            }
        })
        .catch(error => {
            exibirErro('Erro ao enviar arquivos. Tente novamente mais tarde.');
            console.error('Erro ao gerar plano de trabalho:', error);
        })
        .finally(() => {
            exibirLoading(false);
            btnGerarPlanoTrabalho.disabled = false;
        });
    });

    btnVisualizarPlanoTrabalho.addEventListener('click', () => {
        if (conteudoPlanoTrabalhoGerado) abrirCuradoria('plano-trabalho');
        else exibirErro('Conteúdo do plano de trabalho não disponível.');
    });

    btnGerarNovo.addEventListener('click', resetarInterface);

    if(btnEditarCuradoria){
        btnEditarCuradoria.addEventListener('click', () => {
            editorCuradoria.contentEditable = "true";
            editorCuradoria.focus();
            exibirNotificacao('Edição habilitada.', 'info');
        });
    }

    if(btnSalvarCuradoria){
        btnSalvarCuradoria.addEventListener('click', () => {
            const conteudoEditado = editorCuradoria.innerHTML;
            instanciaModalCuradoria.hide();
            
            if (documentoEmCuradoria === 'plano-trabalho') {
                conteudoPlanoTrabalhoGerado = conteudoEditado;
                exibirPrevia(conteudoPlanoTrabalhoGerado);
            }
        });
    }

    function abrirCuradoria(tipo) {
        documentoEmCuradoria = tipo;
        const conteudo = conteudoPlanoTrabalhoGerado;
        editorCuradoria.innerHTML = sanitizarHTML(conteudo);
        editorCuradoria.contentEditable = "false";
        instanciaModalCuradoria.show();
    }

    function validarArquivos() {
        if (!campoPlanoLongoPrazo.files[0] && !campoPlanoAnual.files[0]) {
            exibirErro('Por favor, anexe pelo menos um documento para prosseguir.');
            return false;
        }
        return true;
    }

    function exibirLoading(mostrar) {
        if (mostrar) {
            loadingOverlay.classList.remove('hidden');
            let p = 0;
            progressBar.style.width = '0%';
            if (progressInterval) clearInterval(progressInterval);
            progressInterval = setInterval(() => { p += 1; progressBar.style.width = `${p}%`; if (p >= 98) clearInterval(progressInterval); }, 70);
        } else {
            progressBar.style.width = '100%';
            if (progressInterval) clearInterval(progressInterval);
            setTimeout(() => loadingOverlay.classList.add('hidden'), 300);
        }
    }

    function exibirPrevia(html) {
        renderizarConteudoSanitizado(document.getElementById('conteudo-previa'), html);
        configurarBotaoDownload(document.getElementById('btn-download'), html, 'plano-de-trabalho.pdf', 'Portrait');
        instanciaModalPrevia.show();
    }
    
    function sanitizarHTML(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('script').forEach(el => el.remove());
        return tempDiv.innerHTML;
    }

    function renderizarConteudoSanitizado(container, conteudo) {
        container.innerHTML = sanitizarHTML(conteudo);
    }
    
    function configurarBotaoDownload(botao, conteudo, nomeArquivo, orientation = 'Portrait') {
        const novoBotao = botao.cloneNode(true);
        botao.parentNode.replaceChild(novoBotao, botao);
        novoBotao.addEventListener('click', function() {
            const htmlParaPDF = prepararHTMLParaPDF(conteudo);
            fetch('/gerar-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ html: htmlParaPDF, orientation: orientation }),
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = nomeArquivo.replace('.html', '.pdf');
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Erro ao gerar PDF:', error);
                exibirErro('Erro ao gerar o PDF. Por favor, tente novamente.');
            });
        });
    }

    function exibirNotificacao(mensagem, tipo = 'info') {
        const cores = {
            info: 'text-blue-500 bg-blue-100 dark:bg-blue-800 dark:text-blue-200',
            error: 'text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200',
            success: 'text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200'
        };
        const icones = { 
            info: 'uil-info-circle', 
            error: 'uil-exclamation-triangle',
            success: 'uil-check-circle'
        };
        const id = 'toast-' + Date.now();
        const html = `
            <div id="${id}" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800" role="alert">
                <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 ${cores[tipo]} rounded-lg">
                    <i class="uil ${icones[tipo]}"></i>
                </div>
                <div class="ms-3 text-sm font-normal">${mensagem}</div>
                <button type="button" class="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg p-1.5 h-8 w-8" data-dismiss-target="#${id}" aria-label="Close"><span class="sr-only">Fechar</span><svg class="w-3 h-3" fill="none" viewBox="0 0 14 14"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/></svg></button>
            </div>`;
        document.getElementById('notificacao-toast').insertAdjacentHTML('beforeend', html);
        const el = document.getElementById(id);
        new Dismiss(el);
        setTimeout(() => el?.remove(), 5000);
    }
    const exibirErro = (msg) => exibirNotificacao(msg, 'error');
    const exibirSucesso = (msg) => exibirNotificacao(msg, 'success');
});