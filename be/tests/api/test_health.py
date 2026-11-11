from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    assert TestClient(app).get("/health").json() == {"status": "ok"}


def test_openapi_lists_all_routers() -> None:
    paths = TestClient(app).get("/openapi.json").json()["paths"]
    for fragment in ("context", "video", "transcript", "twin", "simulation", "dashboard", "ask"):
        assert any(fragment in p for p in paths), fragment
