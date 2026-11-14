"""Ubah baris database menjadi respons API PRD 4.4 (status, next_action, label kualitas)."""

from app.models import Analysis, Business, Job, TwinAsset
from app.schemas.api_v14 import (
    AnalysisOut,
    AnalysisSummary,
    BusinessOut,
    JobOut,
    NextAction,
    TwinAssetOut,
)
from app.services.twin.local_runner import STAGES

# Rute frontend per status (PRD 4.4.6: klien tidak menebak langkah berikutnya).
_NEXT: dict[str, tuple[str, str]] = {
    "draft": ("/business/analysis/konteks?aid={id}", "Isi konteks usaha"),
    "konteks": ("/business/analysis/konteks?aid={id}", "Isi konteks usaha"),
    "video": ("/business/analysis/video?aid={id}", "Rekam atau unggah video"),
    "memproses": ("/business/analysis/proses?aid={id}", "Lihat pemrosesan"),
    "verifikasi": ("/business/analysis/verifikasi?aid={id}", "Lanjut verifikasi"),
    "simulasi": ("/analisis/{id}/simulasi", "Lihat simulasi"),
    "siap": ("/business/analysis?aid={id}", "Buka dasbor"),
}


def next_action(analysis: Analysis) -> NextAction:
    route, label = _NEXT.get(analysis.status, _NEXT["konteks"])
    return NextAction(route=route.format(id=analysis.id), label=label)


def quality_label(asset: TwinAsset | None) -> str | None:
    """Gerbang kualitas F7: porsi frame yang berhasil dipetakan."""
    if asset is None or asset.frames <= 0:
        return None
    ratio = asset.registered / asset.frames
    if ratio >= 0.8:
        return "Kualitas baik"
    if ratio >= 0.5:
        return "Kualitas cukup"
    return "Kualitas rendah"


def analysis_summary(a: Analysis) -> AnalysisSummary:
    return AnalysisSummary(
        id=a.id,
        business_id=a.business_id,
        name=a.name,
        status=a.status,  # type: ignore[arg-type]
        stale=a.stale,
        stale_reason=a.stale_reason,
        is_demo=a.is_demo,
        quality_label=quality_label(a.twin),
        created_at=a.created_at,
        next_action=next_action(a),
    )


def analysis_out(a: Analysis) -> AnalysisOut:
    return AnalysisOut(
        **analysis_summary(a).model_dump(),
        context=a.context or {},
        transcript_version=a.transcript_version,
        persona_version=a.persona_version,
        video_filename=a.video_filename,
        video_duration_s=a.video_duration_s,
        cashier_at_s=a.cashier_at_s,
    )


def primary_analysis(b: Business) -> Analysis | None:
    """Analisis utama: yang disematkan, atau analisis siap terbaru, atau yang terbaru."""
    if b.primary_analysis_id:
        pinned = next((a for a in b.analyses if a.id == b.primary_analysis_id), None)
        if pinned:
            return pinned
    ready = [a for a in b.analyses if a.status == "siap" or a.twin is not None]
    pool = ready or list(b.analyses)
    return max(pool, key=lambda a: a.created_at) if pool else None


def business_out(b: Business) -> BusinessOut:
    primary = primary_analysis(b)
    action = (
        next_action(primary)
        if primary
        else NextAction(route=f"/businesses/analyses?bid={b.id}", label="Mulai analisis pertama")
    )
    return BusinessOut(
        id=b.id,
        name=b.name,
        branch_name=b.branch_name,
        category=b.category,
        address=b.address,
        analysis_count=len(b.analyses),
        primary_analysis=analysis_summary(primary) if primary else None,
        next_action=action,
        created_at=b.created_at,
    )


def job_out(j: Job) -> JobOut:
    return JobOut(
        id=j.id,
        kind=j.kind,
        status=j.status,  # type: ignore[arg-type]
        stage=j.stage,
        stage_count=len(STAGES) - 1,
        stage_label=j.stage_label,
        progress=j.progress,
        message=j.message,
        started_at=j.started_at,
        finished_at=j.finished_at,
    )


def twin_asset_out(asset: TwinAsset) -> TwinAssetOut:
    summary = (asset.diagnosis or {}).get("summary") if isinstance(asset.diagnosis, dict) else None
    return TwinAssetOut(
        splat_url=asset.splat_url,
        ply_url=asset.ply_url,
        path_url=asset.path_url,
        frames=asset.frames,
        registered=asset.registered,
        points=asset.points,
        build_seconds=asset.build_seconds,
        quality_label=quality_label(asset) or "Kualitas rendah",
        diagnosis_summary=summary,
    )
