"""F5: Runner Simulasi 20 Agen Individual (2 batch @ 10 agen) dengan jejak per segmen & atribusi Katalog Isyarat."""

from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from typing import Any

from app.schemas.simulation import PersonaSpecOut
from app.services.llm.router import get_llm_router
from app.services.simulation.catalog import (
    HYPOTHESIS_BY_CODE,
    CueHypothesis,
    shuffled_catalog_for_agent,
)
from app.services.simulation.population import format_persona_behavior_rules

logger = logging.getLogger(__name__)

SCALE_ANCHORS_TEXT = (
    "Jangkar skala relevansi (0-3):\n"
    "- 0 = tidak berpengaruh sama sekali pada keputusanmu\n"
    "- 1 = sedikit berpengaruh (terasa minor)\n"
    "- 2 = cukup berpengaruh (membuat ragu/tertarik)\n"
    "- 3 = penentu utama keputusanmu"
)


@dataclass
class SegmentInput:
    id: str
    vantage: str
    narrative: str
    not_visible: str


@dataclass
class AgentRunResult:
    agent_id: int
    batch_id: int
    monologue: str
    final_decision: str
    stopped_at_segment_id: str | None
    deciding_factor: str
    factor_segment_ids: list[str]
    segment_traces: list[dict[str, str]]
    attributions: list[dict[str, Any]]
    primary_hypothesis_id: str | None
    other_reason: str | None = None


def _allowed_vantages_until(segments: list[SegmentInput], stopped_seg_id: str | None) -> set[str]:
    vantages: set[str] = set()
    for seg in segments:
        vantages.add(seg.vantage)
        if stopped_seg_id and seg.id == stopped_seg_id:
            break
    return vantages or {"jalan"}


def _infer_decision_from_stopped_vantage(stopped_seg: SegmentInput | None) -> str:
    if stopped_seg is None:
        return "memesan"
    if stopped_seg.vantage == "jalan":
        return "lewat"
    if stopped_seg.vantage == "pintu":
        return "berhenti_lalu_pergi"
    return "masuk_tanpa_memesan"


