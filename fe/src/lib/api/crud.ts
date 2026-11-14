import { MOCK_ANALYSES } from '@/lib/mock/analyses';
import { MOCK_BUSINESSES } from '@/lib/mock/business';
import { MOCK_CONTEXT } from '@/lib/mock/context';
import { createClient } from '@/lib/supabase/client';
import type { Analysis, Business, BusinessContext, BusinessType, PriceLevel } from '@/types/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '') + '/api/v1';

const STORAGE_BIZ_KEY = 'sekilas_businesses_v1';
const STORAGE_ANL_KEY = 'sekilas_analyses_v1';
const STORAGE_CTX_KEY = 'sekilas_contexts_v1';
const CRUD_EVENT = 'sekilas:crud-changed';

export interface CreateBusinessPayload {
  name: string;
  branch_name?: string;
  category: BusinessType;
  address?: string;
}

export interface UpdateBusinessPayload {
  name?: string;
  branch_name?: string;
  category?: BusinessType;
  address?: string;
  primary_analysis_id?: string | null;
  context?: BusinessContext;
}

export interface CreateAnalysisPayload {
  business_id: string;
  name?: string;
  status?: Analysis['status'];
  total_agents?: number;
  context?: BusinessContext;
}

export interface UpdateAnalysisPayload {
  name?: string;
  status?: Analysis['status'];
  stale?: boolean;
  set_as_primary?: boolean;
}

function notifyCrudChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CRUD_EVENT));
  }
}

export function subscribeCrudChanges(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CRUD_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CRUD_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export function calculateMedianPriceLevel(prices: number[]): PriceLevel {
  const valid = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (valid.length === 0) return 'hemat';
  const mid = Math.floor(valid.length / 2);
  const median = valid.length % 2 === 0 ? (valid[mid - 1]! + valid[mid]!) / 2 : valid[mid]!;
  if (median < 25000) return 'hemat';
  if (median <= 60000) return 'sedang';
  return 'premium';
}

/* ---------------- Local Fallback Store ---------------- */

export function getLocalBusinesses(): Business[] {
  if (typeof window === 'undefined') return MOCK_BUSINESSES;
  try {
    const raw = window.localStorage.getItem(STORAGE_BIZ_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_BIZ_KEY, JSON.stringify(MOCK_BUSINESSES));
      return MOCK_BUSINESSES;
    }
    return JSON.parse(raw) as Business[];
  } catch {
    return MOCK_BUSINESSES;
  }
}

function setLocalBusinesses(items: Business[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_BIZ_KEY, JSON.stringify(items));
  notifyCrudChanged();
}

export function getLocalAnalyses(): Analysis[] {
  if (typeof window === 'undefined') return MOCK_ANALYSES;
  try {
    const raw = window.localStorage.getItem(STORAGE_ANL_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_ANL_KEY, JSON.stringify(MOCK_ANALYSES));
      return MOCK_ANALYSES;
    }
    return JSON.parse(raw) as Analysis[];
  } catch {
    return MOCK_ANALYSES;
  }
}

function setLocalAnalyses(items: Analysis[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_ANL_KEY, JSON.stringify(items));
  notifyCrudChanged();
}

function getLocalContextMap(): Record<string, BusinessContext> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_CTX_KEY);
    return raw ? (JSON.parse(raw) as Record<string, BusinessContext>) : {};
  } catch {
    return {};
  }
}

function setLocalContext(analysisId: string, ctx: BusinessContext) {
  if (typeof window === 'undefined') return;
  const map = getLocalContextMap();
  map[analysisId] = ctx;
  window.localStorage.setItem(STORAGE_CTX_KEY, JSON.stringify(map));
  notifyCrudChanged();
}

async function tryApiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    let authHeader: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        authHeader = { Authorization: `Bearer ${data.session.access_token}` };
      }
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ---------------- Businesses CRUD ---------------- */

export async function fetchBusinesses(): Promise<Business[]> {
  const remote = await tryApiFetch<Business[]>('/businesses');
  if (remote && remote.length > 0) {
    setLocalBusinesses(remote);
    return remote;
  }
  return getLocalBusinesses();
}

