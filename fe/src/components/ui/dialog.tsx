'use client';

import { X } from 'lucide-react';
import React, { useEffect } from 'react';

/**
 * Modal sederhana: latar gelap ber-blur, panel putih rounded-md, tombol tutup, Esc untuk menutup,
 * dan scroll halaman dikunci selama terbuka.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-[fadeIn_150ms_ease-out] bg-ink/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative w-full max-w-lg animate-[fadeIn_200ms_ease-out] rounded-md border border-line bg-white shadow-[0_24px_60px_rgba(16,24,40,0.18)]"
      >
        <div className="flex items-start gap-4 px-6 pb-2 pt-6">
          <div className="min-w-0 flex-1">
            <h2 id="dialog-title" className="text-[17px] font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 rounded-b-md bg-panel px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
