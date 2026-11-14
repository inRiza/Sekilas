"""Layanan CRUD & Simulasi Dinamis untuk Business, Analysis, Context, Video, Transkrip, Agen, dan Dasbor (PRD v1.4)."""

import random
from collections import Counter
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.entities import (
    AgentDecisionRecord,
    AuditLog,
    JobRecord,
    MeasurementPlanRecord,
    Persona,
    RecommendationItem,
    SimulationRun,
    TranscriptSegment,
    TwinAsset,
    UserAccount,
    VideoAsset,
)
from app.models.entities import (
    Analysis as AnalysisModel,
)
from app.models.entities import (
    AnalysisContext as AnalysisContextModel,
)
from app.models.entities import (
    Business as BusinessModel,
)
from app.models.entities import (
    MenuItem as MenuItemModel,
)
from app.schemas.analysis import Analysis as AnalysisSchema
from app.schemas.business import BusinessOut
from app.schemas.context import (
    BusinessContext,
    MenuItem,
    OpeningHours,
    RushHourRange,
    calculate_price_level,
)
from app.schemas.dashboard import (
    DashboardDataOut,
    DashboardKpiOut,
    FunnelStageDataOut,
    KeyInsightOut,
    ParetoRecommendationOut,
    VisualTwinMetaOut,
    WaypointOut,
    WhatIfProjectionOut,
    WhatIfStageComparisonOut,
)
from app.schemas.measurement import MeasurementMetricSchema, MeasurementPlanDataOut
from app.schemas.simulation import AgentDecisionOut, PersonaSpecOut
from app.schemas.transcript import (
    CameraPoseSchema,
    TranscriptSegmentCreate,
    TranscriptSegmentOut,
    TranscriptSegmentUpdate,
)
from app.schemas.video import (
    VideoCompleteRequest,
    VideoCompleteResponse,
    VideoMetadataIn,
    VideoMetadataOut,
)
from app.services.transcript.quality import evaluate_video_metrics
from app.services.twin.local_runner import launch_pending, start_twin_job

DEFAULT_USER_ID = "usr_01"

BUSINESS_TYPE_LABEL = {
    "warung": "Warung makan",
    "kedai": "Kedai kopi",
    "kafe": "Kafe santai",
    "resto_ruko": "Restoran ruko",
}

SURROUNDINGS_LABEL = {
    "dekat_kampus": "kawasan dekat kampus",
    "perkantoran": "area perkantoran",
    "permukiman": "permukiman warga",
    "jalan_utama": "tepi jalan utama",
    "lainnya": "area komersial sekitar",
}


def _mmss(seconds: float) -> str:
    clamped = max(0, round(seconds))
    return f"{clamped // 60:02d}:{clamped % 60:02d}"


def _format_rp_short(amount: int) -> str:
    if amount >= 1_000_000:
        jt = amount / 1_000_000
        formatted = f"{jt:.1f}".replace(".", ",")
        formatted = formatted.removesuffix(",0")
        return f"Rp {formatted} Juta"
    if amount >= 1_000:
        rb = round(amount / 1_000)
        return f"Rp {rb}rb"
    return f"Rp {amount:,}".replace(",", ".")


def ensure_user(session: Session, user_id: str = DEFAULT_USER_ID) -> UserAccount:
    user = session.get(UserAccount, user_id)
    if user is None:
        user = UserAccount(
            id=user_id,
            name="Budi Santoso",
            email=f"{user_id}@sekilas.id",
        )
        session.add(user)
        session.flush()
    return user


def default_context_for_business(
    name: str,
    category: str,
    address: str,
    raw: dict[str, Any] | None = None,
) -> BusinessContext:
    data = dict(raw or {})
    btype = data.get("business_type") or category or "kedai"
    if btype not in ("warung", "kedai", "kafe", "resto_ruko"):
        btype = "kedai"

    surroundings = list(data.get("surroundings") or [])
    surroundings_type = data.get("surroundings_type") or (surroundings[0] if surroundings else "jalan_utama")
    if not surroundings and surroundings_type:
        surroundings = [surroundings_type]

    raw_menu = data.get("menu_items") or []
    menu_items = [
        MenuItem(
            id=m.get("id") or f"mi_{idx + 1}",
            name=str(m.get("name", "")),
            price=int(m.get("price", 0)),
            source=str(m.get("source", "manual")),
        )
        for idx, m in enumerate(raw_menu)
        if isinstance(m, dict) and m.get("name")
    ]
    price_level = calculate_price_level(menu_items) if menu_items else data.get("calculated_price_level", "hemat")

    opening_raw = data.get("opening_hours") or {}
    opening_hours = OpeningHours(
        open=str(opening_raw.get("open", data.get("open_hour", "08:00"))),
        close=str(opening_raw.get("close", data.get("close_hour", "22:00"))),
    )
    rush_raw = data.get("rush_hours") or [{"start": "12:00", "end": "14:00"}]
    rush_hours = [
        RushHourRange(start=str(r.get("start", "12:00")), end=str(r.get("end", "14:00")))
        for r in rush_raw
        if isinstance(r, dict)
    ] or [RushHourRange()]

    raw_loc = str(data.get("location_name") or address or "").strip()
    if raw_loc in ("Alamat tempat usaha", "Alamat tempat usaha baru"):
        raw_loc = ""
    raw_desc = str(data.get("location_description") or "").strip()
    if raw_desc == "Akses masuk dari jalan raya":
        raw_desc = ""

    return BusinessContext(
        business_type=btype,  # type: ignore[arg-type]
        business_name=str(data.get("business_name") or name),
        location_name=raw_loc,
        location_lat=data.get("location_lat"),
        location_lng=data.get("location_lng"),
        location_description=raw_desc,
        surroundings_type=surroundings_type,  # type: ignore[arg-type]
        surroundings=surroundings,  # type: ignore[arg-type]
        surroundings_other=data.get("surroundings_other"),
        passersby=list(data.get("passersby") or ["mahasiswa", "pekerja_kantor"]),  # type: ignore[arg-type]
        business_goal=data.get("business_goal") or "lebih_banyak_pembeli_baru",
        fixed_constraints=list(data.get("fixed_constraints") or []),  # type: ignore[arg-type]
        menu_items=menu_items,
        calculated_price_level=price_level,  # type: ignore[arg-type]
        opening_hours=opening_hours,
        rush_hours=rush_hours,
        daily_sales_rp=data.get("daily_sales_rp"),
        daily_visitors=data.get("daily_visitors"),
        parking=list(data.get("parking") or []),  # type: ignore[arg-type]
    )


def context_model_to_schema(
    ctx: AnalysisContextModel,
    menu_rows: list[MenuItemModel],
) -> BusinessContext:
    surroundings = list(ctx.surroundings or [])
    surroundings_type = surroundings[0] if surroundings else "jalan_utama"
    menu_items = [
        MenuItem(id=item.id, name=item.name, price=item.price, source=item.source)
        for item in sorted(menu_rows, key=lambda x: x.sort_order)
    ]
    rush_hours = [
        RushHourRange(start=str(r.get("start", "12:00")), end=str(r.get("end", "14:00")))
        for r in (ctx.rush_hours or [])
        if isinstance(r, dict)
    ] or [RushHourRange()]

    return BusinessContext(
        business_type=ctx.business_type,  # type: ignore[arg-type]
        business_name=ctx.business_name,
        location_name=ctx.location_name,
        location_lat=ctx.location_lat,
        location_lng=ctx.location_lng,
        location_description=ctx.location_description,
        surroundings_type=surroundings_type,  # type: ignore[arg-type]
        surroundings=surroundings,  # type: ignore[arg-type]
        surroundings_other=ctx.surroundings_other,
        passersby=list(ctx.passersby or []),  # type: ignore[arg-type]
        business_goal=ctx.business_goal,  # type: ignore[arg-type]
        fixed_constraints=list(ctx.fixed_constraints or []),  # type: ignore[arg-type]
        menu_items=menu_items,
        calculated_price_level=ctx.calculated_price_level,  # type: ignore[arg-type]
        opening_hours=OpeningHours(open=ctx.open_hour, close=ctx.close_hour),
        rush_hours=rush_hours,
        daily_sales_rp=ctx.daily_sales_rp,
        daily_visitors=ctx.daily_visitors,
        parking=list(ctx.parking or []),  # type: ignore[arg-type]
    )


def business_to_schema(biz: BusinessModel, analyses_count: int = 0) -> BusinessOut:
    ctx = default_context_for_business(
        name=biz.name,
        category=biz.category,
        address=biz.address,
        raw=biz.default_context,
    )
    return BusinessOut(
        id=biz.id,
        user_id=biz.user_id,
        owner_id=biz.owner_id or biz.user_id,
        name=biz.name,
        branch_name=biz.branch_name,
        category=biz.category,  # type: ignore[arg-type]
        address=biz.address,
        primary_analysis_id=biz.primary_analysis_id,
        context=ctx,
        analyses_count=analyses_count,
        created_at=biz.created_at,
        updated_at=biz.updated_at,
    )


