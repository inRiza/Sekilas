import { MOCK_AGENTS } from '@/lib/mock/agents';
import { MOCK_ANALYSES } from '@/lib/mock/analyses';
import { MOCK_BUSINESSES } from '@/lib/mock/business';
import { MOCK_DASHBOARD } from '@/lib/mock/dashboard';
import { MOCK_TRANSCRIPT } from '@/lib/mock/transcript';
import { createClient } from '@/lib/supabase/client';
import type {
  AgentDecision,
  Analysis,
  Business,
  BusinessContext,
  BusinessType,
  DashboardData,
  MeasurementPlanData,
  MenuItem,
  PriceLevel,
  TranscriptSegment,
  WhatIfProjectionData,
} from '@/types/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '') + '/api/v1';

const STORAGE_BIZ_KEY = 'sekilas_businesses_v1';
const STORAGE_ANL_KEY = 'sekilas_analyses_v1';
const STORAGE_CTX_KEY = 'sekilas_contexts_v1';
const STORAGE_TRS_KEY = 'sekilas_transcripts_v1';
const STORAGE_VID_KEY = 'sekilas_videos_v1';
const CRUD_EVENT = 'sekilas:crud-changed';

export interface VideoMetadata {
  id?: string;
  analysis_id?: string;
  original_filename: string;
  storage_key?: string | null;
  public_url?: string | null;
  duration_s: number;
  cashier_at_s: number;
  width?: number | null;
  height?: number | null;
  accepted?: boolean;
  quality_checks?: Record<string, string>;
  blurred_faces_count?: number;
  blurred_plates_count?: number;
  frame_keys?: string[];
  frame_timestamps_s?: number[];
}

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

export function createEmptyContext(
  businessName = '',
  businessType: BusinessType = 'kedai',
  address = '',
): BusinessContext {
  return {
    business_type: businessType,
    business_name: businessName,
    location_name: address,
    location_description: '',
    surroundings_type: 'jalan_utama',
    surroundings: ['jalan_utama'],
    passersby: ['mahasiswa', 'pekerja_kantor'],
    business_goal: 'lebih_banyak_pembeli_baru',
    fixed_constraints: [],
    menu_items: [],
    calculated_price_level: 'hemat',
    opening_hours: { open: '08:00', close: '22:00' },
    rush_hours: [{ start: '12:00', end: '14:00' }],
    parking: [],
  };
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

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  } catch {
    // Fallback
  }
  return {};
}

async function tryApiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const authHeader = await getAuthHeaders();
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
  if (remote !== null) {
    setLocalBusinesses(remote);
    return remote;
  }
  return getLocalBusinesses();
}

