"""Layanan CRUD & Simulasi Dinamis untuk Business, Analysis, Context, Video, Transkrip, Agen, dan Dasbor (PRD v1.4)."""

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
    TranscriptCheckpoint,
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
    twin_job = JobRecord(
        id=f"job_tw_{uuid4().hex[:10]}",
        analysis_id=analysis.id,
        kind="twin",
        status="berjalan",
        stage="Membangun peta 3D dari jalur kamera",
        progress=0.75,
    )
    session.add(transcript_job)
    session.add(twin_job)

    if analysis.status in ("draft", "konteks", "video"):
        analysis.status = "processing"

    # Buat atau perbarui TwinAsset sesuai durasi video yang diunggah
    twin_stmt = select(TwinAsset).where(TwinAsset.analysis_id == analysis.id)
    twin_row = session.scalars(twin_stmt).first()
    total_frames = max(60, round(video_out.duration_s * 30))
    reg_frames = round(total_frames * 0.92)
    if twin_row is None:
        twin_row = TwinAsset(
            id=f"tw_{uuid4().hex[:10]}",
            analysis_id=analysis.id,
            mode="splat",
            registered_frames=reg_frames,
            total_frames=total_frames,
            quality_label=analysis.quality_label or "Kualitas baik",
            points_count=max(24000, reg_frames * 65),
            path_duration_seconds=video_out.duration_s,
        )
        session.add(twin_row)
    else:
        twin_row.total_frames = total_frames
        twin_row.registered_frames = reg_frames
        twin_row.path_duration_seconds = video_out.duration_s

    # Bangun segmen transkrip kontekstual untuk video ini (kecuali analisis demo seed yang belum diubah)
    existing_segs = list(
        session.scalars(select(TranscriptSegment).where(TranscriptSegment.analysis_id == analysis.id)).all()
    )
    if not existing_segs or body.frame_keys or analysis.id != "selasar-kopi":
        for old_seg in existing_segs:
            session.delete(old_seg)
        session.flush()
        from app.services.transcript.extractor import extract_transcript_with_gemini

        new_segments, new_checkpoints = extract_transcript_with_gemini(
            analysis=analysis,
            duration_s=video_out.duration_s,
            cashier_at_s=video_out.cashier_at_s or video_out.duration_s,
            frame_keys=list(body.frame_keys or []),
            timestamps_s=list(body.frame_timestamps_s or []),
        )
        for s in new_segments:
            session.add(s)
        session.flush()
        for chk in new_checkpoints:
            session.add(chk)

    session.flush()
    session.commit()
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
    """Jalankan simulasi 20 agen individual (model persona diskret + Gemini 2 batch + Katalog Isyarat)."""
    from app.services.simulation.pareto import (
        aggregate_cue_scores,
        generate_catalog_recommendations,
    )
    from app.services.simulation.population import generate_discrete_personas
    from app.services.simulation.runner import SegmentInput, run_20_agent_swarm

    ctx = analysis.context
    biz = analysis.business
    bname = (ctx.business_name if ctx else (biz.name if biz else analysis.name)) or "Tempat Usaha"
    loc_desc = (ctx.location_description if ctx and ctx.location_description else "") or f"fasad depan {bname}"
    passersby = list(ctx.passersby or []) if ctx and ctx.passersby else ["mahasiswa", "pekerja_kantor", "warga_sekitar"]
    fixed_constraints = list(ctx.fixed_constraints or []) if ctx else []
    owner_goals = [ctx.business_goal] if ctx and ctx.business_goal else []

    menus = sorted(analysis.menu_items or [], key=lambda m: m.sort_order)
    prices = sorted(m.price for m in menus if m.price > 0)
    median_price = float(prices[len(prices) // 2]) if prices else 20000.0

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

    # Hapus hasil simulasi lama
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

    # Skala resmi demo/hemat: 20 agen individual (tanpa archetype)
    total = max(8, min(min(n_agents, 20), 20))
    personas = generate_discrete_personas(
        n=total,
        seed=seed,
        surrounding_type=(ctx.surroundings[0] if ctx and ctx.surroundings else None),
        visitor_types=passersby,
        median_menu_price=median_price,
        peak_hours=(
            [f"{rh.get('start', '')}-{rh.get('end', '')}" for rh in (ctx.rush_hours or [])]
            if ctx and ctx.rush_hours
            else None
        ),
    )

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

    for p in personas:
        session.add(
            Persona(
                id=f"per_{analysis.id}_{p.agent_id:02d}",
                analysis_id=analysis.id,
                agent_id=p.agent_id,
                segment=p.segment,
                discrete_traits=p.discrete_traits,
                concrete_facts=p.concrete_facts,
                context_around=p.context_around,
                daily_mood=p.daily_mood,
                seed=p.seed,
                table_version=p.table_version,
            )
        )

    seg_inputs = [
        SegmentInput(id=s.id, vantage=s.vantage, narrative=s.narrative, not_visible=s.not_visible or "")
        for s in segs
    ]
    btype = ctx.business_type if ctx and ctx.business_type else "usaha kuliner"
    business_summary = f"{bname} ({btype}), berlokasi di {loc_desc}."

    agent_results = run_20_agent_swarm(
        personas=personas,
        segments=seg_inputs,
        business_summary=business_summary,
        batch_size=10,
        seed=seed,
    )

    for res in agent_results:
        session.add(
            AgentDecisionRecord(
                id=f"dec_{sim_run.id}_{res.agent_id:02d}",
                run_id=sim_run.id,
                analysis_id=analysis.id,
                agent_id=res.agent_id,
                batch_id=res.batch_id,
                monologue=res.monologue,
                final_decision=res.final_decision,
                stopped_at_segment_id=res.stopped_at_segment_id,
                deciding_factor=res.deciding_factor,
                factor_segment_ids=res.factor_segment_ids,
                segment_traces=res.segment_traces,
                attributions=res.attributions,
                primary_hypothesis_id=res.primary_hypothesis_id,
                other_reason=res.other_reason,
            )
        )

    # Agregasi Katalog Isyarat & 1 panggilan LLM untuk memilih tindakan dari katalog
    cues = aggregate_cue_scores(agent_results)
    curated_recs = generate_catalog_recommendations(
        cues=cues,
        segments=seg_inputs,
        cannot_change=fixed_constraints,
        owner_goals=owner_goals,
    )

    seg_map = {s.id: s for s in segs}
    for rank_idx, rec in enumerate(curated_recs, start=1):
        target_seg = seg_map.get(rec.segment_ids[0]) if rec.segment_ids else segs[0]
        time_str = _mmss(target_seg.timestamp_start) if target_seg else "00:00"
        impact_lbl = "Tinggi" if rec.impact_score >= 18 else ("Sedang" if rec.impact_score >= 9 else "Rendah")
        session.add(
            RecommendationItem(
                id=f"rec_{analysis.id}_{rank_idx}",
                analysis_id=analysis.id,
                run_id=sim_run.id,
                hypothesis_id=rec.cue_code,
                action_id=rec.action_id,
                priority_tag="Prioritas" if rec.is_priority else "Nanti",
                rank=rank_idx,
                title=rec.title,
                description=rec.description,
                impact=impact_lbl,
                effort=rec.effort,
                estimated_lift_range=f"+{max(1, round(rec.efficacy * 6))} dari {total} agen",
                location_zone=f"{(target_seg.vantage if target_seg else 'jalan').title()} (Detik {time_str})",
            )
        )

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
                segment_traces=[
                    {
                        "segment_id": str(t.get("segment_id", "")),
                        "monologue": str(t.get("monologue", "")),
                        "action": str(t.get("action", "lanjut")),
                    }
                    for t in (dec.segment_traces or [])
                    if isinstance(t, dict)
                ],
                attributions=[
                    {
                        "cue_code": str(a.get("cue_code") or a.get("hypothesis_id") or "H0"),
                        "direction": str(a.get("direction") or "menghambat"),
                        "relevance_score": int(a.get("relevance_score") or a.get("strength") or 0),
                        "evidence": str(a.get("evidence") or ""),
                    }
                    for a in (dec.attributions or [])
                    if isinstance(a, dict)
                ],
            )
        )
    return results


