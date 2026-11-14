'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError, backend } from '@/lib/backend';

/**
 * ID analisis untuk halaman alur (`?aid=`). Bila belum ada, buat analisis baru di bisnis `?bid=`
 * (atau bisnis pertama), lalu tulis `aid` ke URL agar halaman berikutnya memakai analisis yang sama.
 */
export function useAnalysisId(): { aid: string | null; error: string | null } {
  const params = useSearchParams();
  const router = useRouter();
  const urlAid = params.get('aid');
  const bid = params.get('bid');
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlAid) return;
    let cancelled = false;
    (async () => {
      try {
        const businessId = bid ?? (await backend.listBusinesses()).find((b) => b.id !== 'biz_demo')?.id ?? 'biz_demo';
        const analysis = await backend.createAnalysis(businessId);
        if (cancelled) return;
        setCreated(analysis.id);
        const url = new URL(window.location.href);
        url.searchParams.set('aid', analysis.id);
        url.searchParams.delete('bid');
        router.replace(`${url.pathname}?${url.searchParams.toString()}`);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Gagal membuat analisis.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlAid, bid, router]);

  return { aid: urlAid ?? created, error };
}

/** Tambahkan `?aid=` ke rute alur berikutnya. */
export const withAid = (path: string, aid: string | null) => (aid ? `${path}?aid=${aid}` : path);
