from fastapi import FastAPI, Request, Form, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from pathlib import Path
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from typing import Optional
import os

# Cria a aplicação principal
app = FastAPI(
    title="Programa de Mestrado em Modelagem computacional e transformação digital",
    description="Projeto construído em programa de Mestrado de Modelagem Computacional"
)

# Adicione um segredo para o middleware de sessão
# Em produção, use um valor seguro e não o coloque diretamente no código
app.add_middleware(SessionMiddleware, secret_key="mestrado")

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

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "app/templates"))

# Isso torna seu app flexível. Os valores padrão são para desenvolvimento local.
URL_APP_8001 = os.getenv("URL_APP_8001", "http://localhost:8001")
URL_APP_8002 = os.getenv("URL_APP_8002", "http://localhost:8002")
URL_APP_8003 = os.getenv("URL_APP_8003", "http://localhost:8003")
URL_APP_8004 = os.getenv("URL_APP_8004", "http://localhost:8004")
URL_APP_8005 = os.getenv("URL_APP_8005", "http://localhost:8005")
URL_APP_8006 = os.getenv("URL_APP_8006", "http://localhost:8006")
URL_APP_8007 = os.getenv("URL_APP_8007", "http://localhost:8007")

# --- Funções de autenticação e dependências ---

# Função para verificar se o usuário está logado
def get_current_user(request: Request) -> Optional[str]:
    return request.session.get("user")

# --- Rotas de Login e Logout ---

@app.get("/login", response_class=HTMLResponse, tags=["Auth"])
async def login_page(request: Request, error: Optional[str] = None):
    """Serve a página de login."""
    return templates.TemplateResponse("login.html", {"request": request, "error": error})

@app.post("/login", tags=["Auth"])
async def login_submit(request: Request, username: str = Form(...), password: str = Form(...)):
    """Processa o formulário de login."""
    if username == "admin" and password == "mestrado":
        request.session["user"] = "admin"
        return RedirectResponse(url="/", status_code=303)
    else:
        # Redireciona de volta para a página de login com uma mensagem de erro
        return RedirectResponse(url="/login?error=Usuário ou senha inválidos", status_code=303)


@app.get("/logout", tags=["Auth"])
async def logout(request: Request):
    """Limpa a sessão do usuário e redireciona para o login."""
    request.session.clear()
    return RedirectResponse(url="/login", status_code=303)


# --- Rotas para servir as Páginas HTML (Agora protegidas) ---

