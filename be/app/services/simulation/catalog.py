"""Katalog Isyarat (H1-H14 + H0) dan Katalog Tindakan (A1.1-A14.2) yang terkurasi (PRD F6-C & F6-D).

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
        cue_code="H11",
        title="Info pembayaran non-tunai (QRIS/debit) tidak terlihat",
        definition="Tidak terlihat stiker/standee QRIS atau informasi metode bayar sehingga pelanggan tanpa uang tunai ragu memesan.",
        vantages=("pintu", "dalam"),
        included_example="Di pintu maupun meja kasir tidak ada tanda QRIS atau pembayaran non-tunai.",
        excluded_example="Standee QRIS dan stiker metode pembayaran terpampang jelas di pintu dan kasir.",
    ),
    CueHypothesis(
        cue_code="H12",
        title="Info bungkus cepat atau estimasi waktu saji tidak jelas",
        definition="Pelanggan yang terburu-buru tidak tahu apakah bisa pesan bungkus cepat (takeaway) atau berapa lama menunggu.",
        vantages=("jalan", "pintu", "dalam"),
        included_example="Terlihat sibuk tanpa info layanan takeaway cepat atau perkiraan waktu tunggu.",
        excluded_example="Ada papan pesan cepat/takeaway dan estimasi waktu saji yang jelas.",
    ),
    CueHypothesis(
        cue_code="H13",
        title="Ketersediaan tempat duduk atau area tunggu tidak terlihat",
        definition="Dari depan/ambang pintu tidak jelas apakah masih ada kursi nyaman untuk makan di tempat atau sekadar area tunggu.",
        vantages=("pintu", "dalam"),
        included_example="Meja duduk tertutup sekat atau terasa penuh tanpa informasi kursi tersedia.",
        excluded_example="Area duduk terlihat rapi dengan ruang tunggu yang jelas dari ambang pintu.",
    ),
    CueHypothesis(
        cue_code="H14",
        title="Tulisan menu atau penanda terlalu kecil, pudar, atau silau kaca",
        definition="Papan sebenarnya ada, tetapi ukuran huruf kecil, kontras warna lemah, atau terpantul cahaya kaca sehingga gagal terbaca sekilas.",
        vantages=("jalan", "pintu", "dalam"),
        included_example="Spanduk kusam atau daftar menu di balik kaca silau sehingga huruf tidak terbaca dari trotoar.",
        excluded_example="Tulisan papan besar, kontras tinggi, bebas silau, dan terbaca jelas.",
    ),
    CueHypothesis(
        cue_code="H0",
        title="Lainnya atau faktor di luar daftar",
        definition="Alasan spesifik lain yang tidak masuk kategori H1-H14 (wajib disertai keterangan singkat).",
        vantages=("jalan", "pintu", "dalam"),
        included_example="Sedang terburu-buru mengejar jadwal lain di luar faktor toko.",
        excluded_example="Masalah sudah tercakup di H1 sampai H14.",
    ),
)

HYPOTHESIS_BY_CODE: dict[str, CueHypothesis] = {h.cue_code: h for h in HYPOTHESIS_CATALOG}

ACTION_CATALOG: tuple[CatalogAction, ...] = (
    CatalogAction(
        action_id="A1.1",
        cue_code="H1",
        title="Pasang penanda nama & arah setinggi mata dari trotoar",
        spec_template="Pasang {jenis_penanda} bertuliskan '{teks_utama}' setinggi mata (~1,4–1,6 m) di {lokasi_pasang} agar terbaca jelas dari dua arah jalan.",
        default_slots={
            "jenis_penanda": "papan nama tegak / standing A-frame",
            "teks_utama": "nama usaha + jenis sajian + panah masuk",
            "lokasi_pasang": "tepi trotoar dekat akses masuk",
        },
        efficacy=0.72,
        effort="Rendah",
        cost_rp=150_000,
        affected_area="fasad",
        # Papan/banner tetap boleh dipasang walau struktur bangunan ('fasad') tidak bisa diubah.
        cannot_change_tags=("sewa_gedung",),
    ),
    CatalogAction(
        action_id="A1.2",
        cue_code="H1",
        title="Rapikan penghalang pandangan di depan papan nama",
        spec_template="Pindahkan atau rapikan {penghalang} di sekitar {lokasi_pasang} agar papan nama dan tampak depan usaha terlihat utuh dari seberang jalan.",
        default_slots={
            "penghalang": "barang/parkir yang menutupi garis pandang depan",
            "lokasi_pasang": "area fasad depan",
        },
        efficacy=0.65,
        effort="Rendah",
        cost_rp=50_000,
        affected_area="fasad",
    ),
    CatalogAction(
        action_id="A1.3",
        cue_code="H1",
        title="Tambahkan lampu sorot & warna kontras pada papan nama",
        spec_template="Pasang {jenis_lampu} dan perjelas warna kontras '{elemen_visual}' pada {lokasi_pasang} agar nama toko tetap menonjol dari kejauhan.",
        default_slots={
            "jenis_lampu": "lampu sorot LED 20–30W",
            "elemen_visual": "latar gelap dengan huruf cerah berukuran besar",
            "lokasi_pasang": "papan nama utama fasad",
        },
        efficacy=0.76,
        effort="Sedang",
        cost_rp=220_000,
        affected_area="pencahayaan",
    ),
    CatalogAction(
        action_id="A2.1",
        cue_code="H2",
        title="Pasang papan status BUKA & jam operasional di area terlihat",
        spec_template="Pasang papan gantung/tempel '{tanda_status}' dengan jadwal '{jam_operasional}' di {lokasi_pasang} agar terbaca dari trotoar.",
        default_slots={
            "tanda_status": "BUKA · Silakan Masuk",
            "jam_operasional": "sesuai jam buka-tutup harian",
            "lokasi_pasang": "pintu kaca atau tiang depan pintu",
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
        spec_template="Nyalakan {jenis_lampu} di {lokasi_pasang} selama jam layanan agar tempat usaha langsung terlihat aktif dan buka dari jauh.",
        default_slots={
            "jenis_lampu": "lampu warm-white terang / neon sign BUKA",
            "lokasi_pasang": "atas pintu masuk utama",
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
        spec_template="Pasang keterangan jenis hidangan '{ringkasan_menu}' berhuruf tebal di {lokasi_pasang} supaya pejalan kaki langsung tahu produk yang dijual.",
        default_slots={
            "ringkasan_menu": "kategori menu inti & contoh sajian utama",
            "lokasi_pasang": "spanduk atas atau kaca depan",
        },
        efficacy=0.76,
        effort="Rendah",
        cost_rp=120_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A3.2",
        cue_code="H3",
        title="Pajang foto 3 menu andalan berukuran besar di area depan",
        spec_template="Tampilkan poster foto '{menu_andalan}' disertai nama sajian di {lokasi_pasang} agar jenis makanan/minuman menarik selera sebelum masuk.",
        default_slots={
            "menu_andalan": "3 menu terlaris beserta foto asli",
            "lokasi_pasang": "sisi kiri/kanan pintu masuk atau A-board",
        },
        efficacy=0.79,
        effort="Rendah",
        cost_rp=135_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A4.1",
        cue_code="H4",
        title="Beri penanda area parkir atau titik berhenti singkat",
        spec_template="Pasang penanda '{label_parkir}' di {lokasi_pasang} dan sisakan ruang {lebar_akses} agar pengendara yakin aman berhenti.",
        default_slots={
            "label_parkir": "Parkir Pelanggan di Sini",
            "lokasi_pasang": "bahu depan toko",
            "lebar_akses": "ruang berhenti minimal 2–3 motor bebas halangan",
        },
        efficacy=0.60,
        effort="Sedang",
        cost_rp=110_000,
        affected_area="parkir",
        cannot_change_tags=("lokasi", "parkir"),
    ),
    CatalogAction(
        action_id="A4.2",
        cue_code="H4",
        title="Tata pembatas drop-off & jalur motor sementara tanpa ubah lahan",
        spec_template="Gunakan {alat_bantu} bertuliskan '{label_singkat}' di {lokasi_pasang} agar pengendara tahu titik berhenti cepat 1–2 menit.",
        default_slots={
            "alat_bantu": "kerucut kecil / papan lipat ringan",
            "label_singkat": "Berhenti / Ambil Pesanan di Sini",
            "lokasi_pasang": "tepi depan teras",
        },
        efficacy=0.58,
        effort="Rendah",
        cost_rp=65_000,
        affected_area="parkir",
    ),
    CatalogAction(
        action_id="A5.1",
        cue_code="H5",
        title="Pasang penunjuk arah masuk & buka pintu saat jam layanan",
        spec_template="Pasang penunjuk '{petunjuk_masuk}' di {lokasi_pasang} serta ganjal/buka daun pintu saat jam ramai agar akses terasa ramah.",
        default_slots={
            "petunjuk_masuk": "Masuk di Sini · Dorong/Tarik",
            "lokasi_pasang": "kaki tangga / daun pintu masuk",
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
            "area_hambatan": "jalur menuju pintu / pijakan tangga",
            "lokasi_pasang": "area transisi masuk",
        },
        efficacy=0.68,
        effort="Tinggi",
        cost_rp=350_000,
        affected_area="struktur_pintu",
        cannot_change_tags=("fasad", "struktur", "tangga", "renovasi"),
    ),
    CatalogAction(
        action_id="A5.3",
        cue_code="H5",
        title="Pasang banner panah lantai/ruang utama di kaki tangga atau lorong",
        spec_template="Tambahkan papan panah '{teks_arah}' di {lokasi_pasang} beserta info ruang tujuan agar pengunjung tidak ragu melangkah naik/masuk.",
        default_slots={
            "teks_arah": "Area Pesan & Duduk di Lantai Atas / Dalam ->",
            "lokasi_pasang": "awal lorong atau kaki tangga masuk",
        },
        efficacy=0.72,
        effort="Rendah",
        cost_rp=95_000,
        affected_area="pintu",
    ),
    CatalogAction(
        action_id="A6.1",
        cue_code="H6",
        title="Tingkatkan penerangan area ambang pintu dan ruang dalam",
        spec_template="Tambahkan pencahayaan {spek_lampu} di {lokasi_pasang} agar kontras luar dan dalam seimbang serta ruangan tampak bersih.",
        default_slots={
            "spek_lampu": "LED putih-hangat 4000K yang terang merata",
            "lokasi_pasang": "teras pintu masuk hingga area kasir",
        },
        efficacy=0.73,
        effort="Sedang",
        cost_rp=220_000,
        affected_area="pencahayaan",
    ),
    CatalogAction(
        action_id="A6.2",
        cue_code="H6",
        title="Rapikan barang operasional pintu & bersihkan kaca/etalase depan",
        spec_template="Singkirkan {benda_mengganggu} dari {lokasi_pasang} agar pintu dan meja layanan tampil higienis dari trotoar.",
        default_slots={
            "benda_mengganggu": "kardus, galon, dan alat bersih-bersih",
            "lokasi_pasang": "sudut dekat pintu masuk dan kaca depan",
        },
        efficacy=0.69,
        effort="Rendah",
        cost_rp=60_000,
        affected_area="kebersihan",
    ),
    CatalogAction(
        action_id="A7.1",
        cue_code="H7",
        title="Tampilkan aktivitas layanan atau penanda ketersediaan tempat",
        spec_template="Atur {penataan_aktivitas} dan pasang info '{info_layanan}' di {lokasi_pasang} agar suasana terasa hidup dan siap melayani.",
        default_slots={
            "penataan_aktivitas": "pencahayaan dan posisi staf/meja yang terlihat dari luar",
            "info_layanan": "Siap Melayani · Dine-in & Takeaway",
            "lokasi_pasang": "area depan yang terlihat dari pintu",
        },
        efficacy=0.55,
        effort="Rendah",
        cost_rp=75_000,
        affected_area="suasana",
    ),
    CatalogAction(
        action_id="A7.2",
        cue_code="H7",
        title="Pasang papan 'Tersedia Meja / Bisa Bungkus Cepat' di depan",
        spec_template="Letakkan papan kecil '{info_kapasitas}' di {lokasi_pasang} supaya calon pelanggan yang ragu melihat kondisi dalam tetap berani masuk.",
        default_slots={
            "info_kapasitas": "Tersedia Ruang Duduk di Dalam / Bisa Takeaway Cepat",
            "lokasi_pasang": "sisi pintu masuk",
        },
        efficacy=0.62,
        effort="Rendah",
        cost_rp=70_000,
        affected_area="suasana",
    ),
    CatalogAction(
        action_id="A8.1",
        cue_code="H8",
        title="Pajang papan menu dan harga jelas sebelum pintu masuk",
        spec_template="Pajang daftar menu beserta harga pas ('{contoh_menu}') dengan huruf minimal 3 cm di {lokasi_pasang} agar terbaca sebelum masuk.",
        default_slots={
            "contoh_menu": "menu unggulan beserta harga per porsi",
            "lokasi_pasang": "sebelah pintu masuk setinggi pandangan mata",
        },
        efficacy=0.82,
        effort="Rendah",
        cost_rp=140_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A8.2",
        cue_code="H8",
        title="Tempel daftar harga ringkas 5 menu terlaris di kaca pintu",
        spec_template="Pasang stiker/poster A3 berisi '{daftar_ringkas}' di {lokasi_pasang} agar pejalan kaki langsung tahu menu & harganya dalam 3 detik.",
        default_slots={
            "daftar_ringkas": "5 menu terlaris lengkap harga nett",
            "lokasi_pasang": "kaca depan atau sisi kanan pintu masuk",
        },
        efficacy=0.78,
        effort="Rendah",
        cost_rp=85_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A9.1",
        cue_code="H9",
        title="Tonjolkan paket hemat atau combo ramah anggaran di depan",
        spec_template="Tampilkan penanda '{info_paket}' secara menonjol di {lokasi_pasang} untuk menarik pengunjung yang sensitif bujet.",
        default_slots={
            "info_paket": "Paket Hemat / Combo Makan + Minum",
            "lokasi_pasang": "papan menu depan pintu",
        },
        efficacy=0.66,
        effort="Rendah",
        cost_rp=90_000,
        affected_area="harga",
        cannot_change_tags=("harga", "menu"),
    ),
    CatalogAction(
        action_id="A9.2",
        cue_code="H9",
        title="Tampilkan label 'Menu Mulai dari Rp...' tanpa ubah harga jual",
        spec_template="Tambahkan strip penanda '{label_termurah}' di {lokasi_pasang} agar pengunjung langsung tahu pilihan menu yang masuk anggaran.",
        default_slots={
            "label_termurah": "Menu Mulai dari Harga Terjangkau / Porsi Harian",
            "lokasi_pasang": "bagian atas papan menu atau kaca depan",
        },
        efficacy=0.63,
        effort="Rendah",
        cost_rp=65_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A10.1",
        cue_code="H10",
        title="Pasang penanda jelas 'Pesan & Bayar di Sini' di meja kasir",
        spec_template="Pasang tanda '{label_kasir}' menghadap pintu di {lokasi_pasang} agar pengunjung yang baru masuk langsung tahu titik pesan.",
        default_slots={
            "label_kasir": "PESAN & BAYAR DI SINI",
            "lokasi_pasang": "atas atau sisi depan meja kasir",
        },
        efficacy=0.80,
        effort="Rendah",
        cost_rp=70_000,
        affected_area="kasir",
    ),
    CatalogAction(
        action_id="A10.2",
        cue_code="H10",
        title="Pasang penanda alur '1. Pesan -> 2. Bayar -> 3. Ambil/Tunggu'",
        spec_template="Tempel petunjuk urutan layanan '{alur_singkat}' di {lokasi_pasang} untuk menghilangkan kebingungan antre.",
        default_slots={
            "alur_singkat": "1. Pesan di Kasir -> 2. Bayar -> 3. Tunggu di Meja",
            "lokasi_pasang": "sebelum antrean kasir / pilar dekat pintu",
        },
        efficacy=0.77,
        effort="Rendah",
        cost_rp=85_000,
        affected_area="kasir",
    ),
    CatalogAction(
        action_id="A11.1",
        cue_code="H11",
        title="Pasang stiker 'Terima QRIS & Non-Tunai' di pintu dan kasir",
        spec_template="Tempel stiker '{label_bayar}' berukuran jelas di {lokasi_pasang} agar pengunjung tanpa uang tunai yakin sebelum memesan.",
        default_slots={
            "label_bayar": "TERIMA QRIS · TUNAI & NON-TUNAI",
            "lokasi_pasang": "pintu masuk dan etalase depan kasir",
        },
        efficacy=0.79,
        effort="Rendah",
        cost_rp=45_000,
        affected_area="kasir",
    ),
    CatalogAction(
        action_id="A11.2",
        cue_code="H11",
        title="Pasang standee akrilik QRIS di posisi depan kasir yang terang",
        spec_template="Letakkan {dudukan_qris} di {lokasi_pasang} agar metode pembayaran langsung terlihat begitu mendekati meja pesan.",
        default_slots={
            "dudukan_qris": "standee akrilik QRIS menghadap pengunjung",
            "lokasi_pasang": "ujung depan meja kasir",
        },
        efficacy=0.76,
        effort="Rendah",
        cost_rp=60_000,
        affected_area="kasir",
    ),
    CatalogAction(
        action_id="A12.1",
        cue_code="H12",
        title="Pasang info 'Bisa Bungkus Cepat ±5–10 Menit' di depan",
        spec_template="Tambahkan label '{info_cepat}' di {lokasi_pasang} agar pekerja atau pengendara yang terburu-buru yakin bisa pesan cepat.",
        default_slots={
            "info_cepat": "PESAN CEPAT / BUNGKUS ±5–10 MENIT",
            "lokasi_pasang": "papan depan pintu atau meja kasir",
        },
        efficacy=0.74,
        effort="Rendah",
        cost_rp=75_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A12.2",
        cue_code="H12",
        title="Tandai menu siap saji (fast prep) pada daftar menu utama",
        spec_template="Beri ikon/tanda '{label_kilat}' pada {pilihan_menu} di {lokasi_pasang} untuk pelanggan dengan waktu istirahat sempit.",
        default_slots={
            "label_kilat": "SIAP CEPAT (<10 MENIT)",
            "pilihan_menu": "menu yang paling cepat disajikan",
            "lokasi_pasang": "papan menu depan dan kasir",
        },
        efficacy=0.71,
        effort="Rendah",
        cost_rp=65_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A13.1",
        cue_code="H13",
        title="Beri papan arah & info ketersediaan ruang duduk di pintu",
        spec_template="Pasang penanda '{info_duduk}' di {lokasi_pasang} agar kelompok atau keluarga langsung tahu kapasitas meja di dalam.",
        default_slots={
            "info_duduk": "Ruang Makan Nyaman di Dalam / Lantai 2",
            "lokasi_pasang": "ambang pintu masuk",
        },
        efficacy=0.68,
        effort="Rendah",
        cost_rp=80_000,
        affected_area="ruang_duduk",
    ),
    CatalogAction(
        action_id="A13.2",
        cue_code="H13",
        title="Buka sekat penghalang pandang & tambah kursi tunggu ringkas",
        spec_template="Rapikan {sekat_penghalang} di {lokasi_pasang} supaya susunan meja makan terlihat nyaman dari pintu.",
        default_slots={
            "sekat_penghalang": "banner/rak tinggi yang menutup pandangan ke ruang duduk",
            "lokasi_pasang": "belakang pintu masuk",
        },
        efficacy=0.70,
        effort="Sedang",
        cost_rp=120_000,
        affected_area="ruang_duduk",
        cannot_change_tags=("fasad", "struktur"),
    ),
    CatalogAction(
        action_id="A14.1",
        cue_code="H14",
        title="Cetak ulang papan menu/nama dengan huruf besar & kontras tinggi",
        spec_template="Ganti teks kecil/pudar di {lokasi_pasang} dengan desain {spesifikasi_font} agar terbaca dari jarak 5–8 meter.",
        default_slots={
            "lokasi_pasang": "spanduk utama dan papan menu depan",
            "spesifikasi_font": "huruf tebal minimal 4 cm dengan latar kontras",
        },
        efficacy=0.77,
        effort="Rendah",
        cost_rp=130_000,
        affected_area="papan_menu",
    ),
    CatalogAction(
        action_id="A14.2",
        cue_code="H14",
        title="Atasi silau kaca dengan posisi papan di luar & lampu baca fokus",
        spec_template="Pindahkan {media_info} ke sisi bebas pantulan di {lokasi_pasang} atau tambah stiker anti-silau agar tetap terbaca siang hari.",
        default_slots={
            "media_info": "daftar menu & jam buka",
            "lokasi_pasang": "luar kaca jendela / dinding teduh pintu masuk",
        },
        efficacy=0.74,
        effort="Sedang",
        cost_rp=140_000,
        affected_area="papan_menu",
    ),
)

ACTION_BY_ID: dict[str, CatalogAction] = {a.action_id: a for a in ACTION_CATALOG}


def get_actions_for_cue(
    cue_code: str,
    cannot_change: list[str] | None = None,
    *,
    allow_fallback: bool = True,
) -> list[CatalogAction]:
    """Ambil kandidat tindakan dari katalog yang cocok dengan ``cue_code`` dan tidak melanggar batasan pemilik."""
    blocked = {c.strip().lower() for c in (cannot_change or []) if c.strip()}
    candidates: list[CatalogAction] = []
    for act in ACTION_CATALOG:
        if act.cue_code != cue_code:
            continue
        if blocked and any(tag in b for tag in act.cannot_change_tags for b in blocked):
            continue
        candidates.append(act)
    if candidates or not allow_fallback:
        return candidates
    # Jika semua terblokir dan fallback diizinkan, kembalikan kandidat asli agar tidak kosong
    return [a for a in ACTION_CATALOG if a.cue_code == cue_code]


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
