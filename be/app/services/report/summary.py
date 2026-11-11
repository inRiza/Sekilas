"""F6: tiga poin utama, funnel, peta panas, peluang/ancaman."""

from app.schemas.dashboard import Dashboard
from app.schemas.simulation import AgentResult, Scenario
from app.schemas.transcript import TranscriptEntry


def build_dashboard(
    agents: list[AgentResult], entries: list[TranscriptEntry], scenario: Scenario
) -> Dashboard:
    """Funnel dan peta panas dihitung dari titik berhenti agen yang sama, agar selalu konsisten."""
    raise NotImplementedError("M9")
