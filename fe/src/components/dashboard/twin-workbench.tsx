"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import type { TwinSource } from "./twin-scene";

const TwinScene = dynamic(() => import("./twin-scene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center font-mono text-[12px] text-subtle">Memuat 3D…</div>,
});

/* ---------- Aturan dari PRD F2 ---------- */

const MIN_S = 20;
const MAX_S = 180;
const SAMPLE_SPLAT = "https://huggingface.co/cakewalk/splat-data/resolve/main/nike.splat";

// Tahap sama dengan twin/twin_worker/pipeline.py
const STAGES = ["Ekstraksi frame", "Masking orang & kendaraan", "Pose kamera", "Rekonstruksi 3D", "Ekspor"];

type VideoInfo = { file: File; url: string; duration: number; width: number; height: number };
type Phase = { kind: "idle" } | { kind: "running"; stage: number } | { kind: "done" };

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

export function TwinWorkbench({ initialSrc }: { initialSrc?: string }) {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [source, setSource] = useState<TwinSource>(() => sourceFromUrl(initialSrc));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);
  useEffect(() => () => (video ? URL.revokeObjectURL(video.url) : undefined), [video]);
  useEffect(() => () => (source.kind !== "demo" && source.url.startsWith("blob:") ? URL.revokeObjectURL(source.url) : undefined), [source]);

  const pickVideo = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith("video/")) return;
    clearTimers();
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

  const checks = video
    ? [
        { label: `Durasi ${formatDuration(video.duration)}`, ok: video.duration >= MIN_S && video.duration <= MAX_S, hint: "20 detik – 3 menit" },
        { label: `Resolusi ${video.width}×${video.height}`, ok: Math.min(video.width, video.height) >= 720, hint: "minimal 720p" },
        { label: `Ukuran ${formatSize(video.file.size)}`, ok: video.file.size < 1e9, hint: "di bawah 1 GB" },
      ]
    : [];
  const accepted = checks.length > 0 && checks.every((c) => c.ok);

  // TODO(M8b): ganti simulasi ini dengan POST /api/v1/analyses/{id}/video lalu polling /twin.
  const build = () => {
    clearTimers();
    setLoadError(null);
    STAGES.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setPhase({ kind: "running", stage: i }), i * 900));
    });
    timers.current.push(
      window.setTimeout(() => {
        setPhase({ kind: "done" });
        setSource({ kind: "demo" });
      }, STAGES.length * 900),
    );
  };

  const badge =
    phase.kind === "running"
      ? { text: "Memproses", tone: "text-primary-40 border-primary-20" }
      : source.kind === "demo"
        ? { text: phase.kind === "done" ? "Hasil contoh" : "Contoh", tone: "text-muted border-line" }
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
                    <span className={`grid size-4 place-items-center rounded-full text-[10px] text-white ${c.ok ? "bg-impact" : "bg-friction"}`}>
                      {c.ok ? "✓" : "!"}
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

          <div className="mt-auto flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!accepted || phase.kind === "running"}
              onClick={build}
              className="btn-primary inline-flex h-10 flex-1 items-center justify-center rounded-md px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:filter-none"
            >
              {phase.kind === "running" ? "Memproses…" : "Bangun Visual Twin"}
            </button>
            {video && (
              <button
                type="button"
                onClick={() => {
                  clearTimers();
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
          {STAGES.map((s, i) => {
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
          <p className="mt-2 font-mono text-[10px] text-subtle">Simulasi UI · backend twin belum terhubung</p>
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
          <TwinScene source={source} onLoadError={() => setLoadError("File 3D tidak bisa dibaca.")} />

          {phase.kind === "running" && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[2px]">
              <div className="w-64 text-center">
                <p className="text-sm text-ink">{STAGES[phase.stage]}…</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-hairline">
                  <div
                    className="h-full rounded-full bg-primary-40 transition-[width] duration-700"
                    style={{ width: `${((phase.stage + 1) / STAGES.length) * 100}%` }}
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

          <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted">
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
          Tampilan 3D adalah perkiraan dari video, bukan ukuran sebenarnya. Seret untuk memutar, scroll untuk zoom.
        </footer>
      </section>
    </div>
  );
}
