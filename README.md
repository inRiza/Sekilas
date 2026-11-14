# Sekilas

Simulator calon pelanggan berbasis *Multi-Agent LLM* dan *Visual Twin 3D* untuk membantu UMKM kuliner memetakan titik gesekan fisik toko dari satu rekaman video ponsel. Spesifikasi lengkap: [context/PRD.md](context/PRD.md) (v1.4) & [context/design.md](context/design.md).

## Struktur Repositori

```text
fe/          Next.js 16 (App Router): Landing page, Manajemen Bisnis/Cabang, Wizard Analisis, Dasbor & Penampil 3D
be/          FastAPI + SQLAlchemy 2.0: CRUD Bisnis/Analisis/Konteks, Transkrip VLM, Simulasi Agen, Dasbor, RAG
twin/        Worker GPU: Video -> Visual Twin 3D (COLMAP / Brush Gaussian Splatting / Point Cloud)
supabase/    Migrasi SQL (`migrations/`) & data awal (`seed.sql`) yang terhubung ke proyek Supabase
context/     PRD v1.4 & Panduan Sistem Desain (Editorial Warmth)
```

## Database & Migrasi (Supabase / PostgreSQL)

Skema database terdiri dari **17 tabel** di skema `public` dengan *Row-Level Security (RLS)* dan indeks *foreign key* penuh:
- **Hierarki Utama:** `users` → `businesses` (cabang/tempat usaha) → `analyses` (siklus analisis video)
- **F1 (Konteks & Menu):** `analysis_contexts`, `menu_items`
- **F2–F4 (Video & Transkrip):** `videos`, `transcript_segments`, `transcript_checkpoints`
- **F5 (Persona & Simulasi):** `personas`, `simulation_runs`, `agent_decisions`
- **F6–F7 (Hasil, 3D & Pengukuran):** `recommendations`, `projections`, `twin_assets`, `measurement_plans`
- **Infrastruktur:** `jobs`, `audit_logs`

File migrasi berada di [`supabase/migrations/`](supabase/migrations/) dan data awal demo berada di [`supabase/seed.sql`](supabase/seed.sql).

## Menjalankan Secara Lokal

### 1. Backend (`be/`)
Kamu bisa menggunakan koneksi **Supabase Postgres** (lihat template di `be/.env.example`) atau PostgreSQL lokal via Docker Compose:

```bash
# Opsional bila memakai DB & Redis lokal:
docker compose up -d db redis

cd be
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload        # API & Swagger UI: http://localhost:8000/docs
```

Menjalankan *linter* dan pengujian backend:
```bash
cd be
uv run ruff check .
uv run pytest
```

### 2. Frontend (`fe/`)
```bash
cd fe
bun install
bun dev                                     # Aplikasi web: http://localhost:3000
```

Menjalankan pemeriksaan tipe dan *linter* frontend:
```bash
cd fe
npx next typegen && npm run lint && npx tsc --noEmit
```

### 3. Worker Visual Twin 3D (`twin/`)
Worker rekonstruksi 3D dijalankan terpisah dan mendukung GPU NVIDIA (lihat panduan lengkap di [twin/README.md](twin/README.md)).
