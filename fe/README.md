# Sekilas Frontend (`fe/`)

Aplikasi web Next.js 16 (App Router, React 19, Tailwind CSS v4) untuk **Sekilas** — simulator keputusan calon pelanggan dan *Visual Twin 3D* bagi pemilik UMKM kuliner. Mengikuti sistem desain *Editorial Warmth* ([`design.md`](design.md)).

## Menjalankan

```bash
bun install
bun dev
```

Buka [http://localhost:3000](http://localhost:3000) di peramban. Secara bawaan aplikasi terhubung ke API backend di `http://localhost:8000` (dapat diubah melalui `NEXT_PUBLIC_API_URL`) dan memiliki *fallback* penyimpanan lokal otomatis saat dijalankan mandiri.

## Pemeriksaan Tipe & Linter

```bash
npx next typegen
npm run lint
npx tsc --noEmit
```

## Peta Rute Utama

| Rute | Deskripsi |
| :--- | :--- |
| `/` | Landing page interaktif (*MacbookScroll* & *HairlineStall* 3D) |
| `/masuk`, `/daftar` | Halaman autentikasi pengguna |
| `/businesses` | **Manajemen Bisnis (CRUD):** Daftar tempat usaha/cabang, tambah cabang, edit identitas cabang, hapus cabang |
| `/businesses/analyses` | **Manajemen Analisis Cabang (CRUD):** Riwayat analisis per cabang, buat analisis baru, ubah nama, atur analisis utama (`primary_analysis_id`), hapus analisis |
| `/business/analysis/konteks` | **Langkah 1 Wizard (F1):** Form Konteks Usaha 5 seksi (8 bidang wajib, input menu manual/Excel/foto, jam buka & ramai, penjualan & fasilitas parkir) |
| `/business/analysis/video` | **Langkah 2 Wizard (F2):** Panduan & unggah rekaman video ponsel |
| `/business/analysis/proses` | **Langkah 3 Wizard (F3):** Status pemrosesan ekstraksi VLM & pembangunan 3D |
| `/business/analysis/verifikasi` | **Langkah 4 Wizard (F4):** Tinjau dan koreksi kartu transkrip kejadian |
| `/business/analysis/simulasi` | **Langkah 5 Wizard (F5):** Pantau jalannya simulasi agen pelanggan |
| `/business/analysis` | **Dasbor Hasil (F6 & F7):** KPI corong keputusan, penampil Visual Twin 3D, rekomendasi Pareto, proyeksi *what-if*, & asisten tanya jawab |
| `/business/analysis/agents` | **Jelajah Agen:** Filter dan baca monolog keputusan tiap persona agen |
| `/dasbor`, `/hasil` | *Workbench* lokal untuk pengujian *pipeline* 3D COLMAP/Brush (`twin/scripts/local_twin.sh`) |

## Struktur Kode (`src/`)

```text
src/
  app/                    Halaman App Router & route API lokal (/api/twin)
  components/
    brand/                Logo & identitas visual Sekilas
    dashboard/            Penampil 3D Gaussian Splat / Point Cloud & lembar cetak pengukuran
    landing/              Komponen interaktif landing page
    layout/               AppShell, AppSidebar (pohon bisnis & analisis reaktif), AppNavbar, WizardProgress
    ui/                   Primitif UI (Button, Dialog, Select, TimeSelect, Form, Badge, Sidebar, Icons)
  lib/
    api/crud.ts           Klien CRUD untuk /api/v1/businesses, /analyses, dan /context + sinkronisasi state
    mock/                 Data referensi awal untuk demo Selasar Kopi & Roti
    twin/                 Utilitas pemuatan aset 3D lokal
  types/
    api.ts                Single Source of Truth kontrak tipe data Frontend <-> Backend (PRD v1.4)
```