def analysis_to_schema(analysis: AnalysisModel) -> AnalysisSchema:
    biz = analysis.business
    ctx_schema: BusinessContext | None = None
    if analysis.context is not None:
        ctx_schema = context_model_to_schema(analysis.context, list(analysis.menu_items or []))
    elif biz is not None:
        ctx_schema = default_context_for_business(
            name=biz.name,
            category=biz.category,
            address=biz.address,
            raw=biz.default_context,
        )

    business_type = (
        analysis.context.business_type
        if analysis.context is not None
        else (biz.category if biz is not None else "kedai")
    )
    return AnalysisSchema(
        id=analysis.id,
        business_id=analysis.business_id,
        business_name=biz.name if biz is not None else (ctx_schema.business_name if ctx_schema else ""),
        branch_name=biz.branch_name if biz is not None else "Pusat",
        name=analysis.name,
        business_type=business_type,
        created_at=analysis.created_at,
        updated_at=analysis.updated_at,
        status=analysis.status,
        stale=analysis.stale,
        quality_label=analysis.quality_label,
        total_agents=analysis.total_agents,
        thumbnail_url=analysis.thumbnail_url,
        context=ctx_schema,
    )


def upsert_analysis_context(
    session: Session,
    analysis: AnalysisModel,
    payload: BusinessContext,
) -> BusinessContext:
    surroundings = list(payload.surroundings or [])
    if not surroundings and payload.surroundings_type:
        surroundings = [payload.surroundings_type]
    primary_surrounding = surroundings[0] if surroundings else payload.surroundings_type

    calculated_level = calculate_price_level(payload.menu_items)

    ctx = analysis.context
    if ctx is None:
        ctx = AnalysisContextModel(
            id=f"ctx_{uuid4().hex[:12]}",
            analysis_id=analysis.id,
            business_type=payload.business_type,
            business_name=payload.business_name,
            location_name=payload.location_name,
            location_lat=payload.location_lat,
            location_lng=payload.location_lng,
            location_description=payload.location_description,
            surroundings=surroundings,
            surroundings_other=payload.surroundings_other,
            passersby=list(payload.passersby),
            business_goal=payload.business_goal,
            fixed_constraints=list(payload.fixed_constraints),
            calculated_price_level=calculated_level,
            open_hour=payload.opening_hours.open,
            close_hour=payload.opening_hours.close,
            rush_hours=[r.model_dump() for r in payload.rush_hours],
            daily_sales_rp=payload.daily_sales_rp,
            daily_visitors=payload.daily_visitors,
            parking=list(payload.parking),
        )
        session.add(ctx)
        analysis.context = ctx
    else:
        ctx.business_type = payload.business_type
        ctx.business_name = payload.business_name
        ctx.location_name = payload.location_name
        ctx.location_lat = payload.location_lat
        ctx.location_lng = payload.location_lng
        ctx.location_description = payload.location_description
        ctx.surroundings = surroundings
        ctx.surroundings_other = payload.surroundings_other
        ctx.passersby = list(payload.passersby)
        ctx.business_goal = payload.business_goal
        ctx.fixed_constraints = list(payload.fixed_constraints)
        ctx.calculated_price_level = calculated_level
        ctx.open_hour = payload.opening_hours.open
        ctx.close_hour = payload.opening_hours.close
        ctx.rush_hours = [r.model_dump() for r in payload.rush_hours]
        ctx.daily_sales_rp = payload.daily_sales_rp
        ctx.daily_visitors = payload.daily_visitors
        ctx.parking = list(payload.parking)

    # Replace menu items cleanly
    for old_item in list(analysis.menu_items):
        session.delete(old_item)
    session.flush()

    new_menu_rows: list[MenuItemModel] = []
    for idx, item in enumerate(payload.menu_items):
        if not item.name.strip():
            continue
        row = MenuItemModel(
            id=f"mi_{uuid4().hex[:12]}",
            analysis_id=analysis.id,
            name=item.name.strip(),
            price=item.price,
            source=item.source or "manual",
            sort_order=idx,
        )
        session.add(row)
        new_menu_rows.append(row)
    analysis.menu_items = new_menu_rows

    # Mark analysis stale if it was already ready
    if analysis.status == "ready":
        analysis.stale = True
        reasons = list(analysis.stale_reasons or [])
        if "context_changed" not in reasons:
            reasons.append("context_changed")
        analysis.stale_reasons = reasons

    # Sync business default_context so future analyses in this branch prefill with latest context
    if analysis.business is not None:
        synced = payload.model_copy(
            update={
                "surroundings_type": primary_surrounding,
                "surroundings": surroundings,
                "calculated_price_level": calculated_level,
                "menu_items": [
                    MenuItem(id=r.id, name=r.name, price=r.price, source=r.source) for r in new_menu_rows
                ],
            }
        )
        analysis.business.default_context = synced.model_dump()
        analysis.business.category = payload.business_type
        if payload.business_name.strip():
            analysis.business.name = payload.business_name.strip()
        if payload.location_name.strip():
            analysis.business.address = payload.location_name.strip()

    session.flush()
    return context_model_to_schema(ctx, new_menu_rows)


def load_analysis_with_relations(session: Session, analysis_id: str) -> AnalysisModel | None:
    stmt = (
        select(AnalysisModel)
        .options(
            selectinload(AnalysisModel.business),
            selectinload(AnalysisModel.context),
            selectinload(AnalysisModel.menu_items),
        )
        .where(AnalysisModel.id == analysis_id)
    )
    return session.scalars(stmt).first()


def count_analyses_by_business(session: Session, business_ids: list[str]) -> dict[str, int]:
    if not business_ids:
        return {}
    stmt = (
        select(AnalysisModel.business_id, func.count(AnalysisModel.id))
        .where(AnalysisModel.business_id.in_(business_ids))
        .group_by(AnalysisModel.business_id)
    )
    return {biz_id: int(cnt) for biz_id, cnt in session.execute(stmt).all()}


# ============================================================================
# F2: Video Asset CRUD
# ============================================================================
def _resolve_video_public_url(storage_key: str | None) -> str | None:
    if not storage_key:
        return None
    if storage_key.startswith(("http://", "https://")):
        return storage_key
    # Legacy seed placeholder keys don't exist as actual files in bucket
    if storage_key.startswith("videos/selasar-kopi/"):
        return None
    base_url = get_settings().supabase_url.rstrip("/")
    if not base_url:
        return None
    clean_key = storage_key.removeprefix("videos/")
    return f"{base_url}/storage/v1/object/public/videos/{clean_key}"


def video_model_to_schema(video: VideoAsset) -> VideoMetadataOut:
    return VideoMetadataOut(
        id=video.id,
        analysis_id=video.analysis_id,
        original_filename=video.original_filename,
        storage_key=video.storage_key,
        public_url=_resolve_video_public_url(video.storage_key),
        duration_s=video.duration_s,
        cashier_at_s=video.cashier_at_s,
        width=video.width,
        height=video.height,
        accepted=video.accepted,
        quality_checks={str(k): str(v) for k, v in (video.quality_checks or {}).items()},
        blurred_faces_count=video.blurred_faces_count,
        blurred_plates_count=video.blurred_plates_count,
    )


def upsert_video_metadata(
    session: Session,
    analysis: AnalysisModel,
    payload: VideoMetadataIn,
    actor: str = "owner",
) -> VideoMetadataOut:
    stmt = select(VideoAsset).where(VideoAsset.analysis_id == analysis.id)
    video = session.scalars(stmt).first()
    quality, evaluated_checks = evaluate_video_metrics(
        duration_s=payload.duration_s,
        width=payload.width or 1920,
        height=payload.height or 1080,
    )
    checks = payload.quality_checks or evaluated_checks
    accepted = payload.accepted and quality.accepted

    if video is None:
        video = VideoAsset(
            id=f"vid_{uuid4().hex[:12]}",
            analysis_id=analysis.id,
            original_filename=payload.original_filename,
            storage_key=payload.storage_key or f"{analysis.id}/{payload.original_filename}",
            duration_s=payload.duration_s,
            cashier_at_s=payload.cashier_at_s if payload.cashier_at_s is not None else payload.duration_s,
            width=payload.width or 1920,
            height=payload.height or 1080,
            accepted=accepted,
            quality_checks=checks,
            blurred_faces_count=payload.blurred_faces_count,
            blurred_plates_count=payload.blurred_plates_count,
        )
        session.add(video)
    else:
        video.original_filename = payload.original_filename
        if payload.storage_key:
            video.storage_key = payload.storage_key
        video.duration_s = payload.duration_s
        if payload.cashier_at_s is not None:
            video.cashier_at_s = payload.cashier_at_s
        if payload.width is not None:
            video.width = payload.width
        if payload.height is not None:
            video.height = payload.height
        video.accepted = accepted
        video.quality_checks = checks
        video.blurred_faces_count = payload.blurred_faces_count
        video.blurred_plates_count = payload.blurred_plates_count

    session.add(
        AuditLog(
            id=f"aud_{uuid4().hex[:12]}",
            analysis_id=analysis.id,
            actor=actor,
            action="video.upsert",
            entity_type="video",
            entity_id=video.id,
            after_state=payload.model_dump(),
        )
    )
    session.flush()
    session.commit()
    return video_model_to_schema(video)


