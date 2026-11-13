import { Analysis } from '@/types/api';

export const MOCK_ANALYSES: Analysis[] = [
  {
    id: 'selasar-kopi',
    business_id: 'biz_selasar_dipatiukur',
    business_name: 'Selasar Kopi & Roti',
    branch_name: 'Dipatiukur (Pusat)',
    name: 'Analisis Fasad & Tangga Depan (Video 48s)',
    business_type: 'kedai',
    created_at: '2026-11-13T14:30:00Z',
    status: 'ready',
    quality_label: 'Kualitas baik',
    total_agents: 500,
    thumbnail_url: '/samples/selasar-thumb.jpg',
    step_progress: {
      current_step: 6,
      total_steps: 6,
    },
  },
  {
    id: 'selasar-dago-eval',
    business_id: 'biz_selasar_dago',
    business_name: 'Selasar Kopi & Roti',
    branch_name: 'Dago Atas',
    name: 'Evaluasi Jalur Masuk & Kasir Outdoor',
    business_type: 'kafe',
    created_at: '2026-11-12T09:15:00Z',
    status: 'ready',
    quality_label: 'Kualitas baik',
    total_agents: 500,
    thumbnail_url: '/samples/bakso-thumb.jpg',
    step_progress: {
      current_step: 6,
      total_steps: 6,
    },
  },
  {
    id: 'selasar-night-run',
    business_id: 'biz_selasar_dipatiukur',
    business_name: 'Selasar Kopi & Roti',
    branch_name: 'Dipatiukur (Pusat)',
    name: 'Eksperimen Lampu Tangga & Papan Nama Malam',
    business_type: 'kedai',
    created_at: '2026-11-13T18:00:00Z',
    status: 'processing',
    total_agents: 500,
    thumbnail_url: '/samples/warkop-thumb.jpg',
    step_progress: {
      current_step: 3,
      total_steps: 6,
    },
  },
];
