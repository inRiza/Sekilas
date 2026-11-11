"""Kontrak antar tahap. transforms.json (format nerfstudio) adalah batas tahap pose -> rekonstruksi.

Tahap pose bisa diganti (COLMAP <-> VGGT) selama keluarannya tetap transforms.json.
"""

from pathlib import Path

from pydantic import BaseModel


class Frame(BaseModel):
    file_path: str
    transform_matrix: list[list[float]]
    timestamp_s: float | None = None  # tambahan Sekilas untuk penjangkaran pin


class Transforms(BaseModel):
    camera_model: str = "OPENCV"
    fl_x: float
    fl_y: float
    cx: float
    cy: float
    w: int
    h: int
    frames: list[Frame]

    @classmethod
    def load(cls, path: Path) -> "Transforms":
        return cls.model_validate_json(path.read_text())


class TwinJob(BaseModel):
    analysis_id: str
    video_path: str
    entry_timestamps: dict[str, float] = {}
    mode: str = "pointcloud"  # atau "splat"


class TwinResult(BaseModel):
    analysis_id: str
    mode: str  # splat | pointcloud | path_2d | frame_strip
    model_path: str | None = None
    camera_path_json: str | None = None
    pins_json: str | None = None
    error: str | None = None
