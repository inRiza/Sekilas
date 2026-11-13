import { Check } from 'lucide-react';
import React, { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

import { Badge } from '@/components/ui/badge';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  requiredText?: 'wajib' | 'opsional';
  hint?: string;
}

/** Label field: teks, badge Wajib/Opsional, dan petunjuk singkat di kanan. */
export const Label: React.FC<LabelProps> = ({ children, requiredText, hint, className = '', ...props }) => {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <label className={`flex items-center gap-2 text-[13px] font-medium text-ink ${className}`} {...props}>
        <span>{children}</span>
        {requiredText && (
          <Badge variant={requiredText === 'wajib' ? 'primary' : 'neutral'}>
            {requiredText === 'wajib' ? 'Wajib' : 'Opsional'}
          </Badge>
        )}
      </label>
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </div>
  );
};

const fieldBase =
  'w-full rounded-md border border-line bg-white text-[13px] text-ink placeholder:text-subtle transition-colors focus:border-primary-40 focus:outline-none focus:ring-2 focus:ring-primary-10 disabled:bg-panel disabled:text-subtle';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className = '', error, ...props }, ref) => {
  return (
    <div className="w-full">
      <input
        ref={ref}
        aria-invalid={Boolean(error)}
        className={`${fieldBase} h-10 px-3 ${error ? 'border-friction focus:border-friction focus:ring-friction/10' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-friction">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

/** Textarea tinggi tetap (tidak bisa di-resize). */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className = '', error, ...props }, ref) => {
  return (
    <div className="w-full">
      <textarea
        ref={ref}
        aria-invalid={Boolean(error)}
        className={`${fieldBase} h-24 resize-none p-3 leading-relaxed ${error ? 'border-friction focus:border-friction focus:ring-friction/10' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-friction">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  /** radio = pilih satu (tanpa penanda), checkbox = pilih banyak (dengan kotak centang). */
  role?: 'radio' | 'checkbox';
  className?: string;
}

/** Tombol pilihan. Pilih banyak menampilkan kotak centang; pilih satu cukup disorot. */
export const Chip: React.FC<ChipProps> = ({ label, selected = false, onClick, role = 'checkbox', className = '' }) => {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] transition-colors ${
        selected
          ? 'border-primary-40 bg-primary-10 font-medium text-primary-50'
          : 'border-line bg-white text-ink-soft hover:bg-hover hover:text-ink'
      } ${className}`}
    >
      {role === 'checkbox' && (
        <span
          aria-hidden
          className={`grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors ${
            selected ? 'border-primary-40 bg-primary-40 text-white' : 'border-[#c9ced6] bg-white'
          }`}
        >
          {selected && <Check size={11} strokeWidth={3} />}
        </span>
      )}
      {label}
    </button>
  );
};
