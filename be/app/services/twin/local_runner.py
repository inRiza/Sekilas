"""Visual Twin mode lokal (PRD 11.2): menjalankan twin/scripts/local_twin.sh untuk satu analisis.

Job dijalankan di thread latar belakang dalam proses API (cukup untuk demo; produksi memakai
antrean worker, PRD 4.2). Progres dibaca dari keluaran skrip baris per baris dan ditulis ke
tabel `jobs`; hasil akhir ditulis ke `twin_assets`. Berkas 3D diterbitkan skrip ke
fe/public/samples/<nama>.* sehingga dilayani Next.js di /samples/...
"""

from __future__ import annotations

import json
import logging
import re
import subprocess
import threading
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models import Analysis, Job, TwinAsset

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[4]
TWIN_ROOT = REPO_ROOT / "twin"
SAMPLES_DIR = REPO_ROOT / "fe" / "public" / "samples"
SCRIPT = TWIN_ROOT / "scripts" / "local_twin.sh"

SPLAT_STEPS = 2000

# Tahap yang ditampilkan ke pemilik; indeks = Job.stage.
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


def fps_for_duration(duration_s: float | None) -> int:
    """Targetkan sekitar 150 frame: video jalan kaki butuh frame rapat (uji: 2 fps 15%, 5 fps 69%)."""
    if not duration_s or duration_s <= 0:
        return 3
    return max(2, min(5, round(150 / duration_s)))


def twin_name(analysis_id: str) -> str:
    return analysis_id.replace("_", "-")


def _now() -> datetime:
    return datetime.now(UTC)


def _update_job(job_id: str, **fields: object) -> None:
    with SessionLocal() as s:
        job = s.get(Job, job_id)
        if job is None:
            return
        for k, v in fields.items():
            setattr(job, k, v)
        s.commit()


def _publish_asset(session: Session, analysis: Analysis, name: str) -> TwinAsset:
    meta = json.loads((SAMPLES_DIR / f"{name}.json").read_text())
    files: list[str] = meta.get("files", [])
    asset = session.get(TwinAsset, analysis.id) or TwinAsset(analysis_id=analysis.id, name=name)
    asset.name = name
    asset.ply_url = f"/samples/{name}.ply" if f"{name}.ply" in files else None
    asset.splat_url = f"/samples/{name}.splat" if f"{name}.splat" in files else None
    asset.path_url = f"/samples/{meta['camera_path']}" if meta.get("camera_path") else None
    asset.frames = int(meta.get("frames", 0))
    asset.registered = int(meta.get("registered", 0))
    asset.points = int(meta.get("points", 0))
    asset.build_seconds = int(meta.get("seconds", 0))
    asset.diagnosis = meta.get("diagnosis")
    session.add(asset)
    return asset


def _run(job_id: str, analysis_id: str, video_path: str, label: str, fps: int) -> None:
    name = twin_name(analysis_id)
    log_path = TWIN_ROOT / "work" / name / "job.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    _update_job(
        job_id,
        status="berjalan",
        started_at=_now(),
        stage=0,
        stage_label="Menyiapkan",
        log_path=str(log_path),
    )

    cmd = ["bash", str(SCRIPT), video_path, name, "--fps", str(fps), "--label", label]
    cmd += ["--splat", "--steps", str(SPLAT_STEPS)]
    tail: list[str] = []
    stage = 0
    try:
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
                            stage=stage,
                            stage_label=STAGES[stage],
                            progress=round(stage / (len(STAGES) - 1), 3),
                        )
            code = proc.wait()
    except Exception as exc:  # job tidak boleh membuat thread mati diam-diam
        log.exception("twin job %s gagal", job_id)
        code = -1
        tail.append(str(exc))

    with SessionLocal() as s:
        job = s.get(Job, job_id)
        analysis = s.get(Analysis, analysis_id)
        if job is None or analysis is None:
            return
        job.finished_at = _now()
        if code == 0:
            try:
                _publish_asset(s, analysis, name)
                job.status, job.stage, job.progress = "selesai", len(STAGES) - 1, 1.0
                job.stage_label = STAGES[-1]
                if analysis.status == "memproses":
                    analysis.status = "verifikasi"
            except (OSError, ValueError, KeyError) as exc:
                job.status, job.message = "gagal", f"Hasil 3D tidak bisa dibaca: {exc}"
        else:
            job.status = "gagal"
            job.message = " ".join(tail) or "Pembangunan 3D gagal."
        s.commit()


def start_twin_job(session: Session, analysis: Analysis, idempotency_key: str | None) -> Job:
    """Buat job twin untuk video analisis (idempoten per kunci dan per video)."""
    existing = session.scalars(
        select(Job)
        .where(Job.analysis_id == analysis.id, Job.kind == "twin", Job.status != "gagal")
        .order_by(Job.created_at.desc())
    ).first()
    if existing and (idempotency_key is None or existing.idempotency_key == idempotency_key):
        return existing

    from app.core.ids import new_id

    job = Job(
        id=new_id("job"), analysis_id=analysis.id, kind="twin", idempotency_key=idempotency_key
    )
    session.add(job)
    analysis.status = "memproses"
    session.commit()

    assert analysis.video_path
    threading.Thread(
        target=_run,
        args=(
            job.id,
            analysis.id,
            analysis.video_path,
            analysis.video_filename or analysis.name,
            fps_for_duration(analysis.video_duration_s),
        ),
        name=f"twin-{job.id}",
        daemon=True,
    ).start()
    return job


def fail_orphaned_jobs() -> None:
    """Job 'berjalan' saat server mati tidak akan selesai; tandai gagal saat start ulang."""
    with SessionLocal() as s:
        for job in s.scalars(select(Job).where(Job.status.in_(["antre", "berjalan"]))):
            job.status = "gagal"
            job.message = "Server dimulai ulang saat job berjalan. Coba lagi."
            job.finished_at = _now()
        s.commit()
