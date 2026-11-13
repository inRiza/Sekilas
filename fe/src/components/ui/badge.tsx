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
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  const variantStyles = {
    primary: 'bg-primary-10 text-primary-40 border border-primary-20',
    impact: 'bg-impact-10 text-impact border border-impact/20',
    friction: 'bg-friction-10 text-friction border border-friction/20',
    neutral: 'bg-bg text-muted border border-line',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-full uppercase tracking-wider ${sizeStyles} ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
}
