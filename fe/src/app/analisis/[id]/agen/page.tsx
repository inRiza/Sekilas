'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { MOCK_AGENTS } from '@/lib/mock/agents';
import { FinalDecision } from '@/types/api';

function AgenExplorerInner() {
  const params = useParams();
  const analysisId = (params?.id as string) || 'selasar-kopi';

  const [decisionFilter, setDecisionFilter] = useState<'all' | FinalDecision>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<number>(MOCK_AGENTS[0].agent_id);

  const filteredAgents = useMemo(() => {
    return MOCK_AGENTS.filter((ag) => {
      if (decisionFilter !== 'all' && ag.final_decision !== decisionFilter) return false;
      if (segmentFilter !== 'all' && ag.persona.segment !== segmentFilter) return false;
      return true;
    });
  }, [decisionFilter, segmentFilter]);

  const activeAgent = MOCK_AGENTS.find((a) => a.agent_id === selectedAgentId) || MOCK_AGENTS[0];

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="analysis" analysisId={analysisId} />

      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-hairline">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
              Jelajah 500 Monolog & Keputusan Agen
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-0.5">
              Setiap agen memiliki latar belakang demografi, anggaran uang makan, dan batas waktu istirahat yang realistis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-primary-40 bg-primary-10 px-3 py-1 rounded-full font-semibold border border-primary-20">
              {filteredAgents.length} dari {MOCK_AGENTS.length} Sampel Agen
            </span>
          </div>
        </div>

        {/* Filter Bar Kapsul */}
        <Card className="flex flex-wrap items-center justify-between gap-4 py-3">
          {/* Filter Keputusan */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted font-medium mr-1">Keputusan:</span>
            {[
              ['all', 'Semua'],
              ['lewat', 'Lewat Saja'],
              ['berhenti_lalu_pergi', 'Berhenti lalu Pergi'],
              ['masuk_tanpa_memesan', 'Masuk tanpa Pesan'],
              ['memesan', 'Memesan'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDecisionFilter(val as any)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                  decisionFilter === val
                    ? 'bg-primary-40 text-white shadow-xs'
                    : 'bg-bg text-ink-soft hover:bg-hairline'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filter Segmen */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted font-medium mr-1">Segmen:</span>
            {['all', 'mahasiswa', 'pekerja_kantor', 'pengendara', 'warga_sekitar'].map((seg) => (
              <button
                key={seg}
                onClick={() => setSegmentFilter(seg)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition cursor-pointer ${
                  segmentFilter === seg
                    ? 'bg-ink text-white shadow-xs'
                    : 'bg-bg text-ink-soft hover:bg-hairline'
                }`}
              >
                {seg === 'all' ? 'Semua Segmen' : seg.replace('_', ' ')}
              </button>
            ))}
          </div>
        </Card>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: List Kartu Agen (5 Kolom) */}
          <div className="lg:col-span-5 space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredAgents.map((ag) => {
              const isSelected = ag.agent_id === selectedAgentId;
              const isOrder = ag.final_decision === 'memesan';
              const isDropTangga = ag.final_decision === 'berhenti_lalu_pergi';

              return (
                <Card
                  key={ag.agent_id}
                  onClick={() => setSelectedAgentId(ag.agent_id)}
                  className={`cursor-pointer transition-all p-4 ${
                    isSelected ? 'ring-2 ring-primary-40/30 border-primary-40' : 'hover:border-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-ink">
                      Agen #{ag.agent_id}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        isOrder
                          ? 'bg-impact-10 text-impact'
                          : isDropTangga
                          ? 'bg-friction-10 text-friction'
                          : 'bg-bg text-muted'
                      }`}
                    >
                      {ag.final_decision.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-ink-soft capitalize">
                    {ag.persona.segment.replace('_', ' ')} · Anggaran Rp {ag.persona.concrete_facts.meal_budget.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-muted mt-2 line-clamp-2 leading-relaxed italic">
                    "{ag.monologue}"
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Kolom Kanan: Detail PersonaSpec & Monolog Penuh (7 Kolom) */}
          <div className="lg:col-span-7 space-y-5">
            <Card>
              <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Detail Spesifikasi Agen #{activeAgent.agent_id}
                  </h2>
                  <p className="text-xs text-muted">
                    Dihasilkan deterministik oleh Model Persona Diskret (Seed: {activeAgent.persona.seed})
                  </p>
                </div>
                <Badge
                  variant={activeAgent.final_decision === 'memesan' ? 'impact' : 'friction'}
                  size="md"
                >
                  {activeAgent.final_decision.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Data Konkret Persona */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-panel p-3.5 border border-hairline text-xs mb-5">
                <div>
                  <span className="text-[10px] font-mono uppercase text-subtle block">Segmen</span>
                  <span className="font-semibold text-ink capitalize mt-0.5 block">
                    {activeAgent.persona.segment.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-subtle block">Uang Makan</span>
                  <span className="font-semibold text-ink font-mono mt-0.5 block">
                    Rp {activeAgent.persona.concrete_facts.meal_budget.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-subtle block">Waktu Istirahat</span>
                  <span className="font-semibold text-ink font-mono mt-0.5 block">
                    {activeAgent.persona.concrete_facts.break_time_minutes} Menit
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-subtle block">Familiaritas</span>
                  <span className="font-semibold text-ink capitalize mt-0.5 block">
                    {activeAgent.persona.discrete_traits.area_familiarity.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Monolog Lengkap */}
              <div>
                <h3 className="text-xs font-semibold text-ink-soft uppercase font-mono tracking-wider mb-2">
                  Monolog Internal Saat Melihat Toko:
                </h3>
                <div className="rounded-xl border border-primary-20 bg-primary-10/40 p-4 text-xs text-ink leading-relaxed italic">
                  "{activeAgent.monologue}"
                </div>
              </div>

              {/* Alasan Utama Mengambil Keputusan */}
              <div className="mt-5 pt-4 border-t border-hairline">
                <h3 className="text-xs font-semibold text-ink-soft uppercase font-mono tracking-wider mb-1">
                  Faktor Penentu ({activeAgent.final_decision.replace(/_/g, ' ')}):
                </h3>
                <p className="text-xs text-ink leading-relaxed">
                  {activeAgent.deciding_factor}
                </p>
                <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-subtle">
                  <span>Skor Keraguan: <strong className="text-ink">{activeAgent.hesitation_score} / 5</strong></span>
                  <span>·</span>
                  <span>Segmen Berhenti: <strong className="text-primary-40">{activeAgent.stopped_at_segment_id ?? 'Sampai Kasir'}</strong></span>
                </div>
              </div>
            </Card>
          </div>
        </div>
        </div>
      </main>

      <footer className="border-t border-hairline py-6 text-center text-xs text-subtle">
        <div className="col">
          Sekilas © 2026 · Simulator Calon Pelanggan untuk UMKM Makanan
        </div>
      </footer>
    </div>
  );
}

export default function AgenExplorerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AgenExplorerInner />
    </Suspense>
  );
}
