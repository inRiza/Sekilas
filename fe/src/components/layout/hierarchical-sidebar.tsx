'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SekilasLogo } from '@/components/brand/logo';
import { MOCK_BUSINESSES, CURRENT_USER } from '@/lib/mock/business';
import { MOCK_ANALYSES } from '@/lib/mock/analyses';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  StoreIcon,
  LayoutGridIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SettingsIcon,
  FileTextIcon,
  PlusIcon,
  XIcon,
  LogOutIcon,
} from '@/components/ui/icons';

interface HierarchicalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeAnalysisId?: string;
}

function formatToDDMMYYYY(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '13-11-2026';
  }
}

export function HierarchicalSidebar({
  isOpen,
  onClose,
  activeAnalysisId = 'selasar-kopi',
}: HierarchicalSidebarProps) {
  const pathname = usePathname();

  // State ekspansi level Bisnis
  const [expandedBiz, setExpandedBiz] = useState<Record<string, boolean>>({
    biz_selasar_dipatiukur: true,
    biz_selasar_dago: false,
  });

  if (!isOpen) return null;

  const toggleBiz = (bizId: string) => {
    setExpandedBiz((prev) => ({ ...prev, [bizId]: !prev[bizId] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Sidebar Drawer dengan Komponen Shadcn & Hierarki Bisnis */}
      <Sidebar>
        {/* Header Drawer */}
        <SidebarHeader>
          <Link href="/businesses" onClick={onClose} className="hover:opacity-90 transition">
            <SekilasLogo size={24} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-subtle hover:text-ink hover:bg-panel transition"
            aria-label="Tutup sidebar"
          >
            <XIcon size={16} />
          </button>
        </SidebarHeader>

        {/* Content: 1 Segmen Hierarki Bisnis & Analisis */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigasi Bisnis & Analisis</SidebarGroupLabel>

            <SidebarMenu>
              {/* ============================================================== */}
              {/* 1. DAFTAR BISNIS [Pergi ke Halaman Daftar Bisnis /businesses] */}
              {/* ============================================================== */}
              <SidebarMenuItem>
                <Link href="/businesses" onClick={onClose} className="block">
                  <SidebarMenuButton isActive={pathname === '/businesses'}>
                    <LayoutGridIcon size={16} className="text-muted group-hover/btn:text-ink" />
                    <span className="font-semibold flex-1">Daftar Bisnis</span>
                    <span className="font-mono text-[10px] text-subtle px-1.5 py-0.5 rounded bg-panel border border-line">
                      {MOCK_BUSINESSES.length} Usaha
                    </span>
                  </SidebarMenuButton>
                </Link>

                {/* Sub-tree: Bisnis1, Bisnis2 ... (Tanpa prefix "a." atau "b.") */}
                <SidebarMenuSub className="mt-1">
                  {MOCK_BUSINESSES.map((biz) => {
                    const isBizExpanded = !!expandedBiz[biz.id];
                    const bizAnalyses = MOCK_ANALYSES.filter(
                      (a) => a.business_id === biz.id
                    );

                    return (
                      <SidebarMenuSubItem key={biz.id} className="pt-0.5">
                        {/* ========================================================== */}
                        {/* BISNIS [Pergi ke Halaman Daftar Analisis / Kelola Bisnis]  */}
                        {/* ========================================================== */}
                        <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs hover:bg-panel group transition">
                          {/* Toggle Expand Icon */}
                          <button
                            type="button"
                            onClick={() => toggleBiz(biz.id)}
                            className="p-1 text-subtle hover:text-ink rounded transition"
                            aria-label={`Toggle ${biz.name}`}
                          >
                            {isBizExpanded ? (
                              <ChevronDownIcon size={14} />
                            ) : (
                              <ChevronRightIcon size={14} />
                            )}
                          </button>

                          {/* Nama Bisnis -> Link ke /businesses/analyses */}
                          <Link
                            href="/businesses/analyses"
                            onClick={onClose}
                            className="flex-1 flex items-center gap-1.5 min-w-0 pr-1"
                            title="Pergi ke halaman kelola bisnis & daftar analisis"
                          >
                            <StoreIcon size={14} className="text-muted shrink-0" />
                            <div className="truncate">
                              <span className="font-medium text-ink group-hover:text-primary-40 transition">
                                {biz.name}
                              </span>
                              <span className="text-[10px] text-muted block truncate">
                                {biz.branch_name}
                              </span>
                            </div>
                          </Link>

                          {/* Tombol Cepat Konteks Bisnis (F1) */}
                          <Link
                            href="/businesses"
                            onClick={onClose}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-ink hover:bg-white rounded border border-line transition shadow-2xs"
                            title="Kelola Konteks Usaha (F1)"
                          >
                            <SettingsIcon size={12} />
                          </Link>
                        </div>

                        {/* Hierarki Level Analisis-Analisis (Tanpa "i.", "ii." & Tanpa submenu dasbor/agen) */}
                        {isBizExpanded && (
                          <ul className="ml-4 pl-2.5 border-l border-hairline space-y-1 my-1 list-none">
                            {bizAnalyses.map((analysis) => {
                              const formattedDate = formatToDDMMYYYY(analysis.created_at);
                              const isAnalysisActive =
                                pathname.startsWith('/business/analysis') ||
                                pathname.includes(analysis.id);

                              return (
                                <li key={analysis.id} className="list-none">
                                  {/* ANALISIS DD-MM-YYYY [Pergi Langsung ke Dasbor /business/analysis] */}
                                  <Link
                                    href="/business/analysis"
                                    onClick={onClose}
                                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
                                      isAnalysisActive
                                        ? 'bg-primary-10 text-primary-40 font-semibold border border-primary-20'
                                        : 'hover:bg-panel text-ink'
                                    }`}
                                    title="Buka Dasbor Analisis"
                                  >
                                    <FileTextIcon
                                      size={14}
                                      className={
                                        isAnalysisActive ? 'text-primary-40' : 'text-muted'
                                      }
                                    />
                                    <span className="truncate">Analisis {formattedDate}</span>
                                  </Link>
                                </li>
                              );
                            })}

                            {/* Tombol "Buat Analisis Baru" Selevel dengan Analisis-Analisis */}
                            <li className="list-none pt-0.5">
                              <Link
                                href="/business/analysis/video"
                                onClick={onClose}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-primary-40 hover:bg-primary-10 transition border border-dashed border-primary-20/60"
                                title="Mulai pipeline analisis upload video baru"
                              >
                                <PlusIcon size={13} />
                                <span>Buat Analisis Baru</span>
                              </Link>
                            </li>
                          </ul>
                        )}
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Quick Action: Tambah Cabang / Bisnis Baru di Halaman Daftar Bisnis */}
          <div className="pt-2 border-t border-hairline">
            <Link
              href="/businesses?tambah=1"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-panel transition"
            >
              <PlusIcon size={14} />
              <span>Tambah Tempat Usaha Baru</span>
            </Link>
          </div>
        </SidebarContent>

        {/* Footer: User Account Info */}
        <SidebarFooter>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-6 rounded-full bg-primary-40 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                {CURRENT_USER.name.charAt(0)}
              </span>
              <div className="truncate">
                <p className="font-medium text-ink truncate text-xs">{CURRENT_USER.name}</p>
                <p className="text-[10px] text-muted truncate font-mono">{CURRENT_USER.email}</p>
              </div>
            </div>
            <Link
              href="/masuk"
              onClick={onClose}
              className="p-1.5 text-friction hover:bg-friction-10 rounded transition"
              title="Keluar Akun"
            >
              <LogOutIcon size={14} />
            </Link>
          </div>
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}
