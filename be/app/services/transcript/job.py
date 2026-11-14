"""Job transkrip VLM (F3) di latar belakang, sesuai PRD 4.4.2: `video/complete` langsung
membalas 202, lalu transkrip dan Visual Twin dikerjakan paralel.

Dijalankan di thread proses API (sama dengan job twin mode lokal). Progres ditulis ke tabel
`jobs` (kind="transcript") dan dibaca halaman Pemrosesan lewat GET /video/processing.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field

from sqlalchemy import Engine, delete, select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.core.config import get_settings
from app.models import Analysis, JobRecord, TranscriptCheckpoint, TranscriptSegment

log = logging.getLogger(__name__)

STAGE_QUEUED = "Menunggu antrean"
STAGE_READING = "AI membaca frame video"
STAGE_DONE = "Transkrip VLM selesai diekstrak"
STAGE_FAILED = "Transkrip gagal dibaca"


@dataclass
class TranscriptJobArgs:
    job_id: str
    analysis_id: str
    duration_s: float
    cashier_at_s: float
    frame_keys: list[str] = field(default_factory=list)
    timestamps_s: list[float] = field(default_factory=list)


def _set(sessions: sessionmaker[Session], job_id: str, **fields: object) -> None:
    with sessions() as s:
        job = s.get(JobRecord, job_id)
        if job is None:
            return
        for k, v in fields.items():
            setattr(job, k, v)
        s.commit()


def run_transcript_job(engine: Engine, args: TranscriptJobArgs) -> None:
    """Baca keyframe lewat VLM, ganti segmen + checkpoint lama, tandai job selesai/gagal."""
    sessions = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    _set(sessions, args.job_id, status="berjalan", stage=STAGE_READING, progress=0.2)
    try:
        # Impor di sini: extractor memuat klien LLM yang berat.
        from app.services.transcript.extractor import extract_transcript_with_gemini

        with sessions() as s:
            analysis = s.scalars(
                select(Analysis)
                .options(
                    selectinload(Analysis.business),
                    selectinload(Analysis.context),
                    selectinload(Analysis.menu_items),
                )
                .where(Analysis.id == args.analysis_id)
            ).first()
            if analysis is None:
                raise LookupError("Analisis sudah dihapus.")

            segments, checkpoints = extract_transcript_with_gemini(
                analysis=analysis,
                duration_s=args.duration_s,
                cashier_at_s=args.cashier_at_s,
                frame_keys=args.frame_keys,
                timestamps_s=args.timestamps_s,
            )
            s.execute(
                delete(TranscriptCheckpoint).where(TranscriptCheckpoint.analysis_id == analysis.id)
            )
            s.execute(delete(TranscriptSegment).where(TranscriptSegment.analysis_id == analysis.id))
            s.add_all(segments)
            s.flush()
            s.add_all(checkpoints)
            job = s.get(JobRecord, args.job_id)
            if job is not None:
                job.status, job.stage, job.progress = "selesai", STAGE_DONE, 1.0
            s.commit()
    except Exception as exc:  # job tidak boleh membuat thread mati diam-diam
        log.exception("transcript job %s gagal", args.job_id)
        _set(sessions, args.job_id, status="gagal", stage=STAGE_FAILED, message=str(exc)[:500])


def start_transcript_job(session: Session, args: TranscriptJobArgs) -> None:
    """Jalankan job setelah transaksi pemanggil commit (lihat `launch_transcript`)."""
    session.info.setdefault("transcript_jobs", []).append(args)


def launch_transcript(session: Session) -> None:
    """Mulai job transkrip yang diantrekan di sesi ini. Tes menjalankannya inline."""
    engine = session.get_bind()
    assert isinstance(engine, Engine)
    for args in session.info.pop("transcript_jobs", []):
        if get_settings().jobs_in_background:
            threading.Thread(
                target=run_transcript_job,
                args=(engine, args),
                name=f"transcript-{args.job_id}",
                daemon=True,
            ).start()
        else:
            run_transcript_job(engine, args)
