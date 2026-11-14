'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Info,
  LoaderCircle,
  MapPin,
  Plus,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnalysisTwin } from '@/components/dashboard/analysis-twin';
import { WaypointVideo } from '@/components/dashboard/waypoint-video';
import { FunnelChart } from '@/components/dashboard/funnel-chart';
import { CueRanking } from '@/components/dashboard/cue-ranking';
import { Card, CardHeader } from '@/components/dashboard/card';
import { CauseCard, HeroCard, KpiCard, ProjectionStat } from '@/components/dashboard/kpi';
import {
  cloneAnalysisWithTranscript,
  fetchDashboardData,
  runWhatIfProjection,
  SimulationRequiredError,
  subscribeCrudChanges,
} from '@/lib/api/crud';
import type { DashboardData, KeyInsight, WhatIfProjectionData } from '@/types/api';

interface FixOption {
  id: string;
  rank: number;
  priority_tag: 'Prioritas' | 'Nanti';
  title: string;
  description: string;
  location_zone: string;
  impact_label: string;
  effort_label: string;
  cost_rp: number | null;
  affected_agents_count: number;
  is_checked: boolean;
}

function formatCostShort(rp: number): string {
  if (rp >= 1_000_000) {
    return `Rp ${(rp / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} jt`;
  }
  return `Rp ${Math.round(rp / 1000)}rb`;
}

/** "00:16" -> 16 */
function toSeconds(mmss: string): number {
  const [m, s] = mmss.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}

function insightIcon(type: KeyInsight['type']) {
  if (type === 'positive') return <CircleCheck size={16} />;
  if (type === 'friction') return <TriangleAlert size={16} />;
  return <Info size={16} />;
}

function insightTone(type: KeyInsight['type']) {
  if (type === 'positive') return 'bg-impact-10 text-impact';
  if (type === 'friction') return 'bg-friction-10 text-friction';
  return 'bg-soft text-ink-soft';
}

function DashboardResultInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('analysisId') || 'selasar-kopi';
  const businessId = searchParams.get('businessId');
  // ?agent=7 dari Jelajah Agen: langsung putar perjalanan agen itu di Visual Twin.
  const focusAgentParam = searchParams.get('agent');
  const focusAgentId = focusAgentParam ? Number(focusAgentParam) : null;
  const querySuffix = `?analysisId=${encodeURIComponent(analysisId)}${
    businessId ? `&businessId=${encodeURIComponent(businessId)}` : ''
  }`;

  const [data, setData] = useState<DashboardData | null>(null);
  const [projection, setProjection] = useState<WhatIfProjectionData | null>(null);
  const [activeWaypoint, setActiveWaypoint] = useState<string | null>(null);
  const [fixes, setFixes] = useState<FixOption[]>([]);
  const [showSecondaryFixes, setShowSecondaryFixes] = useState(false);
  const [isQuickUpdating, setIsQuickUpdating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const quickAbortRef = useRef<AbortController | null>(null);
  const quickSeqRef = useRef(0);

  useEffect(() => {
    if (data || loadError) return;
    const timer = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [data, loadError]);

  useEffect(() => {
    const load = () => {
      quickAbortRef.current?.abort();
      quickSeqRef.current += 1;
      setIsQuickUpdating(false);
      setLoadError(null);
      void fetchDashboardData(analysisId)
        .then((res) => {
          setData(res);
          if (res.what_if_projection) {
            setProjection(res.what_if_projection);
          }
          if (res.recommendations && res.recommendations.length > 0) {
            const hasPriority = res.recommendations.some((rec) => rec.priority_tag === 'Prioritas');
            setFixes(
              res.recommendations.map((rec) => ({
                id: rec.id,
                rank: rec.rank,
                priority_tag: rec.priority_tag,
                title: rec.title,
                description: rec.description,
                location_zone: rec.location_zone,
                impact_label: rec.estimated_lift_range || `Dampak ${rec.impact.toLowerCase()}`,
                effort_label:
                  rec.effort === 'Rendah'
                    ? 'Usaha rendah'
                    : rec.effort === 'Tinggi'
                      ? 'Usaha tinggi'
                      : 'Usaha sedang',
                cost_rp: rec.cost_rp ?? null,
                affected_agents_count: rec.affected_agents_count ?? 0,
                is_checked: hasPriority ? rec.priority_tag === 'Prioritas' : true,
              })),
            );
          } else {
            setFixes([]);
          }
          if (res.waypoints && res.waypoints.length > 0) {
            const hotspot = res.waypoints.find((w) => w.is_hotspot) ?? res.waypoints[0];
            if (hotspot) setActiveWaypoint(hotspot.id);
          }
        })
        .catch((err) => {
          if (err instanceof SimulationRequiredError || (err instanceof Error && err.message === 'SIMULATION_REQUIRED')) {
            router.replace(`/business/analysis/verifikasi${querySuffix}`);
            return;
          }
          setLoadError(err instanceof Error ? err.message : 'Gagal memuat dasbor.');
        });
    };
    load();
    const unsub = subscribeCrudChanges(load);
    return () => {
      quickAbortRef.current?.abort();
      unsub();
    };
  }, [analysisId, querySuffix, router]);

  const toggleFix = (id: string) => {
    const nextFixes = fixes.map((f) => (f.id === id ? { ...f, is_checked: !f.is_checked } : f));
    const checkedIds = nextFixes.filter((f) => f.is_checked).map((f) => f.id);

    setFixes(nextFixes);
    setWhatIfError(null);

    quickAbortRef.current?.abort();
    const controller = new AbortController();
    quickAbortRef.current = controller;
    const reqSeq = ++quickSeqRef.current;
    setIsQuickUpdating(true);

    void runWhatIfProjection(analysisId, checkedIds, 'estimasi_cepat', controller.signal)
      .then((updated) => {
        if (reqSeq === quickSeqRef.current && updated) {
          setProjection(updated);
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (reqSeq === quickSeqRef.current) {
          setWhatIfError(err instanceof Error ? err.message : 'Gagal menghitung estimasi cepat.');
        }
      })
      .finally(() => {
        if (reqSeq === quickSeqRef.current) {
          setIsQuickUpdating(false);
        }
      });
  };

  const handleRunWhatIf = async () => {
    quickAbortRef.current?.abort();
    quickSeqRef.current += 1;
    setIsQuickUpdating(false);
    setIsSimulating(true);
    setWhatIfError(null);
    try {
      const checkedIds = fixes.filter((f) => f.is_checked).map((f) => f.id);
      const updated = await runWhatIfProjection(analysisId, checkedIds, 'terverifikasi_simulasi');
      if (updated) {
        setProjection(updated);
      }
    } catch (err) {
      setWhatIfError(err instanceof Error ? err.message : 'Gagal menjalankan simulasi ulang.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex min-h-full items-center justify-center bg-white px-4 py-16">
        <div className="max-w-md rounded-2xl border border-friction/40 bg-friction-10 p-6 text-center text-friction">
          <p className="text-sm font-semibold">Gagal memuat dasbor analisis</p>
          <p className="mt-1 text-xs">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    const stageText = 'Mengambil hasil simulasi, keputusan agen, dan rekomendasi dari server...';
    return (
      <div className="flex min-h-full items-center justify-center bg-white px-4 py-16">
        <div className="max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary-10 text-primary-40">
            <LoaderCircle size={20} className="animate-spin" />
          </div>
          <p className="mt-3 text-sm font-medium text-ink">Memuat hasil simulasi dan dasbor</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{stageText}</p>
          <p className="mt-2 font-mono text-[11px] text-subtle">Waktu tunggu: {elapsedSec} dtk</p>
        </div>
      </div>
    );
  }

  const checkedFixesCount = fixes.filter((f) => f.is_checked).length;
  const priorityFixes = fixes.filter((f) => f.priority_tag === 'Prioritas');
  const secondaryFixes = fixes.filter((f) => f.priority_tag !== 'Prioritas');
  const secondaryCheckedCount = secondaryFixes.filter((f) => f.is_checked).length;
  const visibleFixes = priorityFixes.length > 0 ? (showSecondaryFixes ? fixes : priorityFixes) : fixes;
  const durationSeconds = Math.round(data.twin_meta?.path_duration_seconds ?? 0);
  const totalAgents = data.total_agents;
  const waypoints = data.waypoints ?? [];
  // Titik pantau di 3D ditempatkan di detiknya pada jalur kamera rekaman.
  const twinWaypoints = waypoints.map((wp) => ({
    id: wp.id,
    label: wp.name,
    t: toSeconds(wp.time),
    hot: Boolean(wp.is_hotspot),
  }));

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="w-full flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        {/* Judul & aksi */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted">Hasil analisis video</span>
              {durationSeconds > 0 && (
                <Badge variant="primary">{`${durationSeconds} detik rekaman`}</Badge>
              )}
            </div>
            <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-ink sm:text-[34px]">
              Dasbor <span className="text-primary-40">{data.business_name}</span>
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              Titik gesekan dan peluang konversi dari jalan hingga titik pesan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.is_stale && (
              <Link
                href={`/business/analysis/simulasi${querySuffix}`}
                className="inline-flex h-10 items-center rounded-full border border-friction/40 bg-friction-10 px-4 text-xs font-medium text-friction transition hover:bg-friction-10/80"
              >
                Data berubah • Jalankan ulang
              </Link>
            )}
            <Link
              href={`/business/analysis/agents${querySuffix}`}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-xs font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-line/70 transition hover:bg-panel"
            >
              Jelajah agen
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  const cloned = await cloneAnalysisWithTranscript(analysisId);
                  const bId = businessId || cloned.business_id;
                  router.push(
                    `/business/analysis/konteks?analysisId=${encodeURIComponent(cloned.id)}${bId ? `&businessId=${encodeURIComponent(bId)}` : ''}`,
                  );
                } catch (err) {
                  setWhatIfError(err instanceof Error ? err.message : 'Gagal membuat analisis baru.');
                }
              }}
              className="btn-primary inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-medium text-white shadow-[0_4px_12px_rgba(52,102,229,0.3)]"
            >
              <Plus size={15} /> Analisis baru (transkrip sama)
            </button>
          </div>
        </div>

        {/* KPI satu baris: tinggi baris mengikuti kartu tertinggi */}
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeroCard
            value={data.kpi.drop_off_rate_text}
            from={data.kpi.drop_off_from_stage}
            to={data.kpi.drop_off_to_stage}
            location={data.kpi.drop_off_location}
            description={data.kpi.drop_off_description}
          />
          <KpiCard
            label="Agen membeli"
            info={data.kpi.buyers_description}
            value={String(data.kpi.buyers_count)}
            unit={`dari ${totalAgents} agen`}
            sub={data.kpi.buyers_rate_text}
            icon={TrendingUp}
            tone="impact"
          />
          <KpiCard
            label="Potensi omzet lepas"
            info={data.kpi.potential_loss_detail}
            value={data.kpi.potential_loss_amount}
            sub={data.kpi.potential_loss_basis}
            icon={TrendingDown}
            tone="friction"
          />
          <CauseCard title={data.kpi.main_cause_title || '–'} rank={data.kpi.main_cause_cue_rank} />
        </div>

        {/* Alur perilaku agen, lalu peringkat semua alasan batal (masing-masing selebar halaman) */}
        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader
              title="Alur perilaku agen"
              hint="Berapa agen yang bertahan di tiap tahap"
              right={<span className="rounded-full bg-panel px-2.5 py-1 font-mono text-[11px] text-muted ring-1 ring-line/70">{totalAgents} agen</span>}
            />
            <FunnelChart stages={data.funnel_stages} />
          </Card>

          <Card className="p-5">
            <CardHeader
              title="Alasan agen batal membeli"
              hint="Skor = porsi suara agen yang batal. Lift di atas 1 berarti alasan ini lebih sering muncul pada yang batal."
              right={<span className="rounded-full bg-panel px-2.5 py-1 font-mono text-[11px] text-muted ring-1 ring-line/70">{data.cue_ranking?.length ?? 0} alasan</span>}
            />
            <CueRanking cues={data.cue_ranking ?? []} />
          </Card>
        </div>

        {/* Visual Twin 3D, titik pantau (video), lalu temuan utama: masing-masing selebar halaman */}
        <div id="twin" className="space-y-4">
          <div>
            <AnalysisTwin
              analysisId={analysisId}
              meta={durationSeconds > 0 ? [`${durationSeconds} detik`] : []}
              activeWaypoint={activeWaypoint}
              onSelectWaypoint={setActiveWaypoint}
              focusAgentId={focusAgentId}
              waypoints={twinWaypoints}
            />
          </div>

          <div className="space-y-4">
            {waypoints.length > 0 && (
            <Card className="p-4">
              <CardHeader title="Titik pantau lintasan" hint="Klik untuk memutar video dari detik itu dan melihatnya di Visual Twin" />
              <WaypointVideo
                analysisId={analysisId}
                waypoints={waypoints}
                active={activeWaypoint}
                onSelect={setActiveWaypoint}
              />
            </Card>
            )}

            <Card className="p-4">
              <CardHeader title="3 temuan utama" hint="Berdasarkan perilaku agen" />
              <ul className="divide-y divide-hairline">
                {data.key_insights.map((ins) => (
                  <li key={ins.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${insightTone(ins.type)}`}>
                      {insightIcon(ins.type)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-snug text-ink">{ins.title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{ins.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Simulasi hipotesis (what-if) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Simulasi hipotesis</h2>
            {projection && (
              <span className="font-mono text-[11px] text-subtle">
                Terakhir dijalankan {projection.last_run_timestamp}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Card className="flex flex-col p-5 sm:p-6">
            <CardHeader
              title="Rekomendasi & pilih perbaikan"
              hint="Disaring ke perbaikan paling relevan (Pareto 80/20). Centang untuk estimasi cepat atau simulasi ulang."
            />
            <div className="grid grid-cols-1 gap-3">
              {visibleFixes.length === 0 ? (
                <p className="rounded-xl bg-panel p-4 text-xs text-muted">
                  Belum ada rekomendasi perbaikan yang relevan dari simulasi ini.
                </p>
              ) : (
                visibleFixes.map((fix) => (
                  <label
                    key={fix.id}
                    className={`flex cursor-pointer select-none items-start gap-3 rounded-xl p-3.5 ring-1 transition-colors ${
                      fix.is_checked ? 'bg-primary-10/50 ring-2 ring-primary-40/70' : 'bg-white ring-line hover:bg-panel'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={fix.is_checked}
                      onChange={() => toggleFix(fix.id)}
                      className="mt-1 size-4 shrink-0 cursor-pointer rounded text-primary-40 focus:ring-primary-40"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant={fix.priority_tag === 'Prioritas' ? 'primary' : 'neutral'}>
                          {`${fix.priority_tag} #${fix.rank}`}
                        </Badge>
                        {fix.location_zone && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                            <MapPin size={11} className="shrink-0" />
                            {fix.location_zone}
                          </span>
                        )}
                        {fix.cost_rp != null && fix.cost_rp > 0 && (
                          <span className="ml-auto font-mono text-[11px] font-medium text-ink-soft">
                            {formatCostShort(fix.cost_rp)}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold leading-snug text-ink">{fix.title}</p>
                      {fix.description && (
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">{fix.description}</p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="impact">{fix.impact_label}</Badge>
                        <Badge>{fix.effort_label}</Badge>
                        {fix.affected_agents_count > 0 && (
                          <Badge variant="neutral">{`${fix.affected_agents_count} agen terdampak`}</Badge>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {priorityFixes.length > 0 && secondaryFixes.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSecondaryFixes((prev) => !prev)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-panel/60 px-3 py-2 text-[12px] font-medium text-ink-soft transition hover:bg-panel"
              >
                {showSecondaryFixes ? (
                  <>
                    <ChevronUp size={14} /> Sembunyikan {secondaryFixes.length} opsi tambahan (prioritas rendah)
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> Lihat {secondaryFixes.length} opsi tambahan (prioritas rendah
                    {secondaryCheckedCount > 0 ? ` · ${secondaryCheckedCount} dipilih` : ''})
                  </>
                )}
              </button>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-5">
              <p className="text-center text-[12px] text-subtle">Sekitar 2 menit, memakai agen yang sama</p>
              <button
                type="button"
                disabled={isSimulating || checkedFixesCount === 0}
                onClick={handleRunWhatIf}
                className="btn-primary flex h-10 w-full items-center justify-center rounded-full px-5 text-[13px] font-medium text-white transition disabled:opacity-50"
              >
                {isSimulating ? 'Menjalankan Simulasi Ulang...' : 'Jalankan simulasi ulang'}
              </button>
            </div>
          </Card>

          {projection ? (
          <Card className="space-y-5 p-5 sm:p-6">
            <CardHeader
              title="Proyeksi pasca simulasi"
              hint={`Perbandingan perilaku ${totalAgents} agen yang sama, sebelum dan sesudah perbaikan.`}
              right={
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {isQuickUpdating && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-40">
                        <LoaderCircle size={12} className="animate-spin" /> Menghitung…
                      </span>
                    )}
                    <Badge variant={projection.mode === 'terverifikasi_simulasi' ? 'impact' : 'neutral'}>
                      {projection.mode === 'terverifikasi_simulasi' ? 'Terverifikasi simulasi' : 'Estimasi cepat'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-subtle/80" /> Saat ini
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-primary-40" /> Simulasi
                    </span>
                  </div>
                </div>
              }
            />

            {whatIfError && (
              <div className="rounded-xl border border-friction/40 bg-friction-10 px-4 py-2.5 text-xs text-friction">
                {whatIfError}
              </div>
            )}

            {projection.low_accuracy_early_edit && projection.accuracy_note && (
              <div className="flex items-start gap-2.5 rounded-xl border border-friction/40 bg-friction-10 px-4 py-3 text-xs text-friction">
                <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                <p className="leading-relaxed">{projection.accuracy_note}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ProjectionStat label="Pembeli" value={`${projection.buyers_projected} agen`} sub={`Naik dari ${projection.buyers_baseline} agen`} icon={TrendingUp} tone="impact" />
              <ProjectionStat label="Penurunan" value={projection.drop_rate_projected} sub={`Sebelumnya ${projection.drop_rate_baseline}`} icon={TrendingDown} tone="impact" />
              <ProjectionStat
                label="Perkiraan omzet"
                value={projection.revenue_lift}
                sub={projection.revenue_lift === 'Belum dihitung' ? 'Isi menu & pengunjung harian' : 'Rupiah per hari'}
                icon={TrendingUp}
                tone={projection.revenue_lift === 'Belum dihitung' ? 'neutral' : 'impact'}
              />
              <ProjectionStat label="Modal" value={projection.cost_estimate} sub={`${checkedFixesCount} perbaikan dipilih`} icon={Wallet} tone="neutral" />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {projection.stages_comparison.map((stage, idx) => (
                <div key={stage.id} className="space-y-2.5 rounded-xl bg-panel p-3.5 ring-1 ring-line/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">
                      {idx + 1}&nbsp;&nbsp;{stage.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        stage.delta_label === 'Tetap' ? 'bg-white text-muted ring-1 ring-line' : 'bg-impact-10 text-impact'
                      }`}
                    >
                      {stage.delta_label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="w-14 shrink-0 font-mono text-[11px] text-muted">Saat ini</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
                      <div
                        className="h-full rounded-full bg-subtle/80 transition-all duration-500"
                        style={{ width: `${stage.baseline_pct}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted">
                      {Math.round((stage.baseline_pct / 100) * totalAgents)}/{totalAgents}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="w-14 shrink-0 font-mono text-[11px] font-medium text-primary-40">Simulasi</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
                      <div
                        className="h-full rounded-full bg-primary-40 transition-all duration-500"
                        style={{ width: `${stage.projected_pct}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right font-mono text-[11px] font-semibold text-primary-40">
                      {Math.round((stage.projected_pct / 100) * totalAgents)}/{totalAgents}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-primary-10/60 p-4 text-xs ring-1 ring-primary-20">
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-primary-40">
                Kesimpulan model
              </span>
              <p className="mt-1 leading-relaxed text-ink-soft">{projection.model_conclusion}</p>
            </div>
          </Card>
          ) : (
            <Card className="flex items-center justify-center p-5 text-[13px] text-muted sm:p-6">
              Proyeksi perbaikan belum tersedia untuk analisis ini.
            </Card>
          )}
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
