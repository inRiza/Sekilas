'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { MOCK_DASHBOARD } from '@/lib/mock/dashboard';

function DashboardResultInner() {
  const params = useParams();
  const analysisId = (params?.id as string) || 'selasar-kopi';
  const data = MOCK_DASHBOARD;

  const [activeWaypoint, setActiveWaypoint] = useState<string>('tangga');

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar
        mode="analysis"
        analysisId={analysisId}
        businessName={data.business_name}
        branchName={data.branch_name}
      />

      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-8">
          {/* Banner Catatan Kepercayaan (Wajib PRD v1.2) */}
          <div className="rounded-[10px] border border-line bg-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-primary-40 shrink-0" />
              <p className="text-ink-soft">
                <strong className="text-ink font-semibold">Catatan Kepercayaan:</strong> Hasil simulasi 500 agen berbasis probabilitas, bukan angka penjualan riil. Gunakan temuan ini sebagai hipotesis uji lapangan.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted shrink-0">
              <span>n = 500 agen</span>
              <span>·</span>
              <span>3 run dasar konsisten</span>
              <span>·</span>
              <span className="text-impact font-medium">Kalibrasi Video Baik</span>
            </div>
          </div>

          {/* Header Title & Quick Info */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-hairline">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                  Hasil Analisis Video
                </span>
                <span className="font-mono text-[11px] text-subtle">· 48 Detik Rekaman</span>
              </div>
              <h1 className="text-2xl sm:text-[32px] font-normal tracking-[-0.035em] text-ink">
                Dasbor Titik Gesekan & Peluang Konversi
              </h1>
              <p className="text-xs sm:text-[13px] text-muted mt-1">
                Pemetaan jalur dari trotoar depan hingga kasir lantai 2 untuk {data.business_name}.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/analisis/${analysisId}/agen`}
                className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-panel transition shadow-xs"
              >
                Lihat 500 Monolog Agen
              </Link>
              <Link
                href={`/analisis/${analysisId}/rencana`}
                className="btn-primary inline-flex h-9 items-center rounded-md px-4 text-xs font-medium text-white shadow-xs transition"
              >
                Cetak Lembar Tally A4
              </Link>
            </div>
          </div>

          {/* 4 KPI Cards: Compact, Visual Hierarchy Koheren, Tooltip on Hover */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Jumlah Agen yang Membeli (Hijau) */}
            <div className="rounded-[10px] border border-line bg-white p-4 sm:p-4.5 flex flex-col justify-between shadow-xs hover:border-subtle transition relative group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted font-medium">
                  Agen Membeli
                </span>
                {/* Tooltip Icon */}
                <div className="relative group/tip cursor-help">
                  <span className="font-mono text-[10px] text-subtle hover:text-ink size-4 inline-flex items-center justify-center rounded-full border border-line">
                    i
                  </span>
                  <div className="absolute right-0 top-5 z-30 hidden group-hover/tip:block w-56 rounded-md bg-ink text-white p-2.5 text-[11px] leading-relaxed shadow-lg pointer-events-none">
                    {data.kpi.buyers_description}
                  </div>
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[28px] sm:text-[30px] font-bold font-mono tracking-tight leading-none text-impact">
                    {data.kpi.buyers_count}
                  </span>
                  <span className="text-xs font-medium text-ink-soft">agen</span>
                </div>
                <p className="font-mono text-[11px] text-muted mt-1 truncate">
                  {data.kpi.buyers_rate_text}
                </p>
              </div>
            </div>

            {/* KPI 2: Persentase Penurunan Terbesar (Merah) */}
            <div className="rounded-[10px] border border-line bg-white p-4 sm:p-4.5 flex flex-col justify-between shadow-xs hover:border-subtle transition relative group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted font-medium">
                  Penurunan Terbesar
                </span>
                {/* Tooltip Icon */}
                <div className="relative group/tip cursor-help">
                  <span className="font-mono text-[10px] text-subtle hover:text-ink size-4 inline-flex items-center justify-center rounded-full border border-line">
                    i
                  </span>
                  <div className="absolute right-0 top-5 z-30 hidden group-hover/tip:block w-56 rounded-md bg-ink text-white p-2.5 text-[11px] leading-relaxed shadow-lg pointer-events-none">
                    {data.kpi.drop_off_description}
                  </div>
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[28px] sm:text-[30px] font-bold font-mono tracking-tight leading-none text-friction">
                    {data.kpi.drop_off_rate_text}
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Dari {data.kpi.drop_off_from_stage} ke {data.kpi.drop_off_to_stage}
                </p>
              </div>
            </div>

            {/* KPI 3: Penyebab Utama Gak Beli (Merah) */}
            <div className="rounded-[10px] border border-line bg-white p-4 sm:p-4.5 flex flex-col justify-between shadow-xs hover:border-subtle transition relative group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted font-medium">
                  Penyebab Utama Batal
                </span>
                {/* Tooltip Icon */}
                <div className="relative group/tip cursor-help">
                  <span className="font-mono text-[10px] text-subtle hover:text-ink size-4 inline-flex items-center justify-center rounded-full border border-line">
                    i
                  </span>
                  <div className="absolute right-0 top-5 z-30 hidden group-hover/tip:block w-56 rounded-md bg-ink text-white p-2.5 text-[11px] leading-relaxed shadow-lg pointer-events-none">
                    {data.kpi.main_cause_detail}
                  </div>
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] leading-none text-friction">
                    Menu & Harga
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted mt-1">
                  {data.kpi.main_cause_cue_rank}
                </p>
              </div>
            </div>

            {/* KPI 4: Potensi Omzet Lepas (Merah - 1 Angka Tanpa Rentang) */}
            <div className="rounded-[10px] border border-line bg-white p-4 sm:p-4.5 flex flex-col justify-between shadow-xs hover:border-subtle transition relative group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted font-medium">
                  Potensi Omzet Lepas
                </span>
                {/* Tooltip Icon */}
                <div className="relative group/tip cursor-help">
                  <span className="font-mono text-[10px] text-subtle hover:text-ink size-4 inline-flex items-center justify-center rounded-full border border-line">
                    i
                  </span>
                  <div className="absolute right-0 top-5 z-30 hidden group-hover/tip:block w-56 rounded-md bg-ink text-white p-2.5 text-[11px] leading-relaxed shadow-lg pointer-events-none">
                    {data.kpi.potential_loss_detail}
                  </div>
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[28px] sm:text-[30px] font-bold font-mono tracking-tight leading-none text-friction">
                    {data.kpi.potential_loss_amount}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted mt-1">
                  {data.kpi.potential_loss_basis}
                </p>
              </div>
            </div>
          </div>

          {/* Corong Konversi 4 Tahap (Melihat -> Berhenti -> Masuk -> Memesan) */}
          <div className="rounded-[10px] border border-line bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-base font-semibold text-ink">Corong Konversi Pelanggan (4 Tahap)</h2>
                <p className="text-xs text-muted mt-0.5">
                  Distribusi 500 agen calon pelanggan sepanjang jalur fisik tempat usahamu.
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-subtle">
                <span>Total 500 Agen</span>
                <span>·</span>
                <span className="text-friction font-medium">Titik Bocor Terbesar: Tahap Masuk</span>
              </div>
            </div>

            {/* Funnel Stage Horizontal Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
              {data.funnel_stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className={`rounded-md border p-3.5 flex flex-col justify-between transition ${
                    stage.is_highest_friction
                      ? 'border-friction/30 bg-friction-10/40'
                      : 'border-line bg-panel/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono text-[11px] text-subtle">0{idx + 1}</span>
                      {stage.is_highest_friction && (
                        <span className="font-mono text-[10px] uppercase font-bold text-friction bg-friction-10 px-1.5 py-0.5 rounded">
                          Hotspot Friksi
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-ink">{stage.name}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-ink">
                        {stage.count}
                      </span>
                      <span className="text-xs font-mono text-muted">
                        ({stage.percentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-hairline/80 text-[11px]">
                    {stage.drop_off_rate > 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-subtle font-mono">Penurunan:</span>
                        <span className="font-mono font-medium text-friction">
                          v {stage.drop_off_rate}% ({stage.drop_off_count} agen)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-subtle font-mono">Tahap Akhir:</span>
                        <span className="font-mono font-medium text-impact">Konversi Berhasil</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Projection Placeholder Container (Jujur, Tanpa Gambar Palsu) & Temuan Utama */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Viewport 3D Placeholder (7 Kolom) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-[10px] border border-line bg-white overflow-hidden shadow-xs">
                {/* Header Viewport */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-panel/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary-40" />
                    <span className="font-medium text-ink">Viewport Visual Twin 3D</span>
                  </div>
                  <span className="font-mono text-[11px] text-subtle">
                    Durasi: 48s · 1.440 Frame
                  </span>
                </div>

                {/* Honest Architectural Placeholder Viewport */}
                <div className="relative w-full aspect-16/10 bg-panel flex flex-col justify-between p-5 border-b border-hairline overflow-hidden">
                  {/* Fine Grid Background */}
                  <div
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(var(--color-line) 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Corner Viewfinder Marks */}
                  <span className="absolute top-3 left-3 font-mono text-[11px] text-subtle select-none">+</span>
                  <span className="absolute top-3 right-3 font-mono text-[11px] text-subtle select-none">+</span>
                  <span className="absolute bottom-3 left-3 font-mono text-[11px] text-subtle select-none">+</span>
                  <span className="absolute bottom-3 right-3 font-mono text-[11px] text-subtle select-none">+</span>

                  {/* Top Status Badge */}
                  <div className="flex items-center justify-between z-10">
                    <span className="rounded-full bg-white border border-line px-3 py-1 font-mono text-[11px] text-ink-soft shadow-xs">
                      Status: Visual Twin 3D (Dalam Kalibrasi Rekaman)
                    </span>
                    <span className="rounded-full bg-white border border-line px-2.5 py-1 font-mono text-[11px] text-impact">
                      Pose Kamera Terkunci
                    </span>
                  </div>

                  {/* Center Placeholder Notice */}
                  <div className="my-auto text-center z-10 py-6 max-w-sm mx-auto">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                      Proyeksi Ruang & Lintasan Fisik
                    </p>
                    <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
                      Sistem 3D memetakan stempel waktu video ke koordinat waypoint kamera. Hasil simulasi agen dipasangkan langsung ke titik-titik fisik di bawah ini.
                    </p>
                  </div>

                  {/* Bottom Calibration Meta */}
                  <div className="flex items-center justify-between z-10 text-[11px] font-mono text-subtle pt-2 border-t border-hairline/80">
                    <span>Target FPS: 30 · Resolusi 1080p</span>
                    <span>3 Zona Terdaftar</span>
                  </div>
                </div>

                {/* 2D Waypoint Progression Bar (Realistis & Dapat Diklik) */}
                <div className="p-4 bg-white">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-subtle mb-3">
                    Titik Pantau Lintasan Video (Klik untuk detail)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'jalan', time: '00:04', name: 'Trotoar Depan', status: 'Daya Tarik Baik' },
                      { id: 'tangga', time: '00:18', name: 'Akses Kaki Tangga', status: 'v 65,5% Bocor', isHotspot: true },
                      { id: 'kasir', time: '00:36', name: 'Meja Kasir Lantai 2', status: 'Konversi Solid' },
                    ].map((wp) => (
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
                          {wp.isHotspot && (
                            <span className="text-friction font-bold">Titik Friksi</span>
                          )}
                        </div>
                        <p className="font-medium text-ink truncate">{wp.name}</p>
                        <p className={`font-mono text-[11px] mt-0.5 ${wp.isHotspot ? 'text-friction font-medium' : 'text-subtle'}`}>
                          {wp.status}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Temuan Utama & Rekomendasi Prioritas (5 Kolom) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 3 Temuan Utama */}
              <div className="rounded-[10px] border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-hairline mb-4">
                  <h3 className="text-sm font-semibold text-ink">3 Temuan Utama Simulasi</h3>
                  <span className="font-mono text-[11px] text-subtle">Berdasarkan 500 agen</span>
                </div>

                <div className="space-y-4">
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
              <div className="rounded-[10px] border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-hairline mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Rekomendasi Perbaikan Prioritas</h3>
                    <p className="text-[11px] text-muted mt-0.5">Dampak tertinggi dengan biaya termudah</p>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-impact bg-impact/10 px-2 py-0.5 rounded">
                    Dianjurkan
                  </span>
                </div>

                <div className="space-y-3.5">
                  {data.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-md border border-line bg-panel/40 p-3.5 text-xs hover:bg-panel transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] uppercase font-semibold text-primary-40">
                          {rec.priority_tag} #{rec.rank}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-impact">
                          {rec.estimated_lift_range}
                        </span>
                      </div>
                      <h4 className="font-medium text-ink leading-snug">{rec.title}</h4>
                      <p className="text-muted mt-1 leading-relaxed text-[11px]">{rec.description}</p>
                      <div className="mt-2.5 pt-2 border-t border-hairline/80 flex items-center justify-between text-[10px] font-mono text-subtle">
                        <span>Dampak: {rec.impact} · Biaya: {rec.effort}</span>
                        <span>{rec.location_zone}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-3 border-t border-hairline">
                  <Link
                    href={`/analisis/${analysisId}/rencana`}
                    className="btn-primary w-full h-9 rounded-md text-xs font-medium text-white shadow-xs flex items-center justify-center transition"
                  >
                    Buat Lembar Observasi Lapangan (A4)
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline py-6 text-center text-xs text-subtle">
        <div className="col">
          Sekilas © 2026 · Simulator Calon Pelanggan untuk UMKM Makanan
        </div>
      </footer>
    </div>
  );
}

export default function DashboardResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <DashboardResultInner />
    </Suspense>
  );
}
