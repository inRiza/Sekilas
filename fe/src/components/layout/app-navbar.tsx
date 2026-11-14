'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  fetchAnalyses,
  fetchBusinesses,
  getLocalAnalyses,
  getLocalBusinesses,
  subscribeCrudChanges,
} from '@/lib/api/crud';
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
import type { Analysis, Business } from '@/types/api';

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface AppNavbarProps {
  businessName?: string;
  breadcrumbs?: BreadcrumbCrumb[];
}

function AppNavbarInner({ businessName, breadcrumbs }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisIdParam = searchParams.get('analysisId');
  const businessIdParam = searchParams.get('businessId');

  const { user } = useAuthUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>(() => getLocalBusinesses());
  const [analyses, setAnalyses] = useState<Analysis[]>(() => getLocalAnalyses());

  useEffect(() => {
    let active = true;
    void Promise.all([fetchBusinesses(), fetchAnalyses()]).then(([bizList, anlList]) => {
      if (!active) return;
      setBusinesses(bizList);
      setAnalyses(anlList);
    });
    const unsubscribe = subscribeCrudChanges(() => {
      setBusinesses(getLocalBusinesses());
      setAnalyses(getLocalAnalyses());
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOutUser();
    router.push('/masuk');
  };

  const activeAnalysis =
    (analysisIdParam ? analyses.find((a) => a.id === analysisIdParam) : undefined) ??
    analyses.find((a) => a.status === 'ready') ??
    analyses[0];

  const activeBusiness =
    (businessIdParam ? businesses.find((b) => b.id === businessIdParam) : undefined) ??
    (activeAnalysis ? businesses.find((b) => b.id === activeAnalysis.business_id) : undefined) ??
    businesses[0];

  const resolvedBusinessName = businessName ?? activeBusiness?.name ?? 'Tempat Usaha';
  const resolvedBusinessHref = activeBusiness
    ? `/businesses/analyses?businessId=${encodeURIComponent(activeBusiness.id)}`
    : '/businesses/analyses';
  const resolvedAnalysisName = activeAnalysis?.name ?? 'Analisis';
  const resolvedAnalysisHref = activeAnalysis
    ? `/business/analysis?analysisId=${encodeURIComponent(activeAnalysis.id)}`
    : '/business/analysis';

  const getCrumbs = (): BreadcrumbCrumb[] => {
    if (breadcrumbs) return breadcrumbs;

    const root: BreadcrumbCrumb = { label: 'Daftar bisnis', href: '/businesses' };
    const business: BreadcrumbCrumb = { label: resolvedBusinessName, href: resolvedBusinessHref };
    const analysis: BreadcrumbCrumb = { label: resolvedAnalysisName, href: resolvedAnalysisHref };

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
      const wizardCrumbLabel =
        analysisIdParam && activeAnalysis ? activeAnalysis.name : 'Analisis baru';
      return [root, business, { label: wizardCrumbLabel, isCurrent: true }];
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

              {/* Breadcrumbs Navigasi */}
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

            {/* Sisi Kanan: profil */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                      href={resolvedBusinessHref}
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
      </header>
    </>
  );
}

/** Topbar aplikasi: tombol sidebar, breadcrumb, dan menu akun. Dirender sekali di AppShell. */
export function AppNavbar(props: AppNavbarProps) {
  return (
    <Suspense fallback={<header className="sticky top-0 z-40 h-14 w-full shrink-0 border-b border-line bg-white/90" />}>
      <AppNavbarInner {...props} />
    </Suspense>
  );
}
