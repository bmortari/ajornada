// URLs das rotas FastAPI
const API_ENDPOINTS = {
    transcricao: '/iata/transcricao',
    geracao_ata: '/iata/gerar-ata',
    novo_modelo: '/iata/novo-modelo',
    novo_modelo_prompt: '/iata/novo-modelo/prompt',
    
    // ⚠️ FUNCIONALIDADE FUTURA - Webhook N8N ainda não implementado
    // TODO: Criar workflow N8N para análise de PDF e extração de estrutura
    // Endpoint planejado: http://157.173.125.173:5678/webhook/novo-modelo-pdf
    novo_modelo_pdf: '/iata/novo-modelo/pdf',  // 🚧 EM DESENVOLVIMENTO
    
    modelos: '/iata/modelos',
    salvar_template: '/iata/salvar-template',
    deletar_template: '/iata/deletar-template',
    template: '/iata/template'
};

// Variáveis globais
let resultadoTranscricao = null;
let resultadoAta = null;
let informacoesAdicionaisGlobal = "";
let tipoAtaGlobal = "";

// Variáveis para gravação de áudio
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingInterval = null;
let audioBlob = null;

// Adicionar após as variáveis globais existentes (linha ~15)
let modeloEmCuradoria = null;
let camposEditadosCuradoria = {};
let modelosDisponiveis = [];

// ============================================
// SISTEMA DE ABAS
// ============================================
function openTab(evt, tabName) {
    const tabContents = document.getElementsByClassName('tab-content-ata');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    const tabs = document.getElementsByClassName('tab-ata');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// ============================================
// CONTROLE DE RECURSOS - VERSÃO CLEAN
// ============================================
function setRecursoStatus(step, status) {
    const item = document.getElementById(`recurso-step-${step}`);
    if (!item) return;
    
    item.classList.remove('active', 'completed');
    
    if (status === 'active') {
        item.classList.add('active');
    } else if (status === 'completed') {
        item.classList.add('completed');
    }
}

function completeRecurso(step) {
    setRecursoStatus(step, 'completed');
    
    // Se completou step 1, completar conector
    if (step === 1) {
        const connector = document.getElementById('connector-1-2');
        if (connector) connector.classList.add('completed');
        
        // Ativar step 2
        setRecursoStatus(2, 'active');
    }
}

function resetRecursos() {
    for (let i = 1; i <= 3; i++) {
        const item = document.getElementById(`recurso-step-${i}`);
        if (item) {
            item.classList.remove('active', 'completed');
        }
    }
    
    const connector = document.getElementById('connector-1-2');
    if (connector) connector.classList.remove('completed');
}

// COMPATIBILIDADE - Manter nomes antigos
function setProgressStep(stepNumber, status) {
    setRecursoStatus(stepNumber, status);
}

function completeStep(stepNumber) {
    completeRecurso(stepNumber);
}

function resetProgress() {
    resetRecursos();
}

// ============================================
// ALTERNAR TIPOS DE INPUT
// ============================================
function toggleInputMethod() {
    const tipoEntrada = document.getElementById('tipo_entrada').value;
    
    document.getElementById('arquivo-input').style.display = 'none';
    document.getElementById('gravacao-input').style.display = 'none';
    
    if (tipoEntrada === 'arquivo') {
        document.getElementById('arquivo-input').style.display = 'block';
    } else if (tipoEntrada === 'gravacao') {
        document.getElementById('gravacao-input').style.display = 'block';
    }
}

// ============================================
// GRAVAÇÃO DE ÁUDIO
// ============================================
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioPreview = document.getElementById('audioPreview');
            audioPreview.src = audioUrl;
            audioPreview.style.display = 'block';
            
            // Parar todas as tracks
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // Atualizar UI
        document.getElementById('btnStartRecord').style.display = 'none';
        document.getElementById('btnStopRecord').style.display = 'block';
        document.getElementById('btnStopRecord').disabled = false;
        document.getElementById('recording-status').style.display = 'flex';
        
        // Iniciar contador de tempo
        recordingInterval = setInterval(updateRecordingTime, 1000);
        
        showStatus('🔴 Gravação iniciada! Fale claramente próximo ao microfone.', 'info');
        
    } catch (error) {
        console.error('Erro ao acessar microfone:', error);
        showStatus('❌ Erro ao acessar o microfone. Verifique as permissões do navegador.', 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // Atualizar UI
        document.getElementById('btnStartRecord').style.display = 'block';
        document.getElementById('btnStopRecord').style.display = 'none';
        document.getElementById('recording-status').style.display = 'none';
        
        // Parar contador
        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }
        
        showStatus('⏹️ Gravação finalizada! Você pode reproduzir o áudio antes de enviar.', 'success');
    }
}

function updateRecordingTime() {
    if (!recordingStartTime) return;
    
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('recording-time').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ============================================
// LISTENER PARA CHECKBOX DE EXECUÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Listener removido - não há mais execução automática
    console.log('✅ Sistema de atas carregado - Modo manual ativo');
});

// ============================================
// FORMULÁRIO DE SUBMISSÃO
// ============================================
document.getElementById('transcriptionForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const tipoEntrada = document.getElementById('tipo_entrada').value;
    const informacoesAdicionais = document.getElementById('informacoes_adicionais').value;
    
    informacoesAdicionaisGlobal = informacoesAdicionais;
    
    if (!tipoEntrada) {
        showStatus('Por favor, selecione o tipo de entrada', 'error');
        return;
    }
    
    let arquivoAudio = null;
    
    // Validar entrada baseado no tipo
    if (tipoEntrada === 'arquivo') {
        arquivoAudio = document.getElementById('arquivo_audio').files[0];
        if (!arquivoAudio) {
            showStatus('Por favor, selecione um arquivo de áudio', 'error');
            return;
        }
        
        // Validar formato de áudio
        const formatosAceitos = [
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
            'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/mp4', 'audio/x-m4a',
            'audio/flac', 'audio/x-flac', 'audio/aac', 'audio/aacp'
        ];
        
        if (!formatosAceitos.includes(arquivoAudio.type) && !arquivoAudio.type.startsWith('audio/')) {
            showStatus(`Formato de áudio não suportado: ${arquivoAudio.type}. Use MP3, WAV, OGG, M4A, WEBM, FLAC ou AAC`, 'error');
            return;
        }
        
        // Validar tamanho (50MB)
        const tamanhoMB = arquivoAudio.size / (1024 * 1024);
        if (tamanhoMB > 50) {
            showStatus(`Arquivo muito grande: ${tamanhoMB.toFixed(1)}MB. Tamanho máximo: 50MB`, 'error');
            return;
        }
    } else if (tipoEntrada === 'gravacao') {
        if (!audioBlob) {
            showStatus('Por favor, grave um áudio antes de enviar', 'error');
            return;
        }
        // Converter blob para arquivo
        arquivoAudio = new File([audioBlob], 'gravacao.webm', { type: 'audio/webm' });
    }
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Transcrevendo...';
    
    // Resetar progresso e limpar resultados
    resetProgress();
    clearResults();
    
    // Iniciar progresso visual
    document.getElementById('progressBar').style.display = 'block';
    updateProgress(10);
    setProgressStep(1, 'active');
    
    try {
        // ============================================
        // MÓDULO 1: TRANSCRIÇÃO DE ÁUDIO
        // ============================================
        updateProgress(20);
        showStatus('📤 Enviando áudio para transcrição...', 'info');
        
        const resultado = await enviarAudio(arquivoAudio, tipoEntrada, informacoesAdicionais);
        
        updateProgress(100);
        exibirResultadoTranscricao(resultado);
        showStatus('✅ Transcrição concluída com sucesso!', 'success');
        
        // Completar step 1
        completeStep(1);
        
        // Mostrar seleção de tipo de ata
        mostrarSelecaoTipoAta();
        
        showStatus('📝 Transcrição concluída! Agora escolha o tipo de ata que deseja gerar.', 'info');
        
    } catch (error) {
        showStatus('Erro: ' + error.message, 'error');
        console.error('Erro no processamento:', error);
        resetProgress();
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Iniciar Transcrição';
        setTimeout(() => {
            document.getElementById('progressBar').style.display = 'none';
        }, 2000);
    }
});

// ============================================
// FUNÇÃO DE ENVIO PARA API - MÓDULO 1
// ============================================
async function enviarAudio(arquivo, tipoEntrada, informacoesAdicionais) {
    updateProgress(30);
    showStatus('🎤 Processando áudio...', 'info');
    
    const formData = new FormData();
    formData.append('audio', arquivo);
    formData.append('tipo_entrada', tipoEntrada);
    formData.append('informacoes_adicionais', informacoesAdicionais);
    
    updateProgress(50);
    showStatus('🔄 Transcrevendo com IA... Isso pode levar alguns minutos.', 'info');
    
    const response = await fetch(API_ENDPOINTS.transcricao, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro ao processar transcrição no servidor');
    }
    
    updateProgress(80);
    const resultado = await response.json();
    return resultado;
}

