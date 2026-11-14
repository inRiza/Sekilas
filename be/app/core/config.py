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
    gemini_model: str = "gemini-3.8-flash"
    # Dipakai berurutan bila model utama membalas 503/504 (kelebihan beban di sisi Google).
    gemini_fallback_models: list[str] = ["gemini-3.6-flash", "gemini-3.5-flash"]
    openai_api_key: str = ""
    openai_model: str = "gpt-6-luna"
    vision_provider: str = "gemini"
    llm_mode: str = "live"  # "mock" (0 token, untuk unit test) atau "live"

    sim_default_agents: int = 20
    sim_default_seed: int = 42
    sim_batch_size: int = 10
    sim_concurrency_limit: int = 2

    twin_queue_name: str = "twin"
    # Mode lokal (PRD 11.2): bangun Visual Twin di thread proses API. Matikan untuk tes.
    twin_local_runner: bool = True
    # Job transkrip di thread latar belakang (PRD 4.4.2). Tes menjalankannya inline.
    jobs_in_background: bool = True

    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"


@lru_cache
def get_settings() -> Settings:
    return Settings()
