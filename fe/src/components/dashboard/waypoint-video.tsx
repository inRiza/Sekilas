'use client';

import { Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { fetchVideoMetadata } from '@/lib/api/crud';
import type { WaypointData } from '@/types/api';

/** "00:16" -> 16 */
function toSeconds(mmss: string): number {
  const [m, s] = mmss.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}

/**
 * Video terburam analisis + daftar titik pantau. Klik titik: video loncat ke detik itu dan
 * diputar, dan Visual Twin terbang ke posisi yang sama (lewat `onSelect`).
 */
export function WaypointVideo({
  analysisId,
  waypoints,
  active,
  onSelect,
}: {
  analysisId: string;
  waypoints: WaypointData[];
  active: string | null;
  onSelect: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void fetchVideoMetadata(analysisId).then((meta) => {
      if (!cancelled) setSrc(meta.public_url ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const jump = (wp: WaypointData) => {
    onSelect(wp.id);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = toSeconds(wp.time);
    void video.play().catch(() => {
      // Autoplay bisa ditolak browser; posisi tetap berpindah.
    });
  };

  return (
    // Desktop: video di kiri, daftar titik di kanan. Ponsel: bertumpuk.
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-ink/95">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            muted
            preload="metadata"
            onError={() => setSrc(null)}
            className="size-full object-contain"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-[12px] text-white/70">
            <Video size={20} />
            {src === undefined ? 'Memuat video…' : 'Video rekaman belum tersedia untuk analisis ini.'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {waypoints.map((wp) => (
          <button
            key={wp.id}
            type="button"
            onClick={() => jump(wp)}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left ring-1 transition ${
              active === wp.id
                ? 'bg-primary-10/60 ring-2 ring-primary-40'
                : wp.is_hotspot
                  ? 'bg-friction-10/60 ring-friction/30 hover:bg-friction-10'
                  : 'bg-panel ring-line/70 hover:bg-hover'
            }`}
          >
            <span className="w-9 shrink-0 font-mono text-[11px] text-muted">{wp.time}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight text-ink">{wp.name}</span>
              <span className={`block text-[12px] ${wp.is_hotspot ? 'font-medium text-friction' : 'text-muted'}`}>
                {wp.status}
              </span>
            </span>
            {wp.is_hotspot && (
              <span className="shrink-0 rounded-full bg-friction px-2 py-0.5 text-[10px] font-semibold text-white">
                Friksi
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
