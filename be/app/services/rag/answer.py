"""F8: jawaban bersumber. Tidak boleh menambah rekomendasi Prioritas atau mengubah angka."""

from app.schemas.assistant import AskResponse

NO_GUIDANCE = "Belum ada panduan untuk ini."


def answer(question: str, analysis_id: str) -> AskResponse:
    raise NotImplementedError("M11")