export async function fetchBusinessById(businessId: string): Promise<Business | null> {
  const remote = await tryApiFetch<Business>(`/businesses/${encodeURIComponent(businessId)}`);
  if (remote) {
    const list = getLocalBusinesses();
    const exists = list.some((b) => b.id === remote.id);
    setLocalBusinesses(exists ? list.map((b) => (b.id === remote.id ? remote : b)) : [...list, remote]);
    return remote;
  }
  return getLocalBusinesses().find((b) => b.id === businessId) ?? null;
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
    address: payload.address?.trim() || '',
    primary_analysis_id: null,
    context: createEmptyContext(payload.name.trim(), payload.category, payload.address?.trim() || ''),
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
  if (remote !== null) {
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
    context: payload.context ?? biz?.context ?? createEmptyContext(biz?.name ?? '', biz?.category ?? 'kedai', biz?.address ?? ''),
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

export async function fetchAnalysisContext(
  analysisId?: string | null,
  businessId?: string | null,
): Promise<BusinessContext> {
  if (analysisId) {
    const remote = await tryApiFetch<BusinessContext>(`/analyses/${encodeURIComponent(analysisId)}/context`);
    if (remote) {
      setLocalContext(analysisId, remote);
      return remote;
    }
    const localMap = getLocalContextMap();
    if (localMap[analysisId]) return localMap[analysisId]!;
    const anl = getLocalAnalyses().find((a) => a.id === analysisId);
    if (anl?.context) return anl.context;
  }

  if (businessId) {
    const biz = await fetchBusinessById(businessId);
    if (biz?.context) return biz.context;
  }

  return createEmptyContext();
}

export async function parseMenuFile(file: File, analysisId?: string | null): Promise<MenuItem[]> {
  const targetId = analysisId || 'new';
  try {
    const authHeader = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/analyses/${encodeURIComponent(targetId)}/context/menu-file`, {
      method: 'POST',
      headers: authHeader,
      body: formData,
    });
    if (res.ok) {
      const data = (await res.json()) as MenuItem[];
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // Fallback client-side parser
  }

  // Client-side CSV / TSV / text fallback
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const items: MenuItem[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!;
      const parts = line.includes(';')
        ? line.split(';')
        : line.includes('\t')
          ? line.split('\t')
          : line.split(',');
      if (parts.length >= 2) {
        const name = (parts[0] ?? '').replace(/^["']|["']$/g, '').trim();
        const priceStr = (parts[1] ?? '').replace(/\D/g, '');
        if (i === 0 && /nama|menu|item/i.test(name)) continue;
        let price = Number(priceStr);
        if (price > 0 && price < 500) price *= 1000;
        if (name && price > 0) {
          items.push({ id: `mi_${i + 1}`, name, price });
        }
      }
    }
    return items;
  } catch {
    return [];
  }
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

/* ---------------- Video Metadata CRUD (F2) ---------------- */

function getLocalVideoMap(): Record<string, VideoMetadata> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_VID_KEY);
    return raw ? (JSON.parse(raw) as Record<string, VideoMetadata>) : {};
  } catch {
    return {};
  }
}

function setLocalVideo(analysisId: string, meta: VideoMetadata) {
  if (typeof window === 'undefined') return;
  const map = getLocalVideoMap();
  map[analysisId] = meta;
  window.localStorage.setItem(STORAGE_VID_KEY, JSON.stringify(map));
  notifyCrudChanged();
}

export async function fetchVideoMetadata(analysisId?: string | null): Promise<VideoMetadata> {
  const id = analysisId || 'selasar-kopi';
  const remote = await tryApiFetch<VideoMetadata>(`/analyses/${id}/video`);
  if (remote) {
    const normalized: VideoMetadata = {
      ...remote,
      original_filename: remote.original_filename ?? '',
      duration_s: remote.duration_s ?? 0,
      cashier_at_s: remote.cashier_at_s ?? remote.duration_s ?? 0,
    };
    if (normalized.original_filename) {
      setLocalVideo(id, normalized);
    }
    return normalized;
  }
  const local = getLocalVideoMap()[id];
  if (local) return local;
  return {
    id: `vid_${id}`,
    analysis_id: id,
    original_filename: '',
    duration_s: 0,
    cashier_at_s: 0,
    width: 1920,
    height: 1080,
    accepted: false,
    blurred_faces_count: 0,
    blurred_plates_count: 0,
  };
}

export async function saveVideoMetadata(
  analysisId: string,
  payload: Partial<VideoMetadata>,
): Promise<VideoMetadata> {
  const current = await fetchVideoMetadata(analysisId);
  const merged: VideoMetadata = {
    ...current,
    ...payload,
    original_filename: payload.original_filename ?? current.original_filename ?? 'video_rekaman_toko.mp4',
    duration_s: payload.duration_s ?? current.duration_s ?? 48,
    cashier_at_s: payload.cashier_at_s ?? current.cashier_at_s ?? 48,
  };

  const remote = await tryApiFetch<VideoMetadata>(`/analyses/${analysisId}/video`, {
    method: 'PUT',
    body: JSON.stringify(merged),
  });
  const saved = remote ?? merged;
  setLocalVideo(analysisId, saved);
  return saved;
}

export async function uploadVideoToSupabaseStorage(
  analysisId: string,
  file: File,
): Promise<{ storageKey: string; publicUrl: string | null }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'video_rekaman_toko.mp4';
  const storageKey = `${analysisId}/${Date.now()}_${safeName}`;
  const lowerName = file.name.toLowerCase();
  const contentType = lowerName.endsWith('.mov')
    ? 'video/quicktime'
    : lowerName.endsWith('.webm')
      ? 'video/webm'
      : file.type && file.type.startsWith('video/')
        ? file.type
        : 'video/mp4';

  if (typeof window !== 'undefined') {
    try {
      const supabase = createClient();
      const { error } = await supabase.storage.from('videos').upload(storageKey, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });
      if (!error) {
        const { data } = supabase.storage.from('videos').getPublicUrl(storageKey);
        return { storageKey, publicUrl: data.publicUrl };
      }
    } catch {
      // Fallback ke penyimpanan lokal bila tidak ada jaringan
    }
  }
  return { storageKey, publicUrl: null };
}

export async function uploadKeyframesToStorage(
  analysisId: string,
  dataUrls: string[],
): Promise<string[]> {
  if (!dataUrls.length || typeof window === 'undefined') return dataUrls;
  const uploadedUrls: string[] = [];
  const supabase = createClient();

  const versionTag = Date.now();
  for (let i = 0; i < dataUrls.length; i += 1) {
    const dataUrl = dataUrls[i]!;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const key = `${analysisId}/frames/${versionTag}_frame_${String(i + 1).padStart(2, '0')}.jpg`;
      const { error } = await supabase.storage.from('videos').upload(key, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (!error) {
        const { data } = supabase.storage.from('videos').getPublicUrl(key);
        uploadedUrls.push(data.publicUrl);
      } else {
        uploadedUrls.push(dataUrl);
      }
    } catch {
      uploadedUrls.push(dataUrl);
    }
  }
  return uploadedUrls;
}

export async function completeVideoUpload(
  analysisId: string,
  payload: Partial<VideoMetadata> & { cashier_at_s: number },
): Promise<VideoMetadata> {
  const saved = await saveVideoMetadata(analysisId, payload);
  const authHeader = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/video/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({
      cashier_at_s: payload.cashier_at_s,
      storage_key: saved.storage_key,
      original_filename: saved.original_filename,
      duration_s: saved.duration_s,
      width: saved.width,
      height: saved.height,
      blurred_faces_count: saved.blurred_faces_count,
      blurred_plates_count: saved.blurred_plates_count,
      frame_keys: payload.frame_keys,
      frame_timestamps_s: payload.frame_timestamps_s,
    }),
  });
  if (!res.ok) {
    let detail = `Gagal memproses video (HTTP ${res.status}).`;
    try {
      const errBody = (await res.json()) as { detail?: string };
      if (errBody?.detail) detail = errBody.detail;
    } catch {
      // ignore non-JSON body
    }
    throw new Error(detail);
  }
  return saved;
}

/* ---------------- Transcript Segments CRUD (F3 & F4) ---------------- */

function getLocalTranscriptMap(): Record<string, TranscriptSegment[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_TRS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TranscriptSegment[]>) : {};
  } catch {
    return {};
  }
}

function setLocalTranscript(analysisId: string, segments: TranscriptSegment[]) {
  if (typeof window === 'undefined') return;
  const map = getLocalTranscriptMap();
  map[analysisId] = segments;
  window.localStorage.setItem(STORAGE_TRS_KEY, JSON.stringify(map));
  notifyCrudChanged();
}

export async function fetchTranscriptSegments(analysisId?: string | null): Promise<TranscriptSegment[]> {
  const id = analysisId || 'selasar-kopi';
  const remote = await tryApiFetch<TranscriptSegment[]>(`/analyses/${id}/transcript`);
  if (remote !== null) {
    setLocalTranscript(id, remote);
    return remote;
  }
  const local = getLocalTranscriptMap()[id];
  if (local && local.length > 0) return local;
  return id === 'selasar-kopi' ? MOCK_TRANSCRIPT : [];
}

export async function createTranscriptSegment(
  analysisId: string,
  payload: {
    timestamp_start: number;
    timestamp_end: number;
    vantage: TranscriptSegment['vantage'];
    narrative: string;
    not_visible?: string;
    confidence?: TranscriptSegment['confidence'];
    is_confirmed_by_owner?: boolean;
  },
): Promise<TranscriptSegment> {
  const remote = await tryApiFetch<TranscriptSegment>(`/analyses/${analysisId}/transcript/segments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const current = await fetchTranscriptSegments(analysisId);
  if (remote) {
    const next = [...current.filter((s) => s.id !== remote.id), remote].sort(
      (a, b) => a.timestamp_start - b.timestamp_start,
    );
    setLocalTranscript(analysisId, next);
    return remote;
  }

  const created: TranscriptSegment = {
    id: `seg_${Date.now()}`,
    timestamp_start: payload.timestamp_start,
    timestamp_end: Math.max(payload.timestamp_end, payload.timestamp_start + 1),
    frame_keys: ['frame_manual.jpg'],
    vantage: payload.vantage,
    narrative: payload.narrative.trim(),
    not_visible: payload.not_visible?.trim() ?? '',
    confidence: payload.confidence ?? 'stabil',
    is_confirmed_by_owner: payload.is_confirmed_by_owner ?? true,
  };
  const next = [...current, created].sort((a, b) => a.timestamp_start - b.timestamp_start);
  setLocalTranscript(analysisId, next);
  return created;
}

export async function updateTranscriptSegment(
  analysisId: string,
  segmentId: string,
  patch: Partial<TranscriptSegment>,
): Promise<TranscriptSegment | null> {
  const remote = await tryApiFetch<TranscriptSegment>(
    `/analyses/${analysisId}/transcript/segments/${segmentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  const current = await fetchTranscriptSegments(analysisId);
  if (remote) {
    const next = current.map((s) => (s.id === segmentId ? remote : s));
    setLocalTranscript(analysisId, next);
    return remote;
  }

  const target = current.find((s) => s.id === segmentId);
  if (!target) return null;
  const updated: TranscriptSegment = { ...target, ...patch };
  setLocalTranscript(
    analysisId,
    current.map((s) => (s.id === segmentId ? updated : s)),
  );
  return updated;
}

export async function deleteTranscriptSegment(analysisId: string, segmentId: string): Promise<void> {
  await tryApiFetch<void>(`/analyses/${analysisId}/transcript/segments/${segmentId}`, {
    method: 'DELETE',
  });
  const current = await fetchTranscriptSegments(analysisId);
  setLocalTranscript(
    analysisId,
    current.filter((s) => s.id !== segmentId),
  );
}

/* ---------------- Dashboard, Agent Decisions, What-If & Measurement Plan (F5, F6, F7) ---------------- */

export class SimulationRequiredError extends Error {
  readonly code = 'SIMULATION_REQUIRED';
  constructor() {
    super('SIMULATION_REQUIRED');
    this.name = 'SimulationRequiredError';
  }
}

export async function fetchDashboardData(analysisId?: string | null): Promise<DashboardData> {
  const id = analysisId || 'selasar-kopi';
  const authHeader = await getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/analyses/${id}/dashboard?require_existing=true`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    });
    if (res.status === 409) {
      throw new SimulationRequiredError();
    }
    if (res.ok) {
      return (await res.json()) as DashboardData;
    }
  } catch (err) {
    if (err instanceof SimulationRequiredError) throw err;
  }

  if (id === 'selasar-kopi') {
    return MOCK_DASHBOARD;
  }
  throw new Error('Gagal memuat data dasbor dari server.');
}

function formatApiErrorDetail(errBody: unknown, fallback: string): string {
  if (!errBody || typeof errBody !== 'object') return fallback;
  const detail = (errBody as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => (item && typeof item === 'object' && 'msg' in item ? String((item as { msg: unknown }).msg) : ''))
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join('; ');
  }
  return fallback;
}

