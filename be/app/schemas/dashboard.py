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


# ---------------- PRD v1.4 Dashboard Schemas ----------------
class FunnelStageDataOut(BaseModel):
    id: str  # melihat | berhenti | masuk | memesan
    name: str
    count: int
    percentage: float
    drop_off_count: int
    drop_off_rate: float
    is_highest_friction: bool = False


class KeyInsightOut(BaseModel):
    id: str
    number: str
    type: str  # positive | friction | neutral
    title: str
    description: str


class ParetoRecommendationOut(BaseModel):
    id: str
    priority_tag: str  # Prioritas | Nanti
    rank: int
    title: str
    description: str
    impact: str  # Tinggi | Sedang | Rendah
    effort: str  # Rendah | Sedang | Tinggi
    estimated_lift_range: str
    location_zone: str


class VisualTwinMetaOut(BaseModel):
    registered_frames: int
    total_frames: int
    ratio: float
    quality_label: str
    points_count: int
    path_duration_seconds: float


class DashboardKpiOut(BaseModel):
    buyers_count: int
    buyers_rate_text: str
    buyers_description: str
    drop_off_rate_text: str
    drop_off_from_stage: str
    drop_off_to_stage: str
    drop_off_location: str
    drop_off_description: str
    main_cause_title: str
    main_cause_cue_rank: str
    main_cause_detail: str
    potential_loss_amount: str
    potential_loss_basis: str
    potential_loss_detail: str


class WaypointOut(BaseModel):
    id: str
    time: str
    name: str
    status: str
    is_hotspot: bool = False


class WhatIfStageComparisonOut(BaseModel):
    id: str
    name: str
    baseline_pct: int
    projected_pct: int
    delta_label: str


class WhatIfProjectionOut(BaseModel):
    total_agents: int
    last_run_timestamp: str
    buyers_projected: int
    buyers_baseline: int
    drop_rate_projected: str
    drop_rate_baseline: str
    revenue_lift: str
    cost_estimate: str
    stages_comparison: list[WhatIfStageComparisonOut]
    model_conclusion: str
    mode: str = "estimasi_cepat"  # estimasi_cepat | terverifikasi_simulasi
    low_accuracy_early_edit: bool = False
    accuracy_note: str | None = None


class WhatIfRequest(BaseModel):
    checked_recommendation_ids: list[str] = []
    mode: str = "estimasi_cepat"  # estimasi_cepat | terverifikasi_simulasi


class DashboardDataOut(BaseModel):
    analysis_id: str
    business_id: str | None = None
    business_name: str
    branch_name: str | None = None
    created_at: str
    total_agents: int
    is_stale: bool = False
    kpi: DashboardKpiOut
    funnel_stages: list[FunnelStageDataOut]
    key_insights: list[KeyInsightOut]
    recommendations: list[ParetoRecommendationOut]
    twin_meta: VisualTwinMetaOut
    waypoints: list[WaypointOut] = []
    what_if_projection: WhatIfProjectionOut | None = None
