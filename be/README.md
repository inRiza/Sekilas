# Sekilas Backend

FastAPI: API wizard, transkrip, simulasi agen, dasbor analitik, RAG. Visual Twin dibangun oleh worker GPU terpisah di `../twin`.

## Menjalankan

```bash
cp .env.example .env
docker compose -f ../docker-compose.yml up -d db redis
uv sync
uv run uvicorn app.main:app --reload        # http://localhost:8000/docs
uv run arq app.workers.tasks.WorkerSettings # job transkrip & simulasi
uv run pytest
```

## Demo Visual Twin (tanpa agen)

Alur yang sudah tersambung ke database: bisnis -> analisis -> unggah video -> job Visual Twin
(pipeline lokal `twin/scripts/local_twin.sh`, PRD 11.2) -> dasbor menampilkan splat.

```bash
docker compose -f ../docker-compose.yml up -d db   # Postgres
uv run uvicorn app.main:app --port 8000            # tabel dibuat otomatis + data demo
cd ../fe && bun dev                                # http://localhost:3000/businesses
```

- Prasyarat pipeline lokal: `twin/scripts/setup_local.sh` (COLMAP + Brush) dan `ffmpeg`.
- Job dijalankan di thread dalam proses API (tanpa Redis); hasil 3D diterbitkan ke
  `fe/public/samples/<id>.*` dan metadatanya disimpan di tabel `twin_assets`.
- Bisnis demo `biz_demo` / analisis `ana_demo` (baca-saja) memakai hasil 3D contoh yang sudah ada.
- Transkrip VLM dan simulasi agen belum tersambung; halaman itu masih memakai data contoh.

## Struktur

```
app/
  main.py                 entry FastAPI
  core/                   config, db
  api/v1/routes/          satu file per halaman/fitur PRD
  schemas/                kontrak data (Pydantic) = kontrak FE <-> BE
  models/                 tabel SQLAlchemy (rencana di models/README.md)
  services/
    context/              F1 baca foto menu
    transcript/           F2-F4 cek kualitas, ekstraksi kejadian, edit, penjangkaran 3D
    simulation/           F5 populasi, model logit, skenario, ablasi, Pareto
    narrative/            F5 narasi LLM + cek konsistensi
    report/               F6 dasbor, verifier angka, rencana pengukuran
    rag/                  F8 ingest, retrieve, jawaban bersumber
    twin/                 F7 klien antrean ke worker GPU
  workers/                job arq (Redis)
  llm/                    klien LLM + prompt berversi
knowledge_base/           isi RAG (cues, actions, guides)
tests/
```

Prinsip yang dijaga kode: keputusan agen dihitung (seed tetap), LLM hanya menulis narasi; angka di dasbor wajib lolos verifier; rekomendasi hanya dari ablasi.
