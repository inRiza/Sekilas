'use client';

import { CloudOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { getBackendStatus, subscribeBackendStatus } from '@/lib/api/crud';

/** Pita peringatan saat backend tidak terjangkau: data yang tampil bukan dari database. */
export function BackendStatusBanner() {
  const status = useSyncExternalStore(subscribeBackendStatus, getBackendStatus, () => 'unknown' as const);
  if (status !== 'offline') return null;
  return (
    <div className="flex items-center gap-2 bg-friction-10 px-4 py-2 text-[13px] text-friction sm:px-6">
      <CloudOff size={15} className="shrink-0" />
      <span>Server Sekilas tidak terjangkau. Data yang tampil berasal dari perangkat ini dan belum tersimpan ke database.</span>
    </div>
  );
}
