"""F5: Model Persona Diskret (tanpa LLM) berbasis data input F1 dengan seed tetap (PRD F5)."""

from __future__ import annotations

import math
import random
from typing import Any

import numpy as np

from app.schemas.simulation import AgentTraits, PersonaSpecOut

TABLE_VERSION = "w_v1.2026_bps_domain"

SEGMENTS: tuple[str, ...] = (
    "mahasiswa",
    "pekerja_kantor",
    "warga_sekitar",
    "keluarga",
    "pengendara_lewat",
    "pencari_kuliner",
)

# Matriks bobot W hand-crafted (domain + rujukan kasar demografi kota Indonesia, BUKAN hasil training)
# Format: fitur -> {segmen: logit_offset}
LOGIT_WEIGHTS: dict[str, dict[str, float]] = {
    "surrounding:kampus": {
        "mahasiswa": 1.6,
        "pekerja_kantor": 0.2,
        "warga_sekitar": 0.1,
        "keluarga": -0.6,
        "pengendara_lewat": 0.3,
        "pencari_kuliner": 0.4,
    },
    "surrounding:perkantoran": {
        "mahasiswa": -0.2,
        "pekerja_kantor": 1.7,
        "warga_sekitar": -0.2,
        "keluarga": -0.4,
        "pengendara_lewat": 0.5,
        "pencari_kuliner": 0.3,
    },
    "surrounding:pemukiman": {
        "mahasiswa": 0.1,
        "pekerja_kantor": 0.2,
        "warga_sekitar": 1.5,
        "keluarga": 1.2,
        "pengendara_lewat": 0.1,
        "pencari_kuliner": 0.2,
    },
    "surrounding:jalan_utama": {
        "mahasiswa": 0.2,
        "pekerja_kantor": 0.4,
        "warga_sekitar": 0.3,
        "keluarga": 0.2,
        "pengendara_lewat": 1.4,
        "pencari_kuliner": 0.6,
    },
    "price:hemat": {
        "mahasiswa": 0.9,
        "pekerja_kantor": 0.3,
        "warga_sekitar": 0.7,
        "keluarga": 0.3,
        "pengendara_lewat": 0.4,
        "pencari_kuliner": 0.1,
    },
    "price:menengah": {
        "mahasiswa": 0.1,
        "pekerja_kantor": 0.8,
        "warga_sekitar": 0.3,
        "keluarga": 0.7,
        "pengendara_lewat": 0.2,
        "pencari_kuliner": 0.7,
    },
    "price:atas": {
        "mahasiswa": -0.9,
        "pekerja_kantor": 0.7,
        "warga_sekitar": -0.2,
        "keluarga": 0.9,
        "pengendara_lewat": -0.3,
        "pencari_kuliner": 1.1,
    },
    "peak:siang": {
        "mahasiswa": 0.5,
        "pekerja_kantor": 0.9,
        "warga_sekitar": 0.1,
        "keluarga": 0.1,
        "pengendara_lewat": 0.4,
        "pencari_kuliner": 0.2,
    },
    "peak:malam": {
        "mahasiswa": 0.4,
        "pekerja_kantor": -0.2,
        "warga_sekitar": 0.6,
        "keluarga": 0.8,
        "pengendara_lewat": 0.3,
        "pencari_kuliner": 0.9,
    },
}

DAILY_MOODS: tuple[str, ...] = (
    "sedang lapar dan ingin cepat dapat makan",
    "santai, mau melihat-lihat dulu sebelum memutuskan",
    "agak lelah sepulang aktivitas, malas jalan jauh atau naik tangga",
    "suasana hati biasa, mencari tempat yang jelas dan terang",
    "sedang menghemat pengeluaran hari ini",
    "ingin mencoba menu baru jika terlihat menarik dan jelas harganya",
)

