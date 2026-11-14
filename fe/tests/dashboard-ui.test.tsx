import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CueRanking } from '@/components/dashboard/cue-ranking';
import { FunnelChart } from '@/components/dashboard/funnel-chart';
import { CauseCard, HeroCard } from '@/components/dashboard/kpi';
import { resolveMediaUrl } from '@/lib/api/crud';
import type { DashboardData, WhatIfProjectionData } from '@/types/api';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
const mockSearchParams = new URLSearchParams('analysisId=anl_test_ui');

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/dashboard/analysis-twin', () => ({
  AnalysisTwin: () => <div data-testid="analysis-twin-stub">Twin 3D</div>,
}));

vi.mock('@/components/dashboard/waypoint-video', () => ({
  WaypointVideo: () => <div data-testid="waypoint-video-stub">Waypoint Video</div>,
}));

const mockFetchDashboardData = vi.fn<() => Promise<DashboardData>>();
const mockRunWhatIfProjection = vi.fn<
  (
    analysisId: string,
    checkedIds: string[],
    mode?: 'estimasi_cepat' | 'terverifikasi_simulasi',
    signal?: AbortSignal,
  ) => Promise<WhatIfProjectionData>
>();

vi.mock('@/lib/api/crud', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/crud')>();
  return {
    ...actual,
    fetchDashboardData: () => mockFetchDashboardData(),
    runWhatIfProjection: (
      analysisId: string,
      checkedIds: string[],
      mode?: 'estimasi_cepat' | 'terverifikasi_simulasi',
      signal?: AbortSignal,
    ) => mockRunWhatIfProjection(analysisId, checkedIds, mode, signal),
    subscribeCrudChanges: () => () => {},
  };
});

import DashboardResultPage from '@/app/business/analysis/page';

