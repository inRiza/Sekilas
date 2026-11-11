"""Entry worker arq. Jalankan di mesin GPU: uv run arq twin_worker.main.WorkerSettings"""

import os
import tempfile
from pathlib import Path
from typing import ClassVar

from arq.connections import RedisSettings

from twin_worker.contracts import TwinJob
from twin_worker.pipeline import build


async def build_twin(ctx: dict, job: dict) -> dict:
    parsed = TwinJob.model_validate(job)
    with tempfile.TemporaryDirectory() as tmp:
        return build(parsed, Path(tmp)).model_dump()


class WorkerSettings:
    functions: ClassVar = [build_twin]
    queue_name = os.getenv("TWIN_QUEUE_NAME", "twin")
    redis_settings = RedisSettings.from_dsn(
        os.getenv("REDIS_URL", "redis://localhost:6379/0")
    )