SEGMENT_TRAIT_PRIORS: dict[str, dict[str, Any]] = {
    "mahasiswa": {
        "budget": [("hemat", 0.65), ("sedang", 0.30), ("fleksibel", 0.05)],
        "laziness": [("malas", 0.25), ("normal", 0.45), ("eksploratif", 0.30)],
        "dining": [("sendiri_buru_buru", 0.35), ("santai", 0.40), ("rombongan", 0.25)],
        "familiarity": [("baru_pertama", 0.35), ("cukup_tahu", 0.45), ("warga_lokal", 0.20)],
        "intent": [("mencari_makan", 0.55), ("lewat_saja", 0.30), ("spesifik_tujuan", 0.15)],
        "budget_range": (14000, 28000),
        "break_range": (25, 60),
        "contexts": [
            "baru selesai kuliah di sekitar lokasi dan mencari makan siang",
            "sedang berjalan kaki mencari tempat makan yang ramah di kantong",
        ],
    },
    "pekerja_kantor": {
        "budget": [("hemat", 0.25), ("sedang", 0.55), ("fleksibel", 0.20)],
        "laziness": [("malas", 0.45), ("normal", 0.40), ("eksploratif", 0.15)],
        "dining": [("sendiri_buru_buru", 0.55), ("santai", 0.25), ("rombongan", 0.20)],
        "familiarity": [("baru_pertama", 0.30), ("cukup_tahu", 0.45), ("warga_lokal", 0.25)],
        "intent": [("mencari_makan", 0.60), ("lewat_saja", 0.25), ("spesifik_tujuan", 0.15)],
        "budget_range": (22000, 48000),
        "break_range": (15, 35),
        "contexts": [
            "keluar kantor saat jam istirahat dengan waktu terbatas",
            "pulang kerja dan mencari makan malam praktis tanpa antre lama",
        ],
    },
    "warga_sekitar": {
        "budget": [("hemat", 0.50), ("sedang", 0.40), ("fleksibel", 0.10)],
        "laziness": [("malas", 0.35), ("normal", 0.50), ("eksploratif", 0.15)],
        "dining": [("sendiri_buru_buru", 0.30), ("santai", 0.50), ("rombongan", 0.20)],
        "familiarity": [("baru_pertama", 0.10), ("cukup_tahu", 0.35), ("warga_lokal", 0.55)],
        "intent": [("mencari_makan", 0.50), ("lewat_saja", 0.35), ("spesifik_tujuan", 0.15)],
        "budget_range": (15000, 35000),
        "break_range": (25, 50),
        "contexts": [
            "tinggal di sekitar kawasan ini dan sering melintas jalan depan toko",
            "sedang mencari makan malam untuk dibawa pulang",
        ],
    },
    "keluarga": {
        "budget": [("hemat", 0.20), ("sedang", 0.50), ("fleksibel", 0.30)],
        "laziness": [("malas", 0.50), ("normal", 0.40), ("eksploratif", 0.10)],
        "dining": [("sendiri_buru_buru", 0.05), ("santai", 0.30), ("rombongan", 0.65)],
        "familiarity": [("baru_pertama", 0.40), ("cukup_tahu", 0.40), ("warga_lokal", 0.20)],
        "intent": [("mencari_makan", 0.60), ("lewat_saja", 0.20), ("spesifik_tujuan", 0.20)],
        "budget_range": (30000, 75000),
        "break_range": (40, 90),
        "contexts": [
            "makan bersama keluarga sehingga butuh akses mudah, tempat terang, dan parkir jelas",
            "sedang mencari tempat makan yang nyaman dan bersih untuk rombongan kecil",
        ],
    },
    "pengendara_lewat": {
        "budget": [("hemat", 0.40), ("sedang", 0.45), ("fleksibel", 0.15)],
        "laziness": [("malas", 0.65), ("normal", 0.30), ("eksploratif", 0.05)],
        "dining": [("sendiri_buru_buru", 0.70), ("santai", 0.20), ("rombongan", 0.10)],
        "familiarity": [("baru_pertama", 0.55), ("cukup_tahu", 0.30), ("warga_lokal", 0.15)],
        "intent": [("mencari_makan", 0.30), ("lewat_saja", 0.65), ("spesifik_tujuan", 0.05)],
        "budget_range": (18000, 38000),
        "break_range": (10, 25),
        "contexts": [
            "sedang berkendara melintas dan hanya berhenti bila tempat terlihat jelas serta mudah parkir",
            "melewati jalur ini dengan waktu sempit dan tidak mau repot mencari pintu masuk",
        ],
    },
    "pencari_kuliner": {
        "budget": [("hemat", 0.15), ("sedang", 0.45), ("fleksibel", 0.40)],
        "laziness": [("malas", 0.15), ("normal", 0.35), ("eksploratif", 0.50)],
        "dining": [("sendiri_buru_buru", 0.15), ("santai", 0.55), ("rombongan", 0.30)],
        "familiarity": [("baru_pertama", 0.65), ("cukup_tahu", 0.25), ("warga_lokal", 0.10)],
        "intent": [("mencari_makan", 0.65), ("lewat_saja", 0.15), ("spesifik_tujuan", 0.20)],
        "budget_range": (25000, 65000),
        "break_range": (35, 75),
        "contexts": [
            "suka mencoba tempat makan baru yang menarik perhatian dari tampilan dan kejelasan menunya",
            "baru pertama kali melewati jalan ini sambil mencari rekomendasi makanan",
        ],
    },
}


