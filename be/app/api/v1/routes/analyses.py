"""CRUD Siklus Analisis (PRD v1.4 Bagian 4.1, 4.4)."""

from uuid import uuid4

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.db import SessionDep
from app.models.entities import Analysis as AnalysisModel
from app.models.entities import Business as BusinessModel
from app.schemas.analysis import Analysis, AnalysisCreate, AnalysisUpdate
from app.services.crud import (
    analysis_to_schema,
    default_context_for_business,
    load_analysis_with_relations,
    upsert_analysis_context,
)

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.get("", response_model=list[Analysis])
def list_analyses(
    session: SessionDep,
    business_id: str | None = None,
) -> list[Analysis]:
    stmt = (
        select(AnalysisModel)
        .options(
            selectinload(AnalysisModel.business),
            selectinload(AnalysisModel.context),
            selectinload(AnalysisModel.menu_items),
        )
        .order_by(AnalysisModel.created_at.desc())
    )
    if business_id:
        stmt = stmt.where(AnalysisModel.business_id == business_id)
    rows = list(session.scalars(stmt).all())
    return [analysis_to_schema(row) for row in rows]


@router.post("", response_model=Analysis, status_code=status.HTTP_201_CREATED)
def create_analysis(
    body: AnalysisCreate,
    session: SessionDep,
) -> Analysis:
    if not body.business_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "business_id wajib diisi.")
    biz = session.get(BusinessModel, body.business_id)
    if biz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tempat usaha tidak ditemukan.")

    analysis_id = f"anl_{uuid4().hex[:12]}"
    name = (body.name or "").strip() or f"Analisis {biz.name} ({biz.branch_name})"
    analysis = AnalysisModel(
        id=analysis_id,
        business_id=biz.id,
        name=name,
        status=body.status,
        is_demo=body.is_demo,
        total_agents=body.total_agents,
        quality_label=body.quality_label,
        thumbnail_url=body.thumbnail_url,
    )
    analysis.business = biz
    session.add(analysis)
    session.flush()

    initial_ctx = body.context or default_context_for_business(
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


@router.get("/{analysis_id}", response_model=Analysis)
def get_analysis(
    analysis_id: str,
    session: SessionDep,
) -> Analysis:
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analisis tidak ditemukan.")
    return analysis_to_schema(analysis)


@router.patch("/{analysis_id}", response_model=Analysis)
def update_analysis(
    analysis_id: str,
    body: AnalysisUpdate,
    session: SessionDep,
) -> Analysis:
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analisis tidak ditemukan.")

    if body.name is not None:
        analysis.name = body.name.strip()
    if body.status is not None:
        analysis.status = body.status
    if body.stale is not None:
        analysis.stale = body.stale
        if not body.stale:
            analysis.stale_reasons = []
    if body.quality_label is not None:
        analysis.quality_label = body.quality_label
    if body.total_agents is not None:
        analysis.total_agents = body.total_agents
    if body.thumbnail_url is not None:
        analysis.thumbnail_url = body.thumbnail_url
    if body.set_as_primary and analysis.business is not None:
        analysis.business.primary_analysis_id = analysis.id

    session.commit()
    session.refresh(analysis)
    return analysis_to_schema(analysis)


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: str,
    session: SessionDep,
) -> Response:
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analisis tidak ditemukan.")

    biz = analysis.business
    was_primary = biz is not None and biz.primary_analysis_id == analysis.id
    if was_primary and biz is not None:
        biz.primary_analysis_id = None
        session.flush()

    session.delete(analysis)
    session.flush()

    if was_primary and biz is not None:
        fallback_stmt = (
            select(AnalysisModel)
            .where(AnalysisModel.business_id == biz.id)
            .order_by(AnalysisModel.created_at.desc())
        )
        fallback = session.scalars(fallback_stmt).first()
        biz.primary_analysis_id = fallback.id if fallback is not None else None

    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