// ============================================
// EXIBIR RESULTADO DA TRANSCRIÇÃO
// ============================================
function exibirResultadoTranscricao(resultado) {
    resultadoTranscricao = resultado;
    
    console.log('='.repeat(50));
    console.log('RESULTADO DA TRANSCRIÇÃO');
    console.log('='.repeat(50));
    console.log('Objeto completo:', resultado);
    console.log('='.repeat(50));
    
    // Extrair transcrição de diferentes formatos possíveis
    let transcricao = '';
    
    // Formato 1: Resposta direta do Gemini
    if (resultado.content && resultado.content.parts && resultado.content.parts[0]) {
        transcricao = resultado.content.parts[0].text;
    }
    // Formato 2: Resposta do Whisper/OpenAI
    else if (resultado.text) {
        transcricao = resultado.text;
    }
    // Formato 3: Formato esperado original
    else if (resultado.transcricao) {
        transcricao = resultado.transcricao;
    }
    // Formato 4: Resposta como string direta
    else if (typeof resultado === 'string') {
        transcricao = resultado;
    }
    // Fallback: tentar JSON.stringify
    else {
        transcricao = JSON.stringify(resultado, null, 2);
        showStatus('⚠️ Formato de resposta inesperado. Verifique o console.', 'warning');
    }
    
    // Atualizar o objeto para formato padrão
    resultadoTranscricao = {
        transcricao: transcricao,
        original: resultado
    };
    
    console.log('Transcrição extraída:', transcricao);
    
    const modulo1Content = document.getElementById('modulo1-content');
    
    // Calcular métricas
    const palavras = transcricao.split(/\s+/).filter(p => p.length > 0).length;
    const caracteres = transcricao.length;
    const tempoEstimado = resultado.duracao_audio || resultado.duration || 'N/A';
    
    const html = `
        <div class="transcription-result">
            <h4>✅ Transcrição Concluída</h4>
            
            <div class="metrics-grid" style="margin: 20px 0;">
                <div class="metric-card">
                    <div class="metric-value">${palavras}</div>
                    <div class="metric-label">Palavras</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${caracteres}</div>
                    <div class="metric-label">Caracteres</div>
                </div>
                ${tempoEstimado !== 'N/A' ? `
                <div class="metric-card">
                    <div class="metric-value">${tempoEstimado}</div>
                    <div class="metric-label">Duração</div>
                </div>
                ` : ''}
            </div>
            
            <div style="margin-top: 20px;">
                <h4>📝 Texto Transcrito:</h4>
                <div class="transcription-text">
${transcricao}
                </div>
            </div>
            
            ${resultado.confianca || resultado.confidence ? `
            <div style="margin-top: 15px; padding: 12px; background: #e7f3ff; border-radius: 8px;">
                <p><strong>🎯 Confiança da Transcrição:</strong> ${((resultado.confianca || resultado.confidence) * 100).toFixed(1)}%</p>
            </div>
            ` : ''}
        </div>
    `;
    
    modulo1Content.innerHTML = html;
    
    // Salvar no sessionStorage
    sessionStorage.setItem('resultadoTranscricao', JSON.stringify(resultado));
}

// ============================================
// MÓDULO 2: GERAÇÃO DE ATA
// ============================================
async function processarGeracaoAta(transcricao, tipoAta, templateHtml, informacoesAdicionais) {
    try {
        console.log('🚀 INICIANDO MÓDULO 2: GERAÇÃO DE ATA');
        console.log('📝 Tipo de ata:', tipoAta);
        console.log('📄 Template HTML:', templateHtml ? 'Carregado' : 'Não fornecido');
        
        showStatus('Iniciando Módulo 2: Geração de Ata...', 'info');
        setProgressStep(2, 'active');
        
        // Mudar para aba do módulo 2
        const tab2 = document.querySelectorAll('.tab-ata')[1];
        openTab({currentTarget: tab2}, 'modulo2');
        
        const response = await fetch(API_ENDPOINTS.geracao_ata, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcricao: transcricao,
                tipo_ata: tipoAta,
                template_html: templateHtml,
                informacoes_adicionais: informacoesAdicionais,
                metadata: resultadoTranscricao || {}
            })
        });
        
        console.log('📡 Resposta do servidor:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Erro do servidor:', errorData);
            
            if (response.status === 502 || response.status === 404) {
                throw new Error('O webhook do N8N não está ativo. Ative o workflow de geração de atas no N8N.');
            }
            
            throw new Error(errorData.detail || 'Erro ao processar geração de ata');
        }
        
        const resultado = await response.json();
        resultadoAta = resultado;
        
        console.log('='.repeat(50));
        console.log('✅ MÓDULO 2: GERAÇÃO DE ATA - SUCESSO');
        console.log('='.repeat(50));
        console.log('Resultado:', resultado);
        console.log('='.repeat(50));
        
        // Exibir resultado no Módulo 2
        exibirResultadoAta(resultado);
        
        // Completar step 2
        completeStep(2);
        showStatus('✅ Ata gerada com sucesso! Você pode baixá-la agora.', 'success');
        
        // Salvar no sessionStorage
        sessionStorage.setItem('resultadoAta', JSON.stringify(resultado));
        
        // Habilitar botão de download
        habilitarDownload();
        
    } catch (error) {
        showStatus('❌ Erro no Módulo 2: ' + error.message, 'error');
        console.error('❌ ERRO NO MÓDULO 2:', error);
        
        const modulo2Content = document.getElementById('modulo2-content');
        modulo2Content.innerHTML = `
            <div style="padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px;">
                <h4 style="color: #856404; margin-bottom: 10px;">⚠️ Erro ao Gerar Ata</h4>
                <p style="color: #856404; margin-bottom: 15px;">${error.message}</p>
                <button onclick="executarModulo2Manual()" class="btn-ata" style="margin-top: 15px; width: auto; padding: 10px 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
        
        throw error;
    }
}

function exibirResultadoAta(resultado) {
    const modulo2Content = document.getElementById('modulo2-content');
    
    // Estrutura da ata pode variar dependendo do tipo
    const ata = resultado.ata || resultado;
    
    // Obter HTML completo
    let htmlCompleto = '';
    if (ata.html) {
        htmlCompleto = ata.html;
    } else {
        // Gerar HTML se não vier pronto
        htmlCompleto = gerarHTMLAta(resultado);
    }
    
    // Salvar dados editáveis globalmente
    window.htmlAtaEditavel = htmlCompleto;
    window.dadosAtaEditaveis = ata.dados_extraidos || extrairDadosDoHTML(htmlCompleto);
    
    let html = `
        <div class="ata-generated">
            <div class="ata-header">
                <h2>${ata.titulo || 'ATA DE REUNIÃO'}</h2>
                ${ata.subtitulo ? `<p style="color: #666; margin-top: 5px;">${ata.subtitulo}</p>` : ''}
            </div>
    `;
    
    // Renderizar seções da ata
    if (ata.secoes && Array.isArray(ata.secoes)) {
        ata.secoes.forEach(secao => {
            html += `
                <div class="ata-section">
                    <h4>${secao.titulo}</h4>
                    <div>${formatarConteudoAta(secao.conteudo)}</div>
                </div>
            `;
        });
    } else {
        // Fallback: renderizar conteúdo simples
        html += `
            <div class="ata-section">
                <div>${formatarConteudoAta(ata.conteudo || JSON.stringify(ata, null, 2))}</div>
            </div>
        `;
    }
    
    // Footer da ata
    html += `
            <div class="ata-footer">
                <p>Documento gerado automaticamente pelo Sistema Mosaiko</p>
                <p>Data de geração: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        </div>
        
        <!-- CONTROLES DE EDIÇÃO -->
        <div style="margin-top: 30px; text-align: center;">
            <button onclick="abrirEditorVisual()" class="btn-ata" style="width: auto; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                ✏️ Editar Conteúdo da Ata
            </button>
            <p style="margin-top: 10px; color: #666; font-size: 0.9em;">
                💡 Clique para editar os dados da ata de forma simples
            </p>
        </div>
        
        <!-- EDITOR VISUAL (inicialmente escondido) -->
        <div id="editor-visual-ata" style="display: none; margin-top: 30px; animation: slideDown 0.3s;">
            <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; border: 3px solid var(--theme-primary-color); box-shadow: 0 4px 20px rgba(26, 107, 101, 0.2);">
                <h3 style="color: var(--theme-primary-color); margin-bottom: 20px; text-align: center;">
                    ✏️ Editor de Conteúdo
                </h3>
                <p style="text-align: center; color: #666; margin-bottom: 25px;">
                    Edite as informações abaixo. As alterações serão aplicadas na ata.
                </p>
                
                <div id="campos-editaveis-container" style="display: grid; gap: 20px;">
                    <!-- Campos serão inseridos aqui -->
                </div>
                
                <div style="margin-top: 25px; display: flex; gap: 15px; justify-content: center; padding-top: 20px; border-top: 2px solid #dee2e6;">
                    <button onclick="cancelarEdicaoVisual()" class="btn-secondary" style="padding: 12px 30px;">
                        ❌ Cancelar
                    </button>
                    <button onclick="salvarEdicaoVisual()" class="btn-ata" style="width: auto; padding: 12px 40px;">
                        💾 Salvar e Aplicar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modulo2Content.innerHTML = html;
}