def compute_what_if_projection(
    analysis: AnalysisModel,
    funnel_stages: list[FunnelStageDataOut],
    recommendations: list[ParetoRecommendationOut],
    checked_ids: list[str] | None = None,
    *,
    decisions: list[AgentDecisionRecord] | None = None,
    segments: list[TranscriptSegment] | None = None,
    rec_rows: list[RecommendationItem] | None = None,
    personas: list[Persona] | None = None,
    projection_mode: str = "estimasi_cepat",
) -> WhatIfProjectionOut:
    """Mode 1 (estimasi_cepat) & Mode 2 (terverifikasi_simulasi) untuk proyeksi pasca-simulasi."""
    from app.services.simulation.ablation import (
        compute_quick_estimate_projection,
        run_verified_simulation_projection,
    )
    from app.services.simulation.catalog import ACTION_BY_ID
    from app.services.simulation.runner import AgentRunResult, SegmentInput

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
    rec_row_by_id = {r.id: r for r in (rec_rows or [])}

    s_see = funnel_stages[0] if len(funnel_stages) > 0 else None
    s_stop = funnel_stages[1] if len(funnel_stages) > 1 else None
    s_enter = funnel_stages[2] if len(funnel_stages) > 2 else None
    s_order = funnel_stages[3] if len(funnel_stages) > 3 else None

    base_see_pct = round(s_see.percentage) if s_see else 100
    base_stop_pct = round(s_stop.percentage) if s_stop else 70
    base_enter_pct = round(s_enter.percentage) if s_enter else 30
    base_order_pct = round(s_order.percentage) if s_order else 20
    buyers_base = s_order.count if s_order else max(0, round(total * base_order_pct / 100))

    low_accuracy = False
    active_mode = "estimasi_cepat"

    if decisions and segments:
        seg_inputs = [
            SegmentInput(id=s.id, vantage=s.vantage, narrative=s.narrative, not_visible=s.not_visible or "")
            for s in segments
        ]
        baseline_runs = [
            AgentRunResult(
                agent_id=d.agent_id,
                batch_id=1 if d.agent_id <= 10 else 2,
                monologue=d.monologue,
                final_decision=d.final_decision,
                stopped_at_segment_id=d.stopped_at_segment_id,
                deciding_factor=d.deciding_factor,
                factor_segment_ids=list(d.factor_segment_ids or []),
                segment_traces=[t.model_dump() for t in d.segment_traces],
                attributions=[a.model_dump() for a in d.attributions],
                primary_hypothesis_id=(d.attributions[0].cue_code if d.attributions else "H0"),
            )
            for d in decisions
        ]
        checked_actions: list[tuple[str, list[str]]] = []
        for r in checked_recs:
            row = rec_row_by_id.get(r.id)
            action_id = row.action_id if row else "A8.1"
            target_sids = [s.id for s in segments if s.vantage in r.location_zone.lower()] or (
                [segments[0].id] if segments else []
            )
            checked_actions.append((action_id, target_sids))

        if projection_mode == "terverifikasi_simulasi" and personas and checked_actions:
            persona_specs = [
                PersonaSpecOut(
                    agent_id=p.agent_id,
                    segment=p.segment,
                    discrete_traits=dict(p.discrete_traits),
                    concrete_facts=dict(p.concrete_facts),
                    context_around=p.context_around,
                    daily_mood=p.daily_mood,
                    seed=p.seed,
                    table_version=p.table_version,
                )
                for p in sorted(personas, key=lambda x: x.agent_id)
            ]
            verified = run_verified_simulation_projection(
                personas=persona_specs,
                segments=seg_inputs,
                baseline_results=baseline_runs,
                business_summary=f"{bname}",
                checked_actions=[(aid, sids, None) for aid, sids in checked_actions],
                batch_size=10,
                seed=persona_specs[0].seed if persona_specs else 42,
            )
            buyers_proj = verified.buyers_verified_count
            proj_stop_pct = round((verified.stage_verified_counts["tertarik"] / total) * 100)
            proj_enter_pct = round((verified.stage_verified_counts["masuk"] / total) * 100)
            proj_order_pct = round((buyers_proj / total) * 100)
            total_cost_rp = sum(
                ACTION_BY_ID[aid].cost_rp for aid, _ in checked_actions if aid in ACTION_BY_ID
            )
            accuracy_note = None
            active_mode = "terverifikasi_simulasi"
        else:
            quick = compute_quick_estimate_projection(
                segments=seg_inputs,
                baseline_results=baseline_runs,
                checked_actions=checked_actions,
            )
            buyers_proj = quick.buyers_projected_count
            proj_stop_pct = round((quick.stage_projected_counts["tertarik"] / total) * 100)
            proj_enter_pct = round((quick.stage_projected_counts["masuk"] / total) * 100)
            proj_order_pct = round((buyers_proj / total) * 100)
            total_cost_rp = quick.total_cost_rp
            low_accuracy = quick.low_accuracy_early_edit
            accuracy_note = quick.accuracy_note
    else:
        proj_stop_pct = base_stop_pct
        proj_enter_pct = base_enter_pct
        proj_order_pct = base_order_pct
        buyers_proj = buyers_base
        total_cost_rp = 0
        accuracy_note = None

    proj_see_pct = 100
    highest_drop = max((s.drop_off_rate for s in funnel_stages[:3]), default=50.0)
    proj_drop = max(10.0, highest_drop - max(0, proj_order_pct - base_order_pct) * 0.9)

    daily_visitors = (analysis.context.daily_visitors if analysis.context and analysis.context.daily_visitors else None) or 60
    extra_daily_buyers = max(0, round(daily_visitors * ((buyers_proj - buyers_base) / total)))
    daily_rev_lift = extra_daily_buyers * avg_ticket
    rev_lift_str = f"+{_format_rp_short(daily_rev_lift).replace('Rp ', '')}" if daily_rev_lift > 0 else "Rp 0"
    cost_str = _format_rp_short(total_cost_rp) if total_cost_rp > 0 else "Rp 0"

    def _delta(base: int, proj: int) -> str:
        diff = proj - base
        return "Tetap" if diff <= 0 else f"+{diff} dari {total} agen"

    base_stop_cnt = s_stop.count if s_stop else round(total * base_stop_pct / 100)
    base_enter_cnt = s_enter.count if s_enter else round(total * base_enter_pct / 100)
    proj_stop_cnt = round(total * proj_stop_pct / 100)
    proj_enter_cnt = round(total * proj_enter_pct / 100)

    stages_comp = [
        WhatIfStageComparisonOut(
            id="melihat",
            name="Melihat Toko",
            baseline_pct=base_see_pct,
            projected_pct=proj_see_pct,
            delta_label="Tetap",
        ),
        WhatIfStageComparisonOut(
            id="tertarik",
            name="Berhenti & Tertarik",
            baseline_pct=base_stop_pct,
            projected_pct=proj_stop_pct,
            delta_label=_delta(base_stop_cnt, proj_stop_cnt),
        ),
        WhatIfStageComparisonOut(
            id="masuk",
            name="Masuk ke Dalam",
            baseline_pct=base_enter_pct,
            projected_pct=proj_enter_pct,
            delta_label=_delta(base_enter_cnt, proj_enter_cnt),
        ),
        WhatIfStageComparisonOut(
            id="memesan",
            name="Jadi Memesan",
            baseline_pct=base_order_pct,
            projected_pct=proj_order_pct,
            delta_label=_delta(buyers_base, buyers_proj),
        ),
    ]

    if checked_recs:
        top_titles = "; ".join(r.title for r in checked_recs[:2])
        prefix_label = (
            "Terverifikasi simulasi (20 agen)"
            if active_mode == "terverifikasi_simulasi"
            else "Estimasi cepat (contoh awal)"
        )
        conclusion = (
            f"{prefix_label}: dengan menerapkan {len(checked_recs)} tindakan pada {bname} ({top_titles}), "
            f"pembeli menjadi {buyers_proj} dari {total} agen (baseline {buyers_base} dari {total})."
            + (f" Catatan: {accuracy_note}" if accuracy_note else "")
        )
    else:
        conclusion = f"Pilih minimal satu rekomendasi perbaikan untuk melihat estimasi cepat di {bname}."

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
        mode=active_mode,
        low_accuracy_early_edit=low_accuracy,
        accuracy_note=accuracy_note,
    )


