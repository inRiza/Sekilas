'use client';

import { Eye, Pause, Play, SkipForward, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  DECISION_COLOR,
  DECISION_LABEL,
  DECISION_ORDER,
  mmss,
  stopsBySegment,
  type AgentMap,
} from '@/lib/agent-map';

import type { AgentOverlay } from './twin-scene';

const VANTAGE_LABEL = { jalan: 'Dari jalan', pintu: 'Di pintu atau tangga', dalam: 'Di dalam' } as const;
/** Detik video per detik nyata saat agen berjalan. */
const RATES = [5, 10] as const;

/**
 * Status lapisan agen di Visual Twin. Bawaan: semua titik berhenti tampil sekaligus.
 * Putar ulang: agen berjalan satu per satu, titiknya baru muncul setelah ia memutuskan.
 */
export function useAgentReplay(map: AgentMap | null, focusAgentId: number | null = null) {
  const journeys = useMemo(() => map?.journeys ?? [], [map]);
  const [replaying, setReplaying] = useState(false);
  /** Mode satu agen (dari Jelajah Agen): hanya agen ini yang berjalan, lalu titiknya dibuka. */
  const [only, setOnly] = useState<number | null>(null);
  const [focusHandled, setFocusHandled] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const [rate, setRate] = useState<(typeof RATES)[number]>(RATES[0]);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);

  const current = replaying ? (journeys[index] ?? null) : null;
  const finished = replaying && index >= journeys.length;

  // Pembaruan saat render (pola React untuk menyesuaikan state dari props): mulai mode satu
  // agen begitu data agen tersedia.
  if (map && focusAgentId !== null && focusHandled !== focusAgentId) {
    const at = journeys.findIndex((j) => j.agentId === focusAgentId);
    setFocusHandled(focusAgentId);
    if (at >= 0) {
      setReplaying(true);
      setOnly(at);
      setIndex(at);
      setStep(0);
      setPlaying(true);
      setSelectedStop(null);
      setRun((r) => r + 1);
    }
  }

  const start = useCallback(() => {
    setOnly(null);
    setReplaying(true);
    setIndex(0);
    setStep(0);
    setPlaying(true);
    setSelectedStop(null);
    setRun((r) => r + 1);
  }, []);
  const next = useCallback(() => {
    if (only !== null) {
      // Satu agen selesai: tampilkan semua titik dan buka titik tempat agen ini memutuskan.
      setSelectedStop(journeys[only]?.stopIndex ?? null);
      setOnly(null);
      setReplaying(false);
      return;
    }
    setIndex((i) => i + 1);
    setStep(0);
  }, [journeys, only]);
  const showAll = useCallback(() => {
    setOnly(null);
    setReplaying(false);
  }, []);

  const overlay: AgentOverlay | null = map
    ? {
        map,
        revealed: replaying ? (only !== null ? [] : journeys.slice(0, index)) : journeys,
        walker: current
          ? { journey: current, key: `${run}-${current.agentId}`, playing, rate }
          : null,
        selectedStop,
        onSelectStop: setSelectedStop,
        onWalkerStep: setStep,
        onWalkerDone: next,
      }
    : null;

  return {
    map,
    only,
    overlay,
    replaying,
    finished,
    current,
    index,
    step,
    playing,
    rate,
    selectedStop,
    start,
    next,
    showAll,
    setPlaying,
    setSelectedStop,
    toggleRate: () => setRate((r) => (r === RATES[0] ? RATES[1] : RATES[0])),
  };
}

export type AgentReplay = ReturnType<typeof useAgentReplay>;

function Legend() {
  return (
    <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted md:flex">
      {DECISION_ORDER.map((d) => (
        <span key={d} className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ background: DECISION_COLOR[d] }} />
          {DECISION_LABEL[d]}
        </span>
      ))}
    </div>
  );
}

/** Bilah bawah kanvas: mulai putar ulang, jeda, lewati, kecepatan, tampilkan semua. */
export function AgentReplayBar({ replay }: { replay: AgentReplay }) {
  const total = replay.map?.journeys.length ?? 0;
  if (!replay.map) return null;
  return (
    <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 rounded-md bg-white/90 px-3 py-2 shadow-[0_1px_3px_rgba(16,24,40,0.08)] backdrop-blur">
      {!replay.replaying || replay.finished ? (
        <>
          <button
            type="button"
            onClick={replay.start}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-40 px-3 text-[13px] font-medium text-white transition-colors hover:bg-primary-50"
          >
            <Play size={14} /> {replay.finished ? 'Putar ulang' : 'Putar agen satu per satu'}
          </button>
          {replay.finished && (
            <button
              type="button"
              onClick={replay.showAll}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted hover:bg-hover hover:text-ink"
            >
              Selesai
            </button>
          )}
          <span className="text-[12px] text-muted">{total} agen di jalur rekaman</span>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => replay.setPlaying(!replay.playing)}
            aria-label={replay.playing ? 'Jeda' : 'Lanjutkan'}
            className="grid size-8 place-items-center rounded-md bg-primary-40 text-white transition-colors hover:bg-primary-50"
          >
            {replay.playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            onClick={replay.next}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-soft hover:bg-hover hover:text-ink"
          >
            <SkipForward size={14} /> Agen berikutnya
          </button>
          <button
            type="button"
            onClick={replay.toggleRate}
            className="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] tabular-nums text-ink-soft hover:bg-hover hover:text-ink"
          >
            {replay.rate === 5 ? '1x' : '2x'}
          </button>
          <button
            type="button"
            onClick={replay.showAll}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-soft hover:bg-hover hover:text-ink"
          >
            <Eye size={14} /> Tampilkan semua
          </button>
          <span className="text-[12px] tabular-nums text-muted">
            {replay.only !== null ? `Perjalanan agen ${replay.current?.agentId ?? ''}` : `Agen ${Math.min(replay.index + 1, total)} dari ${total}`}
          </span>
        </>
      )}
      <span className="flex-1" />
      <Legend />
    </div>
  );
}

