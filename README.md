# Sekilas

Simulator pengunjung untuk UMKM makanan, dengan dasbor analitik dan Visual Twin. Spesifikasi: [context/PRD.md](context/PRD.md).

```
fe/          Next.js: wizard halaman 1-9, dasbor, penampil 3D
be/          FastAPI: API, transkrip, simulasi agen, dasbor, RAG
twin/        Worker GPU: video -> Visual Twin (nerfstudio, SAM 2, COLMAP/VGGT)
research/rea Catatan reverse engineering repo 3D
context/     PRD
```

## Menjalankan lokal

```bash
docker compose up -d db redis
cd be && cp .env.example .env && uv sync && uv run uvicorn app.main:app --reload
cd fe && bun install && bun dev
```

Worker Visual Twin butuh GPU NVIDIA, lihat [twin/README.md](twin/README.md).
