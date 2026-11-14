'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { SekilasLogo, SekilasLogoIcon } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { ChevronRightIcon, LayoutGridIcon, LogOutIcon, PlusIcon } from '@/components/ui/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { backend, type AnalysisStatus, type AnalysisSummary, type BusinessSummary } from '@/lib/backend';
import { CURRENT_USER } from '@/lib/mock/business';

const NEW_ANALYSIS_HREF = '/business/analysis/konteks';

const STATUS_LABEL: Record<AnalysisStatus, string> = {
  draft: 'draf',
  konteks: 'isi konteks',
  video: 'menunggu video',
  memproses: 'diproses',
  verifikasi: 'verifikasi',
  simulasi: 'simulasi',
  siap: 'siap',
};

const STATUS_VARIANT: Record<AnalysisStatus, 'impact' | 'primary' | 'friction' | 'neutral'> = {
  draft: 'neutral',
  konteks: 'neutral',
  video: 'neutral',
  memproses: 'primary',
  verifikasi: 'primary',
  simulasi: 'primary',
  siap: 'impact',
};

const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}



/** Satu cabang usaha (induk) dengan daftar analisisnya (anak). */
function BusinessNode({
  business,
  expanded,
  onToggle,
  analyses,
  activeAnalysisId,
  onOpenAnalysis,
}: {
  business: BusinessSummary;
  analyses: AnalysisSummary[];
  expanded: boolean;
  onToggle: () => void;
  activeAnalysisId: string | null;
  onOpenAnalysis: (id: string) => void;
}) {
  const { open: sidebarOpen, setOpen, setOpenMobile } = useSidebar();

  return (
    <li className="list-none">
      {/* Induk: cabang usaha. Klik membuka/menutup daftar analisisnya. */}
      <button
        type="button"
        onClick={() => {
          if (!sidebarOpen) {
            setOpen(true); // mode ikon: buka sidebar dulu agar anak terlihat
            if (!expanded) onToggle();
            return;
          }
          onToggle();
        }}
        aria-expanded={expanded}
        title={sidebarOpen ? undefined : `${business.name}, ${business.branch_name}`}
        className="flex h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-hover group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-10 text-[11px] font-semibold text-primary-40">
          {initials(business.name)}
        </span>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]/sidebar:hidden">
          <span className="block truncate text-[13px] font-medium text-ink">{business.name}</span>
          <span className="block truncate text-[11px] text-muted">{business.branch_name}</span>
        </span>
        <ChevronRightIcon
          size={15}
          className={`shrink-0 text-subtle transition-transform duration-200 group-data-[collapsible=icon]/sidebar:hidden ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* Anak: analisis milik cabang ini */}
      {expanded && (
        <ul className="mb-1 ml-[22px] mt-0.5 flex flex-col gap-0.5 pl-2.5 group-data-[collapsible=icon]/sidebar:hidden">
          {analyses.map((a) => {
            const active = a.id === activeAnalysisId;
            return (
              <li key={a.id}>
                <Link
                  href={a.next_action.route}
                  onClick={() => {
                    onOpenAnalysis(a.id);
                    setOpenMobile(false);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-lg px-2.5 py-2 transition-colors ${active ? 'bg-soft' : 'hover:bg-hover'}`}
                >
                  <span className={`block truncate text-[13px] ${active ? 'font-medium text-ink' : 'text-ink-soft'}`}>
                    {a.name}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] tabular-nums text-muted">{shortDate.format(new Date(a.created_at))}</span>
                    <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href={`${NEW_ANALYSIS_HREF}?bid=${business.id}`}
              onClick={() => setOpenMobile(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <PlusIcon size={14} />
              Analisis baru di cabang ini
            </Link>
          </li>
        </ul>
      )}
    </li>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [analysesByBiz, setAnalysesByBiz] = useState<Record<string, AnalysisSummary[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openedAnalysisId, setOpenedAnalysisId] = useState<string | null>(null);

  // Muat ulang dari backend setiap pindah halaman, agar analisis baru langsung muncul.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await backend.listBusinesses();
        const entries = await Promise.all(list.map(async (b) => [b.id, await backend.listAnalyses(b.id)] as const));
        if (cancelled) return;
        setBusinesses(list);
        setAnalysesByBiz(Object.fromEntries(entries));
        setExpanded((prev) => (Object.keys(prev).length || !list[0] ? prev : { [list[0].id]: true }));
      } catch {
        // backend mati: sidebar kosong, halaman menampilkan pesannya sendiri
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Sorot analisis hanya di halaman hasil (dasbor & jelajah agen); halaman alur
  // (konteks, video, dst.) adalah pembuatan analisis baru, jadi tidak ada yang disorot.
  const onAnalysisPage = pathname === '/business/analysis' || pathname === '/business/analysis/agents';
  const urlAid = searchParams.get('aid');
  const activeAnalysisId = urlAid ?? (onAnalysisPage ? (openedAnalysisId ?? 'ana_demo') : null);

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/businesses"
          className="flex h-9 items-center px-1.5 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0"
        >
          <span className="group-data-[collapsible=icon]/sidebar:hidden">
            <SekilasLogo size={22} textClassName="text-[15px] font-semibold tracking-[-0.02em] text-ink" />
          </span>
          <span className="hidden group-data-[collapsible=icon]/sidebar:inline-flex">
            <SekilasLogoIcon size={22} />
          </span>
        </Link>
        <Link
          href={NEW_ANALYSIS_HREF}
          title="Analisis baru"
          className="btn-primary flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium text-white group-data-[collapsible=icon]/sidebar:px-0 [&>span]:group-data-[collapsible=icon]/sidebar:hidden"
        >
          <PlusIcon size={16} />
          <span>Analisis baru</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/businesses" tooltip="Daftar bisnis" isActive={pathname === '/businesses'}>
                <LayoutGridIcon size={17} />
                <span>Daftar bisnis</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Bisnis & analisis</SidebarGroupLabel>
          <ul className="flex flex-col gap-0.5">
            {businesses.map((b) => (
              <BusinessNode
                key={b.id}
                business={b}
                analyses={analysesByBiz[b.id] ?? []}
                expanded={!!expanded[b.id]}
                onToggle={() => setExpanded((prev) => ({ ...prev, [b.id]: !prev[b.id] }))}
                activeAnalysisId={activeAnalysisId}
                onOpenAnalysis={setOpenedAnalysisId}
              />
            ))}
          </ul>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-40 text-[12px] font-semibold text-white"
            title={CURRENT_USER.name}
          >
            {CURRENT_USER.name.charAt(0)}
          </span>
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]/sidebar:hidden">
            <span className="block truncate text-[13px] font-medium text-ink">{CURRENT_USER.name}</span>
            <span className="block truncate text-[11px] text-muted">{CURRENT_USER.email}</span>
          </span>
          <Link
            href="/masuk"
            title="Keluar"
            aria-label="Keluar"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-friction-10 hover:text-friction group-data-[collapsible=icon]/sidebar:hidden"
          >
            <LogOutIcon size={15} />
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