def _generate_contextual_segments(
    analysis: AnalysisModel,
    duration_s: float,
    cashier_at_s: float,
    frame_keys: list[str] | None = None,
) -> list[TranscriptSegment]:
    """Bangun segmen transkrip VLM secara kontekstual sesuai profil usaha, menu, dan durasi video."""
    ctx = analysis.context
    biz = analysis.business
    bname = (ctx.business_name if ctx else (biz.name if biz else analysis.name)) or "Tempat Usaha"
    btype_key = ctx.business_type if ctx else (biz.category if biz else "kedai")
    btype_label = BUSINESS_TYPE_LABEL.get(btype_key, "Tempat usaha")
    loc_name = (ctx.location_name if ctx else (biz.address if biz else "")) or "lokasi usaha"
    loc_desc = (ctx.location_description if ctx and ctx.location_description else "") or f"fasad depan {bname}"
    surroundings = list(ctx.surroundings or []) if ctx else ["jalan_utama"]
    surr_label = ", ".join(SURROUNDINGS_LABEL.get(s, s) for s in surroundings[:2]) or "jalan utama"
    parking = list(ctx.parking or []) if ctx else []

    menus = sorted(analysis.menu_items or [], key=lambda m: m.sort_order)
    if menus:
        sample_menus = ", ".join(f"{m.name} (Rp {m.price:,})".replace(",", ".") for m in menus[:3])
        min_price = min(m.price for m in menus)
        min_price_str = f"Rp {min_price // 1000}rb" if min_price >= 1000 else f"Rp {min_price}"
    else:
        sample_menus = "menu utama toko"
        min_price_str = "harga terjangkau"

    parking_note = (
        "Tampak kendaraan parkir di depan akses masuk yang sedikit menghalangi pandangan bawah fasad."
        if ("motor" in parking or "mobil" in parking)
        else "Bahu jalan di depan toko cukup terbuka namun belum ada penanda parkir khusus."
    )

    end_time = max(10.0, min(cashier_at_s or duration_s, duration_s))
    t1 = round(end_time * 0.25, 1)
    t2 = round(end_time * 0.55, 1)
    t3 = round(end_time * 0.80, 1)

    settings = get_settings()
    base_prefix = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/videos/{analysis.id}/frames"
    fk = list(frame_keys or [])
    f1 = [fk[0]] if len(fk) >= 1 else [f"{base_prefix}/frame_01.jpg"]
    f2 = [fk[1]] if len(fk) >= 2 else (f1 if fk else [f"{base_prefix}/frame_02.jpg"])
    f3 = [fk[2]] if len(fk) >= 3 else (f2 if fk else [f"{base_prefix}/frame_03.jpg"])
    f4 = [fk[3]] if len(fk) >= 4 else (f3 if fk else [f"{base_prefix}/frame_04.jpg"])

    return [
        TranscriptSegment(
            id=f"seg_{uuid4().hex[:8]}",
            analysis_id=analysis.id,
            timestamp_start=0.0,
            timestamp_end=t1,
            frame_keys=f1,
            vantage="jalan",
            zone_id="trotoar_depan",
            narrative=(
                f"Kamera menyusuri {surr_label} di sekitar {loc_name} mendekati {bname} ({btype_label}). "
                f"Kondisi fisik: {loc_desc}. {parking_note}"
            ),
            not_visible=(
                f"Informasi daftar menu ({sample_menus}) beserta kisaran harga mulai {min_price_str} "
                f"belum terbaca dari jarak pandang pejalan kaki di jalan."
            ),
            confidence="stabil",
            is_confirmed_by_owner=True,
        ),
        TranscriptSegment(
            id=f"seg_{uuid4().hex[:8]}",
            analysis_id=analysis.id,
            timestamp_start=t1,
            timestamp_end=t2,
            frame_keys=f2,
            vantage="pintu",
            zone_id="depan_pintu",
            narrative=(
                f"Berhenti di titik transisi menuju pintu/akses masuk {bname}. "
                f"Pandangan mengarah ke area masuk ({loc_desc}), namun kontras pencahayaan bagian dalam tampak lebih redup dibanding luar."
            ),
            not_visible=(
                f"Tidak terlihat standing banner menu unggulan atau penanda 'BUKA' yang jelas di depan akses masuk {bname}."
            ),
            confidence="tidak_pasti",
            is_confirmed_by_owner=False,
        ),
        TranscriptSegment(
            id=f"seg_{uuid4().hex[:8]}",
            analysis_id=analysis.id,
            timestamp_start=t2,
            timestamp_end=t3,
            frame_keys=f3,
            vantage="pintu",
            zone_id="ambang_pintu",
            narrative=(
                f"Melangkah melewati ambang pintu {bname}. Mulai terlihat penataan ruang dalam serta arah menuju titik pemesanan."
            ),
            not_visible="Informasi promo paket hemat atau rekomendasi menu favorit bagi pengunjung baru belum terpampang di pintu.",
            confidence="tidak_pasti",
            is_confirmed_by_owner=False,
        ),
        TranscriptSegment(
            id=f"seg_{uuid4().hex[:8]}",
            analysis_id=analysis.id,
            timestamp_start=t3,
            timestamp_end=end_time,
            frame_keys=f4,
            vantage="dalam",
            zone_id="meja_kasir",
            narrative=(
                f"Tiba di area dalam dan titik pesan/kasir {bname} pada detik {_mmss(end_time)}. "
                f"Daftar menu ({sample_menus}) dan area layanan terlihat jelas serta bersih."
            ),
            not_visible="",
            confidence="stabil",
            is_confirmed_by_owner=True,
        ),
    ]


def complete_video_and_enqueue_jobs(
    session: Session,
    analysis: AnalysisModel,
    body: VideoCompleteRequest,
    actor: str = "owner",
    idempotency_key: str | None = None,
) -> VideoCompleteResponse:
    """PRD 4.4.2: Kirim cashier_at_s, simpan video, dan antrekan job transkrip + 3D paralel."""
    stmt = select(VideoAsset).where(VideoAsset.analysis_id == analysis.id)
    existing = session.scalars(stmt).first()

    meta_in = VideoMetadataIn(
        original_filename=body.original_filename
        or (existing.original_filename if existing and existing.original_filename else "video_rekaman_toko.mp4"),
        storage_key=body.storage_key or (existing.storage_key if existing else None),
        duration_s=body.duration_s if body.duration_s is not None else (existing.duration_s if existing else 48.0),
        cashier_at_s=body.cashier_at_s,
        width=body.width if body.width is not None else (existing.width if existing else 1920),
        height=body.height if body.height is not None else (existing.height if existing else 1080),
        blurred_faces_count=body.blurred_faces_count
        if body.blurred_faces_count is not None
        else (existing.blurred_faces_count if existing else 0),
        blurred_plates_count=body.blurred_plates_count
        if body.blurred_plates_count is not None
        else (existing.blurred_plates_count if existing else 0),
    )
    video_out = upsert_video_metadata(session, analysis, meta_in, actor=actor)

    transcript_job = JobRecord(
        id=f"job_tr_{uuid4().hex[:10]}",
        analysis_id=analysis.id,
        kind="transcript",
        status="selesai",
        stage="Transkrip VLM selesai diekstrak",
        progress=1.0,
    )
    session.add(transcript_job)
    # Visual Twin asli (mode lokal, PRD 11.2): COLMAP + Brush di thread latar belakang.
    video_row = session.scalars(select(VideoAsset).where(VideoAsset.analysis_id == analysis.id)).one()
    twin_job = start_twin_job(session, analysis, video_row, idempotency_key=idempotency_key)

    if analysis.status in ("draft", "konteks", "video"):
        analysis.status = "processing"

    # Bangun segmen transkrip kontekstual untuk video ini (kecuali analisis demo seed yang belum diubah)
    existing_segs = list(
        session.scalars(select(TranscriptSegment).where(TranscriptSegment.analysis_id == analysis.id)).all()
    )
    if not existing_segs or body.frame_keys or analysis.id != "selasar-kopi":
        for old_seg in existing_segs:
            session.delete(old_seg)
        session.flush()
        new_segments = _generate_contextual_segments(
            analysis=analysis,
            duration_s=video_out.duration_s,
            cashier_at_s=video_out.cashier_at_s or video_out.duration_s,
            frame_keys=body.frame_keys,
        )
        for s in new_segments:
            session.add(s)

    session.flush()
    session.commit()
    launch_pending(session)
    return VideoCompleteResponse(
        video=video_out,
        transcript_job_id=transcript_job.id,
        twin_job_id=twin_job.id,
        status=analysis.status,
    )


# ============================================================================
# F3 & F4: Transcript Segment CRUD + AuditLog + Stale Marking
# ============================================================================
def resolve_frame_public_url(frame_key: str, analysis_id: str) -> str:
    """Konversi storage key atau filename relatif menjadi URL publik Supabase Storage."""
    if not frame_key:
        return ""
    if frame_key.startswith(("http://", "https://", "data:image/")):
        return frame_key
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    clean = frame_key.lstrip("/")
    if "/" in clean:
        return f"{base}/storage/v1/object/public/videos/{clean}"
    return f"{base}/storage/v1/object/public/videos/{analysis_id}/frames/{clean}"


