'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, ArrowRightIcon, ArrowLeftIcon, VideoIcon } from '@/components/ui/icons';

const CHECKPOINTS = [
  { id: 'cp1', label: '1. Terlihat dari jalan', time: '00:04' },
  { id: 'cp2', label: '2. Pintu / Tangga ruko', time: '00:18' },
  { id: 'cp3', label: '3. Penanda / Papan plang', time: '00:26' },
  { id: 'cp4', label: '4. Area menu & harga', time: '00:35' },
  { id: 'cp5', label: '5. Titik pesan kasir', time: '00:48' },
];

function VideoUploadInner() {
  const params = useParams();
  const router = useRouter();
  const analysisId = (params?.id as string) || 'selasar-kopi';

  const [blurMode, setBlurMode] = useState<'blurred' | 'raw'>('blurred');
  const [videoFile, setVideoFile] = useState<string | null>('video_rekaman_selasar.mp4');
  const [isRecordingSimulated, setIsRecordingSimulated] = useState(false);

  // Evaluasi Kualitas Video (Checklist per baris)
  const qualityChecks = [
    { label: 'Resolusi Sisi Terpendek', val: '1080 px (Ideal)', pass: true },
    { label: 'Durasi Video', val: '48 detik (Ideal 60–120 dtk)', pass: true },
    { label: 'Kestabilan Kamera (Sensor Gerak)', val: 'Stabil (< 45°/dtk)', pass: true },
    { label: 'Pencahayaan & Kejernihan', val: 'Terang dan Jelas', pass: true },
    { label: 'Privasi: Wajah & Plat Diburamkan', val: '14 Wajah, 6 Plat Terburam', pass: true },
  ];

  const handleNext = () => {
    router.push(`/business/analysis/proses`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="wizard" currentStep={2} analysisId={analysisId} />

      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 pb-3 border-b border-hairline">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
              Rekam atau Unggah Video (F2)
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-1">
              Rekam satu video menyusuri jalur calon pelanggan: dari seberang jalan, masuk tangga, hingga titik pesan kasir.
            </p>
          </div>
          <Badge variant="impact" size="md">Semua Syarat Terpenuhi</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Video Preview & Checkpoints (7 Kolom) */}
          <div className="lg:col-span-7 space-y-6">
            <Card padded={false} className="overflow-hidden">
              {/* Header Video Box */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-hairline bg-surface">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-impact" />
                  <span className="text-xs font-semibold text-ink">Pratinjau Video (F2)</span>
                  <span className="font-mono text-[11px] text-subtle">48 detik · 1080p</span>
                </div>
                {/* Toggle Blur Mode */}
                <div className="flex items-center gap-1 rounded-full bg-bg p-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBlurMode('blurred')}
                    className={`rounded-full px-3 py-1 font-medium transition ${
                      blurMode === 'blurred'
                        ? 'bg-primary-40 text-white shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Terburam (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlurMode('raw')}
                    className={`rounded-full px-3 py-1 font-medium transition ${
                      blurMode === 'raw'
                        ? 'bg-surface text-ink shadow-xs border border-line'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Asli (Lokal Saja)
                  </button>
                </div>
              </div>

              {/* Viewport Layar Video Mockup */}
              <div className="relative w-full h-[360px] bg-panel flex items-center justify-center overflow-hidden border-b border-hairline">
                <div className="text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-primary-10 text-primary-40 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <VideoIcon size={24} />
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {blurMode === 'blurred'
                      ? 'Video Terburam (Wajah & Plat Diburamkan di Browser)'
                      : 'Video Asli Mentah (Hanya Tersimpan di Perangkat)'}
                  </p>
                  <p className="text-xs text-muted max-w-sm mt-1 mx-auto leading-relaxed">
                    Privasi terjamin: Video yang dikirim ke model VLM telah diburamkan secara lokal di browser sebelum diunggah.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="font-mono text-xs text-impact bg-impact-10 px-2.5 py-1 rounded-full border border-impact/20">
                      ✓ Privasi Lolos UU PDP
                    </span>
                  </div>
                </div>

                {/* Indikator Checkpoint Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-ink/75 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs">
                  <span className="font-mono text-[11px] text-white/90">00:35 / 00:48</span>
                  <span className="text-[11px] text-white/80">Checkpoint 4: Menu & Harga</span>
                </div>
              </div>

              {/* Daftar Checkpoint di Layar */}
              <div className="p-5 bg-surface">
                <h3 className="text-xs font-semibold text-ink-soft mb-3">
                  Checkpoint Terpenuhi pada Video Ini:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CHECKPOINTS.map((cp) => (
                    <div
                      key={cp.id}
                      className="flex items-center justify-between rounded-xl bg-panel border border-hairline px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-ink flex items-center gap-1.5">
                        <CheckIcon size={14} className="text-impact" /> {cp.label}
                      </span>
                      <span className="font-mono text-[11px] text-subtle">{cp.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Kolom Kanan: Evaluasi Checklist Kualitas (5 Kolom) */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <div className="border-b border-hairline pb-3 mb-4">
                <h2 className="text-base font-semibold text-ink">Checklist Kualitas Rekaman</h2>
                <p className="text-xs text-muted">Dievaluasi otomatis sebelum data diproses.</p>
              </div>

              <div className="space-y-3">
                {qualityChecks.map((qc, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between rounded-xl bg-panel border border-hairline p-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-ink flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-impact" />
                        {qc.label}
                      </p>
                      <p className="text-muted mt-0.5">{qc.val}</p>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-impact bg-impact-10 px-2 py-0.5 rounded-full border border-impact/20 shrink-0">
                      LOLOS
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl bg-primary-10 p-3.5 border border-primary-20 text-xs text-ink-soft leading-relaxed">
                <strong>Catatan Privasi (PRD Bagian 7):</strong> Wajah manusia dan plat nomor kendaraan otomatis di-masking sehingga tidak akan muncul di model 3D maupun transkrip visual.
              </div>
            </Card>

            {/* Aksi Navigasi */}
            <Card className="flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                className="w-full justify-center"
              >
                Lanjut ke Pemrosesan VLM & 3D <ArrowRightIcon size={16} />
              </Button>
              <Link href={`/analisis/${analysisId}/konteks`} className="w-full">
                <Button variant="secondary" size="md" className="w-full justify-center">
                  <ArrowLeftIcon size={14} /> Kembali ke Form Konteks
                </Button>
              </Link>
            </Card>
          </div>
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

export default function VideoUploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VideoUploadInner />
    </Suspense>
  );
}