export async function runWhatIfProjection(
  analysisId: string,
  checkedRecommendationIds: string[],
  mode: 'estimasi_cepat' | 'terverifikasi_simulasi' = 'estimasi_cepat',
): Promise<WhatIfProjectionData> {
  const authHeader = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/dashboard/what-if`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({ checked_recommendation_ids: checkedRecommendationIds, mode }),
  });
  if (!res.ok) {
    let detail = `Gagal menghitung proyeksi simulasi (HTTP ${res.status}).`;
    try {
      detail = formatApiErrorDetail(await res.json(), detail);
    } catch {
      // ignore non-JSON body
    }
    throw new Error(detail);
  }
  return (await res.json()) as WhatIfProjectionData;
}

export async function fetchAgentDecisions(analysisId?: string | null): Promise<AgentDecision[]> {
  const id = analysisId || 'selasar-kopi';
  const remote = await tryApiFetch<AgentDecision[]>(`/analyses/${id}/simulation/agents`);
  if (remote !== null) return remote;
  return id === 'selasar-kopi' ? MOCK_AGENTS : [];
}

export async function triggerSimulationRun(analysisId?: string | null): Promise<void> {
  const id = analysisId || 'selasar-kopi';
  const authHeader = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/analyses/${id}/simulation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({ n_agents: 20, seed: 42 }),
  });
  if (!res.ok) {
    let detail = `Gagal menjalankan simulasi agen (HTTP ${res.status}).`;
    try {
      detail = formatApiErrorDetail(await res.json(), detail);
    } catch {
      // ignore non-JSON body
    }
    throw new Error(detail);
  }
  await updateAnalysis(id, { status: 'ready', stale: false });
}

export async function fetchMeasurementPlan(analysisId?: string | null): Promise<MeasurementPlanData | null> {
  const id = analysisId || 'selasar-kopi';
  return await tryApiFetch<MeasurementPlanData>(`/analyses/${id}/measurement-plan`);
}

export async function cloneAnalysisWithTranscript(
  sourceAnalysisId: string,
  name?: string,
): Promise<Analysis> {
  const authHeader = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/analyses/${encodeURIComponent(sourceAnalysisId)}/clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify(name ? { name } : {}),
  });
  if (!res.ok) {
    let detail = `Gagal menyalin analisis dengan transkrip (HTTP ${res.status}).`;
    try {
      const errBody = (await res.json()) as { detail?: string };
      if (errBody?.detail) detail = errBody.detail;
    } catch {
      // ignore non-JSON body
    }
    throw new Error(detail);
  }
  const cloned = (await res.json()) as Analysis;
  const list = getLocalAnalyses();
  setLocalAnalyses([cloned, ...list.filter((a) => a.id !== cloned.id)]);
  return cloned;
}

/* ---------------- Visual Twin 3D (F7, mode lokal PRD 11.2) ---------------- */

export interface TwinBuildJob {
  id: string;
  status: 'antre' | 'berjalan' | 'selesai' | 'gagal';
  /** 0 = antre, 1..stage_count-1 = tahap yang sedang berjalan. */
  stage: number;
  stage_count: number;
  stage_label: string;
  progress: number;
  message: string | null;
}

export interface TwinBuildAssets {
  mode: 'splat' | 'pointcloud' | 'path_2d' | 'frame_strip';
  splat_url: string | null;
  ply_url: string | null;
  registered_frames: number;
  total_frames: number;
  points_count: number;
  quality_label: string;
  path_duration_seconds: number;
  diagnosis_summary: string | null;
}

export interface TwinBuild {
  job: TwinBuildJob | null;
  assets: TwinBuildAssets | null;
}

/** Job Visual Twin terbaru + aset 3D bila sudah jadi. `null` bila backend tidak terjangkau. */
export async function fetchTwin(analysisId: string): Promise<TwinBuild | null> {
  return tryApiFetch<TwinBuild>(`/analyses/${encodeURIComponent(analysisId)}/twin`, { cache: 'no-store' });
}

/**
 * Kirim salinan video terburam ke backend agar job Visual Twin lokal bisa membacanya.
 * Mengembalikan false bila backend menolak atau tidak terjangkau (job lalu mengunduh dari Storage).
 */
export async function uploadVideoFileToBackend(analysisId: string, file: File): Promise<boolean> {
  try {
    const form = new FormData();
    form.append('file', file, file.name);
    const res = await fetch(`${API_BASE}/analyses/${encodeURIComponent(analysisId)}/video/file`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: form,
    });
    return res.ok;
  } catch {
    return false;
  }
}