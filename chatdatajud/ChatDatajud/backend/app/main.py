"""ChatDatajud — FastAPI Backend."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.cube_client import CubeClient
from app.services.llm_agent import LLMAgent
from app.services.schema_loader import format_schema_for_prompt
from app.services.db import init_pool, close_pool
from app.routers import chat, health, cube_proxy, pipeline, conversations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize Cube client, load schema, create agent."""
    logger.info("Starting ChatDatajud backend...")

    # Initialize Postgres pool
    try:
        await init_pool(settings.database_url)
        logger.info("Postgres pool ready")
    except Exception as e:
        logger.warning(f"Could not connect to Postgres: {e}")

    # Initialize Cube.js client
    cube_client = CubeClient(
        base_url=settings.cube_api_url,
        secret=settings.cube_api_secret,
    )
    app.state.cube_client = cube_client

    # Try to load schema from Cube.js
    schema_text = ""
    try:
        meta = await cube_client.get_meta()
        schema_text = format_schema_for_prompt(meta)
        logger.info(f"Loaded Cube.js schema ({len(meta.get('cubes', []))} cubes)")
    except Exception as e:
        logger.warning(f"Could not load Cube.js schema: {e}")
        schema_text = "Schema não disponível — Cube.js ainda não conectado."

    # Create LLM agent
    agent = LLMAgent(cube_client=cube_client, schema_text=schema_text)
    app.state.agent = agent

    logger.info("ChatDatajud backend ready!")
    yield

    # Cleanup: close persistent HTTP clients
    logger.info("Shutting down ChatDatajud backend...")
    await close_pool()
    await cube_client.close()


app = FastAPI(
    title="ChatDatajud API",
    description="Backend analítico com IA para dados do Datajud",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
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
app.include_router(cube_proxy.router)
app.include_router(pipeline.router)
app.include_router(conversations.router)
