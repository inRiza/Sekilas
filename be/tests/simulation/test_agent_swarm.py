"""Unit test offline (LLM_MODE=mock, 0 token) untuk arsitektur 20-agen feat/agent-swarm."""

from __future__ import annotations

from app.core.config import get_settings
from app.models.entities import Analysis as AnalysisModel
from app.services.simulation.ablation import (
    _rewrite_target_segments_from_actions,
    compute_quick_estimate_projection,
    run_verified_simulation_projection,
)
from app.services.simulation.catalog import (
    ACTION_CATALOG,
    HYPOTHESIS_CATALOG,
    render_action_spec,
    shuffled_catalog_for_agent,
)
from app.services.simulation.pareto import aggregate_cue_scores, generate_catalog_recommendations
from app.services.simulation.population import generate_discrete_personas
from app.services.simulation.runner import SegmentInput, run_20_agent_swarm
from app.services.transcript.extractor import extract_transcript_with_gemini


def _sample_segments() -> list[SegmentInput]:
    return [
        SegmentInput(id="seg_1", vantage="jalan", narrative="Berjalan di trotoar seberang.", not_visible="Papan nama dan jam buka tidak terlihat."),
        SegmentInput(id="seg_2", vantage="jalan", narrative="Mendekati bahu jalan depan toko.", not_visible="Area parkir belum jelas."),
        SegmentInput(id="seg_3", vantage="pintu", narrative="Berhenti di depan pintu masuk.", not_visible="Daftar menu dan harga belum terbaca."),
        SegmentInput(id="seg_4", vantage="pintu", narrative="Melangkah masuk lewat ambang pintu agak redup.", not_visible="Arah kasir belum tampak."),
        SegmentInput(id="seg_5", vantage="dalam", narrative="Tiba di area dalam dan meja kasir terlihat jelas.", not_visible="Estimasi waktu saji tidak tertulis."),
    ]


def test_discrete_personas_20_agents_reproducible() -> None:
    p1 = generate_discrete_personas(
        n=20,
        seed=42,
        surrounding_type="kampus",
        visitor_types=["mahasiswa"],
        median_menu_price=15000,
        peak_hours=["siang"],
    )
    p2 = generate_discrete_personas(
        n=20,
        seed=42,
        surrounding_type="kampus",
        visitor_types=["mahasiswa"],
        median_menu_price=15000,
        peak_hours=["siang"],
    )
    assert len(p1) == 20
    assert [x.model_dump() for x in p1] == [x.model_dump() for x in p2]
    assert sum(1 for x in p1 if x.segment == "mahasiswa") >= 5


def test_catalog_actions_efficacy_and_shuffling() -> None:
    assert any(h.cue_code == "H8" for h in HYPOTHESIS_CATALOG)
    for act in ACTION_CATALOG:
        assert 0.0 <= act.efficacy <= 1.0
    rendered = render_action_spec("A2.1", {"tanda_status": "BUKA TIAP HARI"})
    assert "BUKA TIAP HARI" in rendered

    order_a = [h.cue_code for h in shuffled_catalog_for_agent(agent_id=1, allowed_vantages={"jalan", "pintu"}, seed=42)]
    order_b = [h.cue_code for h in shuffled_catalog_for_agent(agent_id=2, allowed_vantages={"jalan", "pintu"}, seed=42)]
    assert set(order_a) == set(order_b)
    assert order_a != order_b


def test_20_agent_swarm_and_mode1_mode2_projections(monkeypatch) -> None:
    monkeypatch.setenv("LLM_MODE", "mock")
    get_settings.cache_clear()

    personas = generate_discrete_personas(n=20, seed=42)
    segments = _sample_segments()

    results = run_20_agent_swarm(
        personas=personas,
        segments=segments,
        business_summary="Warung Nasi SPG, Jl. Kaliurang.",
        batch_size=10,
        seed=42,
    )
    assert len(results) == 20
    for r in results:
        assert len(r.segment_traces) >= 1
        assert not hasattr(r, "hesitation_score")
        for attr in r.attributions:
            assert attr["direction"] in ("menghambat", "mendorong", "netral")
            assert 0 <= attr["relevance_score"] <= 3

    cues = aggregate_cue_scores(results)
    assert len(cues) >= 1
    recs = generate_catalog_recommendations(cues=cues, segments=segments)
    assert len(recs) >= 1

    # Mode 1: estimasi_cepat untuk segmen awal harus ditandai low_accuracy_early_edit=True
    quick_early = compute_quick_estimate_projection(
        segments=segments,
        baseline_results=results,
        checked_actions=[("A1.1", ["seg_1"])],
    )
    assert quick_early.low_accuracy_early_edit is True
    assert quick_early.accuracy_note is not None

    # Mode 2: terverifikasi_simulasi hanya mengubah segmen target & mulai dari min_edited_segment_idx
    rewritten, edited_ids, min_idx = _rewrite_target_segments_from_actions(
        segments=segments,
        checked_actions=[("A8.1", ["seg_3"], None)],
    )
    assert edited_ids == ["seg_3"]
    assert min_idx == 2
    assert rewritten[0].narrative == segments[0].narrative
    assert rewritten[1].narrative == segments[1].narrative
    assert rewritten[2].narrative != segments[2].narrative

    verified = run_verified_simulation_projection(
        personas=personas,
        segments=segments,
        baseline_results=results,
        business_summary="Warung Nasi SPG",
        checked_actions=[("A8.1", ["seg_3"], None)],
        batch_size=10,
        seed=42,
    )
    assert verified.total_agents == 20
    assert verified.min_edited_segment_idx == 2


def test_vlm_extractor_fallback_generates_12_plus_events(monkeypatch) -> None:
    monkeypatch.setenv("LLM_MODE", "mock")
    get_settings.cache_clear()

    analysis = AnalysisModel(id="anl_test", business_id="biz_test", name="Tes Warung")
    segs, chks = extract_transcript_with_gemini(
        analysis=analysis,
        duration_s=45.0,
        cashier_at_s=42.0,
        frame_keys=[f"https://example.com/f_{i}.jpg" for i in range(16)],
        timestamps_s=[i * 2.5 for i in range(16)],
    )
    assert len(segs) >= 12
    assert len(chks) >= 2
