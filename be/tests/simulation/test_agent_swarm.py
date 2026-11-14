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


def test_vlm_raises_503_without_fallback_on_server_error(monkeypatch) -> None:
    import base64

    import pytest
    from google.genai import errors as genai_errors

    from app.services.llm.router import LLMRouter, LLMUnavailableError

    monkeypatch.setenv("LLM_MODE", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-key-for-test")
    get_settings.cache_clear()

    class _FakeModels:
        def generate_content(self, **_kwargs):
            raise genai_errors.ServerError(
                503,
                {"error": {"code": 503, "message": "This model is currently experiencing high demand.", "status": "UNAVAILABLE"}},
                None,
            )

    class _FakeClient:
        models = _FakeModels()

    monkeypatch.setattr(LLMRouter, "_get_gemini_client", lambda self: _FakeClient())

    tiny_jpeg = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff\xd9").decode("ascii")
    analysis = AnalysisModel(id="anl_test", business_id="biz_test", name="Tes Warung")
    with pytest.raises(LLMUnavailableError) as exc_info:
        extract_transcript_with_gemini(
            analysis=analysis,
            duration_s=30.0,
            cashier_at_s=28.0,
            frame_keys=[tiny_jpeg, tiny_jpeg],
            timestamps_s=[5.0, 15.0],
        )
    assert exc_info.value.status_code == 503
    assert "503" in str(exc_info.value)

    monkeypatch.setenv("LLM_MODE", "mock")
    get_settings.cache_clear()


def test_swarm_raises_503_without_fallback_to_openai_or_mock(monkeypatch) -> None:
    import httpx
    import pytest

    from app.services.llm.router import LLMUnavailableError

    monkeypatch.setenv("LLM_MODE", "auto")
    monkeypatch.setenv("OPENAI_API_KEY", "dummy-openai-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-6-luna")
    get_settings.cache_clear()

    class _FakeResp:
        status_code = 503
        is_success = False
        text = "Service Unavailable"

        def json(self):
            return {"error": {"message": "Model overloaded"}}

    class _FakeHttpClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def post(self, *_args, **_kwargs):
            return _FakeResp()

    monkeypatch.setattr(httpx, "Client", _FakeHttpClient)

    personas = generate_discrete_personas(n=20, seed=42)
    segments = [SegmentInput(id="seg_1", vantage="jalan", narrative="Tampak dari jalan", not_visible="Harga belum terlihat")]

    with pytest.raises(LLMUnavailableError) as exc_info:
        run_20_agent_swarm(
            personas=personas,
            segments=segments,
            business_summary="Warung Nasi SPG",
            batch_size=10,
            seed=42,
        )
    assert exc_info.value.status_code == 503
    assert "503" in str(exc_info.value)

    monkeypatch.setenv("LLM_MODE", "mock")
    get_settings.cache_clear()


def test_openai_payload_uses_max_completion_tokens(monkeypatch) -> None:
    import json

    import httpx

    from app.services.llm.router import get_llm_router

    monkeypatch.setenv("LLM_MODE", "auto")
    monkeypatch.setenv("OPENAI_API_KEY", "dummy-openai-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-6-luna")
    get_settings.cache_clear()

    captured_payloads: list[dict] = []

    class _FakeResp:
        status_code = 200
        is_success = True
        text = "{}"

        def json(self):
            return {"choices": [{"message": {"content": json.dumps({"ok": True})}}]}

    class _FakeHttpClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def post(self, *_args, **kwargs):
            captured_payloads.append(dict(kwargs.get("json") or {}))
            return _FakeResp()

    monkeypatch.setattr(httpx, "Client", _FakeHttpClient)

    res = get_llm_router().generate_json(
        system_prompt="sys",
        user_prompt="usr",
        temperature=0.2,
        max_output_tokens=4096,
    )
    assert res.data == {"ok": True}
    assert len(captured_payloads) == 1
    assert captured_payloads[0]["max_completion_tokens"] == 4096
    assert "max_tokens" not in captured_payloads[0]

    monkeypatch.setenv("LLM_MODE", "mock")
    get_settings.cache_clear()


def test_swarm_alias_mapping_early_stop_and_missing_agent_retry(monkeypatch) -> None:
    import json

    import httpx

    monkeypatch.setenv("LLM_MODE", "auto")
    monkeypatch.setenv("OPENAI_API_KEY", "dummy-openai-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-6-luna")
    monkeypatch.setenv("SIM_CONCURRENCY_LIMIT", "1")
    get_settings.cache_clear()

    call_idx = 0

    class _FakeResp:
        def __init__(self, payload: dict):
            self._payload = payload
            self.status_code = 200
            self.is_success = True
            self.text = json.dumps(payload)

        def json(self):
            return {"choices": [{"message": {"content": self.text}}]}

    class _FakeHttpClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def post(self, *_args, **_kwargs):
            nonlocal call_idx
            call_idx += 1
            if call_idx == 1:
                # Batch Step 1 sengaja melewatkan agent_id=2 dan menulis segmen ekstra setelah 'berhenti'
                return _FakeResp(
                    {
                        "results": [
                            {
                                "agent_id": 1,
                                "segment_traces": [
                                    {"segment_id": "S1", "monologue": "Plang belum terlihat jelas.", "action": "berhenti"},
                                    {"segment_id": "S2", "monologue": "Seharusnya terpotong.", "action": "lanjut"},
                                ],
                                "final_decision": "lewat",
                                "stopped_at_segment_id": "S1",
                                "deciding_factor": "Plang belum terlihat.",
                                "factor_segment_ids": ["S1"],
                            }
                        ]
                    }
                )
            if call_idx == 2:
                # Targeted retry khusus untuk agent_id=2 yang sempat terlewat
                return _FakeResp(
                    {
                        "results": [
                            {
                                "agent_id": 2,
                                "segment_traces": [
                                    {"segment_id": "S1", "monologue": "Masih tampak buka.", "action": "lanjut"},
                                    {"segment_id": "S2", "monologue": "Langsung masuk dan pesan.", "action": "lanjut"},
                                ],
                                "final_decision": "memesan",
                                "stopped_at_segment_id": None,
                                "deciding_factor": "Cepat dilayani.",
                                "factor_segment_ids": ["S2"],
                            }
                        ]
                    }
                )
            # Step 2 atribusi Katalog Isyarat
            return _FakeResp(
                {
                    "results": [
                        {
                            "agent_id": 1,
                            "attributions": [
                                {
                                    "cue_code": "H1",
                                    "direction": "menghambat",
                                    "relevance_score": 3,
                                    "evidence": "Plang belum terlihat jelas.",
                                }
                            ],
                            "primary": "H1",
                            "other_reason": None,
                        },
                        {
                            "agent_id": 2,
                            "attributions": [],
                            "primary": None,
                            "other_reason": None,
                        },
                    ]
                }
            )

    monkeypatch.setattr(httpx, "Client", _FakeHttpClient)

    personas = generate_discrete_personas(n=2, seed=42)
    segments = [
        SegmentInput(id="seg_alpha", vantage="jalan", narrative="Tampak dari trotoar.", not_visible="Plang tidak terlihat."),
        SegmentInput(id="seg_beta", vantage="dalam", narrative="Kasir dan menu jelas.", not_visible=""),
    ]
    results = run_20_agent_swarm(
        personas=personas,
        segments=segments,
        business_summary="Warung Nasi SPG",
        batch_size=10,
        seed=42,
    )
    assert len(results) == 2
    a1, a2 = results[0], results[1]
    assert a1.stopped_at_segment_id == "seg_alpha"
    assert [t["segment_id"] for t in a1.segment_traces] == ["seg_alpha"]
    assert a1.factor_segment_ids == ["seg_alpha"]
    assert a1.primary_hypothesis_id == "H1"
    assert a2.final_decision == "memesan"
    assert a2.stopped_at_segment_id is None
    assert [t["segment_id"] for t in a2.segment_traces] == ["seg_alpha", "seg_beta"]

    monkeypatch.setenv("LLM_MODE", "mock")
    get_settings.cache_clear()
