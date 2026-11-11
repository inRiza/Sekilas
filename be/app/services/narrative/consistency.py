"""F5: alasan di narasi wajib konsisten dengan kontribusi faktor. Tidak konsisten -> buat ulang/buang."""

from app.schemas.simulation import AgentResult


def is_consistent(agent: AgentResult) -> bool:
    raise NotImplementedError("M7")