def segment_model_to_schema(seg: TranscriptSegment) -> TranscriptSegmentOut:
    pose = None
    if isinstance(seg.camera_pose, dict):
        pos = seg.camera_pose.get("position")
        look = seg.camera_pose.get("look_vector")
        if isinstance(pos, list) and isinstance(look, list):
            pose = CameraPoseSchema(
                position=[float(x) for x in pos[:3]],
                look_vector=[float(x) for x in look[:3]],
            )

    vantage = seg.vantage if seg.vantage in ("jalan", "pintu", "dalam") else "jalan"
    conf = seg.confidence if seg.confidence in ("stabil", "tidak_pasti") else "stabil"
    resolved_frames = [
        resolve_frame_public_url(k, seg.analysis_id) for k in (seg.frame_keys or []) if k
    ]
    return TranscriptSegmentOut(
        id=seg.id,
        timestamp_start=seg.timestamp_start,
        timestamp_end=seg.timestamp_end,
        frame_keys=resolved_frames,
        vantage=vantage,  # type: ignore[arg-type]
        zone_id=seg.zone_id,
        narrative=seg.narrative,
        not_visible=seg.not_visible or "",
        confidence=conf,  # type: ignore[arg-type]
        is_confirmed_by_owner=seg.is_confirmed_by_owner,
        edited_by_owner=seg.edited_by_owner,
        camera_pose=pose,
    )


def mark_transcript_changed(analysis: AnalysisModel) -> None:
    analysis.transcript_version = (analysis.transcript_version or 1) + 1
    if analysis.status == "ready":
        analysis.stale = True
        reasons = list(analysis.stale_reasons or [])
        if "transcript_changed" not in reasons:
            reasons.append("transcript_changed")
        analysis.stale_reasons = reasons


def list_transcript_segments(session: Session, analysis_id: str) -> list[TranscriptSegmentOut]:
    stmt = (
        select(TranscriptSegment)
        .where(TranscriptSegment.analysis_id == analysis_id)
        .order_by(TranscriptSegment.timestamp_start.asc(), TranscriptSegment.id.asc())
    )
    rows = list(session.scalars(stmt).all())
    if not rows:
        analysis = load_analysis_with_relations(session, analysis_id)
        if (
            analysis is not None
            and (analysis.transcript_version or 1) <= 1
            and analysis.status in ("processing", "ready", "stale")
        ):
            vid = session.scalars(select(VideoAsset).where(VideoAsset.analysis_id == analysis_id)).first()
            dur = vid.duration_s if vid and vid.duration_s > 0 else 48.0
            cashier = vid.cashier_at_s if vid and vid.cashier_at_s else dur
            seeded = _generate_contextual_segments(analysis, dur, cashier)
            for s in seeded:
                session.add(s)
            session.flush()
            session.commit()
            rows = seeded
    return [segment_model_to_schema(r) for r in rows]


def create_transcript_segment(
    session: Session,
    analysis: AnalysisModel,
    payload: TranscriptSegmentCreate,
    actor: str = "owner",
) -> TranscriptSegmentOut:
    seg = TranscriptSegment(
        id=f"seg_{uuid4().hex[:10]}",
        analysis_id=analysis.id,
        timestamp_start=payload.timestamp_start,
        timestamp_end=max(payload.timestamp_end, payload.timestamp_start + 1.0),
        frame_keys=list(payload.frame_keys or ["frame_manual.jpg"]),
        vantage=payload.vantage,
        zone_id=payload.zone_id,
        narrative=payload.narrative.strip(),
        not_visible=payload.not_visible.strip(),
        confidence=payload.confidence,
        is_confirmed_by_owner=payload.is_confirmed_by_owner,
        edited_by_owner=True,
    )
    session.add(seg)
    mark_transcript_changed(analysis)
    session.add(
        AuditLog(
            id=f"aud_{uuid4().hex[:12]}",
            analysis_id=analysis.id,
            actor=actor,
            action="transcript_segment.create",
            entity_type="transcript_segment",
            entity_id=seg.id,
            after_state=payload.model_dump(),
        )
    )
    session.flush()
    session.commit()
    return segment_model_to_schema(seg)


def update_transcript_segment(
    session: Session,
    analysis: AnalysisModel,
    seg: TranscriptSegment,
    payload: TranscriptSegmentUpdate,
    actor: str = "owner",
) -> TranscriptSegmentOut:
    before = segment_model_to_schema(seg).model_dump()
    narrative_changed = False

    if payload.timestamp_start is not None:
        seg.timestamp_start = payload.timestamp_start
    if payload.timestamp_end is not None:
        seg.timestamp_end = payload.timestamp_end
    if payload.vantage is not None:
        seg.vantage = payload.vantage
    if payload.zone_id is not None:
        seg.zone_id = payload.zone_id
    if payload.narrative is not None and payload.narrative.strip() != seg.narrative:
        seg.narrative = payload.narrative.strip()
        seg.edited_by_owner = True
        narrative_changed = True
    if payload.not_visible is not None and payload.not_visible.strip() != seg.not_visible:
        seg.not_visible = payload.not_visible.strip()
        seg.edited_by_owner = True
        narrative_changed = True
    if payload.confidence is not None:
        seg.confidence = payload.confidence
    if payload.is_confirmed_by_owner is not None:
        seg.is_confirmed_by_owner = payload.is_confirmed_by_owner

    if narrative_changed:
        mark_transcript_changed(analysis)

    after = segment_model_to_schema(seg).model_dump()
    session.add(
        AuditLog(
            id=f"aud_{uuid4().hex[:12]}",
            analysis_id=analysis.id,
            actor=actor,
            action="transcript_segment.update",
            entity_type="transcript_segment",
            entity_id=seg.id,
            before_state=before,
            after_state=after,
        )
    )
    session.flush()
    session.commit()
    return segment_model_to_schema(seg)


def delete_transcript_segment(
    session: Session,
    analysis: AnalysisModel,
    seg: TranscriptSegment,
    actor: str = "owner",
) -> None:
    before = segment_model_to_schema(seg).model_dump()
    seg_id = seg.id
    session.delete(seg)
    mark_transcript_changed(analysis)
    session.add(
        AuditLog(
            id=f"aud_{uuid4().hex[:12]}",
            analysis_id=analysis.id,
            actor=actor,
            action="transcript_segment.delete",
            entity_type="transcript_segment",
            entity_id=seg_id,
            before_state=before,
        )
    )
    session.flush()
    session.commit()


# ============================================================================
# F5: Dynamic Multi-Agent Simulation Engine (Persona + Decisions + Recs)
# ============================================================================
SEGMENT_BUDGET_POOL: dict[str, list[int]] = {
    "mahasiswa": [15000, 18000, 20000, 22000, 25000, 30000],
    "pekerja_kantor": [25000, 30000, 35000, 40000, 45000, 55000],
    "warga_sekitar": [18000, 22000, 25000, 30000, 35000],
    "keluarga": [45000, 60000, 75000, 90000, 110000],
    "pengendara": [20000, 25000, 30000, 35000, 45000],
}

SEGMENT_CONTEXT_AROUND: dict[str, str] = {
    "mahasiswa": "Berjalan kaki bersama teman seusai jam kuliah mencari tempat makan/minum yang ramah kantong",
    "pekerja_kantor": "Keluar saat jam istirahat kantor mencari tempat yang cepat, jelas harganya, dan nyaman",
    "warga_sekitar": "Melintas santai di sekitar lingkungan tempat tinggal untuk membeli makanan/minuman",
    "keluarga": "Berjalan bersama keluarga mencari tempat yang bersih, terang, dan menunya cocok untuk semua",
    "pengendara": "Melintas dengan kendaraan di jalan depan toko dan melirik plang usaha dari kejauhan",
}


