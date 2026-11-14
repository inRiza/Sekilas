"""Halaman 3-4: simpan metadata video terburam, URL unggah Supabase Storage, dan antrean job (F2, F3, F7)."""

import json
import re
import subprocess
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, UploadFile, status
from sqlalchemy import select

from app.core.auth import CurrentUserDep
from app.core.config import get_settings
from app.core.db import SessionDep
from app.models.entities import JobRecord, VideoAsset
from app.schemas.common import JobState, JobStatus
from app.schemas.video import (
    VideoCompleteRequest,
    VideoCompleteResponse,
    VideoMetadataIn,
    VideoMetadataOut,
    VideoUploadUrlRequest,
    VideoUploadUrlResponse,
)
from app.services.crud import (
    complete_video_and_enqueue_jobs,
    load_analysis_with_relations,
    upsert_video_metadata,
    video_model_to_schema,
)
from app.services.llm.router import LLMUnavailableError
from app.services.twin.local_runner import VIDEO_EXTS, find_local_video, local_video_dir

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )

    stmt = select(VideoAsset).where(VideoAsset.analysis_id == analysis.id)
    video = session.scalars(stmt).first()
    if video is None:
        return VideoMetadataOut(
            id=f"vid_{analysis.id}",
            analysis_id=analysis.id,
            original_filename=None,
            storage_key=None,
            public_url=None,
            duration_s=0.0,
            cashier_at_s=None,
            width=None,
            height=None,
            accepted=False,
            quality_checks={},
            blurred_faces_count=0,
            blurred_plates_count=0,
        )
    return video_model_to_schema(video)


@router.post("/upload-url", response_model=VideoUploadUrlResponse)
def get_video_upload_url(
    analysis_id: str,
    body: VideoUploadUrlRequest,
    session: SessionDep,
    _user: CurrentUserDep,
) -> VideoUploadUrlResponse:
    """PRD 4.4.2: Hasilkan path storage (`storage_key`) pada bucket `videos` di Supabase Storage."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )

    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", body.filename.strip() or "video_toko.mp4")
    storage_key = f"{analysis.id}/{safe_name}"
    base_url = get_settings().supabase_url.rstrip("/")
    public_url = f"{base_url}/storage/v1/object/public/videos/{storage_key}"
    return VideoUploadUrlResponse(
        bucket="videos",
        storage_key=storage_key,
        public_url=public_url,
    )


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )
    return upsert_video_metadata(session, analysis, body, actor=user.id)


@router.post(
    "/complete", response_model=VideoCompleteResponse, status_code=status.HTTP_202_ACCEPTED
)
def complete_video_upload(
    analysis_id: str,
    body: VideoCompleteRequest,
    session: SessionDep,
    user: CurrentUserDep,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> VideoCompleteResponse:
    """PRD 4.4.2: Konfirmasi titik kasir (`cashier_at_s`) dan antrekan job transkrip VLM + Visual Twin 3D."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )
    if body.cashier_at_s <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Stempel waktu kasir harus lebih dari 0 detik",
        )
    try:
        return complete_video_and_enqueue_jobs(
            session, analysis, body, actor=user.id, idempotency_key=idempotency_key
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get("/processing", response_model=JobState)
def processing_status(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
) -> JobState:
    """Status gabungan untuk halaman 4. Halaman 5 terbuka saat transkrip siap."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )

    stmt = (
        select(JobRecord)
        .where(JobRecord.analysis_id == analysis.id, JobRecord.kind == "transcript")
        .order_by(JobRecord.created_at.desc())
    )
    job = session.scalars(stmt).first()
    if job is not None:
        return JobState(
            job_id=job.id,
            status=JobStatus.done if job.status == "selesai" else JobStatus.running,
            progress=job.progress,
            stage=job.stage or "Transkrip VLM & 3D Visual Twin siap",
        )

    return JobState(
        job_id=f"job_proc_{analysis.id}",
        status=JobStatus.done,
        progress=1.0,
        stage="Transkrip VLM & 3D Visual Twin siap",
    )


MAX_LOCAL_BYTES = 1_000_000_000


def _probe(path: Path) -> tuple[float | None, int | None, int | None]:
    """Durasi dan ukuran video lewat ffprobe (None bila gagal dibaca)."""
    try:
        out = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height:format=duration",
                "-of",
                "json",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        ).stdout
        data = json.loads(out)
        stream = (data.get("streams") or [{}])[0]
        duration = float(data.get("format", {}).get("duration") or 0) or None
        return duration, stream.get("width"), stream.get("height")
    except (subprocess.SubprocessError, ValueError, OSError):
        return None, None, None


@router.post("/file", response_model=VideoMetadataOut)
async def upload_video_file(
    analysis_id: str,
    file: UploadFile,
    session: SessionDep,
    user: CurrentUserDep,
) -> VideoMetadataOut:
    """Mode lokal (PRD 11.2): simpan salinan video terburam di server untuk job Visual Twin.

    Dipakai bersama unggahan ke Supabase Storage; bila salinan lokal tidak ada, job twin
    mengunduh video dari `storage_key`.
    """
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )
    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in VIDEO_EXTS and not (file.content_type or "").startswith("video/"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Kirim file video.")

    folder = local_video_dir()
    folder.mkdir(parents=True, exist_ok=True)
    if (old := find_local_video(analysis.id)) is not None:
        old.unlink(missing_ok=True)
    dest = folder / f"{analysis.id}{ext if ext in VIDEO_EXTS else '.mp4'}"
    size = 0
    with dest.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_LOCAL_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Video lebih dari 1 GB."
                )
            out.write(chunk)

    duration, width, height = _probe(dest)
    stmt = select(VideoAsset).where(VideoAsset.analysis_id == analysis.id)
    existing = session.scalars(stmt).first()
    meta = VideoMetadataIn(
        original_filename=file.filename or dest.name,
        storage_key=existing.storage_key if existing else None,
        duration_s=duration or (existing.duration_s if existing else 48.0),
        cashier_at_s=existing.cashier_at_s if existing else None,
        width=width or (existing.width if existing else None),
        height=height or (existing.height if existing else None),
        blurred_faces_count=existing.blurred_faces_count if existing else 0,
        blurred_plates_count=existing.blurred_plates_count if existing else 0,
    )
    return upsert_video_metadata(session, analysis, meta, actor=user.id)
