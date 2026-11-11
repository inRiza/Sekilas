"""F6.C: urutkan rekomendasi dan beri tanda Prioritas sampai ~80% kumulatif dampak."""

from collections.abc import Sequence

from app.schemas.dashboard import Effort, Recommendation

CUMULATIVE_CUTOFF = 0.8
MAX_PRIORITY = 5
_EFFORT_RANK = {Effort.low: 0, Effort.medium: 1, Effort.high: 2}


def _mid(rec: Recommendation) -> float:
    return (rec.impact.low + rec.impact.high) / 2


def select_priority(recs: Sequence[Recommendation]) -> list[Recommendation]:
    """Urut dampak besar dulu, usaha kecil sebagai pemecah seri.

    Item ditandai Prioritas sampai kumulatif dampak mencapai 80% (maks 5 item).
    """
    ordered = sorted(recs, key=lambda r: (-_mid(r), _EFFORT_RANK[r.effort]))
    total = sum(max(_mid(r), 0.0) for r in ordered)
    out: list[Recommendation] = []
    cumulative = 0.0
    for rec in ordered:
        reached = total > 0 and cumulative / total >= CUMULATIVE_CUTOFF
        priority = not reached and len([r for r in out if r.priority]) < MAX_PRIORITY
        out.append(rec.model_copy(update={"priority": priority}))
        cumulative += max(_mid(rec), 0.0)
    return out
