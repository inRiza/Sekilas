from app.schemas.common import Range
from app.schemas.dashboard import Effort, Recommendation
from app.services.simulation.pareto import select_priority


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
