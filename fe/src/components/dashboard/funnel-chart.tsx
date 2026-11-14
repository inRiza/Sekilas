import type { FunnelStageData } from '@/types/api';

const pct = (n: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n)}%`;

/** Satu baris per tahap: nama, jumlah agen, bar. Tahap setelah penurunan terbesar ditandai merah. */
export function FunnelChart({ stages }: { stages: FunnelStageData[] }) {
  if (stages.length === 0) return <p className="text-xs text-muted">Belum ada data alur agen.</p>;

  return (
    <ol className="space-y-4">
      {stages.map((stage, i) => {
        const prev = stages[i - 1];
        const hot = prev?.is_highest_friction;
        return (
          <li key={stage.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className={hot ? 'font-medium text-friction' : 'text-ink-soft'}>{stage.name}</span>
              <span className="shrink-0 font-mono text-xs">
                <span className={hot ? 'font-bold text-friction' : 'font-semibold text-ink'}>{stage.count} agen</span>{' '}
                <span className="text-subtle">({pct(stage.percentage)})</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-hairline">
              <div
                className={`h-full rounded-full ${hot ? 'bg-friction' : 'bg-primary-40'}`}
                style={{ width: `${stage.percentage}%` }}
              />
            </div>
            {hot && (
              <p className="mt-1.5 font-mono text-[11px] text-friction">
                Turun {pct(prev.drop_off_rate)} dari tahap sebelumnya, terbesar di alur ini
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
