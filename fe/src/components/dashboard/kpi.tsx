import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, TriangleAlert, type LucideIcon } from 'lucide-react';
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
  children,
}: {
  label: string;
  info: string;
  value: string;
  unit?: string;
  sub: string;
  icon: LucideIcon;
  tone: keyof typeof KPI_TONE;
  children?: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${KPI_TONE[tone]}`}>
          <Icon size={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-medium leading-tight text-ink-soft">{label}</span>
        <div className="group/tip relative cursor-help">
          <InfoIcon size={15} className="text-subtle transition-colors hover:text-ink" />
          <div className="pointer-events-none absolute right-0 top-5 z-30 hidden w-56 rounded-md bg-ink p-2.5 text-[11px] leading-relaxed text-white shadow-lg group-hover/tip:block">
            {info}
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span
          className={`break-words font-semibold tracking-[-0.03em] text-ink tabular-nums ${
            value.length > 20 ? 'text-[20px] leading-snug' : 'text-[34px] leading-none'
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-[14px] text-muted">{unit}</span>}
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted">{sub}</p>
      {children && <div className="mt-auto pt-4">{children}</div>}
    </Card>
  );
}

/** Satu titik per agen: yang terisi biru adalah agen yang memesan. */
export function AgentDots({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="grid w-fit grid-cols-10 gap-1.5" aria-label={`${filled} dari ${total} agen memesan`}>
      {Array.from({ length: Math.min(total, 100) }, (_, i) => (
        <span key={i} className={`size-2.5 rounded-full ${i < filled ? 'bg-primary-40' : 'bg-line'}`} />
      ))}
    </div>
  );
}

/** Kartu temuan terpenting. Warna menunjukkan sentimen: merah = penurunan parah, hijau = terkendali. */
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
  // ponytail: ambang 30% adalah tebakan kasar; angka yang tak terbaca dianggap parah. Naikkan jadi ambang per-usaha bila perlu.
  const rate = parseFloat(value.replace(',', '.'));
  const negative = !(rate < 30);
  const Icon = negative ? ArrowDownRight : ArrowUpRight;

  return (
    <section
      className={`relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white ${
        negative
          ? 'from-[#b8372d] to-[#e5685c] shadow-[0_8px_24px_rgba(194,69,58,0.28)]'
          : 'from-[#1a7a50] to-[#3bb27f] shadow-[0_8px_24px_rgba(31,138,91,0.25)]'
      }`}
    >
      <span className="pointer-events-none absolute -right-12 -top-12 size-52 rounded-full border border-white/20" />
      <span className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border border-white/10" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium">
            <TriangleAlert size={13} /> Penurunan terbesar
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink">
            {negative ? 'Perlu perhatian' : 'Terkendali'}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20">
            <Icon size={24} strokeWidth={2.25} />
          </span>
          <p className="text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{value}</p>
        </div>
        <p className="mt-3 text-[14px] leading-snug text-white/90">
          agen batal antara tahap <strong className="font-semibold text-white">{from}</strong> ke{' '}
          <strong className="font-semibold text-white">{to}</strong>
        </p>
      </div>
      <div className="relative rounded-xl bg-white/10 p-3 text-[12px] leading-relaxed text-white/85">
        <p className="font-medium text-white">{location}</p>
        <p className="mt-1">{description}</p>
      </div>
    </section>
  );
}

/** Penyebab utama batal: header, lalu judul penuh (tidak pernah dipotong) dan peringkatnya. */
export function CauseCard({ title, rank }: { title: string; rank: string }) {
  // judul backend berbentuk "H8 · Menu dan harga ...": kodenya jadi chip agar judul mudah dibaca
  const match = /^(H\d+)\s·\s(.+)$/.exec(title);
  const code = match?.[1];
  const heading = match?.[2] ?? title;

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${KPI_TONE.friction}`}>
            <TriangleAlert size={17} strokeWidth={2} />
          </span>
          <span className="text-[13px] font-medium text-ink-soft">Penyebab utama batal</span>
        </div>
        {code && (
          <span className="rounded-md bg-friction-10 px-2 py-0.5 font-mono text-[11px] font-semibold text-friction">
            {code}
          </span>
        )}
      </div>

      <div className="my-auto">
        <p
          className={`font-semibold tracking-[-0.02em] text-ink ${
            heading.length > 48 ? 'text-[15px] leading-snug' : heading.length > 28 ? 'text-[18px] leading-snug' : 'text-[22px] leading-tight'
          }`}
        >
          {heading}
        </p>
        <p className="mt-2 text-[12px] text-muted">{rank}</p>
      </div>
    </Card>
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
