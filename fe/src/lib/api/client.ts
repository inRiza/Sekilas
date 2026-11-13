/**
 * API Client Facade untuk Sekilas Frontend
 * 
 * Lapisan ini mengisolasi pemanggilan backend.
 * Saat NEXT_PUBLIC_USE_MOCK = true (default), fungsi mengembalikan mock data lokal.
 * Saat backend FastAPI siap, kita cukup menghubungkan panggilan fetch() di file ini.
 */

import {
  Analysis,
  BusinessContext,
  DashboardData,
  TranscriptSegment,
  AgentDecision,
  MeasurementPlanData,
} from '@/types/api';

import { MOCK_ANALYSES } from '@/lib/mock/analyses';
import { MOCK_CONTEXT } from '@/lib/mock/context';
import { MOCK_TRANSCRIPT } from '@/lib/mock/transcript';
import { MOCK_DASHBOARD } from '@/lib/mock/dashboard';
import { MOCK_AGENTS } from '@/lib/mock/agents';
import { MOCK_MEASUREMENT_PLAN } from '@/lib/mock/measurement-plan';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';
const SIMULATED_LATENCY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const api = {
  // 1. Analisis & Proyek
  async listAnalyses(): Promise<Analysis[]> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return [...MOCK_ANALYSES];
    }
    const res = await fetch('/api/analyses');
    return res.json();
  },

  async getAnalysis(id: string): Promise<Analysis | null> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return MOCK_ANALYSES.find((a) => a.id === id) ?? MOCK_ANALYSES[0];
    }
    const res = await fetch(`/api/analyses/${id}`);
    return res.json();
  },

  // 2. F1 Konteks Usaha
  async getContext(analysisId: string): Promise<BusinessContext> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return { ...MOCK_CONTEXT };
    }
    const res = await fetch(`/api/analyses/${analysisId}/context`);
    return res.json();
  },

  async saveContext(analysisId: string, context: BusinessContext): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return { success: true };
    }
    const res = await fetch(`/api/analyses/${analysisId}/context`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    return res.json();
  },

  // 3. F3 & F4 Transkrip VLM
  async getTranscript(analysisId: string): Promise<TranscriptSegment[]> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return [...MOCK_TRANSCRIPT];
    }
    const res = await fetch(`/api/analyses/${analysisId}/transcript`);
    return res.json();
  },

  async verifySegment(
    analysisId: string,
    segmentId: string,
    action: 'confirm' | 'delete' | 'edit',
    updatedNarrative?: string
  ): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      await sleep(150);
      return { success: true };
    }
    const res = await fetch(`/api/analyses/${analysisId}/transcript/${segmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, narrative: updatedNarrative }),
    });
    return res.json();
  },

  // 4. F6 Dasbor Analitik
  async getDashboard(analysisId: string): Promise<DashboardData> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return { ...MOCK_DASHBOARD, analysis_id: analysisId };
    }
    const res = await fetch(`/api/analyses/${analysisId}/dashboard`);
    return res.json();
  },

  // 5. F5 & Halaman 8 Jelajah Agen
  async getAgents(analysisId: string): Promise<AgentDecision[]> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return [...MOCK_AGENTS];
    }
    const res = await fetch(`/api/analyses/${analysisId}/agents`);
    return res.json();
  },

  async getAgentDetail(analysisId: string, agentId: number): Promise<AgentDecision | null> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return MOCK_AGENTS.find((a) => a.agent_id === agentId) ?? MOCK_AGENTS[0];
    }
    const res = await fetch(`/api/analyses/${analysisId}/agents/${agentId}`);
    return res.json();
  },

  // 6. F6-G Rencana Pengukuran
  async getMeasurementPlan(analysisId: string): Promise<MeasurementPlanData> {
    if (USE_MOCK) {
      await sleep(SIMULATED_LATENCY_MS);
      return { ...MOCK_MEASUREMENT_PLAN, analysis_id: analysisId };
    }
    const res = await fetch(`/api/analyses/${analysisId}/measurement-plan`);
    return res.json();
  },
};
