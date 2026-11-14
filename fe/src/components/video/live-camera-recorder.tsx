'use client';

import {
  AlertTriangle,
  Camera,
  Check,
  Compass,
  Eye,
  EyeOff,
  Footprints,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LiveCameraRecorderProps {
  onComplete: (file: File, cashierAtSec: number) => void;
  onCancel: () => void;
}

interface WalkthroughStage {
  id: 'jalan' | 'pintu' | 'menu' | 'kasir';
  step: number;
  label: string;
  rangeLabel: string;
  minSec: number;
  maxSec: number;
  instruction: string;
  subHint: string;
}

const WALKTHROUGH_STAGES: WalkthroughStage[] = [
  {
    id: 'jalan',
    step: 1,
    label: 'Seberang / Trotoar',
    rangeLabel: '00:00 – 00:12',
    minSec: 0,
    maxSec: 12,
    instruction: 'Mulai dari trotoar seberang atau depan toko. Perlihatkan plang nama & fasad luar.',
    subHint: 'Arahkan kamera mendatar sejajar mata calon pelanggan yang sedang lewat.',
  },
  {
    id: 'pintu',
    step: 2,
    label: 'Pintu / Tangga Masuk',
    rangeLabel: '00:12 – 00:25',
    minSec: 12,
    maxSec: 25,
    instruction: 'Berjalan perlahan mendekati pintu masuk atau kaki tangga.',
    subHint: 'Pastikan kondisi pintu, papan promo depan, atau anak tangga terlihat jelas.',
  },
  {
    id: 'menu',
    step: 3,
    label: 'Area Dalam & Menu',
    rangeLabel: '00:25 – 00:42',
    minSec: 25,
    maxSec: 42,
    instruction: 'Masuk ke ruang utama. Sorot suasana tempat duduk dan papan daftar menu.',
    subHint: 'Berhenti 2–3 detik di depan daftar menu agar keterbacaan harga terekam.',
  },
  {
    id: 'kasir',
    step: 4,
    label: 'Titik Pesan / Kasir',
    rangeLabel: '00:42+',
    minSec: 42,
    maxSec: 180,
    instruction: 'Arahkan kamera ke meja kasir atau titik pesan, lalu tekan Tandai Kasir & Selesai.',
    subHint: 'Durasi minimal 20 detik agar seluruh koridor pelanggan lengkap.',
  },
];

function formatMmSs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function LiveCameraRecorder({ onComplete, onCancel }: LiveCameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumaRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cashierMarkedRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [manualStageIdx, setManualStageIdx] = useState<number | null>(null);
  const [showGuides, setShowGuides] = useState(true);

  // Sensor & pandu kecepatan jalan / horizon
  const [tiltDeg, setTiltDeg] = useState(0);
  const [motionScore, setMotionScore] = useState(14); // < 32 stabil, 32..55 agak cepat, > 55 terlalu goyang
  const [cashierMarkedSec, setCashierMarkedSec] = useState<number | null>(null);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      setCameraError(null);
      setCameraReady(false);
      stopTracks();

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Browser ini tidak mendukung akses kamera langsung (WebRTC getUserMedia).');
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        setCameraError(
          'Izin kamera ditolak atau perangkat kamera tidak ditemukan. Pastikan izin kamera diaktifkan di browser Anda, atau unggah file video MP4/MOV.',
        );
      }
    },
    [stopTracks],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void startCamera(facingMode);
    }, 0);
    return () => {
      window.clearTimeout(t);
      stopTracks();
    };
  }, [facingMode, startCamera, stopTracks]);

  // Sensor kemiringan (DeviceOrientation) bila tersedia di ponsel
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOrientation = (ev: DeviceOrientationEvent) => {
      if (typeof ev.gamma === 'number') {
        setTiltDeg(Math.max(-35, Math.min(35, Math.round(ev.gamma))));
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // Estimasi kecepatan langkah & goyangan kamera dari perubahan luma antar-frame
  useEffect(() => {
    if (!cameraReady) return;
    const sampleW = 48;
    const sampleH = 27;
    if (!motionCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = sampleW;
      c.height = sampleH;
      motionCanvasRef.current = c;
    }

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = motionCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        ctx.drawImage(video, 0, 0, sampleW, sampleH);
        const rgba = ctx.getImageData(0, 0, sampleW, sampleH).data;
        const curr = new Uint8Array(sampleW * sampleH);
        let diffSum = 0;
        const prev = prevLumaRef.current;

        for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
          const luma = Math.round(0.299 * (rgba[i] ?? 0) + 0.587 * (rgba[i + 1] ?? 0) + 0.114 * (rgba[i + 2] ?? 0));
          curr[p] = luma;
          if (prev) {
            diffSum += Math.abs(luma - (prev[p] ?? luma));
          }
        }
        prevLumaRef.current = curr;
        if (prev) {
          const avgDiff = diffSum / curr.length;
          // Konversi ke skor kecepatan gerak (derajat/detik ekuivalen)
          const degPerSec = Math.round(Math.min(85, avgDiff * 2.1));
          setMotionScore((old) => Math.round(old * 0.55 + degPerSec * 0.45));
        }
      } catch {
        // Abaikan bila frame belum siap
      }
    }, 350);

    return () => window.clearInterval(interval);
  }, [cameraReady]);

  // Timer rekaman berjalan
  useEffect(() => {
    if (!isRecording) return;
    const startedAt = Date.now() - elapsedRef.current * 1000;
    const timer = window.setInterval(() => {
      const sec = (Date.now() - startedAt) / 1000;
      elapsedRef.current = sec;
      setElapsedSec(sec);
      if (sec >= 180) {
        // Batas maksimum 3 menit sesuai PRD F2
        recorderRef.current?.stop();
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  // Hitung tahap aktif (otomatis berdasarkan waktu atau pilihan manual pengguna)
  const autoStageIdx = WALKTHROUGH_STAGES.findIndex(
    (s) => elapsedSec >= s.minSec && elapsedSec < s.maxSec,
  );
  const currentStageIdx =
    manualStageIdx !== null ? manualStageIdx : Math.max(0, autoStageIdx === -1 ? 3 : autoStageIdx);
  const activeStage = WALKTHROUGH_STAGES[currentStageIdx] ?? WALKTHROUGH_STAGES[0]!;

  const handleStartRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    cashierMarkedRef.current = null;
    elapsedRef.current = 0;
    setCashierMarkedSec(null);
    setElapsedSec(0);
    setManualStageIdx(null);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : '';

    const recorder = mimeType
      ? new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 2_500_000 })
      : new MediaRecorder(streamRef.current);

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunksRef.current.push(ev.data);
      }
    };

    recorder.onstop = () => {
      setIsRecording(false);
      const finalDuration = Math.max(1, Math.round(elapsedRef.current));
      const finalCashier = cashierMarkedRef.current ?? finalDuration;
      const resolvedMime = recorder.mimeType || mimeType || 'video/webm';
      const ext = resolvedMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: resolvedMime.split(';')[0] || 'video/webm' });
      const recordedFile = new File([blob], `rekaman_kamera_langsung.${ext}`, {
        type: blob.type,
      });
      stopTracks();
      onComplete(recordedFile, finalCashier);
    };

    recorderRef.current = recorder;
    recorder.start(250);
    setIsRecording(true);
  };

  const handleMarkCashierAndFinish = () => {
    const marked = Math.max(1, Math.round(elapsedRef.current));
    cashierMarkedRef.current = marked;
    setCashierMarkedSec(marked);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const toggleFacingMode = () => {
    if (isRecording) return;
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const isSteady = motionScore <= 34;
  const isTooFast = motionScore > 52;
  const isHorizonLevel = Math.abs(tiltDeg) <= 10;
  const minDurationReached = elapsedSec >= 20;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_4px_20px_rgb(0_0_0/0.03)]">
      {/* Header Bar Kamera */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span
            className={`size-2.5 rounded-full ${
              isRecording ? 'animate-pulse bg-friction' : cameraReady ? 'bg-impact' : 'bg-subtle'
            }`}
          />
          <span className="text-[13px] font-semibold text-ink">
            {isRecording ? 'Merekam Jalur Pelanggan' : 'Kamera Langsung & Panduan Visual'}
          </span>
          <span className="font-mono text-[11px] text-subtle">
            {formatMmSs(elapsedSec)} / 03:00
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuides((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-soft transition hover:bg-hover"
          >
            {showGuides ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{showGuides ? 'Panduan Aktif' : 'Panduan Tersembunyi'}</span>
          </button>

          <button
            type="button"
            disabled={isRecording}
            onClick={toggleFacingMode}
            title="Putar kamera depan/belakang"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-soft transition hover:bg-hover disabled:opacity-40"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">
              {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (recorderRef.current && recorderRef.current.state === 'recording') {
                recorderRef.current.onstop = null;
                recorderRef.current.stop();
              }
              stopTracks();
              onCancel();
            }}
            aria-label="Tutup kamera"
            className="grid size-8 place-items-center rounded-full border border-line bg-surface text-muted transition hover:bg-friction-10 hover:text-friction"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Viewfinder Utama + On-Screen Guide Overlay */}
      <div className="relative h-[440px] w-full overflow-hidden bg-ink sm:h-[480px]">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <span className="grid size-12 place-items-center rounded-2xl bg-friction-10 text-friction">
              <AlertTriangle size={22} />
            </span>
            <p className="max-w-md text-[14px] font-medium text-white">{cameraError}</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="!rounded-full"
                onClick={() => void startCamera(facingMode)}
              >
                Coba Lagi
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="!rounded-full"
                onClick={onCancel}
              >
                Unggah File Video Saja
              </Button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />

            {/* OVERLAY PANDUAN VISUAL (Garis Horizon, Kecepatan Jalan, & Transisi 4 Tahap) */}
            {showGuides && (
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
                {/* 1. ATAS: Stepper Transisi Jalur (Seberang -> Pintu -> Menu -> Kasir) */}
                <div className="pointer-events-auto mx-auto w-full max-w-2xl rounded-2xl border border-white/15 bg-ink/80 p-3 text-white backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {WALKTHROUGH_STAGES.map((st, idx) => {
                        const isCurrent = idx === currentStageIdx;
                        const isPassed = idx < currentStageIdx;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setManualStageIdx(idx)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                              isCurrent
                                ? 'bg-primary-40 text-white shadow-xs'
                                : isPassed
                                  ? 'bg-impact/25 text-white'
                                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                          >
                            <span className="font-mono text-[10px]">
                              {isPassed ? '✓' : st.step}
                            </span>
                            <span>{st.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="font-mono text-[11px] text-white/75">
                      {activeStage.rangeLabel}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3 border-t border-white/10 pt-2">
                    <div>
                      <p className="text-[13px] font-medium leading-snug text-white">
                        {activeStage.instruction}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/75">{activeStage.subHint}</p>
                    </div>
                    {currentStageIdx < WALKTHROUGH_STAGES.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setManualStageIdx(currentStageIdx + 1)}
                        className="shrink-0 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
                      >
                        Tahap berikut →
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. TENGAH: Garis Horizon, Sudut Pandang Pelanggan & Reticle */}
                <div className="relative my-auto flex w-full items-center justify-center">
                  {/* Bingkai fokus koridor jalan */}
                  <div className="relative h-44 w-72 rounded-2xl border border-dashed border-white/35 sm:h-52 sm:w-96">
                    {/* Garis horizon sejajar mata */}
                    <div
                      className="absolute inset-x-0 top-1/2 flex items-center justify-between border-t border-dashed transition-transform duration-200"
                      style={{
                        transform: `rotate(${-tiltDeg}deg)`,
                        borderColor: isHorizonLevel
                          ? 'rgba(16, 185, 129, 0.75)'
                          : 'rgba(239, 68, 68, 0.85)',
                      }}
                    >
                      <span className="-mt-2.5 rounded-full bg-ink/75 px-2 py-0.5 font-mono text-[10px] text-white/90">
                        HORIZON
                      </span>
                      <span className="-mt-2.5 rounded-full bg-ink/75 px-2 py-0.5 font-mono text-[10px] text-white/90">
                        {`${tiltDeg >= 0 ? '+' : ''}${tiltDeg}°`}
                      </span>
                    </div>

                    {/* Titik tengah arah pandang */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div
                        className={`size-5 rounded-full border-2 ${
                          isSteady && isHorizonLevel ? 'border-impact' : 'border-primary-40'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. BAWAH: HUD Indikator Kecepatan Jalan, Kestabilan & Privasi */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-ink/80 px-3.5 py-1.5 text-xs text-white backdrop-blur-md">
                    <Footprints
                      size={14}
                      className={
                        isTooFast
                          ? 'text-friction'
                          : isSteady
                            ? 'text-impact'
                            : 'text-primary-40'
                      }
                    />
                    <span className="font-medium">
                      {isTooFast
                        ? 'Terlalu cepat / goyang — perlambat langkah'
                        : isSteady
                          ? 'Kecepatan jalan ideal (~1 langkah/detik)'
                          : 'Cukup stabil — jaga ponsel setinggi dada'}
                    </span>
                    <span className="font-mono text-[11px] text-white/75">
                      {`${motionScore}°/dtk`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-ink/80 px-3 py-1.5 text-xs text-white backdrop-blur-md">
                    <Compass
                      size={14}
                      className={isHorizonLevel ? 'text-impact' : 'text-friction'}
                    />
                    <span>{isHorizonLevel ? 'Posisi Tegak' : 'Luruskan Horizon'}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Kontrol Rekaman */}
      <div className="flex flex-col gap-3 bg-panel px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
          <Badge variant="impact">
            <ShieldCheck size={12} />
            Auto-blur wajah & plat setelah selesai
          </Badge>
          {isRecording && !minDurationReached && (
            <span>
              Rekam minimal <strong className="font-mono text-ink">{Math.max(0, 20 - Math.floor(elapsedSec))} dtk</strong> lagi
            </span>
          )}
          {cashierMarkedSec !== null && (
            <Badge variant="primary">{`Kasir ditandai: ${formatMmSs(cashierMarkedSec)}`}</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isRecording ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!cameraReady}
              onClick={handleStartRecording}
              className="!rounded-full"
            >
              <Camera size={16} />
              Mulai Rekam Jalur
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  const sec = Math.max(1, Math.round(elapsedRef.current));
                  cashierMarkedRef.current = sec;
                  setCashierMarkedSec(sec);
                  setManualStageIdx(3);
                }}
                className="!rounded-full"
              >
                <MapPin size={14} />
                {cashierMarkedSec ? `Kasir (${formatMmSs(cashierMarkedSec)})` : 'Tandai Titik Kasir'}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!minDurationReached}
                onClick={handleMarkCashierAndFinish}
                className="!rounded-full"
                title={
                  minDurationReached
                    ? 'Tandai kasir dan gunakan rekaman ini'
                    : 'Rekam minimal 20 detik terlebih dahulu'
                }
              >
                {minDurationReached ? (
                  <>
                    <Check size={16} />
                    Tandai Kasir & Selesai ({formatMmSs(elapsedSec)})
                  </>
                ) : (
                  <>
                    <Square size={14} />
                    Minimal 20 dtk ({formatMmSs(elapsedSec)})
                  </>
                )}
              </Button>

              {minDurationReached && (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-xs font-medium text-ink-soft transition hover:bg-hover"
                >
                  <Square size={13} />
                  Selesai
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
