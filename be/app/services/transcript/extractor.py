"""F3: model bahasa-visi -> transkrip kejadian berbukti frame.

Aturan anti-halusinasi:
- entri tanpa frame bukti dibuang
- boleh menjawab "tidak terlihat jelas"
- keyakinan rendah -> Confidence.uncertain (masuk antrean konfirmasi)
Definisi kategori isyarat diambil dari knowledge_base/cues (F8).
"""

from pathlib import Path

from app.schemas.transcript import TranscriptEntry


def extract_frames(video_path: Path, fps: float = 1.0) -> list[Path]:
    raise NotImplementedError("M3")


def extract_events(video_path: Path, frames: list[Path]) -> list[TranscriptEntry]:
    raise NotImplementedError("M3")


def drop_unsupported(entries: list[TranscriptEntry]) -> list[TranscriptEntry]:
    return [e for e in entries if e.frame_url]
