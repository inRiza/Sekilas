# Model database

Tabel SQLAlchemy ditambahkan di sini per milestone. Rencana tabel:

| Tabel | Isi | PRD |
|---|---|---|
| `analyses` | satu analisis per video, status alur wizard, flag kedaluwarsa | 5.2 |
| `business_contexts` | isian konteks usaha + menu | F1 |
| `videos` | metadata video, hasil cek kualitas, data sensor gerak | F2 |
| `transcript_entries` | entri kejadian + posisi 3D + jejak audit edit | F3, F4 |
| `twin_assets` | status build, path file 3D, jalur kamera, zona | F7 |
| `simulation_runs` | seed, jumlah agen, skenario, versi prompt | F5 |
| `agents` | sifat, keputusan, titik berhenti, narasi | F5 |
| `recommendations` | hasil ablasi, dampak, usaha, status Prioritas/Nanti | F6 |
| `kb_documents` / `kb_chunks` | basis pengetahuan + embedding pgvector | F8 |
| `audit_log` | perubahan oleh pemilik dan panggilan LLM | 7 |
