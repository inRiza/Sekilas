'use client';

import { Check, ShieldCheck, Upload, Video, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { Suspense, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input, Label } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';

const VIDEO_DURATION = '00:48';

/** 'mm:ss' -> detik; null bila format salah. */
function toSeconds(value: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Hasil cek kualitas otomatis sebelum video diproses. */
const QUALITY_CHECKS = [
  { label: 'Resolusi sisi terpendek', value: '1080 px, ideal' },
  { label: 'Durasi video', value: '48 detik, disarankan 60–120 detik' },
  { label: 'Kestabilan kamera', value: 'Stabil, putaran di bawah 45°/detik' },
  { label: 'Pencahayaan & kejernihan', value: 'Terang dan jelas' },
  { label: 'Privasi wajah & plat nomor', value: '14 wajah dan 6 plat diburamkan' },
];

/** Judul bagian di dalam satu container (pemisah antar-bagian), sama dengan halaman Konteks usaha. */
function SectionTitle({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-10 text-[12px] font-semibold text-primary-40">
        {n}
      </span>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      </div>
    </div>
  );
}

function VideoUploadInner() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // UI saja: video contoh sudah "terunggah"; belum terhubung ke backend.
  const [videoName, setVideoName] = useState<string | null>('video_rekaman_selasar.mp4');
  const [dragging, setDragging] = useState(false);

  const [cashierTime, setCashierTime] = useState(VIDEO_DURATION);

  const hasVideo = videoName !== null;
  const cashierSec = toSeconds(cashierTime);
  const cashierValid = cashierSec !== null && cashierSec <= (toSeconds(VIDEO_DURATION) ?? 0);
  const canContinue = hasVideo && cashierValid;

  const pickFile = (f: File | undefined) => {
    if (f && f.type.startsWith('video/')) setVideoName(f.name);
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          {/* Judul halaman */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Rekam atau unggah video</h1>
              <p className="mt-1 text-[13px] text-muted">
                Satu video menyusuri jalur calon pelanggan: dari seberang jalan, masuk, hingga titik pesan.
              </p>
            </div>
            <Badge variant={hasVideo ? 'impact' : 'primary'} size="md">
              {hasVideo ? 'Semua syarat terpenuhi' : 'Belum ada video'}
            </Badge>
          </div>

          <div className="rounded-md border border-line bg-white">
            <div className="space-y-12 p-6 sm:p-10">
              {/* 1. Video */}
              <section>
                <SectionTitle
                  n={1}
                  title="Video jalur pelanggan"
                  description="Wajah dan plat nomor diburamkan di perangkatmu sebelum video dikirim."
                />

                <input
                  ref={inputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />

                {hasVideo ? (
                  <div className="space-y-3">
                    {/* Baris info file + pilihan tampilan */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{videoName}</span>
                        <Badge>48 detik</Badge>
                        <Badge>1080p</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setVideoName(null)}
                          aria-label="Hapus video"
                          className="grid size-9 place-items-center rounded-md text-subtle transition-colors hover:bg-friction-10 hover:text-friction"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Pratinjau */}
                    <div className="relative flex h-[360px] w-full items-center justify-center overflow-hidden rounded-md bg-panel">
                      <div className="px-6 text-center">
                        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-md bg-primary-10 text-primary-40">
                          <Video size={22} />
                        </span>
                        <p className="text-[14px] font-medium text-ink">
                          Video terburam, siap dikirim
                        </p>
                        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
                          Inilah versi yang dibaca AI. Wajah dan plat nomor sudah diburamkan di browser.
                        </p>
                        <div className="mt-4 flex justify-center">
                          <Badge variant="impact" size="md">
                            <ShieldCheck size={13} />
                            Privasi aman
                          </Badge>
                        </div>
                      </div>

                      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-md bg-ink/75 px-4 py-2 text-[12px] text-white backdrop-blur-md">
                        <span className="tabular-nums">00:35 / {VIDEO_DURATION}</span>
                        <span className="text-white/80">{cashierValid ? `Kasir di ${cashierTime}` : 'Kasir belum ditandai'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      pickFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`flex h-[260px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center transition-colors ${
                      dragging ? 'border-primary-40 bg-primary-10' : 'border-[#c9ced6] bg-panel hover:bg-hover'
                    }`}
                  >
                    <span className="grid size-10 place-items-center rounded-md bg-white text-primary-40">
                      <Upload size={18} />
                    </span>
                    <span className="text-[13px] font-medium text-ink">
                      Tarik video ke sini atau <span className="text-primary-40">pilih file</span>
                    </span>
                    <span className="max-w-md text-[12px] text-muted">
                      Rekam dengan kamera ponsel sambil berjalan pelan, lalu unggah. Durasi 20 detik sampai 3 menit.
                    </span>
                  </button>
                )}
              </section>

              {/* 2. Titik pesan / kasir */}
              <section>
                <SectionTitle
                  n={2}
                  title="Titik pesan/kasir"
                  description="Satu-satunya titik yang perlu kamu tandai. Ini akhir jalur calon pelanggan."
                />
                <Label requiredText="wajib">Di menit berapa kasir atau titik pesan terlihat di video?</Label>
                <div className="flex items-center gap-3">
                  <div className="w-36 shrink-0">
                  <Input
                    value={cashierTime}
                    onChange={(e) => setCashierTime(e.target.value)}
                    placeholder="00:48"
                    inputMode="numeric"
                    className="tabular-nums"
                  />
                  </div>
                  <span className="whitespace-nowrap text-[13px] text-muted">dari {VIDEO_DURATION}</span>
                </div>
                {!cashierValid && (
                  <p className="mt-2 text-[12px] text-friction">Isi dengan format mm:dd, paling lambat {VIDEO_DURATION}.</p>
                )}
              </section>

              {/* 3. Kualitas */}
              <section>
                <SectionTitle
                  n={3}
                  title="Pemeriksaan kualitas"
                  description="Dicek otomatis sebelum video diproses menjadi transkrip dan Visual Twin."
                />
                <ul className="space-y-2">
                  {QUALITY_CHECKS.map((qc) => (
                    <li key={qc.label} className="flex items-center gap-3 rounded-md border border-line px-4 py-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-impact-10 text-impact">
                        <Check size={14} strokeWidth={2.5} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink">{qc.label}</p>
                        <p className="mt-0.5 text-[12px] text-muted">{qc.value}</p>
                      </div>
                      <Badge variant="impact">Lolos</Badge>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-start gap-3 rounded-md bg-primary-10 p-4">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary-40" />
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    Wajah dan plat nomor kendaraan diburamkan otomatis, sehingga tidak muncul di transkrip maupun model 3D.
                  </p>
                </div>
              </section>
            </div>

            {/* Kaki container: kembali & lanjut */}
            <div className="flex flex-col-reverse gap-3 rounded-b-md bg-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/business/analysis/konteks')}
                className="justify-center !rounded-md"
              >
                <ArrowLeftIcon size={16} /> Kembali ke konteks usaha
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={!canContinue}
                onClick={() => canContinue && router.push('/business/analysis/proses')}
                className="justify-center !rounded-md"
              >
                Lanjut ke pemrosesan <ArrowRightIcon size={16} />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VideoUploadPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <VideoUploadInner />
    </Suspense>
  );
}
