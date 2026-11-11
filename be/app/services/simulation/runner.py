"""F5: jalankan N agen x skenario. Hasil sama untuk seed yang sama."""

from app.schemas.simulation import AgentResult, SimulationRequest
from app.schemas.transcript import TranscriptEntry


def run(entries: list[TranscriptEntry], request: SimulationRequest) -> list[AgentResult]:
    raise NotImplementedError("M6")