function formatarConteudoAta(conteudo) {
    if (typeof conteudo !== 'string') {
        conteudo = JSON.stringify(conteudo, null, 2);
    }
    
    // Converter quebras de linha em parágrafos
    return conteudo
        .split('\n\n')
        .map(p => `<p>${p.trim()}</p>`)
        .join('');
}

// ============================================
// DOWNLOAD DA ATA (HTML)
// ============================================
function downloadAta() {
    if (!resultadoAta && !window.htmlAtaEditavel) {
        showStatus('❌ Nenhuma ata disponível para download', 'error');
        return;
    }
    
    try {
        showStatus('📄 Preparando download...', 'info');
        
        // Usar HTML editado se existir, senão usar original
        let htmlAta = window.htmlAtaEditavel;
        
        if (!htmlAta && resultadoAta) {
            if (resultadoAta.ata && resultadoAta.ata.html) {
                htmlAta = resultadoAta.ata.html;
            } else {
                // Fallback: gerar HTML a partir do conteúdo
                htmlAta = gerarHTMLAta(resultadoAta);
            }
        }
        
        if (!htmlAta) {
            showStatus('❌ Erro: HTML da ata não encontrado', 'error');
            return;
        }
        
        // Criar blob e fazer download
        const blob = new Blob([htmlAta], { type: 'text/html; charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        
        // Gerar nome do arquivo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `ata_${tipoAtaGlobal}_${timestamp}.html`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showStatus('✅ Ata baixada com sucesso!', 'success');
        showStatus('💡 Dica: Abra o HTML no navegador e use Ctrl+P para salvar como PDF', 'info');
        
    } catch (error) {
        console.error('Erro ao baixar ata:', error);
        showStatus('❌ Erro ao gerar download: ' + error.message, 'error');
    }
}

function gerarHTMLAta(resultado) {
    const ata = resultado.ata || resultado;
    
    let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ata - ${ata.titulo || 'Documento'}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 40px;
            line-height: 1.8;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #1a6b65;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1a6b65;
            margin: 0;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #1a6b65;
            font-size: 1.3em;
            border-left: 4px solid #1a6b65;
            padding-left: 15px;
            margin: 20px 0 10px 0;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #1a6b65;
            text-align: center;
            font-size: 0.9em;
            color: #666;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #1a6b65;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .print-button:hover {
            background: #0f4c48;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    
    <div class="header">
        <h1>${ata.titulo || 'ATA'}</h1>
    </div>
`;
    
    // Adicionar seções
    if (ata.secoes && Array.isArray(ata.secoes)) {
        ata.secoes.forEach(secao => {
            html += `
    <div class="section">
        <h2>${secao.titulo}</h2>
        <div>${secao.conteudo}</div>
    </div>`;
        });
    } else if (ata.texto_completo) {
        html += `<div class="section"><div>${ata.texto_completo}</div></div>`;
    }
    
    html += `
    <div class="footer">
        <p>Documento gerado automaticamente pelo Sistema Mosaiko</p>
        <p>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
    </div>
</body>
</html>`;
    
    return html;
}

// ============================================
// MÓDULO 3: CRIAR NOVO MODELO DE ATA
// ============================================

// ============================================
// MÓDULO 3 REDESENHADO
// ============================================
let pdfArquivoNovo = null;
let modeloGeradoNovo = null;

function selecionarMetodoNovo(metodo) {
    // ⚠️ BLOQUEIO TEMPORÁRIO - PDF ainda não implementado
    if (metodo === 'pdf') {
        showStatus('🚧 Funcionalidade em desenvolvimento! O workflow N8N para análise de PDF ainda não foi implementado.', 'warning');
        showStatus('💡 Por enquanto, use a opção "Descrever com IA"', 'info');
        return;
    }
    
    document.getElementById('metodo-criacao-novo').style.display = 'none';
    
    if (metodo === 'prompt') {
        document.getElementById('form-via-prompt-novo').style.display = 'block';
        showStatus('💬 Descreva o modelo que você precisa', 'info');
    } else if (metodo === 'pdf') {
        document.getElementById('form-via-pdf-novo').style.display = 'block';
        showStatus('📄 Envie um PDF de exemplo', 'info');
    }
}

function voltarSelecaoMetodoNovo() {
    document.getElementById('metodo-criacao-novo').style.display = 'block';
    document.getElementById('form-via-prompt-novo').style.display = 'none';
    document.getElementById('form-via-pdf-novo').style.display = 'none';
    document.getElementById('resultado-modelo-novo').style.display = 'none';
    
    // Limpar formulários
    document.getElementById('formPromptModeloNovo')?.reset();
    document.getElementById('formPDFModeloNovo')?.reset();
    pdfArquivoNovo = null;
    modeloGeradoNovo = null;
}

async function processarPromptModeloNovo(event) {
    event.preventDefault();
    
    const nomeModelo = document.getElementById('nome_modelo_prompt_novo').value;
    const descricao = document.getElementById('descricao_modelo_novo').value;
    
    if (!nomeModelo || !descricao) {
        showStatus('⚠️ Preencha todos os campos', 'warning');
        return;
    }
    
    try {
        mostrarLoadingNovo('🤖 A IA está criando seu modelo...');
        
        const payload = {
            nome_modelo: nomeModelo,
            descricao: descricao,
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 Enviando para IA:', payload);
        
        const response = await fetch(API_ENDPOINTS.novo_modelo + '/prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao processar com IA');
        }
        
        const resultado = await response.json();
        modeloGeradoNovo = resultado;
        
        console.log('✅ Modelo gerado:', resultado);
        
        esconderLoadingNovo();
        mostrarResultadoModelo(resultado);
        showStatus('✅ Modelo gerado com sucesso!', 'success');
        
    } catch (error) {
        esconderLoadingNovo();
        console.error('❌ Erro:', error);
        showStatus('❌ Erro ao gerar modelo: ' + error.message, 'error');
    }
}

function handlePDFUploadNovo(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
        showStatus('❌ Apenas arquivos PDF são aceitos', 'error');
        event.target.value = '';
        return;
    }
    
    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB > 10) {
        showStatus(`❌ Arquivo muito grande: ${tamanhoMB.toFixed(1)}MB. Máximo: 10MB`, 'error');
        event.target.value = '';
        return;
    }
    
    pdfArquivoNovo = file;
    
    document.querySelector('.upload-placeholder-novo').style.display = 'none';
    document.getElementById('pdf-preview-novo').style.display = 'flex';
    document.getElementById('pdf-filename-novo').textContent = file.name;
    document.getElementById('pdf-size-novo').textContent = `${tamanhoMB.toFixed(2)} MB`;
    
    showStatus(`✅ PDF "${file.name}" carregado`, 'success');
}

function removerPDFNovo() {
    pdfArquivoNovo = null;
    document.getElementById('pdf_exemplo_novo').value = '';
    document.querySelector('.upload-placeholder-novo').style.display = 'block';
    document.getElementById('pdf-preview-novo').style.display = 'none';
    showStatus('🗑️ PDF removido', 'info');
}

// ============================================
// 🚧 FUNCIONALIDADE FUTURA - EM DESENVOLVIMENTO
// ============================================
// Esta função está preparada mas depende de:
// 1. Workflow N8N configurado para análise de PDF
// 2. Endpoint: http://157.173.125.173:5678/webhook/novo-modelo-pdf
// 3. Lógica de extração de estrutura, campos e formatação do PDF
//
// TODO: 
// - Criar workflow N8N com node de leitura de PDF
// - Implementar extração de texto e estrutura
// - Detectar seções automaticamente
// - Identificar placeholders/campos dinâmicos
// - Gerar HTML template baseado no layout do PDF
// ============================================
async function processarPDFModeloNovo(event) {
    event.preventDefault();
    
    // ⚠️ AVISO: Funcionalidade ainda não implementada completamente
    showStatus('⚠️ ATENÇÃO: Esta funcionalidade está em desenvolvimento!', 'warning');
    showStatus('🚧 O workflow N8N necessário ainda não foi criado.', 'info');
    
    const nomeModelo = document.getElementById('nome_modelo_pdf_novo').value;
    
    if (!nomeModelo || !pdfArquivoNovo) {
        showStatus('⚠️ Preencha todos os campos e envie o PDF', 'warning');
        return;
    }
    
    try {
        mostrarLoadingNovo('📄 Analisando PDF com IA...<br><small style="opacity: 0.8;">Isso pode levar alguns minutos</small>');
        
        const base64PDF = await fileToBase64(pdfArquivoNovo);
        
        const payload = {
            nome_modelo: nomeModelo,
            pdf_base64: base64PDF,
            nome_arquivo: pdfArquivoNovo.name,
            tamanho_mb: (pdfArquivoNovo.size / (1024 * 1024)).toFixed(2),
            timestamp: new Date().toISOString(),
            criado_via: 'pdf'
        };
        
        console.log('📤 Enviando PDF:', {
            nome: nomeModelo,
            arquivo: pdfArquivoNovo.name
        });
        
        // ⚠️ Esta chamada provavelmente falhará até o workflow N8N ser implementado
        const response = await fetch(API_ENDPOINTS.novo_modelo_pdf, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Erro ao processar PDF - Workflow N8N não disponível');
        }
        
        const resultado = await response.json();
        modeloGeradoNovo = resultado;
        
        console.log('✅ PDF analisado:', resultado);
        
        esconderLoadingNovo();
        mostrarCuradoria(resultado);
        showStatus('✅ PDF analisado! Revise antes de salvar.', 'success');
        
    } catch (error) {
        esconderLoadingNovo();
        console.error('❌ Erro:', error);
        showStatus('❌ Erro ao processar PDF: ' + error.message, 'error');
        showStatus('💡 Use a opção "Descrever com IA" por enquanto', 'info');
    }
}

function mostrarResultadoModelo(modelo) {
    document.getElementById('form-via-prompt-novo').style.display = 'none';
    document.getElementById('form-via-pdf-novo').style.display = 'none';
    document.getElementById('resultado-modelo-novo').style.display = 'block';
    
    const campos = extrairCamposTemplate(modelo.template_html || '');
    
    const html = `
        <div style="background: white; padding: 30px; border-radius: 16px; border: 2px solid var(--theme-primary-color);">
            <h4 style="color: var(--theme-primary-color); margin-bottom: 20px;">📋 Informações do Modelo</h4>
            
            <div style="display: grid; gap: 15px;">
                <div>
                    <strong>Nome:</strong>
                    <p style="margin: 5px 0; padding: 10px; background: #f8f9fa; border-radius: 8px;">${modelo.nome_modelo}</p>
                </div>
                
                <div>
                    <strong>Campos Detectados:</strong>
                    <p style="margin: 5px 0; color: #666;">${campos.length} campos personalizáveis</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                        ${campos.slice(0, 10).map(c => `<span style="background: #e7f5f4; color: var(--theme-primary-color); padding: 5px 12px; border-radius: 15px; font-size: 0.9em;">${c}</span>`).join('')}
                        ${campos.length > 10 ? `<span style="color: #666;">+${campos.length - 10} mais</span>` : ''}
                    </div>
                </div>
                
                <div>
                    <strong>Template HTML:</strong>
                    <p style="margin: 5px 0; color: #666;">${(modelo.template_html || '').length} caracteres</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modelo-info-novo').innerHTML = html;
    
    setTimeout(() => {
        document.getElementById('resultado-modelo-novo').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function usarModeloGerado() {
    if (!modeloGeradoNovo) {
        showStatus('❌ Nenhum modelo disponível', 'error');
        return;
    }
    
    // Salvar no localStorage
    let modelos = JSON.parse(localStorage.getItem('modelos_customizados') || '[]');
    modelos.push({
        ...modeloGeradoNovo,
        data_criacao: new Date().toISOString()
    });
    localStorage.setItem('modelos_customizados', JSON.stringify(modelos));
    
    showStatus('✅ Modelo salvo com sucesso!', 'success');
    showStatus('🎉 Agora você pode usar este modelo na geração de atas', 'info');
    
    setTimeout(() => {
        voltarSelecaoMetodoNovo();
    }, 2000);
}

function mostrarLoadingNovo(mensagem) {
    document.getElementById('loading-message-novo').innerHTML = mensagem;
    document.getElementById('loading-modulo3-novo').style.display = 'block';
}

function esconderLoadingNovo() {
    document.getElementById('loading-modulo3-novo').style.display = 'none';
}

// ============================================
// UTILIDADES
// ============================================
function mostrarLoading(mensagem) {
    document.getElementById('loading-message').innerHTML = mensagem;
    document.getElementById('loading-modulo3').style.display = 'block';
}

function esconderLoading() {
    document.getElementById('loading-modulo3').style.display = 'none';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remover prefixo "data:application/pdf;base64,"
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// ============================================
// DRAG AND DROP PARA PDF
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('pdf-upload-area');
    
    if (!uploadArea) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        }, false);
    });
    
    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const input = document.getElementById('pdf_exemplo');
            input.files = files;
            
            // Trigger change event
            const event = new Event('change');
            input.dispatchEvent(event);
        }
    }, false);
});

