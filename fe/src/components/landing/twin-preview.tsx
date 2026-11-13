'use client';

import React from 'react';

interface TwinPreviewProps {
  className?: string;
  uid?: string;
}

export function TwinPreview({ className = '' }: TwinPreviewProps) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      {/* Viewport Frame */}
      <div className="relative aspect-video sm:aspect-[21/9] w-full rounded-md border border-line bg-panel/30 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#111827 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Viewfinder crosshairs (+) in 4 corners */}
        <span className="absolute top-3 left-3 font-mono text-xs text-subtle select-none">+</span>
        <span className="absolute top-3 right-3 font-mono text-xs text-subtle select-none">+</span>
        <span className="absolute bottom-3 left-3 font-mono text-xs text-subtle select-none">+</span>
        <span className="absolute bottom-3 right-3 font-mono text-xs text-subtle select-none">+</span>

        {/* Top Info Bar inside Viewport */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded bg-white/80 backdrop-blur-xs px-2.5 py-1 border border-line/80 text-[11px] font-mono text-ink">
            <span className="size-1.5 rounded-full bg-primary-40 animate-pulse" />
            <span>Visual Twin 3D (Dalam Kalibrasi Rekaman)</span>
          </div>

          <div className="flex items-center gap-2 rounded bg-white/80 backdrop-blur-xs px-2.5 py-1 border border-line/80 text-[11px] font-mono text-muted">
            <span>Pose Kamera Terkunci</span>
          </div>
        </div>

        {/* Center Technical Callout */}
        <div className="relative z-10 my-auto text-center max-w-md mx-auto py-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-medium block mb-1">
            Proyeksi Ruang & Lintasan Fisik
          </span>
          <p className="text-xs text-ink-soft leading-relaxed">
            Sistem memetakan stempel waktu video ke koordinat lintasan kamera.
            Hasil simulasi agen dipasangkan langsung ke titik-titik fisik di bawah ini.
          </p>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-subtle pt-2 border-t border-hairline/60">
          <span>Target FPS: 30 · Resolusi 1080p</span>
          <span>3 Zona Titik Pantau</span>
        </div>
      </div>

      {/* Waypoint Bar */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded border border-line bg-white p-2.5 text-xs">
          <span className="font-mono text-[10px] text-subtle block">00:04</span>
          <span className="font-medium text-ink block mt-0.5">Trotoar Depan</span>
          <span className="font-mono text-[11px] text-muted">Daya Tarik Baik</span>
        </div>
        <div className="rounded border-2 border-friction/40 bg-friction-10/40 p-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-friction font-bold">00:18</span>
            <span className="font-mono text-[9px] uppercase px-1 py-0.5 rounded bg-friction text-white font-semibold">
              Titik Friksi
            </span>
          </div>
          <span className="font-medium text-friction block mt-0.5">Akses Kaki Tangga</span>
          <span className="font-mono text-[11px] text-friction font-semibold">v 65,5% Bocor</span>
        </div>
        <div className="rounded border border-line bg-white p-2.5 text-xs">
          <span className="font-mono text-[10px] text-subtle block">00:36</span>
          <span className="font-medium text-ink block mt-0.5">Meja Kasir Lantai 2</span>
          <span className="font-mono text-[11px] text-impact font-medium">Konversi Solid</span>
        </div>
      </div>
    </div>
  );
}
