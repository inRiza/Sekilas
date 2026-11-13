import { DashboardData } from '@/types/api';

export interface WhatIfFix {
  id: string;
  title: string;
  impact_label: string;
  effort_label: string;
  is_checked: boolean;
}

export interface WhatIfProjection {
  total_agents: number;
  last_run_timestamp: string;
  buyers_projected: number;
  buyers_baseline: number;
  drop_rate_projected: string;
  drop_rate_baseline: string;
  revenue_lift: string;
  cost_estimate: string;
  stages_comparison: Array<{
    id: string;
    name: string;
    baseline_pct: number;
    projected_pct: number;
    delta_label: string;
  }>;
  model_conclusion: string;
}

export const MOCK_WHAT_IF_PROJECTION: WhatIfProjection = {
  total_agents: 20, // 20 agen scope demo
  last_run_timestamp: '11 Nov 2026 · 14.20',
  buyers_projected: 5,
  buyers_baseline: 2,
  drop_rate_projected: '-38%',
  drop_rate_baseline: '-68%',
  revenue_lift: '+880rb',
  cost_estimate: 'Rp 275rb',
  stages_comparison: [
    {
      id: 'melihat',
      name: 'Melihat',
      baseline_pct: 100,
      projected_pct: 100,
      delta_label: 'Tetap',
    },
    {
      id: 'tertarik',
      name: 'Tertarik',
      baseline_pct: 32,
      projected_pct: 62,
      delta_label: '+30 poin',
    },
    {
      id: 'masuk',
      name: 'Masuk',
      baseline_pct: 21,
      projected_pct: 38,
      delta_label: '+17 poin',
    },
    {
      id: 'memesan',
      name: 'Memesan',
      baseline_pct: 12,
      projected_pct: 25,
      delta_label: '+13 poin',
    },
  ],
  model_conclusion:
    'Papan menu dan harga di depan etalase memberi lonjakan terbesar di tahap tertarik. Plang yang menghadap trotoar dan tanda "Buka" menambah orang yang masuk.',
};

export const MOCK_DASHBOARD: DashboardData = {
  analysis_id: 'selasar-kopi',
  business_id: 'biz_selasar_dipatiukur',
  business_name: 'Selasar Kopi & Roti',
  branch_name: 'Dipatiukur (Pusat)',
  created_at: '2026-11-13T14:30:00Z',
  total_agents: 20, // 20 agen demo
  is_stale: false,
  kpi: {
    // 1. Jumlah agen yang membeli
    buyers_count: 4,
    buyers_rate_text: '20% dari 20 agen yang melihat',
    buyers_description: 'Total agen sintetis yang melewati seluruh titik hingga memesan di kasir.',

    // 2. Persentase penurunan terbesar (hanya dari tahap X ke tahap Y)
    drop_off_rate_text: 'v 65,5%',
    drop_off_from_stage: 'Berhenti',
    drop_off_to_stage: 'Masuk',
    drop_off_location: 'Akses Tangga Lantai 2',
    drop_off_description: 'Sebagian besar calon pembeli memutuskan berbalik arah saat tiba di depan akses tangga ruko.',

    // 3. Penyebab utama gak beli (dihitung per isyarat dan diranking)
    main_cause_title: 'Menu & Harga Tak Terlihat dari Luar',
    main_cause_cue_rank: 'Peringkat 1 dari 4 Isyarat (48% suara agen)',
    main_cause_detail: 'Dihitung per isyarat visual: ketiadaan info harga di trotoar menjadi alasan terbesar pembeli batal naik.',

    // 4. Potential loss (1 angka pasti tanpa rentang)
    potential_loss_amount: 'Rp 4,8 Jt',
    potential_loss_basis: 'Estimasi lepas / bln (224 agen)',
    potential_loss_detail: 'Dihitung dari 224 calon pembeli yang batal dengan rata-rata belanja Rp 21.500 per pengunjung.',
  },
  funnel_stages: [
    {
      id: 'melihat',
      name: '1. Melihat dari jalan',
      count: 20,
      percentage: 100,
      drop_off_count: 6,
      drop_off_rate: 30,
    },
    {
      id: 'berhenti',
      name: '2. Tertarik & berhenti',
      count: 14,
      percentage: 70,
      drop_off_count: 9,
      drop_off_rate: 64.3,
      is_highest_friction: true,
    },
    {
      id: 'masuk',
      name: '3. Naik tangga / Masuk',
      count: 5,
      percentage: 25,
      drop_off_count: 1,
      drop_off_rate: 20,
    },
    {
      id: 'memesan',
      name: '4. Memesan di kasir',
      count: 4,
      percentage: 20,
      drop_off_count: 0,
      drop_off_rate: 0,
    },
  ],
  key_insights: [
    {
      id: 'ins_1',
      number: '01',
      type: 'positive',
      title: 'Daya Tarik Fasad Cukup Kuat',
      description: '70% calon pelanggan yang melintas menoleh dan memperlambat langkah karena plang di lantai 2 terlihat.',
    },
    {
      id: 'ins_2',
      number: '02',
      type: 'friction',
      title: 'Hambatan Psikologis Kaki Tangga',
      description: 'Agen membatalkan niat di bawah tangga ruko karena tidak melihat daftar menu dan estimasi harga.',
    },
    {
      id: 'ins_3',
      number: '03',
      type: 'positive',
      title: 'Konversi Kasir Sangat Solid',
      description: 'Agen yang berhasil menaiki tangga 80% langsung menuju kasir dan memesan tanpa ragu.',
    },
  ],
  recommendations: [
    {
      id: 'rec_1',
      priority_tag: 'Prioritas',
      rank: 1,
      title: 'Pasang standing banner menu & kisaran harga di kaki tangga',
      description: 'Tampilkan 3 menu favorit beserta harga mulai Rp 15rb persis di depan akses tangga bawah.',
      impact: 'Tinggi',
      effort: 'Rendah',
      estimated_lift_range: '^ 12% – 16%',
      location_zone: 'Kaki Tangga (Detik 00:18)',
    },
    {
      id: 'rec_2',
      priority_tag: 'Prioritas',
      rank: 2,
      title: 'Tingkatkan pencahayaan lampu di sepanjang lorong tangga',
      description: 'Ganti lampu tangga dengan temperatur hangat yang lebih terang agar tidak terkesan sepi/tutup.',
      impact: 'Sedang',
      effort: 'Rendah',
      estimated_lift_range: '^ 4% – 7%',
      location_zone: 'Lorong Tangga (Detik 00:24)',
    },
    {
      id: 'rec_3',
      priority_tag: 'Nanti',
      rank: 3,
      title: 'Ubah tulisan plang nama ruko menjadi kontras tinggi',
      description: 'Warna plang abu-abu saat ini cenderung menyatu dengan tembok ruko tetangga saat siang terik.',
      impact: 'Rendah',
      effort: 'Sedang',
      estimated_lift_range: '^ 2% – 4%',
      location_zone: 'Fasad Depan (Detik 00:04)',
    },
  ],
  twin_meta: {
    registered_frames: 1440,
    total_frames: 1600,
    ratio: 0.9,
    quality_label: 'Kualitas baik',
    points_count: 85200,
    path_duration_seconds: 48,
  },
};
