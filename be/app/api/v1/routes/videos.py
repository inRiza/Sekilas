"""PRD 4.4.2 Video: unggah video terburam, lalu kirim titik kasir untuk memicu job Visual Twin.

Mode lokal: video diunggah langsung (multipart) ke API, bukan lewat URL unggah bertanda tangan.
Job transkrip (VLM) belum ada; yang berjalan hanya job Visual Twin (F7, mode lokal 11.2).
"""

import json
import shutil
import subprocess
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Response, UploadFile, status

from app.api.v1.routes.analyses import get_analysis
from app.core.config import get_settings
from app.core.db import SessionDep
from app.schemas.api_v14 import JobOut, VideoComplete, VideoUploadOut
from app.services.presenters import job_out
from app.services.twin.local_runner import start_twin_job

router = APIRouter(prefix="/analyses/{aid}/video", tags=["video"])

MAX_BYTES = 1_000_000_000
MIN_S, MAX_S = 20, 180  # PRD F2


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


def _err(code: int, key: str, message: str) -> HTTPException:
    return HTTPException(code, {"code": key, "message": message})


@router.post("", response_model=VideoUploadOut)
async def upload_video(aid: str, file: UploadFile, session: SessionDep) -> VideoUploadOut:
    analysis = get_analysis(aid, session)
    if analysis.is_demo:
        raise _err(status.HTTP_409_CONFLICT, "demo_read_only", "Analisis demo hanya bisa dibaca.")
    if not (file.content_type or "").startswith("video/"):
        raise _err(status.HTTP_422_UNPROCESSABLE_ENTITY, "not_a_video", "Kirim file video.")

    folder = get_settings().storage_dir / "videos"
    folder.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "video.mp4").suffix.lower() or ".mp4"
    dest = folder / f"{analysis.id}{ext}"
    size = 0
    with dest.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise _err(
                    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    "video_too_large",
                    "Video lebih dari 1 GB.",
                )
            out.write(chunk)

    duration, width, height = _probe(dest)
    if duration is not None and not (MIN_S <= duration <= MAX_S):
        dest.unlink(missing_ok=True)
        raise _err(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "video_duration_out_of_range",
            f"Durasi video harus {MIN_S} detik sampai {MAX_S // 60} menit.",
        )

    analysis.video_path = str(dest.resolve())
    analysis.video_filename = file.filename
    analysis.video_duration_s, analysis.video_width, analysis.video_height = duration, width, height
    analysis.cashier_at_s = duration  # bawaan: akhir video, dikonfirmasi pemilik di /complete
    if analysis.status in ("draft", "konteks"):
        analysis.status = "video"
    session.commit()
    return VideoUploadOut(
        filename=file.filename or dest.name, duration_s=duration, width=width, height=height
    )


@router.post("/complete", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
def complete_video(
    aid: str,
    body: VideoComplete,
    response: Response,
    session: SessionDep,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JobOut:
    """Konfirmasi titik kasir, lalu mulai job Visual Twin (202 + Location, idempoten)."""
    analysis = get_analysis(aid, session)
    if not analysis.video_path or not Path(analysis.video_path).exists():
        raise _err(status.HTTP_409_CONFLICT, "video_missing", "Unggah video dulu.")
    if analysis.video_duration_s and body.cashier_at_s > analysis.video_duration_s + 0.5:
        raise _err(
            status.HTTP_409_CONFLICT, "cashier_out_of_range", "Titik kasir melebihi durasi video."
        )
    if shutil.which("ffmpeg") is None:
        raise _err(
            status.HTTP_503_SERVICE_UNAVAILABLE, "twin_tools_missing", "ffmpeg belum terpasang."
        )

    analysis.cashier_at_s = body.cashier_at_s
    session.commit()
    job = start_twin_job(session, analysis, idempotency_key)
    response.headers["Location"] = f"{get_settings().api_prefix}/analyses/{aid}/jobs/{job.id}"
    return job_out(job)