def run_simulation_for_analysis(
    session: Session,
    analysis: AnalysisModel,
    n_agents: int = 20,
    seed: int = 42,
    clear_stale: bool = True,
) -> list[AgentDecisionOut]:
    """Jalankan simulasi agen sintetis secara deterministik berdasarkan konteks & transkrip analisis."""
    ctx = analysis.context
    biz = analysis.business
    bname = (ctx.business_name if ctx else (biz.name if biz else analysis.name)) or "Tempat Usaha"
    loc_desc = (ctx.location_description if ctx and ctx.location_description else "") or f"fasad depan {bname}"
    passersby = list(ctx.passersby or []) if ctx and ctx.passersby else ["mahasiswa", "pekerja_kantor", "warga_sekitar"]
    fixed_constraints = set(ctx.fixed_constraints or []) if ctx else set()

    menus = sorted(analysis.menu_items or [], key=lambda m: m.sort_order)
    if menus:
        prices = sorted(m.price for m in menus if m.price > 0)
        median_price = prices[len(prices) // 2] if prices else 20000
        min_price = prices[0] if prices else 15000
        top_menu_name = menus[0].name
        second_menu_name = menus[1].name if len(menus) > 1 else menus[0].name
    else:
        median_price = 20000
        min_price = 15000
        top_menu_name = "menu utama"
        second_menu_name = "menu pilihan"

    segs = list(
        session.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.analysis_id == analysis.id)
            .order_by(TranscriptSegment.timestamp_start.asc())
        ).all()
    )
    if not segs:
        vid = session.scalars(select(VideoAsset).where(VideoAsset.analysis_id == analysis.id)).first()
        dur = vid.duration_s if vid and vid.duration_s > 0 else 48.0
        cashier = vid.cashier_at_s if vid and vid.cashier_at_s else dur
        segs = _generate_contextual_segments(analysis, dur, cashier)
        for s in segs:
            session.add(s)
        session.flush()

    seg_jalan = next((s for s in segs if s.vantage == "jalan"), segs[0])
    seg_pintu = next((s for s in segs if s.vantage == "pintu"), segs[min(1, len(segs) - 1)])
    seg_dalam = next((s for s in segs if s.vantage == "dalam"), segs[-1])

    # Hitung tingkat gesekan dari transkrip yang telah diverifikasi/diedit pemilik
    jalan_missing = bool((seg_jalan.not_visible or "").strip())
    pintu_missing = bool((seg_pintu.not_visible or "").strip())
    all_text_lower = " ".join(f"{s.narrative} {s.not_visible}" for s in segs).lower()
    has_price_friction = any(k in all_text_lower for k in ("harga", "menu", "banner", "tidak terlihat", "belum terbaca"))
    has_light_friction = any(k in all_text_lower for k in ("gelap", "redup", "temaram", "tertutup", "bayangan"))

    # Hapus hasil simulasi lama agar simulasi ulang selalu mencerminkan konteks & transkrip terbaru
    for old_dec in session.scalars(
        select(AgentDecisionRecord).where(AgentDecisionRecord.analysis_id == analysis.id)
    ).all():
        session.delete(old_dec)
    for old_run in session.scalars(
        select(SimulationRun).where(SimulationRun.analysis_id == analysis.id)
    ).all():
        session.delete(old_run)
    for old_per in session.scalars(select(Persona).where(Persona.analysis_id == analysis.id)).all():
        session.delete(old_per)
    for old_rec in session.scalars(
        select(RecommendationItem).where(RecommendationItem.analysis_id == analysis.id)
    ).all():
        session.delete(old_rec)
    session.flush()

    total = max(8, min(n_agents if n_agents <= 30 else 20, 30))
    rng = random.Random(f"{analysis.id}:{seed}:{analysis.transcript_version}")

    sim_run = SimulationRun(
        id=f"run_{uuid4().hex[:10]}",
        analysis_id=analysis.id,
        run_type="baseline",
        status="selesai",
        n_agents=total,
        succeeded_agents=total,
        seed=seed,
        transcript_version=analysis.transcript_version or 1,
        persona_version=1,
    )
    session.add(sim_run)
    session.flush()

    traits_laziness = ["malas", "normal", "eksploratif"]
    traits_dining = ["sendiri_buru_buru", "santai", "rombongan"]
    traits_fam = ["baru_pertama", "cukup_tahu", "warga_lokal"]
    traits_intent = ["mencari_makan", "lewat_saja", "spesifik_tujuan"]
    moods = ["Santai", "Lapar & ingin cepat", "Penasaran", "Hemat akhir bulan", "Fokus kerja"]

    for i in range(1, total + 1):
        seg_type = passersby[(i - 1) % len(passersby)]
        budget_pool = SEGMENT_BUDGET_POOL.get(seg_type, [20000, 25000, 35000])
        meal_budget = rng.choice(budget_pool)
        break_mins = rng.choice([20, 30, 45, 60, 90])

        budget_sens = "hemat" if meal_budget <= median_price else ("sedang" if meal_budget <= median_price * 1.5 else "fleksibel")
        laziness = traits_laziness[i % len(traits_laziness)]
        dining = traits_dining[i % len(traits_dining)]
        fam = traits_fam[i % len(traits_fam)]
        intent = traits_intent[i % len(traits_intent)]
        mood = moods[i % len(moods)]

        # Tentukan keputusan agen secara kontekstual
        ratio_pos = i / total
        lewat_cutoff = 0.25 if jalan_missing else 0.15
        berhenti_cutoff = 0.65 if (pintu_missing or has_price_friction) else 0.40
        if meal_budget < min_price:
            berhenti_cutoff = min(0.80, berhenti_cutoff + 0.15)
        masuk_tanpa_cutoff = berhenti_cutoff + 0.10

        if ratio_pos <= lewat_cutoff:
            final_dec = "lewat"
            stopped_id = seg_jalan.id
            factor_ids = [seg_jalan.id]
            hesitation = 4
            deciding_factor = (
                f"Plang & penanda {bname} dari arah jalan belum cukup mencolok ({seg_jalan.not_visible or 'visibilitas fasad terbatas'})."
            )
            monologue = (
                f"Aku lewat di depan {bname} ({loc_desc}), tapi dari jalan belum kelihatan jelas "
                f"apakah sedang buka dan jual {top_menu_name} di kisaran anggaran Rp {meal_budget:,}. Aku jalan terus dulu."
            ).replace(",", ".")
        elif ratio_pos <= berhenti_cutoff:
            final_dec = "berhenti_lalu_pergi"
            stopped_id = seg_pintu.id
            factor_ids = [seg_jalan.id, seg_pintu.id]
            hesitation = 5
            if meal_budget < median_price or has_price_friction:
                deciding_factor = (
                    f"Tidak ada informasi harga {top_menu_name} (mulai Rp {min_price:,}) di depan pintu masuk {bname}."
                ).replace(",", ".")
                monologue = (
                    f"Sebenarnya tertarik mampir ke {bname}, tapi pas berhenti di depan akses masuk ({_mmss(seg_pintu.timestamp_start)}), "
                    f"aku nggak melihat daftar menu & harga {top_menu_name}. Uang makanku Rp {meal_budget:,}, khawatir kemahalan kalau sudah terlanjur masuk."
                ).replace(",", ".")
            else:
                deciding_factor = (
                    f"Area akses masuk {bname} tampak agak redup/kurang mengundang dari luar."
                )
                monologue = (
                    f"Aku sempat berhenti sebentar memperhatikan pintu masuk {bname}, tapi karena bagian dalamnya terlihat agak temaram "
                    f"dan belum ada standing banner menu, aku urung masuk."
                )
        elif ratio_pos <= masuk_tanpa_cutoff:
            final_dec = "masuk_tanpa_memesan"
            stopped_id = seg_dalam.id
            factor_ids = [seg_pintu.id, seg_dalam.id]
            hesitation = 3
            deciding_factor = (
                f"Waktu istirahat terbatas ({break_mins} menit) dan belum melihat paket cepat di dekat pintu {bname}."
            )
            monologue = (
                f"Aku sudah masuk ke area {bname} untuk melihat daftar menu ({top_menu_name}, {second_menu_name}), "
                f"tapi karena waktu istirahatku cuma {break_mins} menit, aku putuskan beli lain waktu."
            )
        else:
            final_dec = "memesan"
            stopped_id = None
            factor_ids = [seg_dalam.id]
            hesitation = 1 if meal_budget >= median_price else 2
            deciding_factor = (
                f"Menu {top_menu_name} (Rp {menus[0].price if menus else median_price:,}) sesuai anggaran dan area kasir {bname} terlihat meyakinkan."
            ).replace(",", ".")
            monologue = (
                f"Begitu masuk ke dalam {bname} dan sampai di kasir (detik {_mmss(seg_dalam.timestamp_end)}), "
                f"papan menu {top_menu_name} dan {second_menu_name} langsung terbaca jelas. Harganya masuk di anggaranku Rp {meal_budget:,}, jadi aku langsung pesan!"
            ).replace(",", ".")

        persona_row = Persona(
            id=f"per_{analysis.id}_{i:02d}",
            analysis_id=analysis.id,
            agent_id=i,
            segment=seg_type,
            discrete_traits={
                "budget_sensitivity": budget_sens,
                "physical_laziness": laziness,
                "dining_context": dining,
                "area_familiarity": fam,
                "visit_intent": intent,
            },
            concrete_facts={
                "meal_budget": meal_budget,
                "break_time_minutes": break_mins,
            },
            context_around=SEGMENT_CONTEXT_AROUND.get(seg_type, f"Melintas di sekitar {bname}"),
            daily_mood=mood,
            seed=seed + i,
            table_version="v1.4-dynamic",
        )
        session.add(persona_row)

        dec_row = AgentDecisionRecord(
            id=f"dec_{analysis.id}_{i:02d}",
            run_id=sim_run.id,
            analysis_id=analysis.id,
            agent_id=i,
            monologue=monologue,
            final_decision=final_dec,
            stopped_at_segment_id=stopped_id,
            deciding_factor=deciding_factor,
            factor_segment_ids=factor_ids,
            hesitation_score=hesitation,
        )
        session.add(dec_row)

    # Bangun 3 Rekomendasi Pareto yang kontekstual (menghormati fixed_constraints)
    pintu_time = _mmss((seg_pintu.timestamp_start + seg_pintu.timestamp_end) / 2)
    jalan_time = _mmss((seg_jalan.timestamp_start + seg_jalan.timestamp_end) / 2)
    min_price_rb = f"Rp {min_price // 1000}rb" if min_price >= 1000 else f"Rp {min_price}"

    recs_to_create = [
        RecommendationItem(
            id=f"rec_{analysis.id}_1",
            analysis_id=analysis.id,
            run_id=sim_run.id,
            hypothesis_id="H8",
            action_id="A8.1",
            priority_tag="Prioritas",
            rank=1,
            title=f"Pasang standing banner menu ({top_menu_name}) & harga mulai {min_price_rb} di depan pintu masuk",
            description=(
                f"Tampilkan daftar menu favorit {bname} ({top_menu_name}, {second_menu_name}) beserta harga jelas "
                f"agar calon pembeli yang berhenti di depan akses masuk tidak ragu soal harga."
            ),
            impact="Tinggi",
            effort="Rendah",
            estimated_lift_range="+14% – +19%",
            location_zone=f"Akses Masuk (Detik {pintu_time})",
        ),
        RecommendationItem(
            id=f"rec_{analysis.id}_2",
            analysis_id=analysis.id,
            run_id=sim_run.id,
            hypothesis_id="H2",
            action_id="A2.1",
            priority_tag="Prioritas",
            rank=2,
            title=(
                f"Tambahkan lampu sorot hangat & penanda 'BUKA' kontras tinggi di area masuk {bname}"
                if has_light_friction or "fasad" in fixed_constraints
                else f"Perjelas penanda pintu masuk & arah menuju kasir {bname}"
            ),
            description=(
                f"Pastikan transisi dari luar ({loc_desc}) menuju dalam toko terlihat terang dan ramah "
                f"sehingga pejalan kaki tahu {bname} sedang beroperasi."
            ),
            impact="Sedang",
            effort="Rendah",
            estimated_lift_range="+6% – +10%",
            location_zone=f"Ambang Pintu (Detik {pintu_time})",
        ),
        RecommendationItem(
            id=f"rec_{analysis.id}_3",
            analysis_id=analysis.id,
            run_id=sim_run.id,
            hypothesis_id="H1",
            action_id="A1.1",
            priority_tag="Nanti",
            rank=3,
            title=f"Optimalkan posisi plang nama {bname} agar terbaca tegak lurus dari arah pejalan kaki",
            description=(
                f"Bantu pengendara dan pejalan kaki di sekitar {ctx.location_name if ctx else bname} "
                f"mengenali {bname} sejak detik pertama melintas."
            ),
            impact="Sedang",
            effort="Sedang",
            estimated_lift_range="+3% – +6%",
            location_zone=f"Fasad Jalan (Detik {jalan_time})",
        ),
    ]
    for r in recs_to_create:
        session.add(r)

    analysis.total_agents = total
    if clear_stale:
        analysis.status = "ready"
        analysis.stale = False
        analysis.stale_reasons = []
    session.flush()
    session.commit()

    return list_agent_decisions_for_analysis(session, analysis.id)


