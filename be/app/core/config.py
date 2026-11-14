from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "local"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]

    database_url: str = "postgresql+psycopg://sekilas:sekilas@localhost:5432/sekilas"
    supabase_url: str = "https://qqfyitqxrcufjskwaldp.supabase.co"
    supabase_publishable_key: str = "sb_publishable_lcbTN_odHD3JCdPqbUFfLw_vkeTdfWq"
    redis_url: str = "redis://localhost:6379/0"
    storage_dir: Path = Path("./storage")

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-5"
    gemini_api_key: str = ""
    vision_provider: str = "gemini"

    sim_default_agents: int = 500
    sim_default_seed: int = 42

    twin_queue_name: str = "twin"

    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"


@lru_cache
def get_settings() -> Settings:
    return Settings()
