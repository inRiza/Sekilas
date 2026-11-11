"""Job latar belakang (arq + Redis). Jalankan: uv run arq app.workers.tasks.WorkerSettings"""

from typing import ClassVar

from arq.connections import RedisSettings

from app.core.config import get_settings


async def build_transcript(ctx: dict, analysis_id: str) -> None:
    raise NotImplementedError("M3")


async def run_simulation(ctx: dict, analysis_id: str) -> None:
    raise NotImplementedError("M6")


class WorkerSettings:
    functions: ClassVar = [build_transcript, run_simulation]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
