from enum import StrEnum

from pydantic import BaseModel

from app.schemas.common import JobState, Vec3


class TwinMode(StrEnum):
    """PRD F7: 3D, lalu tampilan cadangan."""

    splat = "splat"
    pointcloud = "pointcloud"
    path_2d = "path_2d"
    frame_strip = "frame_strip"


class CameraPose(BaseModel):
    timestamp_s: float
    position: Vec3


class Zone(BaseModel):
    id: str
    name: str
    funnel_stage: str
    start_s: float
    end_s: float


class EventPin(BaseModel):
    entry_id: str
    position: Vec3
    zone_id: str | None = None


class TwinAssets(BaseModel):
    mode: TwinMode
    model_url: str | None = None
    camera_path: list[CameraPose] = []
    zones: list[Zone] = []
    pins: list[EventPin] = []


class TwinStatus(BaseModel):
    job: JobState
    assets: TwinAssets | None = None


class TwinBuildJob(BaseModel):
    """Job pembangunan Visual Twin mode lokal (PRD 11.2); `stage` 0..stage_count-1."""

    id: str
    status: str  # antre | berjalan | selesai | gagal
    stage: int
    stage_count: int
    stage_label: str
    progress: float
    message: str | None = None


class TwinBuildAssets(BaseModel):
    mode: TwinMode
    splat_url: str | None = None
    ply_url: str | None = None
    registered_frames: int
    total_frames: int
    points_count: int
    quality_label: str
    path_duration_seconds: float = 0.0
    diagnosis_summary: str | None = None


class TwinBuild(BaseModel):
    """GET /analyses/{id}/twin: job twin terbaru + aset bila sudah jadi."""

    job: TwinBuildJob | None = None
    assets: TwinBuildAssets | None = None
