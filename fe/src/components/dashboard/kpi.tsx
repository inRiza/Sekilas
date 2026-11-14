import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronDown, TriangleAlert, type LucideIcon } from 'lucide-react';
import { InfoIcon } from '@/components/ui/icons';
import { Card } from './card';

export const KPI_TONE = {
  impact: 'bg-impact-10 text-impact',
  friction: 'bg-friction-10 text-friction',
  neutral: 'bg-soft text-ink-soft',
} as const;

/** Kartu KPI: angka besar dan hitam, warna hanya pada ikon; `children` untuk visual tambahan. */
export function KpiCard({
  label,
  info,
  value,
  unit,
  sub,
  icon: Icon,
  tone,
  badge,
  children,
}: {
  label: string;
  info: string;
  value: string;
  unit?: string;
  sub: string;
  icon: LucideIcon;
  tone: keyof typeof KPI_TONE;
  /** Chip kecil di bawah keterangan (misal kode hipotesis atau status), agar judul tetap satu baris. */
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${KPI_TONE[tone]}`}>
          <Icon size={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight text-ink-soft">{label}</span>
        <div className="group/tip relative shrink-0 cursor-help">
          <InfoIcon size={15} className="text-subtle transition-colors hover:text-ink" />
          <div className="pointer-events-none absolute right-0 top-5 z-30 hidden w-56 rounded-md bg-ink p-2.5 text-[11px] leading-relaxed text-white shadow-lg group-hover/tip:block">
            {info}
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span
          className={`break-words font-semibold tracking-[-0.03em] text-ink tabular-nums ${
            value.length > 16 ? 'text-[18px] leading-snug' : 'text-[28px] leading-none'
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-[14px] text-muted">{unit}</span>}
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted">{sub}</p>
      {badge && <div className="mt-2.5 flex">{badge}</div>}
      {children && <div className="mt-auto pt-4">{children}</div>}
    </Card>
  );
}

/** Penurunan terbesar: kerangka sama dengan KPI lain; lokasi dan penjelasan di kotak bawah. */
export function HeroCard({
  value,
  from,
  to,
  location,
  description,
}: {
  value: string;
  from: string;
  to: string;
  location: string;
  description: string;
}) {
  // ponytail: ambang 30% adalah tebakan kasar; angka yang tak terbaca dianggap parah.
  const rate = parseFloat(value.replace(',', '.'));
  const negative = !(rate < 30);

  return (
    <KpiCard
      label="Penurunan terbesar"
      info={description}
      value={value}
      sub={`Agen batal antara tahap ${from} ke ${to}`}
      icon={negative ? ArrowDownRight : ArrowUpRight}
      tone={negative ? 'friction' : 'impact'}
      badge={
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            negative ? 'bg-friction-10 text-friction' : 'bg-impact-10 text-impact'
          }`}
        >
          {negative ? 'Perlu perhatian' : 'Terkendali'}
        </span>
      }
    >
      {/* Lokasi + penjelasan dilipat agar tinggi kartu sejajar dengan KPI lain. */}
      <details className="group rounded-md bg-panel text-[12px] leading-relaxed text-muted">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 truncate font-medium text-ink-soft">{location}</span>
          <ChevronDown size={14} className="shrink-0 text-subtle transition-transform group-open:rotate-180" />
        </summary>
        <p className="px-3 pb-2.5">{description}</p>
      </details>
    </KpiCard>
  );
}

/** Penyebab utama batal: kerangka sama dengan KPI lain; judul penuh, kode hipotesis jadi chip. */
export function CauseCard({ title, rank }: { title: string; rank: string }) {
  // judul backend berbentuk "H8 · Menu dan harga ...": kodenya jadi chip agar judul mudah dibaca
  const match = /^(H\d+)\s·\s(.+)$/.exec(title);
  const code = match?.[1];
  const heading = match?.[2] ?? title;

  return (
    <KpiCard
      label="Penyebab utama batal"
      info={title}
      value={heading}
      sub={rank}
      icon={TriangleAlert}
      tone="friction"
      badge={
        code ? (
          <span className="shrink-0 rounded-md bg-friction-10 px-2 py-0.5 font-mono text-[11px] font-semibold text-friction">
            {code}
          </span>
        ) : undefined
      }
    />
  );
}

/** Metrik ringkas proyeksi. */
export function ProjectionStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tone: keyof typeof KPI_TONE;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl bg-panel p-3.5 ring-1 ring-line/70">
      <div className="flex items-center gap-2">
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${KPI_TONE[tone]}`}>
          <Icon size={14} strokeWidth={2} />
        </span>
        <span className="text-[12px] leading-tight text-muted">{label}</span>
      </div>
      <span className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{value}</span>
      <span className="mt-1.5 text-[12px] text-muted">{sub}</span>
    </div>
  );
}