@app.get("/", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_inicio(request: Request, user: str = Depends(get_current_user)):
    """Serve a página inicial."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("inicio.html", {"request": request, "active_page": "inicio", "user": user})

# --- NOVO: ROTA PARA APRESENTAÇÃO ---
@app.get("/apresentacao", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_apresentacao(request: Request, user: str = Depends(get_current_user)):
    """Serve a página de apresentação de slides."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("apresentacao.html", {"request": request, "active_page": "apresentacao", "user": user})


@app.get("/produtos", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_produtos(request: Request, user: str = Depends(get_current_user)):
    """Serve a página de produtos."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("produtos.html", {
        "request": request,
        "active_page": "produtos",
        "user": user,
        "url_app_8001": URL_APP_8001,
        "url_app_8002": URL_APP_8002,
        "url_app_8003": URL_APP_8003,
        "url_app_8004": URL_APP_8004,
        "url_app_8005": URL_APP_8005,
        "url_app_8006": URL_APP_8006,
        "url_app_8007": URL_APP_8007,
    })

@app.get("/tese", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_tese(request: Request, user: str = Depends(get_current_user)):
    """Serve a página da dissertação."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("tese.html", {"request": request, "active_page": "tese", "user": user})

@app.get("/agradecimentos", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_agradecimentos(request: Request, user: str = Depends(get_current_user)):
    """Serve a página de agradecimentos."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("agradecimentos.html", {"request": request, "active_page": "agradecimentos", "user": user})

########### ROTA PRA OS PRODUTOS ###########
@app.get("/nativa", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_nativa(request: Request, user: str = Depends(get_current_user)):
    """Serve a página do produto Nativa."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("nativa.html", {"request": request, "active_page": "nativa", "user": user})

########### ROTA PRA OS ARTIGOS ###########
@app.get("/tese_pdf", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_tese_pdf(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de inclusiva."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("tese_pdf.html", {"request": request, "active_page": "tese_pdf", "user": user})

@app.get("/oficina", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_oficina(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de inclusiva."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("oficina.html", {"request": request, "active_page": "oficina", "user": user})

@app.get("/inclusiva", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_inclusiva(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de inclusiva."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("inclusiva.html", {"request": request, "active_page": "inclusiva", "user": user})

@app.get("/federado", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_federado(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de federado."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("federado.html", {"request": request, "active_page": "federado", "user": user})

@app.get("/engec", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_engec(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de engec."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("engec.html", {"request": request, "active_page": "engec", "user": user})


@app.get("/governanca", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_governanca(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de governanca."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("governanca.html", {"request": request, "active_page": "governanca", "user": user})

@app.get("/checagem", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_checagem(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de checagem."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("checagem.html", {"request": request, "active_page": "checagem", "user": user})

@app.get("/gastos", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_gastos(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de gastos."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("gastos.html", {"request": request, "active_page": "gastos", "user": user})


@app.get("/classificador", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_classificador(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de classificador."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("classificador.html", {"request": request, "active_page": "classificador", "user": user})


@app.get("/basenormas", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_basenormas(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de basenormas."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("basenormas.html", {"request": request, "active_page": "basenormas", "user": user})


@app.get("/palanqueia", response_class=HTMLResponse, tags=["Frontend Pages"])
async def read_palanqueia(request: Request, user: str = Depends(get_current_user)):
    """Serve artigo de palanqueIA."""
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("palanqueia.html", {"request": request, "active_page": "palanqueia", "user": user})

# --- NOVO: ROTAS PARA EMBUTIR AS APLICAÇÕES EXTERNAS ---

@app.get("/app-8001", response_class=HTMLResponse, tags=["Embedded Apps"])
async def embed_app_8001(request: Request, user: str = Depends(get_current_user)):
    """Serve a aplicação da porta 8001 dentro de um iframe."""
    if not user:
        return RedirectResponse(url="/login")
    
    context = {
        "request": request,
        "user": user,
        "active_page": "app_8001",  # Para destacar no menu, se houver
        "embed_title": "Aplicação 1",  # Título que aparecerá na página
        "embed_url": URL_APP_8001       # URL passada para o iframe
    }
    return templates.TemplateResponse("embed.html", context)

@app.get("/app-8002", response_class=HTMLResponse, tags=["Embedded Apps"])
async def embed_app_8002(request: Request, user: str = Depends(get_current_user)):
    """Serve a aplicação da porta 8002 dentro de um iframe."""
    if not user:
        return RedirectResponse(url="/login")
    
    context = {
        "request": request,
        "user": user,
        "active_page": "app_8002",
        "embed_title": "Aplicação 2",
        "embed_url": URL_APP_8002
    }
    return templates.TemplateResponse("embed.html", context)

@app.get("/app-8003", response_class=HTMLResponse, tags=["Embedded Apps"])
async def embed_app_8003(request: Request, user: str = Depends(get_current_user)):
    """Serve a aplicação da porta 8003 dentro de um iframe."""
    if not user:
        return RedirectResponse(url="/login")
    
    context = {
        "request": request,
        "user": user,
        "active_page": "app_8003",
        "embed_title": "Aplicação 3",
        "embed_url": URL_APP_8003
    }
    return templates.TemplateResponse("embed.html", context)

@app.get("/app-8004", response_class=HTMLResponse, tags=["Embedded Apps"])
async def embed_app_8004(request: Request, user: str = Depends(get_current_user)):
    """Serve a aplicação da porta 8004 dentro de um iframe."""
    if not user:
        return RedirectResponse(url="/login")
    
    context = {
        "request": request,
        "user": user,
        "active_page": "app_8004",
        "embed_title": "Aplicação 4",
        "embed_url": URL_APP_8004
    }
    return templates.TemplateResponse("embed.html", context)

@app.get("/app-8005", response_class=HTMLResponse, tags=["Embedded Apps"])
async def embed_app_8005(request: Request, user: str = Depends(get_current_user)):
    """Serve a aplicação da porta 8005 dentro de um iframe."""
    if not user:
        return RedirectResponse(url="/login")
    
    context = {
        "request": request,
        "user": user,
        "active_page": "app_8005",
        "embed_title": "Aplicação 5",
        "embed_url": URL_APP_8005
    }
    return templates.TemplateResponse("embed.html", context)

@app.get("/app-8006", response_class=HTMLResponse, tags=["Embedded Apps"])
async def embed_app_8006(request: Request, user: str = Depends(get_current_user)):
    """Serve a aplicação da porta 8006 dentro de um iframe."""
    if not user:
        return RedirectResponse(url="/login")

    context = {
        "request": request,
        "user": user,
        "active_page": "app_8006",
        "embed_title": "Aplicação 6 (Proxmox, por exemplo)",
        "embed_url": URL_APP_8006
    }
    return templates.TemplateResponse("embed.html", context)

@app.get("/app-8007", response_class=HTMLResponse, tags=["Embedded Apps"])
async def embed_app_8007(request: Request, user: str = Depends(get_current_user)):
    """Serve o ChatDatajud na porta 8007 dentro de um iframe."""
    if not user:
        return RedirectResponse(url="/login")

    context = {
        "request": request,
        "user": user,
        "active_page": "app_8007",
        "embed_title": "ChatDatajud",
        "embed_url": URL_APP_8007
    }
    return templates.TemplateResponse("embed.html", context)