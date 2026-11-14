import type { CueRank } from '@/types/api';

const num = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n);

/** Semua alasan agen batal, urut dari peringkat 1. Skor = porsi suara agen yang batal. */
export function CueRanking({ cues }: { cues: CueRank[] }) {
  if (cues.length === 0) return <p className="text-xs text-muted">Belum ada alasan batal yang tercatat.</p>;

  return (
    <ol className="space-y-3">
      {cues.map((cue) => (
        <li
          key={cue.cue_code}
          className={`rounded-lg border p-3 ${cue.rank === 1 ? 'border-friction/40 bg-friction-10/40' : 'border-line bg-white'}`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-md font-mono text-[11px] font-semibold ${
                cue.rank === 1 ? 'bg-friction text-white' : 'bg-soft text-ink-soft'
              }`}
            >
              {cue.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug text-ink">{cue.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                {cue.cue_code} · {cue.affected_agents_count} dari {cue.total_non_buyers} agen batal · Lift {num(cue.lift)}x
              </p>
            </div>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">{num(cue.share_pct)}%</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-hairline">
            <div
              className={`h-full rounded-full ${cue.rank === 1 ? 'bg-friction' : 'bg-primary-40'}`}
              style={{ width: `${Math.min(100, cue.share_pct)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
