"""F4: edit langsung (wajib) dan usulan edit via LLM (opsional, butuh Terima)."""

from app.schemas.transcript import LlmEditProposal, TranscriptEntry


def propose_edit(entry: TranscriptEntry, instruction: str) -> LlmEditProposal:
    raise NotImplementedError("M5")
