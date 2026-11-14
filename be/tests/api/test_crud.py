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

    # 1b. Video upload-url & complete (PRD 4.4.2)
    url_res = client.post(
        f"/api/v1/analyses/{anl_id}/video/upload-url",
        json={"filename": "rekaman_fasad.mp4", "content_type": "video/mp4"},
    )
    assert url_res.status_code == 200
    assert url_res.json()["bucket"] == "videos"
    assert anl_id in url_res.json()["storage_key"]

    comp_res = client.post(
        f"/api/v1/analyses/{anl_id}/video/complete",
        json={"cashier_at_s": 44.0, "duration_s": 48.0, "width": 1920, "height": 1080},
    )
    assert comp_res.status_code == 202
    assert comp_res.json()["video"]["cashier_at_s"] == 44.0
    assert comp_res.json()["transcript_job_id"].startswith("job_tr_")

    # Clear auto-seeded segments before manual segment test
    for existing_seg in client.get(f"/api/v1/analyses/{anl_id}/transcript").json():
        client.delete(f"/api/v1/analyses/{anl_id}/transcript/segments/{existing_seg['id']}")

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


def test_dashboard_kpi_drop_off_shows_percentage_and_matches_highest_stage(client: TestClient) -> None:
    biz_res = client.post(
        "/api/v1/businesses",
        json={"name": "Nasi Goreng Uji", "branch_name": "Pusat", "category": "warung"},
    )
    assert biz_res.status_code == 201
    anl_res = client.post(
        f"/api/v1/businesses/{biz_res.json()['id']}/analyses",
        json={"name": "Uji KPI"},
    )
    assert anl_res.status_code == 201
    anl_id = anl_res.json()["id"]

    # Seed segmen minimal lalu jalankan simulasi mode mock (0 token)
    seg_res = client.post(
        f"/api/v1/analyses/{anl_id}/transcript/segments",
        json={
            "timestamp_start": 0.0,
            "timestamp_end": 10.0,
            "vantage": "jalan",
            "narrative": "Plang belum terlihat dari trotoar.",
            "not_visible": "Harga dan menu belum tampak.",
        },
    )
    assert seg_res.status_code == 201

    sim_res = client.post(f"/api/v1/analyses/{anl_id}/simulation", json={"n_agents": 20, "seed": 42})
    assert sim_res.status_code == 202

    dash = client.get(f"/api/v1/analyses/{anl_id}/dashboard").json()
    kpi = dash["kpi"]
    assert kpi["drop_off_rate_text"].endswith("%")
    assert "agen" not in kpi["drop_off_rate_text"]
    assert kpi["potential_loss_amount"] == "Belum dihitung"
    assert dash["what_if_projection"]["revenue_lift"] == "Belum dihitung"
    assert len(dash["recommendations"]) >= 1
    first_rec = dash["recommendations"][0]
    assert first_rec["cost_rp"] is not None
    assert len(first_rec["segment_ids"]) >= 1
    assert first_rec["affected_agents_count"] >= 1

    highest_stage = next(s for s in dash["funnel_stages"] if s.get("is_highest_friction"))
    expected_pct = f"{highest_stage['drop_off_rate']:.1f}".rstrip("0").rstrip(".").replace(".", ",") + "%"
    assert kpi["drop_off_rate_text"] == expected_pct
    if highest_stage["id"] == "melihat":
        assert (kpi["drop_off_from_stage"], kpi["drop_off_to_stage"]) == ("Melihat", "Berhenti")
    elif highest_stage["id"] == "berhenti":
        assert (kpi["drop_off_from_stage"], kpi["drop_off_to_stage"]) == ("Berhenti", "Masuk")
    else:
        assert (kpi["drop_off_from_stage"], kpi["drop_off_to_stage"]) == ("Masuk", "Memesan")