export async function createBusiness(payload: CreateBusinessPayload): Promise<Business> {
  const remote = await tryApiFetch<Business>('/businesses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (remote) {
    const list = getLocalBusinesses();
    setLocalBusinesses([...list.filter((b) => b.id !== remote.id), remote]);
    return remote;
  }

  const newBiz: Business = {
    id: `biz_${Date.now()}`,
    user_id: 'usr_01',
    name: payload.name.trim(),
    branch_name: payload.branch_name?.trim() || 'Pusat',
    category: payload.category,
    address: payload.address?.trim() || 'Alamat tempat usaha baru',
    primary_analysis_id: null,
    context: {
      ...MOCK_CONTEXT,
      business_name: payload.name.trim(),
      business_type: payload.category,
      location_name: payload.address?.trim() || 'Alamat tempat usaha baru',
      location_description: 'Akses masuk dari jalan raya',
      surroundings_type: 'jalan_utama',
      surroundings: ['jalan_utama'],
      passersby: ['mahasiswa', 'pekerja_kantor'],
      business_goal: 'lebih_banyak_pembeli_baru',
      calculated_price_level: 'hemat',
      fixed_constraints: [],
      menu_items: [],
      opening_hours: { open: '08:00', close: '22:00' },
      rush_hours: [{ start: '12:00', end: '14:00' }],
    },
    created_at: new Date().toISOString(),
  };
  const list = getLocalBusinesses();
  setLocalBusinesses([...list, newBiz]);
  return newBiz;
}

