-- Seed initial demo user, businesses, analyses, contexts, and menu items (idempotent)
INSERT INTO public.users (id, name, email, daily_run_quota, daily_projection_quota)
VALUES ('usr_01', 'Budi Santoso', 'budi.selasar@gmail.com', 10, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.businesses (id, user_id, name, branch_name, category, address, default_context)
VALUES
(
    'biz_selasar_dipatiukur',
    'usr_01',
    'Selasar Kopi & Roti',
    'Dipatiukur (Pusat)',
    'kedai',
    'Jl. Dipati Ukur No. 42, Coblong, Bandung',
    '{
        "business_type": "kedai",
        "business_name": "Selasar Kopi & Roti",
        "location_name": "Jl. Dipati Ukur No. 42, Coblong, Bandung",
        "location_lat": -6.8915,
        "location_lng": 107.6168,
        "location_description": "Lantai 2 ruko warna abu-abu, tangga naik berada persis di sebelah minimarket",
        "surroundings_type": "dekat_kampus",
        "surroundings": ["dekat_kampus", "jalan_utama"],
        "passersby": ["mahasiswa", "pekerja_kantor", "pengendara"],
        "business_goal": "lebih_banyak_pembeli_baru",
        "fixed_constraints": ["lokasi", "fasad"],
        "calculated_price_level": "hemat",
        "opening_hours": {"open": "08:00", "close": "23:00"},
        "rush_hours": [{"start": "12:00", "end": "14:00"}, {"start": "19:00", "end": "21:30"}],
        "daily_sales_rp": 1850000,
        "daily_visitors": 95,
        "parking": ["motor"],
        "menu_items": [
            {"id": "m1", "name": "Es Kopi Susu Selasar", "price": 18000},
            {"id": "m2", "name": "Roti Panggang Cokelat Keju", "price": 15000},
            {"id": "m3", "name": "Americano Dingin", "price": 16000},
            {"id": "m4", "name": "Nasi Kulit Sambal Korek", "price": 24000},
            {"id": "m5", "name": "Matcha Latte", "price": 22000}
        ]
    }'::jsonb
),
(
    'biz_selasar_dago',
    'usr_01',
    'Selasar Kopi & Roti',
    'Dago Atas',
    'kafe',
    'Jl. Ir. H. Juanda No. 185, Dago, Bandung',
    '{
        "business_type": "kafe",
        "business_name": "Selasar Kopi & Roti - Dago",
        "location_name": "Jl. Ir. H. Juanda No. 185, Dago, Bandung",
        "location_lat": -6.8722,
        "location_lng": 107.6186,
        "location_description": "Bangunan kaca dengan halaman outdoor di lereng bukit Dago",
        "surroundings_type": "jalan_utama",
        "surroundings": ["jalan_utama", "dekat_kampus"],
        "passersby": ["mahasiswa", "keluarga", "pengendara"],
        "business_goal": "lebih_banyak_pembeli_baru",
        "fixed_constraints": ["lokasi", "fasad"],
        "calculated_price_level": "hemat",
        "opening_hours": {"open": "08:00", "close": "23:00"},
        "rush_hours": [{"start": "12:00", "end": "14:00"}, {"start": "19:00", "end": "21:30"}],
        "daily_sales_rp": 2400000,
        "daily_visitors": 110,
        "parking": ["motor", "mobil"],
        "menu_items": [
            {"id": "m1", "name": "Es Kopi Susu Selasar", "price": 18000},
            {"id": "m2", "name": "Roti Panggang Cokelat Keju", "price": 15000},
            {"id": "m3", "name": "Americano Dingin", "price": 16000},
            {"id": "m4", "name": "Nasi Kulit Sambal Korek", "price": 24000},
            {"id": "m5", "name": "Matcha Latte", "price": 22000}
        ]
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.analyses (id, business_id, name, status, is_demo, total_agents, quality_label, thumbnail_url, created_at)
VALUES
(
    'selasar-kopi',
    'biz_selasar_dipatiukur',
    'Analisis Fasad & Tangga Depan (Video 48s)',
    'ready',
    true,
    20,
    'Kualitas baik',
    '/samples/selasar-thumb.jpg',
    '2026-11-13T14:30:00Z'
),
(
    'selasar-dago-eval',
    'biz_selasar_dago',
    'Evaluasi Jalur Masuk & Kasir Outdoor',
    'ready',
    true,
    20,
    'Kualitas baik',
    '/samples/bakso-thumb.jpg',
    '2026-11-12T09:15:00Z'
),
(
    'selasar-night-run',
    'biz_selasar_dipatiukur',
    'Eksperimen Lampu Tangga & Papan Nama Malam',
    'processing',
    true,
    20,
    'Kualitas baik',
    '/samples/warkop-thumb.jpg',
    '2026-10-28T18:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.businesses SET primary_analysis_id = 'selasar-kopi' WHERE id = 'biz_selasar_dipatiukur' AND primary_analysis_id IS NULL;
UPDATE public.businesses SET primary_analysis_id = 'selasar-dago-eval' WHERE id = 'biz_selasar_dago' AND primary_analysis_id IS NULL;

INSERT INTO public.analysis_contexts (
    id, analysis_id, business_type, business_name, location_name, location_lat, location_lng,
    location_description, surroundings, passersby, business_goal, fixed_constraints,
    calculated_price_level, open_hour, close_hour, rush_hours, daily_sales_rp, daily_visitors, parking
)
VALUES
(
    'ctx_selasar_kopi',
    'selasar-kopi',
    'kedai',
    'Selasar Kopi & Roti',
    'Jl. Dipati Ukur No. 42, Coblong, Bandung',
    -6.8915,
    107.6168,
    'Lantai 2 ruko warna abu-abu, tangga naik berada persis di sebelah minimarket',
    '["dekat_kampus", "jalan_utama"]'::jsonb,
    '["mahasiswa", "pekerja_kantor", "pengendara"]'::jsonb,
    'lebih_banyak_pembeli_baru',
    '["lokasi", "fasad"]'::jsonb,
    'hemat',
    '08:00',
    '23:00',
    '[{"start": "12:00", "end": "14:00"}, {"start": "19:00", "end": "21:30"}]'::jsonb,
    1850000,
    95,
    '["motor"]'::jsonb
),
(
    'ctx_selasar_dago',
    'selasar-dago-eval',
    'kafe',
    'Selasar Kopi & Roti - Dago',
    'Jl. Ir. H. Juanda No. 185, Dago, Bandung',
    -6.8722,
    107.6186,
    'Bangunan kaca dengan halaman outdoor di lereng bukit Dago',
    '["jalan_utama", "dekat_kampus"]'::jsonb,
    '["mahasiswa", "keluarga", "pengendara"]'::jsonb,
    'lebih_banyak_pembeli_baru',
    '["lokasi", "fasad"]'::jsonb,
    'hemat',
    '08:00',
    '23:00',
    '[{"start": "12:00", "end": "14:00"}, {"start": "19:00", "end": "21:30"}]'::jsonb,
    2400000,
    110,
    '["motor", "mobil"]'::jsonb
),
(
    'ctx_selasar_night',
    'selasar-night-run',
    'kedai',
    'Selasar Kopi & Roti',
    'Jl. Dipati Ukur No. 42, Coblong, Bandung',
    -6.8915,
    107.6168,
    'Lantai 2 ruko warna abu-abu, tangga naik berada persis di sebelah minimarket',
    '["dekat_kampus", "jalan_utama"]'::jsonb,
    '["mahasiswa", "pekerja_kantor", "pengendara"]'::jsonb,
    'ramaikan_jam_sepi',
    '["lokasi", "fasad"]'::jsonb,
    'hemat',
    '08:00',
    '23:00',
    '[{"start": "19:00", "end": "22:00"}]'::jsonb,
    1850000,
    95,
    '["motor"]'::jsonb
)
ON CONFLICT (analysis_id) DO NOTHING;

INSERT INTO public.menu_items (id, analysis_id, name, price, source, sort_order)
VALUES
('mi_sk_1', 'selasar-kopi', 'Es Kopi Susu Selasar', 18000, 'manual', 0),
('mi_sk_2', 'selasar-kopi', 'Roti Panggang Cokelat Keju', 15000, 'manual', 1),
('mi_sk_3', 'selasar-kopi', 'Americano Dingin', 16000, 'manual', 2),
('mi_sk_4', 'selasar-kopi', 'Nasi Kulit Sambal Korek', 24000, 'manual', 3),
('mi_sk_5', 'selasar-kopi', 'Matcha Latte', 22000, 'manual', 4),
('mi_sd_1', 'selasar-dago-eval', 'Es Kopi Susu Selasar', 18000, 'manual', 0),
('mi_sd_2', 'selasar-dago-eval', 'Roti Panggang Cokelat Keju', 15000, 'manual', 1),
('mi_sd_3', 'selasar-dago-eval', 'Americano Dingin', 16000, 'manual', 2),
('mi_sd_4', 'selasar-dago-eval', 'Nasi Kulit Sambal Korek', 24000, 'manual', 3),
('mi_sd_5', 'selasar-dago-eval', 'Matcha Latte', 22000, 'manual', 4)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- Seed F2 (Video), F3/F4 (Transcript Segments), F5 (Personas, SimulationRun, AgentDecisions),
-- F6/F7 (Recommendations, TwinAssets, MeasurementPlans) for selasar-kopi
-- ============================================================================

INSERT INTO public.videos (
    id, analysis_id, storage_key, original_filename, duration_s, cashier_at_s,
    width, height, accepted, quality_checks, blurred_faces_count, blurred_plates_count
)
VALUES (
    'vid_selasar_kopi',
    'selasar-kopi',
    'videos/selasar-kopi/video_rekaman_selasar.mp4',
    'video_rekaman_selasar.mp4',
    48.0,
    48.0,
    1920,
    1080,
    true,
    '{"resolution": "1080 px, ideal", "stability": "Stabil, putaran di bawah 45°/detik", "lighting": "Terang dan jelas"}'::jsonb,
    14,
    6
)
ON CONFLICT (analysis_id) DO NOTHING;

INSERT INTO public.transcript_segments (
    id, analysis_id, timestamp_start, timestamp_end, frame_keys, vantage, zone_id,
    narrative, not_visible, confidence, is_confirmed_by_owner, edited_by_owner
)
VALUES
(
    'seg_01',
    'selasar-kopi',
    0,
    8,
    '["frame_001.jpg", "frame_003.jpg"]'::jsonb,
    'jalan',
    'trotoar_depan',
    'Kamera berjalan di trotoar sisi jalan utama. Terlihat plang nama kecil bertuliskan "Selasar Kopi" di lantai 2 ruko, namun font relatif tipis. Bagian bawah ruko tertutup jejeran motor parkir.',
    'Daftar menu, harga, jam buka, dan tanda BUKA/TUTUP sama sekali tidak terbaca dari sudut jalan ini.',
    'stabil',
    true,
    false
),
(
    'seg_02',
    'selasar-kopi',
    8,
    18,
    '["frame_008.jpg", "frame_012.jpg"]'::jsonb,
    'jalan',
    'depan_ruko',
    'Mendekat ke depan halaman ruko. Lorong tangga ke lantai 2 terlihat di celah antara ruko dan minimarket. Tangga cukup curam dan pencahayaan agak temaram.',
    'Tidak ada standing banner atau papan penunjuk arah di depan tangga.',
    'tidak_pasti',
    false,
    false
),
(
    'seg_03',
    'selasar-kopi',
    18,
    32,
    '["frame_018.jpg", "frame_025.jpg"]'::jsonb,
    'pintu',
    'kaki_tangga',
    'Berdiri persis di kaki tangga naik. Ada stiker kecil di dinding tangga tapi tulisannya pudar. Di atas tangga terlihat pintu kaca dengan lampu hangat menyala.',
    'Kisaran harga makanan/minuman belum terlihat. Calon pembeli belum tahu apakah menu cocok dengan kantong mereka.',
    'stabil',
    true,
    false
),
(
    'seg_04',
    'selasar-kopi',
    32,
    48,
    '["frame_035.jpg", "frame_044.jpg"]'::jsonb,
    'dalam',
    'meja_kasir',
    'Menaiki tangga dan mendorong pintu kaca lantai 2. Suasana kafe bersih, musik akustik terdengar santai, terdapat 4 meja terisi pelanggan. Meja kasir dan papan menu berlampu terlihat jelas dengan harga mulai Rp 15rb.',
    'Metode pembayaran QRIS tidak langsung terlihat dari pintu masuk.',
    'stabil',
    true,
    false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personas (
    id, analysis_id, agent_id, persona_version, segment, discrete_traits, concrete_facts,
    context_around, daily_mood, seed, table_version
)
VALUES
(
    'per_sk_42',
    'selasar-kopi',
    42,
    1,
    'mahasiswa',
    '{"budget_sensitivity": "hemat", "physical_laziness": "normal", "dining_context": "sendiri_buru_buru", "area_familiarity": "baru_pertama", "visit_intent": "mencari_makan"}'::jsonb,
    '{"meal_budget": 25000, "break_time_minutes": 30}'::jsonb,
    'Baru selesai kuliah praktikum di kampus terdekat, mencari makan siang cepat',
    'Cukup lelah dan lapar',
    1337,
    'v1.4-handcrafted'
),
(
    'per_sk_108',
    'selasar-kopi',
    108,
    1,
    'pekerja_kantor',
    '{"budget_sensitivity": "sedang", "physical_laziness": "malas", "dining_context": "santai", "area_familiarity": "cukup_tahu", "visit_intent": "spesifik_tujuan"}'::jsonb,
    '{"meal_budget": 50000, "break_time_minutes": 60}'::jsonb,
    'Istirahat makan siang kantor, ingin ngopi sambil buka laptop sebentar',
    'Tenang dan butuh tempat ber-AC',
    2026,
    'v1.4-handcrafted'
),
(
    'per_sk_215',
    'selasar-kopi',
    215,
    1,
    'pengendara',
    '{"budget_sensitivity": "fleksibel", "physical_laziness": "malas", "dining_context": "sendiri_buru_buru", "area_familiarity": "baru_pertama", "visit_intent": "lewat_saja"}'::jsonb,
    '{"meal_budget": 35000, "break_time_minutes": 15}'::jsonb,
    'Sedang berhenti di lampu merah depan ruko',
    'Buru-buru ingin pulang',
    8891,
    'v1.4-handcrafted'
),
(
    'per_sk_340',
    'selasar-kopi',
    340,
    1,
    'warga_sekitar',
    '{"budget_sensitivity": "hemat", "physical_laziness": "normal", "dining_context": "rombongan", "area_familiarity": "warga_lokal", "visit_intent": "mencari_makan"}'::jsonb,
    '{"meal_budget": 60000, "break_time_minutes": 45}'::jsonb,
    'Jalan sore bersama teman satu kosan',
    'Santai mencari cemilan',
    9402,
    'v1.4-handcrafted'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.simulation_runs (
    id, analysis_id, run_type, status, n_agents, succeeded_agents, seed
)
VALUES (
    'run_sk_baseline',
    'selasar-kopi',
    'baseline',
    'selesai',
    20,
    20,
    42
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.agent_decisions (
    id, run_id, analysis_id, agent_id, batch_id, monologue, final_decision,
    stopped_at_segment_id, deciding_factor, factor_segment_ids, hesitation_score, primary_hypothesis_id
)
VALUES
(
    'dec_sk_42',
    'run_sk_baseline',
    'selasar-kopi',
    42,
    0,
    'Lihat plang Selasar Kopi di lantai 2. Menarik sih, tapi pas jalan ke bawah tangga rukonya gelap dan curam. Gak ada papan menu sama sekali, takutnya kafe mahal Rp 40rb-an ke atas. Mending cari warkop biasa aja di sebelah.',
    'berhenti_lalu_pergi',
    'seg_02',
    'Papan harga tidak terlihat di lantai bawah, khawatir melebihi anggaran makan Rp 25.000.',
    '["seg_01", "seg_02"]'::jsonb,
    4,
    'H3'
),
(
    'dec_sk_108',
    'run_sk_baseline',
    'selasar-kopi',
    108,
    0,
    'Sering lihat tempat ini dari jalan. Langsung naik tangga aja ke lantai 2. Pas masuk ruangannya sejuk ber-AC, lagu enak, kasir langsung ramah menyapa. Pesan Es Kopi Susu dan Roti Panggang Rp 33rb, pas banget di budget.',
    'memesan',
    NULL,
    'Suasana lantai 2 nyaman, cocok untuk bekerja dengan harga masuk akal.',
    '["seg_04"]'::jsonb,
    1,
    NULL
),
(
    'dec_sk_215',
    'run_sk_baseline',
    'selasar-kopi',
    215,
    0,
    'Sempat menoleh ke plang di lantai 2 saat lampu merah. Tapi parkir ruko padat motor dan harus naik tangga. Karena buru-buru, malas repot parkir, lanjut jalan saja.',
    'lewat',
    'seg_01',
    'Akses tangga dan parkir motor depan ruko terkesan menyulitkan untuk mampir kilat.',
    '["seg_01"]'::jsonb,
    2,
    'H5'
),
(
    'dec_sk_340',
    'run_sk_baseline',
    'selasar-kopi',
    340,
    0,
    'Tahu kalau di atas ada kafe, penasaran pengen coba. Pas naik sampai lantai 2, mejanya tinggal yang di pojok kecil dekat toilet. Merasa kurang leluasa untuk ngobrol bertiga, akhirnya turun lagi cari tempat lain.',
    'masuk_tanpa_memesan',
    'seg_04',
    'Kapasitas tempat duduk meja besar penuh, hanya tersisa meja sempit.',
    '["seg_04"]'::jsonb,
    3,
    'H9'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recommendations (
    id, analysis_id, run_id, hypothesis_id, action_id, priority_tag, rank,
    title, description, impact, effort, estimated_lift_range, location_zone
)
VALUES
(
    'rec_1',
    'selasar-kopi',
    'run_sk_baseline',
    'H3',
    'A3.1',
    'Prioritas',
    1,
    'Pasang standing banner menu & kisaran harga di kaki tangga',
    'Tampilkan 3 menu favorit beserta harga mulai Rp 15rb persis di depan akses tangga bawah.',
    'Tinggi',
    'Rendah',
    '12% – 16%',
    'Kaki Tangga (Detik 00:18)'
),
(
    'rec_2',
    'selasar-kopi',
    'run_sk_baseline',
    'H7',
    'A7.1',
    'Prioritas',
    2,
    'Tingkatkan pencahayaan lampu di sepanjang lorong tangga',
    'Ganti lampu tangga dengan temperatur hangat yang lebih terang agar tidak terkesan sepi/tutup.',
    'Sedang',
    'Rendah',
    '4% – 7%',
    'Lorong Tangga (Detik 00:24)'
),
(
    'rec_3',
    'selasar-kopi',
    'run_sk_baseline',
    'H2',
    'A2.1',
    'Nanti',
    3,
    'Ubah tulisan plang nama ruko menjadi kontras tinggi',
    'Warna plang abu-abu saat ini cenderung menyatu dengan tembok ruko tetangga saat siang terik.',
    'Rendah',
    'Sedang',
    '2% – 4%',
    'Fasad Depan (Detik 00:04)'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.twin_assets (
    id, analysis_id, mode, registered_frames, total_frames, quality_label, points_count, path_duration_seconds
)
VALUES (
    'twin_sk_1',
    'selasar-kopi',
    'pointcloud',
    1440,
    1600,
    'Kualitas baik',
    85200,
    48.0
)
ON CONFLICT (analysis_id) DO NOTHING;

INSERT INTO public.measurement_plans (
    id, analysis_id, observation_title, observation_spot, recommended_times,
    suggested_duration_minutes, metrics, practical_tips
)
VALUES (
    'mp_sk_1',
    'selasar-kopi',
    'Pengamatan Konversi Kaki Tangga & Fasad Ruko',
    'Berdiri di seberang jalan atau dekat minimarket sehingga trotoar depan dan mulut tangga lantai 2 terlihat bersamaan.',
    '["11:30 – 13:30 (Jam makan siang)", "18:30 – 20:30 (Jam nongkrong malam)"]'::jsonb,
    30,
    '[
        {"id": "m1", "stage_name": "Melintas & Menoleh", "physical_cue": "Pejalan kaki/pengendara menoleh ke plang lantai 2 atau standing banner", "target_count": 20},
        {"id": "m2", "stage_name": "Berhenti di Bawah Tangga", "physical_cue": "Berhenti minimal 3 detik membaca papan menu di kaki tangga", "target_count": 14},
        {"id": "m3", "stage_name": "Menaiki Tangga Masuk", "physical_cue": "Mulai menaiki anak tangga menuju pintu kaca lantai 2", "target_count": 8},
        {"id": "m4", "stage_name": "Memesan di Kasir", "physical_cue": "Melakukan transaksi pesanan di meja kasir", "target_count": 6}
    ]'::jsonb,
    '[
        "Lakukan pengamatan selama 30 menit sebelum memasang standing banner, lalu 30 menit di jam yang sama setelah banner dipasang.",
        "Gunakan kolom turus (IIII) untuk mencatat setiap pejalan kaki tanpa perlu mengajak bicara.",
        "Bandingkan rasio pengunjung yang naik tangga setelah melihat harga."
    ]'::jsonb
)
ON CONFLICT (analysis_id) DO NOTHING;