def build_dashboard_data(
    session: Session,
    analysis: AnalysisModel,
    checked_recommendation_ids: list[str] | None = None,
    projection_mode: str = "estimasi_cepat",
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
            is_highest_friction=(r_lewat == max_drop and r_lewat > r_berhenti and r_lewat > r_masuk),
        ),
        FunnelStageDataOut(
            id="berhenti",
            name="2. Berhenti Sejenak",
            count=berhenti_cnt,
            percentage=round((berhenti_cnt / max(total_agents, 1)) * 100, 1),
            drop_off_count=berhenti_pergi_cnt,
            drop_off_rate=r_berhenti,
            is_highest_friction=(r_berhenti == max_drop and r_berhenti >= r_lewat and r_berhenti > r_masuk),
        ),
        FunnelStageDataOut(
            id="masuk",
            name="3. Masuk ke Dalam",
            count=masuk_cnt,
            percentage=round((masuk_cnt / max(total_agents, 1)) * 100, 1),
            drop_off_count=masuk_tanpa_cnt,
            drop_off_rate=r_masuk,
            is_highest_friction=(r_masuk == max_drop and r_masuk >= r_lewat and r_masuk >= r_berhenti),
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
            is_hotspot=(r_lewat == max_drop and r_lewat > r_berhenti and r_lewat > r_masuk),
        ),
        WaypointOut(
            id="tangga",
            time=t_pintu,
            name=f"Akses Masuk {business_name}",
            status=f"{r_berhenti:g}% bocor",
            is_hotspot=(r_berhenti == max_drop and r_berhenti >= r_lewat and r_berhenti > r_masuk),
        ),
        WaypointOut(
            id="kasir",
            time=t_dalam,
            name=f"Titik Pesan / Kasir {business_name}",
            status=f"{round(100 - r_masuk, 1):g}% memesan",
            is_hotspot=(r_masuk == max_drop and r_masuk >= r_lewat and r_masuk >= r_berhenti),
        ),
    ]

    # Agregasi faktor penyebab batal tertinggi dari Katalog Isyarat (H1-H10)
    from app.services.simulation.pareto import aggregate_cue_scores
    from app.services.simulation.runner import AgentRunResult

    dec_runs = [
        AgentRunResult(
            agent_id=d.agent_id,
            batch_id=1 if d.agent_id <= 10 else 2,
            monologue=d.monologue,
            final_decision=d.final_decision,
            stopped_at_segment_id=d.stopped_at_segment_id,
            deciding_factor=d.deciding_factor,
            factor_segment_ids=list(d.factor_segment_ids or []),
            segment_traces=[t.model_dump() for t in d.segment_traces],
            attributions=[a.model_dump() for a in d.attributions],
            primary_hypothesis_id=(d.attributions[0].cue_code if d.attributions else "H0"),
        )
        for d in decisions
    ]
    cue_ranks = aggregate_cue_scores(dec_runs)
    non_h0_cues = [c for c in cue_ranks if c.cue_code != "H0"]
    top_cue = non_h0_cues[0] if non_h0_cues else (cue_ranks[0] if cue_ranks else None)

    non_buyers = [d for d in decisions if d.final_decision != "memesan"]
    factor_counts = Counter(d.deciding_factor for d in non_buyers if d.deciding_factor)
    top_factor_text = (
        factor_counts.most_common(1)[0][0]
        if factor_counts
        else (top_cue.title if top_cue else f"Informasi menu & harga {business_name} belum terlihat dari jalan")
    )
    main_cause_short = f"{top_cue.cue_code} · {top_cue.title}" if top_cue else "Info Depan Toko"
    main_cause_rank_str = (
        f"Peringkat 1 Katalog Isyarat ({top_cue.affected_agents_count} dari {top_cue.total_non_buyers} agen batal · Lift {top_cue.lift}x)"
        if top_cue
        else f"Peringkat 1 ({len(non_buyers)} dari {total_agents} agen batal)"
    )

    menus = list(analysis.menu_items or [])
    avg_price = round(sum(m.price for m in menus) / len(menus)) if menus else 20000
    daily_vis = (analysis.context.daily_visitors if analysis.context and analysis.context.daily_visitors else None) or 50
    monthly_lost_visitors = max(30, round(daily_vis * (berhenti_pergi_cnt / max(total_agents, 1)) * 15))
    loss_low = monthly_lost_visitors * avg_price
    loss_high = round(loss_low * 1.35)

    key_insights = [
        KeyInsightOut(
            id=f"ins_{analysis.id}_1",
            number="01",
            type="friction",
            title=f"Friksi Utama di Akses Masuk {business_name} ({berhenti_pergi_cnt} dari {berhenti_cnt} agen batal)",
            description=(
                f"Dari {berhenti_cnt} agen yang tertarik berhenti di depan {business_name}, "
                f"{berhenti_pergi_cnt} agen urung masuk. Alasan terkuat: {top_factor_text}"
            ),
        ),
        KeyInsightOut(
            id=f"ins_{analysis.id}_2",
            number="02",
            type="friction" if lewat_cnt >= 5 else "positive",
            title=f"Daya Tarik Fasad dari Jalan ({berhenti_cnt} dari {total_agents} agen berhenti)",
            description=(
                f"{berhenti_cnt} dari {total_agents} agen pejalan kaki menoleh ke {business_name}, "
                f"namun {lewat_cnt} agen langsung lewat karena penanda dari arah jalan belum terbaca cepat."
            ),
        ),
        KeyInsightOut(
            id=f"ins_{analysis.id}_3",
            number="03",
            type="positive",
            title=f"Konversi Area Kasir ({memesan_cnt} dari {masuk_cnt} agen memesan)",
            description=(
                f"Begitu calon pelanggan melewati pintu masuk {business_name}, "
                f"{memesan_cnt} dari {masuk_cnt} agen memesan di kasir."
            ),
        ),
    ]

    def _format_pct_id(pct: float) -> str:
        txt = f"{pct:.1f}".rstrip("0").rstrip(".")
        return f"{txt.replace('.', ',')}%"

    drop_candidates = [
        (
            r_lewat,
            0,
            total_agents,
            "Melihat",
            "Berhenti",
            f"Fasad / Jalan {business_name} (Detik {t_jalan})",
            f"{lewat_cnt} dari {total_agents} agen langsung lewat dari arah jalan tanpa berhenti ({_format_pct_id(r_lewat)}).",
        ),
        (
            r_berhenti,
            1,
            berhenti_cnt,
            "Berhenti",
            "Masuk",
            f"Akses Masuk {business_name} (Detik {t_pintu})",
            f"{berhenti_pergi_cnt} dari {berhenti_cnt} agen yang sudah berhenti akhirnya batal masuk ({_format_pct_id(r_berhenti)}).",
        ),
        (
            r_masuk,
            2,
            masuk_cnt,
            "Masuk",
            "Memesan",
            f"Titik Pesan / Kasir {business_name} (Detik {t_dalam})",
            f"{masuk_tanpa_cnt} dari {masuk_cnt} agen yang sudah masuk akhirnya batal memesan di kasir ({_format_pct_id(r_masuk)}).",
        ),
    ]
    valid_drops = [d for d in drop_candidates if d[2] > 0]
    top_rate, _, _, top_from, top_to, top_loc, top_desc = max(
        valid_drops or drop_candidates[:1], key=lambda d: (d[0], d[1])
    )

    kpi = DashboardKpiOut(
        buyers_count=memesan_cnt,
        buyers_rate_text=f"{memesan_cnt} dari {total_agents} agen · contoh awal",
        buyers_description=f"Konversi simulasi 20 agen di {business_name} hingga memesan di kasir (skala contoh awal, bukan persen presisi).",
        drop_off_rate_text=_format_pct_id(top_rate),
        drop_off_from_stage=top_from,
        drop_off_to_stage=top_to,
        drop_off_location=top_loc,
        drop_off_description=top_desc,
        main_cause_title=main_cause_short,
        main_cause_cue_rank=main_cause_rank_str,
        main_cause_detail=top_factor_text,
        potential_loss_amount=f"{_format_rp_short(loss_low)} – {_format_rp_short(loss_high)}",
        potential_loss_basis=f"Estimasi per bulan dari {berhenti_pergi_cnt} agen batal masuk",
        potential_loss_detail=f"Dihitung dari rata-rata harga menu Rp {avg_price:,} x estimasi lalu lintas harian {business_name}.".replace(
            ",", "."
        ),
    )

    persona_rows = list(session.scalars(select(Persona).where(Persona.analysis_id == analysis.id)).all())
    what_if = compute_what_if_projection(
        analysis=analysis,
        funnel_stages=funnel_stages,
        recommendations=recommendations,
        checked_ids=checked_recommendation_ids,
        decisions=decisions,
        segments=segs,
        rec_rows=rec_rows,
        personas=persona_rows,
        projection_mode=projection_mode,
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


def clone_analysis_with_transcript(
    session: Session,
    source: AnalysisModel,
    name: str | None = None,
) -> AnalysisSchema:
    """Buat analisis baru dengan menyalin konteks, menu, video, & transkrip dari analisis sumber."""
    new_id = f"anl_{uuid4().hex[:12]}"
    new_anl = AnalysisModel(
        id=new_id,
        business_id=source.business_id,
        name=(name.strip() if name and name.strip() else f"{source.name} (Salinan)"),
        status="processing",
        transcript_version=1,
        stale=False,
        total_agents=20,
        is_demo=source.is_demo,
        quality_label=source.quality_label,
        thumbnail_url=source.thumbnail_url,
    )
    session.add(new_anl)
    session.flush()

    if source.context is not None:
        c = source.context
        session.add(
            AnalysisContextModel(
                id=f"ctx_{uuid4().hex[:10]}",
                analysis_id=new_id,
                business_type=c.business_type,
                business_name=c.business_name,
                location_name=c.location_name,
                location_lat=c.location_lat,
                location_lng=c.location_lng,
                location_description=c.location_description,
                surroundings=list(c.surroundings or []),
                surroundings_other=c.surroundings_other,
                passersby=list(c.passersby or []),
                business_goal=c.business_goal,
                fixed_constraints=list(c.fixed_constraints or []),
                calculated_price_level=c.calculated_price_level,
                open_hour=c.open_hour,
                close_hour=c.close_hour,
                rush_hours=list(c.rush_hours or []),
                daily_sales_rp=c.daily_sales_rp,
                daily_visitors=c.daily_visitors,
                parking=list(c.parking or []),
                categorical_features=dict(c.categorical_features or {}),
                w_matrix_version=c.w_matrix_version,
                segment_table_version=c.segment_table_version,
                segment_overrides=dict(c.segment_overrides) if c.segment_overrides else None,
            )
        )

    for m in source.menu_items or []:
        session.add(
            MenuItemModel(
                id=f"mnu_{uuid4().hex[:10]}",
                analysis_id=new_id,
                name=m.name,
                price=m.price,
                category=m.category,
                is_featured=m.is_featured,
                sort_order=m.sort_order,
            )
        )

    src_vid = session.scalars(select(VideoAsset).where(VideoAsset.analysis_id == source.id)).first()
    if src_vid is not None:
        session.add(
            VideoAsset(
                id=f"vid_{uuid4().hex[:10]}",
                analysis_id=new_id,
                original_filename=src_vid.original_filename,
                storage_key=src_vid.storage_key,
                duration_s=src_vid.duration_s,
                cashier_at_s=src_vid.cashier_at_s,
                width=src_vid.width,
                height=src_vid.height,
                accepted=src_vid.accepted,
                quality_checks=dict(src_vid.quality_checks or {}),
                blurred_faces_count=src_vid.blurred_faces_count,
                blurred_plates_count=src_vid.blurred_plates_count,
            )
        )

    src_twin = session.scalars(select(TwinAsset).where(TwinAsset.analysis_id == source.id)).first()
    if src_twin is not None:
        session.add(
            TwinAsset(
                id=f"tw_{uuid4().hex[:10]}",
                analysis_id=new_id,
                mode=src_twin.mode,
                registered_frames=src_twin.registered_frames,
                total_frames=src_twin.total_frames,
                quality_label=src_twin.quality_label,
                points_count=src_twin.points_count,
                path_duration_seconds=src_twin.path_duration_seconds,
                asset_url=src_twin.asset_url,
            )
        )

    src_segs = list(
        session.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.analysis_id == source.id)
            .order_by(TranscriptSegment.timestamp_start.asc())
        ).all()
    )
    seg_id_map: dict[str, str] = {}
    for s in src_segs:
        new_seg_id = f"seg_{uuid4().hex[:8]}"
        seg_id_map[s.id] = new_seg_id
        session.add(
            TranscriptSegment(
                id=new_seg_id,
                analysis_id=new_id,
                timestamp_start=s.timestamp_start,
                timestamp_end=s.timestamp_end,
                frame_keys=list(s.frame_keys or []),
                vantage=s.vantage,
                zone_id=s.zone_id,
                narrative=s.narrative,
                not_visible=s.not_visible,
                confidence=s.confidence,
                is_confirmed_by_owner=s.is_confirmed_by_owner,
                edited_by_owner=s.edited_by_owner,
                camera_pose=dict(s.camera_pose) if s.camera_pose else None,
            )
        )
    session.flush()

    src_chks = list(
        session.scalars(
            select(TranscriptCheckpoint).where(TranscriptCheckpoint.analysis_id == source.id)
        ).all()
    )
    for chk in src_chks:
        session.add(
            TranscriptCheckpoint(
                id=f"chk_{uuid4().hex[:8]}",
                analysis_id=new_id,
                kind=chk.kind,
                timestamp_s=chk.timestamp_s,
                segment_id=seg_id_map.get(chk.segment_id or ""),
            )
        )

    session.commit()
    loaded = load_analysis_with_relations(session, new_id)
    assert loaded is not None
    return analysis_to_schema(loaded)
