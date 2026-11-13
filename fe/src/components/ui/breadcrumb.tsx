'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export function Breadcrumb({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className={`flex min-w-0 items-center text-[13px] ${className}`}>
      {children}
    </nav>
  );
}

export function BreadcrumbList({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <ol className={`flex min-w-0 items-center gap-0.5 text-muted ${className}`}>{children}</ol>;
}

export function BreadcrumbItem({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <li className={`inline-flex min-w-0 items-center ${className}`}>{children}</li>;
}

const crumbBase =
  'inline-flex h-7 min-w-0 max-w-[200px] items-center gap-1.5 rounded-md px-2 [&>svg]:shrink-0 [&>span]:truncate';

/** Tingkat di atas halaman ini: bisa diklik. */
export function BreadcrumbLink({
  href,
  className = '',
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${crumbBase} transition-colors hover:bg-hover hover:text-ink ${className}`}>
      {children}
    </Link>
  );
}

/** Tingkat yang tidak punya halaman sendiri (misal "Analisis baru" saat wizard). */
export function BreadcrumbText({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`${crumbBase} ${className}`}>{children}</span>;
}

/** Halaman saat ini. */
export function BreadcrumbPage({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <span aria-current="page" className={`${crumbBase} font-medium text-ink ${className}`}>
      {children}
    </span>
  );
}

export function BreadcrumbSeparator({ className = '' }: { className?: string }) {
  return (
    <li role="presentation" aria-hidden className={`inline-flex text-subtle ${className}`}>
      <ChevronRight size={14} strokeWidth={1.75} />
    </li>
  );
}
