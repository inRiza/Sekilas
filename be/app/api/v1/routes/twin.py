"""Visual Twin (F7). Mode lokal: dibangun oleh services/twin/local_runner.py (COLMAP + Brush)."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.models import Analysis, JobRecord, TwinAsset
from app.schemas.twin import TwinBuild, TwinBuildAssets, TwinBuildJob, TwinMode, TwinStatus
from app.services.twin.local_runner import STAGES, stage_index

router = APIRouter(prefix="/analyses/{analysis_id}/twin", tags=["twin"])


@router.get("", response_model=TwinBuild)
def get_twin(analysis_id: str, session: SessionDep, _user: CurrentUserDep) -> TwinBuild:
    """Job twin terbaru + aset 3D bila ada. FE tidak pernah menerima galat teknis mentah."""
    if session.get(Analysis, analysis_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analisis tidak ditemukan")

    job = session.scalars(
        select(JobRecord)
        .where(JobRecord.analysis_id == analysis_id, JobRecord.kind == "twin")
        .order_by(JobRecord.created_at.desc())
    ).first()
    asset = session.scalars(select(TwinAsset).where(TwinAsset.analysis_id == analysis_id)).first()

    job_out = None
    if job is not None:
        job_out = TwinBuildJob(
            id=job.id,
            status=job.status,
            stage=stage_index(job.stage),
            stage_count=len(STAGES),
            stage_label=job.stage or STAGES[0],
            progress=job.progress,
            message="Tampilan 3D tidak bisa dibangun dari video ini."
            if job.status == "gagal"
            else job.message,
        )

    assets_out = None
    if asset is not None and (asset.splat_url or asset.ply_url):
        assets_out = TwinBuildAssets(
            mode=TwinMode(asset.mode) if asset.mode in TwinMode else TwinMode.pointcloud,
            splat_url=asset.splat_url,
            ply_url=asset.ply_url,
            registered_frames=asset.registered_frames,
            total_frames=asset.total_frames,
            points_count=asset.points_count,
            quality_label=asset.quality_label,
            path_duration_seconds=asset.path_duration_seconds,
            diagnosis_summary=asset.diagnosis_summary,
        )
    return TwinBuild(job=job_out, assets=assets_out)


@router.post("/zones/{zone_id}/rename", response_model=TwinStatus)
def rename_zone(analysis_id: str, zone_id: str, name: str) -> TwinStatus:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M8b")
