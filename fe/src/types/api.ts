/**
 * Single Source of Truth untuk Kontrak Tipe API Sekilas
 * Mengacu ketat pada PRD v1.4 (Bagian 4.4, F1, F3, F5, F6, F7) dan Spesifikasi Entitas Produksi
 */

// ---------------- 0. Akun Pengguna & Bisnis (1:N:N) ----------------
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  branch_name: string;
  category: BusinessType;
  address: string;
  primary_analysis_id?: string | null;
  analyses_count?: number;
  context: BusinessContext;
  created_at: string;
  updated_at?: string;
}

export type AnalysisStatus = 'draft' | 'processing' | 'ready' | 'stale' | 'failed';

export interface Analysis {
  id: string;
  business_id: string;
  business_name: string;
  branch_name?: string;
  name: string;
  business_type: string;
  created_at: string;
  updated_at?: string;
  status: AnalysisStatus;
  stale?: boolean;
  quality_label?: 'Kualitas baik' | 'Kualitas cukup' | 'Kualitas rendah';
  total_agents: number; // 500 untuk analisis penuh, 20 untuk demo
  thumbnail_url?: string;
  context?: BusinessContext;
}

// ---------------- F1. Konteks Usaha ----------------
export type BusinessType = 'warung' | 'kedai' | 'kafe' | 'resto_ruko';
export type SurroundingsType = 'dekat_kampus' | 'perkantoran' | 'permukiman' | 'jalan_utama' | 'lainnya';
export type PasserbyType = 'mahasiswa' | 'pekerja_kantor' | 'warga_sekitar' | 'keluarga' | 'pengendara';
export type BusinessGoal = 'lebih_banyak_pembeli_baru' | 'naikkan_belanja_rata_rata' | 'ramaikan_jam_sepi';
export type FixedConstraint = 'lokasi' | 'fasad' | 'menu' | 'harga';
export type PriceLevel = 'hemat' | 'sedang' | 'premium';
export type ParkingOption = 'motor' | 'mobil' | 'tidak_ada';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface BusinessContext {
  // Bagian 1: Informasi Dasar
  business_type: BusinessType;
  business_name: string;
  location_name: string;
  location_lat?: number;
  location_lng?: number;
  location_description: string;

  // Bagian 2: Pelanggan dan Tujuan
  surroundings_type: SurroundingsType;
  surroundings?: SurroundingsType[];
  surroundings_other?: string;
  passersby: PasserbyType[];
  business_goal: BusinessGoal;
  fixed_constraints: FixedConstraint[];

  // Bagian 3: Menu & Harga
  menu_items: MenuItem[];
  calculated_price_level: PriceLevel;

  // Bagian 4: Jam Operasional
  opening_hours: {
    open: string;  // misal "08:00"
    close: string; // misal "22:00"
  };
  rush_hours: Array<{
    start: string; // misal "12:00"
    end: string;   // misal "14:00"
  }>;

  // Bagian 5: Penjualan & Fasilitas (Opsional)
  daily_sales_rp?: number;
  daily_visitors?: number;
  parking?: ParkingOption[];
}

// ---------------- F3. Transkrip VLM ----------------
export interface TranscriptSegment {
  id: string;
  timestamp_start: number;
  timestamp_end: number;
  frame_keys: string[];
  vantage: 'jalan' | 'pintu' | 'dalam';
  zone_id?: string;
  narrative: string;
  not_visible: string;
  confidence: 'stabil' | 'tidak_pasti';
  is_confirmed_by_owner?: boolean;
  camera_pose?: {
    position: [number, number, number];
    look_vector: [number, number, number];
  };
}

// ---------------- F5. Persona & Simulasi Agen ----------------
export interface PersonaSpec {
  agent_id: number;
  segment: string;
  discrete_traits: {
    budget_sensitivity: 'hemat' | 'sedang' | 'fleksibel';
    physical_laziness: 'malas' | 'normal' | 'eksploratif';
    dining_context: 'sendiri_buru_buru' | 'santai' | 'rombongan';
    area_familiarity: 'baru_pertama' | 'cukup_tahu' | 'warga_lokal';
    visit_intent: 'mencari_makan' | 'lewat_saja' | 'spesifik_tujuan';
  };
  concrete_facts: {
    meal_budget: number;
    break_time_minutes: number;
  };
  context_around: string;
  daily_mood: string;
  seed: number;
  table_version: string;
}

