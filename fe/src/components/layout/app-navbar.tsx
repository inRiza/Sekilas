'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOutUser, useAuthUser } from '@/lib/auth/use-auth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbText,
} from '@/components/ui/breadcrumb';

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface AppNavbarProps {
  businessName?: string;
  breadcrumbs?: BreadcrumbCrumb[];
}

/** Topbar aplikasi: tombol sidebar, breadcrumb, dan menu akun. Dirender sekali di AppShell. */
export function AppNavbar({ businessName = 'Selasar Kopi & Roti', breadcrumbs }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthUser();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOutUser();
    router.push('/masuk');
  };

  // Setiap tingkat breadcrumb menunjuk ke halamannya SENDIRI (bukan ke halaman tingkat berikutnya):
  //   Daftar bisnis        -> /businesses
  //   <nama usaha>         -> /businesses/analyses   (halaman usaha = daftar analisisnya)
  //   Analisis <tanggal>   -> /business/analysis     (halaman analisis = dasbornya)
  //   Jelajah agen         -> /business/analysis/agents
  // Saat membuat analisis baru, "Analisis baru" tidak punya halaman sendiri, jadi berupa teks.
  const getCrumbs = (): BreadcrumbCrumb[] => {
    if (breadcrumbs) return breadcrumbs;

    const root: BreadcrumbCrumb = { label: 'Daftar bisnis', href: '/businesses' };
    const business: BreadcrumbCrumb = { label: businessName, href: '/businesses/analyses' };
    const analysis: BreadcrumbCrumb = { label: 'Analisis 13 Nov 2026', href: '/business/analysis' };

    if (pathname === '/businesses') {
      return [{ ...root, isCurrent: true }];
    }
    if (pathname === '/businesses/analyses') {
      return [root, { ...business, isCurrent: true }];
    }
    if (pathname === '/business/analysis') {
      return [root, business, { ...analysis, isCurrent: true }];
    }
    if (pathname.endsWith('/agents')) {
      return [root, business, analysis, { label: 'Jelajah agen', isCurrent: true }];
    }

    const STEP_LABEL: Record<string, string> = {
      konteks: 'Konteks usaha',
      video: 'Rekam video',
      proses: 'Pemrosesan',
      verifikasi: 'Verifikasi transkrip',
      simulasi: 'Simulasi agen',
    };
    const stepLabel = STEP_LABEL[pathname.split('/').filter(Boolean).pop() ?? ''];
    if (stepLabel) {
      // Detail langkah sudah ditampilkan oleh progress di halaman, jadi breadcrumb cukup "Analisis baru".
      return [root, business, { label: 'Analisis baru', isCurrent: true }];
    }

    return [{ ...root, isCurrent: true }];
  };

  const crumbs = getCrumbs();

  return (
    <>
      <header className="sticky top-0 z-40 w-full shrink-0 border-b border-line bg-white/90 backdrop-blur-md">
        {/* Main Header Bar (h-14) */}
        <div className="w-full px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Sisi Kiri: Hamburger Menu + Logo + Breadcrumbs */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <SidebarTrigger className="-ml-1.5 shrink-0" />

              {/* Breadcrumbs Navigasi (Menggantikan Dropdown Navbar & Submenu Sidebar) */}
              <Breadcrumb className="hidden sm:flex min-w-0">
                <BreadcrumbList>
                  {crumbs.map((crumb, idx) => {
                    const content = <span>{crumb.label}</span>;
                    return (
                      <React.Fragment key={`${crumb.label}-${idx}`}>
                        {idx > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {crumb.isCurrent ? (
                            <BreadcrumbPage>{content}</BreadcrumbPage>
                          ) : crumb.href ? (
                            <BreadcrumbLink href={crumb.href}>{content}</BreadcrumbLink>
                          ) : (
                            <BreadcrumbText>{content}</BreadcrumbText>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Sisi Kanan: profil (tombol Analisis baru ada di sidebar) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* User Avatar Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="size-8 rounded-full bg-primary-40 text-white text-xs font-semibold flex items-center justify-center hover:opacity-95 transition focus:outline-none border border-primary-50"
                  aria-label="Menu pengguna"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-line bg-white p-2 shadow-[0_8px_24px_rgba(16,24,40,0.08)] z-50">
                    <div className="px-2 py-1.5 mb-1">
                      <p className="font-medium text-ink text-xs truncate">{user.name}</p>
                      <p className="text-[11px] text-muted truncate font-mono">{user.email}</p>
                    </div>
                    <Link
                      href="/businesses"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-ink hover:bg-hover transition"
                    >
                      Daftar Bisnis
                    </Link>
                    <Link
                      href="/businesses/analyses"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-ink hover:bg-hover transition"
                    >
                      Daftar Analisis
                    </Link>
                    <div className="mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        className="w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-friction hover:bg-friction-10 transition font-mono"
                      >
                        Keluar Akun
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wizard Stepper (Hanya Muncul saat Mode Wizard, 4 Langkah) */}
      </header>
    </>
  );
}
