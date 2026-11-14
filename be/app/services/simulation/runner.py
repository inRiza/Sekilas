"""F5: Runner Simulasi 20 Agen Individual (2 batch @ 10 agen) dengan jejak per segmen & atribusi Katalog Isyarat."""

from __future__ import annotations

import logging
import random
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.schemas.simulation import PersonaSpecOut
from app.services.llm.router import LLMUnavailableError, get_llm_router
from app.services.simulation.catalog import (
    HYPOTHESIS_BY_CODE,
    CueHypothesis,
    shuffled_catalog_for_agent,
)

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


def _parse_agent_id(raw: Any) -> int | None:
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        return raw
    token = str(raw or "").strip().lstrip("#")
    return int(token) if token.isdigit() else None


def _compact_persona_line(persona: PersonaSpecOut, prefix_txt: str = "") -> str:
    """Format profil persona seringkas mungkin agar hemat token tanpa menghilangkan kendala nyata."""
    t = persona.discrete_traits
    f = persona.concrete_facts
    budget_val = f.get("meal_budget")
    budget_str = f"Rp{int(budget_val):,}".replace(",", ".") if isinstance(budget_val, (int, float)) else "-"
    time_val = f.get("break_time_minutes")
    time_str = f"{int(time_val)}m" if isinstance(time_val, (int, float)) else "-"
    line = (
        f"#{persona.agent_id} ({persona.segment}): "
        f"bujet={budget_str}[{t.get('budget_sensitivity', '-')}], "
        f"waktu={time_str}, "
        f"malas={t.get('physical_laziness', '-')}, "
        f"gaya={t.get('dining_context', '-')}, "
        f"akrab={t.get('area_familiarity', '-')}, "
        f"niat={t.get('visit_intent', '-')} | "
        f"situasi={persona.context_around} | mood={persona.daily_mood}"
    )
    if prefix_txt:
        line += f" | jejak_sebelumnya={prefix_txt}"
    return line


def _resolve_seg_id(
    raw: Any,
    *,
    alias_to_id: dict[str, str],
    valid_raw_ids: set[str],
) -> str | None:
    token = str(raw or "").strip()
    if not token:
        return None
    upper = token.upper()
    if upper in alias_to_id:
        return alias_to_id[upper]
    return token if token in valid_raw_ids else None


def _normalize_step1_agent(
    *,
    s1: dict[str, Any],
    prefix: list[dict[str, str]],
    target_segments: list[SegmentInput],
    alias_to_id: dict[str, str],
    valid_raw_ids: set[str],
    seg_by_id: dict[str, SegmentInput],
) -> dict[str, Any]:
    """Normalisasi output Step 1: petakan alias S1..Sk ke ID segmen asli dan pastikan early-stop konsisten."""
    target_id_set = {s.id for s in target_segments}
    new_traces: list[dict[str, str]] = []
    for raw_t in s1.get("segment_traces") or []:
        if not isinstance(raw_t, dict):
            continue
        seg_id = _resolve_seg_id(raw_t.get("segment_id"), alias_to_id=alias_to_id, valid_raw_ids=valid_raw_ids)
        if not seg_id or seg_id not in target_id_set:
            continue
        action = "berhenti" if str(raw_t.get("action") or "").strip().lower() == "berhenti" else "lanjut"
        new_traces.append(
            {
                "segment_id": seg_id,
                "monologue": str(raw_t.get("monologue") or "").strip(),
                "action": action,
            }
        )
        if action == "berhenti":
            break

    all_traces = prefix + new_traces
    raw_stopped = _resolve_seg_id(
        s1.get("stopped_at_segment_id"), alias_to_id=alias_to_id, valid_raw_ids=valid_raw_ids
    )
    trace_stopped = next((t["segment_id"] for t in all_traces if t["action"] == "berhenti"), None)

    decision = str(s1.get("final_decision") or "").strip()
    if decision not in ("lewat", "berhenti_lalu_pergi", "masuk_tanpa_memesan", "memesan"):
        decision = _infer_decision_from_stopped_vantage(seg_by_id.get(trace_stopped or raw_stopped or ""))

    if decision == "memesan":
        stopped_id: str | None = None
    else:
        stopped_id = (
            trace_stopped
            or raw_stopped
            or (all_traces[-1]["segment_id"] if all_traces else (target_segments[-1].id if target_segments else None))
        )
        # Jika LLM menandai stopped_at_segment_id tetapi lupa set action='berhenti', selaraskan trace-nya
        if stopped_id and trace_stopped is None:
            aligned: list[dict[str, str]] = []
            for t in all_traces:
                item = dict(t)
                if item["segment_id"] == stopped_id:
                    item["action"] = "berhenti"
                    aligned.append(item)
                    break
                aligned.append(item)
            all_traces = aligned

    factor_seg_ids: list[str] = []
    for raw_fid in s1.get("factor_segment_ids") or []:
        fid = _resolve_seg_id(raw_fid, alias_to_id=alias_to_id, valid_raw_ids=valid_raw_ids)
        if fid and fid not in factor_seg_ids:
            factor_seg_ids.append(fid)
    if decision != "memesan" and not factor_seg_ids and stopped_id:
        factor_seg_ids = [stopped_id]

    full_mono = " ".join(t["monologue"] for t in all_traces if t["monologue"])
    return {
        "traces": all_traces,
        "full_mono": full_mono,
        "stopped_id": stopped_id,
        "decision": decision,
        "deciding_factor": str(s1.get("deciding_factor") or "").strip(),
        "factor_segment_ids": factor_seg_ids,
    }


