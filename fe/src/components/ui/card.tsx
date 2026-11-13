import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({
  children,
  className = '',
  padded = true,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-[0_4px_20px_rgb(0_0_0/0.03)] transition-all ${
        padded ? 'p-5 sm:p-6' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface HeroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function HeroCard({ children, className = '', ...props }: HeroCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-40 to-primary-50 p-6 text-white shadow-[0_8px_24px_rgb(47_101_246/0.22)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
