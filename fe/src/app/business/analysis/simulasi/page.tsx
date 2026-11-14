'use client';

import { BarChart3, Check, ListOrdered, LoaderCircle, Route, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useRef, useState } from 'react';

import { SekilasMascot } from '@/components/brand/mascot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';
import { fetchAgentDecisions, triggerSimulationRun } from '@/lib/api/crud';
import { MOCK_AGENTS } from '@/lib/mock/agents';
import type { AgentDecision } from '@/types/api';

/** Jeda antar-langkah animasi (UI simulasi; nanti diganti progres asli dari backend). */
const TICK_MS = 1100;

const STAGES: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Users, title: 'Membentuk persona', description: 'Calon pelanggan dibentuk dari konteks usaha dan lingkungan sekitar.' },
  { icon: Route, title: 'Agen menelusuri jalur', description: 'Setiap agen membaca transkrip berurutan dan memutuskan lanjut atau pergi.' },
  { icon: ListOrdered, title: 'Merangkum alasan', description: 'Alasan agen dipetakan ke katalog masalah lalu diurutkan.' },
  { icon: BarChart3, title: 'Menyusun dasbor', description: 'Corong, peta gesekan, dan rekomendasi perbaikan.' },
];

const DECISION: Record<string, { label: string; variant: 'impact' | 'friction' | 'neutral' | 'primary' }> = {
  lewat: { label: 'Lewat', variant: 'neutral' },
  berhenti_lalu_pergi: { label: 'Berhenti lalu pergi', variant: 'friction' },
  masuk_tanpa_memesan: { label: 'Masuk tanpa memesan', variant: 'primary' },
  memesan: { label: 'Memesan', variant: 'impact' },
};

