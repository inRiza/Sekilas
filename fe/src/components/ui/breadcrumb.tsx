'use client';

import React from 'react';
import Link from 'next/link';

export function Breadcrumb({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs ${className}`}>
      {children}
    </nav>
  );
}

export function BreadcrumbList({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <ol className={`flex items-center gap-1.5 sm:gap-2 flex-wrap text-muted ${className}`}>
      {children}
    </ol>
  );
}

export function BreadcrumbItem({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <li className={`inline-flex items-center gap-1.5 sm:gap-2 ${className}`}>{children}</li>;
}

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
    <Link
      href={href}
      className={`hover:text-ink transition font-medium truncate max-w-[120px] sm:max-w-[180px] ${className}`}
    >
      {children}
    </Link>
  );
}

export function BreadcrumbPage({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      aria-current="page"
      className={`font-semibold text-ink truncate max-w-[120px] sm:max-w-[180px] ${className}`}
    >
      {children}
    </span>
  );
}

export function BreadcrumbSeparator({ className = '' }: { className?: string }) {
  return <span className={`text-subtle font-mono text-[10px] select-none ${className}`}>/</span>;
}
