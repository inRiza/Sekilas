"""Layanan CRUD untuk Business, Analysis, AnalysisContext, dan MenuItem (PRD v1.4)."""

from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

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
from app.models.entities import (
    UserAccount,
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
