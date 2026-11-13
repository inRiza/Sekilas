"""Diagnosis kenapa sebagian video tidak terpetakan, dalam bahasa pemilik.

Membaca database COLMAP (jumlah fitur, kecocokan antar-frame), model terpilih
(frame yang teregistrasi), dan frame itu sendiri (kecerahan, ketajaman). Untuk tiap
rentang frame yang tidak terpetakan, tebak penyebab paling mungkin.

Pakai: uv run python scripts/diagnose_twin.py <work_dir> <fps> <out.json>
"""

import json
import sqlite3
import struct
import sys
from pathlib import Path

import cv2
import numpy as np

CAUSE_TEXT = {
    "gelap": "terlalu gelap",
    "blur": "gambar buram karena gerakan terlalu cepat",
    "dekat": "kamera terlalu dekat ke objek, orang, atau permukaan polos/berulang",
    "cepat": "sudut kamera berubah terlalu cepat sehingga frame berurutan tidak nyambung",
}
CAUSE_TIP = {
    "gelap": "nyalakan lampu atau rekam saat lebih terang",
    "blur": "jalan lebih pelan dan tahan kamera tetap stabil",
    "dekat": "arahkan kamera agak jauh ke depan (2-3 meter), jangan ke permukaan, orang, atau benda tepat di depan kamera",
    "cepat": "belok dan naik lebih pelan, sambil terus melangkah",
}


def frame_stats(path: Path) -> tuple[float, float]:
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0, 0.0
    scale = 480 / max(img.shape)
    small = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return float(small.mean()), float(cv2.Laplacian(small, cv2.CV_64F).var())


def registered_names(txt_dir: Path) -> set[str]:
    lines = [
        ln
        for ln in (txt_dir / "images.txt").read_text().splitlines()
        if not ln.startswith("#")
    ]
    return {ln.split()[9] for ln in lines[0::2] if ln.strip()}


def model_names(images_bin: Path) -> list[str]:
    """Nama frame di images.bin COLMAP (format biner, tanpa perlu konversi TXT)."""
    names = []
    with images_bin.open("rb") as f:
        (count,) = struct.unpack("<Q", f.read(8))
        for _ in range(count):
            f.read(4 + 4 * 8 + 3 * 8 + 4)  # image_id, qvec, tvec, camera_id
            name = bytearray()
            while (c := f.read(1)) != b"\x00":
                name += c
            (npts,) = struct.unpack("<Q", f.read(8))
            f.seek(npts * 24, 1)  # x, y (double) + point3D_id (int64)
            names.append(name.decode())
    return names


def classify(part: list[dict], med_feat: float, med_sharp: float) -> list[str]:
    """Penyebab bisa lebih dari satu (misal di tangga: buram DAN terlalu dekat)."""
    bright = float(np.median([f["brightness"] for f in part]))
    sharp = float(np.median([f["sharpness"] for f in part]))
    feat = float(np.median([f["features"] for f in part]))
    causes = []
    if bright < 45:
        causes.append("gelap")
    if sharp < 0.35 * med_sharp:
        causes.append("blur")
    if feat < 0.35 * med_feat:
        causes.append("dekat")
    return causes or ["cepat"]


def diagnose(work: Path, fps: float) -> dict:
    db = sqlite3.connect(work / "colmap" / "database.db")
    id_by_name = {
        name: i for i, name in db.execute("select image_id, name from images")
    }
    keypoints = dict(db.execute("select image_id, rows from keypoints"))

    # Potongan model: COLMAP bisa memecah video; frame di potongan lain tetap terpetakan,
    # hanya tidak tersambung ke potongan yang ditampilkan.
    model_of: dict[str, str] = {}
    for d in sorted((work / "colmap" / "sparse").iterdir()):
        if (d / "images.bin").exists():
            for name in model_names(d / "images.bin"):
                model_of[name] = d.name
    shown = registered_names(work / "colmap" / "txt")
    shown_model = next((model_of[n] for n in shown if n in model_of), None)

    names = sorted(id_by_name)
    frames = []
    for name in names:
        brightness, sharpness = frame_stats(work / "images" / name)
        frames.append(
            {
                "name": name,
                "model": model_of.get(name),
                "features": keypoints.get(id_by_name[name], 0),
                "brightness": brightness,
                "sharpness": sharpness,
            }
        )

    ok = [f for f in frames if f["model"] is not None] or frames
    med_feat = float(np.median([f["features"] for f in ok]))
    med_sharp = float(np.median([f["sharpness"] for f in ok]))

    # Rentang berurutan dengan label sama: potongan model tertentu atau tidak terpetakan.
    runs: list[tuple[str | None, int, int]] = []
    for k, f in enumerate(frames):
        if runs and runs[-1][0] == f["model"]:
            runs[-1] = (runs[-1][0], runs[-1][1], k)
        else:
            runs.append((f["model"], k, k))

    issues = []
    for label, a, b in runs:
        if label == shown_model:
            continue
        if label is None:
            part = frames[a : b + 1]
            kind = "hilang"
        else:
            # Bagian terpetakan tapi terpisah: lihat frame di sekitar sambungan yang putus.
            part = frames[max(0, a - 2) : a + 3]
            kind = "terpisah"
        issues.append(
            {
                "kind": kind,
                "start_s": round(a / fps, 1),
                "end_s": round((b + 1) / fps, 1),
                "frames": b - a + 1,
                "causes": classify(part, med_feat, med_sharp),
            }
        )
    issues.sort(key=lambda g: g["frames"], reverse=True)
    main = [g for g in issues if g["frames"] >= max(3, 0.05 * len(frames))][:3]

    parts = len(set(model_of.values()))
    shown_idx = [k for k, f in enumerate(frames) if f["name"] in shown]
    if not main:
        summary = "Hampir semua bagian video terpetakan dan tersambung."
    else:
        g = main[0]
        where = f"detik {g['start_s']:.0f}–{g['end_s']:.0f}"
        head = (
            f"Bagian {where} tidak terpetakan"
            if g["kind"] == "hilang"
            else f"Bagian {where} terpetakan terpisah (video terpecah jadi {parts} bagian)"
        )
        summary = (
            f"{head}: "
            + " dan ".join(CAUSE_TEXT[c] for c in g["causes"])
            + ". Saran: "
            + "; ".join(CAUSE_TIP[c] for c in g["causes"])
            + "."
        )
    return {
        "summary": summary,
        "issues": main,
        "parts": parts,
        "shown": {
            "start_s": round(shown_idx[0] / fps, 1) if shown_idx else None,
            "end_s": round((shown_idx[-1] + 1) / fps, 1) if shown_idx else None,
            "frames": len(shown),
        },
        "frames": len(frames),
    }


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("pakai: diagnose_twin.py <work_dir> <fps> <out.json>")
    result = diagnose(Path(sys.argv[1]), float(sys.argv[2]))
    Path(sys.argv[3]).write_text(json.dumps(result, ensure_ascii=False, indent=1))
    print(result["summary"])
