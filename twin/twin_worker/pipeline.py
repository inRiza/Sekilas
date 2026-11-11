"""Urutan tahap Visual Twin (PRD F7). Gagal di tahap mana pun -> turun ke tampilan cadangan."""

import logging
from pathlib import Path

from twin_worker.contracts import TwinJob, TwinResult
from twin_worker.stages import (
    align,
    anchor_events,
    export,
    extract_frames,
    mask,
    poses_colmap,
    poses_vggt,
    reconstruct,
)

log = logging.getLogger(__name__)

POSE_BACKENDS = {"vggt": poses_vggt, "colmap": poses_colmap}


def build(
    job: TwinJob, workdir: Path, pose_order: tuple[str, ...] = ("vggt", "colmap")
) -> TwinResult:
    extract_frames.run(workdir)
    mask.run(workdir)

    for name in pose_order:
        try:
            POSE_BACKENDS[name].run(workdir)
            break
        except Exception:
            log.exception("pose backend %s gagal untuk %s", name, job.analysis_id)
    else:
        return TwinResult(
            analysis_id=job.analysis_id, mode="frame_strip", error="pose_failed"
        )

    try:
        reconstruct.run(workdir)
        align.run(workdir)
    except Exception:  # noqa: BLE001 - jalur kamera masih ada untuk denah 2D
        return TwinResult(
            analysis_id=job.analysis_id, mode="path_2d", error="reconstruct_failed"
        )

    anchor_events.run(workdir)
    out = export.run(workdir)
    return TwinResult(analysis_id=job.analysis_id, mode=job.mode, model_path=str(out))
