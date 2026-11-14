'use client';

import { ChevronDown, Clock, MapPin, Quote, UserRound, Wallet } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/form';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { fetchAgentDecisions } from '@/lib/api/crud';
import { MOCK_AGENTS } from '@/lib/mock/agents';
import type { AgentDecision, FinalDecision } from '@/types/api';

const DECISION: Record<FinalDecision, { label: string; variant: 'impact' | 'friction' | 'neutral' | 'primary' }> = {
  lewat: { label: 'Lewat', variant: 'neutral' },
  berhenti_lalu_pergi: { label: 'Berhenti lalu pergi', variant: 'friction' },
  masuk_tanpa_memesan: { label: 'Masuk tanpa memesan', variant: 'primary' },
  memesan: { label: 'Memesan', variant: 'impact' },
};

const DECISION_FILTERS: Array<['all' | FinalDecision, string]> = [
  ['all', 'Semua'],
  ['lewat', 'Lewat'],
  ['berhenti_lalu_pergi', 'Berhenti lalu pergi'],
  ['masuk_tanpa_memesan', 'Masuk tanpa memesan'],
  ['memesan', 'Memesan'],
];

/** 'pekerja_kantor' -> 'Pekerja kantor' */
function humanize(value: string) {
  const t = value.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Satu agen: ringkas saat tertutup, lengkap (monolog, persona, alasan) saat dibuka. */
function AgentItem({ agent, open, onToggle }: { agent: AgentDecision; open: boolean; onToggle: () => void }) {
  const d = DECISION[agent.final_decision];
  const p = agent.persona;

  return (
    <li className={`rounded-md border transition-colors ${open ? 'border-primary-40/40' : 'border-line hover:border-[#d3d7dd]'}`}>
      {/* Ringkasan (klik untuk buka/tutup) */}
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left sm:p-5">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-soft text-ink-soft">
          <UserRound size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] font-medium text-ink">{humanize(p.segment)}</span>
            <Badge>{`Anggaran Rp ${p.concrete_facts.meal_budget.toLocaleString('id-ID')}`}</Badge>
            <span className="flex-1" />
            <Badge variant={d.variant}>{d.label}</Badge>
          </div>
          {!open && <p className="mt-2 line-clamp-1 text-[13px] italic text-muted">“{agent.monologue}”</p>}
        </div>
        <ChevronDown size={16} className={`mt-2 shrink-0 text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Detail */}
      {open && (
        <div className="space-y-5 px-4 pb-5 sm:px-5 sm:pl-[64px]">
          <div className="flex items-start gap-3 rounded-md bg-primary-10/50 p-4">
            <Quote size={16} className="mt-0.5 shrink-0 text-primary-40" />
            <p className="text-[13px] italic leading-relaxed text-ink">{agent.monologue}</p>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-medium text-muted">Latar calon pelanggan</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge size="md">
                <Wallet size={12} /> {`Uang makan Rp ${p.concrete_facts.meal_budget.toLocaleString('id-ID')}`}
              </Badge>
              <Badge size="md">
                <Clock size={12} /> {`Istirahat ${p.concrete_facts.break_time_minutes} menit`}
              </Badge>
              <Badge size="md">
                <MapPin size={12} /> {humanize(p.discrete_traits.area_familiarity)}
              </Badge>
              <Badge size="md">{humanize(p.discrete_traits.dining_context)}</Badge>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{p.context_around}.</p>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-medium text-muted">Alasan keputusan</p>
            <p className="text-[13px] leading-relaxed text-ink">{agent.deciding_factor}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {agent.attributions?.slice(0, 2).map((attr) => (
                <Badge key={attr.cue_code}>
                  {`${attr.cue_code} (${attr.direction} · ${attr.relevance_score}/3)`}
                </Badge>
              ))}
              <Badge variant="primary">
                {agent.stopped_at_segment_id ? `Berhenti di segmen ${agent.stopped_at_segment_id.replace('seg_', '')}` : 'Sampai kasir'}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function AgenExplorerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('analysisId') || 'selasar-kopi';
  const businessId = searchParams.get('businessId');
  const querySuffix = `?analysisId=${encodeURIComponent(analysisId)}${
    businessId ? `&businessId=${encodeURIComponent(businessId)}` : ''
  }`;

  const [allAgents, setAllAgents] = useState<AgentDecision[]>(
    analysisId === 'selasar-kopi' ? MOCK_AGENTS : [],
  );
  const [decisionFilter, setDecisionFilter] = useState<'all' | FinalDecision>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [openId, setOpenId] = useState<number | null>(
    analysisId === 'selasar-kopi' ? (MOCK_AGENTS[0]?.agent_id ?? null) : null,
  );

  useEffect(() => {
    void fetchAgentDecisions(analysisId).then((list) => {
      if (list.length > 0) {
        setAllAgents(list);
        setOpenId(list[0]?.agent_id ?? null);
      }
    });
  }, [analysisId]);

  const segments = useMemo(() => Array.from(new Set(allAgents.map((a) => a.persona.segment))), [allAgents]);

  const agents = useMemo(
    () =>
      allAgents.filter(
        (a) =>
          (decisionFilter === 'all' || a.final_decision === decisionFilter) &&
          (segmentFilter === 'all' || a.persona.segment === segmentFilter),
      ),
    [allAgents, decisionFilter, segmentFilter],
  );

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          {/* Judul halaman */}
          <div>
            <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Jelajah agen</h1>
            <p className="mt-1 text-[13px] text-muted">
              Baca pikiran tiap calon pelanggan simulasi: siapa dia, apa yang dia lihat, dan kenapa dia memutuskan begitu.
            </p>
          </div>

          <div className="rounded-md border border-line bg-white">
            <div className="space-y-8 p-6 sm:p-10">
              {/* Filter */}
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-medium text-ink">Keputusan</p>
                  <div className="flex flex-wrap gap-2">
                    {DECISION_FILTERS.map(([val, label]) => (
                      <Chip key={val} role="radio" label={label} selected={decisionFilter === val} onClick={() => setDecisionFilter(val)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-medium text-ink">Segmen</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip role="radio" label="Semua" selected={segmentFilter === 'all'} onClick={() => setSegmentFilter('all')} />
                    {segments.map((seg) => (
                      <Chip key={seg} role="radio" label={humanize(seg)} selected={segmentFilter === seg} onClick={() => setSegmentFilter(seg)} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Daftar agen */}
              {agents.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#c9ced6] bg-panel px-6 py-10 text-center">
                  <p className="text-[13px] font-medium text-ink">Tidak ada agen dengan kombinasi filter ini</p>
                  <p className="mt-1 text-[13px] text-muted">Coba ubah pilihan keputusan atau segmen.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {agents.map((a) => (
                    <AgentItem
                      key={a.agent_id}
                      agent={a}
                      open={openId === a.agent_id}
                      onToggle={() => setOpenId((id) => (id === a.agent_id ? null : a.agent_id))}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Kaki container */}
            <div className="flex items-center rounded-b-md bg-panel px-6 py-5 sm:px-10">
              <Button variant="secondary" size="lg" onClick={() => router.push(`/business/analysis${querySuffix}`)} className="!rounded-md">
                <ArrowLeftIcon size={16} /> Kembali ke dasbor
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AgenExplorerPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <AgenExplorerInner />
    </Suspense>
  );
}
