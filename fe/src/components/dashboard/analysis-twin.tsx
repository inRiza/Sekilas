'use client';

import { CircleAlert, LoaderCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useTwin } from '@/lib/use-twin';

import { TwinViewer } from './twin-viewer';

/**
 * Visual Twin satu analisis dari backend (GET /analyses/{aid}/twin):
 * menampilkan progres saat dibangun, pesan saat gagal, dan viewer 3D saat siap.
 */
export function AnalysisTwin({ aid }: { aid: string }) {
  const { twin, error } = useTwin(aid);
  const job = twin?.job;
  const assets = twin?.assets;

  if (assets) {
    const url = assets.splat_url ?? assets.ply_url;
    if (url) {
      const kind = url.endsWith('.splat') ? 'splat' : 'ply';
      const name = url.split('/').pop()!.replace(/\.(splat|ply)$/, '');
      return (
        <TwinViewer
          key={url}
          source={{ kind, url, name }}
          meta={[assets.quality_label, `${assets.registered} dari ${assets.frames} frame`, kind === 'splat' ? 'Splat' : 'Awan titik']}
        />
      );
    }
  }

  const building = job && (job.status === 'antre' || job.status === 'berjalan');
  const failed = job?.status === 'gagal';

  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-md border border-line bg-panel px-6 text-center lg:h-[520px]">
      {building ? (
        <>
          <LoaderCircle size={22} className="animate-spin text-primary-40" />
          <p className="text-[14px] font-medium text-ink">Visual Twin sedang dibangun</p>
          <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-primary-40 transition-[width] duration-700" style={{ width: `${Math.round(job.progress * 100)}%` }} />
          </div>
          <Badge>{job.stage_label}</Badge>
        </>
      ) : failed ? (
        <>
          <CircleAlert size={22} className="text-friction" />
          <p className="text-[14px] font-medium text-ink">Tampilan 3D tidak tersedia untuk video ini</p>
          <p className="max-w-md text-[13px] text-muted">Coba rekam ulang lebih pelan dengan kamera tegak, lalu unggah lagi.</p>
        </>
      ) : error ? (
        <>
          <CircleAlert size={22} className="text-friction" />
          <p className="max-w-md text-[13px] text-muted">{error}</p>
        </>
      ) : twin ? (
        <p className="text-[13px] text-muted">Belum ada video untuk analisis ini.</p>
      ) : (
        <LoaderCircle size={20} className="animate-spin text-subtle" />
      )}
    </div>
  );
}
