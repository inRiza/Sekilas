from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import Vec3

VantageType = Literal["jalan", "pintu", "dalam"]
SegmentConfidenceType = Literal["stabil", "tidak_pasti"]


class CameraPoseSchema(BaseModel):
    position: list[float]
    look_vector: list[float]


class TranscriptSegmentOut(BaseModel):
    """PRD v1.4 F3/F4: Segmen transkrip kejadian dari VLM + verifikasi pemilik."""

    id: str
    timestamp_start: float
    timestamp_end: float
    frame_keys: list[str] = Field(default_factory=list)
    vantage: VantageType = "jalan"
    zone_id: str | None = None
    narrative: str
    not_visible: str = ""
    confidence: SegmentConfidenceType = "stabil"
    is_confirmed_by_owner: bool = False
    edited_by_owner: bool = False
    camera_pose: CameraPoseSchema | None = None


class TranscriptSegmentCreate(BaseModel):
    timestamp_start: float = Field(ge=0)
    timestamp_end: float = Field(ge=0)
    vantage: VantageType = "jalan"
    zone_id: str | None = None
    narrative: str
    not_visible: str = ""
    confidence: SegmentConfidenceType = "stabil"
    frame_keys: list[str] = Field(default_factory=list)
    is_confirmed_by_owner: bool = True


class TranscriptSegmentUpdate(BaseModel):
    timestamp_start: float | None = Field(default=None, ge=0)
    timestamp_end: float | None = Field(default=None, ge=0)
    vantage: VantageType | None = None
    zone_id: str | None = None
    narrative: str | None = None
    not_visible: str | None = None
    confidence: SegmentConfidenceType | None = None
    is_confirmed_by_owner: bool | None = None


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
