from enum import StrEnum

from pydantic import BaseModel

from app.schemas.common import Range, Vec3
from app.schemas.simulation import Scenario


class FunnelStage(StrEnum):
    see = "see"
    stop = "stop"
    enter = "enter"
    order = "order"
    return_visit = "return_visit"


class FunnelStep(BaseModel):
    stage: FunnelStage
    rate: Range
    is_biggest_friction: bool = False
    top_factor: str | None = None


class Effort(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class Recommendation(BaseModel):
    """PRD F6.C: hanya dari hasil ablasi."""

    id: str
    title: str
    cue_entry_id: str
    impact: Range
    effort: Effort
    cost_estimate: str | None = None
    priority: bool
    location: Vec3 | None = None
    how_to: str | None = None
    sources: list[str] = []


class KeyPoint(BaseModel):
    text: str
    entry_ids: list[str]
    location: Vec3 | None = None


class HeatPoint(BaseModel):
    entry_id: str
    position: Vec3 | None
    intensity: float


class Dashboard(BaseModel):
    scenario: Scenario
    stale: bool = False
    key_points: list[KeyPoint]
    funnel: list[FunnelStep]
    recommendations: list[Recommendation]
    opportunities: list[str]
    threats: list[str]
    uncertain_entry_ids: list[str]
    heatmap: list[HeatPoint]
    disclaimer: str = "Ini hasil simulasi, bukan jumlah pelanggan nyata."
