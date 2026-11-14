"""Halaman 9 Rencana Pengukuran (F6-G)."""

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.schemas.measurement import MeasurementPlanDataOut
from app.services.crud import get_or_create_measurement_plan, load_analysis_with_relations

router = APIRouter(prefix="/analyses/{analysis_id}/measurement-plan", tags=["measurement"])


@router.get("", response_model=MeasurementPlanDataOut)
@router.post("", response_model=MeasurementPlanDataOut)
def get_measurement_plan(
    analysis_id: str,
    session: SessionDep,
    _user: CurrentUserDep,
) -> MeasurementPlanDataOut:
    """Ambil atau buat rencana pengukuran lapangan manual (Lembar Tally F6-G)."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    return get_or_create_measurement_plan(session, analysis)
