"""F6-C & F6-D: Agregasi Katalog Isyarat (Share, Lift) & Pemilihan Rekomendasi dari Katalog Tindakan."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.services.llm.router import LLMUnavailableError, get_llm_router
from app.services.simulation.catalog import (
    ACTION_BY_ID,
    HYPOTHESIS_BY_CODE,
    CatalogAction,
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
    affected_agent_ids: list[int] | None = None


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
    share_pct: float = 0.0
    lift: float = 1.0
    affected_agents_count: int = 0


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
        cnt_non = len(cue_non_buyer_agents.get(code, set()))
        cnt_buy = len(cue_buyer_agents.get(code, set()))
        pct_non = (cnt_non / n_non) if n_non else 0.0
        if n_buy > 0:
            # Laplace smoothing (+0.5 / +1.0) mencegah lonjakan palsu 20x dan menyaring fluke 1 agen
            pct_non_smooth = (cnt_non + 0.5) / (n_non + 1.0)
            pct_buy_smooth = (cnt_buy + 0.5) / (n_buy + 1.0)
            lift = pct_non_smooth / pct_buy_smooth
        else:
            # Saat belum ada pembeli di baseline, jaga skala bounded 1.0..2.0 agar peringkat tetap terbedakan
            lift = (1.0 + pct_non) if cnt_non > 0 else 1.0
        share_pct = (share_val / max(1, n_non)) * 100.0 if n_non else 0.0
        segs_unique = list(dict.fromkeys(s for s in cue_segments.get(code, []) if s))
        agent_ids = sorted(cue_non_buyer_agents.get(code, set()))
        aggregates.append(
            CueAggregate(
                cue_code=code,
                title=hyp.title,
                share_pct=round(share_pct, 1),
                affected_agents_count=len(agent_ids),
                total_non_buyers=n_non,
                lift=round(lift, 2),
                total_relevance=cue_rel_sum.get(code, 0.0),
                top_segment_ids=segs_unique[:3],
                sample_quotes=cue_quotes.get(code, [])[:3],
                affected_agent_ids=agent_ids,
            )
        )

    aggregates.sort(key=lambda c: (c.lift > 1.0, c.share_pct, c.total_relevance), reverse=True)
    return aggregates


def _select_relevant_cues(
    cues: list[CueAggregate],
    cannot_change: list[str] | None,
) -> list[CueAggregate]:
    """Saring hanya isyarat yang berdampak nyata dan memiliki tindakan yang tidak terblokir batasan pemilik."""
    non_h0 = [c for c in cues if c.cue_code != "H0" and c.affected_agents_count > 0]
    if not non_h0:
        return []

    unblocked = [
        c for c in non_h0 if get_actions_for_cue(c.cue_code, cannot_change, allow_fallback=False)
    ]
    pool = unblocked or non_h0

    strong = [
        c
        for c in pool
        if (c.total_non_buyers < 3 or (c.affected_agents_count >= 2 or c.share_pct >= 10.0))
        and c.lift > 1.0
    ]
    chosen = strong or [c for c in pool if c.affected_agents_count >= 2] or pool[:3]
    return chosen[:6]


_EFFORT_FALLBACK_BONUS: dict[str, float] = {
    "Rendah": 0.15,
    "Sedang": 0.05,
    "Tinggi": 0.0,
}

_ACTION_CONTEXT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "A1.1": ("trotoar", "tidak terlihat", "papan nama", "plang"),
    "A1.2": ("ranting", "pohon", "barang", "terhalang", "tertutup"),
    "A1.3": ("redup", "gelap", "malam", "sorot", "lampu"),
    "A2.2": ("gelap", "lampu", "malam"),
    "A3.2": ("foto", "menu"),
    "A5.3": ("tangga", "lantai", "lorong"),
    "A6.2": ("kotor", "berantakan", "kardus", "barang"),
    "A11.1": ("pintu", "qris", "non-tunai"),
    "A14.2": ("silau", "kaca", "pantulan"),
}


def _pick_best_fallback_action(
    cue: CueAggregate,
    allowed_acts: list[CatalogAction],
    segments_by_id: dict[str, SegmentInput],
) -> str:
    """Pilih tindakan katalog paling relevan berdasar bukti segmen/kutipan, usaha rendah, & efikasi."""
    evidence_parts = list(cue.sample_quotes)
    for sid in cue.top_segment_ids:
        seg = segments_by_id.get(sid)
        if seg:
            evidence_parts.append(f"{seg.narrative} {seg.not_visible}")
    evidence_low = " ".join(evidence_parts).lower()

    def _score(act: CatalogAction) -> tuple[float, float, int]:
        kws = _ACTION_CONTEXT_KEYWORDS.get(act.action_id, ())
        hits = sum(1 for kw in kws if kw in evidence_low)
        effort_bonus = _EFFORT_FALLBACK_BONUS.get(act.effort, 0.0)
        return (round(act.efficacy + effort_bonus + hits * 0.08, 4), act.efficacy, -act.cost_rp)

    best = max(allowed_acts, key=_score)
    return best.action_id


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
    top_cues = _select_relevant_cues(cues, cannot_change)
    if not top_cues:
        return []

    candidates_by_cue: dict[str, list[dict[str, Any]]] = {}
    for c in top_cues:
        acts = get_actions_for_cue(c.cue_code, cannot_change)
        candidates_by_cue[c.cue_code] = [
            {
                "action_id": a.action_id,
                "title": a.title,
                "spec_template": a.spec_template,
                "slots": list(a.default_slots.keys()),
                "default_slots": a.default_slots,
                "effort": a.effort,
                "cost_rp": a.cost_rp,
                "affected_area": a.affected_area,
                "efficacy": a.efficacy,
            }
            for a in acts
        ]

    selected_by_cue: dict[str, dict[str, Any]] = {}
    router = get_llm_router()
    segments_by_id = {s.id: s for s in segments}
    valid_seg_ids = set(segments_by_id)

    id_to_alias = {s.id: f"S{i + 1}" for i, s in enumerate(segments)}
    alias_to_id = {f"S{i + 1}": s.id for i, s in enumerate(segments)}

    if not router.is_mock_mode and top_cues:
        sys_p = (
            "Kamu menyusun prioritas perbaikan toko UMKM F&B dari hasil simulasi agen pelanggan. "
            "Pilih action_id PALING TEPAT dari kandidat per masalah dan isi slot_params secara spesifik sesuai kondisi segmen & keluhan agen (sebut jenis sajian, lokasi pintu/trotoar/kasir, dll). "
            "Kamu HANYA boleh memilih action_id yang ada di kandidat. JANGAN mengarang angka efikasi atau tindakan di luar katalog."
        )
        seg_summary = "\n".join(
            f"- {id_to_alias[s.id]} ({s.vantage}): {s.narrative[:140]} | Belum terlihat: {s.not_visible[:100]}"
            for s in segments
        )
        cue_summary = "\n".join(
            f"- {c.cue_code} ({c.title}): {c.affected_agents_count}/{c.total_non_buyers} agen gagal, "
            f"kutipan={c.sample_quotes[:2]}, segmen={[id_to_alias.get(sid, sid) for sid in c.top_segment_ids]}, "
            f"kandidat={candidates_by_cue.get(c.cue_code, [])}"
            for c in top_cues
        )
        usr_p = (
            f"Tujuan pemilik: {owner_goals or ['meningkatkan konversi']}\n"
            f"Batasan pemilik (tidak bisa diubah): {cannot_change or []}\n"
            f"Transkrip ringkas:\n{seg_summary}\n\n"
            f"Masalah teratas, kutipan agen & kandidat tindakan:\n{cue_summary}\n\n"
            'Kembalikan JSON (pakai segment_ids S1..Sk): '
            '{"recommendations": [{"cue_code": str, "action_id": str, "slot_params": {str: str}, "segment_ids": [str]}]}'
        )
        try:
            res = router.generate_json(system_prompt=sys_p, user_prompt=usr_p, temperature=0.1, max_output_tokens=2048)
            if res and isinstance(res.data, dict) and isinstance(res.data.get("recommendations"), list):
                for item in res.data["recommendations"]:
                    if isinstance(item, dict) and item.get("cue_code"):
                        selected_by_cue[str(item["cue_code"])] = item
        except LLMUnavailableError:
            raise
        except (ValueError, KeyError, TypeError, OSError) as exc:
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
            chosen_id = _pick_best_fallback_action(c, allowed_acts, segments_by_id)

        action = ACTION_BY_ID[chosen_id]
        # Validasi rentang efikasi dari katalog
        efficacy = max(0.0, min(1.0, float(action.efficacy)))
        slot_params = llm_choice.get("slot_params") if isinstance(llm_choice.get("slot_params"), dict) else None
        rendered_desc = render_action_spec(chosen_id, slot_params)

        raw_segs = llm_choice.get("segment_ids") if isinstance(llm_choice.get("segment_ids"), list) else c.top_segment_ids
        seg_ids: list[str] = []
        for raw_s in raw_segs:
            token = str(raw_s).strip()
            mapped = alias_to_id.get(token.upper()) or (token if token in valid_seg_ids else None)
            if mapped and mapped not in seg_ids:
                seg_ids.append(mapped)
        if not seg_ids:
            seg_ids = c.top_segment_ids or ([segments[0].id] if segments else [])

        # Aturan Pareto 80/20: item teratas hingga kontribusi kumulatif melewati 80% ditandai Prioritas.
        is_prio = idx == 1 or (cum_share / total_share) < 0.80
        cum_share += c.share_pct

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
                quote_agent_ids=list(c.affected_agent_ids or []),
                is_priority=is_prio,
                share_pct=c.share_pct,
                lift=c.lift,
                affected_agents_count=c.affected_agents_count,
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
