"""Job transkrip: coba ulang saat model sibuk (503), menyerah setelah batas, galat lain langsung gagal."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.models.base import Base
from app.services.llm.router import LLMUnavailableError
from app.services.transcript import job as transcript_job


@pytest.fixture
def sessions(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(transcript_job, "RETRY_DELAYS_S", (0.0, 0.0))
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def _args() -> transcript_job.TranscriptJobArgs:
    return transcript_job.TranscriptJobArgs(
        job_id="job_x", analysis_id="anl_x", duration_s=40, cashier_at_s=38
    )


def test_retries_until_model_recovers(sessions) -> None:
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise LLMUnavailableError("503 UNAVAILABLE", status_code=503)
        return ["seg"], []

    assert transcript_job._extract_with_retry(sessions, _args(), flaky) == (["seg"], [])
    assert calls["n"] == 3


def test_gives_up_after_retry_budget(sessions) -> None:
    def always_busy():
        raise LLMUnavailableError("503 UNAVAILABLE", status_code=503)

    with pytest.raises(LLMUnavailableError):
        transcript_job._extract_with_retry(sessions, _args(), always_busy)


def test_non_transient_error_is_not_retried(sessions) -> None:
    calls = {"n": 0}

    def bad_key():
        calls["n"] += 1
        raise LLMUnavailableError("API key salah", status_code=401)

    with pytest.raises(LLMUnavailableError):
        transcript_job._extract_with_retry(sessions, _args(), bad_key)
    assert calls["n"] == 1