export type FinalDecision =
  | 'lewat'
  | 'berhenti_lalu_pergi'
  | 'masuk_tanpa_memesan'
  | 'memesan';

export interface CueAttribution {
  cue_code: string;
  direction: 'menghambat' | 'mendorong' | 'netral';
  relevance_score: number; // 0..3
  evidence: string;
}

export interface AgentSegmentTrace {
  segment_id: string;
  monologue: string;
  action: 'lanjut' | 'berhenti';
}

export interface AgentDecision {
  agent_id: number;
  persona: PersonaSpec;
  monologue: string;
  final_decision: FinalDecision;
  stopped_at_segment_id: string | null;
  deciding_factor: string;
  factor_segment_ids: string[];
  segment_traces?: AgentSegmentTrace[];
  attributions?: CueAttribution[];
}

// ---------------- F6. Agregasi & Dasbor ----------------
export interface FunnelStageData {
  id: 'melihat' | 'berhenti' | 'masuk' | 'memesan';
  name: string;
  count: number;
  percentage: number;
  drop_off_count: number;
  drop_off_rate: number;
  is_highest_friction?: boolean;
}

export interface CueRank {
  rank: number;
  cue_code: string;
  title: string;
  share_pct: number; // skor: porsi suara agen yang batal, 0..100
  affected_agents_count: number;
  total_non_buyers: number;
  lift: number;
}

export interface KeyInsight {
  id: string;
  number: string;
  type: 'positive' | 'friction' | 'neutral';
  title: string;
  description: string;
}

export interface ParetoRecommendation {
  id: string;
  priority_tag: 'Prioritas' | 'Nanti';
  rank: number;
  title: string;
  description: string;
  impact: 'Tinggi' | 'Sedang' | 'Rendah';
  effort: 'Rendah' | 'Sedang' | 'Tinggi';
  estimated_lift_range: string; // misal "+12% – +16%"
  location_zone: string;
}

export interface VisualTwinMeta {
  registered_frames: number;
  total_frames: number;
  ratio: number;
  quality_label: 'Kualitas baik' | 'Kualitas cukup' | 'Kualitas rendah';
  points_count: number;
  path_duration_seconds: number;
}

export interface WaypointData {
  id: string;
  time: string;
  name: string;
  status: string;
  is_hotspot?: boolean;
}

export interface WhatIfProjectionData {
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
  mode?: 'estimasi_cepat' | 'terverifikasi_simulasi';
  low_accuracy_early_edit?: boolean;
  accuracy_note?: string | null;
}

export interface DashboardData {
  analysis_id: string;
  business_id?: string;
  business_name: string;
  branch_name?: string;
  created_at: string;
  total_agents: number;
  is_stale: boolean;
  kpi: {
    // 1. Jumlah agen yang membeli
    buyers_count: number;
    buyers_rate_text: string; // e.g. "18,8% dari 500 agen yang melihat"
    buyers_description: string;

    // 2. Persentase penurunan terbesar
    drop_off_rate_text: string; // e.g. "v 65,5%"
    drop_off_from_stage: string; // e.g. "Berhenti"
    drop_off_to_stage: string;   // e.g. "Masuk"
    drop_off_location: string;
    drop_off_description: string;

    // 3. Penyebab utama tidak membeli (diranking per isyarat)
    main_cause_title: string;
    main_cause_cue_rank: string; // e.g. "Peringkat 1 dari 4 Isyarat (48% suara)"
    main_cause_detail: string;

    // 4. Potensi omzet lepas (dalam Rupiah)
    potential_loss_amount: string; // e.g. "Rp 4,8 Juta – Rp 7,2 Juta"
    potential_loss_basis: string;  // e.g. "Estimasi dari 224 agen yang batal"
    potential_loss_detail: string;
  };
  funnel_stages: FunnelStageData[];
  cue_ranking?: CueRank[];
  key_insights: KeyInsight[];
  recommendations: ParetoRecommendation[];
  twin_meta: VisualTwinMeta;
  waypoints?: WaypointData[];
  what_if_projection?: WhatIfProjectionData | null;
}

// ---------------- F6-G. Rencana Pengukuran Cetak ----------------
export interface MeasurementPlanData {
  analysis_id: string;
  business_name: string;
  observation_title: string;
  observation_spot: string;
  recommended_times: string[];
  suggested_duration_minutes: number;
  metrics: Array<{
    id: string;
    stage_name: string;
    physical_cue: string;
    target_count: number;
  }>;
  practical_tips: string[];
}
