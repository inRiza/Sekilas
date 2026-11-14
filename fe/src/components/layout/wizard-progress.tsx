'use client';

import { Check, ClipboardList, Cpu, ListChecks, type LucideIcon, Users, Video } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

type Step = { step: number; label: string; href: string; icon: LucideIcon };

/** Alur pembuatan analisis (F1 -> F5), sama urutannya dengan PRD. */
export const WIZARD_STEPS: Step[] = [
  { step: 1, label: 'Konteks usaha', href: '/business/analysis/konteks', icon: ClipboardList },
  { step: 2, label: 'Rekam video', href: '/business/analysis/video', icon: Video },
  { step: 3, label: 'Pemrosesan', href: '/business/analysis/proses', icon: Cpu },
  { step: 4, label: 'Verifikasi transkrip', href: '/business/analysis/verifikasi', icon: ListChecks },
  { step: 5, label: 'Simulasi agen', href: '/business/analysis/simulasi', icon: Users },
];

/**
 * Progress bertahap: lingkaran per langkah dihubungkan garis.
 * Selesai = centang biru muda, aktif = lingkaran biru dengan cincin putus-putus, berikutnya = abu-abu.
 */
export function WizardProgress({ current, querySuffix = '' }: { current: number; querySuffix?: string }) {
  return (
    <ol className="flex w-full items-start">
      {WIZARD_STEPS.map((s, idx) => {
        const done = s.step < current;
        const active = s.step === current;
        const first = idx === 0;
        const last = idx === WIZARD_STEPS.length - 1;
        const Icon = s.icon;

        const circle = (
          <span
            className={`grid size-8 place-items-center rounded-full transition-colors duration-300 ${
              active
                ? 'bg-primary-40 text-white'
                : done
                  ? 'bg-primary-10 text-primary-40'
                  : 'bg-soft text-subtle'
            }`}
          >
            {done ? <Check size={15} strokeWidth={2.5} /> : <Icon size={15} strokeWidth={2} />}
          </span>
        );

        const body = (
          <>
            <span className="relative flex w-full items-center justify-center">
              {/* Garis ke langkah sebelumnya (kiri) dan berikutnya (kanan) */}
              {!first && (
                <span
                  className={`absolute left-0 right-1/2 top-1/2 h-[2px] -translate-y-1/2 rounded-full transition-colors duration-300 ${
                    s.step <= current ? 'bg-primary-40' : 'bg-line'
                  }`}
                />
              )}
              {!last && (
                <span
                  className={`absolute left-1/2 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full transition-colors duration-300 ${
                    done ? 'bg-primary-40' : 'bg-line'
                  }`}
                />
              )}
              {/* Cincin putus-putus pada langkah aktif */}
              <span
                className={`relative z-10 rounded-full bg-white p-1 ${
                  active ? 'outline-2 outline-dashed outline-primary-40/45 -outline-offset-1' : ''
                }`}
              >
                {circle}
              </span>
            </span>
            <span
              className={`mt-1.5 hidden text-center text-[12px] leading-tight sm:block ${
                active ? 'font-medium text-ink' : done ? 'text-ink-soft' : 'text-subtle'
              }`}
            >
              {s.label}
            </span>
          </>
        );

        return (
          <li key={s.step} className="flex min-w-0 flex-1 flex-col items-center">
            {done ? (
              <Link
                href={`${s.href}${querySuffix}`}
                title={`Kembali ke ${s.label.toLowerCase()}`}
                className="group flex w-full flex-col items-center rounded-lg transition-opacity hover:opacity-80"
              >
                {body}
              </Link>
            ) : (
              <div
                className="flex w-full flex-col items-center"
                aria-current={active ? 'step' : undefined}
                title={active ? undefined : 'Selesaikan langkah sebelumnya dulu'}
              >
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const STEP_BY_SEGMENT: Record<string, number> = { konteks: 1, video: 2, proses: 3, verifikasi: 4, simulasi: 5 };

function WizardProgressSectionInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const step = STEP_BY_SEGMENT[pathname.split('/').filter(Boolean).pop() ?? ''];
  if (!step) return null;

  const params = new URLSearchParams();
  const analysisId = searchParams.get('analysisId');
  const businessId = searchParams.get('businessId');
  if (analysisId) params.set('analysisId', analysisId);
  if (businessId) params.set('businessId', businessId);
  const querySuffix = params.toString() ? `?${params.toString()}` : '';

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-6">
      <WizardProgress current={step} querySuffix={querySuffix} />
    </div>
  );
}

/**
 * Progress untuk halaman alur analisis baru. Diletakkan di atas konten halaman (bukan di topbar),
 * sehingga ikut bergulir bersama halaman. Tidak tampil di halaman lain.
 */
export function WizardProgressSection() {
  return (
    <Suspense fallback={null}>
      <WizardProgressSectionInner />
    </Suspense>
  );
}
