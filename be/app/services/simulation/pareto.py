"""F6-C & F6-D: Agregasi Katalog Isyarat (Share, Lift) & Pemilihan Rekomendasi dari Katalog Tindakan."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.services.llm.router import get_llm_router
from app.services.simulation.catalog import (
    ACTION_BY_ID,
    HYPOTHESIS_BY_CODE,
    get_actions_for_cue,
    render_action_spec,
)
from app.services.simulation.runner import AgentRunResult, SegmentInput

logger = logging.getLogger(__name__)


@dataclass
class CueAggregate:
    cue_code: str
    title: str
    share_pct: float
    affected_agents_count: int
    total_non_buyers: int
    lift: float
    total_relevance: float
    top_segment_ids: list[str]
    sample_quotes: list[str]


@dataclass
class CuratedRecommendation:
    id: str
    cue_code: str
    action_id: str
    title: str
    description: str
    efficacy: float
    effort: str
    cost_rp: int
    impact_score: float
    segment_ids: list[str]
    quote_agent_ids: list[int]
    is_priority: bool = False


def aggregate_cue_scores(results: list[AgentRunResult]) -> list[CueAggregate]:
    """Hitung Share (porsi kehilangan) dan Lift per kategori Katalog Isyarat dari 20 agen."""
    non_buyers = [r for r in results if r.final_decision != "memesan"]
    buyers = [r for r in results if r.final_decision == "memesan"]
    n_non = len(non_buyers)
    n_buy = len(buyers)

    # Bobot per agen = 1 suara dibagi proporsional ke relevance_score isyarat 'menghambat'
    cue_share_sum: dict[str, float] = {}
    cue_rel_sum: dict[str, float] = {}
    cue_non_buyer_agents: dict[str, set[int]] = {}
    cue_buyer_agents: dict[str, set[int]] = {}
    cue_segments: dict[str, list[str]] = {}
    cue_quotes: dict[str, list[str]] = {}

    for r in non_buyers:
        inhibs = [a for a in r.attributions if a.get("direction") == "menghambat" and int(a.get("relevance_score", 0)) > 0]
        total_rel = sum(int(a["relevance_score"]) for a in inhibs)
        if total_rel <= 0:
            continue
        for a in inhibs:
            code = str(a["cue_code"])
            rel = int(a["relevance_score"])
            cue_share_sum[code] = cue_share_sum.get(code, 0.0) + (rel / total_rel)
            cue_rel_sum[code] = cue_rel_sum.get(code, 0.0) + rel
            cue_non_buyer_agents.setdefault(code, set()).add(r.agent_id)
            cue_segments.setdefault(code, []).extend(r.factor_segment_ids or ([r.stopped_at_segment_id] if r.stopped_at_segment_id else []))
            if a.get("evidence"):
                cue_quotes.setdefault(code, []).append(str(a["evidence"]))

    for r in buyers:
        for a in r.attributions:
            if a.get("direction") == "menghambat" and int(a.get("relevance_score", 0)) > 0:
                code = str(a["cue_code"])
                cue_buyer_agents.setdefault(code, set()).add(r.agent_id)

    aggregates: list[CueAggregate] = []
    for code, share_val in cue_share_sum.items():
        hyp = HYPOTHESIS_BY_CODE.get(code)
        if not hyp:
            continue
        pct_non = (len(cue_non_buyer_agents.get(code, set())) / max(1, n_non)) if n_non else 0.0
        pct_buy = (len(cue_buyer_agents.get(code, set())) / max(1, n_buy)) if n_buy else 0.0
        lift = pct_non / max(0.05, pct_buy)
        share_pct = (share_val / max(1, n_non)) * 100.0 if n_non else 0.0
        segs_unique = list(dict.fromkeys(s for s in cue_segments.get(code, []) if s))
        aggregates.append(
            CueAggregate(
                cue_code=code,
                title=hyp.title,
                share_pct=round(share_pct, 1),
                affected_agents_count=len(cue_non_buyer_agents.get(code, set())),
                total_non_buyers=n_non,
                lift=round(lift, 2),
                total_relevance=cue_rel_sum.get(code, 0.0),
                top_segment_ids=segs_unique[:3],
                sample_quotes=cue_quotes.get(code, [])[:3],
            )
        )

    aggregates.sort(key=lambda c: (c.lift > 1.0, c.share_pct, c.total_relevance), reverse=True)
    return aggregates


def generate_catalog_recommendations(
    *,
    cues: list[CueAggregate],
    segments: list[SegmentInput],
    cannot_change: list[str] | None = None,
    owner_goals: list[str] | None = None,
) -> list[CuratedRecommendation]:
    """1 panggilan LLM Gemini memilih tindakan dari Katalog Tindakan + mengisi parameter slot.

    Nilai efikasi ``e`` dan definisi tindakan selalu diambil dari ``ACTION_CATALOG`` (tidak dikarang LLM).
    """
    top_cues = [c for c in cues if c.cue_code != "H0"][:5]
    if not top_cues:
        return []

    candidates_by_cue: dict[str, list[dict[str, Any]]] = {}
    for c in top_cues:
        acts = get_actions_for_cue(c.cue_code, cannot_change)
        candidates_by_cue[c.cue_code] = [
            {
                "action_id": a.action_id,
                "title": a.title,
                "slots": list(a.default_slots.keys()),
                "default_slots": a.default_slots,
                "effort": a.effort,
                "efficacy": a.efficacy,
            }
            for a in acts
        ]

    selected_by_cue: dict[str, dict[str, Any]] = {}
    router = get_llm_router()
    valid_seg_ids = {s.id for s in segments}

    if not router.is_mock_mode:
        sys_p = (
            "Kamu menyusun prioritas perbaikan toko UMKM. "
            "Kamu HANYA boleh memilih action_id dari daftar kandidat yang diberikan dan mengisi slot parameternya "
            "berdasarkan bukti segmen transkrip. JANGAN mengarang angka efikasi atau tindakan di luar katalog."
        )
        seg_summary = "\n".join(f"- {s.id} ({s.vantage}): {s.narrative[:120]}" for s in segments)
        cue_summary = "\n".join(
            f"- {c.cue_code} ({c.title}): dialami {c.affected_agents_count}/{c.total_non_buyers} agen gagal, "
            f"segmen={c.top_segment_ids}, kandidat={candidates_by_cue.get(c.cue_code, [])}"
            for c in top_cues
        )
        usr_p = (
            f"Tujuan pemilik: {owner_goals or ['meningkatkan konversi']}\n"
            f"Transkrip ringkas:\n{seg_summary}\n\n"
            f"Masalah teratas & kandidat tindakan:\n{cue_summary}\n\n"
            'Kembalikan JSON: {"recommendations": [{"cue_code": str, "action_id": str, "slot_params": {str: str}, "segment_ids": [str]}]}'
        )
        try:
            res = router.generate_json(system_prompt=sys_p, user_prompt=usr_p, temperature=0.1, max_output_tokens=1536)
            if res and isinstance(res.data, dict) and isinstance(res.data.get("recommendations"), list):
                for item in res.data["recommendations"]:
                    if isinstance(item, dict) and item.get("cue_code"):
                        selected_by_cue[str(item["cue_code"])] = item
        except (ValueError, RuntimeError, KeyError, TypeError, OSError) as exc:
            logger.warning("Gagal memanggil LLM untuk seleksi tindakan (%s); memakai default katalog.", exc)

    recs: list[CuratedRecommendation] = []
    cum_share = 0.0
    total_share = sum(c.share_pct for c in top_cues) or 100.0

    for idx, c in enumerate(top_cues, start=1):
        allowed_acts = get_actions_for_cue(c.cue_code, cannot_change)
        if not allowed_acts:
            continue
        allowed_ids = {a.action_id for a in allowed_acts}

        llm_choice = selected_by_cue.get(c.cue_code) or {}
        chosen_id = str(llm_choice.get("action_id") or "")
        if chosen_id not in allowed_ids:
            chosen_id = allowed_acts[0].action_id

        action = ACTION_BY_ID[chosen_id]
        # Validasi rentang efikasi dari katalog
        efficacy = max(0.0, min(1.0, float(action.efficacy)))
        slot_params = llm_choice.get("slot_params") if isinstance(llm_choice.get("slot_params"), dict) else None
        rendered_desc = render_action_spec(chosen_id, slot_params)

        raw_segs = llm_choice.get("segment_ids") if isinstance(llm_choice.get("segment_ids"), list) else c.top_segment_ids
        seg_ids = [str(s) for s in raw_segs if str(s) in valid_seg_ids] or c.top_segment_ids or ([segments[0].id] if segments else [])

        cum_share += c.share_pct
        is_prio = (cum_share / total_share) <= 0.85 or idx <= 2

        recs.append(
            CuratedRecommendation(
                id=f"rec_{idx}_{action.action_id.replace('.', '_')}",
                cue_code=c.cue_code,
                action_id=action.action_id,
                title=action.title,
                description=rendered_desc,
                efficacy=efficacy,
                effort=action.effort,
                cost_rp=action.cost_rp,
                impact_score=round(c.share_pct * efficacy, 1),
                segment_ids=seg_ids,
                quote_agent_ids=[],
                is_priority=is_prio,
            )
        )

    return recs


def pareto_frontier(items: list[dict[str, float]]) -> list[dict[str, float]]:
    """Kompatibilitas untuk unit test lama: saring item tidak terdominasi (maks impact, min effort)."""
    frontier: list[dict[str, float]] = []
    for cand in items:
        dominated = any(
            other is not cand
            and other["impact"] >= cand["impact"]
            and other["effort"] <= cand["effort"]
            and (other["impact"] > cand["impact"] or other["effort"] < cand["effort"])
            for other in items
        )
        if not dominated:
            frontier.append(cand)
    return frontier


def select_priority(recs: list[Any]) -> list[Any]:
    """Kompatibilitas unit test lama: urutkan rekomendasi & tandai prioritas Pareto (maks 5, cutoff 80%)."""
    effort_rank = {"low": 0, "medium": 1, "high": 2}
    ordered = sorted(
        recs,
        key=lambda r: (
            -float(r.impact.high),
            effort_rank.get(getattr(r.effort, "value", str(r.effort)), 1),
        ),
    )
    total = sum(float(r.impact.high) for r in ordered) or 1.0
    cum = 0.0
    prio_count = 0
    out: list[Any] = []
    for r in ordered:
        is_prio = prio_count < 5 and cum / total < 0.8
        cum += float(r.impact.high)
        if is_prio:
            prio_count += 1
        out.append(r.model_copy(update={"priority": is_prio}))
    return out