# ============================================================================
# F5, F6, F7: Read Dashboard, Agent Decisions, What-If, and Measurement Plan
# ============================================================================
def list_agent_decisions_for_analysis(
    session: Session,
    analysis_id: str,
    final_decision: str | None = None,
    segment: str | None = None,
) -> list[AgentDecisionOut]:
    dec_stmt = (
        select(AgentDecisionRecord)
        .where(AgentDecisionRecord.analysis_id == analysis_id)
        .order_by(AgentDecisionRecord.agent_id.asc())
    )
    all_decisions = list(session.scalars(dec_stmt).all())

    # Jika analisis belum punya record keputusan agen sama sekali, jalankan simulasi otomatis
    if not all_decisions:
        analysis = load_analysis_with_relations(session, analysis_id)
        if analysis is not None:
            return run_simulation_for_analysis(
                session,
                analysis,
                n_agents=analysis.total_agents or 20,
                clear_stale=False,
            )

    decisions = (
        [d for d in all_decisions if d.final_decision == final_decision]
        if (final_decision and final_decision != "all")
        else all_decisions
    )

    per_stmt = select(Persona).where(Persona.analysis_id == analysis_id)
    personas_by_agent = {p.agent_id: p for p in session.scalars(per_stmt).all()}

    results: list[AgentDecisionOut] = []
    for dec in decisions:
        per = personas_by_agent.get(dec.agent_id)
        seg_name = per.segment if per is not None else "mahasiswa"
        if segment and segment != "all" and seg_name != segment:
            continue

        persona_out = PersonaSpecOut(
            agent_id=dec.agent_id,
            segment=seg_name,
            discrete_traits=dict(per.discrete_traits)
            if per is not None
            else {
                "budget_sensitivity": "hemat",
                "physical_laziness": "normal",
                "dining_context": "santai",
                "area_familiarity": "baru_pertama",
                "visit_intent": "mencari_makan",
            },
            concrete_facts=dict(per.concrete_facts)
            if per is not None
            else {"meal_budget": 25000, "break_time_minutes": 30},
            context_around=per.context_around if per is not None else "Melintas di sekitar lokasi usaha",
            daily_mood=per.daily_mood if per is not None else "Santai",
            seed=per.seed if per is not None else 42,
            table_version=per.table_version if per is not None else "v1.4-dynamic",
        )
        results.append(
            AgentDecisionOut(
                agent_id=dec.agent_id,
                persona=persona_out,
                monologue=dec.monologue,
                final_decision=dec.final_decision,
                stopped_at_segment_id=dec.stopped_at_segment_id,
                deciding_factor=dec.deciding_factor,
                factor_segment_ids=list(dec.factor_segment_ids or []),
                hesitation_score=dec.hesitation_score,
            )
        )
    return results


def compute_what_if_projection(
    analysis: AnalysisModel,
    funnel_stages: list[FunnelStageDataOut],
    recommendations: list[ParetoRecommendationOut],
    checked_ids: list[str] | None = None,
) -> WhatIfProjectionOut:
    """Hitung proyeksi pasca-simulasi (What-If) secara dinamis sesuai rekomendasi yang dicentang."""
    biz = analysis.business
    bname = (
        biz.name
        if biz is not None
        else (analysis.context.business_name if analysis.context is not None else analysis.name)
    )
    total = max(1, analysis.total_agents or 20)
    menus = list(analysis.menu_items or [])
    avg_ticket = round(sum(m.price for m in menus) / len(menus)) if menus else 20000

    active_ids = set(checked_ids) if checked_ids is not None else {r.id for r in recommendations}
    checked_recs = [r for r in recommendations if r.id in active_ids]

    # Bobot lift berdasarkan impact dari rekomendasi yang dicentang
    stop_boost_pts = 0
    enter_boost_pts = 0
    order_boost_pts = 0
    total_cost_rp = 0

    for r in checked_recs:
        if r.impact == "Tinggi":
            stop_boost_pts += 12
            enter_boost_pts += 18
            order_boost_pts += 14
            total_cost_rp += 150_000
        elif r.impact == "Sedang":
            stop_boost_pts += 8
            enter_boost_pts += 9
            order_boost_pts += 6
            total_cost_rp += 120_000
        else:
            stop_boost_pts += 5
            enter_boost_pts += 4
            order_boost_pts += 3
            total_cost_rp += 85_000

    s_see = funnel_stages[0] if len(funnel_stages) > 0 else None
    s_stop = funnel_stages[1] if len(funnel_stages) > 1 else None
    s_enter = funnel_stages[2] if len(funnel_stages) > 2 else None
    s_order = funnel_stages[3] if len(funnel_stages) > 3 else None

    base_see_pct = round(s_see.percentage) if s_see else 100
    base_stop_pct = round(s_stop.percentage) if s_stop else 70
    base_enter_pct = round(s_enter.percentage) if s_enter else 30
    base_order_pct = round(s_order.percentage) if s_order else 20

    proj_see_pct = 100
    proj_stop_pct = min(95, base_stop_pct + stop_boost_pts)
    proj_enter_pct = min(proj_stop_pct - 5, base_enter_pct + enter_boost_pts)
    proj_order_pct = min(proj_enter_pct - 2, base_order_pct + order_boost_pts)

    buyers_base = s_order.count if s_order else max(1, round(total * base_order_pct / 100))
    buyers_proj = max(buyers_base, round(total * proj_order_pct / 100))

    highest_drop = max((s.drop_off_rate for s in funnel_stages[:3]), default=50.0)
    proj_drop = max(12.0, highest_drop - (enter_boost_pts + order_boost_pts) * 0.85)

    daily_visitors = (analysis.context.daily_visitors if analysis.context and analysis.context.daily_visitors else None) or 60
    extra_daily_buyers = max(0, round(daily_visitors * ((proj_order_pct - base_order_pct) / 100.0)))
    daily_rev_lift = extra_daily_buyers * avg_ticket
    rev_lift_str = f"+{_format_rp_short(daily_rev_lift).replace('Rp ', '')}" if daily_rev_lift > 0 else "Rp 0"
    cost_str = _format_rp_short(total_cost_rp) if total_cost_rp > 0 else "Rp 0"

    def _delta(base: int, proj: int) -> str:
        diff = proj - base
        return "Tetap" if diff <= 0 else f"+{diff} poin"

    stages_comp = [
        WhatIfStageComparisonOut(
            id="melihat",
            name="Melihat Toko",
            baseline_pct=base_see_pct,
            projected_pct=proj_see_pct,
            delta_label=_delta(base_see_pct, proj_see_pct),
        ),
        WhatIfStageComparisonOut(
            id="tertarik",
            name="Berhenti & Tertarik",
            baseline_pct=base_stop_pct,
            projected_pct=proj_stop_pct,
            delta_label=_delta(base_stop_pct, proj_stop_pct),
        ),
        WhatIfStageComparisonOut(
            id="masuk",
            name="Masuk ke Dalam",
            baseline_pct=base_enter_pct,
            projected_pct=proj_enter_pct,
            delta_label=_delta(base_enter_pct, proj_enter_pct),
        ),
        WhatIfStageComparisonOut(
            id="memesan",
            name="Jadi Memesan",
            baseline_pct=base_order_pct,
            projected_pct=proj_order_pct,
            delta_label=_delta(base_order_pct, proj_order_pct),
        ),
    ]

    if checked_recs:
        top_titles = "; ".join(r.title for r in checked_recs[:2])
        conclusion = (
            f"Dengan menerapkan {len(checked_recs)} perbaikan pada {bname} ({top_titles}), "
            f"konversi agen diproyeksikan naik dari {buyers_base} menjadi {buyers_proj} pembeli "
            f"(+{proj_order_pct - base_order_pct} poin persentase) dengan estimasi tambahan omzet {rev_lift_str}/hari."
        )
    else:
        conclusion = f"Pilih minimal satu rekomendasi perbaikan untuk melihat proyeksi kenaikan konversi di {bname}."

    now_str = datetime.now().strftime("%d %b %Y · %H.%M")
    return WhatIfProjectionOut(
        total_agents=total,
        last_run_timestamp=now_str,
        buyers_projected=buyers_proj,
        buyers_baseline=buyers_base,
        drop_rate_projected=f"-{round(proj_drop)}%",
        drop_rate_baseline=f"-{round(highest_drop)}%",
        revenue_lift=rev_lift_str,
        cost_estimate=cost_str,
        stages_comparison=stages_comp,
        model_conclusion=conclusion,
    )


