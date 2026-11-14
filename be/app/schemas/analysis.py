from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.context import BusinessContext


class AnalysisStep(StrEnum):
    context = "context"
    video = "video"
    processing = "processing"
    verification = "verification"
    simulation = "simulation"
    dashboard = "dashboard"


class AnalysisCreate(BaseModel):
    business_id: str | None = None
    name: str | None = None
    status: str = "draft"
    total_agents: int = Field(default=20, ge=1, le=500)
    is_demo: bool = True
    quality_label: str | None = "Kualitas baik"
    thumbnail_url: str | None = None
    context: BusinessContext | None = None


class AnalysisUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    status: str | None = None
    stale: bool | None = None
    quality_label: str | None = None
    total_agents: int | None = Field(default=None, ge=1, le=500)
    thumbnail_url: str | None = None
    set_as_primary: bool | None = None


class Analysis(BaseModel):
    id: str
    business_id: str
    business_name: str
    branch_name: str | None = None
    name: str
    business_type: str
    created_at: datetime
    updated_at: datetime | None = None
    status: str = "draft"
    stale: bool = False
    quality_label: str | None = None
    total_agents: int = 20
    thumbnail_url: str | None = None
    context: BusinessContext | None = None