export async function updateBusiness(businessId: string, payload: UpdateBusinessPayload): Promise<Business | null> {
  const remote = await tryApiFetch<Business>(`/businesses/${businessId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (remote) {
    const list = getLocalBusinesses().map((b) => (b.id === businessId ? remote : b));
    setLocalBusinesses(list);
    return remote;
  }

  const list = getLocalBusinesses();
  const target = list.find((b) => b.id === businessId);
  if (!target) return null;

  const updated: Business = {
    ...target,
    name: payload.name !== undefined ? payload.name.trim() : target.name,
    branch_name: payload.branch_name !== undefined ? payload.branch_name.trim() || 'Pusat' : target.branch_name,
    category: payload.category ?? target.category,
    address: payload.address !== undefined ? payload.address.trim() : target.address,
    primary_analysis_id:
      payload.primary_analysis_id !== undefined ? payload.primary_analysis_id : target.primary_analysis_id,
    context: payload.context ?? {
      ...target.context,
      business_name: payload.name !== undefined ? payload.name.trim() : target.context.business_name,
      business_type: payload.category ?? target.context.business_type,
      location_name: payload.address !== undefined ? payload.address.trim() : target.context.location_name,
    },
  };
  setLocalBusinesses(list.map((b) => (b.id === businessId ? updated : b)));

  // Sync business_name / branch_name on local analyses
  const analyses = getLocalAnalyses().map((a) =>
    a.business_id === businessId
      ? {
          ...a,
          business_name: updated.name,
          branch_name: updated.branch_name,
          business_type: updated.category,
        }
      : a,
  );
  setLocalAnalyses(analyses);

  return updated;
}

export async function deleteBusiness(businessId: string): Promise<void> {
  await tryApiFetch<void>(`/businesses/${businessId}`, { method: 'DELETE' });
  const list = getLocalBusinesses().filter((b) => b.id !== businessId);
  setLocalBusinesses(list);
  const analyses = getLocalAnalyses().filter((a) => a.business_id !== businessId);
  setLocalAnalyses(analyses);
}

/* ---------------- Analyses CRUD ---------------- */

export async function fetchAnalyses(businessId?: string): Promise<Analysis[]> {
  const query = businessId ? `?business_id=${encodeURIComponent(businessId)}` : '';
  const remote = await tryApiFetch<Analysis[]>(`/analyses${query}`);
  if (remote && remote.length > 0) {
    if (!businessId) {
      setLocalAnalyses(remote);
    }
    return remote;
  }
  const all = getLocalAnalyses();
  return businessId ? all.filter((a) => a.business_id === businessId) : all;
}

export async function createAnalysis(payload: CreateAnalysisPayload): Promise<Analysis> {
  const remote = await tryApiFetch<Analysis>('/analyses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (remote) {
    const list = getLocalAnalyses();
    setLocalAnalyses([remote, ...list.filter((a) => a.id !== remote.id)]);
    return remote;
  }

  const businesses = getLocalBusinesses();
  const biz = businesses.find((b) => b.id === payload.business_id) ?? businesses[0];
  const newAnl: Analysis = {
    id: `anl_${Date.now()}`,
    business_id: biz?.id ?? payload.business_id,
    business_name: biz?.name ?? 'Tempat Usaha',
    branch_name: biz?.branch_name ?? 'Pusat',
    name: payload.name?.trim() || `Analisis ${biz?.name ?? 'Usaha'} (${biz?.branch_name ?? 'Pusat'})`,
    business_type: biz?.category ?? 'kedai',
    created_at: new Date().toISOString(),
    status: payload.status ?? 'draft',
    quality_label: 'Kualitas baik',
    total_agents: payload.total_agents ?? 20,
    context: payload.context ?? biz?.context ?? MOCK_CONTEXT,
  };
  const list = getLocalAnalyses();
  setLocalAnalyses([newAnl, ...list]);
  if (newAnl.context) {
    setLocalContext(newAnl.id, newAnl.context);
  }
  if (biz && !biz.primary_analysis_id) {
    await updateBusiness(biz.id, { primary_analysis_id: newAnl.id });
  }
  return newAnl;
}

export async function updateAnalysis(analysisId: string, payload: UpdateAnalysisPayload): Promise<Analysis | null> {
  const remote = await tryApiFetch<Analysis>(`/analyses/${analysisId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (remote) {
    const list = getLocalAnalyses().map((a) => (a.id === analysisId ? remote : a));
    setLocalAnalyses(list);
    if (payload.set_as_primary) {
      const bizList = getLocalBusinesses().map((b) =>
        b.id === remote.business_id ? { ...b, primary_analysis_id: remote.id } : b,
      );
      setLocalBusinesses(bizList);
    }
    return remote;
  }

  const list = getLocalAnalyses();
  const target = list.find((a) => a.id === analysisId);
  if (!target) return null;
  const updated: Analysis = {
    ...target,
    name: payload.name !== undefined ? payload.name.trim() : target.name,
    status: payload.status ?? target.status,
    stale: payload.stale !== undefined ? payload.stale : target.stale,
  };
  setLocalAnalyses(list.map((a) => (a.id === analysisId ? updated : a)));

  if (payload.set_as_primary) {
    const bizList = getLocalBusinesses().map((b) =>
      b.id === updated.business_id ? { ...b, primary_analysis_id: updated.id } : b,
    );
    setLocalBusinesses(bizList);
  }
  return updated;
}

export async function deleteAnalysis(analysisId: string): Promise<void> {
  await tryApiFetch<void>(`/analyses/${analysisId}`, { method: 'DELETE' });
  const list = getLocalAnalyses();
  const target = list.find((a) => a.id === analysisId);
  const remaining = list.filter((a) => a.id !== analysisId);
  setLocalAnalyses(remaining);

  if (target) {
    const businesses = getLocalBusinesses().map((b) => {
      if (b.id === target.business_id && b.primary_analysis_id === analysisId) {
        const nextPrimary = remaining.find((a) => a.business_id === b.id);
        return { ...b, primary_analysis_id: nextPrimary?.id ?? null };
      }
      return b;
    });
    setLocalBusinesses(businesses);
  }
}

/* ---------------- Context & Menu CRUD ---------------- */

export async function fetchAnalysisContext(analysisId?: string | null, businessId?: string | null): Promise<BusinessContext> {
  if (analysisId) {
    const remote = await tryApiFetch<BusinessContext>(`/analyses/${analysisId}/context`);
    if (remote) {
      setLocalContext(analysisId, remote);
      return remote;
    }
    const localMap = getLocalContextMap();
    if (localMap[analysisId]) return localMap[analysisId]!;
    const anl = getLocalAnalyses().find((a) => a.id === analysisId);
    if (anl?.context) return anl.context;
    const biz = getLocalBusinesses().find((b) => b.id === anl?.business_id);
    if (biz?.context) return biz.context;
  }
  if (businessId) {
    const biz = getLocalBusinesses().find((b) => b.id === businessId);
    if (biz?.context) return biz.context;
  }
  return MOCK_CONTEXT;
}

export async function saveAnalysisContext(
  analysisId: string,
  context: BusinessContext,
  businessId?: string | null,
): Promise<BusinessContext> {
  const remote = await tryApiFetch<BusinessContext>(`/analyses/${analysisId}/context`, {
    method: 'PUT',
    body: JSON.stringify(context),
  });
  const saved = remote ?? {
    ...context,
    calculated_price_level: calculateMedianPriceLevel(context.menu_items.map((m) => m.price)),
  };

  setLocalContext(analysisId, saved);

  // Sync local analysis & business default context
  const analyses = getLocalAnalyses();
  const targetAnl = analyses.find((a) => a.id === analysisId);
  const resolvedBizId = businessId ?? targetAnl?.business_id;

  if (targetAnl) {
    setLocalAnalyses(
      analyses.map((a) =>
        a.id === analysisId
          ? {
              ...a,
              business_name: saved.business_name,
              business_type: saved.business_type,
              context: saved,
            }
          : a,
      ),
    );
  }

  if (resolvedBizId) {
    const businesses = getLocalBusinesses().map((b) =>
      b.id === resolvedBizId
        ? {
            ...b,
            name: saved.business_name.trim() || b.name,
            category: saved.business_type,
            address: saved.location_name.trim() || b.address,
            context: saved,
          }
        : b,
    );
    setLocalBusinesses(businesses);
  }

  return saved;
}
