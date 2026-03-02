from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, Dict, Any, Union
import httpx
import logging
import json
import os
from pathlib import Path
from datetime import datetime

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Caminho para os templates de ata
TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "ata_templates"
# Caminho para metadados dos templates
METADATA_FILE = TEMPLATES_DIR / "_templates_metadata.json"

# Mapeamento de tipos de ata para arquivos de template
TEMPLATE_FILES = {
    "reuniao_trabalho": "template_reuniao_trabalho.html",
    "sessao_judiciaria": "template_sessao_judiciaria.html",
    "reuniao_condominio": "template_reuniao_condominio.html",
    "assembleia_geral": "template_assembleia_geral.html",
}

# DEV
#N8N_ENDPOINTS = {
    # MÓDULO 1 - Transcrição de Áudio
    # "transcricao": "http://157.173.125.173:5678/webhook/ba0a6979-510d-42f0-9328-0ec03e93e100",
    
    # MÓDULO 2 - Geração de Ata
    #"geracao_ata": "http://157.173.125.173:5678/webhook/0ba5cfa6-5dd1-46c8-b9d8-68f26f267fef",
    
    # MÓDULO 3 - Criação de Novo Modelo (futuro)
    # Adicionar no dicionário 157.173.125.173_ENDPOINTS:
    #"novo_modelo_prompt": "http://157.173.125.173:5678/webhook/b6866ad7-195c-478f-bd57-3bec769aee9f",
    #"novo_modelo_pdf": "http://157.173.125.173:5678/webhook/novo-modelo-pdf",
#}

# PROD
N8N_ENDPOINTS = {
    # MÓDULO 1 - Transcrição de Áudio
    "transcricao": "http://N8N:5678/webhook/ba0a6979-510d-42f0-9328-0ec03e93e100",
    
    # MÓDULO 2 - Geração de Ata
    "geracao_ata": "http://N8N:5678/webhook/0ba5cfa6-5dd1-46c8-b9d8-68f26f267fef",
    
    # MÓDULO 3 - Criação de Novo Modelo (futuro)
    # Adicionar no dicionário N8N_ENDPOINTS:
    "novo_modelo_prompt": "http://N8N:5678/webhook/b6866ad7-195c-478f-bd57-3bec769aee9f",
    "novo_modelo_pdf": "http://N8N:5678/webhook/novo-modelo-pdf",
}

# ====================================================================================
# MODELOS PYDANTIC
# ====================================================================================

# Modelo para requisição de geração de ata (MÓDULO 2)
class GeracaoAtaRequest(BaseModel):
    transcricao: str
    tipo_ata: str  # "reuniao_trabalho" ou "sessao_judiciaria", etc
    template_html: str  # Template HTML enviado do frontend
    informacoes_adicionais: Optional[str] = ""
    metadata: Optional[Dict[Any, Any]] = {}

# Modelo para requisição de novo modelo (MÓDULO 3 - futuro)
class NovoModeloRequest(BaseModel):
    pdf_base64: str
    nome_modelo: str
    descricao: Optional[str] = ""
    secoes_customizadas: Optional[Dict[Any, Any]] = {}

# Modelo para salvar/testar template customizado
class TemplateCustomRequest(BaseModel):
    nome_template: str
    html_content: str
    tipo_base: str  # Tipo base usado como referência

# ====================================================================================
# FUNÇÕES AUXILIARES
# ====================================================================================