function buildFixtureDashboard(): DashboardData {
  return {
    analysis_id: 'anl_test_ui',
    business_id: 'biz_test_ui',
    business_name: 'Nasi SPG Margonda',
    branch_name: 'Margonda',
    created_at: '2026-11-14T10:00:00Z',
    total_agents: 20,
    is_stale: false,
    kpi: {
      buyers_count: 3,
      buyers_rate_text: '15% dari 20 agen melihat',
      buyers_description: 'Jumlah agen simulasi yang memesan.',
      drop_off_rate_text: '54%',
      drop_off_from_stage: 'Berhenti',
      drop_off_to_stage: 'Masuk',
      drop_off_location: 'Zona pintu & menu depan',
      drop_off_description: 'Mayoritas agen batal masuk karena menu tidak terlihat.',
      main_cause_title: 'Menu tidak terlihat dari luar',
      main_cause_cue_rank: 'Peringkat 1 dari 3 Isyarat (47% suara)',
      main_cause_detail: 'Harga dan pilihan menu utama belum terbaca dari trotoar.',
      potential_loss_amount: 'Rp 425rb',
      potential_loss_basis: 'Dari 17 agen batal per hari',
      potential_loss_detail: 'Potensi tambahan omzet bila hambatan utama dibenahi.',
    },
    funnel_stages: [
      { id: 'melihat', name: 'Melihat toko', count: 20, percentage: 100, drop_off_count: 7, drop_off_rate: 35 },
      {
        id: 'berhenti',
        name: 'Berhenti & tertarik',
        count: 13,
        percentage: 65,
        drop_off_count: 7,
        drop_off_rate: 53.8,
        is_highest_friction: true,
      },
      { id: 'masuk', name: 'Masuk ke dalam', count: 6, percentage: 30, drop_off_count: 3, drop_off_rate: 50 },
      { id: 'memesan', name: 'Jadi memesan', count: 3, percentage: 15, drop_off_count: 0, drop_off_rate: 0 },
    ],
    cue_ranking: [
      {
        rank: 1,
        cue_code: 'H5_NO_VISIBLE_MENU_PRICE',
        title: 'Menu & harga belum jelas dari luar',
        share_pct: 47,
        affected_agents_count: 8,
        total_non_buyers: 17,
        lift: 1.8,
      },
      {
        rank: 2,
        cue_code: 'H1_WEAK_SIGNAGE',
        title: 'Plang nama kurang terbaca',
        share_pct: 29,
        affected_agents_count: 5,
        total_non_buyers: 17,
        lift: 1.3,
      },
    ],
    key_insights: [
      {
        id: 'ins_1',
        number: '01',
        type: 'friction',
        title: '13 dari 20 agen berhenti, tetapi hanya 6 masuk',
        description: 'Transparansi menu di pintu depan jadi penentu utama.',
      },
    ],
    recommendations: [
      {
        id: 'rec_prio_1',
        priority_tag: 'Prioritas',
        rank: 1,
        title: 'Pajang papan menu dan harga jelas di dekat pintu',
        description: 'Tampilkan 3 menu utama dengan harga ukuran besar.',
        impact: 'Tinggi',
        effort: 'Rendah',
        estimated_lift_range: '+4 dari 20 agen',
        location_zone: 'Pintu masuk',
        cost_rp: 150000,
        affected_agents_count: 8,
      },
      {
        id: 'rec_nanti_2',
        priority_tag: 'Nanti',
        rank: 2,
        title: 'Tambahkan lampu sorot hangat di area dalam',
        description: 'Meningkatkan kenyamanan saat sore hari.',
        impact: 'Sedang',
        effort: 'Sedang',
        estimated_lift_range: '+1 dari 20 agen',
        location_zone: 'Area duduk',
        cost_rp: 350000,
        affected_agents_count: 3,
      },
    ],
    twin_meta: {
      registered_frames: 24,
      total_frames: 25,
      ratio: 0.96,
      quality_label: 'Kualitas baik',
      points_count: 1400,
      path_duration_seconds: 18,
    },
    waypoints: [],
    what_if_projection: {
      total_agents: 20,
      last_run_timestamp: '2026-11-14 14:00',
      buyers_projected: 6,
      buyers_baseline: 3,
      drop_rate_projected: '70%',
      drop_rate_baseline: '85%',
      revenue_lift: '+Rp 75rb',
      cost_estimate: 'Rp 150rb',
      stages_comparison: [
        {
          id: 'melihat',
          name: 'Melihat toko',
          baseline_pct: 100,
          projected_pct: 100,
          delta_label: 'Tetap',
          baseline_count: 20,
          projected_count: 20,
        },
        {
          id: 'memesan',
          name: 'Jadi memesan',
          baseline_pct: 15,
          projected_pct: 30,
          delta_label: '+3 dari 20 agen',
          baseline_count: 3,
          projected_count: 6,
        },
      ],
      model_conclusion: 'Estimasi cepat menyarankan papan menu depan memberi dampak terbesar.',
      mode: 'estimasi_cepat',
    },
  };
}

