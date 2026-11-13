'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { MOCK_MEASUREMENT_PLAN } from '@/lib/mock/measurement-plan';

function RencanaPengukuranInner() {
  const params = useParams();
  const analysisId = (params?.id as string) || 'selasar-kopi';
  const plan = MOCK_MEASUREMENT_PLAN;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white pb-20 print:bg-white print:p-0 flex flex-col justify-between">
      {/* Top Navbar (Disembunyikan saat cetak) */}
      <div className="print:hidden">
        <AppNavbar mode="analysis" analysisId={analysisId} />
      </div>

      {/* Main Print Container */}
      <main className="section flex-1 py-8 print:py-0">
        <div className="col max-w-[840px] mx-auto">
          {/* Action Bar di atas lembar A4 */}
          <div className="print:hidden mb-6 flex items-center justify-between pb-3 border-b border-hairline">
            <div>
              <Link
                href={`/analisis/${analysisId}`}
                className="text-xs text-muted hover:text-ink font-mono flex items-center gap-1.5"
              >
                ← Kembali ke Dasbor Analisis
              </Link>
              <h1 className="text-xl font-normal tracking-[-0.02em] text-ink mt-1">
                Rencana Pengukuran Lapangan (Format Cetak A4)
              </h1>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary inline-flex h-9 items-center rounded-md px-4 text-xs font-medium text-white shadow-xs transition"
            >
              🖨️ Cetak Lembar Tally A4
            </button>
          </div>

          {/* Lembar Format A4 */}
          <div className="rounded-[10px] border border-line bg-white p-8 sm:p-12 shadow-xs print:border-none print:shadow-none print:p-0">
            {/* Header Lembar Cetak */}
            <div className="border-b-2 border-ink pb-4 mb-6 flex justify-between items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Lembar Observasi Lapangan (Tally Sheet) · Sekilas
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-ink mt-1">
                  {plan.observation_title}
                </h2>
                <p className="text-xs text-ink-soft mt-1">
                  Usaha: <strong className="text-ink">{plan.business_name}</strong> · ID Analisis: {analysisId}
                </p>
              </div>
              <div className="text-right font-mono text-[11px] text-muted shrink-0">
                <p>Durasi: 30 Menit</p>
                <p className="mt-0.5">Tanggal: ___/___/2026</p>
              </div>
            </div>

            {/* Lokasi Berdiri & Jadwal Rekomendasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md bg-panel p-4 border border-line text-xs mb-6 print:bg-white">
              <div>
                <h3 className="font-mono text-[10px] uppercase font-bold text-muted tracking-wider">
                  Titik Berdiri Pengamat
                </h3>
                <p className="text-ink mt-1 leading-relaxed">{plan.observation_spot}</p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase font-bold text-muted tracking-wider">
                  Jadwal Observasi (Dari Jam Ramai F1)
                </h3>
                <ul className="mt-1 space-y-0.5 text-ink font-mono text-[11px]">
                  {plan.recommended_times.map((t, idx) => (
                    <li key={idx}>• {t}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Tabel Lembar Tally */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 font-mono">
                Tabel Hitungan Manual (Garis Lidi / Tally)
              </h3>
              <div className="border border-line rounded-md overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-panel border-b border-line font-mono text-[11px] text-ink-soft">
                      <th className="p-3 w-1/3">Indikator Kejadian</th>
                      <th className="p-3 w-1/2">Kolom Garis Lidi (Tally: 卌 卌 ...)</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {plan.metrics.map((m) => (
                      <tr key={m.id} className="min-h-[56px]">
                        <td className="p-3.5 align-top">
                          <strong className="text-ink block">{m.stage_name}</strong>
                          <span className="text-[11px] text-muted leading-relaxed block mt-0.5">
                            {m.physical_cue}
                          </span>
                        </td>
                        <td className="p-3.5 bg-panel/30 border-x border-line align-top">
                          <div className="h-10 border border-dashed border-subtle/40 rounded p-2" />
                        </td>
                        <td className="p-3.5 align-middle text-right font-mono text-base font-bold text-muted">
                          ___
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kolom Catatan Tambahan */}
            <div className="border border-line rounded-md p-4 mb-6">
              <h3 className="font-mono text-[11px] font-bold uppercase text-ink-soft mb-2">
                Catatan Temuan Lapangan:
              </h3>
              <div className="h-20 border-b border-dotted border-subtle" />
            </div>

            {/* Tips Praktis */}
            <div className="rounded-md bg-panel p-4 border border-line text-xs print:bg-white">
              <h3 className="font-mono text-[10px] uppercase font-bold text-muted tracking-wider mb-1.5">
                Panduan Praktis
              </h3>
              <ul className="space-y-1 text-muted text-[11px] leading-relaxed">
                {plan.practical_tips.map((tip, idx) => (
                  <li key={idx}>✓ {tip}</li>
                ))}
              </ul>
            </div>

            {/* Footer Tanda Tangan */}
            <div className="mt-8 pt-4 border-t border-hairline flex justify-between items-center text-[11px] font-mono text-subtle">
              <span>Dihasilkan dari Simulasi Sekilas v1.2</span>
              <span>Tanda Tangan Pengamat: ____________________</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="print:hidden border-t border-hairline py-6 text-center text-xs text-subtle">
        <div className="col">
          Sekilas © 2026 · Simulator Calon Pelanggan untuk UMKM Makanan
        </div>
      </footer>
    </div>
  );
}

export default function RencanaPengukuranPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <RencanaPengukuranInner />
    </Suspense>
  );
}