def normalizar_resposta_transcricao(resposta: Any) -> Dict[str, Any]:
    """
    Normaliza diferentes formatos de resposta de transcrição para um formato padrão
    """
    transcricao = ""
    
    # Formato 1: Resposta do Gemini
    if isinstance(resposta, dict):
        if "content" in resposta and "parts" in resposta["content"]:
            if isinstance(resposta["content"]["parts"], list) and len(resposta["content"]["parts"]) > 0:
                transcricao = resposta["content"]["parts"][0].get("text", "")
        
        # Formato 2: Resposta do Whisper/OpenAI
        elif "text" in resposta:
            transcricao = resposta["text"]
        
        # Formato 3: Formato já normalizado
        elif "transcricao" in resposta:
            transcricao = resposta["transcricao"]
    
    # Formato 4: String direta
    elif isinstance(resposta, str):
        transcricao = resposta
    
    # Se não conseguiu extrair, retornar resposta original
    if not transcricao:
        logger.warning("Não foi possível normalizar a transcrição. Retornando formato original.")
        transcricao = json.dumps(resposta) if isinstance(resposta, dict) else str(resposta)
    
    # Retornar formato normalizado
    resultado_normalizado = {
        "transcricao": transcricao,
        "palavras": len(transcricao.split()),
        "caracteres": len(transcricao),
        "original_response": resposta  # Manter resposta original para debug
    }
    
    # Adicionar campos extras se existirem
    if isinstance(resposta, dict):
        if "duracao_audio" in resposta:
            resultado_normalizado["duracao_audio"] = resposta["duracao_audio"]
        if "duration" in resposta:
            resultado_normalizado["duracao_audio"] = resposta["duration"]
        if "confianca" in resposta:
            resultado_normalizado["confianca"] = resposta["confianca"]
        if "confidence" in resposta:
            resultado_normalizado["confianca"] = resposta["confidence"]
    
    return resultado_normalizado

# ====================================================================================
# MÓDULO 1: TRANSCRIÇÃO DE ÁUDIO
# ====================================================================================
@router.post("/transcricao")
async def processar_transcricao(
    audio: UploadFile = File(...),
    tipo_entrada: str = Form(...),  # "arquivo" ou "gravacao"
    informacoes_adicionais: str = Form(""),
):
    """
    Processa áudio enviado pelo usuário e transcreve usando IA do N8N
    """
    logger.info("================= PROCESSANDO TRANSCRIÇÃO =================")
    logger.info(f"Arquivo recebido: {audio.filename}")
    logger.info(f"Tipo de conteúdo: {audio.content_type}")
    logger.info(f"Tipo de entrada: {tipo_entrada}")
    logger.info(f"Informações adicionais: {informacoes_adicionais}")
    
    # Validar tipo de arquivo
    FORMATOS_ACEITOS = [
        'audio/mpeg',      # MP3
        'audio/mp3',       # MP3 alternativo
        'audio/wav',       # WAV
        'audio/wave',      # WAV alternativo
        'audio/x-wav',     # WAV alternativo
        'audio/ogg',       # OGG
        'audio/webm',      # WEBM
        'audio/m4a',       # M4A
        'audio/mp4',       # M4A/MP4
        'audio/x-m4a',     # M4A alternativo
        'audio/flac',      # FLAC
        'audio/x-flac',    # FLAC alternativo
        'audio/aac',       # AAC
        'audio/aacp',      # AAC alternativo
    ]
    
    if audio.content_type not in FORMATOS_ACEITOS and not audio.content_type.startswith('audio/'):
        raise HTTPException(
            status_code=400,
            detail=f"Formato de áudio não suportado: {audio.content_type}. " + 
                   f"Formatos aceitos: MP3, WAV, OGG, M4A, WEBM, FLAC, AAC"
        )
    
    try:
        # Ler o conteúdo do áudio
        audio_bytes = await audio.read()
        audio_size_mb = len(audio_bytes) / (1024 * 1024)
        
        logger.info(f"Tamanho do áudio: {audio_size_mb:.2f} MB")
        
        # Verificar tamanho máximo (50MB)
        if audio_size_mb > 50:
            raise HTTPException(
                status_code=400,
                detail="O arquivo de áudio é muito grande. Tamanho máximo: 50MB"
            )
        
        # Preparar FormData para enviar arquivo binário diretamente
        files = {
            'audio': (audio.filename, audio_bytes, audio.content_type)
        }
        
        data = {
            "tipo_entrada": tipo_entrada,
            "informacoes_adicionais": informacoes_adicionais,
            "tamanho_mb": str(audio_size_mb)
        }
        
        # Timeout maior para transcrição de áudios longos
        timeout = 300.0 if audio_size_mb > 10 else 180.0
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            logger.info(f"Enviando áudio para N8N: {N8N_ENDPOINTS['transcricao']}")
            logger.info(f"Timeout configurado: {timeout}s")
            logger.info(f"Enviando arquivo binário: {audio.filename} ({audio_size_mb:.2f}MB)")
            
            response = await client.post(
                N8N_ENDPOINTS['transcricao'],
                files=files,
                data=data
            )
            
            response.raise_for_status()
            
            logger.info(f"Resposta do N8N recebida (Status: {response.status_code})")
            
            n8n_response = response.json()
            logger.info("================= RESPOSTA DO N8N =================")
            logger.info(f"Conteúdo: {json.dumps(n8n_response, indent=2, ensure_ascii=False)[:500]}...")
            logger.info("===================================================")
            
            # Se N8N retornar uma lista, pegar o primeiro elemento
            if isinstance(n8n_response, list) and len(n8n_response) > 0:
                logger.info("N8N retornou lista. Extraindo primeiro elemento...")
                n8n_response = n8n_response[0]
            
            # Normalizar resposta para formato padrão
            response_normalizada = normalizar_resposta_transcricao(n8n_response)
            
            return response_normalizada
            
    except httpx.RequestError as e:
        logger.error(f"ERRO DE CONEXÃO com N8N: {e}")
        raise HTTPException(
            status_code=503,
            detail="Não foi possível conectar ao serviço de IA para transcrever o áudio."
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"N8N retornou erro HTTP: {e.response.status_code}")
        logger.error(f"Resposta: {e.response.text}")
        raise HTTPException(
            status_code=502,
            detail="O serviço de IA retornou uma resposta inválida."
        )
    except httpx.TimeoutException as e:
        logger.error(f"Timeout na transcrição: {e}")
        raise HTTPException(
            status_code=504,
            detail="A transcrição está demorando muito. Tente com um áudio menor ou tente novamente."
        )
    except Exception as e:
        logger.error(f"Erro inesperado: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao processar a transcrição."
        )

