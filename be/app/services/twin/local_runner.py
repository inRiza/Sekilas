"""Visual Twin mode lokal (PRD 11.2): menjalankan twin/scripts/local_twin.sh untuk satu analisis.

Job dijalankan di thread latar belakang dalam proses API (cukup untuk demo; produksi memakai
antrean worker, PRD 4.2). Progres dibaca dari keluaran skrip baris per baris dan ditulis ke
tabel `jobs` (JobRecord.stage = label tahap); hasil akhir ditulis ke `twin_assets`. Berkas 3D
diterbitkan skrip ke fe/public/samples/<nama>.* sehingga dilayani Next.js di /samples/...

Sumber video: salinan lokal hasil POST /analyses/{id}/video/file, atau bila tidak ada,
diunduh dari Supabase Storage lewat `videos.storage_key`.
"""

from __future__ import annotations

import json
import logging
import re
import subprocess
import threading
from pathlib import Path
from uuid import uuid4

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models import Analysis, JobRecord, TwinAsset, VideoAsset

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[4]
TWIN_ROOT = REPO_ROOT / "twin"
SAMPLES_DIR = REPO_ROOT / "fe" / "public" / "samples"
SCRIPT = TWIN_ROOT / "scripts" / "local_twin.sh"

SPLAT_STEPS = 2000
VIDEO_EXTS = (".mp4", ".mov", ".webm", ".m4v")

# Tahap yang ditampilkan ke pemilik (JobRecord.stage menyimpan labelnya).
STAGES = [
    "Menunggu antrean",
    "Mengambil frame dari video",
    "Mencari titik khas di tiap frame",
    "Mencocokkan frame berurutan",
    "Menyusun posisi kamera dan peta titik",
    "Membangun tampilan 3D realistis",
    "Selesai",
]

# Penanda di keluaran local_twin.sh -> tahap yang SEDANG berjalan (indeks STAGES).
_MARKERS: list[tuple[re.Pattern[str], int]] = [
    (re.compile(r"\] 1/4 "), 1),  # mulai ambil frame
    (re.compile(r"\] 2/4 "), 2),  # mulai cari fitur
    (re.compile(r"fitur selesai"), 3),  # mulai cocokkan frame
    (re.compile(r"pencocokan selesai"), 4),  # mulai susun pose + titik
    (re.compile(r"\] 4/4 Gaussian splat"), 5),  # mulai bangun splat
    (re.compile(r"\] Selesai"), 6),
]


def stage_index(label: str | None) -> int:
    return STAGES.index(label) if label in STAGES else 0


def quality_label(ratio: float) -> str:
    if ratio >= 0.8:
        return "Kualitas baik"
    if ratio >= 0.5:
        return "Kualitas cukup"
    return "Kualitas rendah"


def fps_for_duration(duration_s: float | None) -> int:
    """Targetkan sekitar 150 frame: video jalan kaki butuh frame rapat (uji: 2 fps 15%, 5 fps 69%)."""
    if not duration_s or duration_s <= 0:
        return 3
    return max(2, min(5, round(150 / duration_s)))


def twin_name(analysis_id: str) -> str:
    return re.sub(r"[^a-zA-Z0-9-]", "-", analysis_id)


def local_video_dir() -> Path:
    return get_settings().storage_dir / "videos"


def find_local_video(analysis_id: str) -> Path | None:
    for ext in VIDEO_EXTS:
        p = local_video_dir() / f"{analysis_id}{ext}"
        if p.exists():
            return p
    return None


def _download_from_storage(analysis_id: str, storage_key: str) -> Path:
    """Unduh video terburam dari bucket `videos` Supabase ke penyimpanan lokal."""
    if storage_key.startswith(("http://", "https://")):
        url = storage_key
    else:
        base = get_settings().supabase_url.rstrip("/")
        url = f"{base}/storage/v1/object/public/videos/{storage_key.removeprefix('videos/')}"
    ext = Path(storage_key).suffix.lower()
    dest = local_video_dir() / f"{analysis_id}{ext if ext in VIDEO_EXTS else '.mp4'}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.stream("GET", url, timeout=120.0, follow_redirects=True) as res:
        res.raise_for_status()
        with dest.open("wb") as out:
            for chunk in res.iter_bytes(1024 * 1024):
                out.write(chunk)
    return dest


def _update_job(job_id: str, **fields: object) -> None:
    with SessionLocal() as s:
        job = s.get(JobRecord, job_id)
        if job is None:
            return
        for k, v in fields.items():
            setattr(job, k, v)
        s.commit()


def publish_asset(session: Session, analysis_id: str, name: str) -> TwinAsset:
    """Tulis hasil pipeline (fe/public/samples/<name>.json) ke baris twin_assets analisis."""
    meta = json.loads((SAMPLES_DIR / f"{name}.json").read_text())
    files: list[str] = meta.get("files", [])
    asset = session.scalars(select(TwinAsset).where(TwinAsset.analysis_id == analysis_id)).first()
    if asset is None:
        asset = TwinAsset(id=f"tw_{uuid4().hex[:10]}", analysis_id=analysis_id)
        session.add(asset)
    frames = int(meta.get("frames", 0))
    registered = int(meta.get("registered", 0))
    asset.ply_url = f"/samples/{name}.ply" if f"{name}.ply" in files else None
    asset.splat_url = f"/samples/{name}.splat" if f"{name}.splat" in files else None
    asset.mode = "splat" if asset.splat_url else "pointcloud"
    asset.total_frames = frames
    asset.registered_frames = registered
    asset.points_count = int(meta.get("points", 0))
    asset.quality_label = quality_label(registered / frames if frames else 0.0)
    diagnosis = meta.get("diagnosis")
    asset.diagnosis_summary = diagnosis.get("summary") if isinstance(diagnosis, dict) else None
    if isinstance(meta.get("up"), list):
        asset.up_vector = meta["up"]
    path_file = meta.get("camera_path")
    if path_file and (SAMPLES_DIR / path_file).exists():
        # [{frame, timestamp_s, position{x,y,z}, up, forward}, ...]
        poses = json.loads((SAMPLES_DIR / path_file).read_text())
        if isinstance(poses, list) and poses:
            asset.camera_path = poses
            asset.path_duration_seconds = float(poses[-1].get("timestamp_s") or 0.0)
    return asset


