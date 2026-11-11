# Sekilas Twin Worker

Worker GPU yang mengubah video terburam menjadi Visual Twin (PRD F7, 11.1). Dipisah dari `be/` karena butuh CUDA dan dependensi berat (nerfstudio, gsplat, SAM 2).

## Alur

```
extract_frames -> mask (SAM 2) -> poses (VGGT, fallback COLMAP) -> transforms.json
  -> reconstruct (pointcloud / splatfacto) -> align -> anchor_events -> export
```

Gagal di tahap pose -> mode `frame_strip`. Gagal di rekonstruksi -> mode `path_2d`. Dasbor tidak pernah menampilkan galat teknis.

## Dependensi

- `pyproject.toml`: dependensi ringan, bisa di laptop mana pun.
- `requirements-gpu.txt`: tambahan di atas image nerfstudio (Linux + CUDA saja).

## Menjalankan

```bash
# Laptop (tanpa GPU): hanya kontrak dan tes
uv sync && uv run pytest

# Mesin GPU NVIDIA (lewat Docker; base image nerfstudio sudah berisi nerfstudio, gsplat, COLMAP)
docker compose --profile gpu up twin               # worker antrean (M8b)
docker compose run --rm twin ./scripts/baseline.sh /data/video.mp4 toko-a   # spike REA (M8a)
```

Lisensi: hanya komponen berstatus "Produksi" di tabel PRD 11.1 yang boleh masuk image ini.