# ====================================================================================
# MÓDULO 2: GERAÇÃO DE ATA
# ====================================================================================
@router.post("/gerar-ata")
async def gerar_ata(request_data: GeracaoAtaRequest):
    """
    MÓDULO 2: Geração de Ata
    """
    logger.info("================= MÓDULO 2: GERAÇÃO DE ATA =================")
    logger.info(f"Tipo de ata: {request_data.tipo_ata}")
    logger.info(f"Tamanho da transcrição: {len(request_data.transcricao)} caracteres")
    
    n8n_payload = {
        "transcricao": request_data.transcricao,
        "tipo_ata": request_data.tipo_ata,
        "template_html": request_data.template_html,
        "informacoes_adicionais": request_data.informacoes_adicionais,
        "metadata": request_data.metadata,
        "etapa": "geracao_ata"
    }
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "FastAPI-Mosaiko/1.0",
    }
    
    try:
        # ✅ LOGS DETALHADOS
        logger.info(f"🔵 URL de destino: {N8N_ENDPOINTS['geracao_ata']}")
        logger.info(f"🔵 Headers: {headers}")
        logger.info(f"🔵 Payload keys: {list(n8n_payload.keys())}")
        logger.info(f"🔵 Tamanho do template: {len(request_data.template_html)} chars")
        
        async with httpx.AsyncClient(timeout=180.0) as client:
            logger.info("🔵 Iniciando requisição POST...")
            
            response = await client.post(
                N8N_ENDPOINTS['geracao_ata'],
                json=n8n_payload,
                headers=headers
            )
            
            logger.info(f"✅ Status Code recebido: {response.status_code}")
            logger.info(f"✅ Headers da resposta: {dict(response.headers)}")
            
            # ✅ LOG DO CORPO DA RESPOSTA (mesmo com erro)
            try:
                response_text = response.text
                logger.info(f"✅ Corpo da resposta (primeiros 500 chars): {response_text[:500]}")
            except:
                logger.error("❌ Não foi possível ler o corpo da resposta")
            
            response.raise_for_status()
            
            n8n_response = response.json()
            logger.info("✅ JSON parseado com sucesso")
            
            if isinstance(n8n_response, list) and len(n8n_response) > 0:
                logger.info("N8N retornou lista. Extraindo primeiro elemento...")
                return n8n_response[0]
            
            return n8n_response
            
    except httpx.TimeoutException as e:
        logger.error(f"⏱️ TIMEOUT: {e}")
        raise HTTPException(
            status_code=504,
            detail="Timeout ao gerar ata. O N8N demorou muito para responder."
        )
            
    except httpx.HTTPStatusError as e:
        logger.error(f"❌ HTTP Error: {e.response.status_code}")
        logger.error(f"❌ URL chamada: {e.request.url}")
        logger.error(f"❌ Método: {e.request.method}")
        
        # ✅ LOG COMPLETO DO ERRO
        try:
            error_body = e.response.text
            logger.error(f"❌ Corpo do erro: {error_body}")
        except:
            logger.error("❌ Não foi possível ler o corpo do erro")
        
        # ✅ LOG DOS HEADERS DO ERRO
        logger.error(f"❌ Headers do erro: {dict(e.response.headers)}")
        
        if e.response.status_code in [502, 404]:
            raise HTTPException(
                status_code=502,
                detail=f"Webhook N8N retornou {e.response.status_code}. Verifique se o workflow está ativo."
            )
        
        raise HTTPException(
            status_code=502,
            detail=f"N8N retornou erro {e.response.status_code}: {e.response.text[:200]}"
        )
        
    except httpx.RequestError as e:
        logger.error(f"❌ ERRO DE CONEXÃO: {e}")
        logger.error(f"❌ Tipo do erro: {type(e).__name__}")
        raise HTTPException(
            status_code=503,
            detail="Não foi possível conectar ao N8N. Verifique se está rodando."
        )
        
    except Exception as e:
        logger.error(f"❌ ERRO INESPERADO: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno: {str(e)}"
        )

