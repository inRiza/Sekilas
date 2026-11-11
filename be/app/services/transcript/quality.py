"""F2: cek kualitas sisi server (cadangan dari cek di browser)."""

from pathlib import Path

from app.schemas.video import VideoQuality

MIN_DURATION_S = 20.0
MAX_DURATION_S = 180.0


def check_quality(video_path: Path) -> VideoQuality:
    raise NotImplementedError("M2")
