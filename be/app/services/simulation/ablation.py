"""F6.C: ablasi isyarat. Simulasi ulang dengan satu isyarat diperbaiki -> dampak (rentang)."""

from app.schemas.common import Range
from app.schemas.simulation import SimulationRequest
from app.schemas.transcript import TranscriptEntry


def ablate(entries: list[TranscriptEntry], request: SimulationRequest) -> dict[str, Range]:
    """Kembalikan {entry_id: kenaikan peluang pada tahap gesekan}. Pakai SALib untuk sensitivitas."""
    raise NotImplementedError("M9")