def test_dashboard_aligns_main_cause_detail_and_dynamic_key_insights(client: TestClient) -> None:
    from app.core.db import get_session
    from app.models.entities import AgentDecisionRecord, SimulationRun

    biz_res = client.post(
        "/api/v1/businesses",
        json={"name": "Warung Uji Selaras", "branch_name": "Utama", "category": "warung"},
    )
    assert biz_res.status_code == 201
    anl_res = client.post(
        f"/api/v1/businesses/{biz_res.json()['id']}/analyses",
        json={"name": "Tes Selaras"},
    )
    assert anl_res.status_code == 201
    anl_id = anl_res.json()["id"]

    seg_res = client.post(
        f"/api/v1/analyses/{anl_id}/transcript/segments",
        json={
            "timestamp_start": 0.0,
            "timestamp_end": 15.0,
            "vantage": "dalam",
            "narrative": "Pengunjung masuk ke area kasir.",
            "not_visible": "Metode bayar QRIS belum terlihat.",
        },
    )
    assert seg_res.status_code == 201
    seg_id = seg_res.json()["id"]

    override_gen = app.dependency_overrides[get_session]()
    session = next(override_gen)
    try:
        run = SimulationRun(
            id="run_align",
            analysis_id=anl_id,
            run_type="baseline",
            status="selesai",
            n_agents=4,
            succeeded_agents=4,
        )
        session.add(run)
        session.flush()

        # 4 agen masuk tanpa memesan (100% bocor di kasir!), mayoritas menunjuk H11 meski 2 agen menulis deciding_factor H1
        for i in range(1, 5):
            session.add(
                AgentDecisionRecord(
                    id=f"dec_align_{i}",
                    run_id=run.id,
                    analysis_id=anl_id,
                    agent_id=i,
                    batch_id=1,
                    monologue="Masuk ke dalam tapi batal di kasir.",
                    final_decision="masuk_tanpa_memesan",
                    stopped_at_segment_id=seg_id,
                    deciding_factor="Plang depan agak kecil" if i <= 2 else "Tidak ada info QRIS di kasir",
                    factor_segment_ids=[seg_id],
                    segment_traces=[{"segment_id": seg_id, "monologue": "Cek kasir.", "action": "berhenti"}],
                    attributions=[
                        {
                            "cue_code": "H11",
                            "direction": "menghambat",
                            "relevance_score": 3,
                            "evidence": "Tidak terlihat stiker QRIS saat mau membayar.",
                        }
                    ],
                    primary_hypothesis_id="H11",
                )
            )
        session.commit()
    finally:
        try:
            next(override_gen)
        except StopIteration:
            pass

    dash_res = client.get(f"/api/v1/analyses/{anl_id}/dashboard?require_existing=true")
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert dash["kpi"]["main_cause_title"].startswith("H11 ·")
    assert "QRIS" in dash["kpi"]["main_cause_detail"]
    assert "Plang depan agak kecil" not in dash["kpi"]["main_cause_detail"]
    # Insight 03 tidak boleh hardcoded type="positive" saat 0/4 agen memesan di kasir
    assert dash["key_insights"][2]["type"] == "friction"
    assert "Kasir" in dash["key_insights"][0]["title"] or "Dalam" in dash["key_insights"][0]["title"]


def test_dynamic_waypoints_stage_counts_and_measurement_plan_targets(client: TestClient) -> None:
    biz_res = client.post(
        "/api/v1/businesses",
        json={"name": "Kopi Lantai Satu", "branch_name": "Cabang A", "category": "kedai"},
    )
    assert biz_res.status_code == 201
    anl_res = client.post(
        f"/api/v1/businesses/{biz_res.json()['id']}/analyses",
        json={"name": "Uji P2"},
    )
    assert anl_res.status_code == 201
    anl_id = anl_res.json()["id"]

    # Hanya buat segmen 'jalan' & 'dalam' (tanpa segmen 'pintu'/tangga)
    assert (
        client.post(
            f"/api/v1/analyses/{anl_id}/transcript/segments",
            json={
                "timestamp_start": 0.0,
                "timestamp_end": 12.0,
                "vantage": "jalan",
                "narrative": "Trotoar depan kedai.",
                "not_visible": "Papan nama belum terlihat.",
            },
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/api/v1/analyses/{anl_id}/transcript/segments",
            json={
                "timestamp_start": 12.0,
                "timestamp_end": 25.0,
                "vantage": "dalam",
                "narrative": "Masuk ke meja kasir di lantai dasar.",
                "not_visible": "Menu dan harga belum terlihat.",
            },
        ).status_code
        == 201
    )

    # Panggil measurement-plan sebelum simulasi -> terbuat versi awal
    mp_before = client.get(f"/api/v1/analyses/{anl_id}/measurement-plan")
    assert mp_before.status_code == 200

    # Jalankan simulasi mock (20 agen) lalu periksa dashboard + refresh measurement-plan
    assert client.post(f"/api/v1/analyses/{anl_id}/simulation", json={"n_agents": 20, "seed": 42}).status_code == 202
    dash = client.get(f"/api/v1/analyses/{anl_id}/dashboard?require_existing=true").json()

    # 1. Waypoints hanya memuat 'jalan' & 'kasir' (tidak mengarang 'tangga')
    wp_ids = [w["id"] for w in dash["waypoints"]]
    assert wp_ids == ["jalan", "kasir"]
    assert "tangga" not in wp_ids

    # 2. WhatIfStageComparisonOut mengirim baseline_count & projected_count integer langsung
    stages = dash["what_if_projection"]["stages_comparison"]
    assert len(stages) == 4
    for s in stages:
        assert isinstance(s["baseline_count"], int)
        assert isinstance(s["projected_count"], int)
    assert stages[-1]["baseline_count"] == dash["what_if_projection"]["buyers_baseline"]
    assert stages[-1]["projected_count"] == dash["what_if_projection"]["buyers_projected"]

    # 3. MeasurementPlan tersinkron dengan target pasca-perbaikan (tidak terkunci statis 20, 14, 9, 7)
    mp_after = client.get(f"/api/v1/analyses/{anl_id}/measurement-plan").json()
    targets = [m["target_count"] for m in mp_after["metrics"]]
    assert len(targets) == 4
    assert targets[0] >= targets[1] >= targets[2] >= targets[3]
    assert targets[0] == 20
    assert targets[3] == dash["what_if_projection"]["buyers_projected"]