def _evaluate_batch_mock(
    *,
    personas: list[PersonaSpecOut],
    segments: list[SegmentInput],
    batch_id: int,
    seed: int,
    prefix_traces_by_agent: dict[int, list[dict[str, str]]] | None = None,
    start_idx: int = 0,
) -> list[AgentRunResult]:
    """Evaluator deterministik (0 token) untuk unit test & mode mock."""
    results: list[AgentRunResult] = []
    for persona in personas:
        rng = random.Random(seed * 97 + persona.agent_id)
        prefix = list((prefix_traces_by_agent or {}).get(persona.agent_id, []))
        traces: list[dict[str, str]] = list(prefix[:start_idx])

        stopped_seg: SegmentInput | None = None
        for idx in range(start_idx, len(segments)):
            seg = segments[idx]
            text_low = f"{seg.narrative} {seg.not_visible}".lower()
            budget_tight = persona.discrete_traits.get("budget_sensitivity") == "hemat"
            lazy = persona.discrete_traits.get("physical_laziness") == "malas"
            rushed = persona.discrete_traits.get("dining_context") == "sendiri_buru_buru"

            stop_prob = 0.04
            if "tidak terbaca" in text_low or "belum terlihat" in text_low or "tidak terlihat" in text_low:
                stop_prob += 0.14 if not rushed else 0.22
            if ("gelap" in text_low or "redup" in text_low or "tangga" in text_low) and lazy:
                stop_prob += 0.20
            if ("harga" in text_low or "menu" in text_low) and "belum" in text_low and budget_tight:
                stop_prob += 0.24
            if "kasir" in text_low and ("bingung" in text_low or "belum terbaca" in text_low):
                stop_prob += 0.16
            if "terbaca jelas" in text_low or "terang" in text_low or "langsung dikenali" in text_low:
                stop_prob = max(0.02, stop_prob - 0.16)

            if rng.random() < stop_prob:
                stopped_seg = seg
                mono = f"[{seg.id}] Melihat kondisi di sini ({seg.not_visible or seg.narrative[:60]}), aku memutuskan berhenti dan tidak lanjut."
                traces.append({"segment_id": seg.id, "monologue": mono, "action": "berhenti"})
                break
            else:
                mono = f"[{seg.id}] Melewati {seg.vantage}; masih wajar untuk kuikuti."
                traces.append({"segment_id": seg.id, "monologue": mono, "action": "lanjut"})

        decision = _infer_decision_from_stopped_vantage(stopped_seg)
        full_monologue = " ".join(t["monologue"] for t in traces)
        allowed_v = _allowed_vantages_until(segments, stopped_seg.id if stopped_seg else None)
        cat = shuffled_catalog_for_agent(agent_id=persona.agent_id, allowed_vantages=allowed_v, seed=seed)

        attributions: list[dict[str, Any]] = []
        primary_id: str | None = None

        if decision != "memesan":
            # Pilih 1-3 isyarat 'menghambat' yang relevan berdasarkan teks segmen yang dilewati
            passed_text = " ".join(
                f"{s.narrative} {s.not_visible}" for s in segments[: len(traces)]
            ).lower()
            scored_h: list[tuple[CueHypothesis, int, str]] = []
            for h in cat:
                if h.cue_code == "H0":
                    continue
                rel = 0
                if h.cue_code == "H1" and ("papan nama" in passed_text or "tidak terlihat" in passed_text):
                    rel = 2
                elif h.cue_code == "H2" and ("jam buka" in passed_text or "jam operasional" in passed_text or "status buka" in passed_text):
                    rel = 3 if rushed else 2
                elif h.cue_code == "H3" and ("jenis" in passed_text or "hidangan" in passed_text or "belum terlihat" in passed_text):
                    rel = 2
                elif h.cue_code == "H4" and ("parkir" in passed_text):
                    rel = 2 if persona.segment == "pengendara_lewat" else 1
                elif h.cue_code == "H5" and ("tangga" in passed_text or "pintu" in passed_text):
                    rel = 3 if lazy else 1
                elif h.cue_code == "H6" and ("redup" in passed_text or "gelap" in passed_text or "pencahayaan" in passed_text):
                    rel = 2
                elif h.cue_code == "H8" and ("harga" in passed_text or "menu" in passed_text):
                    rel = 3 if budget_tight else 2
                elif h.cue_code == "H10" and ("kasir" in passed_text or "pesan" in passed_text):
                    rel = 2
                if rel > 0:
                    quote = traces[-1]["monologue"][:90] if traces else full_monologue[:90]
                    scored_h.append((h, rel, quote))

            if not scored_h:
                non_h0 = [h for h in cat if h.cue_code != "H0"]
                picked = non_h0[0] if non_h0 else cat[0]
                scored_h.append((picked, 2, traces[-1]["monologue"][:90] if traces else ""))

            scored_h.sort(key=lambda x: x[1], reverse=True)
            for h, rel, quote in scored_h[:3]:
                attributions.append(
                    {
                        "cue_code": h.cue_code,
                        "direction": "menghambat",
                        "relevance_score": rel,
                        "evidence": quote,
                    }
                )
            primary_id = attributions[0]["cue_code"]
            deciding_factor = f"Berhenti di {stopped_seg.vantage if stopped_seg else 'jalan'}: {HYPOTHESIS_BY_CODE[primary_id].title}."
        else:
            # Agen memesan: bisa memberi isyarat 'mendorong' atau 'netral'
            non_h0 = [h for h in cat if h.cue_code != "H0"]
            if non_h0:
                attributions.append(
                    {
                        "cue_code": non_h0[0].cue_code,
                        "direction": "mendorong",
                        "relevance_score": 2,
                        "evidence": traces[-1]["monologue"][:90] if traces else "",
                    }
                )
            deciding_factor = "Informasi cukup jelas dan sesuai anggaran, memutuskan memesan."

        results.append(
            AgentRunResult(
                agent_id=persona.agent_id,
                batch_id=batch_id,
                monologue=full_monologue,
                final_decision=decision,
                stopped_at_segment_id=stopped_seg.id if stopped_seg else None,
                deciding_factor=deciding_factor,
                factor_segment_ids=[stopped_seg.id] if stopped_seg else [segments[-1].id] if segments else [],
                segment_traces=traces,
                attributions=attributions,
                primary_hypothesis_id=primary_id,
            )
        )
    return results