const SEGMENT_LABEL = (s: string) => {
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function stageStatus(stage: number, tick: number, agentTicks: number): 'done' | 'running' | 'waiting' {
  const totalTicks = 1 + agentTicks + 2;
  const start = [0, 1, 1 + agentTicks, 2 + agentTicks][stage]!;
  const end = [1, 1 + agentTicks, 2 + agentTicks, totalTicks][stage]!;
  if (tick >= end) return 'done';
  return tick >= start ? 'running' : 'waiting';
}

/** Judul bagian di dalam satu container, sama dengan halaman alur lain. */
function SectionTitle({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-10 text-[12px] font-semibold text-primary-40">
        {n}
      </span>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      </div>
    </div>
  );
}

function SimulasiAgenInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('analysisId') || 'selasar-kopi';
  const businessId = searchParams.get('businessId');
  const querySuffix = `?analysisId=${encodeURIComponent(analysisId)}${
    businessId ? `&businessId=${encodeURIComponent(businessId)}` : ''
  }`;

  const [agents, setAgents] = useState<AgentDecision[]>(MOCK_AGENTS);
  const [tick, setTick] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const agentTicks = Math.max(1, agents.length);
  const totalTicks = 1 + agentTicks + 2; // persona, agen..., rangkum, dasbor

  useEffect(() => {
    let active = true;
    const run = async () => {
      await triggerSimulationRun(analysisId);
      const list = await fetchAgentDecisions(analysisId);
      if (active && list.length > 0) {
        setAgents(list);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [analysisId]);

  useEffect(() => {
    if (tick >= totalTicks) return;
    const t = setTimeout(() => setTick((n) => n + 1), TICK_MS);
    return () => clearTimeout(t);
  }, [tick, totalTicks]);

  // Gulir kotak monolog saja (bukan seluruh halaman) ke entri terbaru.
  useEffect(() => {
    const box = feedRef.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [tick]);

  const done = tick >= totalTicks;
  const progress = Math.min(100, Math.round((tick / totalTicks) * 100));
  const agentsShown = Math.max(0, Math.min(agentTicks, tick - 1));

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          {/* Judul halaman */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Simulasi calon pelanggan</h1>
              <p className="mt-1 text-[13px] text-muted">
                Agen dengan latar berbeda menelusuri jalur tokomu lewat transkrip, lalu memutuskan masuk atau pergi.
              </p>
            </div>
            <Badge variant={done ? 'impact' : 'primary'} size="md">
              {done ? 'Hasil siap' : `Berjalan ${progress}%`}
            </Badge>
          </div>

          <div className="rounded-md border border-line bg-white">
            <div className="space-y-12 p-6 sm:p-10">
              {/* 1. Tahapan */}
              <section>
                <SectionTitle n={1} title="Tahapan" description="Biasanya selesai dalam beberapa menit." />
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <SekilasMascot size={22} />
                      {done ? 'Simulasi selesai' : 'Menjalankan simulasi…'}
                    </span>
                    <span className="tabular-nums text-muted">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft">
                    <div className="h-full rounded-full bg-primary-40 transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <ul className="space-y-2">
                  {STAGES.map((st, i) => {
                    const status = stageStatus(i, tick, agentTicks);
                    const Icon = st.icon;
                    return (
                      <li key={st.title} className="flex items-center gap-3 rounded-md border border-line px-4 py-3">
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-md ${
                            status === 'done'
                              ? 'bg-impact-10 text-impact'
                              : status === 'running'
                                ? 'bg-primary-10 text-primary-40'
                                : 'bg-soft text-subtle'
                          }`}
                        >
                          {status === 'done' ? (
                            <Check size={16} strokeWidth={2.5} />
                          ) : status === 'running' ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Icon size={16} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-medium ${status === 'waiting' ? 'text-muted' : 'text-ink'}`}>{st.title}</p>
                          <p className="mt-0.5 text-[12px] text-muted">{st.description}</p>
                        </div>
                        <Badge variant={status === 'done' ? 'impact' : status === 'running' ? 'primary' : 'neutral'}>
                          {status === 'done' ? 'Selesai' : status === 'running' ? 'Berjalan' : 'Menunggu'}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* 2. Monolog agen */}
              <section>
                <SectionTitle
                  n={2}
                  title="Cuplikan pikiran agen"
                  description="Contoh monolog saat agen menelusuri jalur. Semua monolog bisa dibaca di Jelajah agen setelah selesai."
                />
                <div ref={feedRef} className="max-h-[440px] space-y-2 overflow-y-auto rounded-md border border-line bg-panel p-2">
                  {agentsShown === 0 && (
                    <div className="flex items-center gap-3 px-3 py-6 text-[13px] text-muted">
                      <LoaderCircle size={14} className="animate-spin text-primary-40" />
                      Menyiapkan persona calon pelanggan…
                    </div>
                  )}
                  {agents.slice(0, agentsShown).map((ag) => {
                    const d = DECISION[ag.final_decision] ?? { label: ag.final_decision, variant: 'neutral' as const };
                    return (
                      <article key={ag.agent_id} className="animate-[fadeIn_300ms_ease-out] rounded-md bg-white p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="grid size-6 place-items-center rounded-md bg-soft text-ink-soft">
                            <UserRound size={13} />
                          </span>
                          <Badge>{SEGMENT_LABEL(ag.persona.segment)}</Badge>
                          <Badge>{`Anggaran Rp ${ag.persona.concrete_facts.meal_budget.toLocaleString('id-ID')}`}</Badge>
                          <span className="flex-1" />
                          <Badge variant={d.variant}>{d.label}</Badge>
                        </div>
                        <p className="mt-3 text-[13px] italic leading-relaxed text-ink-soft">“{ag.monologue}”</p>
                      </article>
                    );
                  })}
                  {!done && agentsShown > 0 && (
                    <div className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-muted">
                      <LoaderCircle size={14} className="animate-spin text-primary-40" />
                      {agentsShown < agentTicks ? 'Agen berikutnya sedang menelusuri jalur…' : 'Merangkum alasan dan menyusun dasbor…'}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Kaki container */}
            <div className="flex flex-col-reverse gap-3 rounded-b-md bg-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push(`/business/analysis/verifikasi${querySuffix}`)}
                className="justify-center !rounded-md"
              >
                <ArrowLeftIcon size={16} /> Kembali ke verifikasi
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={!done}
                onClick={() => done && router.push(`/business/analysis${querySuffix}`)}
                className="justify-center !rounded-md"
              >
                Buka dasbor hasil <ArrowRightIcon size={16} />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SimulasiAgenPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <SimulasiAgenInner />
    </Suspense>
  );
}
