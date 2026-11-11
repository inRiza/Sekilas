"""F7: tempelkan posisi 3D ke entri transkrip dari pose kamera di stempel waktunya."""

from app.schemas.transcript import TranscriptEntry
from app.schemas.twin import CameraPose, Zone


def anchor_entries(
    entries: list[TranscriptEntry], camera_path: list[CameraPose], zones: list[Zone]
) -> list[TranscriptEntry]:
    raise NotImplementedError("M8b")
