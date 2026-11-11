"""Konversi Gaussian splat .ply (Brush / nerfstudio / 3DGS) ke format .splat (antimatter15).

Format .splat dibaca viewer /dasbor (drei <Splat>). Per splat 32 byte:
  posisi 3xfloat32, skala 3xfloat32, warna RGBA 4xuint8, rotasi 4xuint8.

Pakai: uv run python scripts/ply_to_splat.py input.ply output.splat
"""

import sys
from pathlib import Path

import numpy as np

SH_C0 = 0.28209479177387814
PLY_TYPES = {
    "float": "f4",
    "float32": "f4",
    "double": "f8",
    "float64": "f8",
    "uchar": "u1",
    "uint8": "u1",
    "char": "i1",
    "int8": "i1",
    "short": "i2",
    "int16": "i2",
    "ushort": "u2",
    "uint16": "u2",
    "int": "i4",
    "int32": "i4",
    "uint": "u4",
    "uint32": "u4",
}


def read_vertices(path: Path) -> np.ndarray:
    data = path.read_bytes()
    end = data.index(b"end_header\n") + len(b"end_header\n")
    header = data[:end].decode("ascii").splitlines()
    if "format binary_little_endian 1.0" not in header:
        raise ValueError("hanya mendukung PLY binary_little_endian")

    count, fields, in_vertex = 0, [], False
    for line in header:
        parts = line.split()
        if parts[:2] == ["element", "vertex"]:
            count, in_vertex = int(parts[2]), True
        elif parts and parts[0] == "element":
            in_vertex = False
        elif in_vertex and parts[:1] == ["property"]:
            if parts[1] == "list":
                raise ValueError("properti list pada vertex tidak didukung")
            fields.append((parts[2], "<" + PLY_TYPES[parts[1]]))

    return np.frombuffer(data, dtype=np.dtype(fields), count=count, offset=end)


def convert(src: Path, dst: Path) -> int:
    v = read_vertices(src)
    names = v.dtype.names or ()
    required = {
        "x",
        "y",
        "z",
        "f_dc_0",
        "f_dc_1",
        "f_dc_2",
        "opacity",
        "scale_0",
        "scale_1",
        "scale_2",
        "rot_0",
        "rot_1",
        "rot_2",
        "rot_3",
    }
    missing = required - set(names)
    if missing:
        raise ValueError(f"bukan PLY Gaussian splat, kolom hilang: {sorted(missing)}")

    pos = np.stack([v["x"], v["y"], v["z"]], axis=1).astype(np.float32)
    scale = np.exp(np.stack([v["scale_0"], v["scale_1"], v["scale_2"]], axis=1)).astype(
        np.float32
    )
    alpha = 1.0 / (1.0 + np.exp(-v["opacity"].astype(np.float64)))
    rgb = 0.5 + SH_C0 * np.stack([v["f_dc_0"], v["f_dc_1"], v["f_dc_2"]], axis=1)
    rgba = np.clip(np.concatenate([rgb, alpha[:, None]], axis=1) * 255, 0, 255).astype(
        np.uint8
    )

    rot = np.stack([v["rot_0"], v["rot_1"], v["rot_2"], v["rot_3"]], axis=1).astype(
        np.float64
    )
    rot /= np.linalg.norm(rot, axis=1, keepdims=True) + 1e-12
    rot_u8 = np.clip(rot * 128 + 128, 0, 255).astype(np.uint8)

    # Splat besar dan pekat lebih dulu (urutan yang diharapkan viewer).
    order = np.argsort(-(scale.prod(axis=1) * alpha))

    out = np.empty(
        len(v),
        dtype=[
            ("pos", "<f4", 3),
            ("scale", "<f4", 3),
            ("rgba", "u1", 4),
            ("rot", "u1", 4),
        ],
    )
    out["pos"], out["scale"], out["rgba"], out["rot"] = (
        pos[order],
        scale[order],
        rgba[order],
        rot_u8[order],
    )
    dst.write_bytes(out.tobytes())
    return len(v)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("pakai: ply_to_splat.py input.ply output.splat")
    n = convert(Path(sys.argv[1]), Path(sys.argv[2]))
    print(f"{n} splat -> {sys.argv[2]}")