# ====================================================================================
# MÓDULO 3: CRIAR NOVO MODELO DE ATA (FUTURO)
# ====================================================================================
# Adicionar novas rotas:
@router.post("/novo-modelo/prompt")
async def criar_modelo_prompt(request_data: dict):
    """Criar modelo via descrição de texto"""
    async with httpx.AsyncClient(timeout=240.0) as client:
        response = await client.post(
            N8N_ENDPOINTS['novo_modelo_prompt'],
            json=request_data
        )
        response.raise_for_status()
        return response.json()

# ====================================================================================
# MÓDULO 3: CRIAR NOVO MODELO DE ATA - VIA PDF
# ====================================================================================
# ⚠️ FUNCIONALIDADE FUTURA - EM DESENVOLVIMENTO
# Esta rota está preparada mas o workflow N8N correspondente ainda não foi implementado
#
# TODO - Implementar no N8N:
# 1. Criar webhook: http://157.173.125.173:5678/webhook/novo-modelo-pdf
# 2. Node para receber PDF em base64
# 3. Node para converter base64 → arquivo PDF
# 4. Node para extrair texto do PDF (usando pdf-parse ou similar)
# 5. Node com IA (Gemini/GPT) para:
#    - Analisar estrutura do documento
#    - Identificar seções
#    - Detectar campos dinâmicos
#    - Gerar template HTML baseado no layout
# 6. Retornar JSON com: nome_modelo, template_html, campos[], descricao
# ====================================================================================
@router.post("/novo-modelo/pdf")
async def criar_modelo_pdf(request_data: dict):
    """
    🚧 EM DESENVOLVIMENTO
    Criar modelo via análise de PDF
    
    Esta rota está pronta, mas depende do workflow N8N ser implementado.
    """
    logger.warning("⚠️ ROTA /novo-modelo/pdf CHAMADA - Funcionalidade em desenvolvimento")
    logger.info(f"📄 PDF recebido: {request_data.get('nome_arquivo', 'N/A')}")
    logger.info(f"📏 Tamanho: {request_data.get('tamanho_mb', 'N/A')} MB")
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            logger.warning("🚧 Tentando chamar webhook N8N que pode não existir ainda...")
            
            response = await client.post(
                N8N_ENDPOINTS['novo_modelo_pdf'],
                json=request_data
            )
            response.raise_for_status()
            
            logger.info("✅ Resposta recebida do N8N (inesperado - workflow foi implementado!)")
            return response.json()
            
    except httpx.HTTPStatusError as e:
        logger.error(f"❌ Webhook N8N retornou erro: {e.response.status_code}")
        raise HTTPException(
            status_code=503,
            detail="Workflow N8N para análise de PDF ainda não foi implementado. Use a opção 'Descrever com IA' por enquanto."
        )
    except httpx.RequestError as e:
        logger.error(f"❌ Erro de conexão com N8N: {e}")
        raise HTTPException(
            status_code=503,
            detail="Não foi possível conectar ao serviço de análise de PDF. Funcionalidade em desenvolvimento."
        )

