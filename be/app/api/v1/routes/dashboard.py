"""Halaman 7 Dasbor Analitik (F6)."""

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.schemas.dashboard import DashboardDataOut
from app.services.crud import build_dashboard_data, load_analysis_with_relations

router = APIRouter(prefix="/analyses/{analysis_id}/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardDataOut)
def get_dashboard(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
) -> DashboardDataOut:
    """Ambil data Dasbor Analitik terpadu (KPI, Corong, Poin Utama, Rekomendasi Pareto, dan Meta 3D)."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    return build_dashboard_data(session, analysis)
