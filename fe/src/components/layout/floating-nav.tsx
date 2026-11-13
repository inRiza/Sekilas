import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/landing/sections';

export interface FloatingNavProps {
  businessName?: string;
  activeTab?: 'dasbor' | 'proyek' | 'agen' | 'rencana';
  analysisId?: string;
  statusLabel?: string;
}

export function FloatingNav({
  businessName = 'Warung Kopi & Roti Selasar',
  activeTab = 'dasbor',
  analysisId = 'selasar-kopi',
  statusLabel = 'SIAP',
}: FloatingNavProps) {
  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-[1240px] px-4 mb-6">
      <div className="flex h-14 items-center justify-between rounded-full border border-line bg-surface/95 px-5 shadow-[0_4px_20px_rgb(0_0_0/0.03)] backdrop-blur-md">
        {/* Brand & Store Name */}
        <div className="flex items-center gap-3">
          <Link href="/proyek" className="flex items-center gap-2 hover:opacity-85 transition">
            <Logo />
          </Link>
          <span className="text-line">/</span>
          <span className="text-xs font-semibold text-ink max-w-[200px] truncate sm:max-w-none">
            {businessName}
          </span>
          {statusLabel && (
            <span className="rounded-full bg-impact-10 px-2 py-0.5 font-mono text-[10px] font-semibold text-impact border border-impact/20">
              {statusLabel}
            </span>
          )}
        </div>

        {/* Center Pill Navigation */}
        <nav className="hidden md:flex items-center gap-1 rounded-full bg-bg p-1">
          <Link
            href={`/analisis/${analysisId}`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              activeTab === 'dasbor'
                ? 'bg-primary-40 text-white shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            Dasbor
          </Link>
          <Link
            href={`/analisis/${analysisId}/agen`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              activeTab === 'agen'
                ? 'bg-primary-40 text-white shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            Monolog Agen
          </Link>
          <Link
            href={`/analisis/${analysisId}/rencana`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              activeTab === 'rencana'
                ? 'bg-primary-40 text-white shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            Rencana Tally
          </Link>
        </nav>

        {/* Right Side Info */}
        <div className="flex items-center gap-3">
          <Link
            href="/proyek"
            className="text-xs text-muted hover:text-ink font-medium hidden sm:inline"
          >
            Semua Proyek
          </Link>
          <div className="w-8 h-8 rounded-full bg-primary-10 text-primary-40 flex items-center justify-center font-mono text-xs font-semibold border border-primary-20">
            UM
          </div>
        </div>
      </div>
    </header>
  );
}