// ============================================
// EDITOR DE HTML DA ATA
// ============================================
function toggleEditorHTML() {
    const editor = document.getElementById('editor-html-ata');
    if (editor.style.display === 'none') {
        editor.style.display = 'block';
        // Scroll suave até o editor
        setTimeout(() => {
            editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        showStatus('✏️ Editor de HTML aberto. Faça suas alterações e clique em "Salvar".', 'info');
    } else {
        editor.style.display = 'none';
        showStatus('Editor de HTML fechado', 'info');
    }
}

function cancelarEdicaoHTML() {
    const editor = document.getElementById('editor-html-ata');
    const textarea = document.getElementById('textarea-html-ata');
    
    // Restaurar HTML original
    textarea.value = window.htmlAtaEditavel;
    
    // Fechar editor
    editor.style.display = 'none';
    
    showStatus('❌ Edição cancelada. HTML restaurado ao original.', 'info');
}

function salvarEdicaoHTML() {
    const textarea = document.getElementById('textarea-html-ata');
    const novoHTML = textarea.value;
    
    // Validar HTML básico
    if (!novoHTML.trim()) {
        showStatus('⚠️ O HTML não pode estar vazio', 'warning');
        return;
    }
    
    // Atualizar HTML editável globalmente
    window.htmlAtaEditavel = novoHTML;
    
    // Atualizar no objeto de resultado
    if (resultadoAta && resultadoAta.ata) {
        resultadoAta.ata.html = novoHTML;
    }
    
    // Fechar editor
    document.getElementById('editor-html-ata').style.display = 'none';
    
    showStatus('✅ Alterações salvas! O download usará a versão editada.', 'success');
    
    console.log('📝 HTML editado salvo (tamanho):', novoHTML.length);
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function updateProgress(percent) {
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = percent + '%';
        progressFill.textContent = percent + '%';
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessages');
    if (!statusDiv) return;
    
    const statusClass = `status-${type}`;
    const statusHtml = `<div class="status-message ${statusClass}">${message}</div>`;
    statusDiv.insertAdjacentHTML('afterbegin', statusHtml);
    
    const messages = statusDiv.getElementsByClassName('status-message');
    if (messages.length > 5) {
        messages[messages.length - 1].remove();
    }
}

function clearResults() {
    const ids = ['modulo1-content', 'modulo2-content'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = `<p style="color: #999; text-align: center; padding: 40px;">Aguardando processamento...</p>`;
    });
    const statusDiv = document.getElementById('statusMessages');
    if(statusDiv) statusDiv.innerHTML = '';
}

// ============================================
// CONTROLE MANUAL DOS MÓDULOS
// ============================================
function mostrarSelecaoTipoAta() {
    // Esconder o formulário inicial
    document.getElementById('transcriptionForm').style.display = 'none';
    
    // Mostrar seleção de tipo de ata
    document.getElementById('ata-type-selection').style.display = 'block';
    
    // Mostrar controles
    document.getElementById('module-controls').style.display = 'block';
}

async function gerarAtaComTipoEscolhido() {
    const tipoAta = document.getElementById('tipo_ata_escolha').value;
    
    if (!tipoAta) {
        showStatus('⚠️ Por favor, selecione um tipo de ata', 'warning');
        return;
    }
    
    if (!resultadoTranscricao) {
        showStatus('❌ Erro: Transcrição não encontrada. Recarregue a página e tente novamente.', 'error');
        return;
    }
    
    tipoAtaGlobal = tipoAta;
    
    try {
        showStatus(`🔍 Carregando template: ${obterNomeTipoAta(tipoAta)}...`, 'info');
        
        // 1. BUSCAR TEMPLATE HTML DO BACKEND
        const templateResponse = await fetch(`${API_ENDPOINTS.geracao_ata.replace('/gerar-ata', '')}/template/${tipoAta}`);
        
        if (!templateResponse.ok) {
            throw new Error('Erro ao carregar template do servidor');
        }
        
        const templateData = await templateResponse.json();
        const templateHtml = templateData.template_html;
        
        console.log('📄 Template carregado:', templateData.template_file);
        
        showStatus(`🚀 Gerando ata do tipo: ${obterNomeTipoAta(tipoAta)}...`, 'info');
        
        // 2. EXTRAIR TRANSCRIÇÃO DO FORMATO CORRETO
        const transcricao = resultadoTranscricao.transcricao || 
                           resultadoTranscricao.text || 
                           resultadoTranscricao.content?.parts?.[0]?.text ||
                           JSON.stringify(resultadoTranscricao);
        
        // 3. GERAR ATA COM TEMPLATE
        await processarGeracaoAta(
            transcricao, 
            tipoAta,
            templateHtml,
            informacoesAdicionaisGlobal
        );
        
        // Esconder seleção após gerar
        document.getElementById('ata-type-selection').style.display = 'none';
        
    } catch (error) {
        showStatus('❌ Erro ao gerar ata: ' + error.message, 'error');
        console.error('Erro:', error);
    }
}

function obterNomeTipoAta(tipo) {
    const nomes = {
        'reuniao_trabalho': 'Ata de Reunião de Trabalho',
        'sessao_judiciaria': 'Ata de Sessão Judiciária',
        'reuniao_condominio': 'Ata de Reunião de Condomínio',
        'assembleia_geral': 'Ata de Assembleia Geral'
    };
    return nomes[tipo] || tipo;
}

function habilitarControleManual(modulo) {
    document.getElementById('module-controls').style.display = 'block';
    
    if (modulo === 'modulo2') {
        // Não precisa mais habilitar botão específico
        // A seleção de tipo de ata já está visível
    }
}

function habilitarDownload() {
    const btn = document.getElementById('btn-download-ata');
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

function resetarFormulario() {
    // Mostrar formulário novamente
    document.getElementById('transcriptionForm').style.display = 'block';
    document.getElementById('transcriptionForm').reset();
    
    // Esconder seleção de tipo
    document.getElementById('ata-type-selection').style.display = 'none';
    
    // Esconder controles
    document.getElementById('module-controls').style.display = 'none';
    
    // Resetar variáveis globais
    resultadoTranscricao = null;
    resultadoAta = null;
    informacoesAdicionaisGlobal = "";
    tipoAtaGlobal = "";
    audioBlob = null;
    
    // Resetar progresso
    resetProgress();
    clearResults();
    
    showStatus('🔄 Formulário resetado. Você pode fazer uma nova transcrição.', 'info');
}

// ============================================
// EDITOR VISUAL DA ATA (NÃO-TÉCNICO)
// ============================================
function extrairDadosDoHTML(html) {
    // Tentar extrair dados do HTML usando regex básica
    const dados = {};
    
    const placeholders = html.match(/\{\{([^}]+)\}\}/g);
    if (placeholders) {
        placeholders.forEach(placeholder => {
            const campo = placeholder.replace(/[{}]/g, '');
            dados[campo] = `[${campo}]`;
        });
    }
    
    return dados;
}

function abrirEditorVisual() {
    const editor = document.getElementById('editor-visual-ata');
    const container = document.getElementById('campos-editaveis-container');
    
    // Pegar dados editáveis
    const dados = window.dadosAtaEditaveis || {};
    
    // Definir campos editáveis comuns
    const camposEditaveis = {
        'empresa': { label: '🏢 Empresa', tipo: 'text', placeholder: 'Nome da empresa' },
        'data': { label: '📅 Data', tipo: 'date' },
        'hora': { label: '🕐 Horário de Início', tipo: 'time' },
        'hora_encerramento': { label: '🕐 Horário de Encerramento', tipo: 'time' },
        'local': { label: '📍 Local', tipo: 'text', placeholder: 'Local da reunião' },
        'participantes': { label: '👥 Participantes', tipo: 'textarea', placeholder: 'Liste os participantes (um por linha ou separados por vírgula)' },
        'pauta': { label: '📋 Pauta', tipo: 'textarea', placeholder: 'Descreva os tópicos discutidos' },
        'discussoes': { label: '💬 Discussões', tipo: 'textarea', placeholder: 'Resuma as discussões realizadas', rows: 6 },
        'decisoes': { label: '✅ Decisões Tomadas', tipo: 'textarea', placeholder: 'Liste as decisões (uma por linha)' },
        'acoes': { label: '📌 Ações e Responsáveis', tipo: 'textarea', placeholder: 'Liste as ações com responsáveis e prazos' },
        'proximos_passos': { label: '➡️ Próximos Passos', tipo: 'textarea', placeholder: 'Descreva os próximos passos' },
        'responsavel_ata': { label: '✍️ Responsável pela Ata', tipo: 'text', placeholder: 'Nome do responsável' },
        'aprovador': { label: '✔️ Aprovador', tipo: 'text', placeholder: 'Nome do aprovador' }
    };
    
    // Renderizar campos
    let html = '';
    
    for (const [campo, config] of Object.entries(camposEditaveis)) {
        const valor = dados[campo] || '';
        const valorLimpo = valor.replace(/<[^>]*>/g, '').replace(/\[.*?\]/g, '').trim();
        
        html += `
            <div class="campo-editavel" style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #dee2e6;">
                <label style="display: block; font-weight: 600; color: #333; margin-bottom: 8px;">
                    ${config.label}
                </label>
        `;
        
        if (config.tipo === 'textarea') {
            html += `
                <textarea 
                    id="edit_${campo}" 
                    rows="${config.rows || 4}"
                    placeholder="${config.placeholder || ''}"
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: inherit; resize: vertical;"
                >${valorLimpo}</textarea>
            `;
        } else {
            html += `
                <input 
                    type="${config.tipo}" 
                    id="edit_${campo}" 
                    value="${valorLimpo}"
                    placeholder="${config.placeholder || ''}"
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
                >
            `;
        }
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
    editor.style.display = 'block';
    
    // Scroll suave até o editor
    setTimeout(() => {
        editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    showStatus('✏️ Editor aberto. Faça suas alterações e clique em "Salvar".', 'info');
}

function cancelarEdicaoVisual() {
    const editor = document.getElementById('editor-visual-ata');
    editor.style.display = 'none';
    showStatus('❌ Edição cancelada.', 'info');
}

function salvarEdicaoVisual() {
    // Coletar todos os valores editados
    const dadosEditados = {};
    const campos = ['empresa', 'data', 'hora', 'hora_encerramento', 'local', 'participantes', 
                    'pauta', 'discussoes', 'decisoes', 'acoes', 'proximos_passos', 
                    'responsavel_ata', 'aprovador'];
    
    campos.forEach(campo => {
        const elemento = document.getElementById(`edit_${campo}`);
        if (elemento) {
            let valor = elemento.value.trim();
            
            // Formatar campos específicos
            if (campo === 'participantes' && valor) {
                // Converter para lista HTML
                const participantesList = valor.split(/[\n,]+/).map(p => p.trim()).filter(p => p);
                valor = participantesList.map(p => `<li>${p}</li>`).join('');
            } else if (campo === 'decisoes' && valor) {
                // Converter para lista HTML
                const decisoesList = valor.split('\n').map(d => d.trim()).filter(d => d);
                valor = decisoesList.map(d => `<li>${d}</li>`).join('');
            } else if (['pauta', 'discussoes', 'proximos_passos'].includes(campo) && valor) {
                // Converter para parágrafos HTML
                const paragrafos = valor.split('\n\n').map(p => p.trim()).filter(p => p);
                valor = paragrafos.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
            } else if (campo === 'acoes' && valor) {
                // Formatar ações com estilo
                const acoesList = valor.split('\n\n').map(a => a.trim()).filter(a => a);
                valor = acoesList.map(acao => 
                    `<div class='action-item'><strong>Ação:</strong> ${acao}</div>`
                ).join('');
            }
            
            dadosEditados[campo] = valor;
        }
    });
    
    // Adicionar data de geração
    dadosEditados.data_geracao = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    
    console.log('📝 Dados editados:', dadosEditados);
    
    // Atualizar dados globais
    window.dadosAtaEditaveis = dadosEditados;
    
    // Pegar template original
    let htmlAtualizado = window.htmlAtaEditavel;
    
    // Substituir todos os placeholders
    for (const [campo, valor] of Object.entries(dadosEditados)) {
        const regex = new RegExp(`\\{\\{${campo}\\}\\}`, 'g');
        htmlAtualizado = htmlAtualizado.replace(regex, valor || `<em style="color: #999;">Não especificado</em>`);
    }
    
    // Limpar placeholders restantes
    htmlAtualizado = htmlAtualizado.replace(/\{\{[^}]+\}\}/g, '<em style="color: #999;">Não especificado</em>');
    
    // Atualizar HTML global
    window.htmlAtaEditavel = htmlAtualizado;
    
    // Atualizar resultado
    if (resultadoAta && resultadoAta.ata) {
        resultadoAta.ata.html = htmlAtualizado;
        resultadoAta.ata.dados_extraidos = dadosEditados;
    }
    
    // Fechar editor
    document.getElementById('editor-visual-ata').style.display = 'none';
    
    // Reexibir ata atualizada
    exibirResultadoAta(resultadoAta);
    
    showStatus('✅ Alterações salvas e aplicadas! Você pode baixar a ata atualizada.', 'success');
}

// ============================================
// CARREGAR MODELOS DINAMICAMENTE
// ============================================
async function carregarModelosDisponiveis() {
    try {
        const response = await fetch(API_ENDPOINTS.modelos.replace('/modelos', '/modelos-disponiveis'));
        
        if (!response.ok) {
            throw new Error('Erro ao carregar modelos');
        }
        
        const resultado = await response.json();
        
        console.log('📋 Modelos carregados:', resultado.total);
        console.log('   - Nativos:', resultado.nativos);
        console.log('   - Customizados:', resultado.customizados);
        
        // Atualizar dropdown
        const select = document.getElementById('tipo_ata_escolha');
        if (select) {
            select.innerHTML = '<option value="">Selecione o tipo de ata</option>';
            
            resultado.modelos.forEach(modelo => {
                const option = document.createElement('option');
                option.value = modelo.id;
                option.textContent = modelo.nome;
                option.title = modelo.descricao;
                select.appendChild(option);
            });
            
            console.log('✅ Dropdown atualizado com', resultado.modelos.length, 'modelos');
        }
        
        // Atualizar badge da biblioteca
        const badge = document.getElementById('badge-total-modelos');
        if (badge) {
            badge.textContent = resultado.total;
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar modelos:', error);
        showStatus('⚠️ Não foi possível carregar todos os modelos', 'warning');
    }
}

// Carregar modelos ao iniciar a página
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema de atas carregado - Modo manual ativo');
    carregarModelosDisponiveis();
});

// Atualizar função usarModeloGerado
function usarModeloGerado() {
    if (!modeloGeradoNovo) {
        showStatus('❌ Nenhum modelo disponível', 'error');
        return;
    }
    
    showStatus('💾 Salvando modelo...', 'info');
    
    // O modelo já foi salvo pelo N8N via FastAPI
    // Apenas atualizar a lista
    carregarModelosDisponiveis();
    
    showStatus('✅ Modelo salvo e disponível para uso!', 'success');
    showStatus('🎉 Agora você pode usá-lo na geração de atas', 'info');
    
    setTimeout(() => {
        voltarSelecaoMetodoNovo();
        // Mudar para aba do Módulo 2
        const tab2 = document.querySelectorAll('.tab-ata')[1];
        if (tab2) {
            openTab({currentTarget: tab2}, 'modulo2');
        }
    }, 2000);
}

function extrairCamposTemplate(html) {
    if (!html) return [];
    
    const regex = /\{\{([^}]+)\}\}/g;
    const campos = new Set();
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        campos.add(match[1].trim());
    }
    
    return Array.from(campos);
}

// ============================================
// BIBLIOTECA DE MODELOS
// ============================================
async function toggleBibliotecaModelos() {
    const container = document.getElementById('biblioteca-modelos-container');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        await carregarBibliotecaModelos();
    } else {
        container.style.display = 'none';
    }
}

