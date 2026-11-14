'use client';

import {
  AlertTriangle,
  Camera,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  Pause,
  Play,
  ShieldCheck,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';
import { LiveCameraRecorder } from '@/components/video/live-camera-recorder';
import {
  completeVideoUpload,
  fetchVideoMetadata,
  uploadKeyframesToStorage,
  uploadVideoToSupabaseStorage,
} from '@/lib/api/crud';
import {
  detectPrivacyBoxesAsync,
  exportRedactedVideoFile,
  renderSelectivePrivacyBlur,
  type PrivacyBox,
} from '@/lib/video/privacy-blur';
import {
  buildChecksFromMetrics,
  inspectVideoFile,
  isSupportedVideoFile,
  type VideoCheckItem,
} from '@/lib/video/quality-inspector';

function toSeconds(value: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function toMmSs(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('analysisId') || 'selasar-kopi';
  const businessId = searchParams.get('businessId');
  const inputRef = useRef<HTMLInputElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [sampledFrames, setSampledFrames] = useState<string[]>([]);
  const [sampledTimestamps, setSampledTimestamps] = useState<number[]>([]);
  const [durationSec, setDurationSec] = useState<number>(48);
  const [widthPx, setWidthPx] = useState<number>(1920);
  const [heightPx, setHeightPx] = useState<number>(1080);
  const [blurredFaces, setBlurredFaces] = useState<number>(0);
  const [blurredPlates, setBlurredPlates] = useState<number>(0);
  const [liveDetectionsCount, setLiveDetectionsCount] = useState<{ faces: number; plates: number }>({
    faces: 0,
    plates: 0,
  });
  const [checks, setChecks] = useState<VideoCheckItem[]>(
    () =>
      buildChecksFromMetrics({
        durationSec: 48,
        width: 1920,
        height: 1080,
      }).checks,
  );
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<boolean>(true);
  const [inspecting, setInspecting] = useState<boolean>(false);

  const [dragging, setDragging] = useState(false);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [blurPreviewActive, setBlurPreviewActive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaySec, setCurrentPlaySec] = useState<number>(0);
  const [cashierTime, setCashierTime] = useState('00:48');
  const [saving, setSaving] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);

  const lastBoxesRef = useRef<PrivacyBox[]>([]);

  const renderFrameToCanvas = useCallback(
    async (forceDetect = false) => {
      const video = videoElRef.current;
      const canvas = canvasElRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (forceDetect) {
        const detected = await detectPrivacyBoxesAsync(video);
        lastBoxesRef.current = detected;
        setLiveDetectionsCount({
          faces: detected.filter((b) => b.kind === 'face').length,
          plates: detected.filter((b) => b.kind === 'plate').length,
        });
      }

      renderSelectivePrivacyBlur(ctx, video, lastBoxesRef.current, {
        blurEnabled: blurPreviewActive,
        showIndicators: blurPreviewActive,
      });
    },
    [blurPreviewActive],
  );

  // Loop render real-time saat video diputar
  useEffect(() => {
    if (!previewUrl) return;
    let rafId = 0;
    let frameTick = 0;
    let active = true;

    const loop = async () => {
      if (!active) return;
      const video = videoElRef.current;
      if (video && !video.paused && !video.ended) {
        const shouldDetect = frameTick % 3 === 0;
        frameTick += 1;
        await renderFrameToCanvas(shouldDetect);
        rafId = requestAnimationFrame(() => void loop());
      }
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(() => void loop());
    } else {
      void renderFrameToCanvas(true);
    }

    return () => {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [previewUrl, isPlaying, blurPreviewActive, renderFrameToCanvas]);

  useEffect(() => {
    void fetchVideoMetadata(analysisId).then((meta) => {
      if (!meta.original_filename) {
        setVideoName(null);
        return;
      }

      const dur = meta.duration_s && meta.duration_s > 0 ? meta.duration_s : 48;
      const w = meta.width || 1920;
      const h = meta.height || 1080;
      const faces = meta.blurred_faces_count ?? 0;
      const plates = meta.blurred_plates_count ?? 0;

      setVideoName(meta.original_filename);
      if (meta.public_url) {
        setPreviewUrl(meta.public_url);
      }
      setDurationSec(dur);
      setWidthPx(w);
      setHeightPx(h);
      setBlurredFaces(faces);
      setBlurredPlates(plates);

      const built = buildChecksFromMetrics({
        durationSec: dur,
        width: w,
        height: h,
        blurredFacesCount: faces,
        blurredPlatesCount: plates,
      });
      setChecks(built.checks);
      setAccepted(built.accepted);
      setRejectionReasons(built.rejectionReasons);

      if (meta.cashier_at_s !== undefined && meta.cashier_at_s !== null) {
        setCashierTime(toMmSs(meta.cashier_at_s));
      } else {
        setCashierTime(toMmSs(dur));
      }
    });
  }, [analysisId]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const hasVideo = videoName !== null;
  const durationFormatted = toMmSs(durationSec);
  const cashierSec = toSeconds(cashierTime);
  const cashierValid = cashierSec !== null && cashierSec > 0 && cashierSec <= Math.ceil(durationSec);
  const canContinue = hasVideo && accepted && cashierValid && !saving && !inspecting;

  const pickFile = async (f: File | undefined, overrideCashierSec?: number) => {
    if (!isSupportedVideoFile(f)) return;
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);

    const url = URL.createObjectURL(f);
    setSelectedFile(f);
    setPreviewUrl(url);
    setVideoName(f.name);
    setLiveCameraOpen(false);
    setIsPlaying(false);
    setInspecting(true);

    try {
      const result = await inspectVideoFile(f);
      setDurationSec(result.durationSec);
      setWidthPx(result.width);
      setHeightPx(result.height);
      setBlurredFaces(result.blurredFacesCount);
      setBlurredPlates(result.blurredPlatesCount);
      setSampledFrames(result.sampledFrameDataUrls);
      setSampledTimestamps(result.sampledFrameTimestamps);
      setChecks(result.checks);
      setAccepted(result.accepted);
      setRejectionReasons(result.rejectionReasons);
      setCashierTime(
        toMmSs(
          overrideCashierSec && overrideCashierSec > 0
            ? Math.min(overrideCashierSec, result.durationSec)
            : result.durationSec,
        ),
      );
      setCurrentPlaySec(0);
    } finally {
      setInspecting(false);
    }
  };

  const clearVideo = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setVideoName(null);
    setSampledFrames([]);
    setSampledTimestamps([]);
    setIsPlaying(false);
    setRejectionReasons([]);
    lastBoxesRef.current = [];
  };

  const togglePlayPause = () => {
    const video = videoElRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const handleSeekSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sec = Number(e.target.value);
    setCurrentPlaySec(sec);
    const video = videoElRef.current;
    if (video) {
      video.currentTime = sec;
    }
  };

  const handleMarkCashierFromPlayer = () => {
    const sec = videoElRef.current ? videoElRef.current.currentTime : currentPlaySec;
    const clamped = Math.max(1, Math.min(Math.round(sec || durationSec), Math.round(durationSec)));
    setCashierTime(toMmSs(clamped));
  };

  const querySuffix = `?analysisId=${encodeURIComponent(analysisId)}${
    businessId ? `&businessId=${encodeURIComponent(businessId)}` : ''
  }`;

  const handleContinue = async () => {
    if (!canContinue || !videoName || cashierSec === null) return;
    setSaving(true);
    try {
      let storageKey: string | undefined;
      let frameUrls: string[] = [];
      let timestampsToSend: number[] = sampledTimestamps;
      if (selectedFile) {
        setUploadStage('Memburamkan wajah & plat nomor di perangkatmu...');
        const redactedFile = await exportRedactedVideoFile(selectedFile, (ratio) => {
          setUploadStage(`Memburamkan wajah & plat nomor (${Math.round(ratio * 100)}%)...`);
        });

        setUploadStage('Mengunggah video terburam ke Supabase Storage...');
        const uploaded = await uploadVideoToSupabaseStorage(analysisId, redactedFile);
        storageKey = uploaded.storageKey;

        let framesToUpload = sampledFrames;
        if (framesToUpload.length === 0 && videoElRef.current && videoElRef.current.readyState >= 2) {
          const v = videoElRef.current;
          const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : durationSec;
          const targetFrames = Math.min(20, Math.max(10, Math.round(dur / 2.2)));
          const pts = Array.from({ length: targetFrames }, (_, idx) => {
            const ratio = (idx + 0.5) / targetFrames;
            return Math.min(dur - 0.1, Math.max(0.1, dur * ratio));
          });
          const c = document.createElement('canvas');
          c.width = 640;
          c.height = 360;
          const cctx = c.getContext('2d');
          if (cctx) {
            const captured: string[] = [];
            const capturedTs: number[] = [];
            for (const pt of pts) {
              await new Promise<void>((res) => {
                const onSeek = () => {
                  v.removeEventListener('seeked', onSeek);
                  cctx.drawImage(v, 0, 0, c.width, c.height);
                  captured.push(c.toDataURL('image/jpeg', 0.78));
                  capturedTs.push(Math.round(v.currentTime * 10) / 10);
                  res();
                };
                v.addEventListener('seeked', onSeek, { once: true });
                v.currentTime = pt;
                window.setTimeout(() => {
                  v.removeEventListener('seeked', onSeek);
                  res();
                }, 1500);
              });
            }
            if (captured.length > 0) {
              framesToUpload = captured;
              timestampsToSend = capturedTs;
            }
          }
        }

        if (framesToUpload.length > 0) {
          setUploadStage('Mengunggah frame bukti transkrip...');
          frameUrls = await uploadKeyframesToStorage(analysisId, framesToUpload);
        }
      }

      setUploadStage('Menjadwalkan job Transkrip VLM & Visual Twin 3D...');
      const qualityMap: Record<string, string> = {};
      for (const c of checks) {
        qualityMap[c.key] = c.value;
      }

      await completeVideoUpload(analysisId, {
        original_filename: videoName,
        storage_key: storageKey,
        duration_s: Math.round(durationSec * 10) / 10,
        cashier_at_s: cashierSec,
        width: widthPx,
        height: heightPx,
        accepted,
        quality_checks: qualityMap,
        blurred_faces_count: blurredFaces,
        blurred_plates_count: blurredPlates,
        frame_keys: frameUrls.length > 0 ? frameUrls : sampledFrames.length > 0 ? sampledFrames : undefined,
        frame_timestamps_s: timestampsToSend.length > 0 ? timestampsToSend : undefined,
      });
      router.push(`/business/analysis/proses${querySuffix}`);
    } finally {
      setSaving(false);
      setUploadStage(null);
    }
  };

  const shortestSide = Math.min(widthPx, heightPx);

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
            <Badge
              variant={!hasVideo ? 'primary' : accepted ? 'impact' : 'friction'}
              size="md"
            >
              {!hasVideo
                ? 'Belum ada video'
                : inspecting
                  ? 'Memindai wajah & plat (MediaPipe)...'
                  : accepted
                    ? 'Semua syarat terpenuhi'
                    : 'Video perlu direkam ulang'}
            </Badge>
          </div>

          <div className="rounded-md border border-line bg-white">
            <div className="space-y-12 p-6 sm:p-10">
              {/* 1. Video */}
              <section>
                <SectionTitle
                  n={1}
                  title="Video jalur pelanggan"
                  description="Wajah dan plat nomor diburamkan secara spesifik dengan MediaPipe di perangkatmu; fasad toko & menu tetap tajam."
                />

                <input
                  ref={inputRef}
                  type="file"
                  accept=".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm,video/*"
                  className="hidden"
                  onChange={(e) => void pickFile(e.target.files?.[0])}
                />

                {hasVideo ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{videoName}</span>
                        <Badge>{`${Math.round(durationSec)} detik`}</Badge>
                        <Badge>{`${shortestSide}p`}</Badge>
                        {previewUrl && blurPreviewActive && (
                          <Badge variant="impact">
                            <ShieldCheck size={12} />
                            {`Frame ini: ${liveDetectionsCount.faces} wajah, ${liveDetectionsCount.plates} plat diblur`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="!rounded-md"
                          onClick={() => setBlurPreviewActive((v) => !v)}
                        >
                          {blurPreviewActive ? <Eye size={14} /> : <EyeOff size={14} />}
                          {blurPreviewActive ? 'Blur Wajah & Plat: Aktif' : 'Tampilan Asli (Tanpa Blur)'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="!rounded-md"
                          onClick={() => setLiveCameraOpen(true)}
                        >
                          <Camera size={14} />
                          Rekam Ulang
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="!rounded-md"
                          onClick={() => inputRef.current?.click()}
                        >
                          Ganti file
                        </Button>
                        <button
                          type="button"
                          onClick={clearVideo}
                          aria-label="Hapus video"
                          className="grid size-9 place-items-center rounded-md text-subtle transition-colors hover:bg-friction-10 hover:text-friction"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="relative flex h-[380px] w-full items-center justify-center overflow-hidden rounded-md bg-panel">
                      {previewUrl ? (
                        <>
                          {/* Elemen video sumber (disembunyikan, dirender ke canvas agar hanya bbox wajah & plat yang diblur) */}
                          <video
                            ref={videoElRef}
                            src={previewUrl}
                            playsInline
                            onLoadedData={() => void renderFrameToCanvas(true)}
                            onSeeked={() => void renderFrameToCanvas(true)}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                            onTimeUpdate={(e) => setCurrentPlaySec(e.currentTarget.currentTime)}
                            className="hidden"
                          />
                          <canvas
                            ref={canvasElRef}
                            onClick={togglePlayPause}
                            className="h-full w-full cursor-pointer object-contain bg-ink"
                          />

                          {/* Kontrol pemutar kustom di bagian bawah canvas */}
                          <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-md bg-ink/80 px-4 py-2.5 text-[12px] text-white backdrop-blur-md">
                            <input
                              type="range"
                              min={0}
                              max={Math.max(1, Math.ceil(durationSec))}
                              step={0.1}
                              value={Math.min(currentPlaySec, durationSec)}
                              onChange={handleSeekSlider}
                              className="h-1.5 w-full cursor-pointer accent-primary-40"
                            />
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={togglePlayPause}
                                  className="inline-flex size-7 items-center justify-center rounded bg-white/15 hover:bg-white/25 transition"
                                  aria-label={isPlaying ? 'Jeda' : 'Putar'}
                                >
                                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <span className="tabular-nums">
                                  {toMmSs(currentPlaySec)} / {durationFormatted}
                                </span>
                              </div>
                              <span className="text-white/80">
                                {cashierValid ? `Kasir di ${cashierTime}` : 'Kasir belum ditandai'}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="px-6 text-center">
                            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-md bg-primary-10 text-primary-40">
                              <Video size={22} />
                            </span>
                            <p className="text-[14px] font-medium text-ink">
                              Video terburam, siap dikirim
                            </p>
                            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
                              Hanya area wajah ({blurredFaces} terdeteksi) dan plat nomor ({blurredPlates} terdeteksi) yang diburamkan dengan MediaPipe. Fasad toko & papan menu tetap tajam.
                            </p>
                            <div className="mt-4 flex justify-center">
                              <Badge variant="impact" size="md">
                                <ShieldCheck size={13} />
                                Privasi selektif MediaPipe (Gaussian 15 px)
                              </Badge>
                            </div>
                          </div>

                          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-md bg-ink/75 px-4 py-2 text-[12px] text-white backdrop-blur-md">
                            <span className="tabular-nums">
                              {toMmSs(currentPlaySec)} / {durationFormatted}
                            </span>
                            <span className="text-white/80">
                              {cashierValid ? `Kasir di ${cashierTime}` : 'Kasir belum ditandai'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {rejectionReasons.length > 0 && (
                      <div className="rounded-md border border-friction/40 bg-friction-10 p-4 text-[13px] text-friction space-y-1.5">
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertTriangle size={15} />
                          <span>Video ditolak oleh pemeriksaan kualitas otomatis:</span>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-[12px] text-ink">
                          {rejectionReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : liveCameraOpen ? (
                  <LiveCameraRecorder
                    onComplete={(recordedFile, markedCashierSec) => {
                      void pickFile(recordedFile, markedCashierSec);
                    }}
                    onCancel={() => setLiveCameraOpen(false)}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-4 py-3">
                      <div className="text-[13px] text-ink-soft">
                        Belum punya rekaman? Rekam langsung dengan panduan garis horizon & kecepatan langkah di layar.
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="!rounded-full"
                        onClick={() => setLiveCameraOpen(true)}
                      >
                        <Camera size={14} />
                        Buka Kamera Langsung
                      </Button>
                    </div>

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
                        void pickFile(e.dataTransfer.files?.[0]);
                      }}
                      className={`flex h-[240px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center transition-colors ${
                        dragging ? 'border-primary-40 bg-primary-10' : 'border-[#c9ced6] bg-panel hover:bg-hover'
                      }`}
                    >
                      <span className="grid size-10 place-items-center rounded-md bg-white text-primary-40">
                        <Upload size={18} />
                      </span>
                      <span className="text-[13px] font-medium text-ink">
                        Tarik video ke sini atau <span className="text-primary-40">pilih file MP4 / MOV / WebM</span>
                      </span>
                      <span className="max-w-md text-[12px] text-muted">
                        Rekam dengan kamera ponsel sambil berjalan pelan, lalu unggah file asli (bukan kiriman WhatsApp). Durasi 20 detik sampai 3 menit.
                      </span>
                    </button>
                  </div>
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
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-36 shrink-0">
                    <Input
                      value={cashierTime}
                      onChange={(e) => setCashierTime(e.target.value)}
                      placeholder={durationFormatted}
                      inputMode="numeric"
                      className="tabular-nums"
                    />
                  </div>
                  <span className="whitespace-nowrap text-[13px] text-muted">dari {durationFormatted}</span>
                  {previewUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="!rounded-md"
                      onClick={handleMarkCashierFromPlayer}
                    >
                      Gunakan posisi video saat ini ({toMmSs(currentPlaySec)})
                    </Button>
                  )}
                </div>
                {!cashierValid && (
                  <p className="mt-2 text-[12px] text-friction">
                    Isi dengan format mm:dd (lebih dari 00:00 dan paling lambat {durationFormatted}).
                  </p>
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
                  {checks.map((qc) => (
                    <li key={qc.key} className="flex items-center gap-3 rounded-md border border-line px-4 py-3">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-md ${
                          qc.status === 'pass'
                            ? 'bg-impact-10 text-impact'
                            : qc.status === 'warn'
                              ? 'bg-primary-10 text-primary-40'
                              : 'bg-friction-10 text-friction'
                        }`}
                      >
                        {qc.status === 'fail' ? (
                          <X size={14} strokeWidth={2.5} />
                        ) : (
                          <Check size={14} strokeWidth={2.5} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-ink">{qc.label}</p>
                        <p className="mt-0.5 text-[12px] text-muted">{qc.value}</p>
                      </div>
                      <Badge
                        variant={
                          qc.status === 'pass'
                            ? 'impact'
                            : qc.status === 'warn'
                              ? 'primary'
                              : 'friction'
                        }
                      >
                        {qc.status === 'pass' ? 'Lolos' : qc.status === 'warn' ? 'Peringatan' : 'Ditolak'}
                      </Badge>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-start gap-3 rounded-md bg-primary-10 p-4">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary-40" />
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    Wajah dan plat nomor kendaraan diburamkan otomatis di perangkatmu menggunakan deteksi bounding box MediaPipe, sehingga tidak muncul di transkrip maupun model 3D. Video mentah tidak pernah disimpan di server.
                  </p>
                </div>
              </section>
            </div>

            {/* Kaki container: kembali & lanjut */}
            <div className="flex flex-col-reverse gap-3 rounded-b-md bg-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push(`/business/analysis/konteks${querySuffix}`)}
                className="justify-center !rounded-md"
              >
                <ArrowLeftIcon size={16} /> Kembali ke konteks usaha
              </Button>
              <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!canContinue}
                  onClick={() => void handleContinue()}
                  className="justify-center !rounded-md"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      {uploadStage ?? 'Menyimpan...'}
                    </>
                  ) : (
                    <>
                      Lanjut ke pemrosesan <ArrowRightIcon size={16} />
                    </>
                  )}
                </Button>
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
