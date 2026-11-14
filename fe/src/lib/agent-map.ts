import type { AgentDecision, FinalDecision, TranscriptSegment } from '@/types/api';

/**
 * Peta agen ke jalur rekaman (PRD 4.3, keputusan 8): keputusan agen -> segmen transkrip -> detik video.
 * Detik itu lalu diterjemahkan ke posisi 3D oleh viewer lewat jalur kamera (path.json).
 *
 * Agen tidak melihat ruang; ia membaca segmen berurutan. Posisi di 3D adalah posisi kamera saat
 * segmen itu direkam, jadi ketelitiannya per segmen.
 */

export const DECISION_LABEL: Record<FinalDecision, string> = {
  lewat: 'Lewat',
  berhenti_lalu_pergi: 'Berhenti lalu pergi',
  masuk_tanpa_memesan: 'Masuk tanpa memesan',
  memesan: 'Memesan',
};

/** Warna sama dengan token desain (globals.css) agar 3D dan badge konsisten. */
export const DECISION_COLOR: Record<FinalDecision, string> = {
  lewat: '#a3a3a3',
  berhenti_lalu_pergi: '#c2453a',
  masuk_tanpa_memesan: '#3466e5',
  memesan: '#1f8a5b',
};

export const DECISION_ORDER: FinalDecision[] = ['lewat', 'berhenti_lalu_pergi', 'masuk_tanpa_memesan', 'memesan'];

export interface MapSegment {
  id: string;
  index: number;
  start: number;
  end: number;
  vantage: TranscriptSegment['vantage'];
}

export interface AgentTrace {
  index: number;
  monologue: string;
  action: 'lanjut' | 'berhenti';
}

export interface AgentJourney {
  agentId: number;
  decision: FinalDecision;
  /** Segmen tempat agen berhenti; agen yang memesan berakhir di segmen terakhir (kasir). */
  stopIndex: number;
  /** Detik video saat keputusan diambil (akhir segmen berhenti). */
  stopTime: number;
  traces: AgentTrace[];
  factorIndexes: number[];
  personaLabel: string;
  decidingFactor: string;
}

export interface AgentMap {
  segments: MapSegment[];
  journeys: AgentJourney[];
}

export interface SegmentStops {
  index: number;
  total: number;
  byDecision: Record<FinalDecision, number>;
  agentIds: number[];
}

export function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function humanize(raw: string): string {
  const text = raw.replace(/_/g, ' ').trim();
  return text ? text[0]!.toUpperCase() + text.slice(1) : 'Calon pembeli';
}

/** Gabungkan keputusan agen dan segmen transkrip. `null` bila salah satunya kosong. */
export function buildAgentMap(decisions: AgentDecision[], transcript: TranscriptSegment[]): AgentMap | null {
  if (!decisions.length || !transcript.length) return null;
  const segments: MapSegment[] = [...transcript]
    .sort((a, b) => a.timestamp_start - b.timestamp_start)
    .map((s, index) => ({ id: s.id, index, start: s.timestamp_start, end: s.timestamp_end, vantage: s.vantage }));
  const indexOf = new Map(segments.map((s) => [s.id, s.index]));
  const last = segments.length - 1;

  const journeys = [...decisions]
    .sort((a, b) => a.agent_id - b.agent_id)
    .map((d): AgentJourney => {
      const traces = (d.segment_traces ?? [])
        .map((t) => ({ index: indexOf.get(t.segment_id) ?? -1, monologue: t.monologue, action: t.action }))
        .filter((t) => t.index >= 0)
        .sort((a, b) => a.index - b.index);
      const stopped = d.stopped_at_segment_id ? indexOf.get(d.stopped_at_segment_id) : undefined;
      const stopIndex =
        d.final_decision === 'memesan' ? last : (stopped ?? traces[traces.length - 1]?.index ?? last);
      return {
        agentId: d.agent_id,
        decision: d.final_decision,
        stopIndex,
        stopTime: segments[stopIndex]!.end,
        traces,
        factorIndexes: d.factor_segment_ids.map((id) => indexOf.get(id)).filter((i): i is number => i !== undefined),
        personaLabel: humanize(d.persona?.segment ?? ''),
        decidingFactor: d.deciding_factor,
      };
    });
  return { segments, journeys };
}

/** Jumlah agen yang berhenti di tiap segmen (hanya segmen yang punya agen berhenti). */
export function stopsBySegment(journeys: AgentJourney[]): SegmentStops[] {
  const bySeg = new Map<number, SegmentStops>();
  for (const j of journeys) {
    const row =
      bySeg.get(j.stopIndex) ??
      ({
        index: j.stopIndex,
        total: 0,
        byDecision: { lewat: 0, berhenti_lalu_pergi: 0, masuk_tanpa_memesan: 0, memesan: 0 },
        agentIds: [],
      } satisfies SegmentStops);
    row.total += 1;
    row.byDecision[j.decision] += 1;
    row.agentIds.push(j.agentId);
    bySeg.set(j.stopIndex, row);
  }
  return [...bySeg.values()].sort((a, b) => a.index - b.index);
}

/** Agen yang masih "berjalan" selama segmen `index` (belum berhenti sebelum segmen itu). */
export function remainingAt(journeys: AgentJourney[], index: number): number {
  return journeys.filter((j) => j.stopIndex >= index).length;
}

/** Segmen tempat agen terbanyak berhenti tanpa memesan (titik bocor terbesar). */
export function biggestLeak(journeys: AgentJourney[]): SegmentStops | null {
  const leaks = stopsBySegment(journeys.filter((j) => j.decision !== 'memesan'));
  return leaks.reduce<SegmentStops | null>((best, s) => (!best || s.total > best.total ? s : best), null);
}
