"""PRD 4.4.2: analisis (status, next_action), konteks F1, dan status job."""

from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import SessionDep
from app.models import Analysis, Job
from app.schemas.api_v14 import AnalysisOut, JobOut
from app.services.presenters import analysis_out, job_out

router = APIRouter(prefix="/analyses", tags=["analyses"])


def get_analysis(aid: str, session: Session) -> Analysis:
    analysis = session.get(Analysis, aid)
    if analysis is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {"code": "analysis_not_found", "message": "Analisis tidak ditemukan."},
        )
    return analysis


@router.get("/{aid}", response_model=AnalysisOut)
def read_analysis(aid: str, session: SessionDep) -> AnalysisOut:
    return analysis_out(get_analysis(aid, session))


@router.put("/{aid}/context", response_model=AnalysisOut)
def save_context(aid: str, context: dict[str, Any], session: SessionDep) -> AnalysisOut:
    """Simpan snapshot konteks F1. Setelah ada hasil, perubahan menandai analisis kedaluwarsa."""
    analysis = get_analysis(aid, session)
    if analysis.is_demo:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"code": "demo_read_only", "message": "Analisis demo hanya bisa dibaca."},
        )
    analysis.context = context
    if analysis.status in ("draft", "konteks"):
        analysis.status = "video"
    elif analysis.status in ("simulasi", "siap"):
        analysis.stale, analysis.stale_reason = True, "context_changed"
    session.commit()
    return analysis_out(analysis)


@router.get("/{aid}/jobs", response_model=list[JobOut])
def list_jobs(aid: str, session: SessionDep) -> list[JobOut]:
    return [job_out(j) for j in get_analysis(aid, session).jobs]


@router.get("/{aid}/jobs/{job_id}", response_model=JobOut)
def read_job(aid: str, job_id: str, session: SessionDep) -> JobOut:
    job = session.get(Job, job_id)
    if job is None or job.analysis_id != get_analysis(aid, session).id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, {"code": "job_not_found", "message": "Job tidak ditemukan."}
        )
    return job_out(job)
