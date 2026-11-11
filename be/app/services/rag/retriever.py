"""F8: ambil dokumen relevan."""

from app.schemas.assistant import Source


def retrieve(query: str, k: int = 5) -> list[tuple[Source, str]]:
    raise NotImplementedError("M11")
