// URLs das APIs
const API_ENDPOINTS = {
    template: '/iata/template',
    preview: '/iata/preview-template'
};

// Estado global
let currentTemplate = {
    html: '',
    css: '',
    tipo: '',
    campos: []
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Editor de Templates carregado');
    
    // Auto-atualizar preview ao digitar (com debounce)
    let debounceTimer;
    document.getElementById('html-textarea').addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            detectarCampos();
        }, 1000);
    });
});

// ============================================
// CARREGAR TEMPLATE BASE
// ============================================
async function carregarTemplateBase() {
    const tipoBase = document.getElementById('template-base').value;
    
    if (!tipoBase) return;
    
    if (tipoBase === 'novo') {
        // Template em branco
        currentTemplate.html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Novo Template</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 40px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{titulo}}</h1>
        <p>{{data}}</p>
    </div>
    
    <div class="content">
        <p>{{conteudo}}</p>
    </div>
</body>
</html>`;
        
        currentTemplate.tipo = 'novo';
        document.getElementById('html-textarea').value = currentTemplate.html;
        detectarCampos();
        showStatus('✨ Template em branco criado', 'success');
        return;
    }
    
    try {
        showStatus('📥 Carregando template...', 'info');
        
        const response = await fetch(`${API_ENDPOINTS.template}/${tipoBase}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar template');
        }
        
        const data = await response.json();
        currentTemplate.html = data.template_html;
        currentTemplate.tipo = tipoBase;
        
        document.getElementById('html-textarea').value = currentTemplate.html;
        
        detectarCampos();
        showStatus(`✅ Template "${tipoBase}" carregado!`, 'success');
        
    } catch (error) {
        console.error('Erro:', error);
        showStatus('❌ Erro ao carregar template: ' + error.message, 'error');
    }
}

// ============================================
// DETECTAR CAMPOS NO TEMPLATE
// ============================================
function detectarCampos() {
    const htmlContent = document.getElementById('html-textarea').value;
    
    // Extrair todos os placeholders {{campo}}
    const regex = /\{\{([^}]+)\}\}/g;
    const campos = [];
    let match;
    
    while ((match = regex.exec(htmlContent)) !== null) {
        const campo = match[1].trim();
        if (!campos.includes(campo)) {
            campos.push(campo);
        }
    }
    
    currentTemplate.campos = campos;
    
    if (campos.length > 0) {
        // Mostrar campos detectados
        const camposDiv = document.getElementById('campos-detectados');
        const listaCampos = document.getElementById('lista-campos');
        
        listaCampos.innerHTML = campos
            .map(campo => `<span class="campo-tag">${campo}</span>`)
            .join('');
        
        camposDiv.style.display = 'block';
    } else {
        document.getElementById('campos-detectados').style.display = 'none';
    }
    
    return campos;
}

// ============================================
// ALTERNAR TABS DO EDITOR
// ============================================
function switchEditorTab(type) {
    // Atualizar botões
    const tabs = document.querySelectorAll('.tab-editor');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Mostrar editor correto
    if (type === 'html') {
        document.getElementById('html-editor').style.display = 'block';
        document.getElementById('css-editor').style.display = 'none';
    } else {
        document.getElementById('html-editor').style.display = 'none';
        document.getElementById('css-editor').style.display = 'block';
    }
}

// ============================================
// FORMATAR CÓDIGO
// ============================================
function formatarCodigo() {
    const htmlTextarea = document.getElementById('html-textarea');
    let html = htmlTextarea.value;
    
    // Formatação básica (adicionar quebras de linha)
    html = html
        .replace(/></g, '>\n<')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    
    // Indentação
    const formatted = [];
    let indent = 0;
    const lines = html.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        
        if (line.startsWith('</')) {
            indent = Math.max(0, indent - 1);
        }
        
        formatted.push('  '.repeat(indent) + line);
        
        if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.includes('</')) {
            indent++;
        }
    });
    
    htmlTextarea.value = formatted.join('\n');
    showStatus('✨ Código formatado!', 'success');
}