# ====================================================================================
# ROTA AUXILIAR: BUSCAR TEMPLATE HTML
# ====================================================================================
# REMOVA as duas funções "buscar_template" existentes e adicione esta no lugar.

@router.get("/template/{tipo_ata}")
async def buscar_template(tipo_ata: str):
    """
    Retorna o template HTML para o tipo de ata especificado.
    Suporta tanto modelos nativos quanto customizados.
    """
    logger.info(f"================= BUSCANDO TEMPLATE: {tipo_ata} =================")
    
    template_path = None
    
    try:
        # 1. Verificar se é um modelo nativo
        if tipo_ata in TEMPLATE_FILES:
            logger.info(f"Modelo '{tipo_ata}' identificado como NATIVO.")
            template_path = TEMPLATES_DIR / TEMPLATE_FILES[tipo_ata]
        else:
            # 2. Se não for nativo, verificar se é um modelo customizado
            logger.info(f"Modelo '{tipo_ata}' não é nativo. Verificando modelos customizados...")
            metadata = carregar_metadados()
            
            if tipo_ata in metadata:
                nome_arquivo = metadata[tipo_ata].get('nome_arquivo')
                if nome_arquivo:
                    logger.info(f"Modelo customizado encontrado. Arquivo: '{nome_arquivo}'")
                    template_path = TEMPLATES_DIR / nome_arquivo
                else:
                    logger.error(f"Metadados para '{tipo_ata}' estão incompletos. 'nome_arquivo' ausente.")
                    raise HTTPException(status_code=500, detail="Metadados do template corrompidos.")
            else:
                # 3. Se não for nenhum dos dois, o modelo não existe
                logger.warning(f"Modelo '{tipo_ata}' não encontrado nem nos nativos nem nos customizados.")
                raise HTTPException(status_code=404, detail=f"Modelo '{tipo_ata}' não encontrado.")
        
        # 4. Verificar se o arquivo do template realmente existe no disco
        if not template_path or not template_path.exists():
            logger.error(f"ERRO CRÍTICO: O arquivo de template não foi encontrado no caminho: {template_path}")
            raise HTTPException(
                status_code=404, # Usar 404 é mais apropriado que 500 se o arquivo sumiu
                detail=f"Arquivo do template '{template_path.name if template_path else 'N/A'}' não encontrado no servidor."
            )
        
        # 5. Ler e retornar o conteúdo do template
        with open(template_path, 'r', encoding='utf-8') as f:
            template_html = f.read()
        
        logger.info(f"Template '{template_path.name}' carregado com sucesso ({len(template_html)} caracteres).")
        
        return {
            "tipo_ata": tipo_ata,
            "template_html": template_html,
            "template_file": template_path.name
        }
        
    except HTTPException:
        # Re-lança a exceção HTTP para que o FastAPI a capture
        raise
    except Exception as e:
        logger.error(f"Erro inesperado ao carregar o template '{tipo_ata}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao carregar o template: {str(e)}"
        )

