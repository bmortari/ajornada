from google.genai import types
from app.client import get_genai_client
import mimetypes
import os
import pandas as pd

client = get_genai_client()

model = 'gemini-2.5-flash'
temp_dir = os.path.join("app", "docs")
os.makedirs(temp_dir, exist_ok=True)

def generate(file_paths, prompt):

    files = [client.files.upload(file=os.path.join(temp_dir, "modelo_relatorio.html"))]

    for path in file_paths:
        files.append(client.files.upload(file=path))
    
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type)
                for f in files
            ],
        ),
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
            ],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain",
    )

    html = ''
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        html += chunk.text or ""

    html = html.replace("html", "").replace("", "").strip()
    return html

def gerar_documento(file_paths, prompt):

    files = []

    for path in file_paths:
        # Obtém o MIME type antes do upload
        mime_type = get_mime_type(path)
        
        # Faz o upload passando o MIME type através do config
        uploaded_file = client.files.upload(
            file=path,
            config={'mime_type': mime_type}  # Passa o mime_type dentro do config
        )
        files.append(uploaded_file)
    
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type)
                for f in files
            ],
        ),
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
            ],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain",
    )

    html = ''
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        html += chunk.text or ""
        
    html = html.replace("html", "").replace("", "").strip()
    return html

def generate_chatbot_reply(message: str, file_paths: list[str] = []) -> str:
    """
    Generates a chatbot reply using the Gemini API, optionally with file attachments.
    """
    prompt = f"Você é um assistente virtual de um sistema de auditoria. "
    if file_paths:
        prompt += f"Analise o(s) arquivo(s) anexado(s) e responda à seguinte mensagem de forma concisa e útil: '{message}'. "
    else:
        prompt += f"Responda à seguinte mensagem de forma concisa e útil: '{message}'. "
    prompt += "Não utilize sintaxe de Markdown na resposta."

    contents = []
    
    if file_paths:
        files = []
        for path in file_paths:
            files.append(client.files.upload(file=path))
        
        contents.append(
            types.Content(
                role="user",
                parts=[
                    types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type)
                    for f in files
                ],
            )
        )
    
    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
            ],
        )
    )

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain",
    )

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=generate_content_config,
    )

    return response.text

def get_mime_type(file_path):
    """
    Determina o MIME type de um arquivo baseado em sua extensão.
    """
    # Primeiro tenta usar mimetypes
    mime_type, _ = mimetypes.guess_type(file_path)
    
    if mime_type:
        return mime_type
    
    # Se não conseguir, mapeia manualmente as extensões mais comuns
    ext = os.path.splitext(file_path)[1].lower()
    mime_mapping = {
        '.pdf': 'application/pdf',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.html': 'text/html',
        '.htm': 'text/html',
    }
    
    return mime_mapping.get(ext, 'application/octet-stream')

def convert_xlsx_to_csv(xlsx_path: str) -> str:
    csv_path = xlsx_path.replace(".xlsx", ".csv").replace(".xls", ".csv")
    df = pd.read_excel(xlsx_path)
    df.to_csv(csv_path, index=False)
    return csv_path