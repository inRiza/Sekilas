"""Halaman 2 Konteks Usaha & Menu (PRD v1.4 F1)."""

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.core.db import SessionDep
from app.schemas.context import BusinessContext, MenuItem
from app.services.context.menu_ocr import read_menu
from app.services.crud import (
    context_model_to_schema,
    default_context_for_business,
    load_analysis_with_relations,
    upsert_analysis_context,
)

router = APIRouter(prefix="/analyses/{analysis_id}/context", tags=["context"])


@router.get("", response_model=BusinessContext)
def get_context(
    analysis_id: str,
    session: SessionDep,
) -> BusinessContext:
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analisis tidak ditemukan.")
    if analysis.context is not None:
        return context_model_to_schema(analysis.context, list(analysis.menu_items or []))
    biz = analysis.business
    return default_context_for_business(
        name=biz.name if biz else analysis.name,
        category=biz.category if biz else "kedai",
        address=biz.address if biz else "",
        raw=biz.default_context if biz else None,
    )


@router.put("", response_model=BusinessContext)
def save_context(
    analysis_id: str,
    body: BusinessContext,
    session: SessionDep,
) -> BusinessContext:
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analisis tidak ditemukan.")

    saved = upsert_analysis_context(session, analysis, body)
    session.commit()
    return saved


@router.post("/menu-photo", response_model=list[MenuItem])
@router.post("/menu-file", response_model=list[MenuItem])
async def read_menu_photo(
    analysis_id: str,
    file: UploadFile,
) -> list[MenuItem]:
    """Foto atau file menu dibaca otomatis, hasilnya dikoreksi pemilik di FE."""
    image_bytes = await file.read()
    try:
        return read_menu(
            image_bytes,
            filename=file.filename or "",
            content_type=file.content_type or "image/jpeg",
        )
    except (ValueError, OSError):
        return []
