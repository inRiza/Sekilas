import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'impact' | 'friction' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  const variantStyles = {
    primary: 'bg-primary-10 text-primary-40',
    impact: 'bg-impact-10 text-impact',
    friction: 'bg-friction-10 text-friction',
    neutral: 'bg-soft text-ink-soft',
  }[variant];

  // Huruf pertama kapital agar label seperti "berhenti lalu pergi" tetap rapi
  const content =
    typeof children === 'string' && children.length > 0
      ? children.charAt(0).toUpperCase() + children.slice(1)
      : children;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums rounded-md ${sizeStyles} ${variantStyles} ${className}`}
    >
      {content}
    </span>
  );
}
