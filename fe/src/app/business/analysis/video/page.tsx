'use client';

import { Check, CircleAlert, LoaderCircle, ShieldCheck, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { Suspense, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';
import { ApiError, backend, type VideoUpload } from '@/lib/backend';
import { useAnalysisId, withAid } from '@/lib/use-analysis';

const MIN_S = 20;
const MAX_S = 180;

/** detik -> 'mm:dd' */
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** 'mm:dd' -> detik; null bila format salah. */
function toSeconds(value: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function SectionTitle({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-10 text-[12px] font-semibold text-primary-40">{n}</span>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      </div>
    </div>
  );
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; name: string; progress: number }
  | { phase: 'done'; result: VideoUpload; previewUrl: string }
  | { phase: 'error'; message: string };

function VideoUploadInner() {
  const router = useRouter();
  const { aid, error: aidError } = useAnalysisId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<UploadState>({ phase: 'idle' });
  const [dragging, setDragging] = useState(false);
  const [cashierTime, setCashierTime] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const done = upload.phase === 'done' ? upload : null;
  const duration = done?.result.duration_s ?? null;
  const shortSide = done ? Math.min(done.result.width ?? 0, done.result.height ?? 0) : 0;
  const cashierSec = toSeconds(cashierTime);
  const cashierValid = cashierSec !== null && (duration === null || cashierSec <= Math.ceil(duration));
  const canContinue = Boolean(aid && done && cashierValid && !starting);

  const pickFile = async (f: File | undefined) => {
    if (!f || !aid) return;
    if (!f.type.startsWith('video/')) {
      setUpload({ phase: 'error', message: 'File yang dipilih bukan video.' });
      return;
    }
    setUpload({ phase: 'uploading', name: f.name, progress: 0 });
    try {
      const result = await backend.uploadVideo(aid, f, (p) => setUpload({ phase: 'uploading', name: f.name, progress: p }));
      setUpload({ phase: 'done', result, previewUrl: URL.createObjectURL(f) });
      if (result.duration_s) setCashierTime(mmss(result.duration_s));
    } catch (e) {
      setUpload({ phase: 'error', message: e instanceof ApiError ? e.message : 'Unggah gagal.' });
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const clearVideo = () => {
    if (done) URL.revokeObjectURL(done.previewUrl);
    setUpload({ phase: 'idle' });
    setCashierTime('');
  };

  const startProcessing = async () => {
    if (!aid || cashierSec === null) return;
    setStarting(true);
    setStartError(null);
    try {
      await backend.completeVideo(aid, cashierSec, `${aid}-${done?.result.filename}`);
      router.push(withAid('/business/analysis/proses', aid));
    } catch (e) {
      setStartError(e instanceof ApiError ? e.message : 'Gagal memulai pemrosesan.');
      setStarting(false);
    }
  };

  const checks = done
    ? [
        {
          label: 'Resolusi sisi terpendek',
          value: shortSide ? `${shortSide} px` : 'Tidak terbaca',
          ok: shortSide >= 480,
          warn: shortSide > 0 && shortSide < 720,
        },
        {
          label: 'Durasi video',
          value: duration ? `${Math.round(duration)} detik, batas ${MIN_S} detik sampai ${MAX_S / 60} menit` : 'Tidak terbaca',
          ok: duration !== null && duration >= MIN_S && duration <= MAX_S,
          warn: false,
        },
      ]
    : [];

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Rekam atau unggah video</h1>
              <p className="mt-1 text-[13px] text-muted">Satu video menyusuri jalur calon pelanggan: dari seberang jalan, masuk, hingga titik pesan.</p>
            </div>
            <Badge variant={done ? 'impact' : 'primary'} size="md">
              {done ? 'Video siap diproses' : 'Belum ada video'}
            </Badge>
          </div>

          {aidError && (
            <div className="flex items-start gap-3 rounded-md bg-friction-10 p-4 text-[13px] text-friction">
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              {aidError}
            </div>
          )}

          <div className="rounded-md border border-line bg-white">
            <div className="space-y-12 p-6 sm:p-10">
              {/* 1. Video */}
              <section>
                <SectionTitle n={1} title="Video jalur pelanggan" description="Video diunggah ke server Sekilas dan dipakai untuk membangun Visual Twin 3D." />
                <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />

                {done ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{done.result.filename}</span>
                        {duration !== null && <Badge>{`${Math.round(duration)} detik`}</Badge>}
                        {shortSide > 0 && <Badge>{`${done.result.width}×${done.result.height}`}</Badge>}
                      </div>
                      <button
                        type="button"
                        onClick={clearVideo}
                        aria-label="Ganti video"
                        className="grid size-9 place-items-center rounded-md text-subtle transition-colors hover:bg-friction-10 hover:text-friction"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <video src={done.previewUrl} controls className="aspect-video w-full rounded-md bg-ink object-contain" />
                  </div>
                ) : upload.phase === 'uploading' ? (
                  <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-md bg-panel px-6 text-center">
                    <LoaderCircle size={20} className="animate-spin text-primary-40" />
                    <p className="text-[13px] font-medium text-ink">Mengunggah {upload.name}</p>
                    <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-primary-40 transition-[width]" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
                    </div>
                    <p className="text-[12px] tabular-nums text-muted">{Math.round(upload.progress * 100)}%</p>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!aid}
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
                      className={`flex h-[260px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center transition-colors disabled:opacity-50 ${
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
                        Rekam dengan kamera ponsel sambil berjalan pelan. Durasi {MIN_S} detik sampai {MAX_S / 60} menit.
                      </span>
                    </button>
                    {upload.phase === 'error' && <p className="mt-2 text-[12px] text-friction">{upload.message}</p>}
                  </>
                )}
              </section>

              {/* 2. Titik kasir */}
              <section>
                <SectionTitle n={2} title="Titik pesan/kasir" description="Checkpoint lain dipilih AI; kamu cukup mengonfirmasi titik ini." />
                <Label requiredText="wajib">Di menit berapa kasir atau titik pesan terlihat di video?</Label>
                <div className="flex items-center gap-3">
                  <div className="w-36 shrink-0">
                    <Input
                      value={cashierTime}
                      onChange={(e) => setCashierTime(e.target.value)}
                      placeholder="00:48"
                      inputMode="numeric"
                      disabled={!done}
                      className="tabular-nums"
                    />
                  </div>
                  {duration !== null && <span className="whitespace-nowrap text-[13px] text-muted">dari {mmss(duration)}</span>}
                </div>
                {done && !cashierValid && (
                  <p className="mt-2 text-[12px] text-friction">Isi dengan format mm:dd, paling lambat {duration ? mmss(duration) : 'akhir video'}.</p>
                )}
              </section>

              {/* 3. Kualitas */}
              <section>
                <SectionTitle n={3} title="Pemeriksaan kualitas" description="Dicek otomatis saat video diterima server." />
                {checks.length === 0 ? (
                  <p className="rounded-md bg-panel px-4 py-3 text-[13px] text-muted">Muncul setelah video diunggah.</p>
                ) : (
                  <ul className="space-y-2">
                    {checks.map((qc) => (
                      <li key={qc.label} className="flex items-center gap-3 rounded-md border border-line px-4 py-3">
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded-md ${
                            qc.ok && !qc.warn ? 'bg-impact-10 text-impact' : qc.ok ? 'bg-primary-10 text-primary-40' : 'bg-friction-10 text-friction'
                          }`}
                        >
                          {qc.ok ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink">{qc.label}</p>
                          <p className="mt-0.5 text-[12px] text-muted">{qc.value}</p>
                        </div>
                        <Badge variant={qc.ok && !qc.warn ? 'impact' : qc.ok ? 'primary' : 'friction'}>
                          {qc.ok && !qc.warn ? 'Lolos' : qc.ok ? 'Cukup' : 'Perlu diganti'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-start gap-3 rounded-md bg-primary-10 p-4">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary-40" />
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    Video mentah tidak disimpan setelah diproses. Blur wajah dan plat nomor di browser menyusul di versi berikutnya.
                  </p>
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-3 rounded-b-md bg-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <Button variant="secondary" size="lg" onClick={() => router.push(withAid('/business/analysis/konteks', aid))} className="justify-center !rounded-md">
                <ArrowLeftIcon size={16} /> Kembali ke konteks usaha
              </Button>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Button variant="primary" size="lg" disabled={!canContinue} onClick={startProcessing} className="justify-center !rounded-md">
                  {starting ? <LoaderCircle size={16} className="animate-spin" /> : null}
                  Proses video <ArrowRightIcon size={16} />
                </Button>
                {startError && <span className="text-[12px] text-friction">{startError}</span>}
              </div>
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