def _weighted_pick(rng: random.Random, options: list[tuple[str, float]]) -> str:
    labels = [o[0] for o in options]
    weights = [o[1] for o in options]
    return rng.choices(labels, weights=weights, k=1)[0]


def _classify_surrounding(surrounding_type: str | None) -> str:
    raw = (surrounding_type or "").lower()
    if any(k in raw for k in ("kampus", "sekolah", "kos", "mahasiswa")):
        return "surrounding:kampus"
    if any(k in raw for k in ("kantor", "bisnis", "komersial", "cbd")):
        return "surrounding:perkantoran"
    if any(k in raw for k in ("pemukiman", "perumahan", "komplek", "warga")):
        return "surrounding:pemukiman"
    return "surrounding:jalan_utama"


def _classify_price_tier(median_price: float) -> str:
    if median_price <= 0 or median_price < 22000:
        return "price:hemat"
    if median_price <= 45000:
        return "price:menengah"
    return "price:atas"


def compute_segment_probabilities(
    *,
    surrounding_type: str | None,
    visitor_types: list[str] | None,
    median_menu_price: float,
    peak_hours: list[str] | None,
) -> dict[str, float]:
    """Hitung distribusi probabilitas segmen memakai multinomial logit P = softmax(W * fitur) + IPF ringan."""
    logits: dict[str, float] = {seg: 0.0 for seg in SEGMENTS}

    active_features = [
        _classify_surrounding(surrounding_type),
        _classify_price_tier(median_menu_price),
    ]
    peaks_joined = " ".join(peak_hours or []).lower()
    if "siang" in peaks_joined:
        active_features.append("peak:siang")
    if "malam" in peaks_joined:
        active_features.append("peak:malam")

    for feat in active_features:
        row = LOGIT_WEIGHTS.get(feat, {})
        for seg, val in row.items():
            logits[seg] = logits.get(seg, 0.0) + val

    # Penyesuaian marginal (IPF ringan) dari chip "siapa yang biasa lewat" (input F1)
    vis_joined = " ".join(visitor_types or []).lower()
    if vis_joined:
        if any(k in vis_joined for k in ("mahasiswa", "pelajar")):
            logits["mahasiswa"] += 0.9
        if any(k in vis_joined for k in ("pekerja", "karyawan", "kantor")):
            logits["pekerja_kantor"] += 0.9
        if any(k in vis_joined for k in ("warga", "penduduk", "tetangga")):
            logits["warga_sekitar"] += 0.9
        if any(k in vis_joined for k in ("keluarga", "orang tua")):
            logits["keluarga"] += 0.9
        if any(k in vis_joined for k in ("pengendara", "ojol", "motor", "mobil", "lewat")):
            logits["pengendara_lewat"] += 0.9

    max_l = max(logits.values())
    exps = {seg: math.exp(val - max_l) for seg, val in logits.items()}
    total = sum(exps.values()) or 1.0
    return {seg: exps[seg] / total for seg in SEGMENTS}


