"""CRUD Tempat Usaha / Cabang (PRD v1.4 Bagian 4.1)."""

from uuid import uuid4

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.models.entities import Analysis as AnalysisModel
from app.models.entities import Business as BusinessModel
from app.schemas.analysis import Analysis, AnalysisCreate
from app.schemas.business import BusinessCreate, BusinessOut, BusinessUpdate
from app.services.crud import (
    DEFAULT_USER_ID,
    analysis_to_schema,
    business_to_schema,
    count_analyses_by_business,
    default_context_for_business,
    ensure_user,
    upsert_analysis_context,
)

router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.get("", response_model=list[BusinessOut])
def list_businesses(
    session: SessionDep,
    current_user: CurrentUserDep,
    user_id: str | None = None,
) -> list[BusinessOut]:
    target_user_id = user_id or current_user.id
    stmt = (
        select(BusinessModel)
        .where(
            (BusinessModel.owner_id == target_user_id)
            | (BusinessModel.user_id == target_user_id)
        )
        .order_by(BusinessModel.created_at.asc())
    )
    businesses = list(session.scalars(stmt).all())
    counts = count_analyses_by_business(session, [b.id for b in businesses])
    return [business_to_schema(b, counts.get(b.id, 0)) for b in businesses]


@router.post("", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def create_business(
    body: BusinessCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> BusinessOut:
    resolved_user_id = body.owner_id or (body.user_id if body.user_id and body.user_id != DEFAULT_USER_ID else current_user.id)
    ensure_user(session, resolved_user_id)
    biz_id = f"biz_{uuid4().hex[:12]}"
    ctx = body.context or default_context_for_business(
        name=body.name.strip(),
        category=body.category,
        address=body.address.strip(),
    )
    biz = BusinessModel(
        id=biz_id,
        user_id=resolved_user_id,
        owner_id=resolved_user_id,
        name=body.name.strip(),
        branch_name=(body.branch_name or "Pusat").strip() or "Pusat",
        category=body.category,
        address=body.address.strip(),
        default_context=ctx.model_dump(),
    )
    session.add(biz)
    session.commit()
    session.refresh(biz)
    return business_to_schema(biz, 0)


@router.get("/{business_id}", response_model=BusinessOut)
def get_business(
    business_id: str,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> BusinessOut:
    biz = session.get(BusinessModel, business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tempat usaha tidak ditemukan.")
    # Verifikasi kepemilikan
    biz_owner = biz.owner_id or biz.user_id
    if current_user.id != DEFAULT_USER_ID and biz_owner != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses ke tempat usaha ini.")
    counts = count_analyses_by_business(session, [biz.id])
    return business_to_schema(biz, counts.get(biz.id, 0))


@router.patch("/{business_id}", response_model=BusinessOut)
def update_business(
    business_id: str,
    body: BusinessUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> BusinessOut:
    biz = session.get(BusinessModel, business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tempat usaha tidak ditemukan.")
    biz_owner = biz.owner_id or biz.user_id
    if current_user.id != DEFAULT_USER_ID and biz_owner != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses untuk mengubah tempat usaha ini.")

    if body.name is not None:
        biz.name = body.name.strip()
    if body.branch_name is not None:
        biz.branch_name = body.branch_name.strip() or "Pusat"
    if body.category is not None:
        biz.category = body.category
    if body.address is not None:
        biz.address = body.address.strip()
    if "primary_analysis_id" in body.model_fields_set:
        if body.primary_analysis_id is not None:
            target = session.get(AnalysisModel, body.primary_analysis_id)
            if target is None or target.business_id != biz.id:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Analisis utama harus milik tempat usaha yang sama.",
                )
        biz.primary_analysis_id = body.primary_analysis_id
    if body.context is not None:
        biz.default_context = body.context.model_dump()

    session.commit()
    session.refresh(biz)
    counts = count_analyses_by_business(session, [biz.id])
    return business_to_schema(biz, counts.get(biz.id, 0))


@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business(
    business_id: str,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Response:
    biz = session.get(BusinessModel, business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tempat usaha tidak ditemukan.")
    biz_owner = biz.owner_id or biz.user_id
    if current_user.id != DEFAULT_USER_ID and biz_owner != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses untuk menghapus tempat usaha ini.")
    biz.primary_analysis_id = None
    session.flush()
    session.delete(biz)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{business_id}/analyses", response_model=list[Analysis])
def list_business_analyses(
    business_id: str,
    session: SessionDep,
) -> list[Analysis]:
    biz = session.get(BusinessModel, business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tempat usaha tidak ditemukan.")
    stmt = (
        select(AnalysisModel)
        .options(
            selectinload(AnalysisModel.business),
            selectinload(AnalysisModel.context),
            selectinload(AnalysisModel.menu_items),
        )
        .where(AnalysisModel.business_id == business_id)
        .order_by(AnalysisModel.created_at.desc())
    )
    rows = list(session.scalars(stmt).all())
    return [analysis_to_schema(row) for row in rows]


@router.post("/{business_id}/analyses", response_model=Analysis, status_code=status.HTTP_201_CREATED)
def create_business_analysis(
    business_id: str,
    session: SessionDep,
    body: AnalysisCreate | None = None,
) -> Analysis:
    biz = session.get(BusinessModel, business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tempat usaha tidak ditemukan.")

    analysis_id = f"anl_{uuid4().hex[:12]}"
    name = (body.name.strip() if body and body.name else "") or f"Analisis {biz.name} ({biz.branch_name})"
    analysis = AnalysisModel(
        id=analysis_id,
        business_id=biz.id,
        name=name,
        status=body.status if body else "draft",
        is_demo=body.is_demo if body else True,
        total_agents=body.total_agents if body else 20,
        quality_label=body.quality_label if body else "Kualitas baik",
        thumbnail_url=body.thumbnail_url if body else None,
    )
    analysis.business = biz
    session.add(analysis)
    session.flush()

    initial_ctx = (body.context if body and body.context else None) or default_context_for_business(
        name=biz.name,
        category=biz.category,
        address=biz.address,
        raw=biz.default_context,
    )
    upsert_analysis_context(session, analysis, initial_ctx)

    if biz.primary_analysis_id is None:
        biz.primary_analysis_id = analysis.id

    session.commit()
    session.refresh(analysis)
    return analysis_to_schema(analysis)
