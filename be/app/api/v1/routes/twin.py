"""Visual Twin (F7). Mode lokal: dibangun oleh services/twin/local_runner.py (COLMAP + Brush)."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.models import Analysis, JobRecord, TranscriptSegment, TwinAsset
from app.schemas.twin import TwinBuild, TwinBuildAssets, TwinBuildJob, TwinMode, Zone, ZoneRename
from app.services.twin.local_runner import STAGES, is_runner_job, stage_index

router = APIRouter(prefix="/analyses/{analysis_id}/twin", tags=["twin"])

# Zona jalur = sudut pandang segmen transkrip (F3), berurutan dari jalan sampai titik kasir (F7).
ZONE_DEFAULTS = {
    "jalan": ("Jalan depan", "terlihat"),
    "pintu": ("Pintu atau tangga", "mendekat"),
    "dalam": ("Dalam toko sampai kasir", "masuk"),
}


def _zones(session: Session, analysis_id: str, asset: TwinAsset) -> list[Zone]:
    """Rentang waktu tiap zona dari segmen transkrip; nama dari ubahan pemilik bila ada."""
    names = {
        z["id"]: z["name"]
        for z in asset.zones or []
        if isinstance(z, dict) and "id" in z and "name" in z
    }
    segs = session.scalars(
        select(TranscriptSegment)
        .where(TranscriptSegment.analysis_id == analysis_id)
        .order_by(TranscriptSegment.timestamp_start)
    ).all()
    zones: list[Zone] = []
    for vantage, (default_name, funnel_stage) in ZONE_DEFAULTS.items():
        own = [sg for sg in segs if sg.vantage == vantage]
        if not own:
            continue
        zones.append(
            Zone(
                id=vantage,
                name=names.get(vantage, default_name),
                funnel_stage=funnel_stage,
                start_s=min(sg.timestamp_start for sg in own),
                end_s=max(sg.timestamp_end for sg in own),
            )
        )
    return zones


def _twin_out(session: Session, analysis_id: str) -> TwinBuild:
    # Job placeholder lama (sebelum runner lokal) tidak pernah selesai; abaikan.
    jobs = session.scalars(
        select(JobRecord)
        .where(JobRecord.analysis_id == analysis_id, JobRecord.kind == "twin")
        .order_by(JobRecord.created_at.desc())
    ).all()
    job = next((j for j in jobs if is_runner_job(j)), None)
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
            zones=_zones(session, analysis_id, asset),
        )
    return TwinBuild(job=job_out, assets=assets_out)


@router.get("", response_model=TwinBuild)
def get_twin(analysis_id: str, session: SessionDep, _user: CurrentUserDep) -> TwinBuild:
    """Job twin terbaru + aset 3D dan zona bila ada. FE tidak pernah menerima galat teknis mentah."""
    if session.get(Analysis, analysis_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analisis tidak ditemukan")
    return _twin_out(session, analysis_id)


@router.post("/zones/{zone_id}/rename", response_model=TwinBuild)
def rename_zone(
    analysis_id: str,
    zone_id: str,
    body: ZoneRename,
    session: SessionDep,
    _user: CurrentUserDep,
) -> TwinBuild:
    """F7: pemilik mengganti nama zona jalur (misal "Pintu atau tangga" -> "Tangga ke lantai 2")."""
    if zone_id not in ZONE_DEFAULTS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Zona tidak ditemukan")
    asset = session.scalars(select(TwinAsset).where(TwinAsset.analysis_id == analysis_id)).first()
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Visual Twin belum ada untuk analisis ini")
    others = [z for z in asset.zones or [] if isinstance(z, dict) and z.get("id") != zone_id]
    asset.zones = [*others, {"id": zone_id, "name": body.name.strip()}]
    session.commit()
    return _twin_out(session, analysis_id)
