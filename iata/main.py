from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

# Importa os routers dos módulos
from app.modules.routes import router as iata_router

# Cria a aplicação principal
app = FastAPI(
    title="Programa de Mestrado em Modelagem computacional e transformação digital",
    description="Projeto construído em programa de Mestrado de Modelagem Computacional"
)

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monta o diretório de arquivos estáticos (CSS, JS, Imagens)
app.mount("/static", StaticFiles(directory="app/frontend"), name="static")

templates = Jinja2Templates(directory="app/templates")

# --- Inclusão das Rotas das APIs ---
app.include_router(iata_router, prefix="/iata", tags=["Iata"])

# --- Rotas para servir as Páginas HTML ---

@app.get("/iata", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_iata(request: Request):
    """Serve a página inicial do sistema de atas."""
    return templates.TemplateResponse("iata.html", {"request": request, "active_page": "iata"})

@app.get("/editor-templates", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_editor_templates(request: Request):
    """Serve a página do editor de templates."""
    return templates.TemplateResponse("editor_templates.html", {"request": request, "active_page": "editor"})