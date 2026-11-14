'use client';

import React from 'react';

/** Input jam 24 jam (native), lebar tetap agar pasangan start/end sejajar. */
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
    <input
      id={id}
      type="time"
      step={60}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-[7.5rem] shrink-0 rounded-md border border-line bg-white px-2.5 text-[13px] text-ink tabular-nums transition-colors focus:border-primary-40 focus:outline-none focus:ring-2 focus:ring-primary-10"
    />
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
