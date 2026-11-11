"""Halaman 7 Dasbor Analitik (F6)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.dashboard import Dashboard
from app.schemas.simulation import Scenario

router = APIRouter(prefix="/analyses/{analysis_id}/dashboard", tags=["dashboard"])


@router.get("", response_model=Dashboard)
def get_dashboard(analysis_id: UUID, scenario: Scenario = Scenario.normal) -> Dashboard:
    """Semua angka sudah lolos verifier (services/report/verifier.py)."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M9")
