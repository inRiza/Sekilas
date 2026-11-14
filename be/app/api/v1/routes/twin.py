"""PRD 4.4.3: aset Visual Twin satu analisis beserta status job pembangunnya (F7)."""

from fastapi import APIRouter

from app.api.v1.routes.analyses import get_analysis
from app.core.db import SessionDep
from app.schemas.api_v14 import TwinOut
from app.services.presenters import job_out, twin_asset_out

router = APIRouter(prefix="/analyses/{aid}/twin", tags=["twin"])


@router.get("", response_model=TwinOut)
def get_twin(aid: str, session: SessionDep) -> TwinOut:
    """Job twin terbaru + aset bila sudah jadi. FE tidak pernah menerima galat teknis mentah."""
    analysis = get_analysis(aid, session)
    twin_jobs = [j for j in analysis.jobs if j.kind == "twin"]
    latest = twin_jobs[-1] if twin_jobs else None
    return TwinOut(
        job=job_out(latest) if latest else None,
        assets=twin_asset_out(analysis.twin) if analysis.twin else None,
    )