def _build_step1_user_prompt(
    *,
    business_summary: str,
    seg_lines: list[str],
    personas: list[PersonaSpecOut],
    prefix_by_agent: dict[int, str],
) -> str:
    persona_lines = [
        _compact_persona_line(p, prefix_by_agent.get(p.agent_id, ""))
        for p in personas
    ]
    return (
        f"Profil toko: {business_summary}\n\n"
        "Urutan segmen transkrip:\n" + "\n".join(seg_lines) + "\n\n"
        f"Daftar {len(personas)} agen:\n" + "\n".join(persona_lines) + "\n\n"
        "Untuk setiap agen kembalikan JSON (monologue maks 15 kata/segmen, pakai ID pendek S1..Sk):\n"
        '{"results": [{"agent_id": int, "segment_traces": [{"segment_id": str, "monologue": str, "action": "lanjut"|"berhenti"}], '
        '"final_decision": "lewat"|"berhenti_lalu_pergi"|"masuk_tanpa_memesan"|"memesan", '
        '"stopped_at_segment_id": str|null, "deciding_factor": str, "factor_segment_ids": [str]}]}'
    )


def _build_step2_user_prompt(
    *,
    personas: list[PersonaSpecOut],
    parsed_step1: dict[int, dict[str, Any]],
    segments: list[SegmentInput],
    seed: int,
) -> str:
    eval_prompts: list[str] = []
    for p in personas:
        parsed = parsed_step1[p.agent_id]
        allowed_v = _allowed_vantages_until(segments, parsed["stopped_id"])
        shuffled = shuffled_catalog_for_agent(agent_id=p.agent_id, allowed_vantages=allowed_v, seed=seed)
        cat_str = ", ".join(f"{h.cue_code}:{h.title}" for h in shuffled)
        eval_prompts.append(
            f"#{p.agent_id} | decision={parsed['decision']} | mono=\"{parsed['full_mono'][:500]}\"\n"
            f"  Katalog: [{cat_str}]"
        )
    return (
        "\n".join(eval_prompts)
        + '\n\nKembalikan JSON (isi hanya isyarat relevan score 1-3, maks 4 isyarat/agen):\n'
        '{"results": [{"agent_id": int, "attributions": [{"cue_code": str, "direction": "menghambat"|"mendorong"|"netral", '
        '"relevance_score": 1|2|3, "evidence": str}], "primary": str|null, "other_reason": str|null}]}'
    )


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
    """Jalankan 1 batch (maks 10 agen) lewat OpenAI dengan alias segmen kompak dan validasi ketat."""
    router = get_llm_router()
    if router.is_mock_mode:
        return None

    model_name = get_settings().openai_model
    id_to_alias = {s.id: f"S{i + 1}" for i, s in enumerate(segments)}
    alias_to_id = {f"S{i + 1}": s.id for i, s in enumerate(segments)}
    valid_raw_ids = {s.id for s in segments}
    seg_by_id = {s.id: s for s in segments}

    target_segments = segments[start_idx:]
    seg_lines = [
        f"- {id_to_alias[s.id]} ({s.vantage}): {s.narrative} | TIDAK TERLIHAT: {s.not_visible}"
        for s in target_segments
    ]
    prefix_by_agent: dict[int, str] = {}
    for p in personas:
        prefix = (prefix_traces_by_agent or {}).get(p.agent_id, [])
        if prefix and start_idx > 0:
            prefix_by_agent[p.agent_id] = " ".join(t["monologue"] for t in prefix[:start_idx])

    # Pesan 1: Keputusan & jejak per segmen TANPA katalog isyarat (anti-priming)
    sys1 = (
        "Kamu mensimulasikan calon pelanggan nyata yang melewati tempat makan.\n"
        "Aturan simulasi ketat:\n"
        "1. Setiap agen membaca segmen berurutan (S1, S2, ...) dan HANYA boleh memakai info dari segmen yang sudah dilewati.\n"
        "2. Sesuaikan reaksi dengan profil tiap agen: agen sensitif bujet ragu bila harga tidak terlihat atau kemahalan; "
        "agen malas fisik enggan naik tangga/akses gelap/sempit; agen buru-buru mudah batal bila antre/menu tidak langsung terbaca; "
        "agen baru di area butuh penanda jelas.\n"
        "3. Begitu agen memilih 'berhenti' pada satu segmen, HENTIKAN segment_traces tepat di segmen itu.\n"
        "4. Buat monolog unik sesuai bujet, waktu, gaya makan, dan mood masing-masing agen (hindari kalimat seragam).\n"
        "5. Kembalikan HANYA JSON valid."
    )
    usr1 = _build_step1_user_prompt(
        business_summary=business_summary,
        seg_lines=seg_lines,
        personas=personas,
        prefix_by_agent=prefix_by_agent,
    )

    res1 = router.generate_json(system_prompt=sys1, user_prompt=usr1, temperature=0.3, max_output_tokens=6144)
    if not res1 or not isinstance(res1.data, dict) or not isinstance(res1.data.get("results"), list):
        raise LLMUnavailableError(
            f"Model OpenAI ({model_name}) tidak mengembalikan daftar keputusan agen yang valid.",
            status_code=502,
        )

    step1_map: dict[int, dict[str, Any]] = {}
    for item in res1.data["results"]:
        if not isinstance(item, dict):
            continue
        aid = _parse_agent_id(item.get("agent_id"))
        if aid is not None:
            step1_map[aid] = item

    # Jika ada agen yang terlewat oleh model, retry 1x khusus agen yang hilang (jangan pernah mock diam-diam)
    missing_personas = [p for p in personas if p.agent_id not in step1_map]
    if missing_personas:
        retry_usr1 = _build_step1_user_prompt(
            business_summary=business_summary,
            seg_lines=seg_lines,
            personas=missing_personas,
            prefix_by_agent=prefix_by_agent,
        )
        retry_res1 = router.generate_json(
            system_prompt=sys1,
            user_prompt=retry_usr1,
            temperature=0.3,
            max_output_tokens=max(2048, len(missing_personas) * 700),
        )
        if retry_res1 and isinstance(retry_res1.data, dict) and isinstance(retry_res1.data.get("results"), list):
            for item in retry_res1.data["results"]:
                if not isinstance(item, dict):
                    continue
                aid = _parse_agent_id(item.get("agent_id"))
                if aid is not None:
                    step1_map[aid] = item

        still_missing = [p.agent_id for p in personas if p.agent_id not in step1_map]
        if still_missing:
            raise LLMUnavailableError(
                f"Model OpenAI ({model_name}) melewatkan keputusan untuk agen {still_missing}. Silakan coba lagi.",
                status_code=502,
            )

    parsed_step1: dict[int, dict[str, Any]] = {}
    for p in personas:
        prefix = list((prefix_traces_by_agent or {}).get(p.agent_id, []))[:start_idx]
        parsed_step1[p.agent_id] = _normalize_step1_agent(
            s1=step1_map[p.agent_id],
            prefix=prefix,
            target_segments=target_segments,
            alias_to_id=alias_to_id,
            valid_raw_ids=valid_raw_ids,
            seg_by_id=seg_by_id,
        )

    # Pesan 2: Atribusi faktor penyebab terhadap Katalog Isyarat teracak per agen
    sys2 = (
        "Evaluasi faktor penyebab keputusan tiap agen berdasarkan monolog terhadap Katalog Isyarat agen tersebut.\n"
        "JANGAN ubah final_decision agen. Gunakan cue_code HANYA dari Katalog milik agen itu, "
        "sertakan arah ('menghambat'|'mendorong'|'netral') dan kutipan singkat dari monolog.\n"
        "Jika decision!='memesan', wajib minimal 1 isyarat 'menghambat' berskor >= 1.\n"
        + SCALE_ANCHORS_TEXT
    )
    usr2 = _build_step2_user_prompt(
        personas=personas,
        parsed_step1=parsed_step1,
        segments=segments,
        seed=seed,
    )
    res2 = router.generate_json(system_prompt=sys2, user_prompt=usr2, temperature=0.1, max_output_tokens=4096)
    if not res2 or not isinstance(res2.data, dict) or not isinstance(res2.data.get("results"), list):
        raise LLMUnavailableError(
            f"Model OpenAI ({model_name}) gagal menyusun atribusi Katalog Isyarat agen.",
            status_code=502,
        )

    step2_map: dict[int, dict[str, Any]] = {}
    for item in res2.data["results"]:
        if not isinstance(item, dict):
            continue
        aid = _parse_agent_id(item.get("agent_id"))
        if aid is not None:
            step2_map[aid] = item

    missing_s2 = [
        p for p in personas if p.agent_id not in step2_map and parsed_step1[p.agent_id]["decision"] != "memesan"
    ]
    if missing_s2:
        retry_usr2 = _build_step2_user_prompt(
            personas=missing_s2,
            parsed_step1=parsed_step1,
            segments=segments,
            seed=seed,
        )
        retry_res2 = router.generate_json(
            system_prompt=sys2,
            user_prompt=retry_usr2,
            temperature=0.1,
            max_output_tokens=max(1536, len(missing_s2) * 500),
        )
        if retry_res2 and isinstance(retry_res2.data, dict) and isinstance(retry_res2.data.get("results"), list):
            for item in retry_res2.data["results"]:
                if not isinstance(item, dict):
                    continue
                aid = _parse_agent_id(item.get("agent_id"))
                if aid is not None:
                    step2_map[aid] = item

    final_results: list[AgentRunResult] = []
    for p in personas:
        parsed = parsed_step1[p.agent_id]
        decision = parsed["decision"]
        stopped_id = parsed["stopped_id"]

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
            code = str(a.get("cue_code") or "").strip()
            if code not in valid_cues:
                continue
            try:
                rel = int(max(0, min(3, int(float(a.get("relevance_score", 0))))))
            except (TypeError, ValueError):
                continue
            if rel <= 0:
                continue
            direction = str(a.get("direction") or "menghambat").strip()
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
            primary = (
                inhibitors[0]["cue_code"]
                if inhibitors
                else (cleaned_attrs[0]["cue_code"] if cleaned_attrs else None)
            )

        final_results.append(
            AgentRunResult(
                agent_id=p.agent_id,
                batch_id=batch_id,
                monologue=parsed["full_mono"],
                final_decision=decision,
                stopped_at_segment_id=stopped_id,
                deciding_factor=parsed["deciding_factor"],
                factor_segment_ids=parsed["factor_segment_ids"],
                segment_traces=parsed["traces"],
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

    batches = [
        (b_idx // max(1, batch_size), agents_to_run[b_idx : b_idx + batch_size])
        for b_idx in range(0, len(agents_to_run), max(1, batch_size))
    ]

    def _run_one_batch(item: tuple[int, list[PersonaSpecOut]]) -> list[AgentRunResult]:
        batch_num, batch = item
        router = get_llm_router()
        if router.is_mock_mode:
            return _evaluate_batch_mock(
                personas=batch,
                segments=segments,
                batch_id=batch_num,
                seed=seed,
                prefix_traces_by_agent=prefix_traces_by_agent,
                start_idx=start_idx,
            )
        llm_out = _evaluate_batch_llm(
            personas=batch,
            segments=segments,
            business_summary=business_summary,
            batch_id=batch_num,
            seed=seed,
            prefix_traces_by_agent=prefix_traces_by_agent,
            start_idx=start_idx,
        )
        if llm_out is None:
            raise LLMUnavailableError(
                "Model gagal menghasilkan keputusan agen yang valid. Silakan coba lagi.",
                status_code=502,
            )
        return llm_out

    new_results: list[AgentRunResult] = []
    if len(batches) > 1:
        max_workers = max(1, min(len(batches), get_settings().sim_concurrency_limit))
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            for batch_res in pool.map(_run_one_batch, batches):
                new_results.extend(batch_res)
    elif batches:
        new_results.extend(_run_one_batch(batches[0]))

    combined = reused_results + new_results
    combined.sort(key=lambda r: r.agent_id)
    return combined
