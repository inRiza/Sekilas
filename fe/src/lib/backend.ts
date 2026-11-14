/**
 * Klien API backend Sekilas (FastAPI, PRD 4.4). Dipakai alur demo Visual Twin:
 * bisnis -> analisis -> unggah video -> job 3D -> dasbor.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export type NextAction = { route: string; label: string };
export type AnalysisStatus = 'draft' | 'konteks' | 'video' | 'memproses' | 'verifikasi' | 'simulasi' | 'siap';

export type AnalysisSummary = {
  id: string;
  business_id: string;
  name: string;
  status: AnalysisStatus;
  stale: boolean;
  is_demo: boolean;
  quality_label: string | null;
  created_at: string;
  next_action: NextAction;
};

export type AnalysisDetail = AnalysisSummary & {
  context: Record<string, unknown>;
  video_filename: string | null;
  video_duration_s: number | null;
  cashier_at_s: number | null;
};

export type BusinessSummary = {
  id: string;
  name: string;
  branch_name: string;
  category: 'warung' | 'kedai' | 'kafe' | 'resto_ruko';
  address: string;
  analysis_count: number;
  primary_analysis: AnalysisSummary | null;
  next_action: NextAction;
  created_at: string;
};

export type Job = {
  id: string;
  kind: string;
  status: 'antre' | 'berjalan' | 'selesai' | 'gagal';
  stage: number;
  stage_count: number;
  stage_label: string;
  progress: number;
  message: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type TwinAssets = {
  splat_url: string | null;
  ply_url: string | null;
  path_url: string | null;
  frames: number;
  registered: number;
  points: number;
  build_seconds: number;
  quality_label: string;
  diagnosis_summary: string | null;
};

export type Twin = { job: Job | null; assets: TwinAssets | null };
export type VideoUpload = { filename: string; duration_s: number | null; width: number | null; height: number | null };

/** Galat API dengan kode (PRD 4.4.6), misal `video_missing`, `demo_read_only`. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init });
  } catch {
    throw new ApiError(0, 'backend_unreachable', 'Server Sekilas belum berjalan. Jalankan backend lalu coba lagi.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.detail;
    throw new ApiError(
      res.status,
      detail?.code ?? 'error',
      detail?.message ?? (typeof detail === 'string' ? detail : 'Terjadi kesalahan.'),
    );
  }
  return body as T;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const backend = {
  listBusinesses: () => request<BusinessSummary[]>('/businesses'),
  createBusiness: (body: { name: string; branch_name: string; category: string; address: string }) =>
    request<BusinessSummary>('/businesses', json(body)),
  listAnalyses: (bid: string) => request<AnalysisSummary[]>(`/businesses/${bid}/analyses`),
  createAnalysis: (bid: string, name?: string) => request<AnalysisDetail>(`/businesses/${bid}/analyses`, json({ name })),
  getAnalysis: (aid: string) => request<AnalysisDetail>(`/analyses/${aid}`),
  saveContext: (aid: string, context: Record<string, unknown>) =>
    request<AnalysisDetail>(`/analyses/${aid}/context`, { ...json(context), method: 'PUT' }),
  completeVideo: (aid: string, cashierAtS: number, idempotencyKey: string) =>
    request<Job>(`/analyses/${aid}/video/complete`, {
      ...json({ cashier_at_s: cashierAtS }),
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    }),
  getTwin: (aid: string) => request<Twin>(`/analyses/${aid}/twin`),

  /** Unggah video dengan progres (XHR, karena fetch belum punya progres unggah). */
  uploadVideo(aid: string, file: File, onProgress: (fraction: number) => void): Promise<VideoUpload> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/analyses/${aid}/video`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => {
        const body = (() => {
          try {
            return JSON.parse(xhr.responseText);
          } catch {
            return null;
          }
        })();
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as VideoUpload);
        else reject(new ApiError(xhr.status, body?.detail?.code ?? 'error', body?.detail?.message ?? 'Unggah gagal.'));
      };
      xhr.onerror = () => reject(new ApiError(0, 'backend_unreachable', 'Server Sekilas belum berjalan.'));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
  },
};
