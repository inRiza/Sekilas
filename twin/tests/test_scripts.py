import importlib.util
from pathlib import Path

import numpy as np

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"


def load(name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_ply_to_splat_writes_32_bytes_per_splat(tmp_path: Path) -> None:
    fields = ["x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2", "opacity"]
    fields += ["scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
    n = 5
    rows = np.zeros(n, dtype=[(f, "<f4") for f in fields])
    rows["rot_0"] = 1.0
    rows["opacity"] = np.linspace(-2, 2, n)
    header = (
        "ply\nformat binary_little_endian 1.0\n"
        f"element vertex {n}\n"
        + "".join(f"property float {f}\n" for f in fields)
        + "end_header\n"
    )
    src = tmp_path / "in.ply"
    src.write_bytes(header.encode() + rows.tobytes())

    dst = tmp_path / "out.splat"
    assert load("ply_to_splat").convert(src, dst) == n
    assert dst.stat().st_size == n * 32


def test_camera_path_handles_empty_points_line(tmp_path: Path) -> None:
    (tmp_path / "images.txt").write_text(
        "# header\n"
        "1 1 0 0 0 0 0 0 1 0002.jpg\n"
        "\n"  # gambar tanpa titik 2D
        "2 1 0 0 0 1 2 3 1 0001.jpg\n"
        "10.0 20.0 -1\n"
    )
    path = load("colmap_to_twin").read_camera_path(tmp_path / "images.txt", fps=2)
    assert [p["frame"] for p in path] == ["0001.jpg", "0002.jpg"]
    assert path[1]["timestamp_s"] == 0.5
    assert path[0]["position"] == {"x": -1.0, "y": -2.0, "z": -3.0}
