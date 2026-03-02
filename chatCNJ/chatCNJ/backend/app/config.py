from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct:free"
    openrouter_fallback_models: list[str] = [
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "google/gemma-3-27b-it:free",
    ]
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # EXA Deep Research
    exa_api_key: str = ""
    exa_model: str = "exa-research"
    exa_base_url: str = "https://api.exa.ai"

    # Database
    # In production, provide `DATABASE_URL` via env or .env. Example in .env.example.
    # For local dev you can uncomment a dev fallback below, but avoid committing secrets.
    # database_url: str = "postgresql://normas:normas_secret@postgres:5432/normas"  # dev fallback (commented)
    database_url: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost", "http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()

