"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, Pause, Play, Rotate3d, Route } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";

import type { TwinSource } from "./twin-scene";
import { walkInput, type NavMode } from "./walk-input";

const TwinScene = dynamic(() => import("./twin-scene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-[13px] text-subtle">Memuat 3D…</div>,
});

const MODES: { mode: NavMode; label: string; icon: typeof Rotate3d; hint: string }[] = [
  { mode: "putar", label: "Putar", icon: Rotate3d, hint: "Seret untuk memutar, gulir untuk zoom." },
  { mode: "jalan", label: "Jalan", icon: Footprints, hint: "Bergerak bebas di dalam model seperti calon pelanggan." },
  { mode: "tur", label: "Tur", icon: Route, hint: "Kamera menyusuri jalur dan arah pandang saat merekam." },
];

const WALK_PAD = [
  { key: "up", icon: ArrowUp, move: { forward: 1 }, col: "col-start-2" },
  { key: "left", icon: ArrowLeft, move: { right: -1 }, col: "col-start-1" },
  { key: "down", icon: ArrowDown, move: { forward: -1 }, col: "col-start-2" },
  { key: "right", icon: ArrowRight, move: { right: 1 }, col: "col-start-3" },
] as const;

/**
 * Penampil Visual Twin untuk dasbor: tab mode Putar / Jalan / Tur, kontrol tur, dan tombol jalan.
 * Bila file 3D gagal dimuat, otomatis memakai scene contoh.
 */
export function TwinViewer({
  source: initialSource,
  meta = [],
  activeWaypoint,
  onSelectWaypoint,
}: {
  source: TwinSource;
  meta?: string[];
  activeWaypoint?: string | null;
  onSelectWaypoint?: (id: string) => void;
}) {
  const [source, setSource] = useState<TwinSource>(initialSource);
  const [mode, setMode] = useState<NavMode>("putar");
  const [tourPlaying, setTourPlaying] = useState(true);
  const [tourProgress, setTourProgress] = useState(0);
  const [pathAvailable, setPathAvailable] = useState(false);

  const tourAvailable = source.kind !== "demo" && pathAvailable;
  const active: NavMode = mode === "tur" && !tourAvailable ? "putar" : mode;
  const activeMode = MODES.find((m) => m.mode === active)!;

  return (
    <div className="overflow-hidden rounded-md border border-line bg-white">
      {/* Kepala: judul, info, tab mode */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-medium text-ink">Visual Twin 3D</span>
          {source.kind === "demo" && <Badge>Contoh</Badge>}
          {meta.map((m) => (
            <Badge key={m}>{m}</Badge>
          ))}
        </div>
        <div className="inline-flex self-start rounded-md bg-soft p-1 sm:self-auto" role="tablist" aria-label="Mode tampilan 3D">
          {MODES.map(({ mode: m, label, icon: Icon }) => {
            const disabled = m === "tur" && !tourAvailable;
            const selected = active === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={disabled}
                title={disabled ? "Tur butuh jalur rekaman dari video" : undefined}
                onClick={() => {
                  setMode(m);
                  if (m === "tur") setTourPlaying(true);
                }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]" : "text-muted hover:text-ink"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanvas */}
      <div className="relative h-[420px] lg:h-[520px]">
        <TwinScene
          source={source}
          onLoadError={() => setSource({ kind: "demo" })}
          mode={active}
          tourPlaying={tourPlaying}
          activeWaypoint={activeWaypoint}
          onSelectWaypoint={(id) => {
            setMode("putar");
            onSelectWaypoint?.(id);
          }}
          onTourProgress={setTourProgress}
          onPathAvailable={setPathAvailable}
        />

        {active === "tur" && (
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-md bg-white/90 px-3 py-2 shadow-[0_1px_3px_rgba(16,24,40,0.08)] backdrop-blur">
            <button
              type="button"
              onClick={() => setTourPlaying((v) => !v)}
              aria-label={tourPlaying ? "Jeda tur" : "Putar tur"}
              className="grid size-8 place-items-center rounded-md bg-primary-40 text-white transition-colors hover:bg-primary-50"
            >
              {tourPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
              <div className="h-full rounded-full bg-primary-40" style={{ width: `${tourProgress * 100}%` }} />
            </div>
            <span className="hidden text-[12px] text-muted sm:inline">Menyusuri jalur rekaman</span>
          </div>
        )}

        {active === "jalan" && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
            <div className="hidden flex-wrap gap-1.5 sm:flex">
              <Badge>WASD / panah: jalan</Badge>
              <Badge>Seret: menoleh</Badge>
              <Badge>Q / E: turun / naik</Badge>
              <Badge>Shift: cepat</Badge>
            </div>
            <div className="pointer-events-auto grid grid-cols-3 gap-1">
              {WALK_PAD.map(({ key, icon: Icon, move, col }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Jalan ${key}`}
                  onPointerDown={() => Object.assign(walkInput, move)}
                  onPointerUp={() => Object.assign(walkInput, { forward: 0, right: 0 })}
                  onPointerLeave={() => Object.assign(walkInput, { forward: 0, right: 0 })}
                  className={`${col} ${key === "up" ? "row-start-1" : "row-start-2"} grid size-9 place-items-center rounded-md bg-white/90 text-ink shadow-[0_1px_3px_rgba(16,24,40,0.08)] active:bg-primary-10`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Kaki: petunjuk mode */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-panel px-4 py-2.5 text-[12px] text-muted sm:px-5">
        <span className="font-medium text-ink-soft">{activeMode.label}:</span>
        <span>{activeMode.hint}</span>
        <span className="flex-1" />
        <span>Tampilan 3D adalah perkiraan dari video, bukan ukuran sebenarnya.</span>
      </div>
    </div>
  );
}
