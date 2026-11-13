'use client';

import { Check, ChevronDown } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';

export type SelectOption<T extends string> = { value: T; label: string; description?: string };

/**
 * Dropdown pilihan (bukan <select> native): tombol pemicu + daftar pilihan bergaya aplikasi.
 * Keyboard: Enter/Spasi/Panah bawah membuka, Panah atas/bawah berpindah, Enter memilih, Esc menutup.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Pilih salah satu',
  id,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? null;

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const choose = (i: number) => {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // jangan ikut menutup dialog induk
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-[13px] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-10 ${
          open ? 'border-primary-40' : 'border-line hover:border-[#d3d7dd] focus:border-primary-40'
        }`}
      >
        <span className={selected ? 'text-ink' : 'text-subtle'}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-md border border-line bg-white p-1 shadow-[0_8px_24px_rgba(16,24,40,0.10)]"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center gap-2 rounded-[5px] px-2.5 py-2 text-[13px] ${
                  i === active ? 'bg-hover' : ''
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block ${isSelected ? 'font-medium text-ink' : 'text-ink-soft'}`}>{o.label}</span>
                  {o.description && <span className="mt-0.5 block text-[12px] text-muted">{o.description}</span>}
                </span>
                {isSelected && <Check size={15} className="shrink-0 text-primary-40" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