def _evaluate_batch_llm(
    *,
    personas: list[PersonaSpecOut],
    segments: list[SegmentInput],
    business_summary: str,
    batch_id: int,
    seed: int,
    prefix_traces_by_agent: dict[int, list[dict[str, str]]] | None = None,
    start_idx: int = 0,
) -> list[AgentRunResult] | None:
    """Jalankan 1 batch (maks 10 agen) lewat Gemini (atau fallback OpenAI) dengan 2 langkah terstruktur."""
    router = get_llm_router()
    if router.is_mock_mode:
        return None

    target_segments = segments[start_idx:]
    seg_lines = [
        f"- {s.id} (vantage: {s.vantage}): {s.narrative} | TIDAK TERLIHAT: {s.not_visible}"
        for s in target_segments
    ]
    persona_blocks = []
    for p in personas:
        prefix = (prefix_traces_by_agent or {}).get(p.agent_id, [])
        prefix_txt = " ".join(t["monologue"] for t in prefix[:start_idx]) if prefix else ""
        persona_blocks.append(
            f"Agent #{p.agent_id} ({p.segment}): {p.context_around}. Mood: {p.daily_mood}. "
            f"Aturan: {format_persona_behavior_rules(p)}"
            + (f"\n  Jejak segmen sebelumnya yang sudah dilewati: {prefix_txt}" if prefix_txt else "")
        )

    # Pesan 1: Keputusan & jejak per segmen TANPA katalog isyarat
    sys1 = (
        "Kamu mensimulasikan calon pelanggan nyata yang melewati tempat makan. "
        "Setiap agen membaca segmen berurutan dan hanya boleh memakai informasi dari segmen yang sudah dilewati. "
        "Jika agen memilih 'berhenti', ia langsung selesai di segmen itu. Kembalikan JSON valid."
    )
    usr1 = (
        f"Profil singkat toko (hanya yang terlihat umum): {business_summary}\n\n"
        f"Urutan segmen transkrip:\n" + "\n".join(seg_lines) + "\n\n"
        f"Daftar {len(personas)} agen:\n" + "\n".join(persona_blocks) + "\n\n"
        "Untuk setiap agen kembalikan JSON:\n"
        '{"results": [{"agent_id": int, "segment_traces": [{"segment_id": str, "monologue": str, "action": "lanjut"|"berhenti"}], '
        '"final_decision": "lewat"|"berhenti_lalu_pergi"|"masuk_tanpa_memesan"|"memesan", '
        '"stopped_at_segment_id": str|null, "deciding_factor": str, "factor_segment_ids": [str]}]}'
    )

    res1 = router.generate_json(system_prompt=sys1, user_prompt=usr1, temperature=0.2, max_output_tokens=4096)
    if not res1 or not isinstance(res1.data, dict) or not isinstance(res1.data.get("results"), list):
        return None

    step1_map: dict[int, dict[str, Any]] = {
        int(item["agent_id"]): item for item in res1.data["results"] if isinstance(item, dict) and "agent_id" in item
    }

    # Pesan 2: Penilaian relevance_score & direction terhadap Katalog Isyarat (urutan diacak per agen!)
    eval_prompts = []
    for p in personas:
        s1 = step1_map.get(p.agent_id) or {}
        stopped_id = s1.get("stopped_at_segment_id")
        allowed_v = _allowed_vantages_until(segments, stopped_id)
        shuffled = shuffled_catalog_for_agent(agent_id=p.agent_id, allowed_vantages=allowed_v, seed=seed)
        cat_str = ", ".join(f"{h.cue_code} ({h.title})" for h in shuffled)
        traces_list = s1.get("segment_traces") or []
        mono = " ".join(str(t.get("monologue", "")) for t in traces_list if isinstance(t, dict))
        eval_prompts.append(
            f"Agent #{p.agent_id} | final_decision={s1.get('final_decision')} | monolog=\"{mono[:400]}\"\n"
            f"  Katalog isyarat (urutan khusus agen ini): [{cat_str}]"
        )

    sys2 = (
        "Evaluasi faktor penyebab keputusan setiap agen berdasarkan monolognya terhadap katalog isyarat. "
        "JANGAN ubah final_decision agen. Wajib sertakan arah ('menghambat'|'mendorong'|'netral') dan kutipan dari monolog.\n"
        + SCALE_ANCHORS_TEXT
    )
    usr2 = (
        "\n".join(eval_prompts)
        + '\n\nKembalikan JSON:\n{"results": [{"agent_id": int, "attributions": [{"cue_code": str, "direction": "menghambat"|"mendorong"|"netral", "relevance_score": 0|1|2|3, "evidence": str}], "primary": str|null}]}'
    )

    res2 = router.generate_json(system_prompt=sys2, user_prompt=usr2, temperature=0.1, max_output_tokens=3072)
    step2_map: dict[int, dict[str, Any]] = {}
    if res2 and isinstance(res2.data, dict) and isinstance(res2.data.get("results"), list):
        step2_map = {
            int(item["agent_id"]): item for item in res2.data["results"] if isinstance(item, dict) and "agent_id" in item
        }

    final_results: list[AgentRunResult] = []
    for p in personas:
        s1 = step1_map.get(p.agent_id)
        if not s1:
            # Fallback aman untuk agen yang terlewat di output batch
            mock_one = _evaluate_batch_mock(
                personas=[p],
                segments=segments,
                batch_id=batch_id,
                seed=seed,
                prefix_traces_by_agent=prefix_traces_by_agent,
                start_idx=start_idx,
            )[0]
            final_results.append(mock_one)
            continue

        prefix = list((prefix_traces_by_agent or {}).get(p.agent_id, []))[:start_idx]
        new_traces = [
            {
                "segment_id": str(t.get("segment_id", "")),
                "monologue": str(t.get("monologue", "")),
                "action": "berhenti" if t.get("action") == "berhenti" else "lanjut",
            }
            for t in (s1.get("segment_traces") or [])
            if isinstance(t, dict)
        ]
        all_traces = prefix + new_traces
        full_mono = " ".join(t["monologue"] for t in all_traces)
        stopped_id = s1.get("stopped_at_segment_id")
        decision = str(s1.get("final_decision") or "lewat")
        if decision not in ("lewat", "berhenti_lalu_pergi", "masuk_tanpa_memesan", "memesan"):
            decision = "lewat"

        allowed_v = _allowed_vantages_until(segments, stopped_id)
        valid_cues = {
            h.cue_code
            for h in shuffled_catalog_for_agent(agent_id=p.agent_id, allowed_vantages=allowed_v, seed=seed)
        }

        s2 = step2_map.get(p.agent_id) or {}
        cleaned_attrs: list[dict[str, Any]] = []
        for a in s2.get("attributions") or []:
            if not isinstance(a, dict):
                continue
            code = str(a.get("cue_code") or "")
            if code not in valid_cues:
                continue
            rel = int(max(0, min(3, int(a.get("relevance_score", 0)))))
            if rel <= 0:
                continue
            direction = str(a.get("direction") or "menghambat")
            if direction not in ("menghambat", "mendorong", "netral"):
                direction = "menghambat"
            cleaned_attrs.append(
                {
                    "cue_code": code,
                    "direction": direction,
                    "relevance_score": rel,
                    "evidence": str(a.get("evidence") or "")[:160],
                }
            )

        primary = s2.get("primary")
        if primary not in valid_cues:
            inhibitors = [a for a in cleaned_attrs if a["direction"] == "menghambat"]
            primary = inhibitors[0]["cue_code"] if inhibitors else (cleaned_attrs[0]["cue_code"] if cleaned_attrs else None)

        final_results.append(
            AgentRunResult(
                agent_id=p.agent_id,
                batch_id=batch_id,
                monologue=full_mono,
                final_decision=decision,
                stopped_at_segment_id=stopped_id,
                deciding_factor=str(s1.get("deciding_factor") or ""),
                factor_segment_ids=[str(x) for x in (s1.get("factor_segment_ids") or [])],
                segment_traces=all_traces,
                attributions=cleaned_attrs,
                primary_hypothesis_id=primary if decision != "memesan" else None,
                other_reason=str(s2.get("other_reason")) if s2.get("other_reason") else None,
            )
        )
    return final_results