# ====================================================================================
# ROTA: PREVIEW DE TEMPLATE CUSTOMIZADO
# ====================================================================================
@router.post("/preview-template")
async def preview_template(request_data: TemplateCustomRequest):
    """
    Retorna preview do template customizado com dados de exemplo
    """
    logger.info(f"================= PREVIEW TEMPLATE: {request_data.nome_template} =================")
    
    try:
        # Dados de exemplo para preencher o template
        dados_exemplo = {
            # Comuns
            "data": "15/01/2025",
            "hora": "14:00",
            "hora_inicio": "14:00",
            "hora_termino": "16:30",
            "hora_encerramento": "16:30",
            "local": "Sala de Reuniões - 3º Andar",
            "data_geracao": datetime.now().strftime("%d/%m/%Y às %H:%M"),
            
            # Reunião de Trabalho
            "empresa": "Empresa Exemplo S.A.",
            "participantes": "<li>João Silva - Gerente de Projetos</li><li>Maria Santos - Analista</li><li>Pedro Costa - Desenvolvedor</li>",
            "pauta": "<p>1. Revisão do projeto atual</p><p>2. Planejamento do próximo sprint</p><p>3. Definição de prioridades</p>",
            "discussoes": "<p>A equipe discutiu o andamento do projeto e identificou alguns gargalos que precisam ser resolvidos.</p>",
            "decisoes": "<li>Aumentar o orçamento em 15%</li><li>Contratar mais 2 desenvolvedores</li><li>Estender o prazo em 1 mês</li>",
            "acoes": "<div class='action-item'><strong>Ação:</strong> Revisar documentação<br><span class='responsible'>Responsável: João Silva</span><br><span class='deadline'>Prazo: 20/01/2025</span></div>",
            "proximos_passos": "<p>Próxima reunião agendada para 22/01/2025. Todos devem revisar os documentos enviados.</p>",
            "responsavel_ata": "Maria Santos",
            "aprovador": "João Silva",
            
            # Sessão Judiciária
            "tribunal": "Tribunal Regional Federal da 1ª Região",
            "numero_processo": "0001234-56.2024.4.01.0000",
            "presidente": "Des. José da Silva",
            "desembargadores": "<p>Des. Maria Oliveira</p><p>Des. Carlos Santos</p>",
            "secretario": "Ana Paula Costa",
            "partes_advogados": "<tr><td>Autor</td><td>João Silva</td><td>Dr. Pedro Advogado</td><td>OAB/SP 123456</td></tr>",
            "relatorio": "<p>Trata-se de ação...</p>",
            "sustentacoes": "<p>O advogado da parte autora sustentou...</p>",
            "votos": "<div class='voto'><span class='magistrado'>Des. José da Silva:</span> Voto pelo provimento...</div>",
            "decisao": "Recurso Provido por Unanimidade",
            "votacao": "3 x 0",
            "dispositivo": "<p>Ante o exposto, dá-se provimento ao recurso...</p>",
            "data_publicacao": "16/01/2025",
            
            # Condomínio
            "nome_condominio": "Edifício Exemplo",
            "cnpj": "12.345.678/0001-90",
            "tipo_reuniao": "ASSEMBLEIA ORDINÁRIA",
            "convocacao": "Edital publicado em 01/01/2025 no quadro de avisos",
            "percentual_quorum": "75",
            "frações_presentes": "45",
            "frações_totais": "60",
            "sindico": "João Silva",
            "subsindico": "Maria Santos",
            "conselho_fiscal": "<li>Pedro Costa</li><li>Ana Paula</li><li>Carlos Souza</li>",
            "condominos_presentes": "<p>Total de 45 unidades presentes ou representadas</p>",
            "ordem_dia": "<li>Prestação de contas</li><li>Aprovação do orçamento</li><li>Obras de manutenção</li>",
            "discussoes": "<p>Foi apresentada a prestação de contas do último trimestre...</p>",
            "votacoes": "<div class='votacao'><strong>Votação 1:</strong> Aprovação do orçamento<br><span class='resultado'>APROVADO: 40 votos favor, 5 contra</span></div>",
            "decisoes": "<div class='decisao-item'>Aprovado orçamento de R$ 150.000,00 para o ano de 2025</div>",
            
            # Assembleia Geral
            "nome_empresa": "Empresa Exemplo Ltda",
            "tipo_assembleia": "ASSEMBLEIA GERAL ORDINÁRIA",
            "convocacao": "Publicado no Diário Oficial em 01/01/2025",
            "presidente": "João Silva",
            "mesarios": "<p>Vice-Presidente: Maria Santos</p>",
            "percentual_capital": "85",
            "acionistas_presentes": "42",
            "acionistas": "<p>Total de 42 acionistas representando 85% do capital social</p>",
            "deliberacoes": "<div class='deliberacao'><div class='deliberacao-titulo'>Deliberação 1:</div><p>Aprovação das demonstrações financeiras...</p></div>",
            "eleitos": "<p>Conselho de Administração: João Silva, Maria Santos, Pedro Costa</p>"
        }
        
        # Preencher template com dados de exemplo
        html_preview = request_data.html_content
        for campo, valor in dados_exemplo.items():
            placeholder = f"{{{{{campo}}}}}"
            html_preview = html_preview.replace(placeholder, valor)
        
        # Substituir placeholders não preenchidos por texto de exemplo
        import re
        placeholders_restantes = re.findall(r'\{\{([^}]+)\}\}', html_preview)
        for placeholder in placeholders_restantes:
            html_preview = html_preview.replace(f"{{{{{placeholder}}}}}", f"[{placeholder}]")
        
        return {
            "html_preview": html_preview,
            "campos_detectados": list(dados_exemplo.keys()),
            "campos_faltantes": placeholders_restantes
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar preview: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar preview: {str(e)}"
        )

