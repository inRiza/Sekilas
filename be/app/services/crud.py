"""Layanan CRUD untuk Business, Analysis, AnalysisContext, dan MenuItem (PRD v1.4)."""

from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import (
    AgentDecisionRecord,
    AuditLog,
    JobRecord,
    MeasurementPlanRecord,
    Persona,
    RecommendationItem,
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

    return BusinessContext(
        business_type=btype,  # type: ignore[arg-type]
        business_name=str(data.get("business_name") or name),
        location_name=str(data.get("location_name") or address or "Alamat tempat usaha"),
        location_lat=data.get("location_lat"),
        location_lng=data.get("location_lng"),
        location_description=str(data.get("location_description") or "Akses masuk dari jalan raya"),
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
def video_model_to_schema(video: VideoAsset) -> VideoMetadataOut:
    return VideoMetadataOut(
        id=video.id,
        analysis_id=video.analysis_id,
        original_filename=video.original_filename,
        storage_key=video.storage_key,
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
            storage_key=payload.storage_key or f"videos/{analysis.id}/{payload.original_filename}",
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
        or (existing.original_filename if existing and existing.original_filename else "video_rekaman_selasar.mp4"),
        storage_key=body.storage_key or (existing.storage_key if existing else None),
        duration_s=body.duration_s if body.duration_s is not None else (existing.duration_s if existing else 48.0),
        cashier_at_s=body.cashier_at_s,
        width=body.width if body.width is not None else (existing.width if existing else 1920),
        height=body.height if body.height is not None else (existing.height if existing else 1080),
        blurred_faces_count=body.blurred_faces_count
        if body.blurred_faces_count is not None
        else (existing.blurred_faces_count if existing else 14),
        blurred_plates_count=body.blurred_plates_count
        if body.blurred_plates_count is not None
        else (existing.blurred_plates_count if existing else 6),
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

    seg_count = session.scalar(
        select(func.count(TranscriptSegment.id)).where(TranscriptSegment.analysis_id == analysis.id)
    )
    if not seg_count:
        default_segments = [
            TranscriptSegment(
                id=f"seg_{uuid4().hex[:8]}",
                analysis_id=analysis.id,
                timestamp_start=0.0,
                timestamp_end=min(8.0, video_out.duration_s),
                frame_keys=["frame_001.jpg", "frame_003.jpg"],
                vantage="jalan",
                zone_id="trotoar_depan",
                narrative="Kamera berjalan di trotoar sisi jalan utama. Terlihat plang nama usaha di fasad depan, namun bagian bawah ruko agak tertutup kendaraan parkir.",
                not_visible="Daftar menu, harga, dan tanda BUKA/TUTUP belum terbaca dari sudut jalan ini.",
                confidence="stabil",
                is_confirmed_by_owner=True,
            ),
            TranscriptSegment(
                id=f"seg_{uuid4().hex[:8]}",
                analysis_id=analysis.id,
                timestamp_start=min(8.0, video_out.duration_s),
                timestamp_end=min(18.0, video_out.duration_s),
                frame_keys=["frame_008.jpg", "frame_012.jpg"],
                vantage="pintu",
                zone_id="depan_pintu",
                narrative="Mendekat ke akses masuk/tangga depan toko. Pencahayaan area pintu masuk tampak agak temaram dari luar.",
                not_visible="Tidak ada standing banner atau papan kisaran harga di depan pintu masuk.",
                confidence="tidak_pasti",
                is_confirmed_by_owner=False,
            ),
            TranscriptSegment(
                id=f"seg_{uuid4().hex[:8]}",
                analysis_id=analysis.id,
                timestamp_start=min(18.0, video_out.duration_s),
                timestamp_end=video_out.cashier_at_s or video_out.duration_s,
                frame_keys=["frame_025.jpg", "frame_040.jpg"],
                vantage="dalam",
                zone_id="meja_kasir",
                narrative="Memasuki area dalam toko menuju titik pesan/kasir. Suasana rapi dan papan menu di kasir terlihat jelas.",
                not_visible="",
                confidence="stabil",
                is_confirmed_by_owner=True,
            ),
        ]
        for s in default_segments:
            session.add(s)

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
    return TranscriptSegmentOut(
        id=seg.id,
        timestamp_start=seg.timestamp_start,
        timestamp_end=seg.timestamp_end,
        frame_keys=list(seg.frame_keys or []),
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
    rows = session.scalars(stmt).all()
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
# F5, F6, F7: Read Dashboard, Agent Decisions, and Measurement Plan
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
    if final_decision and final_decision != "all":
        dec_stmt = dec_stmt.where(AgentDecisionRecord.final_decision == final_decision)
    decisions = list(session.scalars(dec_stmt).all())

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
            table_version=per.table_version if per is not None else "v1.4-handcrafted",
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


def build_dashboard_data(session: Session, analysis: AnalysisModel) -> DashboardDataOut:
    biz = analysis.business
    business_name = (
        biz.name
        if biz is not None
        else (analysis.context.business_name if analysis.context is not None else analysis.name)
    )
    branch_name = biz.branch_name if biz is not None else "Pusat"
    total_agents = analysis.total_agents or 20

    # Recommendations from DB
    rec_stmt = (
        select(RecommendationItem)
        .where(RecommendationItem.analysis_id == analysis.id)
        .order_by(RecommendationItem.rank.asc())
    )
    rec_rows = list(session.scalars(rec_stmt).all())
    if rec_rows:
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
    else:
        recommendations = [
            ParetoRecommendationOut(
                id="rec_1",
                priority_tag="Prioritas",
                rank=1,
                title="Pasang standing banner menu & kisaran harga di kaki tangga",
                description="Tampilkan 3 menu favorit beserta harga mulai Rp 15rb persis di depan akses tangga bawah.",
                impact="Tinggi",
                effort="Rendah",
                estimated_lift_range="12% – 16%",
                location_zone="Kaki Tangga (Detik 00:18)",
            ),
            ParetoRecommendationOut(
                id="rec_2",
                priority_tag="Prioritas",
                rank=2,
                title="Tingkatkan pencahayaan lampu di sepanjang lorong tangga",
                description="Ganti lampu tangga dengan temperatur hangat yang lebih terang agar tidak terkesan sepi/tutup.",
                impact="Sedang",
                effort="Rendah",
                estimated_lift_range="4% – 7%",
                location_zone="Lorong Tangga (Detik 00:24)",
            ),
            ParetoRecommendationOut(
                id="rec_3",
                priority_tag="Nanti",
                rank=3,
                title="Ubah tulisan plang nama ruko menjadi kontras tinggi",
                description="Warna plang abu-abu saat ini cenderung menyatu dengan tembok ruko tetangga saat siang terik.",
                impact="Rendah",
                effort="Sedang",
                estimated_lift_range="2% – 4%",
                location_zone="Fasad Depan (Detik 00:04)",
            ),
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
            path_duration_seconds=twin_row.path_duration_seconds,
        )
    else:
        twin_meta = VisualTwinMetaOut(
            registered_frames=1440,
            total_frames=1600,
            ratio=0.90,
            quality_label=analysis.quality_label or "Kualitas baik",
            points_count=85200,
            path_duration_seconds=48.0,
        )

    funnel_stages = [
        FunnelStageDataOut(
            id="melihat",
            name="1. Melihat Toko",
            count=20,
            percentage=100,
            drop_off_count=6,
            drop_off_rate=30.0,
        ),
        FunnelStageDataOut(
            id="berhenti",
            name="2. Berhenti Sejenak",
            count=14,
            percentage=70.0,
            drop_off_count=8,
            drop_off_rate=57.1,
            is_highest_friction=True,
        ),
        FunnelStageDataOut(
            id="masuk",
            name="3. Masuk ke Dalam",
            count=6,
            percentage=30.0,
            drop_off_count=2,
            drop_off_rate=33.3,
        ),
        FunnelStageDataOut(
            id="memesan",
            name="4. Jadi Memesan",
            count=4,
            percentage=20.0,
            drop_off_count=0,
            drop_off_rate=0,
        ),
    ]

    key_insights = [
        KeyInsightOut(
            id="ins_1",
            number="01",
            type="friction",
            title="Harga Tidak Terlihat di Bawah Tangga",
            description="Dari 14 agen yang berhenti di depan ruko, 8 agen urung naik karena ragu apakah harga menu sesuai anggaran makan siang mereka.",
        ),
        KeyInsightOut(
            id="ins_2",
            number="02",
            type="friction",
            title="Tangga Lantai 2 Terlihat Gelap dari Trotoar",
            description="6 agen pejalan kaki melewati ruko tanpa menoleh ke atas karena lorong tangga masuk tertutup bayangan dan tampak belum buka.",
        ),
        KeyInsightOut(
            id="ins_3",
            number="03",
            type="positive",
            title="Konversi Kasir & Suasana Dalam Sangat Tinggi (66,7%)",
            description="Begitu calon pembeli berhasil naik ke lantai 2, mayoritas langsung memesan karena pencahayaan hangat dan papan menu kasir yang jelas.",
        ),
    ]

    kpi = DashboardKpiOut(
        buyers_count=4,
        buyers_rate_text=f"20,0% dari {total_agents} agen yang melihat",
        buyers_description="Konversi akhir simulasi dari pejalan kaki yang melintas di depan ruko hingga memesan di kasir.",
        drop_off_rate_text="v 57,1%",
        drop_off_from_stage="Berhenti",
        drop_off_to_stage="Masuk",
        drop_off_location="Kaki Tangga Ruko (Detik 00:18)",
        drop_off_description="8 dari 14 agen yang sudah tertarik berhenti akhirnya batal naik ke lantai 2.",
        main_cause_title="Harga & Menu Tidak Terbaca dari Bawah",
        main_cause_cue_rank="Peringkat 1 dari 4 Isyarat (48% suara)",
        main_cause_detail="Calon pembeli mahasiswa & pekerja ragu naik tangga karena takut harga di luar kantong.",
        potential_loss_amount="Rp 4,8 Juta – Rp 7,2 Juta",
        potential_loss_basis="Estimasi per bulan dari 8 agen batal",
        potential_loss_detail="Dihitung dari harga menu rata-rata Rp 18.000 x lalu lintas jam sibuk.",
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
    stmt = select(MeasurementPlanRecord).where(MeasurementPlanRecord.analysis_id == analysis.id)
    plan = session.scalars(stmt).first()
    if plan is None:
        plan = MeasurementPlanRecord(
            id=f"mp_{uuid4().hex[:10]}",
            analysis_id=analysis.id,
            observation_title="Pengamatan Konversi Kaki Tangga & Fasad Ruko",
            observation_spot="Berdiri di seberang jalan atau dekat minimarket sehingga trotoar depan dan mulut tangga lantai 2 terlihat bersamaan.",
            recommended_times=[
                "11:30 – 13:30 (Jam makan siang)",
                "18:30 – 20:30 (Jam nongkrong malam)",
            ],
            suggested_duration_minutes=30,
            metrics=[
                {
                    "id": "m1",
                    "stage_name": "Melintas & Menoleh",
                    "physical_cue": "Pejalan kaki/pengendara menoleh ke plang lantai 2 atau standing banner",
                    "target_count": 20,
                },
                {
                    "id": "m2",
                    "stage_name": "Berhenti di Bawah Tangga",
                    "physical_cue": "Berhenti minimal 3 detik membaca papan menu di kaki tangga",
                    "target_count": 14,
                },
                {
                    "id": "m3",
                    "stage_name": "Menaiki Tangga Masuk",
                    "physical_cue": "Mulai menaiki anak tangga menuju pintu kaca lantai 2",
                    "target_count": 8,
                },
                {
                    "id": "m4",
                    "stage_name": "Memesan di Kasir",
                    "physical_cue": "Melakukan transaksi pesanan di meja kasir",
                    "target_count": 6,
                },
            ],
            practical_tips=[
                "Lakukan pengamatan selama 30 menit sebelum memasang standing banner, lalu 30 menit di jam yang sama setelah banner dipasang.",
                "Gunakan kolom turus (IIII) untuk mencatat setiap pejalan kaki tanpa perlu mengajak bicara.",
                "Bandingkan rasio pengunjung yang naik tangga setelah melihat harga.",
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
