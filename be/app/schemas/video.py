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
