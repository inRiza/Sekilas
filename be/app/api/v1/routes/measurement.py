"""Halaman 9 Rencana Pengukuran (F6.F)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.measurement import MeasurementPlan

router = APIRouter(prefix="/analyses/{analysis_id}/measurement-plan", tags=["measurement"])


@router.post("", response_model=MeasurementPlan)
def create_plan(analysis_id: UUID) -> MeasurementPlan:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M12")
