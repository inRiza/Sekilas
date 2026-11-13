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
        rot = quat_to_rot(qw, qx, qy, qz)
        center = -rot.T @ np.array([tx, ty, tz])
        # Sumbu y kamera COLMAP mengarah ke bawah gambar; "atas" kamera di dunia = R^T (0,-1,0)
        up = rot.T @ np.array([0.0, -1.0, 0.0])
        # Sumbu z kamera COLMAP = arah pandang
        forward = rot.T @ np.array([0.0, 0.0, 1.0])
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
                "up": [float(v) for v in up],
                "forward": [float(v) for v in forward],
            }
        )
    return sorted(path, key=lambda p: p["timestamp_s"])


def world_up(path: list[dict]) -> list[float]:
    """Arah atas dunia = rata-rata arah atas kamera (HP dipegang tegak saat merekam)."""
    mean = np.mean([c["up"] for c in path], axis=0)
    norm = np.linalg.norm(mean)
    return [
        round(float(v), 5) for v in (mean / norm if norm > 1e-6 else [0.0, 1.0, 0.0])
    ]


if __name__ == "__main__":
    if len(sys.argv) not in (4, 5):
        sys.exit(
            "pakai: colmap_to_twin.py <sparse_txt_dir> <fps> <out.json> [up_out.json]"
        )
    cams = read_camera_path(Path(sys.argv[1]) / "images.txt", float(sys.argv[2]))
    Path(sys.argv[3]).write_text(json.dumps(cams, indent=1))
    print(f"{len(cams)} pose kamera -> {sys.argv[3]}")
    if len(sys.argv) == 5:
        Path(sys.argv[4]).write_text(json.dumps(world_up(cams)))
