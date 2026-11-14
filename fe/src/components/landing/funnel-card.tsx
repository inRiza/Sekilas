'use client';

import React from 'react';
import { Reveal } from './reveal';

type Step = {
  label: string;
  count: number;
  /** Bagian yang paling banyak membuat calon pembeli batal. */
  leak?: boolean;
};

// Contoh: 20 calon pembeli simulasi berjalan dari jalan sampai kasir.
const TOTAL = 20;
const STEPS: Step[] = [
  { label: 'Melihat tokonya dari jalan', count: 20 },
  { label: 'Berhenti sebentar', count: 14 },
  { label: 'Masuk ke dalam', count: 5, leak: true },
  { label: 'Memesan di kasir', count: 4 },
];

export function FunnelCard({ className = '' }: { className?: string }) {
  return (
    <Reveal className={`rounded-md border border-line bg-white shadow-xs ${className}`}>
      <div className="px-5 pb-1 pt-5">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Dari {TOTAL} orang yang lewat, berapa yang membeli?</p>
        <p className="mt-1 text-[13px] text-muted">Contoh hasil simulasi {TOTAL} calon pembeli</p>
      </div>

      <ul className="space-y-4 px-5 py-5">
        {STEPS.map((step, i) => {
          const prev = STEPS[i - 1];
          const lost = prev ? prev.count - step.count : 0;
          return (
            <li key={step.label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className={step.leak ? 'font-medium text-friction' : 'text-ink-soft'}>{step.label}</span>
                <span className={`shrink-0 whitespace-nowrap tabular-nums ${step.leak ? 'font-semibold text-friction' : 'font-medium text-ink'}`}>
                  {step.count} orang
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-hairline">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${step.leak ? 'bg-friction' : 'bg-primary-40'}`}
                  style={{ width: `${(step.count / TOTAL) * 100}%` }}
                />
              </div>
              {step.leak && lost > 0 && (
                <p className="mt-1.5 text-[12px] text-friction">
                  {lost} dari {prev!.count} orang batal di sini
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="rounded-b-md border-t border-hairline bg-panel px-5 py-3 text-[13px] text-ink-soft">
        Paling banyak yang batal <span className="font-medium text-ink">sebelum masuk ke dalam</span>. Di situ perbaikan
        paling berdampak.
      </div>
    </Reveal>
  );
}
