'use client';

import React from 'react';
import { Reveal } from './reveal';

type Step = {
  label: string;
  count: number;
  pct: number;
  friction?: boolean;
};

const STEPS: Step[] = [
  { label: '1. Melihat dari jalan', count: 20, pct: 100 },
  { label: '2. Tertarik & berhenti', count: 14, pct: 70 },
  { label: '3. Masuk tempat usaha', count: 5, pct: 25, friction: true },
  { label: '4. Memesan di kasir', count: 4, pct: 20 },
];

export function FunnelCard({ className = '' }: { className?: string }) {
  return (
    <Reveal className={`rounded-[10px] border border-line bg-white shadow-xs ${className}`}>
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <p className="text-sm font-medium text-ink">Corong Konversi (4 Tahap)</p>
        <p className="font-mono text-[11px] text-subtle">n = 20 agen demo</p>
      </div>
      <ul className="space-y-4 px-5 py-5">
        {STEPS.map((step) => (
          <li key={step.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs sm:text-[13px]">
              <span className={step.friction ? 'font-medium text-friction' : 'text-ink-soft'}>
                {step.label}
                {step.friction && (
                  <span className="ml-2 inline-block rounded-xs bg-friction-10 px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-friction font-semibold">
                    v 65,5% Penurunan
                  </span>
                )}
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono text-xs">
                <span className={step.friction ? 'text-friction font-bold' : 'text-ink font-semibold'}>
                  {step.count} agen
                </span>{' '}
                <span className="text-subtle">({step.pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  step.friction ? 'bg-friction' : 'bg-primary-40'
                }`}
                style={{ width: `${step.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-hairline bg-panel/40 px-5 py-2.5 text-center">
        <span className="font-mono text-[11px] text-subtle">
          Titik kebocoran terbesar terdeteksi di tahap: Masuk tempat usaha
        </span>
      </div>
    </Reveal>
  );
}
