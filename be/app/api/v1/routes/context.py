"""Halaman 2 Konteks Usaha (PRD F1)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.schemas.context import BusinessContext, MenuItem

router = APIRouter(prefix="/analyses/{analysis_id}/context", tags=["context"])


@router.put("", response_model=BusinessContext)
def save_context(analysis_id: UUID, body: BusinessContext) -> BusinessContext:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M1")


@router.post("/menu-photo", response_model=list[MenuItem])
async def read_menu_photo(analysis_id: UUID, file: UploadFile) -> list[MenuItem]:
    """Foto menu dibaca otomatis, hasilnya dikoreksi pemilik di FE."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M1")
