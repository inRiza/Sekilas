'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SekilasLogo } from '@/components/brand/logo';
import { MOCK_BUSINESSES, CURRENT_USER } from '@/lib/mock/business';

interface AppNavbarProps {
  mode?: 'global' | 'analysis' | 'wizard';
  analysisId?: string;
  businessName?: string;
  branchName?: string;
  currentStep?: number; // 1 to 5 for wizard
}

export function AppNavbar({
  mode = 'global',
  analysisId = 'selasar-kopi',
  businessName = 'Selasar Kopi & Roti',
  branchName = 'Dipatiukur (Pusat)',
  currentStep = 1,
}: AppNavbarProps) {
  const pathname = usePathname();
  const [showBusinessMenu, setShowBusinessMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeBizId, setActiveBizId] = useState(MOCK_BUSINESSES[0].id);

  const activeBiz = MOCK_BUSINESSES.find((b) => b.id === activeBizId) || MOCK_BUSINESSES[0];

  const ANALYSIS_TABS = [
    { href: `/analisis/${analysisId}`, label: 'Ringkasan Dasbor' },
    { href: `/analisis/${analysisId}#twin`, label: 'Visual Twin 3D' },
    { href: `/analisis/${analysisId}/agen`, label: 'Jelajah Agen (500)' },
    { href: `/analisis/${analysisId}/rencana`, label: 'Rencana Pengukuran (Cetak A4)' },
  ];

  const WIZARD_STEPS = [
    { step: 1, label: 'Konteks Usaha', href: `/analisis/${analysisId}/konteks` },
    { step: 2, label: 'Rekam Video', href: `/analisis/${analysisId}/video` },
    { step: 3, label: 'Memproses', href: `/analisis/${analysisId}/proses` },
    { step: 4, label: 'Verifikasi Transkrip', href: `/analisis/${analysisId}/verifikasi` },
    { step: 5, label: 'Simulasi Agen', href: `/analisis/${analysisId}/simulasi` },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline bg-white/95 backdrop-blur-md">
      {/* Tier 1: Global Header Bar (h-14) */}
      <div className="section border-b border-hairline/60">
        <div className="col flex h-14 items-center justify-between">
          {/* Sisi Kiri: Logo + Business Switcher */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/proyek" className="hover:opacity-90 transition">
              <SekilasLogo size={24} />
            </Link>

            <span className="h-4 w-px bg-line hidden sm:block" />

            {/* Business / Branch Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowBusinessMenu(!showBusinessMenu);
                  setShowUserMenu(false);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-panel/60 px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-panel transition focus:outline-none"
              >
                <span className="size-2 rounded-full bg-impact" />
                <span className="max-w-[130px] sm:max-w-[180px] truncate">
                  {activeBiz.name}
                </span>
                <span className="text-[11px] text-muted hidden md:inline">
                  · {activeBiz.branch_name}
                </span>
                <svg className="size-3.5 text-muted ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Dropdown Menu Bisnis / Cabang */}
              {showBusinessMenu && (
                <div className="absolute left-0 mt-1.5 w-72 rounded-[10px] border border-line bg-white p-1.5 shadow-lg z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-subtle border-b border-hairline mb-1">
                    Daftar Tempat Usaha & Cabang
                  </div>
                  {MOCK_BUSINESSES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setActiveBizId(b.id);
                        setShowBusinessMenu(false);
                      }}
                      className={`w-full text-left flex items-start justify-between rounded-md px-2.5 py-2 text-xs transition ${
                        b.id === activeBizId ? 'bg-primary-10 text-primary-40 font-medium' : 'hover:bg-panel text-ink'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-ink">{b.name}</p>
                        <p className="text-[11px] text-muted">{b.branch_name} · {b.category}</p>
                      </div>
                      {b.id === activeBizId && (
                        <span className="text-primary-40 text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-hairline mt-1 pt-1">
                    <Link
                      href="/proyek?tambah_cabang=1"
                      onClick={() => setShowBusinessMenu(false)}
                      className="w-full inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-primary-40 hover:bg-primary-10 transition"
                    >
                      <span>+</span> Tambah Tempat Usaha / Cabang Baru
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sisi Kanan: Quick Links & User Profile */}
          <div className="flex items-center gap-3 sm:gap-5">
            <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-muted">
              <Link
                href="/proyek"
                className={`transition hover:text-ink ${pathname === '/proyek' ? 'text-ink font-semibold' : ''}`}
              >
                Semua Analisis
              </Link>
              <Link
                href="/profil"
                className={`transition hover:text-ink ${pathname === '/profil' ? 'text-ink font-semibold' : ''}`}
              >
                Profil Usaha (F1)
              </Link>
              <Link
                href="/analisis/selasar-kopi"
                className={`transition hover:text-ink ${pathname.startsWith('/analisis/selasar-kopi') ? 'text-ink font-semibold' : ''}`}
              >
                Contoh Analisis
              </Link>
            </nav>

            <span className="h-4 w-px bg-line hidden md:block" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowBusinessMenu(false);
                }}
                className="flex items-center gap-2 rounded-full border border-line p-1 pr-2.5 hover:bg-panel transition"
              >
                <span className="size-6 rounded-full bg-primary-40 text-white text-[11px] font-semibold flex items-center justify-center">
                  {CURRENT_USER.name.charAt(0)}
                </span>
                <span className="text-xs font-medium text-ink hidden sm:inline max-w-[100px] truncate">
                  {CURRENT_USER.name}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-[10px] border border-line bg-white p-1.5 shadow-lg z-50">
                  <div className="px-3 py-2 border-b border-hairline mb-1">
                    <p className="text-xs font-medium text-ink">{CURRENT_USER.name}</p>
                    <p className="text-[11px] text-muted truncate">{CURRENT_USER.email}</p>
                  </div>
                  <Link
                    href="/profil"
                    onClick={() => setShowUserMenu(false)}
                    className="block rounded-md px-3 py-1.5 text-xs text-ink hover:bg-panel transition"
                  >
                    Profil Usaha
                  </Link>
                  <Link
                    href="/masuk"
                    onClick={() => setShowUserMenu(false)}
                    className="block rounded-md px-3 py-1.5 text-xs text-friction hover:bg-friction-10 transition mt-1 border-t border-hairline pt-1"
                  >
                    Keluar Akun
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Contextual Sub-Nav Bar (h-11) */}
      {mode === 'analysis' && (
        <div className="section bg-white/70">
          <div className="col flex h-11 items-center justify-between overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 sm:gap-2 text-xs">
              {ANALYSIS_TABS.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md transition ${
                      isActive
                        ? 'bg-panel font-semibold text-ink border border-line/80'
                        : 'text-muted hover:text-ink hover:bg-panel/50'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Link
                href={`/analisis/${analysisId}/konteks`}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1 text-xs text-ink-soft hover:bg-panel transition"
              >
                <span>↺</span> Simulasi Ulang
              </Link>
              <Link
                href={`/analisis/${analysisId}/rencana`}
                className="btn-primary inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-white shadow-xs"
              >
                Cetak Lembar Tally
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tier 2: Wizard Stepper (h-11) */}
      {mode === 'wizard' && (
        <div className="section bg-white/70">
          <div className="col flex h-11 items-center justify-between overflow-x-auto scrollbar-none text-xs">
            <div className="flex items-center gap-2 sm:gap-3">
              {WIZARD_STEPS.map((stepItem, idx) => {
                const isCurrent = stepItem.step === currentStep;
                const isDone = stepItem.step < currentStep;
                return (
                  <React.Fragment key={stepItem.step}>
                    {idx > 0 && <span className="text-subtle font-mono text-[11px]">→</span>}
                    <Link
                      href={stepItem.href}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 whitespace-nowrap transition ${
                        isCurrent
                          ? 'bg-primary-10 text-primary-40 font-semibold border border-primary-20'
                          : isDone
                          ? 'text-ink hover:bg-panel'
                          : 'text-subtle pointer-events-none'
                      }`}
                    >
                      <span
                        className={`size-4 rounded-full text-[10px] font-mono flex items-center justify-center ${
                          isCurrent
                            ? 'bg-primary-40 text-white'
                            : isDone
                            ? 'bg-impact text-white'
                            : 'bg-hairline text-subtle'
                        }`}
                      >
                        {isDone ? '✓' : stepItem.step}
                      </span>
                      {stepItem.label}
                    </Link>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-muted">
              <span>Langkah {currentStep} dari 5</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
