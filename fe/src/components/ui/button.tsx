import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'friction';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-40 disabled:opacity-45 disabled:pointer-events-none rounded-full cursor-pointer';

    const sizeStyles = {
      sm: 'h-8 px-3.5 text-xs gap-1.5',
      md: 'h-9 px-4 text-[13px] gap-2',
      lg: 'h-11 px-6 text-sm gap-2.5',
    }[size];

    const variantStyles = {
      primary:
        'bg-primary-40 text-white shadow-sm hover:bg-primary-50 active:scale-[0.98]',
      secondary:
        'border border-line bg-surface text-ink hover:bg-panel hover:border-subtle active:scale-[0.98]',
      ghost:
        'text-muted hover:text-ink hover:bg-panel active:scale-[0.98]',
      friction:
        'bg-friction text-white hover:bg-friction/90 active:scale-[0.98]',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
