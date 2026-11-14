'use client';

import React, { Suspense } from 'react';

import { AppNavbar } from '@/components/layout/app-navbar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { WizardProgressSection } from '@/components/layout/wizard-progress';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * Kerangka halaman aplikasi: sidebar di kiri, topbar dan konten di panel putih.
 *
 * Sidebar, topbar, dan progress membaca URL (`usePathname`). Dengan `cacheComponents` aktif,
 * hook itu menunggu sampai request, jadi masing-masing dibungkus <Suspense> dengan fallback
 * seukuran aslinya agar tata letak tidak bergeser.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <Suspense fallback={<div className="hidden h-svh w-64 shrink-0 md:block" aria-hidden />}>
        <AppSidebar />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={<div className="h-14 shrink-0 border-b border-line" aria-hidden />}>
          <AppNavbar />
        </Suspense>
        <Suspense fallback={null}>
          <WizardProgressSection />
        </Suspense>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
