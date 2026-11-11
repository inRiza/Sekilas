from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str


class Source(BaseModel):
    doc_id: str
    title: str


class AskResponse(BaseModel):
    """PRD F8: wajib bersumber, atau 'Belum ada panduan untuk ini'."""

    answer: str
    sources: list[Source]
    entry_ids: list[str] = []
