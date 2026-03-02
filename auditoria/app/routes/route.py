from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Form, Query
from fastapi.templating import Jinja2Templates
from app.services.services import convert_xlsx_to_csv, generate, gerar_documento
from app.services.prompts import prompt_auditoria, prompt_plano_acao, prompt_matriz_achados, prompt_matriz_planejamento, prompt_plano_trabalho, prompt_requisicao_documentos

import shutil
import uuid
import os
import pdfkit
import re
from fastapi.responses import Response, RedirectResponse
import logging

router = APIRouter()
templates = Jinja2Templates(directory="frontend/templates")

model = "gemini-2.5-flash"

UPLOAD_DIR = "app/static/docs/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

relatorio_temp = None
plano_temp = None
matriz_achados_temp = None
matriz_planejamento_temp = None
plano_trabalho_temp = None
requisicao_documentos_temp = None

logger = logging.getLogger(__name__)

# In-memory session storage for chatbot history (clears on restart)
session_history = {}


def limpar_html_gerado(html_content):
    """
    Remove tags de markdown e outras marcações indesejadas do HTML gerado.
    """
    if not html_content:
        return ""
    
    # Remove backticks do início e fim
    html_content = re.sub(r'^```+[a-z]*\n?', '', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'\n?```+$', '', html_content, flags=re.IGNORECASE)
    
    # Remove tags de linguagem incorretas
    html_content = re.sub(r'<lang\s*=\s*[^>]*>', '', html_content, flags=re.IGNORECASE)
    
    # Remove marcações de código específicas
    html_content = re.sub(r'^```html\s*', '', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'\s*```$', '', html_content, flags=re.IGNORECASE)
    
    # Remove espaços em branco extras
    html_content = html_content.strip()
    
    # Verifica se tem estrutura HTML básica
    if not re.search(r'<!doctype\s+html>', html_content, re.IGNORECASE):
        if not re.search(r'<html', html_content, re.IGNORECASE):
            # Adiciona estrutura HTML básica se necessário
            html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documento</title>
</head>
<body>
    {html_content}
</body>
</html>"""
    
    # Garante que tem meta charset UTF-8
    if 'charset="UTF-8"' not in html_content and 'charset=UTF-8' not in html_content:
        html_content = html_content.replace('<head>', '<head>\n    <meta charset="UTF-8">')
    
    # Adiciona CSS para melhor renderização de tabelas se não houver <style>
    if '<style>' not in html_content:
        css_content = """
    <style>
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        h1, h2, h3 {
            color: #1a237e;
        }
    </style>
"""
        html_content = html_content.replace('</head>', css_content + '\n</head>')
    
    return html_content



@router.get("/")
def index(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.get("/relatorio")
def get_relatorio_page(request: Request):
    return templates.TemplateResponse("relatorio.html", {"request": request})

@router.get("/plano-de-acao")
def get_plano_acao_page(request: Request):
    return templates.TemplateResponse("plano_de_acao.html", {"request": request})


@router.get("/matriz-de-achados")
def get_matriz_achados_page(request: Request):
    return templates.TemplateResponse("matriz_de_achados.html", {"request": request})


@router.get("/matriz-de-planejamento")
def get_matriz_planejamento_page(request: Request):
    return templates.TemplateResponse("matriz_de_planejamento.html", {"request": request})


@router.get("/plano-de-trabalho")
def get_plano_trabalho_page(request: Request):
    return templates.TemplateResponse("plano_de_trabalho.html", {"request": request})

@router.get("/manual-de-uso")
def get_manual_de_uso_page(request: Request):
    return templates.TemplateResponse("manual_de_uso.html", {"request": request})

@router.get("/requisicao-de-documentos")
def get_requisicao_documentos_page(request: Request):
    return templates.TemplateResponse("requisicao_de_documentos.html", {"request": request})


@router.get("/respostas-unidade-auditoria")
def get_respostas_unidade_auditoria_page(request: Request):
    return templates.TemplateResponse("respostas_unidade_auditoria.html", {"request": request})


@router.get("/responder-requisicao")
def get_responder_requisicao_page(request: Request):
    return templates.TemplateResponse("responder_requisicao.html", {"request": request})


@router.post("/")
async def post_login(request: Request):
    form = await request.form()
    username = form.get("username")
    password = form.get("password")
    # No authentication needed, always redirect to dashboard
    return RedirectResponse("/dashboard", status_code=303)


@router.get("/dashboard")
def dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.post("/gerar-pdf")
async def gerar_pdf(request: Request):
    try:
        data = await request.json()
        html_content = data.get("html")
        orientation = data.get("orientation", "Portrait")
        
        # Limpa o HTML antes de gerar o PDF
        html_content = limpar_html_gerado(html_content)
        
        # Adiciona CSS para melhor renderização do PDF
        if '<style>' not in html_content:
            css_pdf = """
    <style>
        @page { margin: 2cm; }
        body { 
            font-family: 'Arial', 'Helvetica', sans-serif; 
            line-height: 1.6;
            color: #333;
        }
        table { 
            border-collapse: collapse; 
            width: 100%;
            margin: 1em 0;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px;
            text-align: left;
        }
        th { 
            background-color: #f2f2f2;
            font-weight: bold;
        }
        h1, h2, h3 { 
            color: #1a237e;
            page-break-after: avoid;
        }
        .page-break { 
            page-break-before: always;
        }
    </style>
