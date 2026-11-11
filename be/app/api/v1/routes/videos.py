"""Halaman 3-4: unggah video terburam, lalu mulai transkrip + Visual Twin paralel (F2, F3, F7)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.schemas.common import JobState
from app.schemas.video import VideoUploadResult

router = APIRouter(prefix="/analyses/{analysis_id}/video", tags=["video"])


@router.post("", response_model=VideoUploadResult)
async def upload_video(analysis_id: UUID, file: UploadFile) -> VideoUploadResult:
    """Video sudah diburamkan di browser (MediaPipe). Server cek kualitas lagi lalu antrekan job."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M2")


@router.get("/processing", response_model=JobState)
def processing_status(analysis_id: UUID) -> JobState:
    """Status gabungan untuk halaman 4. Halaman 5 terbuka saat transkrip siap."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M3")
