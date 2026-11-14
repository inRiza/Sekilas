from app.schemas.common import Range
from app.schemas.dashboard import Effort, Recommendation
from app.services.simulation.pareto import (
    CueAggregate,
    aggregate_cue_scores,
    generate_catalog_recommendations,
    pareto_frontier,
    select_priority,
)
from app.services.simulation.runner import AgentRunResult, SegmentInput


def rec(id_: str, impact: float, effort: Effort = Effort.low) -> Recommendation:
    return Recommendation(
        id=id_,
        title=id_,
        cue_entry_id=id_,
        impact=Range(low=impact, high=impact),
        effort=effort,
        priority=False,
    )


def test_cutoff_at_80_percent() -> None:
    out = select_priority([rec("a", 50), rec("b", 30), rec("c", 15), rec("d", 5)])
    assert [r.id for r in out] == ["a", "b", "c", "d"]
    assert [r.priority for r in out] == [True, True, False, False]


def test_low_effort_wins_tie() -> None:
    out = select_priority([rec("hi", 10, Effort.high), rec("lo", 10, Effort.low)])
    assert out[0].id == "lo"


def test_max_five_priority() -> None:
    out = select_priority([rec(str(i), 1) for i in range(10)])
    assert sum(r.priority for r in out) <= 5


def test_generate_catalog_recommendations_filters_irrelevant_and_constraints(monkeypatch) -> None:
    from app.core.config import get_settings

    monkeypatch.setenv("LLM_MODE", "mock")
    get_settings.cache_clear()

    segments = [
        SegmentInput(id="seg_1", vantage="jalan", narrative="Trotoar depan", not_visible="Plang tertutup"),
        SegmentInput(id="seg_2", vantage="pintu", narrative="Ambang pintu", not_visible="Daftar menu tidak tampak"),
    ]
    cues = [
        CueAggregate(
            cue_code="H1",
            title="Tempat tidak terlihat",
            share_pct=55.0,
            affected_agents_count=9,
            total_non_buyers=16,
            lift=2.5,
            total_relevance=24.0,
            top_segment_ids=["seg_1"],
            sample_quotes=["Plang tidak kelihatan"],
            affected_agent_ids=[1, 2, 3, 4, 5, 6, 7, 8, 9],
        ),
        CueAggregate(
            cue_code="H8",
            title="Menu & harga tidak terlihat",
            share_pct=30.0,
            affected_agents_count=5,
            total_non_buyers=16,
            lift=1.8,
            total_relevance=14.0,
            top_segment_ids=["seg_2"],
            sample_quotes=["Tidak ada harga"],
            affected_agent_ids=[10, 11, 12, 13, 14],
        ),
        CueAggregate(
            cue_code="H9",
            title="Harga terkesan mahal",
            share_pct=12.0,
            affected_agents_count=3,
            total_non_buyers=16,
            lift=1.4,
            total_relevance=6.0,
            top_segment_ids=["seg_2"],
            sample_quotes=["Takut mahal"],
            affected_agent_ids=[15, 16, 17],
        ),
        CueAggregate(
            cue_code="H7",
            title="Noise kebetulan",
            share_pct=3.0,
            affected_agents_count=1,
            total_non_buyers=16,
            lift=0.8,
            total_relevance=1.0,
            top_segment_ids=["seg_2"],
            sample_quotes=["Agak sepi"],
            affected_agent_ids=[18],
        ),
    ]

    # Dengan cannot_change=["fasad", "harga"], papan nama A1.1 tetap boleh, H9 memakai A9.2 (tanpa ubah harga), H7 noise terbuang
    recs = generate_catalog_recommendations(
        cues=cues,
        segments=segments,
        cannot_change=["fasad", "harga"],
    )
    cue_codes = [r.cue_code for r in recs]
    assert cue_codes == ["H1", "H8", "H9"]
    assert recs[0].action_id == "A1.1"
    assert recs[1].action_id == "A8.1"
    assert recs[2].action_id == "A9.2"
    assert recs[0].is_priority is True
    assert recs[0].affected_agents_count == 9
    assert recs[0].quote_agent_ids == [1, 2, 3, 4, 5, 6, 7, 8, 9]
    assert len(pareto_frontier([{"impact": 10.0, "effort": 1.0}])) == 1


def test_aggregate_cue_scores_laplace_lift_filters_flukes_and_bounds_zero_buyers() -> None:
    def _agent(
        agent_id: int,
        decision: str,
        cue_code: str,
        direction: str = "menghambat",
    ) -> AgentRunResult:
        return AgentRunResult(
            agent_id=agent_id,
            batch_id=1,
            monologue="tes",
            final_decision=decision,
            stopped_at_segment_id="seg_1" if decision != "memesan" else None,
            deciding_factor="tes",
            factor_segment_ids=["seg_1"],
            segment_traces=[{"segment_id": "seg_1", "monologue": "tes", "action": "berhenti"}],
            attributions=[
                {
                    "cue_code": cue_code,
                    "direction": direction,
                    "relevance_score": 2,
                    "evidence": f"Bukti {cue_code} agen {agent_id}",
                }
            ],
            primary_hypothesis_id=cue_code,
        )

    # 18 gagal (17 H8, 1 H7 kebetulan) + 2 berhasil memesan -> Laplace lift H7 harus < 1.0, H8 terikat jauh < 20.0
    runs = (
        [_agent(i, "berhenti_lalu_pergi", "H8") for i in range(1, 18)]
        + [_agent(18, "lewat", "H7")]
        + [_agent(19, "memesan", "H8", direction="mendorong")]
        + [_agent(20, "memesan", "H1", direction="mendorong")]
    )
    agg = {c.cue_code: c for c in aggregate_cue_scores(runs)}
    assert agg["H8"].lift > 2.0
    assert agg["H8"].lift < 10.0
    assert agg["H7"].lift < 1.0

    # Baseline 0 pembeli -> lift tetap dalam skala bounded 1.0..2.0 dan H1 tetap terpilih sebagai sinyal relevan
    zero_buy_runs = [_agent(i, "lewat", "H1") for i in range(1, 6)]
    agg_zero = aggregate_cue_scores(zero_buy_runs)
    assert len(agg_zero) == 1
    assert 1.0 < agg_zero[0].lift <= 2.0