"""
            html_content = html_content.replace('</head>', css_pdf + '\n</head>')

        # Configurações para melhor qualidade do PDF
        options = {
            'page-size': 'A4',
            'margin-top': '20mm',
            'margin-right': '20mm',
            'margin-bottom': '20mm',
            'margin-left': '20mm',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None,
            'orientation': orientation
        }

        # Lógica para configurar o path do wkhtmltopdf dinamicamente
        import platform
        if platform.system() == 'Windows':
            path_wkhtmltopdf = r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe'
            config = pdfkit.configuration(wkhtmltopdf=path_wkhtmltopdf)
            pdf = pdfkit.from_string(html_content, False, configuration=config, options=options)
        else:
            pdf = pdfkit.from_string(html_content, False, options=options)

        return Response(
            content=pdf, 
            media_type='application/pdf',
            headers={
                'Content-Disposition': 'attachment; filename="documento.pdf"',
                'Content-Type': 'application/pdf'
            }
        )
    except Exception as e:
        logger.error(f"Erro ao gerar PDF: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao gerar o PDF.")

@router.post("/gerar-requisicao-documentos")
async def gerar_requisicao_documentos_route(
    plano_auditoria_longo_prazo: UploadFile = File(None, description="Plano de Auditoria de Longo Prazo"),
    plano_auditoria_anual: UploadFile = File(None, description="Plano de Auditoria Anual"),
    plano_trabalho: UploadFile = File(None, description="Plano de Trabalho"),
    prompt_usuario: str = Form(..., description="Prompt personalizado do usuário")
):
    logger.info("Recebida nova requisição em /gerar-requisicao-documentos.")
    saved_files = []
    
    try:
        files = [plano_auditoria_longo_prazo, plano_auditoria_anual, plano_trabalho]
        files = [f for f in files if f and f.filename] # Filter out None or empty filename

        if not files:
            raise HTTPException(status_code=400, detail="Nenhum arquivo foi enviado.")

        filenames = [f.filename for f in files]
        logger.info(f"Arquivos recebidos: {filenames}")
        
        for file in files:
            ext = os.path.splitext(file.filename)[1].lower()
            temp_filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, temp_filename)

            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            # Se for Excel, converte para CSV. XLSX não é suportado como anexo no Generative AI
            if ext in [".xlsx", ".xls"]:
                try:
                    csv_path = convert_xlsx_to_csv(file_path)
                    os.remove(file_path)
                    saved_files.append(csv_path)
                    logger.info(f"Arquivo {file.filename} convertido para CSV: {csv_path}")
                except Exception as e:
                    logger.error(f"Erro ao converter {file.filename} para CSV: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Erro ao converter {file.filename} para CSV.")
            else:
                saved_files.append(file_path)
        
        logger.info(f"Arquivos salvos temporariamente em: {saved_files}")
        
        logger.info("Iniciando geração de requisição de documentos com IA...")
        result_requisicao = gerar_documento(file_paths=saved_files, prompt=f"{prompt_requisicao_documentos}\n\n{prompt_usuario}")
        
        result_requisicao = limpar_html_gerado(result_requisicao)
        
        logger.info("Requisição de documentos gerada com sucesso.")
        
        global requisicao_documentos_temp
        requisicao_documentos_temp = result_requisicao
        
        logger.info("Requisição /gerar-requisicao-documentos finalizada com sucesso.")
        return {"reply": result_requisicao}
        
    except Exception as e:
        logger.error(f"Erro durante o processamento da requisição /gerar-requisicao-documentos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        logger.info(f"Limpando arquivos temporários: {saved_files}")
        for file_path in saved_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Não foi possível remover arquivo temporário {file_path}: {e}")

@router.post("/gerar-matriz-planejamento")
async def gerar_matriz_planejamento_route(
    plano_auditoria_longo_prazo: UploadFile = File(None, description="Plano de Auditoria de Longo Prazo"),
    plano_auditoria_anual: UploadFile = File(None, description="Plano de Auditoria Anual"),
    plano_trabalho: UploadFile = File(None, description="Plano de Trabalho"),
    matriz_riscos: UploadFile = File(None, description="Matriz de Riscos"),
    prompt_usuario: str = Form(..., description="Prompt personalizado do usuário")
):
    logger.info("Recebida nova requisição em /gerar-matriz-planejamento.")
    saved_files = []
    
    try:
        files = [plano_auditoria_longo_prazo, plano_auditoria_anual, plano_trabalho, matriz_riscos]
        files = [f for f in files if f and f.filename] # Filter out None or empty filename

        if not files:
            raise HTTPException(status_code=400, detail="Nenhum arquivo foi enviado.")

        filenames = [f.filename for f in files]
        logger.info(f"Arquivos recebidos: {filenames}")
        
        for file in files:
            ext = os.path.splitext(file.filename)[1].lower()
            temp_filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, temp_filename)

            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            # Se for Excel, converte para CSV. XLSX não é suportado como anexo no Generative AI
            if ext in [".xlsx", ".xls"]:
                try:
                    csv_path = convert_xlsx_to_csv(file_path)
                    os.remove(file_path)
                    saved_files.append(csv_path)
                    logger.info(f"Arquivo {file.filename} convertido para CSV: {csv_path}")
                except Exception as e:
                    logger.error(f"Erro ao converter {file.filename} para CSV: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Erro ao converter {file.filename} para CSV.")
            else:
                saved_files.append(file_path)
        
        logger.info(f"Arquivos salvos temporariamente em: {saved_files}")
        
        logger.info("Iniciando geração de matriz de planejamento com IA...")
        result_matriz = gerar_documento(file_paths=saved_files, prompt=f"{prompt_matriz_planejamento}\n\n{prompt_usuario}")
        
        result_matriz = limpar_html_gerado(result_matriz)
        
        logger.info("Matriz de planejamento gerada com sucesso.")
        
        global matriz_planejamento_temp
        matriz_planejamento_temp = result_matriz
        
        logger.info("Requisição /gerar-matriz-planejamento finalizada com sucesso.")
        return {"reply": result_matriz}
        
    except Exception as e:
        logger.error(f"Erro durante o processamento da requisição /gerar-matriz-planejamento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        logger.info(f"Limpando arquivos temporários: {saved_files}")
        for file_path in saved_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Não foi possível remover arquivo temporário {file_path}: {e}")


@router.post("/gerar-plano-trabalho")
async def gerar_plano_trabalho_route(
    plano_auditoria_longo_prazo: UploadFile = File(None, description="Plano de Auditoria de Longo Prazo"),
    plano_auditoria_anual: UploadFile = File(None, description="Plano de Auditoria Anual"),
    prompt_usuario: str = Form(..., description="Prompt personalizado do usuário")
):
    logger.info("Recebida nova requisição em /gerar-plano-trabalho.")
    saved_files = []
    
    try:
        files = [plano_auditoria_longo_prazo, plano_auditoria_anual]
        files = [f for f in files if f and f.filename]  # Filter out None or empty filename

        if not files:
            raise HTTPException(status_code=400, detail="Nenhum arquivo foi enviado.")

        filenames = [f.filename for f in files]
        logger.info(f"Arquivos recebidos: {filenames}")
        
        for file in files:
            ext = os.path.splitext(file.filename)[1].lower()
            temp_filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, temp_filename)

            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            # Se for Excel, converte para CSV. XLSX não é suportado como anexo no Generative AI
            if ext in [".xlsx", ".xls"]:
                try:
                    csv_path = convert_xlsx_to_csv(file_path)
                    os.remove(file_path)
                    saved_files.append(csv_path)
                    logger.info(f"Arquivo {file.filename} convertido para CSV: {csv_path}")
                except Exception as e:
                    logger.error(f"Erro ao converter {file.filename} para CSV: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Erro ao converter {file.filename} para CSV.")
            else:
                saved_files.append(file_path)
        
        logger.info(f"Arquivos salvos temporariamente em: {saved_files}")
        
        logger.info("Iniciando geração de plano de trabalho com IA...")
        result_plano = gerar_documento(file_paths=saved_files, prompt=f"{prompt_plano_trabalho}\n\n{prompt_usuario}")
        
        result_plano = limpar_html_gerado(result_plano)
        
        logger.info("Plano de trabalho gerado com sucesso.")
        
        global plano_trabalho_temp
        plano_trabalho_temp = result_plano
        
        logger.info("Requisição /gerar-plano-trabalho finalizada com sucesso.")
        return {"reply": result_plano}
        
    except Exception as e:
        logger.error(f"Erro durante o processamento da requisição /gerar-plano-trabalho: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        logger.info(f"Limpando arquivos temporários: {saved_files}")
        for file_path in saved_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Não foi possível remover arquivo temporário {file_path}: {e}")


@router.post("/gerar-matriz")
async def gerar_matriz_route(
    plano_trabalho: UploadFile = File(..., description="Plano de Trabalho"),
    matriz_planejamento: UploadFile = File(..., description="Matriz de Planejamento"),
    prompt_usuario: str = Form(..., description="Prompt personalizado do usuário")
):
    logger.info("Recebida nova requisição em /gerar-matriz.")
    saved_files = []
    
    try:
        files = [plano_trabalho, matriz_planejamento]
        filenames = [f.filename for f in files]
        logger.info(f"Arquivos recebidos: {filenames}")
        
        for file in files:
            if not file.filename:
                logger.error("Um arquivo foi enviado sem nome.")
                raise HTTPException(status_code=400, detail=f"Arquivo não enviado")
            
            ext = os.path.splitext(file.filename)[1].lower()
            temp_filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, temp_filename)
            
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            
            # Se for Excel, converte para CSV. XLSX não é suportado como anexo no Generative AI
            if ext in [".xlsx", ".xls"]:
                try:
                    csv_path = convert_xlsx_to_csv(file_path)
                    os.remove(file_path)
                    saved_files.append(csv_path)
                    logger.info(f"Arquivo {file.filename} convertido para CSV: {csv_path}")
                except Exception as e:
                    logger.error(f"Erro ao converter {file.filename} para CSV: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Erro ao converter {file.filename} para CSV.")
            else:
                saved_files.append(file_path)
        
        logger.info(f"Arquivos salvos temporariamente em: {saved_files}")
        
        logger.info("Iniciando geração de matriz de achados com IA...")
        result_matriz = gerar_documento(file_paths=saved_files, prompt=f"{prompt_matriz_achados}\n\n{prompt_usuario}")
        
        result_matriz = limpar_html_gerado(result_matriz)
        
        logger.info("Matriz de achados gerada com sucesso.")
        
        global matriz_achados_temp
        matriz_achados_temp = result_matriz
        
        logger.info("Requisição /gerar-matriz finalizada com sucesso.")
        return {"reply": result_matriz}
        
    except Exception as e:
        logger.error(f"Erro durante o processamento da requisição /gerar-matriz: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        logger.info(f"Limpando arquivos temporários: {saved_files}")
        for file_path in saved_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Não foi possível remover arquivo temporário {file_path}: {e}")


@router.post("/aud/plano-acao")
async def generate_plano_acao_route(
    matriz_achados: UploadFile = File(..., description="Matriz de Achados"),
    matriz_planejamento: UploadFile = File(None, description="Matriz de Planejamento"),
    plano_trabalho: UploadFile = File(None, description="Plano de Trabalho"),
    prompt_usuario: str = Form(None, description="Prompt personalizado do usuário")
):
    logger.info("Recebida nova requisição em /aud/plano-acao.")
    saved_files = []
    
    try:
        files = []
        if matriz_achados:
            files.append(matriz_achados)
        if matriz_planejamento:
            files.append(matriz_planejamento)
        if plano_trabalho:
            files.append(plano_trabalho)

        filenames = [f.filename for f in files]
        logger.info(f"Arquivos recebidos: {filenames}")
        
        for file in files:
            if not file.filename:
                logger.error("Um arquivo foi enviado sem nome.")
                raise HTTPException(status_code=400, detail=f"Arquivo não enviado")
            
            ext = os.path.splitext(file.filename)[1].lower()
            temp_filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, temp_filename)
            
            with open(file_path, "wb") as f_out:
                shutil.copyfileobj(file.file, f_out)
            
            # Se for Excel, converte para CSV. XLSX não é suportado como anexo no Generative AI
            if ext in [".xlsx", ".xls"]:
                try:
                    csv_path = convert_xlsx_to_csv(file_path)
                    os.remove(file_path)
                    saved_files.append(csv_path)
                    logger.info(f"Arquivo {file.filename} convertido para CSV: {csv_path}")
                except Exception as e:
                    logger.error(f"Erro ao converter {file.filename} para CSV: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Erro ao converter {file.filename} para CSV.")
            else:
                saved_files.append(file_path)
        
        logger.info(f"Arquivos salvos temporariamente em: {saved_files}")
        
        logger.info("Iniciando geração de plano de ação com IA...")
        result_acao = gerar_documento(file_paths=saved_files, prompt=f"{prompt_plano_acao}\n\n{prompt_usuario}")
        
        result_acao = limpar_html_gerado(result_acao)
        
        logger.info("Plano de ação gerado com sucesso.")
        
        global plano_temp
        plano_temp = result_acao
        
        logger.info("Requisição /aud/plano-acao finalizada com sucesso.")
        return {"reply_acao": result_acao}
        
    except Exception as e:
        logger.error(f"Erro durante o processamento da requisição /aud/plano-acao: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        logger.info(f"Limpando arquivos temporários: {saved_files}")
        for file_path in saved_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Não foi possível remover arquivo temporário {file_path}: {e}")


@router.post("/aud/relatorio")
async def generate_report_route(
    plano_trabalho: UploadFile = File(..., description="Plano de Trabalho"),
    matriz_planejamento: UploadFile = File(..., description="Matriz de Planejamento"),
    matriz_achados: UploadFile = File(..., description="Matriz de Achados"),
    prompt_usuario: str = Form(..., description="Prompt personalizado do usuário")
):
    logger.info("Recebida nova requisição em /aud/relatorio.")
    saved_files = []
    
    try:
        # Lista dos arquivos recebidos
        files = [plano_trabalho, matriz_planejamento, matriz_achados]
        filenames = [f.filename for f in files]
        logger.info(f"Arquivos recebidos: {filenames}")
        
        # Salvar cada arquivo temporariamente
        for file in files:
            if not file.filename:
                logger.error("Um arquivo foi enviado sem nome.")
                raise HTTPException(status_code=400, detail=f"Arquivo não enviado")
            
            # Criar nome único para evitar conflitos
            ext = os.path.splitext(file.filename)[1].lower()
            temp_filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, temp_filename)
            
            # Salvar arquivo
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            
            # Se for Excel, converte para CSV. XLSX não é suportado como anexo no Generative AI
            if ext in [".xlsx", ".xls"]:
                try:
                    csv_path = convert_xlsx_to_csv(file_path)
                    os.remove(file_path)
                    saved_files.append(csv_path)
                    logger.info(f"Arquivo {file.filename} convertido para CSV: {csv_path}")
                except Exception as e:
                    logger.error(f"Erro ao converter {file.filename} para CSV: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail=f"Erro ao converter {file.filename} para CSV.")
            else:
                saved_files.append(file_path)
        
        logger.info(f"Arquivos salvos temporariamente em: {saved_files}")
        
        # Processar arquivos
        logger.info("Iniciando geração de relatório com IA...")
        result = generate(file_paths=saved_files, prompt=f"{prompt_auditoria}\n\n{prompt_usuario}")
        
        # Limpa o HTML do relatório
        result = limpar_html_gerado(result)
        
        logger.info("Relatório gerado com sucesso.")
        
        # Armazenar resultados temporariamente
        global relatorio_temp
        relatorio_temp = result
        
        logger.info("Requisição /aud/relatorio finalizada com sucesso.")
        return {"reply": result}
        
    except Exception as e:
        logger.error(f"Erro durante o processamento da requisição /aud/relatorio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Limpar arquivos temporários
        logger.info(f"Limpando arquivos temporários: {saved_files}")
        for file_path in saved_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Não foi possível remover arquivo temporário {file_path}: {e}")

import json

@router.get("/api/chatbot")
async def get_chat_history(session_id: str = Query(None)):
    if not session_id:
        return {"history": [], "session_id": None}

    history_list = session_history.get(session_id, [])
    formatted_history = []
    for msg in history_list:
        if msg["role"] == "user":
            files = msg.get("files", [])
            if files:
                file_objs = [{"name": f["name"]} for f in files]
                formatted_history.append({
                    "sender": "user",
                    "message": msg["content"],
                    "files": file_objs
                })
            else:
                file_name = msg.get("file_name")  # Backward compatibility
                file_obj = {"name": file_name} if file_name else None
                formatted_history.append({
                    "sender": "user",
                    "message": msg["content"],
                    "file": file_obj
                })
        else:
            formatted_history.append({
                "sender": "bot",
                "message": msg["content"]
            })
    return {"history": formatted_history, "session_id": session_id}

@router.post("/api/chatbot")
async def chatbot_route(
    message: str = Form(None),
    files: list[UploadFile] = File(None),
    session_id: str = Form(None)
):
    from app.services.services import client  # Import client here to avoid circular import
    from google.genai import types
    
    if not session_id:
        session_id = str(uuid.uuid4())

    history = session_history.setdefault(session_id, [])

    if not message and not files:
        raise HTTPException(status_code=400, detail="Mensagem ou arquivo é obrigatório")

    # Prepare new user message
    new_user_content = message or ""
    new_user_parts = [types.Part.from_text(text=new_user_content)] if new_user_content else []
    user_files = []

    for file in files or []:
        if not file.filename:
            continue

        ext = os.path.splitext(file.filename)[1].lower()
        temp_filename = f"{uuid.uuid4()}{ext}"
        temp_file_path = os.path.join(UPLOAD_DIR, temp_filename)
        
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Se for Excel, converte para CSV. XLSX não é suportado como anexo no Generative AI
        upload_path = temp_file_path
        if ext in [".xlsx", ".xls"]:
            try:
                csv_path = convert_xlsx_to_csv(temp_file_path)
                os.remove(temp_file_path)
                upload_path = csv_path
                logger.info(f"Arquivo {file.filename} convertido para CSV: {csv_path}")
            except Exception as e:
                logger.error(f"Erro ao converter {file.filename} para CSV: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Erro ao converter {file.filename} para CSV.")
        
        uploaded_file = client.files.upload(file=upload_path)
        new_user_parts.append(types.Part.from_uri(file_uri=uploaded_file.uri, mime_type=uploaded_file.mime_type))
        user_files.append({
            'uri': uploaded_file.uri,
            'mime_type': uploaded_file.mime_type,
            'name': file.filename
        })
        
        # Cleanup temp file
        if os.path.exists(upload_path):
            os.remove(upload_path)

    # Build contents from history + new user
    contents = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        parts = [types.Part.from_text(text=msg["content"])]
        if msg["role"] == "user" and msg.get("files"):
            for f in msg["files"]:
                parts.append(types.Part.from_uri(file_uri=f["uri"], mime_type=f["mime_type"]))
        contents.append(types.Content(role=role, parts=parts))

    # Add new user content
    contents.append(types.Content(role="user", parts=new_user_parts))

    # Config with system instruction
    system_instruction = types.Content(
        role="model",
        parts=[types.Part.from_text(text=
            "Você é um assistente virtual de um sistema de auditoria. Responda de forma concisa e útil, considerando o contexto da conversa e quaisquer arquivos anexados nas mensagens do usuário. Não utilize sintaxe de Markdown na resposta."
        )]
    )

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain",
        system_instruction=system_instruction
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )

        reply = response.text

        # Append to history
        new_user_msg = {
            "role": "user",
            "content": new_user_content,
            "files": user_files
        }
        history.append(new_user_msg)
        history.append({"role": "assistant", "content": reply})

        return {"reply": reply, "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Erro no chatbot: {e}")
        raise HTTPException(status_code=500, detail="Erro interno no chatbot.")