def generate_discrete_personas(
    *,
    n: int = 20,
    seed: int = 42,
    surrounding_type: str | None = None,
    visitor_types: list[str] | None = None,
    median_menu_price: float = 20000.0,
    peak_hours: list[str] | None = None,
) -> list[PersonaSpecOut]:
    """Generate tepat ``n`` (default 20) PersonaSpec individual via Stratified Sampling dari model diskret."""
    probs = compute_segment_probabilities(
        surrounding_type=surrounding_type,
        visitor_types=visitor_types,
        median_menu_price=median_menu_price,
        peak_hours=peak_hours,
    )

    # Stratified allocation (Hamilton / largest remainder) agar tepat berjumlah n
    raw_counts = {seg: probs[seg] * n for seg in SEGMENTS}
    counts = {seg: math.floor(val) for seg, val in raw_counts.items()}
    remainder = n - sum(counts.values())
    by_frac = sorted(SEGMENTS, key=lambda s: raw_counts[s] - counts[s], reverse=True)
    for idx in range(remainder):
        counts[by_frac[idx % len(by_frac)]] += 1

    segment_pool: list[str] = []
    for seg in SEGMENTS:
        segment_pool.extend([seg] * counts[seg])

    rng = random.Random(seed)
    rng.shuffle(segment_pool)

    personas: list[PersonaSpecOut] = []
    for agent_idx, seg in enumerate(segment_pool[:n], start=1):
        prior = SEGMENT_TRAIT_PRIORS[seg]
        b_min, b_max = prior["budget_range"]
        t_min, t_max = prior["break_range"]

        budget_sens = _weighted_pick(rng, prior["budget"])
        laziness = _weighted_pick(rng, prior["laziness"])
        dining = _weighted_pick(rng, prior["dining"])
        familiarity = _weighted_pick(rng, prior["familiarity"])
        intent = _weighted_pick(rng, prior["intent"])

        meal_budget = int(round(rng.randint(b_min, b_max) / 1000.0) * 1000)
        break_minutes = rng.randint(t_min, t_max)

        personas.append(
            PersonaSpecOut(
                agent_id=agent_idx,
                segment=seg,
                discrete_traits={
                    "budget_sensitivity": budget_sens,
                    "physical_laziness": laziness,
                    "dining_context": dining,
                    "area_familiarity": familiarity,
                    "visit_intent": intent,
                },
                concrete_facts={
                    "meal_budget": meal_budget,
                    "break_time_minutes": break_minutes,
                },
                context_around=rng.choice(prior["contexts"]),
                daily_mood=rng.choice(DAILY_MOODS),
                seed=seed,
                table_version=TABLE_VERSION,
            )
        )

    return personas


def format_persona_behavior_rules(persona: PersonaSpecOut) -> str:
    """Bangun kalimat aturan perilaku eksplisit per sifat untuk template prompt agen (PRD F5)."""
    traits = persona.discrete_traits
    facts = persona.concrete_facts
    budget = int(facts.get("meal_budget", 25000))
    minutes = int(facts.get("break_time_minutes", 30))

    rules = [
        f"Anggaran makanmu maksimal Rp{budget:,}; jika harga terlihat di atas Rp{budget:,} atau harga tidak jelas padahal kamu '{traits.get('budget_sensitivity')}', kamu cenderung ragu atau batal.",
        f"Waktu luangmu {minutes} menit dengan konteks '{traits.get('dining_context')}'; jika alur masuk atau pesan membingungkan, kamu mudah pergi.",
        f"Tingkat kemalasan fisikmu '{traits.get('physical_laziness')}'; bila ada tangga tanpa penunjuk atau pintu tertutup rapat, kamu makin enggan masuk.",
        f"Familiaritas areamu '{traits.get('area_familiarity')}' dan niat awalmu '{traits.get('visit_intent')}'.",
    ]
    return " ".join(rules)


def sample_population(n: int, seed: int) -> list[AgentTraits]:
    """Kompatibilitas untuk unit test lama: sampling sifat numerik dasar."""
    rng = np.random.default_rng(seed)
    price = rng.beta(2, 2, n)
    patience = rng.beta(2, 3, n)
    lunch = rng.beta(3, 2, n)
    group = rng.choice([1, 2, 3, 4], size=n, p=[0.4, 0.3, 0.2, 0.1])
    return [
        AgentTraits(
            price_sensitivity=float(price[i]),
            patience=float(patience[i]),
            lunch_habit=float(lunch[i]),
            group_size=int(group[i]),
        )
        for i in range(n)
    ]