def _run(job_id: str, analysis_id: str, label: str, fps: int) -> None:
    name = twin_name(analysis_id)
    log_path = TWIN_ROOT / "work" / name / "job.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    _update_job(job_id, status="berjalan", stage="Menyiapkan video", progress=0.0)

    tail: list[str] = []
    stage = 0
    code = -1
    try:
        video = find_local_video(analysis_id)
        if video is None:
            with SessionLocal() as s:
                row = s.scalars(
                    select(VideoAsset).where(VideoAsset.analysis_id == analysis_id)
                ).first()
                key = row.storage_key if row else None
            if not key:
                raise FileNotFoundError("Video belum diunggah ke server.")
            video = _download_from_storage(analysis_id, key)

        cmd = ["bash", str(SCRIPT), str(video.resolve()), name, "--fps", str(fps), "--label", label]
        cmd += ["--splat", "--steps", str(SPLAT_STEPS)]
        _update_job(job_id, stage=STAGES[0])
        with (
            log_path.open("w") as logf,
            subprocess.Popen(
                cmd, cwd=TWIN_ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
            ) as proc,
        ):
            assert proc.stdout is not None
            for line in proc.stdout:
                logf.write(line)
                logf.flush()
                tail = (tail + [line.rstrip()])[-4:]
                for pattern, idx in _MARKERS:
                    if idx > stage and pattern.search(line):
                        stage = idx
                        _update_job(
                            job_id,
                            stage=STAGES[stage],
                            progress=round(stage / (len(STAGES) - 1), 3),
                        )
            code = proc.wait()
    except Exception as exc:  # job tidak boleh membuat thread mati diam-diam
        log.exception("twin job %s gagal", job_id)
        tail.append(str(exc))

    with SessionLocal() as s:
        job = s.get(JobRecord, job_id)
        if job is None:
            return
        if code == 0:
            try:
                asset = publish_asset(s, analysis_id, name)
                job.status, job.stage, job.progress = "selesai", STAGES[-1], 1.0
                job.result_ref_id = asset.id
                analysis = s.get(Analysis, analysis_id)
                if analysis is not None:
                    analysis.quality_label = asset.quality_label
            except (OSError, ValueError, KeyError) as exc:
                job.status, job.message = "gagal", f"Hasil 3D tidak bisa dibaca: {exc}"
        else:
            job.status = "gagal"
            job.message = " ".join(tail) or "Pembangunan 3D gagal."
        s.commit()


def start_twin_job(
    session: Session, analysis: Analysis, video: VideoAsset, idempotency_key: str | None = None
) -> JobRecord:
    """Antrekan job Visual Twin untuk video analisis.

    Idempoten: job yang masih antre/berjalan dipakai ulang, begitu pula job dengan
    Idempotency-Key yang sama.
    """
    running = session.scalars(
        select(JobRecord)
        .where(
            JobRecord.analysis_id == analysis.id,
            JobRecord.kind == "twin",
            JobRecord.status.in_(["antre", "berjalan"]),
        )
        .order_by(JobRecord.created_at.desc())
    ).first()
    if running is not None:
        return running
    if idempotency_key:
        same = session.scalars(
            select(JobRecord).where(JobRecord.idempotency_key == idempotency_key)
        ).first()
        if same is not None:
            return same

    job = JobRecord(
        id=f"job_tw_{uuid4().hex[:10]}",
        analysis_id=analysis.id,
        kind="twin",
        status="antre",
        stage=STAGES[0],
        progress=0.0,
        idempotency_key=idempotency_key,
    )
    session.add(job)
    session.flush()

    args = (
        job.id,
        analysis.id,
        video.original_filename or analysis.name,
        fps_for_duration(video.duration_s),
    )
    # Thread dimulai setelah transaksi pemanggil commit agar job sudah terlihat.
    pending: list[tuple[str, str, str, int]] = session.info.setdefault("twin_jobs", [])
    pending.append(args)
    return job


def launch_pending(session: Session) -> None:
    """Jalankan thread untuk job twin yang diantrekan di sesi ini (panggil setelah commit)."""
    for args in session.info.pop("twin_jobs", []):
        threading.Thread(target=_run, args=args, name=f"twin-{args[0]}", daemon=True).start()


def fail_orphaned_jobs() -> None:
    """Job twin 'berjalan' saat server mati tidak akan selesai; tandai gagal saat start ulang."""
    with SessionLocal() as s:
        stmt = select(JobRecord).where(
            JobRecord.kind == "twin", JobRecord.status.in_(["antre", "berjalan"])
        )
        for job in s.scalars(stmt):
            job.status = "gagal"
            job.message = "Server dimulai ulang saat job berjalan. Coba lagi."
        s.commit()
