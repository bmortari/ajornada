"""ChatNormas -- FastAPI Backend."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.agent import NormasAgent
from app.services.exa_client import ExaClient
from app.services.db import init_pool, close_pool
from app.routers import chat, health, models, conversations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize DB pool, EXA client, agent."""
    logger.info("Starting ChatNormas backend...")

    # Initialize Postgres pool
    try:
        await init_pool(settings.database_url)
        logger.info("Postgres pool ready")
    except Exception as e:
        logger.warning("Could not connect to Postgres: %s", e)

    # Initialize EXA client
    exa_client = None
    if settings.exa_api_key:
        exa_client = ExaClient(api_key=settings.exa_api_key, model=settings.exa_model, base_url=settings.exa_base_url)
        logger.info("EXA client initialized")
    else:
        logger.warning("EXA_API_KEY not set -- deep research disabled")

    # Create agent
    agent = NormasAgent(exa_client=exa_client)
    app.state.agent = agent

    logger.info("ChatNormas backend ready!")
    yield

    # Cleanup
    logger.info("Shutting down ChatNormas backend...")
    await close_pool()
    if exa_client:
        await exa_client.close()


app = FastAPI(
    title="ChatNormas API",
    description="Agente de IA para normativos do CNJ",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS -- no middleware that buffers streaming
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router)
app.include_router(health.router)
app.include_router(models.router)
app.include_router(conversations.router)
