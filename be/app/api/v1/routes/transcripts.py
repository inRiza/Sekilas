"""Halaman 5 Verifikasi Transkrip (F3, F4)."""

from fastapi import APIRouter, HTTPException, Response, status

from app.core.auth import CurrentUserDep
from app.core.db import SessionDep
from app.models.entities import TranscriptSegment
from app.schemas.transcript import (
    LlmEditProposal,
    LlmEditRequest,
    TranscriptEntry,
    TranscriptSegmentCreate,
    TranscriptSegmentOut,
    TranscriptSegmentUpdate,
)
from app.services.crud import (
    create_transcript_segment,
    delete_transcript_segment,
    list_transcript_segments,
    load_analysis_with_relations,
    update_transcript_segment,
)

router = APIRouter(prefix="/analyses/{analysis_id}/transcript", tags=["transcript"])


@router.get("", response_model=list[TranscriptSegmentOut])
def get_transcript(analysis_id: str, session: SessionDep, _user: CurrentUserDep) -> list[TranscriptSegmentOut]:
    """Ambil daftar segmen transkrip VLM terurut waktu mulai."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    return list_transcript_segments(session, analysis.id)


@router.post("/segments", response_model=TranscriptSegmentOut, status_code=status.HTTP_201_CREATED)
@router.post("/entries", response_model=TranscriptSegmentOut, status_code=status.HTTP_201_CREATED)
def add_segment(
    analysis_id: str,
    body: TranscriptSegmentCreate,
    session: SessionDep,
    user: CurrentUserDep,
) -> TranscriptSegmentOut:
    """Tambah segmen manual oleh pemilik usaha; menaikkan transcript_version & mencatat AuditLog."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    return create_transcript_segment(session, analysis, body, actor=user.id)


@router.patch("/segments/{segment_id}", response_model=TranscriptSegmentOut)
@router.patch("/entries/{segment_id}", response_model=TranscriptSegmentOut)
def patch_segment(
    analysis_id: str,
    segment_id: str,
    body: TranscriptSegmentUpdate,
    session: SessionDep,
    user: CurrentUserDep,
) -> TranscriptSegmentOut:
    """Ubah atau konfirmasi segmen transkrip; mencatat AuditLog dan menandai dasbor stale bila narasi berubah."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    seg = session.get(TranscriptSegment, segment_id)
    if seg is None or seg.analysis_id != analysis.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Segmen transkrip tidak ditemukan")
    return update_transcript_segment(session, analysis, seg, body, actor=user.id)


@router.delete("/segments/{segment_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/entries/{segment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_segment(
    analysis_id: str,
    segment_id: str,
    session: SessionDep,
    user: CurrentUserDep,
) -> Response:
    """Hapus segmen transkrip; mencatat AuditLog dan menandai dasbor stale."""
    analysis = load_analysis_with_relations(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analisis tidak ditemukan")
    seg = session.get(TranscriptSegment, segment_id)
    if seg is None or seg.analysis_id != analysis.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Segmen transkrip tidak ditemukan")
    delete_transcript_segment(session, analysis, seg, actor=user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/entries/{entry_id}/llm-edit", response_model=LlmEditProposal)
def propose_llm_edit(analysis_id: str, entry_id: str, body: LlmEditRequest) -> LlmEditProposal:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M5")


@router.post("/proposals/{proposal_id}/accept", response_model=TranscriptEntry)
def accept_llm_edit(analysis_id: str, proposal_id: str) -> TranscriptEntry:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M5")


@router.post("/proposals/{proposal_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_llm_edit(analysis_id: str, proposal_id: str) -> None:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "TODO: M5")
