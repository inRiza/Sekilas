'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TrendingDown, TrendingUp, TriangleAlert, Wallet, type LucideIcon } from 'lucide-react';
import { InfoIcon, TrendingUpIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { TwinViewer } from '@/components/dashboard/twin-viewer';
import { fetchDashboardData, runWhatIfProjection, subscribeCrudChanges } from '@/lib/api/crud';
import { MOCK_DASHBOARD, MOCK_WHAT_IF_PROJECTION, WhatIfFix } from '@/lib/mock/dashboard';
import type { DashboardData, WaypointData, WhatIfProjectionData } from '@/types/api';

const KPI_TONE = {
  impact: 'bg-impact-10 text-impact',
  friction: 'bg-friction-10 text-friction',
  neutral: 'bg-soft text-ink-soft',
} as const;

/** Metrik ringkas proyeksi: format sama dengan KPI (angka hitam, warna di ikon). */
function ProjectionStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tone: keyof typeof KPI_TONE;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-white p-3.5">
      <div className="flex items-center gap-2">
        <span className={`grid size-6 shrink-0 place-items-center rounded-md ${KPI_TONE[tone]}`}>
          <Icon size={13} strokeWidth={2} />
        </span>
        <span className="truncate text-[12px] text-muted">{label}</span>
      </div>
      <span className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{value}</span>
      <span className="mt-1.5 text-[12px] text-muted">{sub}</span>
    </div>
  );
}

/** Kartu KPI seragam: angka hitam dengan ukuran & ketebalan sama; warna hanya pada ikon. */
function KpiCard({
  label,
  info,
  value,
  unit,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  info: string;
  value: string;
  unit?: string;
  sub: string;
  icon: LucideIcon;
  tone: keyof typeof KPI_TONE;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${KPI_TONE[tone]}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{label}</span>
        <div className="group/tip relative cursor-help">
          <InfoIcon size={15} className="text-subtle transition-colors hover:text-ink" />
          <div className="pointer-events-none absolute right-0 top-5 z-30 hidden w-56 rounded-md bg-ink p-2.5 text-[11px] leading-relaxed text-white shadow-lg group-hover/tip:block">
            {info}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="truncate text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
          {value}
        </span>
        {unit && <span className="text-[13px] text-muted">{unit}</span>}
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted">{sub}</p>
    </div>
  );
}

