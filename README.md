# Sekilas

Simulator calon pelanggan berbasis *Multi-Agent LLM* dan *Visual Twin 3D* untuk membantu UMKM kuliner memetakan titik gesekan fisik toko dari satu rekaman video ponsel. Spesifikasi lengkap: [context/PRD.md](context/PRD.md) (v1.4) & [context/design.md](context/design.md).

## Struktur Repositori

```text
fe/          Next.js 16 (App Router): Landing page, Manajemen Bisnis/Cabang, Wizard Analisis, Dasbor & Penampil 3D
be/          FastAPI + SQLAlchemy 2.0: CRUD Bisnis/Analisis/Konteks, Transkrip VLM, Simulasi Agen, Rekomendasi & Dasbor
twin/        Pipeline Visual Twin 3D: Video -> Frame -> COLMAP -> .ply / .path.json / Brush Gaussian Splat (.splat)
supabase/    Migrasi SQL (`migrations/`) & data awal (`seed.sql`) yang terhubung ke proyek Supabase
scripts/     Skrip bantu lokal (`dev-e2e.sh`)
context/     PRD v1.4 & Panduan Sistem Desain (Editorial Warmth)
```

## Database, Storage & Migrasi (Supabase / PostgreSQL)

Skema database terdiri dari **17 tabel** di skema `public` dengan *Row-Level Security (RLS)* dan indeks *foreign key* penuh:
- **Hierarki Utama:** `users` → `businesses` (cabang/tempat usaha) → `analyses` (siklus analisis video)
- **F1 (Konteks & Menu):** `analysis_contexts`, `menu_items`
- **F2–F4 (Video & Transkrip):** `videos`, `transcript_segments`, `transcript_checkpoints`
- **F5 (Persona & Simulasi):** `personas`, `simulation_runs`, `agent_decisions`
- **F6–F7 (Hasil, 3D & Pengukuran):** `recommendations`, `projections`, `twin_assets`, `measurement_plans`
- **Infrastruktur:** `jobs`, `audit_logs`

Supabase Storage dipisah menjadi dua bucket:
- **`videos` (privat):** menyimpan video terburam dan frame bukti; diakses via Signed URL dari backend menggunakan `SUPABASE_SECRET_KEY`.
- **`twins` (publik):** menyimpan berkas 3D Visual Twin (`.splat`, `.ply`, `.path.json`, `.json`).

File migrasi berada di [`supabase/migrations/`](supabase/migrations/) dan data awal demo berada di [`supabase/seed.sql`](supabase/seed.sql).

## Menjalankan Secara Lokal

### 1. Backend (`be/`)
Gunakan koneksi **Supabase Postgres** (lihat template di [`be/.env.example`](be/.env.example)) atau PostgreSQL lokal via Docker Compose:

```bash
# Opsional bila memakai DB & Redis lokal:
docker compose up -d db redis

cd be
cp .env.example .env
# Isi SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, DATABASE_URL, serta GEMINI_API_KEY / OPENAI_API_KEY
uv sync
uv run uvicorn app.main:app --reload        # API & Swagger UI: http://localhost:8000/docs
```

Menjalankan *linter* dan pengujian backend:
```bash
cd be
uv run ruff check .
LLM_MODE=mock uv run pytest
```

### 2. Frontend (`fe/`)
```bash
cd fe
cp .env.example .env.local
bun install                                 # atau: npm install
bun dev                                     # Aplikasi web: http://localhost:3000
```

Menjalankan pengujian, pemeriksaan tipe, dan *linter* frontend:
```bash
cd fe
npm test && npx tsc --noEmit && npm run lint
```

### 3. Visual Twin 3D (`twin/`)
Dengan `TWIN_LOCAL_RUNNER=true` di `be/.env`, proses rekonstruksi 3D dijalankan otomatis oleh backend melalui [`twin/scripts/local_twin.sh`](twin/scripts/local_twin.sh) dan membutuhkan `colmap`, `ffmpeg`, `brush_app` (di `twin/.tools/brush_app`), serta environment Python `twin/`:

- **macOS (Apple Silicon):**
  ```bash
  brew install ffmpeg
  ./twin/scripts/setup_local.sh
  ```
- **Linux (`x86_64`):** pastikan `colmap` dan `ffmpeg` tersedia di `PATH` (mis. via `apt` atau `micromamba` dari `conda-forge`), letakkan binary Linux `brush_app` (v0.3.0) di `twin/.tools/brush_app`, lalu jalankan:
  ```bash
  cd twin && uv sync
  ```

Lihat panduan lengkap dan opsi worker GPU di [twin/README.md](twin/README.md).
