'use client';

import { CircleAlert, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { buildAgentMap, type AgentMap } from '@/lib/agent-map';
import { fetchAgentDecisions, fetchTranscriptSegments } from '@/lib/api/crud';
import { useTwin } from '@/lib/use-twin';

import { AgentFlowStrip } from './agent-replay';
import type { TwinWaypoint } from './twin-scene';
import { TwinViewer } from './twin-viewer';

/**
 * Visual Twin satu analisis dari backend (GET /analyses/{id}/twin): progres saat dibangun,
 * pesan saat gagal, dan viewer 3D (splat bila ada, selain itu awan titik) saat siap.
 */
export function AnalysisTwin({
  analysisId,
  meta = [],
  activeWaypoint,
  onSelectWaypoint,
  focusAgentId = null,
  waypoints = [],
}: {
  analysisId: string;
  meta?: string[];
  activeWaypoint?: string | null;
  onSelectWaypoint?: (id: string) => void;
  /** Agen yang perjalanannya langsung diputar (dari Jelajah Agen). */
  focusAgentId?: number | null;
  /** Titik pantau dasbor (detik di video) untuk penanda dan terbang-ke di 3D. */
  waypoints?: TwinWaypoint[];
}) {
  const { twin, error } = useTwin(analysisId);
  const job = twin?.job;
  const assets = twin?.assets;
  const agentMap = useAgentMap(analysisId);
  // Jalur 3D harus mencakup durasi transkrip; bila tidak (misal 3D contoh dari video lain),
  // posisi agen dan titik pantau akan salah tempat, jadi keduanya tidak ditampilkan di 3D.
  const transcriptEnd = agentMap?.segments.at(-1)?.end ?? 0;
  const pathFits = !assets?.path_duration_seconds || assets.path_duration_seconds >= transcriptEnd * 0.8;

  if (assets) {
    const url = assets.splat_url ?? assets.ply_url;
    if (url) {
      const kind = url.endsWith('.splat') ? 'splat' : 'ply';
      const name = url.split('/').pop()!.replace(/\.(splat|ply)$/, '');
      return (
        <TwinViewer
          key={url}
          source={{ kind, url, name }}
          meta={[
            assets.quality_label,
            `${assets.registered_frames} dari ${assets.total_frames} frame`,
            kind === 'splat' ? 'Splat' : 'Awan titik',
            ...meta,
          ]}
          activeWaypoint={activeWaypoint}
          onSelectWaypoint={onSelectWaypoint}
          agents={pathFits ? agentMap : null}
          focusAgentId={focusAgentId}
          waypoints={pathFits ? waypoints : []}
        />
      );
    }
  }

  const building = job && (job.status === 'antre' || job.status === 'berjalan');
  const failed = job?.status === 'gagal';

  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-md border border-line bg-panel px-6 text-center lg:h-[560px]">
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
          {agentMap && <AgentFlowStrip map={agentMap} />}
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

/** Keputusan agen (F5) + segmen transkrip (F3) untuk analisis ini, digabung jadi peta agen. */
function useAgentMap(analysisId: string): AgentMap | null {
  const [map, setMap] = useState<AgentMap | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchAgentDecisions(analysisId), fetchTranscriptSegments(analysisId)]).then(
      ([decisions, segments]) => {
        if (!cancelled) setMap(buildAgentMap(decisions, segments));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [analysisId]);
  return map;
}
