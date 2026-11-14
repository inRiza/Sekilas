"""F6-D: Mode 1 (estimasi_cepat) & Mode 2 (terverifikasi_simulasi) untuk proyeksi perbaikan."""

from __future__ import annotations

import logging
import re
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


_ZERO_BUYER_VANTAGE_PRIOR: dict[str, float] = {
    "jalan": 0.15,
    "pintu": 0.25,
    "dalam": 0.45,
}

_CUE_NOT_VISIBLE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "H1": ("papan nama", "plang", "nama usaha", "nama toko", "identitas toko", "penanda jalan"),
    "H2": ("jam buka", "jam operasional", "status buka", "tutup"),
    "H3": ("jenis makanan", "jenis hidangan", "jenis minuman", "jualan apa", "produk yang dijual"),
    "H4": ("parkir", "berhenti", "bahu jalan"),
    "H5": ("tangga", "pintu", "lorong", "jalur masuk", "akses masuk"),
    "H6": ("redup", "gelap", "pencahayaan", "kebersihan", "kotor", "berantakan", "suram"),
    "H7": ("sepi", "kosong", "penuh", "sesak"),
    "H8": ("daftar menu", "daftar harga", "papan menu", "harga", "menu"),
    "H9": ("mahal", "anggaran", "paket hemat"),
    "H10": ("kasir", "antre", "titik pesan"),
    "H11": ("qris", "non-tunai", "debit", "metode bayar"),
    "H12": ("bungkus", "takeaway", "waktu saji", "estimasi", "waktu tunggu"),
    "H13": ("kursi", "tempat duduk", "area tunggu", "meja makan"),
    "H14": ("huruf kecil", "terlalu kecil", "pudar", "silau", "kusam", "pantulan"),
}


def _prune_resolved_not_visible(orig_not_visible: str, resolved_cues: set[str]) -> str:
    """Hapus hanya klausa masalah yang isyaratnya ditangani; pertahankan isu lain pada segmen yang sama."""
    raw = orig_not_visible.strip()
    if not raw or not resolved_cues:
        return orig_not_visible

    clauses = [c.strip() for c in re.split(r"(?<=[.;!])\s+|\s*;\s*|\n+", raw) if c.strip()]
    if len(clauses) == 1 and "," in clauses[0]:
        clauses = [c.strip() for c in clauses[0].split(",") if c.strip()]

    remaining: list[str] = []
    for clause in clauses:
        low = clause.lower()
        matched_cues = {
            cue
            for cue, kws in _CUE_NOT_VISIBLE_KEYWORDS.items()
            if any(kw in low for kw in kws)
        }
        if matched_cues and matched_cues.issubset(resolved_cues):
            continue
        remaining.append(clause)

    return " ".join(remaining).strip()


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
    seg_vantage_map = {s.id: s.vantage for s in segments}

    tambahan_memesan = 0.0
    extra_stop = 0.0
    extra_enter = 0.0
    used_zero_buyer_prior = False

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
        if laju <= 0.0 and buyers_base == 0:
            # Saat baseline 0 pembeli, laju empiris mengunci estimasi di +0; pakai prior konservatif per vantage
            stop_vantage = seg_vantage_map.get(r.stopped_at_segment_id or "", "jalan")
            laju = _ZERO_BUYER_VANTAGE_PRIOR.get(stop_vantage, 0.2)
            used_zero_buyer_prior = True
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

    note_parts: list[str] = []
    if low_accuracy:
        note_parts.append(
            "Estimasi cepat pada segmen awal (jalan) kurang akurat karena agen yang langsung lewat belum memiliki skor hambatan di segmen berikutnya. Jalankan Verifikasi Simulasi untuk hasil terukur."
        )
    if used_zero_buyer_prior and tambahan_memesan > 0:
        note_parts.append(
            "Baseline 0 pembeli memakai asumsi kelanjutan konservatif (15%–45% sesuai titik berhenti) sebagai perkiraan awal sebelum Verifikasi Simulasi."
        )
    accuracy_note = " ".join(note_parts) if note_parts else None

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
    updates_by_seg: dict[str, list[tuple[str, str]]] = {}
    for action_id, seg_ids, slot_params in checked_actions:
        act = ACTION_BY_ID.get(action_id)
        rendered = render_action_spec(action_id, slot_params)
        if not rendered or act is None:
            continue
        for sid in seg_ids:
            updates_by_seg.setdefault(sid, []).append((act.cue_code, rendered))

    target_seg_ids = [s.id for s in segments if s.id in updates_by_seg]
    if not target_seg_ids:
        return list(segments), [], 0

    seg_idx_map = {s.id: i for i, s in enumerate(segments)}
    min_edited_idx = min(seg_idx_map[sid] for sid in target_seg_ids)

    # Render deterministik dari template berslot & pangkas hanya klausa not_visible yang ditangani
    updated_segments: list[SegmentInput] = []
    for seg in segments:
        if seg.id not in updates_by_seg:
            updated_segments.append(seg)
            continue
        seg_updates = updates_by_seg[seg.id]
        applied_specs = " ".join(spec for _, spec in seg_updates)
        resolved_cues = {cue_code for cue_code, _ in seg_updates}
        base_nar = seg.narrative.rstrip()
        new_nar = f"{base_nar} (Setelah perbaikan: {applied_specs})"
        new_not_vis = _prune_resolved_not_visible(seg.not_visible, resolved_cues)
        updated_segments.append(
            SegmentInput(
                id=seg.id,
                vantage=seg.vantage,
                narrative=new_nar,
                not_visible=new_not_vis,
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
