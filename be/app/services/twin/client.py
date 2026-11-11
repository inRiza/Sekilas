"""F7: kirim job ke worker GPU (folder twin/) dan baca hasilnya."""

from app.schemas.twin import TwinStatus


async def enqueue_build(analysis_id: str, video_path: str) -> str:
    raise NotImplementedError("M8b")


async def get_status(analysis_id: str) -> TwinStatus:
    raise NotImplementedError("M8b")
