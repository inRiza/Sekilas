from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models
from app.core.db import get_session
from app.main import app
from app.models.base import Base


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session_local = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_session() -> Iterator[Session]:
        with testing_session_local() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_auth_me_endpoint(client: TestClient) -> None:
    res = client.get("/api/v1/auth/me", headers={"X-User-Id": "usr_test_auth"})
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "usr_test_auth"
    assert data["daily_run_quota"] == 10


def test_business_and_analysis_crud_flow(client: TestClient) -> None:
    # 1. Create a business
    res = client.post(
        "/api/v1/businesses",
        json={
            "name": "Kedai Kopi Senja",
            "branch_name": "Dipatiukur",
            "category": "kedai",
            "address": "Jl. Dipatiukur No. 10, Bandung",
        },
    )
    assert res.status_code == 201
    biz = res.json()
    biz_id = biz["id"]
    assert biz["name"] == "Kedai Kopi Senja"
    assert biz["branch_name"] == "Dipatiukur"
    assert biz["analyses_count"] == 0

    # 2. List businesses
    list_res = client.get("/api/v1/businesses")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 3. Update business
    patch_res = client.patch(
        f"/api/v1/businesses/{biz_id}",
        json={"branch_name": "Dipatiukur Pusat", "address": "Jl. Dipatiukur No. 12, Bandung"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["branch_name"] == "Dipatiukur Pusat"

    # 4. Create analysis under business
    anl_res = client.post(
        f"/api/v1/businesses/{biz_id}/analyses",
        json={"name": "Analisis Fasad Pagi", "status": "ready"},
    )
    assert anl_res.status_code == 201
    anl = anl_res.json()
    anl_id = anl["id"]
    assert anl["business_id"] == biz_id
    assert anl["name"] == "Analisis Fasad Pagi"

    # Check primary_analysis_id was auto-populated on first analysis
    get_biz = client.get(f"/api/v1/businesses/{biz_id}").json()
    assert get_biz["primary_analysis_id"] == anl_id
    assert get_biz["analyses_count"] == 1

    # 5. Save context & menu items (PUT /api/v1/analyses/{id}/context)
    ctx_payload = {
        "business_type": "kedai",
        "business_name": "Kedai Kopi Senja",
        "location_name": "Jl. Dipatiukur No. 12, Bandung",
        "location_description": "Lantai 1 ruko pojok dekat kampus",
        "surroundings_type": "dekat_kampus",
        "surroundings": ["dekat_kampus", "jalan_utama"],
        "passersby": ["mahasiswa", "pekerja_kantor"],
        "business_goal": "lebih_banyak_pembeli_baru",
        "fixed_constraints": ["lokasi"],
        "menu_items": [
            {"name": "Es Kopi Susu", "price": 18000},
            {"name": "Latte Panas", "price": 22000},
            {"name": "Croissant Cokelat", "price": 20000},
        ],
        "opening_hours": {"open": "08:00", "close": "22:00"},
        "rush_hours": [{"start": "12:00", "end": "14:00"}],
        "daily_sales_rp": 1500000,
        "daily_visitors": 80,
        "parking": ["motor"],
    }
    put_ctx = client.put(f"/api/v1/analyses/{anl_id}/context", json=ctx_payload)
    assert put_ctx.status_code == 200
    saved_ctx = put_ctx.json()
    assert saved_ctx["calculated_price_level"] == "hemat"
    assert len(saved_ctx["menu_items"]) == 3
    assert saved_ctx["daily_sales_rp"] == 1500000
    assert saved_ctx["parking"] == ["motor"]

    # Since analysis was "ready", updating context marks it stale
    get_anl = client.get(f"/api/v1/analyses/{anl_id}").json()
    assert get_anl["stale"] is True

    # 6. Update analysis (rename & clear stale)
    upd_anl = client.patch(
        f"/api/v1/analyses/{anl_id}",
        json={"name": "Analisis Fasad Pagi v2", "stale": False},
    )
    assert upd_anl.status_code == 200
    assert upd_anl.json()["name"] == "Analisis Fasad Pagi v2"
    assert upd_anl.json()["stale"] is False

    # 7. Delete analysis & verify primary_analysis_id is cleared
    del_anl = client.delete(f"/api/v1/analyses/{anl_id}")
    assert del_anl.status_code == 204
    assert client.get(f"/api/v1/businesses/{biz_id}").json()["primary_analysis_id"] is None

    # 8. Delete business
    del_biz = client.delete(f"/api/v1/businesses/{biz_id}")
    assert del_biz.status_code == 204
    assert client.get(f"/api/v1/businesses/{biz_id}").status_code == 404


def test_video_transcript_dashboard_and_measurement_endpoints(client: TestClient) -> None:
    biz = client.post(
        "/api/v1/businesses",
        json={
            "name": "Selasar Kopi",
            "branch_name": "Dipatiukur",
            "category": "kedai",
            "address": "Jl. Dipatiukur No. 42, Bandung",
        },
    ).json()
    anl = client.post(
        f"/api/v1/businesses/{biz['id']}/analyses",
        json={"name": "Analisis Fasad & Tangga", "status": "ready"},
    ).json()
    anl_id = anl["id"]

    # 1. Video metadata PUT & GET
    put_vid = client.put(
        f"/api/v1/analyses/{anl_id}/video",
        json={
            "original_filename": "rekaman_fasad.mp4",
            "duration_s": 48.0,
            "cashier_at_s": 46.5,
            "blurred_faces_count": 12,
            "blurred_plates_count": 5,
        },
    )
    assert put_vid.status_code == 200
    assert put_vid.json()["original_filename"] == "rekaman_fasad.mp4"
    assert put_vid.json()["cashier_at_s"] == 46.5

    get_vid = client.get(f"/api/v1/analyses/{anl_id}/video")
    assert get_vid.status_code == 200
    assert get_vid.json()["blurred_faces_count"] == 12

    # 2. Transcript segment create, list, patch, delete
    create_seg = client.post(
        f"/api/v1/analyses/{anl_id}/transcript/segments",
        json={
            "timestamp_start": 8.0,
            "timestamp_end": 18.0,
            "vantage": "jalan",
            "narrative": "Lorong tangga tampak agak gelap dari trotoar.",
            "not_visible": "Belum ada standing banner harga.",
            "confidence": "tidak_pasti",
            "is_confirmed_by_owner": False,
        },
    )
    assert create_seg.status_code == 201
    seg = create_seg.json()
    seg_id = seg["id"]
    assert seg["vantage"] == "jalan"

    # Patch segment (confirm & edit narrative -> marks analysis stale)
    patch_seg = client.patch(
        f"/api/v1/analyses/{anl_id}/transcript/segments/{seg_id}",
        json={
            "narrative": "Lorong tangga cukup gelap dan terhalang motor parkir.",
            "is_confirmed_by_owner": True,
        },
    )
    assert patch_seg.status_code == 200
    assert patch_seg.json()["is_confirmed_by_owner"] is True
    assert patch_seg.json()["edited_by_owner"] is True

    # List segments
    list_seg = client.get(f"/api/v1/analyses/{anl_id}/transcript")
    assert list_seg.status_code == 200
    assert len(list_seg.json()) == 1

    # Check dashboard reflects stale=True after transcript change
    dash_res = client.get(f"/api/v1/analyses/{anl_id}/dashboard")
    assert dash_res.status_code == 200
    assert dash_res.json()["is_stale"] is True
    assert len(dash_res.json()["funnel_stages"]) == 4

    # Delete segment
    del_seg = client.delete(f"/api/v1/analyses/{anl_id}/transcript/segments/{seg_id}")
    assert del_seg.status_code == 204
    assert len(client.get(f"/api/v1/analyses/{anl_id}/transcript").json()) == 0

    # 3. Start simulation clears stale flag
    sim_res = client.post(f"/api/v1/analyses/{anl_id}/simulation", json={"n_agents": 200, "seed": 42})
    assert sim_res.status_code == 202
    assert client.get(f"/api/v1/analyses/{anl_id}/dashboard").json()["is_stale"] is False

    # 4. Measurement plan GET
    mp_res = client.get(f"/api/v1/analyses/{anl_id}/measurement-plan")
    assert mp_res.status_code == 200
    assert mp_res.json()["suggested_duration_minutes"] == 30
    assert len(mp_res.json()["metrics"]) == 4
