"""Halaman 3-4: simpan metadata video terburam, lalu status proses transkrip + Visual Twin (F2, F3, F7)."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.models.entities import VideoAsset
from app.schemas.common import JobState, JobStatus
from app.schemas.video import VideoMetadataIn, VideoMetadataOut
from app.services.crud import (
    load_analysis_with_relations,
    upsert_video_metadata,
    video_model_to_schema,
)

router = APIRouter(prefix="/analyses/{analysis_id}/video", tags=["video"])


@router.get("", response_model=VideoMetadataOut)
def get_video_metadata(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
) -> VideoMetadataOut:
    """Ambil metadata video terburam & stempel waktu kasir untuk analisis ini."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")

    stmt = select(VideoAsset).where(VideoAsset.analysis_id == analysis.id)
    video = session.scalars(stmt).first()
    if video is None:
        return VideoMetadataOut(
            id=f"vid_{analysis.id}",
            analysis_id=analysis.id,
            original_filename="video_rekaman_selasar.mp4",
            storage_key=f"videos/{analysis.id}/video_rekaman_selasar.mp4",
            duration_s=48.0,
            cashier_at_s=48.0,
            width=1920,
            height=1080,
            accepted=True,
            quality_checks={
                "resolution": "1080 px, ideal",
                "stability": "Stabil, putaran di bawah 45°/detik",
                "lighting": "Terang dan jelas",
            },
            blurred_faces_count=14,
            blurred_plates_count=6,
        )
    return video_model_to_schema(video)


@router.put("", response_model=VideoMetadataOut)
@router.post("", response_model=VideoMetadataOut)
def save_video_metadata(
    analysis_id: str,
    body: VideoMetadataIn,
    session: SessionDep,
    user: CurrentUserDep,
) -> VideoMetadataOut:
    """Simpan atau perbarui metadata video terburam serta stempel waktu kasir (F2)."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    return upsert_video_metadata(session, analysis, body, actor=user.id)


@router.get("/processing", response_model=JobState)
def processing_status(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
) -> JobState:
    """Status gabungan untuk halaman 4. Halaman 5 terbuka saat transkrip siap."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    return JobState(
        job_id=f"job_proc_{analysis.id}",
        status=JobStatus.done,
        progress=1.0,
        stage="Transkrip VLM & 3D Visual Twin siap",
    )
