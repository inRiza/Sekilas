"""F5: model pilihan diskret (multinomial logit). Keputusan DIHITUNG di sini, bukan oleh LLM."""

import numpy as np

from app.schemas.simulation import AgentResult, AgentTraits, Scenario
from app.schemas.transcript import TranscriptEntry


def decide(
    traits: AgentTraits,
    entries: list[TranscriptEntry],
    scenario: Scenario,
    rng: np.random.Generator,
) -> AgentResult:
    """Agen 'berjalan' mengikuti urutan entri; catat stop_entry_id dan kontribusi faktor."""
    raise NotImplementedError("M6")
