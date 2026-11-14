from pydantic import BaseModel, Field


class MeasurementPlan(BaseModel):
    """PRD F6.F."""

    what_to_count: list[str]
    duration: str
    minimum_data: str
    steps: list[str]
    stand_here_image_url: str | None = None


class MeasurementMetricSchema(BaseModel):
    id: str
    stage_name: str
    physical_cue: str
    target_count: int


class MeasurementPlanDataOut(BaseModel):
    """PRD v1.4 F6-G: Rencana Pengukuran Cetak / Lembar Tally Manual."""

    analysis_id: str
    business_name: str
    observation_title: str
    observation_spot: str
    recommended_times: list[str] = Field(default_factory=list)
    suggested_duration_minutes: int = 30
    metrics: list[MeasurementMetricSchema] = Field(default_factory=list)
    practical_tips: list[str] = Field(default_factory=list)
