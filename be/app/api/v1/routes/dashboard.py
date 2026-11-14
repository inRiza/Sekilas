"""Halaman 7 Dasbor Analitik (F6)."""

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.schemas.dashboard import DashboardDataOut, WhatIfProjectionOut, WhatIfRequest
from app.services.crud import build_dashboard_data, load_analysis_with_relations

router = APIRouter(prefix="/analyses/{analysis_id}/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardDataOut)
def get_dashboard(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
) -> DashboardDataOut:
    """Ambil data Dasbor Analitik terpadu (KPI, Corong, Poin Utama, Rekomendasi Pareto, Waypoint, dan Proyeksi What-If)."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
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
    dash = build_dashboard_data(
        session,
        analysis,
        checked_recommendation_ids=body.checked_recommendation_ids,
        projection_mode=body.mode,
    )
    if dash.what_if_projection is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Gagal menghitung proyeksi")
    return dash.what_if_projection
