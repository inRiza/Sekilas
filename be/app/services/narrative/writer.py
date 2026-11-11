"""F5: LLM menulis narasi + alasan BERDASARKAN keputusan dan kontribusi yang sudah dihitung (batch)."""

from app.schemas.simulation import AgentResult


def write_narratives(agents: list[AgentResult]) -> list[AgentResult]:
    raise NotImplementedError("M7")
