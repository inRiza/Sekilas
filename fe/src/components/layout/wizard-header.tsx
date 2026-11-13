import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/landing/sections';
import { CheckIcon } from '@/components/ui/icons';

export interface WizardHeaderProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  analysisId: string;
  businessName?: string;
}

const STEPS = [
  { step: 1, label: 'Konteks Usaha', path: 'konteks' },
  { step: 2, label: 'Rekam Video', path: 'video' },
  { step: 3, label: 'Memproses', path: 'proses' },
  { step: 4, label: 'Verifikasi', path: 'verifikasi' },
  { step: 5, label: 'Simulasi', path: 'simulasi' },
];

export function WizardHeader({
  currentStep,
  analysisId,
  businessName = 'Warung Kopi & Roti Selasar',
}: WizardHeaderProps) {
  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-[1240px] px-4 mb-8">
      <div className="flex flex-col md:flex-row md:h-16 items-center justify-between rounded-2xl border border-line bg-surface/95 px-6 py-3 md:py-0 shadow-[0_4px_20px_rgb(0_0_0/0.03)] backdrop-blur-md gap-3">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <Link href="/proyek" className="hover:opacity-85 transition">
            <Logo />
          </Link>
          <span className="text-line hidden md:inline">/</span>
          <span className="text-xs font-semibold text-ink truncate max-w-[180px]">
            {businessName}
          </span>
          <span className="font-mono text-[10px] text-subtle bg-bg px-2 py-0.5 rounded-full md:hidden">
            Langkah {currentStep} dari 5
          </span>
        </div>

        {/* Stepper Steps */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto max-w-full py-1">
          {STEPS.map((s) => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <div key={s.step} className="flex items-center gap-2">
                <Link
                  href={isCompleted ? `/analisis/${analysisId}/${s.path}` : '#'}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${
                    isCurrent
                      ? 'bg-primary-10 text-primary-40 font-semibold border border-primary-20'
                      : isCompleted
                      ? 'text-ink-soft hover:bg-panel cursor-pointer'
                      : 'text-subtle pointer-events-none opacity-60'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-mono ${
                      isCompleted
                        ? 'bg-impact text-white'
                        : isCurrent
                        ? 'bg-primary-40 text-white'
                        : 'bg-hairline text-subtle'
                    }`}
                  >
                    {isCompleted ? <CheckIcon size={10} /> : s.step}
                  </span>
                  <span className="hidden lg:inline whitespace-nowrap">{s.label}</span>
                </Link>
                {s.step < STEPS.length && (
                  <span className="text-line hidden lg:inline">›</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Auto-save Status */}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-subtle">
          <span className="w-1.5 h-1.5 rounded-full bg-impact" />
          <span>Tersimpan otomatis</span>
        </div>
      </div>
    </header>
  );
}
