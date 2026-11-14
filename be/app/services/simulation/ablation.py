"""F6-D: Mode 1 (estimasi_cepat) & Mode 2 (terverifikasi_simulasi) untuk proyeksi perbaikan."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.schemas.simulation import PersonaSpecOut
from app.services.llm.router import get_llm_router
from app.services.simulation.catalog import ACTION_BY_ID, render_action_spec
from app.services.simulation.runner import AgentRunResult, SegmentInput, run_20_agent_swarm

logger = logging.getLogger(__name__)


@dataclass
class QuickEstimateResult:
    buyers_baseline: int
    tambahan_memesan: float
    buyers_projected_count: int
    total_agents: int
    low_accuracy_early_edit: bool
    accuracy_note: str | None
    stage_projected_counts: dict[str, int]
    total_cost_rp: int


@dataclass
class VerifiedSimulationResult:
    buyers_baseline: int
    buyers_verified_count: int
    total_agents: int
    edited_segment_ids: list[str]
    min_edited_segment_idx: int
    new_results: list[AgentRunResult]
    stage_verified_counts: dict[str, int]


def compute_continuation_rates_by_segment(
    *,
    segments: list[SegmentInput],
    baseline_results: list[AgentRunResult],
) -> dict[str, float]:
    """Hitung laju_lanjutan_dari_segmen(seg_id) murni dari run dasar.

    Laju lanjutan pada segmen S = (jumlah agen yang melewati S lalu memesan) /
    (jumlah agen yang melewati atau mencapai S di run dasar).
    """
    seg_idx = {s.id: i for i, s in enumerate(segments)}
    n_segs = len(segments)
    reached = [0] * n_segs
    passed_and_ordered = [0] * n_segs

    for r in baseline_results:
        stop_i = seg_idx.get(r.stopped_at_segment_id or "", n_segs) if r.stopped_at_segment_id else n_segs
        ordered = r.final_decision == "memesan"
        for i in range(min(n_segs, stop_i + 1)):
            reached[i] += 1
            if ordered:
                passed_and_ordered[i] += 1

    rates: dict[str, float] = {}
    for i, s in enumerate(segments):
        if reached[i] > 0:
            rates[s.id] = passed_and_ordered[i] / reached[i]
        else:
            rates[s.id] = 0.0
    return rates


def compute_quick_estimate_projection(
    *,
    segments: list[SegmentInput],
    baseline_results: list[AgentRunResult],
    checked_actions: list[tuple[str, list[str]]],  # [(action_id, target_segment_ids), ...]
) -> QuickEstimateResult:
    """Mode 1 (estimasi_cepat): hitung tambahan_memesan kontinu per agen tanpa ambang keras.

    Formula per agen tidak memesan:
        hambatan_total = sum(relevance_score untuk isyarat 'menghambat')
        teratasi       = sum(relevance_score * e untuk isyarat yang dicentang)
        p_berbalik     = min(1.0, teratasi / hambatan_total)
        tambahan       = p_berbalik * laju_lanjutan_dari_segmen(agen.stopped_at)
    """
    total_agents = max(1, len(baseline_results))
    buyers_base = sum(1 for r in baseline_results if r.final_decision == "memesan")

    # Peta efikasi maksimum per cue_code dari tindakan yang dicentang (validasi e dalam [0, 1])
    eff_by_cue: dict[str, float] = {}
    total_cost_rp = 0
    touched_seg_ids: set[str] = set()

    for action_id, target_segs in checked_actions:
        act = ACTION_BY_ID.get(action_id)
        if act is None:
            continue
        e_val = max(0.0, min(1.0, float(act.efficacy)))
        eff_by_cue[act.cue_code] = max(eff_by_cue.get(act.cue_code, 0.0), e_val)
        total_cost_rp += act.cost_rp
        touched_seg_ids.update(target_segs)

    cont_rates = compute_continuation_rates_by_segment(segments=segments, baseline_results=baseline_results)

    tambahan_memesan = 0.0
    extra_stop = 0.0
    extra_enter = 0.0

    for r in baseline_results:
        if r.final_decision == "memesan":
            continue
        inhibs = [
            a
            for a in r.attributions
            if a.get("direction") == "menghambat" and int(a.get("relevance_score", 0)) > 0
        ]
        hambatan_total = sum(int(a["relevance_score"]) for a in inhibs)
        if hambatan_total <= 0:
            continue

        teratasi = sum(
            int(a["relevance_score"]) * eff_by_cue.get(str(a["cue_code"]), 0.0)
            for a in inhibs
        )
        if teratasi <= 0:
            continue

        p_berbalik = min(1.0, teratasi / hambatan_total)
        laju = cont_rates.get(r.stopped_at_segment_id or "", 0.0)
        # Jika tidak ada agen yang sempat memesan di baseline (laju=0), tetap gunakan laju konservatif 0.0
        tambahan_memesan += p_berbalik * laju
        if r.final_decision == "lewat":
            extra_stop += p_berbalik
            extra_enter += p_berbalik * max(laju, 0.4)
        elif r.final_decision == "berhenti_lalu_pergi":
            extra_enter += p_berbalik

    # Deteksi apakah ada perbaikan pada segmen awal ('jalan' atau 25% awal video)
    seg_idx_map = {s.id: i for i, s in enumerate(segments)}
    early_threshold_idx = max(1, len(segments) // 4)
    low_accuracy = False
    for sid in touched_seg_ids:
        idx = seg_idx_map.get(sid)
        seg_obj = segments[idx] if idx is not None else None
        if (idx is not None and idx < early_threshold_idx) or (seg_obj and seg_obj.vantage == "jalan"):
            low_accuracy = True
            break

    accuracy_note = (
        "Estimasi cepat pada segmen awal (jalan) kurang akurat karena agen yang langsung lewat belum memiliki skor hambatan di segmen berikutnya. Jalankan Verifikasi Simulasi untuk hasil terukur."
        if low_accuracy
        else None
    )

    base_lewat = sum(1 for r in baseline_results if r.final_decision == "lewat")
    base_berhenti = sum(1 for r in baseline_results if r.final_decision == "berhenti_lalu_pergi")
    base_masuk = total_agents - base_lewat - base_berhenti

    proj_buyers = min(total_agents, buyers_base + round(tambahan_memesan))
    proj_masuk = min(total_agents, max(proj_buyers, base_masuk + round(extra_enter)))
    proj_stop = min(total_agents, max(proj_masuk, (total_agents - base_lewat) + round(extra_stop)))

    return QuickEstimateResult(
        buyers_baseline=buyers_base,
        tambahan_memesan=round(tambahan_memesan, 2),
        buyers_projected_count=proj_buyers,
        total_agents=total_agents,
        low_accuracy_early_edit=low_accuracy,
        accuracy_note=accuracy_note,
        stage_projected_counts={
            "melihat": total_agents,
            "tertarik": proj_stop,
            "masuk": proj_masuk,
            "memesan": proj_buyers,
        },
        total_cost_rp=total_cost_rp,
    )


def _rewrite_target_segments_from_actions(
    *,
    segments: list[SegmentInput],
    checked_actions: list[tuple[str, list[str], dict[str, str] | None]],
) -> tuple[list[SegmentInput], list[str], int]:
    """Render segmen 'sesudah' dari spec_template tindakan, opsional diperhalus LLM, + diff check."""
    updates_by_seg: dict[str, list[str]] = {}
    for action_id, seg_ids, slot_params in checked_actions:
        rendered = render_action_spec(action_id, slot_params)
        if not rendered:
            continue
        for sid in seg_ids:
            updates_by_seg.setdefault(sid, []).append(rendered)

    target_seg_ids = [s.id for s in segments if s.id in updates_by_seg]
    if not target_seg_ids:
        return list(segments), [], 0

    seg_idx_map = {s.id: i for i, s in enumerate(segments)}
    min_edited_idx = min(seg_idx_map[sid] for sid in target_seg_ids)

    # Render deterministik dari template berslot
    updated_segments: list[SegmentInput] = []
    for seg in segments:
        if seg.id not in updates_by_seg:
            updated_segments.append(seg)
            continue
        applied_specs = " ".join(updates_by_seg[seg.id])
        new_nar = f"{seg.narrative} [Perbaikan diterapkan: {applied_specs}]"
        updated_segments.append(
            SegmentInput(
                id=seg.id,
                vantage=seg.vantage,
                narrative=new_nar,
                not_visible="Sudah ditangani oleh perbaikan yang diterapkan pada titik ini.",
            )
        )

    # Opsional penghalusan kalimat pada segmen target saja (tanpa menambah klaim), lalu DIFF CHECK ketat
    router = get_llm_router()
    if not router.is_mock_mode and target_seg_ids:
        target_payload = [
            {"id": s.id, "narrative": s.narrative, "not_visible": s.not_visible}
            for s in updated_segments
            if s.id in updates_by_seg
        ]
        sys_p = (
            "Haluskan bahasa deskripsi segmen berikut agar alami dibaca calon pelanggan. "
            "DILARANG keras menambah klaim, angka, fasilitas, atau fakta baru di luar teks yang diberikan."
        )
        usr_p = f"Segmen target:\n{target_payload}\nKembalikan JSON: {{\"segments\": [{{\"id\": str, \"narrative\": str}}]}}"
        try:
            res = router.generate_json(system_prompt=sys_p, user_prompt=usr_p, temperature=0.1, max_output_tokens=1024)
            if res and isinstance(res.data, dict) and isinstance(res.data.get("segments"), list):
                polished_map = {
                    str(item["id"]): str(item["narrative"])
                    for item in res.data["segments"]
                    if isinstance(item, dict) and item.get("id") in updates_by_seg and item.get("narrative")
                }
                # Diff check: hanya segmen di target_seg_ids yang boleh diperbarui
                updated_segments = [
                    SegmentInput(
                        id=s.id,
                        vantage=s.vantage,
                        narrative=polished_map[s.id] if (s.id in updates_by_seg and s.id in polished_map) else s.narrative,
                        not_visible=s.not_visible,
                    )
                    for s in updated_segments
                ]
        except (ValueError, RuntimeError, KeyError, TypeError, OSError) as exc:
            logger.debug("Penghalusan narasi Mode 2 dilewati (%s); memakai hasil template langsung.", exc)

    # Assert diff check: non-target segments identik 100% dengan baseline
    for orig, mod in zip(segments, updated_segments, strict=True):
        if orig.id not in updates_by_seg:
            assert mod.narrative == orig.narrative and mod.not_visible == orig.not_visible

    return updated_segments, target_seg_ids, min_edited_idx


def run_verified_simulation_projection(
    *,
    personas: list[PersonaSpecOut],
    segments: list[SegmentInput],
    baseline_results: list[AgentRunResult],
    business_summary: str,
    checked_actions: list[tuple[str, list[str], dict[str, str] | None]],
    batch_size: int = 10,
    seed: int = 42,
) -> VerifiedSimulationResult:
    """Mode 2 (terverifikasi_simulasi): tulis ulang segmen target & jalankan ulang 20 PersonaSpec dari min_edited_idx."""
    buyers_base = sum(1 for r in baseline_results if r.final_decision == "memesan")

    rewritten_segs, edited_ids, min_idx = _rewrite_target_segments_from_actions(
        segments=segments,
        checked_actions=checked_actions,
    )
    if not edited_ids:
        total = len(baseline_results)
        base_lewat = sum(1 for r in baseline_results if r.final_decision == "lewat")
        base_berhenti = sum(1 for r in baseline_results if r.final_decision == "berhenti_lalu_pergi")
        return VerifiedSimulationResult(
            buyers_baseline=buyers_base,
            buyers_verified_count=buyers_base,
            total_agents=total,
            edited_segment_ids=[],
            min_edited_segment_idx=0,
            new_results=baseline_results,
            stage_verified_counts={
                "melihat": total,
                "tertarik": total - base_lewat,
                "masuk": total - base_lewat - base_berhenti,
                "memesan": buyers_base,
            },
        )

    prefix_traces = {r.agent_id: r.segment_traces for r in baseline_results}
    baseline_by_agent = {r.agent_id: r for r in baseline_results}

    new_results = run_20_agent_swarm(
        personas=personas,
        segments=rewritten_segs,
        business_summary=business_summary,
        batch_size=batch_size,
        seed=seed,
        prefix_traces_by_agent=prefix_traces,
        baseline_decisions_by_agent=baseline_by_agent,
        start_idx=min_idx,
    )

    total = len(new_results)
    ver_lewat = sum(1 for r in new_results if r.final_decision == "lewat")
    ver_berhenti = sum(1 for r in new_results if r.final_decision == "berhenti_lalu_pergi")
    ver_buyers = sum(1 for r in new_results if r.final_decision == "memesan")

    return VerifiedSimulationResult(
        buyers_baseline=buyers_base,
        buyers_verified_count=ver_buyers,
        total_agents=total,
        edited_segment_ids=edited_ids,
        min_edited_segment_idx=min_idx,
        new_results=new_results,
        stage_verified_counts={
            "melihat": total,
            "tertarik": total - ver_lewat,
            "masuk": total - ver_lewat - ver_berhenti,
            "memesan": ver_buyers,
        },
    )