describe('P3 UI & Signed Media Verification', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockFetchDashboardData.mockReset();
    mockRunWhatIfProjection.mockReset();
  });

  it('resolves authorized signed URLs, relative backend media paths, and data URIs without public URL fallback', () => {
    expect(
      resolveMediaUrl('https://qqfyitqxrcufjskwaldp.supabase.co/storage/v1/object/sign/videos/a.mp4?token=abc'),
    ).toBe('https://qqfyitqxrcufjskwaldp.supabase.co/storage/v1/object/sign/videos/a.mp4?token=abc');
    expect(resolveMediaUrl('/api/v1/analyses/anl_1/video/media?key=a.mp4&expires=123&sig=xyz')).toMatch(
      /^https?:\/\/.+\/api\/v1\/analyses\/anl_1\/video\/media\?key=a\.mp4&expires=123&sig=xyz$/,
    );
    expect(resolveMediaUrl('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc');
    expect(resolveMediaUrl('')).toBeNull();
    expect(resolveMediaUrl('bare-unauthenticated-key.jpg')).toBeNull();
  });

  it('renders HeroCard thresholds accurately (0% -> Tidak ada bocor, high -> Bocor tinggi)', () => {
    const { rerender } = render(
      <HeroCard value="0%" from="Berhenti" to="Masuk" location="Pintu" description="Semua agen berlanjut." />,
    );
    expect(screen.getByText('Tidak ada bocor')).toBeInTheDocument();

    rerender(
      <HeroCard value="54%" from="Berhenti" to="Masuk" location="Pintu" description="Separuh agen batal." />,
    );
    expect(screen.getByText('Bocor tinggi')).toBeInTheDocument();
  });

  it('renders CauseCard, FunnelChart integer counts, and CueRanking ordered scores', () => {
    const dash = buildFixtureDashboard();
    render(
      <div>
        <CauseCard
          title={dash.kpi.main_cause_title}
          rank={dash.kpi.main_cause_cue_rank}
          detail={dash.kpi.main_cause_detail}
        />
        <FunnelChart stages={dash.funnel_stages} />
        <CueRanking cues={dash.cue_ranking ?? []} />
      </div>,
    );

    expect(screen.getByText('Menu tidak terlihat dari luar')).toBeInTheDocument();
    expect(screen.getByText('20 agen')).toBeInTheDocument();
    expect(screen.getByText('13 agen')).toBeInTheDocument();
    expect(screen.getByText('Menu & harga belum jelas dari luar')).toBeInTheDocument();
    expect(screen.getByText(/8 dari 17 agen batal/)).toBeInTheDocument();
  });

  it('supports unified Prioritas/Nanti toggle, Mode 2 verification, and restoring last verified projection', async () => {
    const dash = buildFixtureDashboard();
    mockFetchDashboardData.mockResolvedValue(dash);

    const verifiedProjection: WhatIfProjectionData = {
      ...dash.what_if_projection!,
      buyers_projected: 7,
      revenue_lift: '+Rp 100rb',
      mode: 'terverifikasi_simulasi',
      model_conclusion: 'Simulasi ulang membuktikan +4 pembeli tambahan.',
    };
    const editedQuickProjection: WhatIfProjectionData = {
      ...dash.what_if_projection!,
      buyers_projected: 4,
      revenue_lift: '+Rp 25rb',
      mode: 'estimasi_cepat',
    };

    mockRunWhatIfProjection.mockImplementation(async (_id, _ids, mode) =>
      mode === 'terverifikasi_simulasi' ? verifiedProjection : editedQuickProjection,
    );

    render(<DashboardResultPage />);

    // Tunggu dasbor dimuat: Prioritas #1 tampil tercentang, Nanti #2 tersembunyi di toggle
    expect(await screen.findByText('Pajang papan menu dan harga jelas di dekat pintu')).toBeInTheDocument();
    expect(screen.queryByText('Tambahkan lampu sorot hangat di area dalam')).not.toBeInTheDocument();

    // Klik toggle Nanti #2 -> munculkan opsi prioritas rendah
    fireEvent.click(screen.getByRole('button', { name: /Lihat 1 opsi tambahan/i }));
    expect(screen.getByText('Tambahkan lampu sorot hangat di area dalam')).toBeInTheDocument();

    // Jalankan Mode 2 (Terverifikasi simulasi)
    fireEvent.click(screen.getByRole('button', { name: 'Jalankan simulasi ulang' }));
    await waitFor(() => {
      expect(mockRunWhatIfProjection).toHaveBeenCalledWith('anl_test_ui', ['rec_prio_1'], 'terverifikasi_simulasi', undefined);
      expect(screen.getByText('Terverifikasi simulasi')).toBeInTheDocument();
      expect(screen.getByText('7 agen')).toBeInTheDocument();
    });

    // Ubah centang setelah Mode 2 -> turun ke Estimasi cepat & tampilkan tombol pulihkan
    const secondCheckbox = screen.getAllByRole('checkbox')[1]!;
    fireEvent.click(secondCheckbox);
    await waitFor(() => {
      expect(screen.getAllByText('Estimasi cepat').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: 'Lihat hasil terverifikasi terakhir' })).toBeInTheDocument();
    });

    // Klik "Lihat hasil terverifikasi terakhir" -> kembali ke Mode 2 (7 agen) tanpa fetch baru
    fireEvent.click(screen.getByRole('button', { name: 'Lihat hasil terverifikasi terakhir' }));
    expect(screen.getByText('Terverifikasi simulasi')).toBeInTheDocument();
    expect(screen.getByText('7 agen')).toBeInTheDocument();
  });

  it('redirects cleanly to verification page when analysis has no simulation yet', async () => {
    const { SimulationRequiredError } = await import('@/lib/api/crud');
    mockFetchDashboardData.mockRejectedValue(new SimulationRequiredError());

    render(<DashboardResultPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/business/analysis/verifikasi?analysisId=anl_test_ui');
    });
  });
});
