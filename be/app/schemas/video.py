from enum import StrEnum

from pydantic import BaseModel


class Checkpoint(StrEnum):
    visible_from_street = "visible_from_street"
    door_or_stairs = "door_or_stairs"
    signage = "signage"
    menu_and_price = "menu_and_price"
    order_point = "order_point"


class QualityIssue(StrEnum):
    too_dark = "too_dark"
    too_shaky = "too_shaky"
    too_short = "too_short"
    rotating_in_place = "rotating_in_place"


class VideoQuality(BaseModel):
    """PRD F2: ditolak jika gelap, goyang, < 20 detik."""

    accepted: bool
    duration_s: float
    issues: list[QualityIssue] = []


class VideoUploadResult(BaseModel):
    video_id: str
    checkpoints: list[Checkpoint]
    quality: VideoQuality


class VideoMetadataIn(BaseModel):
    """PRD v1.4 F2: Metadata video yang telah diproses/diburamkan di browser."""

    original_filename: str = "video_rekaman_toko.mp4"
    storage_key: str | None = None
    duration_s: float = 48.0
    cashier_at_s: float | None = None
    width: int | None = 1920
    height: int | None = 1080
    accepted: bool = True
    quality_checks: dict[str, str] = {}
    blurred_faces_count: int = 14
    blurred_plates_count: int = 6


class VideoMetadataOut(BaseModel):
    id: str
    analysis_id: str
    original_filename: str | None = None
    storage_key: str | None = None
    duration_s: float = 48.0
    cashier_at_s: float | None = None
    width: int | None = None
    height: int | None = None
    accepted: bool = True
    quality_checks: dict[str, str] = {}
    blurred_faces_count: int = 0
    blurred_plates_count: int = 0
