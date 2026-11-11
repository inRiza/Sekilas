"""Baca model COLMAP (format TXT) dan tulis jalur kamera untuk dasbor.

Keluaran camera_path.json mengikuti schema TwinAssets.camera_path di be/:
  [{"frame": "0001.jpg", "timestamp_s": 0.0, "position": {"x":..,"y":..,"z":..}}, ...]
Timestamp diperkirakan dari nomor frame / fps ekstraksi.

Pakai: uv run python scripts/colmap_to_twin.py <sparse_txt_dir> <fps> <out.json>
"""

import json
import re
import sys
from pathlib import Path

import numpy as np


def quat_to_rot(qw: float, qx: float, qy: float, qz: float) -> np.ndarray:
    return np.array(
        [
            [
                1 - 2 * (qy * qy + qz * qz),
                2 * (qx * qy - qz * qw),
                2 * (qx * qz + qy * qw),
            ],
            [
                2 * (qx * qy + qz * qw),
                1 - 2 * (qx * qx + qz * qz),
                2 * (qy * qz - qx * qw),
            ],
            [
                2 * (qx * qz - qy * qw),
                2 * (qy * qz + qx * qw),
                1 - 2 * (qx * qx + qy * qy),
            ],
        ]
    )


def read_camera_path(images_txt: Path, fps: float) -> list[dict]:
    # images.txt: per gambar dua baris (pose, lalu titik 2D). Baris titik 2D bisa
    # kosong, jadi hanya komentar yang dibuang agar pasangan baris tidak bergeser.
    lines = [ln for ln in images_txt.read_text().splitlines() if not ln.startswith("#")]
    path = []
    for pose_line in lines[0::2]:
        if not pose_line.strip():
            continue
        parts = pose_line.split()
        qw, qx, qy, qz, tx, ty, tz = map(float, parts[1:8])
        name = parts[9]
        center = -quat_to_rot(qw, qx, qy, qz).T @ np.array([tx, ty, tz])
        match = re.search(r"(\d+)", Path(name).stem)
        index = int(match.group(1)) - 1 if match else len(path)
        path.append(
            {
                "frame": name,
                "timestamp_s": round(index / fps, 3),
                "position": {
                    "x": float(center[0]),
                    "y": float(center[1]),
                    "z": float(center[2]),
                },
            }
        )
    return sorted(path, key=lambda p: p["timestamp_s"])


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("pakai: colmap_to_twin.py <sparse_txt_dir> <fps> <out.json>")
    cams = read_camera_path(Path(sys.argv[1]) / "images.txt", float(sys.argv[2]))
    Path(sys.argv[3]).write_text(json.dumps(cams, indent=1))
    print(f"{len(cams)} pose kamera -> {sys.argv[3]}")
