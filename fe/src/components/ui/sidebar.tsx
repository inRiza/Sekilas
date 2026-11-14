'use client';

/**
 * Sidebar bergaya shadcn/ui (varian "inset"): sidebar menempel di kiri, konten halaman
 * berada di panel putih membulat yang "masuk ke dalam" latar abu-abu.
 *
 * - Desktop (md+): selalu tampil, default terbuka, bisa diciutkan ke mode ikon
 *   (tombol SidebarTrigger atau Ctrl/Cmd + B).
 * - Mobile: sidebar tidak muat di samping konten, jadi dibuka sebagai laci dari kiri.
 */

import Link from 'next/link';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { PanelLeftIcon } from '@/components/ui/icons';

const DESKTOP_QUERY = '(min-width: 768px)';

type SidebarContextValue = {
  /** Desktop: terbuka penuh (true) atau mode ikon (false). */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Mobile: laci terbuka. */
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar harus dipakai di dalam <SidebarProvider>.');
  return ctx;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function SidebarProvider({
  defaultOpen = true,
  className,
  children,
}: {
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) setOpen((v) => !v);
    else setOpenMobile((v) => !v);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  const value = useMemo(
    () => ({ open, setOpen, openMobile, setOpenMobile, toggleSidebar }),
    [open, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div className={cn('flex min-h-svh w-full bg-sidebar', className)}>{children}</div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      {/* Desktop: kolom tetap, lebarnya beranimasi saat diciutkan */}
      <aside
        data-collapsible={open ? 'expanded' : 'icon'}
        className={cn(
          'group/sidebar sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden md:flex',
          'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          open ? 'w-64' : 'w-[3.75rem]',
          className,
        )}
      >
        {children}
      </aside>

      {/* Mobile: laci dari kiri */}
      {openMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpenMobile(false)}
            aria-hidden
          />
          <aside
            data-collapsible="expanded"
            className="group/sidebar absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar shadow-xl"
          >
            {children}
          </aside>
        </div>
      )}
    </>
  );
}

/** Area konten: panel putih bergaris tepi tipis di sebelah sidebar; menjadi area scroll halaman. */
export function SidebarInset({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <main
      className={cn(
        'app-inset relative flex h-svh min-w-0 flex-1 flex-col overflow-y-auto bg-white',
        'md:my-2 md:mr-2 md:h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-line',
        className,
      )}
    >
      {children}
    </main>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Buka atau ciutkan sidebar"
      title="Sidebar (Ctrl/Cmd + B)"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-ink',
        className,
      )}
    >
      <PanelLeftIcon size={18} />
    </button>
  );
}

export function SidebarHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex shrink-0 flex-col gap-3 p-3', className)}>{children}</div>;
}

export function SidebarContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden px-3 py-2', className)}>
      {children}
    </div>
  );
}

export function SidebarFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('shrink-0 p-3', className)}>{children}</div>;
}

export function SidebarGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('flex flex-col gap-1', className)}>{children}</section>;
}

/** Judul kelompok; disembunyikan saat sidebar dalam mode ikon. */
export function SidebarGroupLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2
      className={cn(
        'px-2 pb-1 text-[11px] font-medium text-subtle group-data-[collapsible=icon]/sidebar:hidden',
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function SidebarMenu({ className, children }: { className?: string; children: React.ReactNode }) {
  return <ul className={cn('flex flex-col gap-0.5', className)}>{children}</ul>;
}

export function SidebarMenuItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return <li className={cn('list-none', className)}>{children}</li>;
}

/**
 * Tombol menu. Isinya: ikon lalu <span> label. Saat mode ikon, label disembunyikan
 * dan `tooltip` dipakai sebagai title.
 */
export function SidebarMenuButton({
  href,
  isActive = false,
  disabled = false,
  tooltip,
  className,
  onClick,
  children,
}: {
  href?: string;
  isActive?: boolean;
  /** Tampil redup dan tidak bisa diklik (misal hasil analisis yang belum siap). */
  disabled?: boolean;
  tooltip?: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { open, setOpenMobile } = useSidebar();
  const classes = cn(
    'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors',
    'group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0',
    '[&>span]:truncate group-data-[collapsible=icon]/sidebar:[&>span]:hidden',
    '[&>svg]:shrink-0',
    isActive
      ? 'bg-soft font-medium text-ink [&>svg]:text-primary-40'
      : 'text-ink-soft hover:bg-hover hover:text-ink [&>svg]:text-muted hover:[&>svg]:text-ink',
    className,
  );
  const title = open ? undefined : tooltip;
  const handleClick = () => {
    setOpenMobile(false);
    onClick?.();
  };

  if (disabled) {
    return (
      <span className={cn(classes, 'cursor-not-allowed opacity-45 hover:bg-transparent')} title={tooltip} aria-disabled>
        {children}
      </span>
    );
  }
  if (href) {
    return (
      <Link href={href} className={classes} title={title} aria-current={isActive ? 'page' : undefined} onClick={handleClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} title={title} onClick={handleClick}>
      {children}
    </button>
  );
}
