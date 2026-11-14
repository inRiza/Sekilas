'use client';

import { useEffect, useState } from 'react';

import { ApiError, backend, type Twin } from '@/lib/backend';

const POLL_MS = 2000;

/** Tahap job Visual Twin dari backend (urutan sama dengan Job.stage). */
export const TWIN_STAGES = [
  'Mengambil frame dari video',
  'Mencari titik khas di tiap frame',
  'Mencocokkan frame berurutan',
  'Menyusun posisi kamera dan peta titik',
  'Membangun tampilan 3D realistis',
  'Selesai',
];

/** Status Visual Twin satu analisis; dipoll tiap 2 detik selama job masih berjalan. */
export function useTwin(aid: string | null): { twin: Twin | null; error: string | null } {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!aid) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const t = await backend.getTwin(aid);
        if (cancelled) return;
        setTwin(t);
        setError(null);
        const running = t.job && (t.job.status === 'antre' || t.job.status === 'berjalan');
        if (running) timer = setTimeout(tick, POLL_MS);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Gagal membaca status Visual Twin.');
        timer = setTimeout(tick, POLL_MS * 2);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [aid]);

  return { twin, error };
}
