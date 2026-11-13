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
  SidebarMenuSubButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  StoreIcon,
  LayoutGridIcon,
  LayoutDashboardIcon,
  UsersIcon,
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

  // State ekspansi level Analisis
  const [expandedAnalyses, setExpandedAnalyses] = useState<Record<string, boolean>>({
    'selasar-kopi': true,
    'selasar-night-run': false,
    'selasar-dago-eval': true,
  });

  if (!isOpen) return null;

  const toggleBiz = (bizId: string) => {
    setExpandedBiz((prev) => ({ ...prev, [bizId]: !prev[bizId] }));
  };

  const toggleAnalysis = (analysisId: string) => {
    setExpandedAnalyses((prev) => ({ ...prev, [analysisId]: !prev[analysisId] }));
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
          <Link href="/proyek" onClick={onClose} className="hover:opacity-90 transition">
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
              {/* 1. DAFTAR BISNIS [Pergi ke Halaman Daftar Bisnis]              */}
              {/* ============================================================== */}
              <SidebarMenuItem>
                <Link href="/proyek" onClick={onClose} className="block">
                  <SidebarMenuButton isActive={pathname === '/proyek'}>
                    <LayoutGridIcon size={16} className="text-muted group-hover/btn:text-ink" />
                    <span className="font-semibold flex-1">Daftar Bisnis</span>
                    <span className="font-mono text-[10px] text-subtle px-1.5 py-0.5 rounded bg-panel border border-line">
                      {MOCK_BUSINESSES.length} Usaha
                    </span>
                  </SidebarMenuButton>
                </Link>

                {/* Sub-tree: a. Bisnis1, b. Bisnis2 ... */}
                <SidebarMenuSub className="mt-1">
                  {MOCK_BUSINESSES.map((biz, bizIdx) => {
                    const isBizExpanded = !!expandedBiz[biz.id];
                    const bizAnalyses = MOCK_ANALYSES.filter(
                      (a) => a.business_id === biz.id
                    );
                    const letterIndex = String.fromCharCode(97 + bizIdx); // a, b, c...

                    return (
                      <SidebarMenuSubItem key={biz.id} className="pt-0.5">
                        {/* ========================================================== */}
                        {/* a. BISNIS [Pergi ke Kelola Bisnis, Mengisi Konteks Bisnis] */}
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

                          {/* Nama Bisnis -> Link ke Halaman Kelola Bisnis / Konteks Usaha */}
                          <Link
                            href="/profil"
                            onClick={onClose}
                            className="flex-1 flex items-center gap-1.5 min-w-0 pr-1"
                            title="Pergi ke halaman kelola bisnis, mengisi konteks bisnis"
                          >
                            <StoreIcon size={14} className="text-muted shrink-0" />
                            <div className="truncate">
                              <span className="font-mono text-[11px] text-subtle mr-1">
                                {letterIndex}.
                              </span>
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
                            href={`/analisis/${bizAnalyses[0]?.id || activeAnalysisId}/konteks`}
                            onClick={onClose}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-ink hover:bg-white rounded border border-line transition shadow-2xs"
                            title="Isi Konteks Usaha (F1)"
                          >
                            <SettingsIcon size={12} />
                          </Link>
                        </div>

                        {/* Hierarki Level i. Analisis DD-MM-YYYY */}
                        {isBizExpanded && (
                          <ul className="ml-4 pl-2.5 border-l border-hairline space-y-1.5 my-1 list-none">
                            {bizAnalyses.map((analysis, aIdx) => {
                              const isAnalysisExpanded = !!expandedAnalyses[analysis.id];
                              const romanIndex =
                                aIdx === 0 ? 'i' : aIdx === 1 ? 'ii' : aIdx === 2 ? 'iii' : 'iv';
                              const formattedDate = formatToDDMMYYYY(analysis.created_at);
                              const isAnalysisActive = pathname.includes(analysis.id);

                              return (
                                <li key={analysis.id} className="list-none">
                                  {/* ==================================================== */}
                                  {/* i. ANALISIS DD-MM-YYYY [Pergi ke Dasbor]             */}
                                  {/* ==================================================== */}
                                  <div
                                    className={`flex items-center justify-between rounded-md px-1.5 py-1 text-xs transition ${
                                      isAnalysisActive && !pathname.includes('/agen')
                                        ? 'bg-primary-10/70 border border-primary-20'
                                        : 'hover:bg-panel'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleAnalysis(analysis.id)}
                                      className="p-1 text-subtle hover:text-ink rounded transition"
                                      aria-label={`Toggle Analisis ${formattedDate}`}
                                    >
                                      {isAnalysisExpanded ? (
                                        <ChevronDownIcon size={12} />
                                      ) : (
                                        <ChevronRightIcon size={12} />
                                      )}
                                    </button>

                                    <Link
                                      href={`/analisis/${analysis.id}`}
                                      onClick={onClose}
                                      className="flex-1 flex items-center gap-1.5 min-w-0"
                                      title="Pergi ke dasbor"
                                    >
                                      <FileTextIcon
                                        size={13}
                                        className={
                                          isAnalysisActive ? 'text-primary-40' : 'text-muted'
                                        }
                                      />
                                      <div className="truncate">
                                        <span className="font-mono text-[10px] text-subtle mr-1">
                                          {romanIndex}.
                                        </span>
                                        <span
                                          className={`text-[11px] ${
                                            isAnalysisActive
                                              ? 'font-semibold text-primary-40'
                                              : 'font-medium text-ink'
                                          }`}
                                        >
                                          Analisis {formattedDate}
                                        </span>
                                      </div>
                                    </Link>
                                  </div>

                                  {/* Sub-menu: 1. Dasbor, 2. Jelajah Agen */}
                                  {isAnalysisExpanded && (
                                    <ul className="ml-4 pl-2.5 border-l border-hairline space-y-0.5 my-1 list-none">
                                      {/* 1. DASBOR [Pergi ke Dasbor] */}
                                      <li className="list-none">
                                        <Link
                                          href={`/analisis/${analysis.id}`}
                                          onClick={onClose}
                                          className="block"
                                        >
                                          <SidebarMenuSubButton
                                            isActive={pathname === `/analisis/${analysis.id}`}
                                          >
                                            <span className="font-mono text-[10px] text-subtle w-3.5">
                                              1.
                                            </span>
                                            <LayoutDashboardIcon size={13} />
                                            <span>Dasbor</span>
                                          </SidebarMenuSubButton>
                                        </Link>
                                      </li>

                                      {/* 2. JELAJAH AGEN [Pergi ke Halaman Jelajah Agen] */}
                                      <li className="list-none">
                                        <Link
                                          href={`/analisis/${analysis.id}/agen`}
                                          onClick={onClose}
                                          className="block"
                                        >
                                          <SidebarMenuSubButton
                                            isActive={pathname === `/analisis/${analysis.id}/agen`}
                                          >
                                            <span className="font-mono text-[10px] text-subtle w-3.5">
                                              2.
                                            </span>
                                            <UsersIcon size={13} />
                                            <span>Jelajah Agen</span>
                                            <span className="ml-auto font-mono text-[9px] text-subtle">
                                              20 Demo
                                            </span>
                                          </SidebarMenuSubButton>
                                        </Link>
                                      </li>
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Quick Action: Tambah Cabang / Bisnis Baru */}
          <div className="pt-2 border-t border-hairline">
            <Link
              href="/proyek?tambah_cabang=1"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-primary-40 hover:bg-primary-10 transition border border-dashed border-primary-20/60"
            >
              <PlusIcon size={14} />
              <span>Tambah Tempat Usaha / Cabang</span>
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
