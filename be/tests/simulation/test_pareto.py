from app.schemas.common import Range
from app.schemas.dashboard import Effort, Recommendation
from app.services.simulation.pareto import (
    CueAggregate,
    generate_catalog_recommendations,
    pareto_frontier,
    select_priority,
)
from app.services.simulation.runner import SegmentInput


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

    # Dengan cannot_change=["fasad", "harga"], papan nama A1.1 tetap boleh, H9 terblokir, H7 noise terbuang
    recs = generate_catalog_recommendations(
        cues=cues,
        segments=segments,
        cannot_change=["fasad", "harga"],
    )
    cue_codes = [r.cue_code for r in recs]
    assert cue_codes == ["H1", "H8"]
    assert recs[0].action_id == "A1.1"
    assert recs[0].is_priority is True
    assert recs[0].affected_agents_count == 9
    assert recs[0].quote_agent_ids == [1, 2, 3, 4, 5, 6, 7, 8, 9]
    assert len(pareto_frontier([{"impact": 10.0, "effort": 1.0}])) == 1
