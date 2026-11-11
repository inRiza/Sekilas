# Basis Pengetahuan (RAG, PRD F8)

Dikurasi tim. Satu file Markdown per entri, dengan frontmatter:

```markdown
---
id: cue-open-hours
title: Jam buka terlihat
type: cue | action | guide
cue_category: open_hours_visible
---
Isi...
```

| Folder | Isi | Dipakai di |
|---|---|---|
| `cues/` | definisi kategori isyarat, contoh, cara membaca dari video | F3 (prompt transkrip) |
| `actions/` | cara menjalankan perbaikan, perkiraan biaya dan lama | F6 kartu "cara menjalankan" |
| `guides/` | panduan praktik UMKM makanan | Tanya Sekilas |

Muat ke database: `uv run python -m app.services.rag.ingest` (TODO M11).
