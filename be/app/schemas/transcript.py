from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.common import Vec3


class CueCategory(StrEnum):
    open_hours_visible = "open_hours_visible"
    signage = "signage"
    menu_price_readable = "menu_price_readable"
    physical_barrier = "physical_barrier"
    neighbor_crowd = "neighbor_crowd"
    lighting = "lighting"
    entrance_visibility = "entrance_visibility"
    order_point_clarity = "order_point_clarity"


class Confidence(StrEnum):
    stable = "stable"
    uncertain = "uncertain"


class EntryStatus(StrEnum):
    pending = "pending"
    confirmed = "confirmed"
    deleted = "deleted"


class TranscriptEntry(BaseModel):
    """PRD F3. Entri tanpa frame bukti dibuang."""

    id: str
    timestamp_s: float = Field(ge=0)
    frame_url: str
    description: str
    category: CueCategory
    confidence: Confidence
    status: EntryStatus = EntryStatus.pending
    edited_by_owner: bool = False
    position: Vec3 | None = Field(None, description="Dari F7; kosong jika Visual Twin gagal")
    zone_id: str | None = None


class EntryUpdate(BaseModel):
    description: str | None = None
    category: CueCategory | None = None
    status: EntryStatus | None = None


class EntryCreate(BaseModel):
    timestamp_s: float = Field(ge=0)
    description: str
    category: CueCategory


class LlmEditRequest(BaseModel):
    instruction: str


class LlmEditProposal(BaseModel):
    """Sebelum/sesudah; baru berlaku setelah pemilik menekan Terima (F4)."""

    proposal_id: str
    before: TranscriptEntry
    after: TranscriptEntry


class Transcript(BaseModel):
    analysis_id: str
    entries: list[TranscriptEntry]

    @property
    def ready_for_simulation(self) -> bool:
        return all(
            e.confidence is Confidence.stable or e.status is not EntryStatus.pending
            for e in self.entries
        )
