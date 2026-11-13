'use client';

import React from 'react';

export function Sidebar({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <aside
      className={`relative z-10 w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between border-r border-line animate-in slide-in-from-left duration-200 ${className}`}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-4 border-b border-hairline flex items-center justify-between shrink-0 ${className}`}>
      {children}
    </div>
  );
}

export function SidebarContent({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin ${className}`}>
      {children}
    </div>
  );
}

export function SidebarGroup({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`space-y-1.5 ${className}`}>{children}</div>;
}

export function SidebarGroupLabel({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em] text-subtle font-semibold ${className}`}
    >
      {children}
    </div>
  );
}

export function SidebarMenu({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <ul className={`space-y-1 ${className}`}>{children}</ul>;
}

export function SidebarMenuItem({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <li className={`list-none ${className}`}>{children}</li>;
}

export function SidebarMenuButton({
  className = '',
  isActive = false,
  children,
  onClick,
  ...props
}: {
  className?: string;
  isActive?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      onClick={onClick}
      className={`group/btn flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition cursor-pointer select-none ${
        isActive
          ? 'bg-primary-10 text-primary-40 font-semibold border border-primary-20'
          : 'text-ink hover:bg-panel border border-transparent'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarMenuSub({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul
      className={`ml-3.5 pl-2.5 border-l border-hairline space-y-1 my-1 list-none ${className}`}
    >
      {children}
    </ul>
  );
}

export function SidebarMenuSubItem({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <li className={`list-none ${className}`}>{children}</li>;
}

export function SidebarMenuSubButton({
  className = '',
  isActive = false,
  children,
  onClick,
  ...props
}: {
  className?: string;
  isActive?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition cursor-pointer select-none ${
        isActive
          ? 'bg-primary-10 text-primary-40 font-semibold'
          : 'text-muted hover:text-ink hover:bg-panel'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-4 border-t border-hairline shrink-0 bg-panel/30 ${className}`}>
      {children}
    </div>
  );
}