def build_dashboard_data(
    session: Session,
    analysis: AnalysisModel,
    checked_recommendation_ids: list[str] | None = None,
) -> DashboardDataOut:
    biz = analysis.business
    business_name = (
        biz.name
        if biz is not None
        else (analysis.context.business_name if analysis.context is not None else analysis.name)
    )
    branch_name = biz.branch_name if biz is not None else "Pusat"

    # Pastikan keputusan agen tersedia (jalankan simulasi otomatis bila belum ada)
    decisions = list_agent_decisions_for_analysis(session, analysis.id)
    total_agents = len(decisions) or (analysis.total_agents or 20)

    # Ambil segmen transkrip untuk penentuan titik pantau (waypoints) dan lokasi gesekan
    segs = list(
        session.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.analysis_id == analysis.id)
            .order_by(TranscriptSegment.timestamp_start.asc())
        ).all()
    )
    vid = session.scalars(select(VideoAsset).where(VideoAsset.analysis_id == analysis.id)).first()
    duration_s = vid.duration_s if vid and vid.duration_s > 0 else 48.0

    # Hitung metrik corong (Funnel) nyata dari keputusan agen di DB
    lewat_cnt = sum(1 for d in decisions if d.final_decision == "lewat")
    berhenti_pergi_cnt = sum(1 for d in decisions if d.final_decision == "berhenti_lalu_pergi")
    masuk_tanpa_cnt = sum(1 for d in decisions if d.final_decision == "masuk_tanpa_memesan")
    memesan_cnt = sum(1 for d in decisions if d.final_decision == "memesan")

    # Jika seed demo lama hanya menyimpan 4 baris sampel tetapi total_agents = 20, skalakan proporsional
    scale = (analysis.total_agents or 20) // len(decisions) if (0 < len(decisions) < 10 and (analysis.total_agents or 20) >= 20) else 1
    if scale > 1:
        total_agents = len(decisions) * scale
        lewat_cnt *= scale
        berhenti_pergi_cnt *= scale
        masuk_tanpa_cnt *= scale
        memesan_cnt *= scale

    berhenti_cnt = max(0, total_agents - lewat_cnt)
    masuk_cnt = max(0, masuk_tanpa_cnt + memesan_cnt)

    r_lewat = round((lewat_cnt / max(total_agents, 1)) * 100, 1)
    r_berhenti = round((berhenti_pergi_cnt / max(berhenti_cnt, 1)) * 100, 1)
    r_masuk = round((masuk_tanpa_cnt / max(masuk_cnt, 1)) * 100, 1)
    max_drop = max(r_lewat, r_berhenti, r_masuk)

    funnel_stages = [
        FunnelStageDataOut(
            id="melihat",
            name="1. Melihat Toko",
            count=total_agents,
            percentage=100.0,
            drop_off_count=lewat_cnt,
            drop_off_rate=r_lewat,
            is_highest_friction=(r_lewat == max_drop and r_lewat > r_berhenti),
        ),
        FunnelStageDataOut(
            id="berhenti",
            name="2. Berhenti Sejenak",
            count=berhenti_cnt,
            percentage=round((berhenti_cnt / max(total_agents, 1)) * 100, 1),
            drop_off_count=berhenti_pergi_cnt,
            drop_off_rate=r_berhenti,
            is_highest_friction=(r_berhenti >= max_drop),
        ),
        FunnelStageDataOut(
            id="masuk",
            name="3. Masuk ke Dalam",
            count=masuk_cnt,
            percentage=round((masuk_cnt / max(total_agents, 1)) * 100, 1),
            drop_off_count=masuk_tanpa_cnt,
            drop_off_rate=r_masuk,
            is_highest_friction=(r_masuk == max_drop and r_masuk > r_berhenti and r_masuk > r_lewat),
        ),
        FunnelStageDataOut(
            id="memesan",
            name="4. Jadi Memesan",
            count=memesan_cnt,
            percentage=round((memesan_cnt / max(total_agents, 1)) * 100, 1),
            drop_off_count=0,
            drop_off_rate=0.0,
            is_highest_friction=False,
        ),
    ]

    # Recommendations from DB
    rec_stmt = (
        select(RecommendationItem)
        .where(RecommendationItem.analysis_id == analysis.id)
        .order_by(RecommendationItem.rank.asc())
    )
    rec_rows = list(session.scalars(rec_stmt).all())
    recommendations = [
        ParetoRecommendationOut(
            id=r.id,
            priority_tag=r.priority_tag,
            rank=r.rank,
            title=r.title,
            description=r.description,
            impact=r.impact,
            effort=r.effort,
            estimated_lift_range=r.estimated_lift_range,
            location_zone=r.location_zone,
        )
        for r in rec_rows
    ]

    # Twin asset metadata from DB
    twin_stmt = select(TwinAsset).where(TwinAsset.analysis_id == analysis.id)
    twin_row = session.scalars(twin_stmt).first()
    if twin_row is not None:
        ratio = round(twin_row.registered_frames / max(twin_row.total_frames, 1), 2)
        twin_meta = VisualTwinMetaOut(
            registered_frames=twin_row.registered_frames,
            total_frames=twin_row.total_frames,
            ratio=ratio,
            quality_label=twin_row.quality_label,
            points_count=twin_row.points_count,
            path_duration_seconds=twin_row.path_duration_seconds or duration_s,
        )
    else:
        total_f = max(60, round(duration_s * 30))
        reg_f = round(total_f * 0.90)
        twin_meta = VisualTwinMetaOut(
            registered_frames=reg_f,
            total_frames=total_f,
            ratio=0.90,
            quality_label=analysis.quality_label or "Kualitas baik",
            points_count=reg_f * 60,
            path_duration_seconds=duration_s,
        )

    # Waypoints dinamis dari segmen transkrip
    seg_jalan = next((s for s in segs if s.vantage == "jalan"), segs[0] if segs else None)
    seg_pintu = next((s for s in segs if s.vantage == "pintu"), segs[min(1, len(segs) - 1)] if segs else None)
    seg_dalam = next((s for s in segs if s.vantage == "dalam"), segs[-1] if segs else None)

    t_jalan = _mmss(seg_jalan.timestamp_start if seg_jalan else 4.0)
    t_pintu = _mmss(seg_pintu.timestamp_start if seg_pintu else duration_s * 0.35)
    t_dalam = _mmss(seg_dalam.timestamp_end if seg_dalam else duration_s)

    waypoints = [
        WaypointOut(
            id="jalan",
            time=t_jalan,
            name=f"Jalur Jalan Depan {business_name}",
            status=f"{round(100 - r_lewat, 1):g}% menoleh",
            is_hotspot=(r_lewat > r_berhenti),
        ),
        WaypointOut(
            id="tangga",
            time=t_pintu,
            name=f"Akses Masuk {business_name}",
            status=f"{r_berhenti:g}% bocor",
            is_hotspot=(r_berhenti >= r_lewat),
        ),
        WaypointOut(
            id="kasir",
            time=t_dalam,
            name=f"Titik Pesan / Kasir {business_name}",
            status=f"{round(100 - r_masuk, 1):g}% memesan",
            is_hotspot=False,
        ),
    ]

    # Analisis faktor penyebab batal tertinggi
    non_buyers = [d for d in decisions if d.final_decision != "memesan"]
    factor_counts = Counter(d.deciding_factor for d in non_buyers if d.deciding_factor)
    top_factor_text = (
        factor_counts.most_common(1)[0][0]
        if factor_counts
        else f"Informasi menu & harga {business_name} belum terlihat dari jalan"
    )
    top_factor_Lower = top_factor_text.lower()
    if "harga" in top_factor_Lower or "menu" in top_factor_Lower:
        main_cause_short = "Menu & Harga"
    elif "gelap" in top_factor_Lower or "redup" in top_factor_Lower or "lampu" in top_factor_Lower:
        main_cause_short = "Pencahayaan Masuk"
    elif "plang" in top_factor_Lower or "visibilitas" in top_factor_Lower:
        main_cause_short = "Visibilitas Fasad"
    else:
        main_cause_short = "Info Depan Toko"

    menus = list(analysis.menu_items or [])
    avg_price = round(sum(m.price for m in menus) / len(menus)) if menus else 20000
    batal_total = lewat_cnt + berhenti_pergi_cnt + masuk_tanpa_cnt
    daily_vis = (analysis.context.daily_visitors if analysis.context and analysis.context.daily_visitors else None) or 50
    monthly_lost_visitors = max(30, round(daily_vis * (berhenti_pergi_cnt / max(total_agents, 1)) * 15))
    loss_low = monthly_lost_visitors * avg_price
    loss_high = round(loss_low * 1.35)

    in_store_conv = round((memesan_cnt / max(masuk_cnt, 1)) * 100, 1)
    buyers_pct = round((memesan_cnt / max(total_agents, 1)) * 100, 1)

    key_insights = [
        KeyInsightOut(
            id=f"ins_{analysis.id}_1",
            number="01",
            type="friction",
            title=f"Friksi Utama di Akses Masuk {business_name} ({r_berhenti:g}% Batal)",
            description=(
                f"Dari {berhenti_cnt} agen yang tertarik berhenti di depan {business_name}, "
                f"{berhenti_pergi_cnt} agen urung masuk. Alasan terkuat: {top_factor_text}"
            ),
        ),
        KeyInsightOut(
            id=f"ins_{analysis.id}_2",
            number="02",
            type="friction" if lewat_cnt >= 5 else "positive",
            title=f"Daya Tarik Fasad dari Jalan ({round(100 - r_lewat, 1):g}% Berhenti)",
            description=(
                f"{berhenti_cnt} dari {total_agents} agen pejalan kaki menoleh ke {business_name}, "
                f"namun {lewat_cnt} agen langsung lewat karena penanda dari arah jalan belum terbaca cepat."
            ),
        ),
        KeyInsightOut(
            id=f"ins_{analysis.id}_3",
            number="03",
            type="positive",
            title=f"Konversi Area Kasir Sangat Tinggi ({in_store_conv:g}%)",
            description=(
                f"Begitu calon pelanggan melewati pintu masuk {business_name}, "
                f"{memesan_cnt} dari {masuk_cnt} agen langsung memesan karena daftar menu di kasir jelas."
            ),
        ),
    ]

    kpi = DashboardKpiOut(
        buyers_count=memesan_cnt,
        buyers_rate_text=f"{buyers_pct:g}% dari {total_agents} agen yang melihat",
        buyers_description=f"Konversi akhir simulasi calon pelanggan di {business_name} hingga memesan di kasir.",
        drop_off_rate_text=f"v {max_drop:g}%",
        drop_off_from_stage="Berhenti" if r_berhenti >= r_lewat else "Melihat",
        drop_off_to_stage="Masuk" if r_berhenti >= r_lewat else "Berhenti",
        drop_off_location=f"Akses Masuk {business_name} (Detik {t_pintu})",
        drop_off_description=f"{berhenti_pergi_cnt} dari {berhenti_cnt} agen yang sudah berhenti akhirnya batal masuk.",
        main_cause_title=main_cause_short,
        main_cause_cue_rank=f"Peringkat 1 ({round((berhenti_pergi_cnt / max(batal_total, 1)) * 100)}% alasan batal)",
        main_cause_detail=top_factor_text,
        potential_loss_amount=f"{_format_rp_short(loss_low)} – {_format_rp_short(loss_high)}",
        potential_loss_basis=f"Estimasi per bulan dari {berhenti_pergi_cnt} agen batal masuk",
        potential_loss_detail=f"Dihitung dari rata-rata harga menu Rp {avg_price:,} x estimasi lalu lintas harian {business_name}.".replace(
            ",", "."
        ),
    )

    what_if = compute_what_if_projection(
        analysis=analysis,
        funnel_stages=funnel_stages,
        recommendations=recommendations,
        checked_ids=checked_recommendation_ids,
    )

    return DashboardDataOut(
        analysis_id=analysis.id,
        business_id=analysis.business_id,
        business_name=business_name,
        branch_name=branch_name,
        created_at=analysis.created_at.isoformat()
        if hasattr(analysis.created_at, "isoformat")
        else str(analysis.created_at),
        total_agents=total_agents,
        is_stale=bool(analysis.stale),
        kpi=kpi,
        funnel_stages=funnel_stages,
        key_insights=key_insights,
        recommendations=recommendations,
        twin_meta=twin_meta,
        waypoints=waypoints,
        what_if_projection=what_if,
    )


