from enum import StrEnum

from pydantic import BaseModel, Field


class Range(BaseModel):
    """Semua angka di dasbor berupa rentang, bukan satu angka (PRD F6)."""

    low: float
    high: float


class Vec3(BaseModel):
    x: float
    y: float
    z: float


class JobStatus(StrEnum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class JobState(BaseModel):
    status: JobStatus
    stage: str | None = None
    progress: float = Field(0.0, ge=0.0, le=1.0)
    message: str | None = None
