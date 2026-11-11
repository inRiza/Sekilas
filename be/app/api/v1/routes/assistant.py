"""Panel Tanya Sekilas (F8)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.assistant import AskRequest, AskResponse

router = APIRouter(prefix="/analyses/{analysis_id}/ask", tags=["assistant"])


@router.post("", response_model=AskResponse)
def ask(analysis_id: UUID, body: AskRequest) -> AskResponse:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M11")