def run_20_agent_swarm(
    *,
    personas: list[PersonaSpecOut],
    segments: list[SegmentInput],
    business_summary: str,
    batch_size: int = 10,
    seed: int = 42,
    prefix_traces_by_agent: dict[int, list[dict[str, str]]] | None = None,
    baseline_decisions_by_agent: dict[int, AgentRunResult] | None = None,
    start_idx: int = 0,
) -> list[AgentRunResult]:
    """Jalankan tepat 20 agen (2 batch @ 10 agen). Mendukung structural prefix reuse dari ``start_idx``."""
    seg_idx_map = {s.id: i for i, s in enumerate(segments)}

    reused_results: list[AgentRunResult] = []
    agents_to_run: list[PersonaSpecOut] = []

    for p in personas:
        if start_idx > 0 and baseline_decisions_by_agent and p.agent_id in baseline_decisions_by_agent:
            prev = baseline_decisions_by_agent[p.agent_id]
            stopped_idx = seg_idx_map.get(prev.stopped_at_segment_id or "", len(segments))
            # Jika agen sudah berhenti SEBELUM segmen terkecil yang diedit, pakai ulang hasil baseline tanpa panggil LLM!
            if prev.stopped_at_segment_id is not None and stopped_idx < start_idx:
                reused_results.append(prev)
                continue
        agents_to_run.append(p)

    new_results: list[AgentRunResult] = []
    for b_idx in range(0, len(agents_to_run), max(1, batch_size)):
        batch = agents_to_run[b_idx : b_idx + batch_size]
        batch_num = b_idx // max(1, batch_size)
        llm_out = _evaluate_batch_llm(
            personas=batch,
            segments=segments,
            business_summary=business_summary,
            batch_id=batch_num,
            seed=seed,
            prefix_traces_by_agent=prefix_traces_by_agent,
            start_idx=start_idx,
        )
        if llm_out is not None:
            new_results.extend(llm_out)
        else:
            new_results.extend(
                _evaluate_batch_mock(
                    personas=batch,
                    segments=segments,
                    batch_id=batch_num,
                    seed=seed,
                    prefix_traces_by_agent=prefix_traces_by_agent,
                    start_idx=start_idx,
                )
            )

    combined = reused_results + new_results
    combined.sort(key=lambda r: r.agent_id)
    return combined
