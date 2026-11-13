import React, { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  requiredText?: 'wajib' | 'opsional';
  hint?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  requiredText,
  hint,
  className = '',
  ...props
}) => {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className={`text-xs font-medium text-ink-soft flex items-center gap-2 ${className}`} {...props}>
        <span>{children}</span>
        {requiredText && (
          <span
            className={`font-mono text-[10px] font-semibold uppercase ${
              requiredText === 'wajib' ? 'text-primary-40' : 'text-subtle'
            }`}
          >
            {requiredText}
          </span>
        )}
      </label>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div>
        <input
          ref={ref}
          aria-invalid={Boolean(error)}
          className={`w-full h-10 rounded-xl border border-line bg-surface px-3.5 text-[13px] text-ink placeholder:text-subtle transition focus:border-primary-40 focus:outline-none focus:ring-2 focus:ring-primary-10 disabled:bg-panel disabled:text-subtle ${
            error ? 'border-friction focus:border-friction focus:ring-friction/10' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-friction">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div>
        <textarea
          ref={ref}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl border border-line bg-surface p-3 text-[13px] text-ink placeholder:text-subtle transition focus:border-primary-40 focus:outline-none focus:ring-2 focus:ring-primary-10 disabled:bg-panel disabled:text-subtle min-h-[88px] ${
            error ? 'border-friction focus:border-friction focus:ring-friction/10' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-friction">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  role?: 'radio' | 'checkbox';
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onClick,
  role = 'checkbox',
  className = '',
}) => {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
        selected
          ? 'bg-primary-10 text-primary-40 border border-primary-20 shadow-xs'
          : 'bg-surface text-ink-soft border border-line hover:border-subtle hover:bg-panel'
      } ${className}`}
    >
      {selected && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary-40 mr-1.5" />
      )}
      {label}
    </button>
  );
};
