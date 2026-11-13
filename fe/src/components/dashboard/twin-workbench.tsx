"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { LOCAL_STAGES } from "@/lib/twin-stages";

import type { TwinSource } from "./twin-scene";
import { walkInput, type NavMode } from "./walk-input";

const TwinScene = dynamic(() => import("./twin-scene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center font-mono text-[12px] text-subtle">Memuat 3D…</div>,
});

/* ---------- Aturan dari PRD F2 ---------- */

const MIN_S = 20;
const MAX_S = 180;
// Sisi terpendek video (px). Di bawah MIN ditolak; MIN..GOOD diterima dengan peringatan.
const MIN_SHORT_SIDE = 480;
const GOOD_SHORT_SIDE = 720;
const SAMPLE_SPLAT = "https://huggingface.co/cakewalk/splat-data/resolve/main/nike.splat";

const POLL_MS = 2000;

type VideoInfo = { file: File; url: string; duration: number; width: number; height: number };
type JobResult = { ply: string; splat?: string; registered: number; frames: number; diagnosis?: string };
type Phase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "running"; id: string; stage: number; startedAt: number }
  | { kind: "done"; id: string; result: JobResult; seconds: number }
  | { kind: "failed"; message: string };

function qualityLabel(r: JobResult) {
  const ratio = r.frames > 0 ? r.registered / r.frames : 0;
  if (ratio >= 0.8) return { text: "Kualitas baik", tone: "text-impact" };
  if (ratio >= 0.5) return { text: "Kualitas cukup", tone: "text-muted" };
  return { text: "Kualitas rendah", tone: "text-friction" };
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

function formatSize(bytes: number) {
  return bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(1)} MB`;
}

/** `/dasbor?src=/samples/twin.ply` memuat hasil 3D dari URL (demo & uji tanpa upload). */
function sourceFromUrl(src?: string): TwinSource {
  const ext = src?.split("?")[0].split(".").pop()?.toLowerCase();
  if (src && (ext === "ply" || ext === "splat")) {
    return { kind: ext, url: src, name: src.split("/").pop() ?? src };
  }
  return { kind: "demo" };
}

export function TwinWorkbench({ initialSrc, initialMode }: { initialSrc?: string; initialMode?: NavMode }) {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [source, setSource] = useState<TwinSource>(() => sourceFromUrl(initialSrc));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [navMode, setNavMode] = useState<NavMode>(initialMode ?? "putar");
  const [tourPlaying, setTourPlaying] = useState(true);
  const [tourProgress, setTourProgress] = useState(0);
  const [pathAvailable, setPathAvailable] = useState(false);
  const [withSplat, setWithSplat] = useState(false);
  // Diisi dari interval saat job berjalan (Date.now() tidak boleh dipanggil saat render).
  const [now, setNow] = useState(0);
  const poll = useRef<number | null>(null);

  const stopPolling = () => {
    if (poll.current !== null) window.clearInterval(poll.current);
    poll.current = null;
  };

  useEffect(() => stopPolling, []);

  // Jam untuk menampilkan lama proses saat berjalan.
  useEffect(() => {
    if (phase.kind !== "running") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [phase.kind]);
  useEffect(() => () => (video ? URL.revokeObjectURL(video.url) : undefined), [video]);
  useEffect(() => () => (source.kind !== "demo" && source.url.startsWith("blob:") ? URL.revokeObjectURL(source.url) : undefined), [source]);

  const pickVideo = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith("video/")) return;
    stopPolling();
    setPhase({ kind: "idle" });
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () =>
      setVideo({ file, url, duration: probe.duration, width: probe.videoWidth, height: probe.videoHeight });
    probe.src = url;
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickVideo(e.dataTransfer.files[0]);
  };

  const pickModel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "ply" && ext !== "splat") {
      setLoadError("Format belum didukung. Pakai .ply (awan titik/mesh) atau .splat.");
      return;
    }
    setLoadError(null);
    setSource({ kind: ext, url: URL.createObjectURL(file), name: file.name });
  };

  // Resolusi dinilai dari sisi terpendek, jadi video portrait dan landscape diperlakukan sama.
  const shortSide = video ? Math.min(video.width, video.height) : 0;
  const checks: { label: string; ok: boolean; warn?: boolean; hint: string }[] = video
    ? [
        { label: `Durasi ${formatDuration(video.duration)}`, ok: video.duration >= MIN_S && video.duration <= MAX_S, hint: "20 detik – 3 menit" },
        {
          label: `Resolusi ${video.width}×${video.height}`,
          ok: shortSide >= MIN_SHORT_SIDE,
          warn: shortSide >= MIN_SHORT_SIDE && shortSide < GOOD_SHORT_SIDE,
          hint:
            shortSide < MIN_SHORT_SIDE
              ? `sisi pendek min ${MIN_SHORT_SIDE} px`
              : shortSide < GOOD_SHORT_SIDE
                ? "rendah, hasil bisa kurang detail"
                : "baik",
        },
        { label: `Ukuran ${formatSize(video.file.size)}`, ok: video.file.size < 1e9, hint: "di bawah 1 GB" },
      ]
    : [];
  const accepted = checks.length > 0 && checks.every((c) => c.ok);

  // Mode lokal (development): /api/twin menjalankan twin/scripts/local_twin.sh.
  // Produksi nanti memakai antrean worker di be/ + twin/ (PRD 4.2).
  const build = async () => {
    if (!video) return;
    stopPolling();
    setLoadError(null);
    setPhase({ kind: "uploading" });

    const form = new FormData();
    form.append("video", video.file);
    form.append("duration", String(video.duration));
    if (withSplat) form.append("splat", "1");

    let id: string;
    try {
      const res = await fetch("/api/twin", { method: "POST", body: form });
      const body = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !body.id) throw new Error(body.error ?? `HTTP ${res.status}`);
      id = body.id;
    } catch (err) {
      setPhase({ kind: "failed", message: `Gagal mengunggah: ${(err as Error).message}` });
      return;
    }

    const startedAt = Date.now();
    setPhase({ kind: "running", id, stage: 0, startedAt });
    poll.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/twin/${id}`, { cache: "no-store" });
        const job = (await res.json()) as {
          status: "running" | "done" | "failed";
          stage: number;
          message?: string;
          result?: JobResult;
        };
        if (job.status === "running") {
          setPhase({ kind: "running", id, stage: job.stage, startedAt });
        } else if (job.status === "done" && job.result) {
          stopPolling();
          const seconds = Math.round((Date.now() - startedAt) / 1000);
          setPhase({ kind: "done", id, result: job.result, seconds });
          const url = job.result.splat ?? job.result.ply;
          setSource({ kind: url.endsWith(".splat") ? "splat" : "ply", url, name: url.split("/").pop() ?? id });
        } else if (job.status === "failed") {
          stopPolling();
          setPhase({ kind: "failed", message: job.message ?? "Pemrosesan gagal." });
        }
      } catch {
        // jaringan sesaat bermasalah: coba lagi di putaran berikutnya
      }
    }, POLL_MS);
  };

  const busy = phase.kind === "uploading" || phase.kind === "running";
  const tourAvailable = source.kind !== "demo" && pathAvailable;
  const effectiveMode: NavMode = navMode === "tur" && !tourAvailable ? "putar" : navMode;
  const stages = withSplat || (phase.kind === "done" && phase.result.splat) ? LOCAL_STAGES : LOCAL_STAGES.slice(0, 5);
  const elapsed = phase.kind === "running" && now > 0 ? Math.max(0, Math.round((now - phase.startedAt) / 1000)) : 0;

  const badge = busy
    ? { text: "Memproses", tone: "text-primary-40 border-primary-20" }
    : source.kind === "demo"
      ? { text: "Contoh", tone: "text-muted border-line" }
      : { text: source.name, tone: "text-ink border-line" };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
      {/* ---------- Kiri: video ---------- */}
      <section className="flex flex-col rounded-[10px] border border-line bg-white">
        <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <p className="text-sm font-medium text-ink">Video tempat usaha</p>
          <p className="font-mono text-[11px] text-subtle">Langkah 1</p>
        </header>

        <div className="flex flex-1 flex-col gap-5 p-5">
          {video ? (
            <video src={video.url} controls playsInline className="aspect-video w-full rounded-md bg-ink object-contain" />
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center transition ${
                dragging ? "border-primary-40 bg-primary-10" : "border-line bg-panel hover:bg-primary-10/50"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-6 text-subtle" aria-hidden>
                <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-ink">Seret video ke sini atau pilih file</span>
              <span className="font-mono text-[11px] text-subtle">MP4 / MOV · 20 detik – 3 menit</span>
              <input type="file" accept="video/*" className="sr-only" onChange={(e) => pickVideo(e.target.files?.[0])} />
            </label>
          )}

          <ul className="space-y-2 text-[13px]">
            {video ? (
              checks.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span
                      className={`grid size-4 place-items-center rounded-full text-[10px] text-white ${
                        !c.ok ? "bg-friction" : c.warn ? "bg-amber-500" : "bg-impact"
                      }`}
                    >
                      {c.ok && !c.warn ? "✓" : "!"}
                    </span>
                    {c.label}
                  </span>
                  <span className="font-mono text-[11px] text-subtle">{c.hint}</span>
                </li>
              ))
            ) : (
              <li className="text-muted">
                Rekam dari sisi jalan sampai kasir, pelan sambil berjalan. Wajah akan diburamkan sebelum diunggah (belum
                aktif di placeholder ini).
              </li>
            )}
          </ul>

          {video && (
            <label className="flex items-center gap-2 text-[13px] text-ink-soft">
              <input
                type="checkbox"
                checked={withSplat}
                disabled={busy}
                onChange={(e) => setWithSplat(e.target.checked)}
                className="size-4 accent-primary-40"
              />
              Tampilan realistis (splat), tambah sekitar 8 menit
            </label>
          )}

          <div className="mt-auto flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!accepted || busy}
              onClick={() => void build()}
              className="btn-primary inline-flex h-10 flex-1 items-center justify-center rounded-md px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:filter-none"
            >
              {phase.kind === "uploading" ? "Mengunggah…" : phase.kind === "running" ? "Memproses…" : "Bangun Visual Twin"}
            </button>
            {video && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  stopPolling();
                  setVideo(null);
                  setPhase({ kind: "idle" });
                }}
                className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm text-ink hover:bg-panel"
              >
                Ganti video
              </button>
            )}
          </div>
        </div>

        {/* Tahap pipeline */}
        <ol className="border-t border-hairline px-5 py-4">
          {stages.map((s, i) => {
            const state =
              phase.kind === "done" || (phase.kind === "running" && i < phase.stage)
                ? "done"
                : phase.kind === "running" && i === phase.stage
                  ? "active"
                  : "todo";
            return (
              <li key={s} className="flex items-center gap-3 py-1 text-[13px]">
                <span
                  className={`size-2 rounded-full ${
                    state === "done" ? "bg-impact" : state === "active" ? "animate-pulse bg-primary-40" : "bg-line"
                  }`}
                />
                <span className={state === "todo" ? "text-subtle" : "text-ink-soft"}>{s}</span>
              </li>
            );
          })}
          {phase.kind === "running" && (
            <p className="mt-2 font-mono text-[10px] text-subtle">
              Berjalan {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} · biasanya 5–7 menit
              {withSplat ? " (+8 menit splat)" : ""}
            </p>
          )}
          {phase.kind === "done" && (
            <p className="mt-2 text-[12px] text-ink-soft">
              {phase.result.registered}/{phase.result.frames} frame terpetakan ·{" "}
              <span className={qualityLabel(phase.result).tone}>{qualityLabel(phase.result).text}</span> ·{" "}
              <a href="/hasil" className="text-primary-40 hover:underline">
                lihat di Riwayat
              </a>
              {phase.result.diagnosis && phase.result.registered < phase.result.frames * 0.8 && (
                <span className="mt-1.5 block rounded-md bg-friction-10 px-2.5 py-1.5 text-[12px] leading-5 text-ink-soft">
                  {phase.result.diagnosis}
                </span>
              )}
            </p>
          )}
          {phase.kind === "failed" && <p className="mt-2 text-[12px] text-friction">{phase.message}</p>}
          {(phase.kind === "idle" || phase.kind === "uploading") && (
            <p className="mt-2 font-mono text-[10px] text-subtle">Diproses lokal di mesin ini (mode development)</p>
          )}
        </ol>
      </section>

      {/* ---------- Kanan: Visual Twin ---------- */}
      <section className="flex flex-col overflow-hidden rounded-[10px] border border-line bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-ink">Visual Twin</p>
            <span className={`max-w-48 truncate rounded-full border px-2 py-0.5 font-mono text-[11px] ${badge.tone}`}>
              {badge.text}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-ink hover:bg-panel">
              Muat .ply / .splat
              <input type="file" accept=".ply,.splat" className="sr-only" onChange={pickModel} />
            </label>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setSource({ kind: "splat", url: SAMPLE_SPLAT, name: "nike.splat (contoh)" });
              }}
              className="rounded-md border border-line px-3 py-1.5 text-ink hover:bg-panel"
            >
              Contoh splat
            </button>
            {source.kind !== "demo" && (
              <button
                type="button"
                onClick={() => setSource({ kind: "demo" })}
                className="rounded-md px-2 py-1.5 text-muted hover:text-ink"
              >
                Reset
              </button>
            )}
          </div>
        </header>

        <div className="relative h-105 sm:h-130 lg:h-full lg:min-h-140">
          <TwinScene
            source={source}
            onLoadError={() => setLoadError("File 3D tidak bisa dibaca.")}
            mode={effectiveMode}
            tourPlaying={tourPlaying}
            onTourProgress={setTourProgress}
            onPathAvailable={setPathAvailable}
          />

          {/* Mode navigasi */}
          <div className="absolute right-3 top-3 flex rounded-md border border-line bg-white/90 p-0.5 text-[12px] backdrop-blur">
            {(
              [
                ["putar", "Putar"],
                ["jalan", "Jalan"],
                ["tur", "Tur"],
              ] as const
            ).map(([mode, label]) => {
              const disabled = mode === "tur" && !tourAvailable;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled}
                  title={disabled ? "Tur butuh jalur rekaman (hasil dari pipeline)" : undefined}
                  onClick={() => {
                    setNavMode(mode);
                    if (mode === "tur") setTourPlaying(true);
                  }}
                  className={`rounded px-2.5 py-1 transition ${
                    effectiveMode === mode ? "bg-ink text-white" : "text-ink-soft hover:bg-panel"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {effectiveMode === "tur" && (
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-md border border-line bg-white/90 px-3 py-2 backdrop-blur">
              <button
                type="button"
                onClick={() => setTourPlaying((v) => !v)}
                className="rounded border border-line px-2.5 py-1 text-[12px] text-ink hover:bg-panel"
              >
                {tourPlaying ? "Jeda" : "Putar"}
              </button>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
                <div className="h-full rounded-full bg-primary-40" style={{ width: `${tourProgress * 100}%` }} />
              </div>
              <span className="font-mono text-[11px] text-muted">menyusuri jalur rekaman</span>
            </div>
          )}

          {effectiveMode === "jalan" && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
              <p className="rounded-md border border-line bg-white/90 px-3 py-2 font-mono text-[11px] leading-5 text-muted backdrop-blur">
                W A S D / panah: jalan · seret: menoleh
                <br />Q / E: turun / naik · Shift: cepat
              </p>
              <div className="pointer-events-auto grid grid-cols-3 gap-1">
                {(
                  [
                    ["", null],
                    ["▲", { forward: 1 }],
                    ["", null],
                    ["◀", { right: -1 }],
                    ["▼", { forward: -1 }],
                    ["▶", { right: 1 }],
                  ] as const
                ).map(([label, move], i) =>
                  move ? (
                    <button
                      key={i}
                      type="button"
                      aria-label={`jalan ${label}`}
                      onPointerDown={() => Object.assign(walkInput, move)}
                      onPointerUp={() => Object.assign(walkInput, { forward: 0, right: 0 })}
                      onPointerLeave={() => Object.assign(walkInput, { forward: 0, right: 0 })}
                      className="grid size-9 place-items-center rounded-md border border-line bg-white/90 text-[12px] text-ink active:bg-primary-10"
                    >
                      {label}
                    </button>
                  ) : (
                    <span key={i} />
                  ),
                )}
              </div>
            </div>
          )}

          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[2px]">
              <div className="w-64 text-center">
                <p className="text-sm text-ink">
                  {phase.kind === "running" ? `${stages[Math.min(phase.stage, stages.length - 1)]}…` : "Mengunggah video…"}
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-hairline">
                  <div
                    className="h-full rounded-full bg-primary-40 transition-[width] duration-700"
                    style={{ width: `${phase.kind === "running" ? ((phase.stage + 1) / stages.length) * 100 : 5}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {loadError && (
            <p className="absolute left-4 top-4 rounded-md border border-friction/30 bg-white px-3 py-1.5 text-[13px] text-friction">
              {loadError}
            </p>
          )}

          <div
            className={`pointer-events-none absolute bottom-3 left-4 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted ${
              source.kind === "demo" && effectiveMode === "putar" ? "" : "hidden"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-primary-40" /> jalur dilalui
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t border-dashed border-subtle" /> sering ditinggalkan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-friction" /> titik ragu
            </span>
          </div>
        </div>

        <footer className="border-t border-hairline px-5 py-3 text-[12px] text-muted">
          Tampilan 3D adalah perkiraan dari video, bukan ukuran sebenarnya.{" "}
          {effectiveMode === "putar"
            ? `Seret untuk memutar, scroll untuk zoom.${tourAvailable ? " Garis biru = jalur rekaman." : ""}`
            : effectiveMode === "jalan"
              ? "Mode Jalan: bergerak bebas di dalam model."
              : "Mode Tur: kamera mengikuti jalur dan arah pandang saat merekam."}
        </footer>
      </section>
    </div>
  );
}
