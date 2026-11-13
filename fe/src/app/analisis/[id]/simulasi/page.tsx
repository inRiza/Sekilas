'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { SekilasMascot } from '@/components/brand/mascot';

function SimulasiAgenInner() {
  const params = useParams();
  const router = useRouter();
  const analysisId = (params?.id as string) || 'selasar-kopi';

  const [completedAgents, setCompletedAgents] = useState(240);
  const totalAgents = 500;

  useEffect(() => {
    const interval = setInterval(() => {
      setCompletedAgents((prev) => {
        if (prev >= totalAgents) {
          clearInterval(interval);
          return totalAgents;
        }
        return Math.min(totalAgents, prev + 65);
      });
    }, 550);
    return () => clearInterval(interval);
  }, [totalAgents]);

  const percentage = Math.round((completedAgents / totalAgents) * 100);

  const logs = [
    `Batch 1-10: 100 persona mahasiswa & pekerja kantor selesai bermonolog.`,
    `Batch 11-20: 100 persona pengendara & warga sekitar selesai evaluasi jalan.`,
    `Batch 21-30: 100 persona rombongan selesai menimbang menu dan harga.`,
    completedAgents >= 400 ? `Batch 31-40: Agregasi titik berhenti dan deteksi friksi kaki tangga.` : 'Sedang memproses batch 31-40...',
    completedAgents >= 500 ? `Batch 41-50: 500 agen selesai. Menghitung rekomendasi prioritas dan corong 4 tahap.` : 'Menunggu batch terakhir...',
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="wizard" currentStep={5} analysisId={analysisId} />

      <main className="section flex-1 py-10 sm:py-16">
        <div className="col max-w-xl mx-auto">
          <div className="text-center mb-8 flex flex-col items-center">
            <SekilasMascot size={74} pose={completedAgents >= 500 ? 'happy' : 'default'} className="mb-3" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-primary-40 bg-primary-10 px-2.5 py-0.5 rounded-full font-semibold mb-2">
              Status: Menjalankan GPT-6 Luna
            </span>
            <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
              Simulasi 500 Agen Berjalan (F5)
            </h1>
            <p className="text-xs sm:text-[13px] text-muted max-w-md mx-auto mt-1 leading-relaxed">
              500 persona terstratifikasi sedang membaca transkrip kejadian tokomu, bermonolog, dan memutuskan apakah akan masuk atau berbalik pergi.
            </p>
          </div>

          <div className="rounded-[10px] border border-line bg-white p-6 shadow-xs mb-6">
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-ink">Progres Keputusan Agen</span>
              <span className="font-mono text-primary-40 font-semibold">
                {completedAgents} / {totalAgents} agen ({percentage}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-hairline overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-40 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Terminal Log Transparan */}
            <div className="mt-5 rounded-md bg-panel p-3.5 border border-hairline font-mono text-[11px] text-muted space-y-1.5">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-subtle select-none">&gt;</span>
                  <span className={i === logs.length - 1 ? 'text-ink font-medium' : ''}>{log}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={completedAgents < totalAgents}
              onClick={() => router.push(`/analisis/${analysisId}`)}
              className="btn-primary w-full sm:w-auto min-w-[280px] h-10 rounded-md text-xs font-medium text-white shadow-xs flex items-center justify-center transition disabled:opacity-50"
            >
              Buka Dasbor Hasil Analisis (F6) →
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

export default function SimulasiAgenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SimulasiAgenInner />
    </Suspense>
  );
}