def get_or_create_measurement_plan(
    session: Session,
    analysis: AnalysisModel,
) -> MeasurementPlanDataOut:
    biz = analysis.business
    business_name = (
        biz.name
        if biz is not None
        else (analysis.context.business_name if analysis.context is not None else analysis.name)
    )
    ctx = analysis.context
    loc_desc = (ctx.location_description if ctx and ctx.location_description else "") or f"area depan {business_name}"
    rush_list = list(ctx.rush_hours or []) if ctx and ctx.rush_hours else [{"start": "12:00", "end": "14:00"}]
    rec_times = [
        f"{r.get('start', '12:00')} – {r.get('end', '14:00')} (Jam ramai operasional)"
        for r in rush_list
        if isinstance(r, dict)
    ] or ["11:30 – 13:30 (Jam makan siang)", "18:00 – 20:00 (Jam ramai sore/malam)"]

    stmt = select(MeasurementPlanRecord).where(MeasurementPlanRecord.analysis_id == analysis.id)
    plan = session.scalars(stmt).first()
    if plan is None:
        plan = MeasurementPlanRecord(
            id=f"mp_{uuid4().hex[:10]}",
            analysis_id=analysis.id,
            observation_title=f"Pengamatan Konversi Akses Masuk & Fasad {business_name}",
            observation_spot=f"Ambil posisi pandang dari seberang atau sisi trotoar sehingga {loc_desc} dan pintu masuk {business_name} terlihat bersamaan.",
            recommended_times=rec_times,
            suggested_duration_minutes=30,
            metrics=[
                {
                    "id": "m1",
                    "stage_name": "Melintas & Menoleh",
                    "physical_cue": f"Pejalan kaki/pengendara menoleh ke arah plang atau fasad {business_name}",
                    "target_count": 20,
                },
                {
                    "id": "m2",
                    "stage_name": "Berhenti di Depan Akses Masuk",
                    "physical_cue": f"Berhenti minimal 3 detik memperhatikan daftar menu/harga di depan {business_name}",
                    "target_count": 14,
                },
                {
                    "id": "m3",
                    "stage_name": "Melangkah Masuk",
                    "physical_cue": f"Melewati pintu/akses masuk menuju bagian dalam {business_name}",
                    "target_count": 9,
                },
                {
                    "id": "m4",
                    "stage_name": "Memesan di Kasir",
                    "physical_cue": f"Melakukan pemesanan atau pembayaran di titik kasir {business_name}",
                    "target_count": 7,
                },
            ],
            practical_tips=[
                f"Lakukan pengamatan selama 30 menit sebelum memasang perbaikan di {business_name}, lalu 30 menit pada jam ramai yang sama setelah dipasang.",
                "Gunakan kolom turus (IIII) untuk mencatat setiap pejalan kaki tanpa perlu mengajak bicara.",
                "Bandingkan rasio pengunjung yang jadi melangkah masuk setelah melihat daftar menu & harga.",
            ],
        )
        session.add(plan)
        session.flush()
        session.commit()

    metrics_out = [
        MeasurementMetricSchema(
            id=str(m.get("id", f"m{i + 1}")),
            stage_name=str(m.get("stage_name", "")),
            physical_cue=str(m.get("physical_cue", "")),
            target_count=int(m.get("target_count", 0)),
        )
        for i, m in enumerate(plan.metrics or [])
        if isinstance(m, dict)
    ]
    return MeasurementPlanDataOut(
        analysis_id=analysis.id,
        business_name=business_name,
        observation_title=plan.observation_title,
        observation_spot=plan.observation_spot,
        recommended_times=list(plan.recommended_times or []),
        suggested_duration_minutes=plan.suggested_duration_minutes,
        metrics=metrics_out,
        practical_tips=list(plan.practical_tips or []),
    )