async function carregarBibliotecaModelos() {
    const grid = document.getElementById('biblioteca-grid');
    grid.innerHTML = '<div class="loading-biblioteca"><div class="loader"></div><p>Carregando modelos...</p></div>';
    
    try {
        const response = await fetch(API_ENDPOINTS.modelos.replace('/modelos', '/modelos-disponiveis'));
        const data = await response.json();
        
        modelosDisponiveis = data.modelos || [];
        
        // Atualizar badges de contagem
        document.getElementById('badge-total-modelos').textContent = data.total;
        document.getElementById('count-todos').textContent = data.total;
        document.getElementById('count-nativos').textContent = data.nativos;
        document.getElementById('count-customizados').textContent = data.customizados;
        
        renderizarModelos(modelosDisponiveis);
        
    } catch (error) {
        console.error('Erro ao carregar biblioteca:', error);
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <p style="color: #dc3545; font-size: 1.1em;">❌ Erro ao carregar modelos</p>
                <button onclick="carregarBibliotecaModelos()" class="btn-ata" style="margin-top: 15px; width: auto;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function renderizarModelos(modelos, filtro = 'todos') {
    const grid = document.getElementById('biblioteca-grid');
    
    if (!modelos || modelos.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                <div style="font-size: 4em; margin-bottom: 15px;">📭</div>
                <h4 style="color: #666;">Nenhum modelo encontrado</h4>
                <p style="color: #999;">Crie seu primeiro modelo personalizado no Módulo 3</p>
            </div>
        `;
        return;
    }
    
    // Filtrar modelos
    let modelosFiltrados = modelos;
    if (filtro === 'nativos') {
        modelosFiltrados = modelos.filter(m => m.tipo === 'nativo');
    } else if (filtro === 'customizados') {
        modelosFiltrados = modelos.filter(m => m.tipo === 'customizado');
    }
    
    if (modelosFiltrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                <div style="font-size: 4em; margin-bottom: 15px;">🔍</div>
                <h4 style="color: #666;">Nenhum modelo ${filtro}</h4>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = modelosFiltrados.map(modelo => `
        <div class="modelo-card" data-tipo="${modelo.tipo}">
            <div class="modelo-card-header">
                <div class="modelo-icon-big">${modelo.icone || '📄'}</div>
                <div class="modelo-card-title">
                    <h4>${modelo.nome}</h4>
                    <span class="modelo-tipo-badge ${modelo.tipo}">${modelo.tipo}</span>
                </div>
            </div>
            <p class="modelo-card-description">${modelo.descricao}</p>
            ${modelo.criado_em ? `<small style="color: #999; display: block; margin-bottom: 10px;">Criado em: ${new Date(modelo.criado_em).toLocaleDateString('pt-BR')}</small>` : ''}
            <div class="modelo-card-footer">
                <button class="btn-ver-template" onclick="verPreviewModelo('${modelo.id}')">
                    👁️ Ver
                </button>
                <button class="btn-usar-template" onclick="usarModeloDaBiblioteca('${modelo.id}')">
                    ✨ Usar
                </button>
                ${modelo.tipo === 'customizado' ? `
                    <button class="btn-deletar-template" onclick="deletarModelo('${modelo.id}')" title="Deletar modelo">
                        🗑️
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function filtrarModelos(filtro) {
    // Atualizar botões ativos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filtro) {
            btn.classList.add('active');
        }
    });
    
    renderizarModelos(modelosDisponiveis, filtro);
}

async function verPreviewModelo(modeloId) {
    try {
        showStatus('📄 Carregando preview...', 'info');
        
        const response = await fetch(`${API_ENDPOINTS.geracao_ata.replace('/gerar-ata', '')}/template/${modeloId}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar template');
        }
        
        const data = await response.json();
        
        // Criar modal de preview
        const modal = document.createElement('div');
        modal.className = 'modal-preview-modelo';
        modal.innerHTML = `
            <div class="modal-preview-content">
                <div class="modal-preview-header">
                    <h3>👁️ Preview: ${modeloId}</h3>
                    <button class="btn-close-modal" onclick="fecharPreviewModal()">✕</button>
                </div>
                <div class="modal-preview-body">
                    <iframe id="modal-preview-frame" style="width: 100%; height: 100%; border: none; border-radius: 8px;"></iframe>
                </div>
                <div class="modal-preview-footer">
                    <button class="btn-secondary" onclick="fecharPreviewModal()">Fechar</button>
                    <button class="btn-ata" onclick="usarModeloDaBiblioteca('${modeloId}'); fecharPreviewModal();" style="width: auto; padding: 12px 30px;">
                        ✨ Usar Este Modelo
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.style.display = 'block', 10);
        
        // Preencher iframe com dados de exemplo
        const iframe = document.getElementById('modal-preview-frame');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Gerar HTML de preview com dados de exemplo
        let htmlPreview = data.template_html;
        const dadosExemplo = gerarDadosExemplo();
        
        for (const [campo, valor] of Object.entries(dadosExemplo)) {
            const regex = new RegExp(`\\{\\{${campo}\\}\\}`, 'g');
            htmlPreview = htmlPreview.replace(regex, valor);
        }
        
        // Substituir placeholders restantes
        htmlPreview = htmlPreview.replace(/\{\{[^}]+\}\}/g, '<em style="color: #999;">[Campo não preenchido]</em>');
        
        iframeDoc.open();
        iframeDoc.write(htmlPreview);
        iframeDoc.close();
        
        showStatus('✅ Preview carregado', 'success');
        
    } catch (error) {
        console.error('Erro ao carregar preview:', error);
        showStatus('❌ Erro ao carregar preview: ' + error.message, 'error');
    }
}

function fecharPreviewModal() {
    const modal = document.querySelector('.modal-preview-modelo');
    if (modal) {
        modal.style.display = 'none';
        setTimeout(() => modal.remove(), 300);
    }
}

function usarModeloDaBiblioteca(modeloId) {
    // Selecionar o modelo no dropdown
    const select = document.getElementById('tipo_ata_escolha');
    if (select) {
        select.value = modeloId;
        
        // Scroll até o seletor
        select.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight temporário
        select.style.boxShadow = '0 0 0 4px rgba(26, 107, 101, 0.3)';
        setTimeout(() => {
            select.style.boxShadow = '';
        }, 2000);
        
        showStatus(`✅ Modelo "${modeloId}" selecionado! Agora você pode gerar a ata.`, 'success');
    }
    
    // Fechar biblioteca
    document.getElementById('biblioteca-modelos-container').style.display = 'none';
}

async function deletarModelo(modeloId) {
    if (!confirm(`Tem certeza que deseja deletar o modelo "${modeloId}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        showStatus('🗑️ Deletando modelo...', 'info');
        
        const response = await fetch(`${API_ENDPOINTS.geracao_ata.replace('/gerar-ata', '')}/deletar-template/${modeloId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao deletar');
        }
        
        showStatus('✅ Modelo deletado com sucesso!', 'success');
        
        // Recarregar biblioteca
        await carregarBibliotecaModelos();
        
        // Atualizar dropdown de modelos
        await carregarModelosDisponiveis();
        
    } catch (error) {
        console.error('Erro ao deletar:', error);
        showStatus('❌ Erro ao deletar: ' + error.message, 'error');
    }
}

// ============================================
// CURADORIA DO TEMPLATE
// ============================================
function mostrarCuradoria(resultado) {
    console.log('🎨 Abrindo curadoria do modelo:', resultado);
    
    modeloEmCuradoria = resultado;
    camposEditadosCuradoria = {};
    
    // Esconder outros elementos
    document.getElementById('metodo-criacao-novo').style.display = 'none';
    document.getElementById('form-via-prompt-novo').style.display = 'none';
    document.getElementById('form-via-pdf-novo').style.display = 'none';
    document.getElementById('resultado-modelo-novo').style.display = 'none';
    
    // Mostrar curadoria
    document.getElementById('curadoria-template-novo').style.display = 'block';
    
    // Preencher dados
    document.getElementById('curadoria-nome-modelo').value = resultado.nome_modelo || '';
    document.getElementById('curadoria-descricao').value = resultado.descricao || '';
    
    // Extrair campos do template
    const campos = extrairCamposTemplate(resultado.template_html || '');
    
    // Renderizar badges de campos
    const badgesContainer = document.getElementById('curadoria-campos-badges');
    badgesContainer.innerHTML = campos.map(campo => 
        `<span class="campo-badge">${campo}</span>`
    ).join('');
    
    // Renderizar campos editáveis
    const camposEditaveisContainer = document.getElementById('curadoria-campos-editaveis');
    camposEditaveisContainer.innerHTML = campos.map(campo => `
        <div class="campo-curadoria-item">
            <strong style="min-width: 120px; color: #666;">{{${campo}}}</strong>
            <input 
                type="text" 
                id="campo_${campo}"
                value="${campo}"
                placeholder="Renomear placeholder"
                onchange="atualizarCampoCuradoria('${campo}', this.value)"
            >
            <button class="btn-remover-campo" onclick="removerCampoCuradoria('${campo}')" title="Remover campo">
                🗑️
            </button>
        </div>
    `).join('');
    
    // Atualizar estatísticas
    document.getElementById('stat-campos-total').textContent = campos.length;
    document.getElementById('stat-html-size').textContent = ((resultado.template_html?.length || 0) / 1024).toFixed(2);
    
    // Atualizar preview
    atualizarPreviewCuradoria();
    
    // Scroll suave
    setTimeout(() => {
        document.getElementById('curadoria-template-novo').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

function atualizarPreviewCuradoria() {
    if (!modeloEmCuradoria) return;
    
    const iframe = document.getElementById('curadoria-preview-frame');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    let htmlPreview = modeloEmCuradoria.template_html || '';
    
    // Aplicar campos editados
    for (const [campoOriginal, campoNovo] of Object.entries(camposEditadosCuradoria)) {
        const regexOriginal = new RegExp(`\\{\\{${campoOriginal}\\}\\}`, 'g');
        htmlPreview = htmlPreview.replace(regexOriginal, `{{${campoNovo}}}`);
    }
    
    // Preencher com dados de exemplo
    const dadosExemplo = gerarDadosExemplo();
    for (const [campo, valor] of Object.entries(dadosExemplo)) {
        const regex = new RegExp(`\\{\\{${campo}\\}\\}`, 'g');
        htmlPreview = htmlPreview.replace(regex, valor);
    }
    
    // Substituir placeholders restantes
    htmlPreview = htmlPreview.replace(/\{\{([^}]+)\}\}/g, '<em style="background: #fff3cd; padding: 2px 6px; border-radius: 4px;">[$1]</em>');
    
    iframeDoc.open();
    iframeDoc.write(htmlPreview);
    iframeDoc.close();
    
    showStatus('🔄 Preview atualizado', 'info');
}

function atualizarCampoCuradoria(campoOriginal, novoNome) {
    if (novoNome && novoNome !== campoOriginal) {
        camposEditadosCuradoria[campoOriginal] = novoNome;
        console.log('Campo atualizado:', campoOriginal, '->', novoNome);
    } else {
        delete camposEditadosCuradoria[campoOriginal];
    }
}

function removerCampoCuradoria(campo) {
    if (!confirm(`Remover o campo "{{${campo}}}" do template?`)) {
        return;
    }
    
    // Remover o HTML do campo editável da interface
    const campoElement = document.getElementById(`campo_${campo}`)?.closest('.campo-curadoria-item');
    if (campoElement) {
        campoElement.remove();
    }
    
    // Remover do template HTML
    if (modeloEmCuradoria && modeloEmCuradoria.template_html) {
        const regex = new RegExp(`\\{\\{${campo}\\}\\}`, 'g');
        modeloEmCuradoria.template_html = modeloEmCuradoria.template_html.replace(regex, '');
    }
    
    // Atualizar estatísticas
    const camposRestantes = extrairCamposTemplate(modeloEmCuradoria.template_html);
    document.getElementById('stat-campos-total').textContent = camposRestantes.length;
    
    atualizarPreviewCuradoria();
    showStatus(`🗑️ Campo "{{${campo}}}" removido`, 'info');
}

function cancelarCuradoria() {
    if (confirm('Descartar todas as alterações e voltar?')) {
        modeloEmCuradoria = null;
        camposEditadosCuradoria = {};
        
        document.getElementById('curadoria-template-novo').style.display = 'none';
        voltarSelecaoMetodoNovo();
    }
}

function voltarParaResultado() {
    document.getElementById('curadoria-template-novo').style.display = 'none';
    document.getElementById('resultado-modelo-novo').style.display = 'block';
}

async function salvarTemplateNoServidor() {
    if (!modeloEmCuradoria) {
        showStatus('❌ Nenhum modelo para salvar', 'error');
        return;
    }
    
    const nomeModelo = document.getElementById('curadoria-nome-modelo').value.trim();
    const descricao = document.getElementById('curadoria-descricao').value.trim();
    
    if (!nomeModelo) {
        showStatus('⚠️ Por favor, informe o nome do modelo', 'warning');
        document.getElementById('curadoria-nome-modelo').focus();
        return;
    }
    
    try {
        const btnSalvar = document.getElementById('btn-salvar-template');
        btnSalvar.disabled = true;
        btnSalvar.textContent = '💾 Salvando...';
        
        showStatus('💾 Salvando template no servidor...', 'info');
        
        // Aplicar campos editados ao HTML
        let htmlFinal = modeloEmCuradoria.template_html;
        for (const [campoOriginal, campoNovo] of Object.entries(camposEditadosCuradoria)) {
            const regex = new RegExp(`\\{\\{${campoOriginal}\\}\\}`, 'g');
            htmlFinal = htmlFinal.replace(regex, `{{${campoNovo}}}`);
        }
        
        // Gerar ID único e nome do arquivo
        const timestamp = Date.now();
        const modeloId = `custom_${nomeModelo.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}`;
        const nomeArquivo = `${modeloId}.html`;
        
        // Preparar payload
        const payload = {
            modelo_id: modeloId,
            nome_modelo: nomeModelo,
            nome_arquivo: nomeArquivo,
            template_html: htmlFinal,
            campos: extrairCamposTemplate(htmlFinal),
            tipo: 'customizado',
            criado_em: new Date().toISOString(),
            criado_via: modeloEmCuradoria.criado_via || 'prompt',
            descricao_original: descricao || modeloEmCuradoria.descricao || ''
        };
        
        console.log('📤 Enviando para servidor:', payload);
        
        // Chamar API de salvamento
        const response = await fetch(API_ENDPOINTS.geracao_ata.replace('/gerar-ata', '/salvar-template'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao salvar template');
        }
        
        const resultado = await response.json();
        
        console.log('✅ Template salvo:', resultado);
        
        showStatus('✅ Template salvo com sucesso no servidor!', 'success');
        showStatus('🎉 Modelo já está disponível para uso!', 'info');
        
        // Atualizar lista de modelos
        await carregarModelosDisponiveis();
        
        // Limpar estados
        modeloEmCuradoria = null;
        camposEditadosCuradoria = {};
        
        // Voltar para o início do módulo 3
        setTimeout(() => {
            document.getElementById('curadoria-template-novo').style.display = 'none';
            voltarSelecaoMetodoNovo();
            
            // Ir para aba do Módulo 2
            const tab2 = document.querySelectorAll('.tab-ata')[1];
            if (tab2) {
                openTab({currentTarget: tab2}, 'modulo2');
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erro ao salvar template:', error);
        showStatus('❌ Erro ao salvar: ' + error.message, 'error');
        
        const btnSalvar = document.getElementById('btn-salvar-template');
        btnSalvar.disabled = false;
        btnSalvar.textContent = '💾 Salvar Template no Servidor';
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function gerarDadosExemplo() {
    return {
        // Comuns
        "data": new Date().toLocaleDateString('pt-BR'),
        "hora": "14:00",
        "hora_inicio": "14:00",
        "hora_termino": "16:30",
        "hora_encerramento": "16:30",
        "local": "Sala de Reuniões - 3º Andar",
        "data_geracao": new Date().toLocaleString('pt-BR'),
        
        // Reunião de Trabalho
        "empresa": "Empresa Exemplo S.A.",
        "participantes": "<li>João Silva - Gerente</li><li>Maria Santos - Analista</li><li>Pedro Costa - Dev</li>",
        "pauta": "<p>1. Revisão do projeto</p><p>2. Planejamento do sprint</p><p>3. Definição de prioridades</p>",
        "discussoes": "<p>A equipe discutiu o andamento do projeto e identificou gargalos.</p>",
        "decisoes": "<li>Aumentar orçamento em 15%</li><li>Contratar 2 devs</li><li>Estender prazo em 1 mês</li>",
        "acoes": "<div class='action-item'><strong>Ação:</strong> Revisar docs<br><span class='responsible'>Responsável: João Silva</span><br><span class='deadline'>Prazo: 20/01/2025</span></div>",
        "proximos_passos": "<p>Próxima reunião: 22/01/2025. Todos devem revisar documentos.</p>",
        "responsavel_ata": "Maria Santos",
        "aprovador": "João Silva",
        
        // Judiciária
        "tribunal": "Tribunal Regional Federal da 1ª Região",
        "numero_processo": "0001234-56.2024.4.01.0000",
        "presidente": "Des. José da Silva",
        "desembargadores": "<p>Des. Maria Oliveira</p><p>Des. Carlos Santos</p>",
        "secretario": "Ana Paula Costa",
        "partes_advogados": "<tr><td>Autor</td><td>João Silva</td><td>Dr. Pedro</td><td>OAB/SP 123456</td></tr>",
        "relatorio": "<p>Trata-se de ação...</p>",
        "sustentacoes": "<p>O advogado sustentou...</p>",
        "votos": "<div class='voto'><span class='magistrado'>Des. José:</span> Voto pelo provimento...</div>",
        "decisao": "Recurso Provido por Unanimidade",
        "votacao": "3 x 0",
        
        // Condomínio
        "nome_condominio": "Edifício Exemplo",
        "cnpj": "12.345.678/0001-90",
        "tipo_reuniao": "ASSEMBLEIA ORDINÁRIA",
        "convocacao": "Edital publicado em 01/01/2025",
        "percentual_quorum": "75",
        "fracoes_presentes": "45",
        "fracoes_totais": "60",
        "sindico": "João Silva",
        
        // Assembleia
        "nome_empresa": "Empresa Exemplo Ltda",
        "tipo_assembleia": "ASSEMBLEIA GERAL ORDINÁRIA",
        "presidente": "João Silva",
        "percentual_capital": "85",
        "acionistas_presentes": "42"
    };
}

// ============================================
// MODIFICAR FUNÇÕES EXISTENTES
// ============================================

// Modificar processarPromptModeloNovo (linha ~1250)
// Trocar a chamada mostrarResultadoModelo por mostrarCuradoria
async function processarPromptModeloNovo(event) {
    event.preventDefault();
    
    const nomeModelo = document.getElementById('nome_modelo_prompt_novo').value;
    const descricao = document.getElementById('descricao_modelo_novo').value;
    
    if (!nomeModelo || !descricao) {
        showStatus('⚠️ Preencha todos os campos', 'warning');
        return;
    }
    
    try {
        mostrarLoadingNovo('🤖 A IA está criando seu modelo...');
        
        const payload = {
            nome_modelo: nomeModelo,
            descricao: descricao,
            timestamp: new Date().toISOString(),
            criado_via: 'prompt'  // Adicionar isto
        };
        
        console.log('📤 Enviando para IA:', payload);
        
        const response = await fetch(API_ENDPOINTS.novo_modelo_prompt, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao processar com IA');
        }
        
        const resultado = await response.json();
        modeloGeradoNovo = resultado;
        
        console.log('✅ Modelo gerado:', resultado);
        
        esconderLoadingNovo();
        
        // ✅ MUDANÇA: Chamar curadoria em vez de mostrarResultadoModelo
        mostrarCuradoria(resultado);
        
        showStatus('✅ Modelo gerado! Revise antes de salvar.', 'success');
        
    } catch (error) {
        esconderLoadingNovo();
        console.error('❌ Erro:', error);
        showStatus('❌ Erro ao gerar modelo: ' + error.message, 'error');
    }
}

// Modificar processarPDFModeloNovo também (linha ~1350)
async function processarPDFModeloNovo(event) {
    event.preventDefault();
    
    const nomeModelo = document.getElementById('nome_modelo_pdf_novo').value;
    
    if (!nomeModelo || !pdfArquivoNovo) {
        showStatus('⚠️ Preencha todos os campos e envie o PDF', 'warning');
        return;
    }
    
    try {
        mostrarLoadingNovo('📄 Analisando PDF com IA...<br><small style="opacity: 0.8;">Isso pode levar alguns minutos</small>');
        
        const base64PDF = await fileToBase64(pdfArquivoNovo);
        
        const payload = {
            nome_modelo: nomeModelo,
            pdf_base64: base64PDF,
            nome_arquivo: pdfArquivoNovo.name,
            tamanho_mb: (pdfArquivoNovo.size / (1024 * 1024)).toFixed(2),
            timestamp: new Date().toISOString(),
            criado_via: 'pdf'  // Adicionar isto
        };
        
        console.log('📤 Enviando PDF:', {
            nome: nomeModelo,
            arquivo: pdfArquivoNovo.name
        });
        
        const response = await fetch(API_ENDPOINTS.novo_modelo_pdf, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Erro ao processar PDF');
        }
        
        const resultado = await response.json();
        modeloGeradoNovo = resultado;
        
        console.log('✅ PDF analisado:', resultado);
        
        esconderLoadingNovo();
        
        // ✅ MUDANÇA: Chamar curadoria em vez de mostrarResultadoModelo
        mostrarCuradoria(resultado);
        
        showStatus('✅ PDF analisado! Revise antes de salvar.', 'success');
        
    } catch (error) {
        esconderLoadingNovo();
        console.error('❌ Erro:', error);
        showStatus('❌ Erro ao processar PDF: ' + error.message, 'error');
    }
}

// Modificar a função existente usarModeloGerado
// Esta função agora não é mais necessária da forma antiga
// Mas vamos mantê-la para compatibilidade, redirecionando para curadoria
function usarModeloGerado() {
    if (!modeloGeradoNovo) {
        showStatus('❌ Nenhum modelo disponível', 'error');
        return;
    }
    
    // Redirecionar para curadoria
    mostrarCuradoria(modeloGeradoNovo);
}