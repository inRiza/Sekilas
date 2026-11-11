"""Pembungkus LLM. Semua panggilan dicatat ke Langfuse (seed, versi prompt)."""

from app.core.config import get_settings


def complete(prompt_name: str, variables: dict, *, json_schema: dict | None = None) -> str:
    settings = get_settings()
    _ = settings.anthropic_model
    raise NotImplementedError
