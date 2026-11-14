# Sekilas Backend (`be/`)

Layanan backend FastAPI dengan SQLAlchemy 2.0 untuk manajemen tempat usaha/cabang, siklus analisis, konteks & menu usaha (F1), ekstraksi transkrip video (F2–F4), simulasi agen pelanggan (F5), agregasi dasbor & proyeksi *what-if* (F6), serta asisten RAG (F8). Worker GPU untuk rekonstruksi Visual Twin 3D berada di [`../twin`](../twin/README.md).

## Menjalankan

```bash
cp .env.example .env
# Isi DATABASE_URL dengan URI Supabase Postgres atau jalankan Postgres lokal:
docker compose -f ../docker-compose.yml up -d db redis

uv sync
uv run uvicorn app.main:app --reload        # http://localhost:8000/docs
uv run arq app.workers.tasks.WorkerSettings # worker antrean job asinkron
```

## Pengujian & Linter

```bash
uv run ruff check .
uv run pytest
```

## Demo Visual Twin (tanpa agen)

Alur yang sudah tersambung ke database: bisnis -> analisis -> unggah video -> job Visual Twin
(pipeline lokal `twin/scripts/local_twin.sh`, PRD 11.2) -> dasbor menampilkan splat.

```bash
docker compose -f ../docker-compose.yml up -d db   # Postgres
uv run uvicorn app.main:app --port 8000            # skema dari supabase/migrations + seed.sql
cd ../fe && bun dev                                # http://localhost:3000/businesses
```

- Prasyarat pipeline lokal: `twin/scripts/setup_local.sh` (COLMAP + Brush) dan `ffmpeg`.
- Job dijalankan di thread dalam proses API (tanpa Redis); hasil 3D diterbitkan ke
  `fe/public/samples/<id>.*` dan metadatanya disimpan di tabel `twin_assets`.
- Video terburam diunggah ke Supabase Storage dan salinannya ke `POST /analyses/{id}/video/file`
  (disimpan di `STORAGE_DIR/videos`); bila salinan lokal tidak ada, job mengunduh dari `storage_key`.
- `POST /analyses/{id}/video/complete` memulai job twin asli; progres di `GET /analyses/{id}/twin`.
- Analisis demo `selasar-kopi` (dari `supabase/seed.sql`) memakai hasil 3D contoh yang sudah ada.
- Transkrip VLM dan simulasi agen masih dibangkitkan dari templat (`services/crud.py`).

## Struktur Direktori

```text
app/
  main.py                 Entry point FastAPI & konfigurasi CORS
  core/
    config.py             Konfigurasi environment (Pydantic Settings)
    db.py                 Engine SQLAlchemy, SessionLocal, dan SessionDep
  models/
    base.py               DeclarativeBase & TimestampMixin
    entities.py           17 model ORM SQLAlchemy 2.0 (selaras dengan Supabase)
    README.md             Dokumentasi skema tabel & relasi
  schemas/                Kontrak data Pydantic (sinkron dengan fe/src/types/api.ts)
    business.py           BusinessCreate, BusinessUpdate, BusinessOut
    analysis.py           AnalysisCreate, AnalysisUpdate, Analysis
    context.py            BusinessContext (5 seksi F1), MenuItem, kalkulasi level harga median
    ...
  api/v1/routes/
    businesses.py         CRUD Tempat Usaha & Cabang (/api/v1/businesses)
    analyses.py           CRUD Siklus Analisis (/api/v1/analyses)
    context.py            CRUD Konteks Usaha & Menu + OCR foto (/api/v1/analyses/{id}/context)
    videos.py             Unggah & cek kualitas video
    transcripts.py        Transkrip kejadian VLM & konfirmasi pemilik
    simulations.py        Simulasi populasi agen & skenario
    dashboard.py          Agregasi metrik dasbor & rekomendasi Pareto
    twin.py               Metadata Visual Twin 3D
    measurement.py        Rencana pengukuran lapangan
    assistant.py          Tanya jawab RAG berjangkar bukti
  services/
    crud.py               Transformasi ORM <-> Pydantic, upsert konteks & menu, penandaan stale
    context/              F1 pembacaan foto menu (OCR)
    transcript/           F2–F4 cek kualitas, ekstraksi kejadian, edit, penjangkaran 3D
    simulation/           F5 populasi diskret, model keputusan, ablasi, Pareto
    narrative/            F5 penulisan narasi LLM & cek konsistensi
    report/               F6 ringkasan dasbor, verifier angka, rencana pengukuran
    rag/                  F8 ingest, retriever, jawaban bersumber
    twin/                 F7 klien antrean ke worker GPU
  workers/                Definisi job asinkron arq (Redis)
  llm/                    Klien LLM/VLM & template prompt berversi
knowledge_base/           Dokumen referensi RAG (cues, actions, guides)
tests/
  api/                    Tes endpoint (health, alur penuh CRUD bisnis/analisis/konteks)
  models/                 Tes registrasi tabel & mapper SQLAlchemy
  simulation/             Tes pembangkitan populasi & kurva Pareto
```

## Ringkasan Endpoint CRUD Utama

| Metode | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/v1/businesses` | Daftar tempat usaha/cabang beserta jumlah analisis & konteks bawaan |
| `POST` | `/api/v1/businesses` | Buat tempat usaha/cabang baru |
| `GET` | `/api/v1/businesses/{id}` | Detail tempat usaha |
| `PATCH` | `/api/v1/businesses/{id}` | Perbarui nama, cabang, kategori, alamat, atau `primary_analysis_id` |
| `DELETE` | `/api/v1/businesses/{id}` | Hapus tempat usaha beserta seluruh analisis di bawahnya |
| `GET` | `/api/v1/businesses/{id}/analyses` | Daftar analisis milik cabang tertentu |
| `POST` | `/api/v1/businesses/{id}/analyses` | Buat analisis baru di cabang tersebut (otomatis *prefill* dari `default_context`) |
| `GET` | `/api/v1/analyses` | Daftar seluruh analisis (opsional `?business_id=...`) |
| `POST` | `/api/v1/analyses` | Buat analisis baru |
| `GET` | `/api/v1/analyses/{id}` | Detail analisis beserta konteks & daftar menu |
| `PATCH` | `/api/v1/analyses/{id}` | Ubah nama analisis, status, `stale`, atau jadikan analisis utama (`set_as_primary`) |
| `DELETE` | `/api/v1/analyses/{id}` | Hapus analisis (otomatis mempromosikan analisis terbaru bila yang dihapus adalah utama) |
| `GET` | `/api/v1/analyses/{id}/context` | Ambil konteks usaha 5 seksi & daftar menu |
| `PUT` | `/api/v1/analyses/{id}/context` | Simpan/perbarui konteks & menu, hitung ulang level harga median, dan sinkronkan ke cabang |
