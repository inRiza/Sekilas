'use client';

import { useEffect, useState } from 'react';

import { fetchTwin, type TwinBuild } from '@/lib/api/crud';

const POLL_MS = 2000;

/** Tahap job Visual Twin dari backend (indeks + 1 = TwinBuildJob.stage). */
export const TWIN_STAGES = [
  'Mengambil frame dari video',
  'Mencari titik khas di tiap frame',
  'Mencocokkan frame berurutan',
  'Menyusun posisi kamera dan peta titik',
  'Membangun tampilan 3D realistis',
  'Selesai',
];

/** Status Visual Twin satu analisis; dipoll tiap 2 detik selama job masih berjalan. */
export function useTwin(analysisId: string | null): { twin: TwinBuild | null; error: string | null } {
  const [twin, setTwin] = useState<TwinBuild | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const t = await fetchTwin(analysisId);
      if (cancelled) return;
      if (t === null) {
        setError('Server Sekilas belum berjalan. Status Visual Twin belum bisa dibaca.');
        timer = setTimeout(tick, POLL_MS * 2);
        return;
      }
      setTwin(t);
      setError(null);
      const running = t.job && (t.job.status === 'antre' || t.job.status === 'berjalan');
      if (running) timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [analysisId]);

  return { twin, error };
}