# ====================================================================================
# ROTA AUXILIAR: LISTAR MODELOS DISPONÍVEIS
# ====================================================================================
@router.get("/modelos")
async def listar_modelos():
    """
    Retorna a lista de modelos de ata disponíveis
    """
    modelos = [
        {
            "id": "reuniao_trabalho",
            "nome": "Ata de Reunião de Trabalho",
            "icone": "📋",
            "descricao": "Modelo padrão para reuniões corporativas e de equipe",
            "secoes": [
                "Cabeçalho",
                "Participantes",
                "Pauta",
                "Discussões",
                "Decisões",
                "Ações e Responsáveis",
                "Próximos Passos"
            ]
        },
        {
            "id": "sessao_judiciaria",
            "nome": "Ata de Sessão Judiciária",
            "icone": "⚖️",
            "descricao": "Modelo para registros de audiências e sessões judiciais",
            "secoes": [
                "Identificação do Processo",
                "Composição",
                "Partes",
                "Advogados",
                "Relatório",
                "Votos",
                "Decisão",
                "Publicação"
            ]
        },
        {
            "id": "reuniao_condominio",
            "nome": "Ata de Reunião de Condomínio",
            "icone": "🏢",
            "descricao": "Modelo para assembleias e reuniões de condomínio",
            "secoes": [
                "Identificação",
                "Convocação",
                "Presença e Quórum",
                "Ordem do Dia",
                "Discussões",
                "Votações",
                "Decisões",
                "Encerramento"
            ]
        },
        {
            "id": "assembleia_geral",
            "nome": "Ata de Assembleia Geral",
            "icone": "👥",
            "descricao": "Modelo para assembleias gerais de empresas e associações",
            "secoes": [
                "Identificação",
                "Convocação",
                "Composição da Mesa",
                "Presença e Quórum",
                "Ordem do Dia",
                "Deliberações",
                "Votações",
                "Decisões",
                "Encerramento"
            ]
        }
    ]
    
    return {"modelos": modelos}


# ====================================================================================
# GERENCIAMENTO DE TEMPLATES
# ====================================================================================

class SalvarTemplateRequest(BaseModel):
    modelo_id: str
    nome_modelo: str
    nome_arquivo: str
    template_html: str
    campos: list
    tipo: str = "customizado"
    criado_em: str
    criado_via: str = "prompt"
    descricao_original: Optional[str] = ""

@router.post("/salvar-template")
async def salvar_template(request_data: SalvarTemplateRequest):
    """
    Salva um novo template HTML na pasta templates/ata_templates
    """
    logger.info("================= SALVANDO NOVO TEMPLATE =================")
    logger.info(f"Modelo: {request_data.nome_modelo}")
    logger.info(f"ID: {request_data.modelo_id}")
    logger.info(f"Arquivo: {request_data.nome_arquivo}")
    
    try:
        # Verificar se pasta existe
        if not TEMPLATES_DIR.exists():
            TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
            logger.info(f"📁 Pasta criada: {TEMPLATES_DIR}")
        
        # Caminho completo do arquivo
        template_path = TEMPLATES_DIR / request_data.nome_arquivo
        
        # Verificar se já existe
        if template_path.exists():
            logger.warning(f"⚠️ Template já existe: {request_data.nome_arquivo}")
            raise HTTPException(
                status_code=400,
                detail=f"Template '{request_data.nome_arquivo}' já existe"
            )
        
        # Salvar HTML
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(request_data.template_html)
        
        logger.info(f"✅ HTML salvo: {template_path}")
        
        # Atualizar metadados
        metadata = carregar_metadados()
        
        metadata[request_data.modelo_id] = {
            "nome_modelo": request_data.nome_modelo,
            "nome_arquivo": request_data.nome_arquivo,
            "tipo": request_data.tipo,
            "campos": request_data.campos,
            "criado_em": request_data.criado_em,
            "criado_via": request_data.criado_via,
            "descricao_original": request_data.descricao_original,
            "ativo": True
        }
        
        salvar_metadados(metadata)
        
        logger.info(f"✅ Metadados atualizados")
        logger.info("========================================================")
        
        return {
            "success": True,
            "message": "Template salvo com sucesso",
            "modelo_id": request_data.modelo_id,
            "nome_arquivo": request_data.nome_arquivo,
            "path": str(template_path)
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao salvar template: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao salvar template: {str(e)}"
        )