/** Kartu kiri atas saat putar ulang: siapa agennya, segmen yang sedang dibaca, dan monolognya. */
export function AgentCaption({ replay }: { replay: AgentReplay }) {
  const journey = replay.current;
  const map = replay.map;
  if (!journey || !map) return null;
  const seg = map.segments[replay.step] ?? map.segments[0]!;
  const trace = journey.traces.find((t) => t.index === seg.index);
  const decided = replay.step >= journey.stopIndex;

  return (
    <div className="absolute left-3 top-3 w-[min(360px,calc(100%-24px))] rounded-md bg-white/95 p-3 shadow-[0_1px_3px_rgba(16,24,40,0.1)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[13px] font-medium text-ink">Agen {journey.agentId}</span>
        <Badge>{journey.personaLabel}</Badge>
        <span className="flex-1" />
        <Badge>{`${mmss(seg.start)}–${mmss(seg.end)}`}</Badge>
      </div>
      <p className="mt-1 text-[11px] text-muted">{VANTAGE_LABEL[seg.vantage]}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink">
        {trace ? `“${trace.monologue}”` : 'Membaca segmen ini…'}
      </p>
      {decided && (
        <div className="mt-2.5 rounded-md bg-panel px-2.5 py-2">
          <span
            className="inline-flex items-center gap-1.5 text-[12px] font-medium"
            style={{ color: DECISION_COLOR[journey.decision] }}
          >
            <span className="size-2 rounded-full" style={{ background: DECISION_COLOR[journey.decision] }} />
            {DECISION_LABEL[journey.decision]}
          </span>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{journey.decidingFactor}</p>
        </div>
      )}
    </div>
  );
}

/** Panel kanan: agen yang berhenti di titik terpilih beserta monolognya di segmen itu. */
export function AgentStopPanel({ replay }: { replay: AgentReplay }) {
  const map = replay.map;
  const stopIndex = replay.selectedStop;
  const stop = useMemo(
    () => (map && stopIndex !== null ? stopsBySegment(map.journeys).find((s) => s.index === stopIndex) : undefined),
    [map, stopIndex],
  );
  if (!map || stopIndex === null || !stop) return null;
  const seg = map.segments[stopIndex]!;
  const agents = map.journeys.filter((j) => j.stopIndex === stopIndex);

  return (
    <div className="absolute bottom-16 right-3 top-3 flex w-[min(340px,calc(100%-24px))] flex-col rounded-md bg-white/95 shadow-[0_1px_3px_rgba(16,24,40,0.1)] backdrop-blur">
      <div className="flex items-start gap-2 px-3 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">
            {stop.total} agen mengambil keputusan di {mmss(seg.start)}–{mmss(seg.end)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">{VANTAGE_LABEL[seg.vantage]}. Posisi perkiraan, seteliti satu segmen.</p>
        </div>
        <button
          type="button"
          onClick={() => replay.setSelectedStop(null)}
          aria-label="Tutup"
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 px-3 pb-2">
        {DECISION_ORDER.filter((d) => stop.byDecision[d] > 0).map((d) => (
          <span key={d} className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-0.5 text-[11px] text-ink-soft">
            <span className="size-2 rounded-full" style={{ background: DECISION_COLOR[d] }} />
            {stop.byDecision[d]} {DECISION_LABEL[d].toLowerCase()}
          </span>
        ))}
      </div>
      <ul className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        {agents.map((j) => {
          const trace = j.traces.find((t) => t.index === stopIndex);
          return (
            <li key={j.agentId} className="rounded-md border border-line bg-white p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: DECISION_COLOR[j.decision] }} />
                <span className="text-[12px] font-medium text-ink">Agen {j.agentId}</span>
                <span className="text-[11px] text-muted">{j.personaLabel}</span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                {trace ? `“${trace.monologue}”` : j.decidingFactor}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Cadangan 2D (PRD F7) saat Visual Twin tidak ada: garis waktu video per segmen, tinggi batang =
 * agen yang masih berjalan, angka merah = agen yang berhenti di segmen itu.
 */
export function AgentFlowStrip({ map }: { map: AgentMap }) {
  const total = map.journeys.length;
  const stops = new Map(stopsBySegment(map.journeys).map((s) => [s.index, s]));
  const duration = Math.max(1, map.segments.at(-1)!.end - map.segments[0]!.start);
  return (
    <div className="w-full max-w-2xl text-left">
      <p className="mb-2 text-[12px] text-muted">Tempat agen berhenti di sepanjang video</p>
      <div className="flex h-24 items-end gap-px">
        {map.segments.map((seg) => {
          const remaining = map.journeys.filter((j) => j.stopIndex >= seg.index).length;
          const stop = stops.get(seg.index);
          const leaks = stop ? stop.total - stop.byDecision.memesan : 0;
          return (
            <div
              key={seg.id}
              className="flex h-full flex-col items-center justify-end gap-1"
              style={{ width: `${((seg.end - seg.start) / duration) * 100}%` }}
              title={`${mmss(seg.start)}–${mmss(seg.end)}: ${remaining} agen masih berjalan`}
            >
              {leaks > 0 && <span className="text-[11px] font-medium text-friction">{leaks}</span>}
              <div className="w-full rounded-sm bg-[#d9dce1]" style={{ height: `${(remaining / total) * 70}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-subtle">
        <span>{mmss(map.segments[0]!.start)}</span>
        <span>{mmss(map.segments.at(-1)!.end)}</span>
      </div>
    </div>
  );
}
