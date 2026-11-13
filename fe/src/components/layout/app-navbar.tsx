'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SekilasLogo } from '@/components/brand/logo';
import { CURRENT_USER } from '@/lib/mock/business';
import { HierarchicalSidebar } from '@/components/layout/hierarchical-sidebar';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface AppNavbarProps {
  mode?: 'global' | 'analysis' | 'wizard';
  analysisId?: string;
  businessName?: string;
  branchName?: string;
  currentStep?: number; // 1 to 4 for wizard
  breadcrumbs?: BreadcrumbCrumb[];
}

export function AppNavbar({
  mode = 'global',
  analysisId = 'selasar-kopi',
  businessName = 'Selasar Kopi & Roti',
  branchName = 'Dipatiukur (Pusat)',
  currentStep = 1,
  breadcrumbs,
}: AppNavbarProps) {
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 4 Langkah Wizard (Konteks -> Video -> Memproses -> Verifikasi -> Dasbor)
  const WIZARD_STEPS = [
    { step: 1, label: 'Konteks Usaha', href: `/business/analysis/konteks` },
    { step: 2, label: 'Rekam Video', href: `/business/analysis/video` },
    { step: 3, label: 'Memproses', href: `/business/analysis/proses` },
    { step: 4, label: 'Verifikasi Transkrip', href: `/business/analysis/verifikasi` },
  ];

  // Derive default breadcrumbs if not explicitly passed
  const getCrumbs = (): BreadcrumbCrumb[] => {
    if (breadcrumbs) return breadcrumbs;

    if (pathname.includes('/agents') || pathname.includes('/agen')) {
      return [
        { label: 'Daftar Bisnis', href: '/businesses' },
        { label: businessName, href: '/businesses/analyses' },
        { label: 'Analisis 13-11-2026', href: '/business/analysis' },
        { label: 'Jelajah Agen', isCurrent: true },
      ];
    }

    if (
      pathname.startsWith('/business/analysis') ||
      pathname.startsWith('/analisis')
    ) {
      if (pathname.includes('/video')) {
        return [
          { label: 'Daftar Bisnis', href: '/businesses' },
          { label: businessName, href: '/businesses/analyses' },
          { label: 'Analisis Baru', href: '/business/analysis/video' },
          { label: 'Rekam Video', isCurrent: true },
        ];
      }
      if (pathname.includes('/konteks')) {
        return [
          { label: 'Daftar Bisnis', href: '/businesses' },
          { label: businessName, href: '/businesses/analyses' },
          { label: 'Analisis Baru', href: '/business/analysis/konteks' },
          { label: 'Konteks Usaha', isCurrent: true },
        ];
      }
      if (pathname.includes('/proses')) {
        return [
          { label: 'Daftar Bisnis', href: '/businesses' },
          { label: businessName, href: '/businesses/analyses' },
          { label: 'Analisis Baru', href: '/business/analysis/proses' },
          { label: 'Memproses AI', isCurrent: true },
        ];
      }
      if (pathname.includes('/verifikasi')) {
        return [
          { label: 'Daftar Bisnis', href: '/businesses' },
          { label: businessName, href: '/businesses/analyses' },
          { label: 'Analisis Baru', href: '/business/analysis/verifikasi' },
          { label: 'Verifikasi Transkrip', isCurrent: true },
        ];
      }
      return [
        { label: 'Daftar Bisnis', href: '/businesses' },
        { label: businessName, href: '/businesses/analyses' },
        { label: 'Analisis 13-11-2026', href: '/business/analysis' },
        { label: 'Dasbor', isCurrent: true },
      ];
    }

    if (pathname === '/businesses/analyses' || pathname === '/proyek') {
      return [
        { label: 'Daftar Bisnis', href: '/businesses' },
        { label: businessName, href: '/businesses/analyses' },
        { label: 'Daftar Analisis', isCurrent: true },
      ];
    }

    if (pathname === '/businesses' || pathname === '/profil') {
      return [
        { label: 'Daftar Bisnis', href: '/businesses' },
        { label: 'Kelola Usaha & Cabang', isCurrent: true },
      ];
    }

    return [{ label: 'Beranda', href: '/' }, { label: 'Aplikasi', isCurrent: true }];
  };

  const crumbs = getCrumbs();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-hairline bg-white/95 backdrop-blur-md">
        {/* Main Header Bar (h-14) */}
        <div className="w-full px-4 sm:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Sisi Kiri: Hamburger Menu + Logo + Breadcrumbs */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* Hamburger Button (≡) to open Sidebar */}
              <button
                type="button"
                onClick={() => setShowSidebar(true)}
                aria-label="Buka menu navigasi sidebar"
                className="p-1.5 -ml-1 rounded-md text-ink hover:bg-panel transition focus:outline-none shrink-0"
              >
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                  <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
                  <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
                </svg>
              </button>

              <Link href="/businesses" className="hover:opacity-90 transition shrink-0">
                <SekilasLogo size={24} />
              </Link>

              <span className="h-4 w-px bg-line shrink-0 hidden sm:block" />

              {/* Breadcrumbs Navigasi (Menggantikan Dropdown Navbar & Submenu Sidebar) */}
              <Breadcrumb className="hidden sm:flex min-w-0">
                <BreadcrumbList>
                  {crumbs.map((crumb, idx) => (
                    <React.Fragment key={`${crumb.label}-${idx}`}>
                      {idx > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {crumb.isCurrent || !crumb.href ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Sisi Kanan: Action Buat Analisis Baru & Profil */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/business/analysis/video"
                className="btn-primary inline-flex h-8 sm:h-8.5 items-center rounded-md px-3 text-xs font-medium text-white shadow-xs transition"
              >
                <span>+ Buat Analisis</span>
              </Link>

              {/* User Avatar Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="size-8 rounded-full bg-primary-40 text-white text-xs font-semibold flex items-center justify-center hover:opacity-95 transition focus:outline-none border border-primary-50"
                  aria-label="Menu pengguna"
                >
                  {CURRENT_USER.name.charAt(0)}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-1.5 w-52 rounded-[10px] border border-line bg-white p-2 shadow-lg z-50">
                    <div className="px-2 py-1.5 border-b border-hairline mb-1">
                      <p className="font-medium text-ink text-xs truncate">{CURRENT_USER.name}</p>
                      <p className="text-[11px] text-muted truncate font-mono">{CURRENT_USER.email}</p>
                    </div>
                    <Link
                      href="/businesses"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-ink hover:bg-panel transition"
                    >
                      Daftar Bisnis
                    </Link>
                    <Link
                      href="/businesses/analyses"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-ink hover:bg-panel transition"
                    >
                      Daftar Analisis
                    </Link>
                    <div className="border-t border-hairline mt-1 pt-1">
                      <Link
                        href="/masuk"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-friction hover:bg-friction-10 transition font-mono"
                      >
                        Keluar Akun
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wizard Stepper (Hanya Muncul saat Mode Wizard, 4 Langkah) */}
        {mode === 'wizard' && (
          <div className="w-full px-4 sm:px-8 border-t border-hairline bg-white/70">
            <div className="flex h-11 items-center justify-between overflow-x-auto scrollbar-none text-xs">
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
                <span>Langkah {currentStep} dari 4</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hierarchical Sidebar Drawer (Komponen Shadcn, Bebas Emoji, Sesuai Struktur Bisnis & Analisis) */}
      <HierarchicalSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        activeAnalysisId={analysisId}
      />
    </>
  );
}