def carregar_metadados() -> dict:
    """Carrega metadados dos templates"""
    if METADATA_FILE.exists():
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def salvar_metadados(metadata: dict):
    """Salva metadados dos templates"""
    with open(METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

@router.get("/modelos-disponiveis")
async def listar_modelos_disponiveis():
    """
    Lista todos os modelos de ata disponíveis (nativos + customizados)
    """
    logger.info("================= LISTANDO MODELOS =================")
    
    try:
        # Modelos nativos (hardcoded)
        modelos_nativos = {
            "reuniao_trabalho": {
                "id": "reuniao_trabalho",
                "nome": "📋 Ata de Reunião de Trabalho",
                "icone": "📋",
                "tipo": "nativo",
                "descricao": "Modelo padrão para reuniões corporativas e de equipe"
            },
            "sessao_judiciaria": {
                "id": "sessao_judiciaria",
                "nome": "⚖️ Ata de Sessão Judiciária",
                "icone": "⚖️",
                "tipo": "nativo",
                "descricao": "Modelo para registros de audiências e sessões judiciais"
            },
            "reuniao_condominio": {
                "id": "reuniao_condominio",
                "nome": "🏢 Ata de Reunião de Condomínio",
                "icone": "🏢",
                "tipo": "nativo",
                "descricao": "Modelo para assembleias e reuniões de condomínio"
            },
            "assembleia_geral": {
                "id": "assembleia_geral",
                "nome": "👥 Ata de Assembleia Geral",
                "icone": "👥",
                "tipo": "nativo",
                "descricao": "Modelo para assembleias gerais de empresas"
            }
        }
        
        # Modelos customizados
        metadata = carregar_metadados()
        modelos_customizados = {}
        
        for modelo_id, dados in metadata.items():
            if dados.get('ativo', True):
                modelos_customizados[modelo_id] = {
                    "id": modelo_id,
                    "nome": f"⭐ {dados['nome_modelo']}",
                    "icone": "⭐",
                    "tipo": "customizado",
                    "descricao": f"Modelo personalizado criado via {dados.get('criado_via', 'sistema')}",
                    "criado_em": dados.get('criado_em', ''),
                    "campos": dados.get('campos', [])
                }
        
        # Combinar todos
        todos_modelos = {**modelos_nativos, **modelos_customizados}
        
        logger.info(f"📋 Total de modelos: {len(todos_modelos)}")
        logger.info(f"   - Nativos: {len(modelos_nativos)}")
        logger.info(f"   - Customizados: {len(modelos_customizados)}")
        logger.info("===================================================")
        
        return {
            "modelos": list(todos_modelos.values()),
            "total": len(todos_modelos),
            "nativos": len(modelos_nativos),
            "customizados": len(modelos_customizados)
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao listar modelos: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar modelos: {str(e)}"
        )

@router.delete("/deletar-template/{modelo_id}")
async def deletar_template(modelo_id: str):
    """
    Deleta um template customizado
    """
    logger.info(f"🗑️ Deletando template: {modelo_id}")
    
    try:
        metadata = carregar_metadados()
        
        if modelo_id not in metadata:
            raise HTTPException(status_code=404, detail="Modelo não encontrado")
        
        # Não permitir deletar modelos nativos
        if metadata[modelo_id].get('tipo') == 'nativo':
            raise HTTPException(status_code=403, detail="Não é possível deletar modelos nativos")
        
        # Deletar arquivo HTML
        nome_arquivo = metadata[modelo_id]['nome_arquivo']
        template_path = TEMPLATES_DIR / nome_arquivo
        
        if template_path.exists():
            template_path.unlink()
            logger.info(f"✅ Arquivo deletado: {nome_arquivo}")
        
        # Remover dos metadados
        del metadata[modelo_id]
        salvar_metadados(metadata)
        
        logger.info(f"✅ Template deletado com sucesso")
        
        return {
            "success": True,
            "message": "Template deletado com sucesso",
            "modelo_id": modelo_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao deletar template: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao deletar template: {str(e)}"
        )