function DashboardResultInner() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('analysisId') || 'selasar-kopi';
  const businessId = searchParams.get('businessId');
  const querySuffix = `?analysisId=${encodeURIComponent(analysisId)}${
    businessId ? `&businessId=${encodeURIComponent(businessId)}` : ''
  }`;

  const [data, setData] = useState<DashboardData>(MOCK_DASHBOARD);
  const [projection, setProjection] = useState<WhatIfProjectionData>(
    MOCK_DASHBOARD.what_if_projection ?? MOCK_WHAT_IF_PROJECTION,
  );
  const [activeWaypoint, setActiveWaypoint] = useState<string>('tangga');
  const [fixes, setFixes] = useState<WhatIfFix[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const load = () => {
      void fetchDashboardData(analysisId).then((res) => {
        setData(res);
        if (res.what_if_projection) {
          setProjection(res.what_if_projection);
        }
        if (res.recommendations && res.recommendations.length > 0) {
          setFixes(
            res.recommendations.map((rec, idx) => ({
              id: rec.id,
              title: rec.title,
              impact_label: idx === 0 ? 'Dampak tinggi' : 'Dampak sedang',
              effort_label: rec.rank === 1 ? 'Usaha rendah' : 'Usaha sedang',
              is_checked: true,
            })),
          );
        }
        if (res.waypoints && res.waypoints.length > 0) {
          const hotspot = res.waypoints.find((w) => w.is_hotspot) ?? res.waypoints[0];
          if (hotspot) setActiveWaypoint(hotspot.id);
        }
      });
    };
    load();
    return subscribeCrudChanges(load);
  }, [analysisId]);

  const toggleFix = (id: string) => {
    setFixes((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_checked: !f.is_checked } : f))
    );
  };

  const handleRunWhatIf = async () => {
    setIsSimulating(true);
    try {
      const checkedIds = fixes.filter((f) => f.is_checked).map((f) => f.id);
      const updated = await runWhatIfProjection(analysisId, checkedIds);
      if (updated) {
        setProjection(updated);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const checkedFixesCount = fixes.filter((f) => f.is_checked).length;
  const durationSeconds = Math.max(1, Math.round(data.twin_meta?.path_duration_seconds || 48));
  const waypoints: WaypointData[] =
    data.waypoints && data.waypoints.length > 0
      ? data.waypoints
      : [
          { id: 'jalan', time: '00:04', name: 'Trotoar Depan', status: 'Daya Tarik Baik', is_hotspot: false },
          { id: 'tangga', time: '00:18', name: 'Akses Pintu / Tangga', status: `${data.kpi.drop_off_rate_text} bocor`, is_hotspot: true },
          { id: 'kasir', time: '00:36', name: 'Titik Pesan / Kasir', status: 'Konversi Solid', is_hotspot: false },
        ];

  return (
    <div className="flex min-h-full flex-col justify-between bg-white">
      {/* Main Full-Width Page Container (Ujung Kiri ke Kanan) */}
      <main className="flex-1 py-6 sm:py-8 w-full px-4 sm:px-8 lg:px-12 space-y-8">
        {/* Top Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[13px] text-muted">Hasil analisis video</span>
              <Badge>{`${durationSeconds} detik rekaman`}</Badge>
            </div>
            <h1 className="text-2xl sm:text-[32px] font-normal tracking-[-0.035em] text-ink">
              Dasbor Titik Gesekan & Peluang Konversi
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-0.5">
              Pemetaan jalur calon pelanggan dari jalan hingga titik pesan untuk {data.business_name}.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data.is_stale && (
              <Link
                href={`/business/analysis/simulasi${querySuffix}`}
                className="inline-flex h-9 items-center rounded-md border border-friction/40 bg-friction-10 px-3 text-xs font-medium text-friction hover:bg-friction-10/80 transition"
              >
                Data berubah • Jalankan ulang
              </Link>
            )}
            <Link
              href={`/business/analysis/agents${querySuffix}`}
              className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-panel transition"
            >
              Jelajah agen
            </Link>
          </div>
        </div>

        {/* 4 KPI: ukuran & ketebalan angka seragam (hitam); warna hanya di ikon arah/status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Agen membeli"
            info={data.kpi.buyers_description}
            value={String(data.kpi.buyers_count)}
            unit="agen"
            sub={data.kpi.buyers_rate_text}
            icon={TrendingUp}
            tone="impact"
          />
          <KpiCard
            label="Penurunan terbesar"
            info={data.kpi.drop_off_description}
            value={data.kpi.drop_off_rate_text}
            sub={`Dari ${data.kpi.drop_off_from_stage} ke ${data.kpi.drop_off_to_stage}`}
            icon={TrendingDown}
            tone="friction"
          />
          <KpiCard
            label="Penyebab utama batal"
            info={data.kpi.main_cause_detail}
            value={data.kpi.main_cause_title || 'Menu & Harga'}
            sub={data.kpi.main_cause_cue_rank}
            icon={TriangleAlert}
            tone="friction"
          />
          <KpiCard
            label="Potensi omzet lepas"
            info={data.kpi.potential_loss_detail}
            value={data.kpi.potential_loss_amount}
            sub={data.kpi.potential_loss_basis}
            icon={TrendingDown}
            tone="friction"
          />
        </div>

        {/* Middle Section: Visual Twin 3D Viewport (Kiri) & Temuan/Rekomendasi (Kanan) */}
        <div id="twin" className="space-y-6">
          {/* Visual Twin 3D: selebar layar, dengan tab Putar / Jalan / Tur */}
          <div className="space-y-4">
            <TwinViewer
              source={{ kind: 'ply', url: '/samples/goffee-depan-kasir.ply', name: 'goffee-depan-kasir' }}
              meta={[`${durationSeconds} detik`, `${waypoints.length} zona`]}
            />
            <div className="rounded-xl border border-line bg-white overflow-hidden">
              {/* 2D Waypoint Progression Bar */}
              <div className="p-4 bg-white">
                <p className="font-mono text-[11px] uppercase tracking-wider text-subtle mb-3">
                  Titik Pantau Lintasan Video (Klik untuk detail)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {waypoints.map((wp) => (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => setActiveWaypoint(wp.id)}
                      className={`text-left rounded-md border p-2.5 transition text-xs ${
                        activeWaypoint === wp.id
                          ? 'border-primary-40 bg-primary-10/40 ring-1 ring-primary-40'
                          : 'border-line hover:bg-panel'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-muted mb-1">
                        <span>{wp.time}</span>
                        {wp.is_hotspot && (
                          <span className="text-friction font-bold">Titik Friksi</span>
                        )}
                      </div>
                      <p className="font-medium text-ink truncate">{wp.name}</p>
                      <p className={`font-mono text-[11px] mt-0.5 ${wp.is_hotspot ? 'text-friction font-medium' : 'text-subtle'}`}>
                        {wp.status}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Temuan Utama & Rekomendasi Prioritas: dua kolom sejajar, tinggi sama */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Card 3 Temuan Utama */}
            <div className="flex h-full flex-col rounded-xl border border-line bg-white p-5">
              <div className="flex items-center justify-between pb-3 mb-4">
                <h3 className="text-sm font-semibold text-ink">3 Temuan Utama Simulasi</h3>
                <span className="font-mono text-[11px] text-subtle">Berdasarkan simulasi</span>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4">
                {data.key_insights.map((ins) => (
                  <div key={ins.id} className="flex items-start gap-3 text-xs">
                    <span className="font-mono text-[12px] font-semibold text-primary-40 shrink-0 mt-0.5">
                      {ins.number}
                    </span>
                    <div>
                      <p className="font-medium text-ink">{ins.title}</p>
                      <p className="text-muted mt-1 leading-relaxed">{ins.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card Rekomendasi Perbaikan Prioritas */}
            <div className="h-full rounded-xl border border-line bg-white p-5">
              <div className="flex items-center justify-between pb-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Rekomendasi Perbaikan Prioritas</h3>
                  <p className="text-[11px] text-muted mt-0.5">Dampak tertinggi dengan biaya termudah</p>
                </div>
                <span className="font-mono text-[10px] font-bold text-impact bg-impact/10 px-2 py-0.5 rounded">
                  Dianjurkan
                </span>
              </div>

              <div className="space-y-3">
                {data.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-md border border-line bg-panel/40 p-3 text-xs hover:bg-panel transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] uppercase font-semibold text-primary-40">
                        {rec.priority_tag} #{rec.rank}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-impact">
                        <span className="inline-flex items-center gap-1"><TrendingUpIcon size={13} strokeWidth={2.25} />{rec.estimated_lift_range}</span>
                      </span>
                    </div>
                    <h4 className="font-medium text-ink leading-snug">{rec.title}</h4>
                    <p className="text-muted mt-1 leading-relaxed text-[11px]">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SECTION BAWAH: SIMULASI HIPOTESIS (What-If Simulator Sesuai Figma)   */}
        {/* ==================================================================== */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-semibold">
              SIMULASI HIPOTESIS
            </span>
            <span className="font-mono text-[11px] text-subtle">
              Terakhir dijalankan {projection.last_run_timestamp}
            </span>
          </div>

          <div className="space-y-6">
            {/* "Pilih perbaikan" (~5 Kolom) */}
            <div className="rounded-xl border border-line bg-white p-5 sm:p-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Pilih perbaikan</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Centang yang ingin dicoba, lalu jalankan simulasi ulang. Hipotesis, bukan janji omzet.
                </p>

                {/* List Checkbox Perbaikan: berjajar selebar kartu */}
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {fixes.map((fix) => (
                    <div
                      key={fix.id}
                      onClick={() => toggleFix(fix.id)}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors flex h-full items-start gap-3 select-none ${
                        fix.is_checked
                          ? 'border-primary-40/60 bg-primary-10/40'
                          : 'border-line bg-white hover:bg-panel'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={fix.is_checked}
                        onChange={() => {}} // handled by parent div click
                        className="mt-0.5 rounded text-primary-40 focus:ring-primary-40 size-4 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-ink leading-snug">
                          {fix.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="impact">{fix.impact_label}</Badge>
                          <Badge>{fix.effort_label}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button & Meta */}
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isSimulating || checkedFixesCount === 0}
                  onClick={handleRunWhatIf}
                  className="btn-primary order-2 flex h-10 w-full items-center justify-center rounded-lg px-5 text-[13px] font-medium text-white transition disabled:opacity-50 sm:w-auto"
                >
                  {isSimulating ? 'Menjalankan Simulasi Ulang...' : 'Jalankan simulasi ulang'}
                </button>
                <p className="order-1 text-[12px] text-subtle">
                  Sekitar 2 menit, memakai agen yang sama
                </p>
              </div>
            </div>

            {/* "Proyeksi pasca simulasi" */}
            <div className="rounded-xl border border-line bg-white p-5 sm:p-6 space-y-5">
              {/* Header & Legend */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">Proyeksi pasca simulasi</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Perbandingan perilaku agen yang sama, sebelum dan sesudah perbaikan.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-ink-soft shrink-0">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-subtle/80" /> Saat ini
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-primary-40" /> Simulasi
                  </span>
                </div>
              </div>

              {/* 4 metrik ringkas: angka hitam seragam, arah perubahan lewat ikon berwarna */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ProjectionStat label="Pembeli" value={`${projection.buyers_projected} agen`} sub={`Naik dari ${projection.buyers_baseline} agen`} icon={TrendingUp} tone="impact" />
                <ProjectionStat label="Penurunan" value={projection.drop_rate_projected} sub={`Sebelumnya ${projection.drop_rate_baseline}`} icon={TrendingDown} tone="impact" />
                <ProjectionStat label="Perkiraan omzet" value={projection.revenue_lift} sub="Rupiah per hari" icon={TrendingUp} tone="impact" />
                <ProjectionStat label="Modal" value={projection.cost_estimate} sub={`${checkedFixesCount} perbaikan dipilih`} icon={Wallet} tone="neutral" />
              </div>

              {/* 4 Bar Perbandingan (Saat ini vs Simulasi) */}
              <div className="space-y-4 pt-2">
                {projection.stages_comparison.map((stage, idx) => (
                  <div key={stage.id} className="rounded-md border border-line bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">
                        {idx + 1} &nbsp;{stage.name}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          stage.delta_label === 'Tetap'
                            ? 'bg-panel text-muted border border-line'
                            : 'bg-impact/10 text-impact'
                        }`}
                      >
                        {stage.delta_label}
                      </span>
                    </div>

                    {/* Bar 1: Saat ini (Abu-abu) */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-[11px] text-muted w-14 shrink-0">Saat ini</span>
                      <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden">
                        <div
                          className="h-full bg-subtle/80 rounded-full transition-all duration-500"
                          style={{ width: `${stage.baseline_pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-muted w-10 text-right shrink-0">
                        {stage.baseline_pct}%
                      </span>
                    </div>

                    {/* Bar 2: Simulasi (Biru) */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-[11px] text-primary-40 font-medium w-14 shrink-0">Simulasi</span>
                      <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden">
                        <div
                          className="h-full bg-primary-40 rounded-full transition-all duration-500"
                          style={{ width: `${stage.projected_pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-primary-40 font-semibold w-10 text-right shrink-0">
                        {stage.projected_pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* KESIMPULAN MODEL Box */}
              <div className="rounded-md bg-panel p-3.5 border border-line text-xs">
                <span className="font-mono text-[10px] uppercase text-muted tracking-wider block font-semibold">
                  KESIMPULAN MODEL
                </span>
                <p className="text-ink-soft mt-1 leading-relaxed">
                  {projection.model_conclusion}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

export default function DashboardResultPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <DashboardResultInner />
    </Suspense>
  );
}
