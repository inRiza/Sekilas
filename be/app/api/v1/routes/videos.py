"""Halaman 3-4: simpan metadata video terburam, Signed URL Supabase Storage, dan antrean job (F2, F3, F7)."""

import json
import mimetypes
import re
import subprocess
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy import func, select

from app.core.auth import CurrentUserDep
from app.core.config import get_settings
from app.core.db import SessionDep
from app.core.storage import (
    DEFAULT_VIDEO_BUCKET,
    build_authorized_media_url,
    build_backend_media_url,
    create_supabase_signed_upload_url,
    download_supabase_object,
    extract_bearer_token,
    extract_bucket_object_key,
    sign_media_query,
    verify_media_signature,
)
from app.models.entities import JobRecord, TranscriptSegment, VideoAsset
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
    request: Request,
    session: SessionDep,
    _user: CurrentUserDep,
    authorization: Annotated[str | None, Header()] = None,
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
    return video_model_to_schema(
        video,
        bearer_token=extract_bearer_token(authorization),
        base_url=str(request.base_url).rstrip("/"),
    )


@router.post("/upload-url", response_model=VideoUploadUrlResponse)
def get_video_upload_url(
    analysis_id: str,
    body: VideoUploadUrlRequest,
    request: Request,
    session: SessionDep,
    _user: CurrentUserDep,
    authorization: Annotated[str | None, Header()] = None,
) -> VideoUploadUrlResponse:
    """PRD 4.4.2: Hasilkan Signed Upload URL & Signed Read URL berotorisasi di bucket `videos`."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )

    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", body.filename.strip() or "video_toko.mp4")
    storage_key = f"{analysis.id}/{safe_name}"
    bearer = extract_bearer_token(authorization)
    base_url = str(request.base_url).rstrip("/")
    ttl = get_settings().signed_url_ttl_seconds

    signed_upload = create_supabase_signed_upload_url(storage_key, bearer_token=bearer)
    upload_token: str | None = None
    if signed_upload is not None:
        upload_url, upload_token = signed_upload
    else:
        expires, sig = sign_media_query(analysis.id, storage_key, ttl_seconds=ttl)
        api_prefix = get_settings().api_prefix.rstrip("/")
        upload_url = (
            f"{base_url}{api_prefix}/analyses/{analysis.id}/video/file"
            f"?key={storage_key}&expires={expires}&sig={sig}"
        )

    signed_read_url = build_authorized_media_url(
        analysis.id,
        storage_key,
        bearer_token=bearer,
        base_url=base_url,
        expires_in=ttl,
    ) or build_backend_media_url(analysis.id, storage_key, base_url=base_url, ttl_seconds=ttl)

    return VideoUploadUrlResponse(
        bucket=DEFAULT_VIDEO_BUCKET,
        storage_key=storage_key,
        signed_url=signed_read_url,
        upload_url=upload_url,
        upload_token=upload_token,
        expires_in=ttl,
        public_url=signed_read_url,
    )


@router.get("/media")
def get_signed_video_media(
    analysis_id: str,
    key: Annotated[str, Query()],
    expires: Annotated[int, Query()],
    sig: Annotated[str, Query()],
    session: SessionDep,
) -> Response:
    """Sajikan video/frame secara terotorisasi setelah memverifikasi Signed URL HMAC & expiry."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )
    clean_key = extract_bucket_object_key(key, analysis_id=analysis.id)
    if clean_key is None or not clean_key.startswith(f"{analysis.id}/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Kunci media tidak valid."
        )
    if not verify_media_signature(analysis.id, clean_key, expires, sig):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Signed URL media tidak valid atau sudah kedaluwarsa.",
        )

    # 1. Cek penyimpanan lokal (upload melalui /video/file)
    storage_candidate = (get_settings().storage_dir / DEFAULT_VIDEO_BUCKET / clean_key).resolve()
    storage_root = (get_settings().storage_dir / DEFAULT_VIDEO_BUCKET).resolve()
    if storage_candidate.is_relative_to(storage_root) and storage_candidate.is_file():
        mime = mimetypes.guess_type(storage_candidate.name)[0] or "application/octet-stream"
        return Response(
            content=storage_candidate.read_bytes(),
            media_type=mime,
            headers={"Cache-Control": "private, max-age=300"},
        )

    # Cek salinan video lokal <analysis_id>.ext jika bukan subfolder frames/
    if "/frames/" not in clean_key:
        local_vid = find_local_video(analysis.id)
        if local_vid is not None and local_vid.is_file():
            mime = mimetypes.guess_type(local_vid.name)[0] or "video/mp4"
            return Response(
                content=local_vid.read_bytes(),
                media_type=mime,
                headers={"Cache-Control": "private, max-age=300"},
            )

    # 2. Ambil secara server-side dari Supabase Storage tanpa mengekspos URL publik
    downloaded = download_supabase_object(clean_key, bucket=DEFAULT_VIDEO_BUCKET)
    if downloaded is not None:
        content, content_type = downloaded
        return Response(
            content=content,
            media_type=content_type or mimetypes.guess_type(clean_key)[0] or "application/octet-stream",
            headers={"Cache-Control": "private, max-age=300"},
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="File media tidak ditemukan."
    )


@router.put("", response_model=VideoMetadataOut)
@router.post("", response_model=VideoMetadataOut)
def save_video_metadata(
    analysis_id: str,
    body: VideoMetadataIn,
    request: Request,
    session: SessionDep,
    user: CurrentUserDep,
    authorization: Annotated[str | None, Header()] = None,
) -> VideoMetadataOut:
    """Simpan atau perbarui metadata video terburam serta stempel waktu kasir (F2)."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan"
        )
    return upsert_video_metadata(
        session,
        analysis,
        body,
        actor=user.id,
        bearer_token=extract_bearer_token(authorization),
        base_url=str(request.base_url).rstrip("/"),
    )


@router.post(
    "/complete", response_model=VideoCompleteResponse, status_code=status.HTTP_202_ACCEPTED
)
def complete_video_upload(
    analysis_id: str,
    body: VideoCompleteRequest,
    request: Request,
    session: SessionDep,
    user: CurrentUserDep,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    authorization: Annotated[str | None, Header()] = None,
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
            session,
            analysis,
            body,
            actor=user.id,
            idempotency_key=idempotency_key,
            bearer_token=extract_bearer_token(authorization),
            base_url=str(request.base_url).rstrip("/"),
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


_JOB_STATUS = {
    "antre": JobStatus.queued,
    "berjalan": JobStatus.running,
    "selesai": JobStatus.done,
    "gagal": JobStatus.failed,
}


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
            status=_JOB_STATUS.get(job.status, JobStatus.running),
            progress=job.progress,
            stage=job.stage or "Transkrip VLM & 3D Visual Twin siap",
            message="AI belum bisa membaca video ini. Coba unggah ulang."
            if job.status == "gagal"
            else None,
        )

    segments_count = (
        session.scalar(
            select(func.count(TranscriptSegment.id)).where(
                TranscriptSegment.analysis_id == analysis.id
            )
        )
        or 0
    )
    if segments_count > 0:
        return JobState(
            job_id=f"job_proc_{analysis.id}",
            status=JobStatus.done,
            progress=1.0,
            stage="Transkrip VLM siap",
        )

    return JobState(
        job_id=f"job_proc_{analysis.id}",
        status=JobStatus.queued,
        progress=0.0,
        stage="Menunggu video dikirim",
        message="Video belum dikirim untuk diproses.",
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
