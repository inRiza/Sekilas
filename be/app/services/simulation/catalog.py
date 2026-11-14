"""Katalog Isyarat (H1-H10 + H0) dan Katalog Tindakan (A1.1-A10.2) yang terkurasi (PRD F6-C & F6-D).

Aturan ketat:
- Nilai efikasi ``efficacy`` (e dalam 0..1) ditetapkan oleh katalog, BUKAN dikarang oleh LLM.
- LLM hanya memilih ``action_id`` yang sah dari katalog dan mengisi parameter slot pada ``spec_template``.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Literal

Vantage = Literal["jalan", "pintu", "dalam"]
CueDirection = Literal["menghambat", "mendorong", "netral"]
EffortLevel = Literal["Rendah", "Sedang", "Tinggi"]


@dataclass(frozen=True)
class CueHypothesis:
    cue_code: str
    title: str
    definition: str
    vantages: tuple[Vantage, ...]
    included_example: str
    excluded_example: str


@dataclass(frozen=True)
class CatalogAction:
    action_id: str
    cue_code: str
    title: str
    spec_template: str
    default_slots: dict[str, str]
    efficacy: float  # e dalam rentang [0.0, 1.0]
    effort: EffortLevel
    cost_rp: int
    affected_area: str
    cannot_change_tags: tuple[str, ...] = ()


HYPOTHESIS_CATALOG: tuple[CueHypothesis, ...] = (
    CueHypothesis(
        cue_code="H1",
        title="Tempat tidak terlihat atau tidak dikenali dari jalan",
        definition="Papan nama kecil, tertutup objek lain, redup, atau tidak terbaca dari jalur pejalan kaki/kendaraan.",
        vantages=("jalan",),
        included_example="Papan nama tertutup ranting atau ukurannya terlalu kecil untuk dibaca dari seberang.",
        excluded_example="Toko mudah ditemukan dari jauh, hanya akses masuknya agak sempit.",
    ),
    CueHypothesis(
        cue_code="H2",
        title="Status buka atau tutup tidak jelas",
        definition="Tidak ada penanda BUKA/TUTUP, jadwal operasional tidak terlihat, atau pencahayaan tampak mati dari luar.",
        vantages=("jalan", "pintu"),
        included_example="Lampu depan redup dan tidak ada papan jam buka sehingga dikira tutup.",
        excluded_example="Sudah jelas terlihat tulisan BUKA dan ada aktivitas kasir.",
    ),
    CueHypothesis(
        cue_code="H3",
        title="Jenis makanan atau minuman tidak jelas dari luar",
        definition="Calon pelanggan di luar tidak bisa menebak apa yang dijual toko ini hanya dari tampilan depan.",
        vantages=("jalan", "pintu"),
        included_example="Hanya ada nama merek abstrak tanpa keterangan menu atau jenis hidangan.",
        excluded_example="Terlihat jelas spanduk Warung Nasi & Ayam Bakar.",
    ),
    CueHypothesis(
        cue_code="H4",
        title="Tidak ada tempat berhenti atau parkir yang jelas",
        definition="Bahu jalan/parkir tampak sempit, terhalang kendaraan lain, atau tidak jelas boleh berhenti di mana.",
        vantages=("jalan",),
        included_example="Depan toko penuh motor sehingga bingung berhenti atau parkir di mana.",
        excluded_example="Area parkir luas dan mudah diakses.",
    ),
    CueHypothesis(
        cue_code="H5",
        title="Hambatan fisik akses masuk (tangga, pintu tertutup, jalur sempit)",
        definition="Pintu tertutup rapat tanpa keterangan dorong/tarik, tangga curam tanpa penunjuk, atau jalur masuk sempit.",
        vantages=("pintu",),
        included_example="Harus naik tangga ke lantai 2 tanpa petunjuk arah masuk yang jelas.",
        excluded_example="Pintu kaca terbuka lebar langsung dari trotoar.",
    ),
    CueHypothesis(
        cue_code="H6",
        title="Kesan kebersihan atau pencahayaan kurang",
        definition="Area pintu atau dalam tampak gelap/remang, berantakan, atau kurang terawat sehingga menurunkan selera.",
        vantages=("pintu", "dalam"),
        included_example="Lampu dalam jauh lebih gelap dibanding luar sehingga terkesan suram.",
        excluded_example="Ruangan terang, bersih, dan tertata rapi.",
    ),
    CueHypothesis(
        cue_code="H7",
        title="Suasana terlalu sepi atau terlalu penuh sehingga ragu",
        definition="Toko terlihat kosong sama sekali (menimbulkan ragu kualitas/buka) atau terlalu sesak tanpa ruang tunggu.",
        vantages=("jalan", "pintu", "dalam"),
        included_example="Terlihat sepi sekali tanpa tanda aktivitas sehingga ragu untuk masuk sendiri.",
        excluded_example="Ada beberapa pelanggan duduk nyaman dan kasir tampak siap melayani.",
    ),
    CueHypothesis(
        cue_code="H8",
        title="Menu dan harga tidak terlihat atau tidak terbaca",
        definition="Daftar menu/harga baru terlihat setelah masuk jauh, huruf terlalu kecil, atau belum ada daftar harga di depan.",
        vantages=("pintu", "dalam"),
        included_example="Tidak ada daftar harga di depan pintu sehingga takut harganya mahal.",
        excluded_example="Papan menu dan harga terpampang jelas sebelum masuk.",
    ),
    CueHypothesis(
        cue_code="H9",
        title="Harga terkesan tidak sesuai anggaran",
        definition="Kisaran harga yang terbaca atau kesan tampilan terasa terlalu mahal dibanding anggaran makan pelanggan.",
        vantages=("pintu", "dalam"),
        included_example="Harga menu utama terlihat di atas Rp40.000 sedangkan anggaran hanya Rp25.000.",
        excluded_example="Harga terjangkau dan sesuai anggaran makan harian.",
    ),
    CueHypothesis(
        cue_code="H10",
        title="Titik pesan atau alur antre membingungkan",
        definition="Tidak jelas harus pesan di kasir mana, duduk dulu atau bayar dulu, atau meja kasir tertutup barang.",
        vantages=("dalam",),
        included_example="Sudah masuk ruangan tetapi bingung di mana meja kasir atau tempat memesan.",
        excluded_example="Kasir bertanda jelas langsung menghadap pintu masuk.",
    ),
    CueHypothesis(
        cue_code="H0",
        title="Lainnya atau faktor di luar daftar",
        definition="Alasan spesifik lain yang tidak masuk kategori H1-H10 (wajib disertai keterangan singkat).",
        vantages=("jalan", "pintu", "dalam"),
        included_example="Sedang terburu-buru mengejar jadwal lain di luar faktor toko.",
        excluded_example="Masalah sudah tercakup di H1 sampai H10.",
    ),
)

HYPOTHESIS_BY_CODE: dict[str, CueHypothesis] = {h.cue_code: h for h in HYPOTHESIS_CATALOG}

ACTION_CATALOG: tuple[CatalogAction, ...] = (
    CatalogAction(
        action_id="A1.1",
        cue_code="H1",
        title="Pasang penanda nama & arah setinggi mata dari trotoar",
        spec_template="Pasang {jenis_penanda} bertuliskan '{teks_utama}' di {lokasi_pasang} agar mudah terbaca dari arah jalan.",
        default_slots={
            "jenis_penanda": "papan nama tegak / standing banner",
            "teks_utama": "nama usaha + panah masuk",
            "lokasi_pasang": "tepi depan akses masuk",
        },
        efficacy=0.72,
        effort="Rendah",
        cost_rp=150_000,
        affected_area="fasad",
        cannot_change_tags=("fasad", "sewa_gedung"),
    ),
    CatalogAction(
        action_id="A1.2",
        cue_code="H1",
        title="Rapikan penghalang pandangan di depan papan nama",
        spec_template="Pindahkan atau rapikan {penghalang} di sekitar {lokasi_pasang} agar papan nama usaha terlihat penuh dari jalan.",
        default_slots={
            "penghalang": "objek/kendaraan yang menutupi bagian depan",
            "lokasi_pasang": "area fasad depan",
        },
        efficacy=0.65,
        effort="Rendah",
        cost_rp=50_000,
        affected_area="fasad",
    ),
    CatalogAction(
        action_id="A2.1",
        cue_code="H2",
        title="Pasang papan status BUKA & jam operasional di area terlihat",
        spec_template="Pasang tanda '{tanda_status}' lengkap dengan jam buka {jam_operasional} di {lokasi_pasang} agar terlihat jelas dari luar.",
        default_slots={
            "tanda_status": "BUKA · Silakan Masuk",
            "jam_operasional": "sesuai jam operasional",
            "lokasi_pasang": "pintu masuk atau kaca depan",
        },
        efficacy=0.78,
        effort="Rendah",
        cost_rp=95_000,
        affected_area="pintu",
    ),
    CatalogAction(
        action_id="A2.2",
        cue_code="H2",
        title="Tambahkan lampu sorot atau tanda BUKA menyala di pintu",
        spec_template="Nyalakan {jenis_lampu} di {lokasi_pasang} supaya tempat usaha tampak aktif dan buka dari kejauhan.",
        default_slots={
            "jenis_lampu": "lampu warm-white / neon tanda BUKA",
            "lokasi_pasang": "atas pintu masuk",
        },
        efficacy=0.74,
        effort="Sedang",
        cost_rp=180_000,
        affected_area="pencahayaan",
    ),
    CatalogAction(
        action_id="A3.1",
        cue_code="H3",
        title="Tampilkan kategori hidangan utama di papan depan",
        spec_template="Tambahkan keterangan jenis hidangan '{ringkasan_menu}' berukuran besar di {lokasi_pasang} agar langsung dikenali pejalan kaki.",
        default_slots={
            "ringkasan_menu": "menu utama & kisaran harga",
            "lokasi_pasang": "spanduk atau kaca depan",
        },
        efficacy=0.76,
        effort="Rendah",
        cost_rp=120_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A4.1",
        cue_code="H4",
        title="Beri penanda area parkir atau titik berhenti singkat",
        spec_template="Pasang penanda '{label_parkir}' di {lokasi_pasang} dan sisakan ruang {lebar_akses} agar pengendara yakin bisa berhenti.",
        default_slots={
            "label_parkir": "Parkir Pelanggan di Sini",
            "lokasi_pasang": "bahu depan toko",
            "lebar_akses": "akses masuk bebas halangan",
        },
        efficacy=0.60,
        effort="Sedang",
        cost_rp=110_000,
        affected_area="parkir",
        cannot_change_tags=("parkir", "jalan"),
    ),
    CatalogAction(
        action_id="A5.1",
        cue_code="H5",
        title="Pasang penunjuk arah masuk & buka pintu saat jam layanan",
        spec_template="Pasang penunjuk '{petunjuk_masuk}' di {lokasi_pasang} dan pastikan akses pintu terasa ramah serta tidak membingungkan.",
        default_slots={
            "petunjuk_masuk": "Masuk di Sini / Naik ke Lantai Atas",
            "lokasi_pasang": "kaki tangga / ambang pintu",
        },
        efficacy=0.75,
        effort="Rendah",
        cost_rp=85_000,
        affected_area="pintu",
    ),
    CatalogAction(
        action_id="A5.2",
        cue_code="H5",
        title="Tata ulang ambang pintu atau jalur tangga agar lega",
        spec_template="Bebaskan {area_hambatan} dari barang penghalang dan tambah penerangan pijakan di {lokasi_pasang}.",
        default_slots={
            "area_hambatan": "jalur menuju pintu / tangga",
            "lokasi_pasang": "area transisi masuk",
        },
        efficacy=0.68,
        effort="Tinggi",
        cost_rp=350_000,
        affected_area="struktur_pintu",
        cannot_change_tags=("struktur", "tangga", "renovasi"),
    ),
    CatalogAction(
        action_id="A6.1",
        cue_code="H6",
        title="Tingkatkan penerangan area ambang pintu dan ruang dalam",
        spec_template="Tambahkan pencahayaan terang di {lokasi_pasang} agar kontras antara luar dan dalam seimbang serta tampak bersih.",
        default_slots={
            "lokasi_pasang": "area pintu masuk hingga ruang pesan",
        },
        efficacy=0.73,
        effort="Sedang",
        cost_rp=220_000,
        affected_area="pencahayaan",
    ),
    CatalogAction(
        action_id="A7.1",
        cue_code="H7",
        title="Tampilkan aktivitas layanan atau penanda ketersediaan tempat",
        spec_template="Atur {penataan_aktivitas} dan pasang info '{info_layanan}' di {lokasi_pasang} agar suasana terasa hidup dan siap melayani.",
        default_slots={
            "penataan_aktivitas": "pencahayaan dan posisi meja yang terlihat dari luar",
            "info_layanan": "Siap Melayani · Pesan Cepat / Dine-in",
            "lokasi_pasang": "area depan yang terlihat dari pintu",
        },
        efficacy=0.55,
        effort="Rendah",
        cost_rp=75_000,
        affected_area="suasana",
    ),
    CatalogAction(
        action_id="A8.1",
        cue_code="H8",
        title="Pajang papan menu dan harga jelas sebelum pintu masuk",
        spec_template="Pajang daftar menu beserta harga ('{contoh_menu}') dengan huruf besar di {lokasi_pasang} agar terbaca sebelum masuk.",
        default_slots={
            "contoh_menu": "menu unggulan beserta harga pas",
            "lokasi_pasang": "sebelah pintu masuk",
        },
        efficacy=0.82,
        effort="Rendah",
        cost_rp=140_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A9.1",
        cue_code="H9",
        title="Tonjolkan paket hemat atau harga mulai termurah di depan",
        spec_template="Tampilkan penanda harga terjangkau '{info_paket}' secara menonjol di {lokasi_pasang} untuk meyakinkan pengunjung hemat.",
        default_slots={
            "info_paket": "Menu mulai harga termurah / Paket Hemat",
            "lokasi_pasang": "papan menu depan pintu",
        },
        efficacy=0.66,
        effort="Rendah",
        cost_rp=90_000,
        affected_area="harga",
        cannot_change_tags=("harga",),
    ),
    CatalogAction(
        action_id="A10.1",
        cue_code="H10",
        title="Pasang penanda jelas 'Pesan & Bayar di Sini' di meja kasir",
        spec_template="Pasang tanda '{label_kasir}' di {lokasi_pasang} agar pengunjung yang baru masuk langsung tahu alur pemesanan.",
        default_slots={
            "label_kasir": "PESAN & BAYAR DI SINI",
            "lokasi_pasang": "atas/depan meja kasir",
        },
        efficacy=0.80,
        effort="Rendah",
        cost_rp=70_000,
        affected_area="kasir",
    ),
)

ACTION_BY_ID: dict[str, CatalogAction] = {a.action_id: a for a in ACTION_CATALOG}


def get_actions_for_cue(cue_code: str, cannot_change: list[str] | None = None) -> list[CatalogAction]:
    """Ambil kandidat tindakan dari katalog yang cocok dengan ``cue_code`` dan tidak melanggar batasan pemilik."""
    blocked = {c.strip().lower() for c in (cannot_change or []) if c.strip()}
    candidates: list[CatalogAction] = []
    for act in ACTION_CATALOG:
        if act.cue_code != cue_code:
            continue
        if blocked and any(tag in b for tag in act.cannot_change_tags for b in blocked):
            continue
        candidates.append(act)
    # Jika semua terblokir, tetap kembalikan kandidat asli agar pemilik masih melihat opsi alternatif
    return candidates or [a for a in ACTION_CATALOG if a.cue_code == cue_code]


def render_action_spec(action_id: str, slot_params: dict[str, str] | None = None) -> str:
    """Render ``spec_template`` tindakan dengan parameter slot tervalidasi."""
    action = ACTION_BY_ID.get(action_id)
    if action is None:
        return ""
    merged = dict(action.default_slots)
    if slot_params:
        for k, v in slot_params.items():
            if k in merged and isinstance(v, str) and v.strip():
                # Batasi panjang slot untuk mencegah halusinasi/injeksi kalimat panjang
                merged[k] = v.strip()[:80]
    try:
        return action.spec_template.format(**merged)
    except KeyError:
        return action.spec_template


def shuffled_catalog_for_agent(
    *,
    agent_id: int,
    allowed_vantages: set[str],
    seed: int = 42,
) -> list[CueHypothesis]:
    """Saring katalog sesuai vantage yang dilewati agen, lalu acak urutannya secara deterministik per agen."""
    eligible = [
        h
        for h in HYPOTHESIS_CATALOG
        if h.cue_code == "H0" or any(v in allowed_vantages for v in h.vantages)
    ]
    rng = random.Random(seed * 1009 + agent_id)
    rng.shuffle(eligible)
    return eligible
