"""Alur job PRD 4.4.2: video/complete -> job transkrip + job Visual Twin, lalu zona F7."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models
from app.core.db import get_session
from app.main import app
from app.models import TwinAsset
from app.models.base import Base


@pytest.fixture
def ctx() -> Iterator[tuple[TestClient, sessionmaker[Session]]]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_session() -> Iterator[Session]:
        with sessions() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        yield client, sessions
    app.dependency_overrides.clear()


def _analysis_with_video(client: TestClient) -> str:
    biz = client.post(
        "/api/v1/businesses",
        json={
            "name": "Kedai Uji",
            "branch_name": "Pusat",
            "category": "kedai",
            "address": "Bandung",
        },
    ).json()
    anl = client.post(f"/api/v1/businesses/{biz['id']}/analyses", json={}).json()
    res = client.put(
        f"/api/v1/analyses/{anl['id']}/video",
        json={"original_filename": "fasad.mp4", "duration_s": 40.0, "width": 1280, "height": 720},
    )
    assert res.status_code == 200
    return anl["id"]


def test_complete_queues_transcript_and_twin_jobs(
    ctx: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = ctx
    aid = _analysis_with_video(client)

    res = client.post(
        f"/api/v1/analyses/{aid}/video/complete",
        json={"cashier_at_s": 38.0},
        headers={"Idempotency-Key": "uji-1"},
    )
    assert res.status_code == 202
    body = res.json()

    # Tes menjalankan job transkrip inline (JOBS_IN_BACKGROUND=false, LLM mock).
    proc = client.get(f"/api/v1/analyses/{aid}/video/processing").json()
    assert proc["status"] == "done"
    assert len(client.get(f"/api/v1/analyses/{aid}/transcript").json()) > 0

    # Runner twin dimatikan di tes: job tercatat 'antre', aset belum ada.
    twin = client.get(f"/api/v1/analyses/{aid}/twin").json()
    assert twin["job"]["id"] == body["twin_job_id"]
    assert twin["job"]["status"] == "antre"
    assert twin["assets"] is None

    # Idempotency-Key yang sama tidak membuat job twin baru.
    again = client.post(
        f"/api/v1/analyses/{aid}/video/complete",
        json={"cashier_at_s": 38.0},
        headers={"Idempotency-Key": "uji-1"},
    )
    assert again.json()["twin_job_id"] == body["twin_job_id"]


def test_zone_rename(ctx: tuple[TestClient, sessionmaker[Session]]) -> None:
    client, sessions = ctx
    aid = _analysis_with_video(client)
    client.post(f"/api/v1/analyses/{aid}/video/complete", json={"cashier_at_s": 38.0})

    assert (
        client.post(
            f"/api/v1/analyses/{aid}/twin/zones/pintu/rename", json={"name": "X"}
        ).status_code
        == 404
    )

    with sessions() as s:
        s.add(
            TwinAsset(id="tw_uji", analysis_id=aid, mode="splat", splat_url="https://cdn/x.splat")
        )
        s.commit()

    zones = client.get(f"/api/v1/analyses/{aid}/twin").json()["assets"]["zones"]
    assert [z["id"] for z in zones] == [
        z for z in ("jalan", "pintu", "dalam") if z in {x["id"] for x in zones}
    ]
    assert zones, "zona diturunkan dari segmen transkrip"
    target = zones[0]["id"]

    res = client.post(
        f"/api/v1/analyses/{aid}/twin/zones/{target}/rename", json={"name": "Trotoar seberang"}
    )
    assert res.status_code == 200
    renamed = {z["id"]: z["name"] for z in res.json()["assets"]["zones"]}
    assert renamed[target] == "Trotoar seberang"

    assert (
        client.post(
            f"/api/v1/analyses/{aid}/twin/zones/atap/rename", json={"name": "X"}
        ).status_code
        == 404
    )
