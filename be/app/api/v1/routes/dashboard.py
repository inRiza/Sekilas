"""Halaman 7 Dasbor Analitik (F6)."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.models.entities import AgentDecisionRecord
from app.schemas.dashboard import DashboardDataOut, WhatIfProjectionOut, WhatIfRequest
from app.services.crud import build_dashboard_data, load_analysis_with_relations
from app.services.llm.router import LLMUnavailableError

router = APIRouter(prefix="/analyses/{analysis_id}/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardDataOut)
def get_dashboard(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
    require_existing: bool = False,
) -> DashboardDataOut:
    """Ambil data Dasbor Analitik terpadu (KPI, Corong, Poin Utama, Rekomendasi Pareto, Waypoint, dan Proyeksi What-If)."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    if require_existing:
        has_decisions = (
            session.scalar(
                select(func.count(AgentDecisionRecord.id)).where(
                    AgentDecisionRecord.analysis_id == analysis_id
                )
            )
            or 0
        ) > 0
        if not has_decisions:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="SIMULATION_REQUIRED",
            )
    return build_dashboard_data(session, analysis)


@router.post("/what-if", response_model=WhatIfProjectionOut)
def run_what_if(
    analysis_id: str,
    body: WhatIfRequest,
    session: SessionDep,
    _user: CurrentUserDep,
) -> WhatIfProjectionOut:
    """Hitung proyeksi pasca-simulasi (What-If) sesuai daftar ID rekomendasi yang dicentang pemilik usaha."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    try:
        dash = build_dashboard_data(
            session,
            analysis,
            checked_recommendation_ids=body.checked_recommendation_ids,
            projection_mode=body.mode,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    if dash.what_if_projection is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Gagal menghitung proyeksi")
    return dash.what_if_projection
