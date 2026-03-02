from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct:free"
    openrouter_fallback_models: list[str] = [
        "meta-llama/llama-3.1-70b-instruct:free",
        "qwen/qwen3-235b-a22b:free",
    ]
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    cube_api_url: str = "http://chatdatajud-cube:4000/cubejs-api/v1"
    cube_api_secret: str = ""
    database_url: str = "postgresql://datajud:datajud_secret@postgres-pgvector:5432/datajud"
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"


settings = Settings()
