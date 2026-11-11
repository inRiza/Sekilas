"""Halaman 5 Verifikasi Transkrip (F3, F4)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.transcript import (
    EntryCreate,
    EntryUpdate,
    LlmEditProposal,
    LlmEditRequest,
    Transcript,
    TranscriptEntry,
)

router = APIRouter(prefix="/analyses/{analysis_id}/transcript", tags=["transcript"])


@router.get("", response_model=Transcript)
def get_transcript(analysis_id: UUID) -> Transcript:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M3")


@router.patch("/entries/{entry_id}", response_model=TranscriptEntry)
def update_entry(analysis_id: UUID, entry_id: str, body: EntryUpdate) -> TranscriptEntry:
    """Edit langsung. Ditandai edited_by_owner dan masuk audit log. Menandai dasbor kedaluwarsa."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M4")


@router.post("/entries", response_model=TranscriptEntry, status_code=status.HTTP_201_CREATED)
def add_entry(analysis_id: UUID, body: EntryCreate) -> TranscriptEntry:
    """Posisi 3D diambil dari pose kamera di timestamp_s."""
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M4")


@router.post("/entries/{entry_id}/llm-edit", response_model=LlmEditProposal)
def propose_llm_edit(analysis_id: UUID, entry_id: str, body: LlmEditRequest) -> LlmEditProposal:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M5")


@router.post("/proposals/{proposal_id}/accept", response_model=TranscriptEntry)
def accept_llm_edit(analysis_id: UUID, proposal_id: str) -> TranscriptEntry:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M5")


@router.post("/proposals/{proposal_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_llm_edit(analysis_id: UUID, proposal_id: str) -> None:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M5")
