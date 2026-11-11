from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel


class AnalysisStep(StrEnum):
    context = "context"
    video = "video"
    processing = "processing"
    verification = "verification"
    simulation = "simulation"
    dashboard = "dashboard"


class Analysis(BaseModel):
    id: UUID
    step: AnalysisStep
    dashboard_stale: bool = False
    created_at: datetime
