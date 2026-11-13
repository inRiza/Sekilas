'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { SekilasMascot } from '@/components/brand/mascot';

function ProsesInner() {
  const params = useParams();
  const router = useRouter();
  const analysisId = (params?.id as string) || 'selasar-kopi';

  const [progress, setProgress] = useState(85);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(100);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const stages = [
    {
      title: '1. Ingesti & Blur Privasi Browser',
      desc: 'Wajah dan plat nomor berhasil diburamkan secara lokal.',
      status: 'done',
    },
    {
      title: '2. Gemini 3.8 Flash Menyusun Transkrip Kejadian',
      desc: 'Membaca deretan visual video menjadi 4 segmen kronologis dengan frame bukti.',
      status: 'done',
    },
    {
      title: '3. Rekonstruksi Jalur Kamera Visual Twin 3D',
      desc: 'Berjalan paralel di antrean server (tidak menahan alur verifikasi transkrip).',
      status: progress >= 100 ? 'done' : 'running',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="wizard" currentStep={3} analysisId={analysisId} />

      <main className="section flex-1 py-10 sm:py-16">
        <div className="col max-w-xl mx-auto">
          <div className="text-center mb-8 flex flex-col items-center">
            <SekilasMascot size={72} className="mb-3" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-primary-40 bg-primary-10 px-2.5 py-0.5 rounded-full font-semibold mb-2">
              Status: Memproses Paralel
            </span>
            <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
              Mengekstrak Transkrip & Visual Twin
            </h1>
            <p className="text-xs sm:text-[13px] text-muted max-w-md mx-auto mt-1 leading-relaxed">
              Gemini 3.8 Flash sedang membaca video tempat usahamu untuk membuat catatan visual per segmen yang akan dilihat oleh 500 agen.
            </p>
          </div>

          {/* Progress Bar Container */}
          <div className="rounded-[10px] border border-line bg-white p-6 shadow-xs mb-6">
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-ink">Progres Ekstraksi Transkrip</span>
              <span className="font-mono text-primary-40 font-semibold">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-hairline overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-40 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] font-mono text-subtle mt-2 text-right">
              {progress >= 100 ? 'Transkrip siap diverifikasi' : 'Perkiraan sisa waktu: ~5 detik'}
            </p>

            {/* Stepper Vertikal Tahap Pemrosesan */}
            <div className="mt-6 pt-5 border-t border-hairline space-y-4">
              {stages.map((st, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div
                    className={`size-5 rounded-full flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5 ${
                      st.status === 'done'
                        ? 'bg-impact text-white font-bold'
                        : 'bg-primary-10 text-primary-40 border border-primary-20 animate-pulse'
                    }`}
                  >
                    {st.status === 'done' ? '✓' : i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-ink leading-snug">{st.title}</h3>
                    <p className="text-[11px] text-muted mt-0.5">{st.desc}</p>
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                      st.status === 'done'
                        ? 'bg-impact/10 text-impact'
                        : 'bg-primary-10 text-primary-40'
                    }`}
                  >
                    {st.status === 'done' ? 'Selesai' : 'Berjalan'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              type="button"
              disabled={progress < 100}
              onClick={() => router.push(`/analisis/${analysisId}/verifikasi`)}
              className="btn-primary w-full sm:w-auto min-w-[280px] h-10 rounded-md text-xs font-medium text-white shadow-xs flex items-center justify-center transition disabled:opacity-50"
            >
              Lanjut ke Verifikasi Transkrip (F4) →
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-hairline py-6 text-center text-xs text-subtle">
        <div className="col">
          Sekilas © 2026 · Simulator Calon Pelanggan untuk UMKM Makanan
        </div>
      </footer>
    </div>
  );
}

export default function ProsesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ProsesInner />
    </Suspense>
  );
}
