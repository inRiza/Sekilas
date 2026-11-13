# Skema Database Awal (SQLAlchemy 2.0)

Mengacu pada **PRD v1.4** (Bagian 4.1, 4.2, 4.4, F1–F7). Semua model didefinisikan di [`entities.py`](entities.py) dan diekspor melalui [`__init__.py`](__init__.py).

## Hierarki Entitas (`1:N:N`)

```
users (UserAccount)
 └─ businesses (Business) ── primary_analysis_id ──> analyses.id
     └─ analyses (Analysis)
         ├─ analysis_contexts (AnalysisContext — 1:1 snapshot F1)
         ├─ menu_items (MenuItem — 1:N baris menu & harga)
         ├─ videos (VideoAsset — 1:1 video terburam + cashier_at_s + cek kualitas)
         ├─ transcript_segments (TranscriptSegment — 1:N segmen transkrip VLM & verifikasi)
         ├─ transcript_checkpoints (TranscriptCheckpoint — 1:N checkpoint pilihan AI)
         ├─ personas (Persona — 1:N 500/20 PersonaSpec hasil model diskret)
         ├─ simulation_runs (SimulationRun — 1:N run baseline / ablasi)
         │   └─ agent_decisions (AgentDecisionRecord — 1:N monolog pesan 1 + atribusi pesan 2)
         ├─ recommendations (RecommendationItem — 1:N saran perbaikan Pareto F6-D)
         ├─ projections (Projection — 1:N proyeksi perkiraan_cepat & terverifikasi_simulasi)
         ├─ twin_assets (TwinAsset — 1:1 aset 3D PLY/splat, camera_path, zona, kualitas)
         ├─ measurement_plans (MeasurementPlanRecord — 1:1 rencana tally manual F6-G)
         ├─ jobs (JobRecord — 1:N job asinkron + Idempotency-Key)
         └─ audit_logs (AuditLog — 1:N jejak audit perubahan pemilik & panggilan LLM/VLM)
```

## Daftar Tabel

| Tabel | Model | Fungsi & Aturan Kunci | PRD |
| --- | --- | --- | --- |
| `users` | `UserAccount` | Akun pemilik UMKM & kuota harian (`daily_run_quota`, `daily_projection_quota`) | 4.1, 4.4.6 |
| `businesses` | `Business` | Profil tetap cabang usaha, `default_context` untuk prefill, dan `primary_analysis_id` | 4.1, 4.4.1 |
| `analyses` | `Analysis` | Siklus analisis, status wizard, `stale` + `stale_reasons`, `transcript_version`, `persona_version` | 4.1, 4.4.2 |
| `analysis_contexts` | `AnalysisContext` | Snapshot 5 bagian F1 (Info dasar, Pelanggan & tujuan, Level harga, Jam operasional, Penjualan & fasilitas) + versi matriks $W$ | 4.1, F1 |
| `menu_items` | `MenuItem` | Daftar menu & harga porsi per analisis (`manual`, `excel`, `foto`) | F1 |
| `videos` | `VideoAsset` | Metadata video terburam, `cashier_at_s` (akhir jalur), hasil cek kualitas & jumlah blur | F2, 4.3 |
| `transcript_segments` | `TranscriptSegment` | Segmen waktu (`jalan`/`pintu`/`dalam`), `narrative`, `not_visible`, `confidence`, `camera_pose` | F3, F4 |
| `transcript_checkpoints` | `TranscriptCheckpoint` | Checkpoint jalur yang ditandai VLM (`terlihat_dari_jalan`, `pintu_atau_tangga`, dst.) | 4.3, F3 |
| `personas` | `Persona` | `PersonaSpec` hasil sampling terstratifikasi seed tetap (`discrete_traits`, `concrete_facts`) | F5 |
| `simulation_runs` | `SimulationRun` | Run `baseline` atau `ablation`, mengunci versi transkrip, persona, katalog, model, dan prompt | 4.1, F5 |
| `agent_decisions` | `AgentDecisionRecord` | Satu baris per agen per run: keputusan pesan 1 + atribusi katalog hipotesis pesan 2 beserta kutipan | F5, F6-C |
| `recommendations` | `RecommendationItem` | Rekomendasi Pareto dari katalog tindakan (`action_id`, `hypothesis_id`, `share`, `lift`, `priority_tag`) | F6-D |
| `projections` | `Projection` | Proyeksi dua tingkat (`perkiraan_cepat` & `terverifikasi_simulasi`) dengan `cache_key` | 4.4.4, F6-D |
| `twin_assets` | `TwinAsset` | File 3D (`.ply`/`.splat`), `camera_path`, `up_vector`, `zones`, dan gerbang kualitas frame | F7 |
| `measurement_plans` | `MeasurementPlanRecord` | Lembar tally cetak dengan titik berdiri pemilik & jadwal jam ramai | F6-G |
| `jobs` | `JobRecord` | Antrean pekerjaan asinkron (`202 Accepted`) dengan `idempotency_key` | 4.2 |
| `audit_logs` | `AuditLog` | Jejak audit edit pemilik dan panggilan model | 4.1, 7 |
