'use client';

import React from 'react';

import { Select, type SelectOption } from '@/components/ui/select';

/** Pilihan jam format 24 jam, tiap 30 menit: '00:00' .. '23:30' ditampilkan sebagai '00.00' .. '23.30'. */
const TIME_OPTIONS: SelectOption<string>[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 ? '30' : '00';
  return { value: `${h}:${m}`, label: `${h}.${m}` };
});

/** Pemilih jam 24 jam (bukan input waktu native yang bisa tampil AM/PM). */
export function TimeSelect({
  value,
  onChange,
  id,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  'aria-label'?: string;
}) {
  return (
    <div className="w-full" aria-label={ariaLabel}>
      <Select id={id} value={value} onChange={onChange} options={TIME_OPTIONS} placeholder="--.--" />
    </div>
  );
}

/** 'HH:MM' -> menit sejak 00.00 */
export function toMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Apakah menit `t` berada dalam jam buka [open, close], termasuk jam tutup yang melewati tengah malam. */
export function isWithinHours(t: number, open: number, close: number) {
  return close > open ? t >= open && t <= close : t >= open || t <= close;
}