// ============================================
// INSERIR PLACEHOLDER
// ============================================
function inserirPlaceholder() {
    const nomeCampo = prompt('Nome do campo (sem espaços):');
    
    if (!nomeCampo) return;
    
    // Validar nome
    const nomeValido = nomeCampo.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    const placeholder = `{{${nomeValido}}}`;
    
    // Inserir no cursor do textarea
    const textarea = document.getElementById('html-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + placeholder + text.substring(end);
    
    // Mover cursor
    textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
    textarea.focus();
    
    detectarCampos();
    showStatus(`✅ Campo "${nomeValido}" adicionado!`, 'success');
}

// ============================================
// GERAR PREVIEW
// ============================================
async function gerarPreview() {
    const htmlContent = document.getElementById('html-textarea').value;
    const cssContent = document.getElementById('css-textarea').value;
    
    if (!htmlContent) {
        showStatus('⚠️ Adicione conteúdo HTML primeiro', 'warning');
        return;
    }
    
    try {
        showStatus('🎨 Gerando preview...', 'info');
        
        // Se houver CSS, injetar no HTML
        let htmlFinal = htmlContent;
        if (cssContent) {
            htmlFinal = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
        }
        
        const response = await fetch(API_ENDPOINTS.preview, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nome_template: currentTemplate.tipo || 'custom',
                html_content: htmlFinal,
                tipo_base: currentTemplate.tipo
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao gerar preview');
        }
        
        const data = await response.json();
        
        // Renderizar no iframe
        const iframe = document.getElementById('preview-frame');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(data.html_preview);
        iframeDoc.close();
        
        showStatus('✅ Preview gerado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro:', error);
        showStatus('❌ Erro ao gerar preview: ' + error.message, 'error');
    }
}

// Atalho para atualizar preview
function atualizarPreview() {
    gerarPreview();
}

// ============================================
// TOGGLE FULLSCREEN
// ============================================
function toggleFullscreen() {
    const previewContainer = document.querySelector('.preview-container');
    previewContainer.classList.toggle('fullscreen');
    
    const button = event.target;
    button.textContent = previewContainer.classList.contains('fullscreen') ? '❌ Sair' : '🔲 Tela Cheia';
}

// ============================================
// BAIXAR TEMPLATE HTML
// ============================================
function baixarTemplate() {
    const htmlContent = document.getElementById('html-textarea').value;
    const cssContent = document.getElementById('css-textarea').value;
    
    if (!htmlContent) {
        showStatus('⚠️ Adicione conteúdo HTML primeiro', 'warning');
        return;
    }
    
    // Se houver CSS, injetar no HTML
    let htmlFinal = htmlContent;
    if (cssContent) {
        htmlFinal = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
    }
    
    // Criar blob e download
    const blob = new Blob([htmlFinal], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${currentTemplate.tipo || 'custom'}_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showStatus('✅ Template baixado!', 'success');
}

// ============================================
// RESETAR EDITOR
// ============================================
function resetarEditor() {
    if (!confirm('Deseja realmente limpar o editor? Todas as alterações serão perdidas.')) {
        return;
    }
    
    document.getElementById('template-base').value = '';
    document.getElementById('html-textarea').value = '';
    document.getElementById('css-textarea').value = '';
    document.getElementById('campos-detectados').style.display = 'none';
    
    const iframe = document.getElementById('preview-frame');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write('<html><body><p style="text-align: center; padding: 50px; color: #999;">Preview aparecerá aqui</p></body></html>');
    iframeDoc.close();
    
    currentTemplate = { html: '', css: '', tipo: '', campos: [] };
    
    showStatus('🔄 Editor limpo', 'info');
}

// ============================================
// MODAL DE AJUDA
// ============================================
function abrirModal() {
    document.getElementById('modal-ajuda').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-ajuda').style.display = 'none';
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modal-ajuda');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// ============================================
// MENSAGENS DE STATUS
// ============================================
function showStatus(message, type) {
    // Remover mensagens antigas
    const existingStatus = document.querySelector('.status-toast');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // Criar nova mensagem
    const toast = document.createElement('div');
    toast.className = `status-toast status-${type}`;
    toast.textContent = message;
    
    // Estilos inline
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: 'bold',
        zIndex: '10000',
        animation: 'slideInRight 0.3s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    });
    
    // Cores por tipo
    const colors = {
        'success': '#28a745',
        'error': '#dc3545',
        'warning': '#ffc107',
        'info': '#17a2b8'
    };
    
    toast.style.background = colors[type] || colors.info;
    
    document.body.appendChild(toast);
    
    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);