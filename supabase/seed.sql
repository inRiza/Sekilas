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
