"""Skema respons PRD 1.4 (4.4): bisnis, analisis, job, Visual Twin."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

AnalysisStatus = Literal["draft", "konteks", "video", "memproses", "verifikasi", "simulasi", "siap"]
BusinessCategory = Literal["warung", "kedai", "kafe", "resto_ruko"]


class NextAction(BaseModel):
    route: str
    label: str


class AnalysisSummary(BaseModel):
    id: str
    business_id: str
    name: str
    status: AnalysisStatus
    stale: bool
    stale_reason: str | None = None
    is_demo: bool
    quality_label: str | None = None
    created_at: datetime
    next_action: NextAction


class BusinessCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    branch_name: str = Field(default="", max_length=120)
    category: BusinessCategory
    address: str = Field(default="", max_length=300)


class BusinessUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    branch_name: str | None = None
    category: BusinessCategory | None = None
    address: str | None = None
    primary_analysis_id: str | None = None


class BusinessOut(BaseModel):
    id: str
    name: str
    branch_name: str
    category: str
    address: str
    analysis_count: int
    primary_analysis: AnalysisSummary | None = None
    next_action: NextAction
    created_at: datetime


class AnalysisCreate(BaseModel):
    name: str | None = None


class AnalysisOut(AnalysisSummary):
    context: dict[str, Any]
    transcript_version: int
    persona_version: int
    video_filename: str | None = None
    video_duration_s: float | None = None
    cashier_at_s: float | None = None


class JobOut(BaseModel):
    id: str
    kind: str
    status: Literal["antre", "berjalan", "selesai", "gagal"]
    stage: int
    stage_count: int
    stage_label: str
    progress: float
    message: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None


class VideoUploadOut(BaseModel):
    filename: str
    duration_s: float | None
    width: int | None
    height: int | None


class VideoComplete(BaseModel):
    cashier_at_s: float = Field(ge=0)


class TwinAssetOut(BaseModel):
    splat_url: str | None
    ply_url: str | None
    path_url: str | None
    frames: int
    registered: int
    points: int
    build_seconds: int
    quality_label: str
    diagnosis_summary: str | None = None


class TwinOut(BaseModel):
    job: JobOut | None
    assets: TwinAssetOut | None


class ApiError(BaseModel):
    code: str
    message: str
