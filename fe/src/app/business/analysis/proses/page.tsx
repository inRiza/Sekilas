'use client';

import { Box, Check, Eye, EyeOff, FileText, LoaderCircle, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { SekilasMascot } from '@/components/brand/mascot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';
import { fetchTranscriptSegments } from '@/lib/api/crud';
import { MOCK_TRANSCRIPT } from '@/lib/mock/transcript';
import type { TranscriptSegment } from '@/types/api';

/** Jeda antar-baris log pembacaan (UI simulasi; nanti diganti stream dari backend). */
const LINE_INTERVAL_MS = 900;

type LogLine = { time: string; kind: 'segment' | 'seen' | 'missing' | 'zone'; text: string };

const VANTAGE_LABEL: Record<TranscriptSegment['vantage'], string> = {
  jalan: 'dari jalan',
  pintu: 'di pintu / tangga',
  dalam: 'di dalam',
};

function mmss(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

/** Ubah transkrip menjadi log "apa yang sedang dibaca AI", baris per baris. */
function buildLog(segments: TranscriptSegment[]): LogLine[] {
  return segments.flatMap((seg) => {
    const time = `${mmss(seg.timestamp_start)}–${mmss(seg.timestamp_end)}`;
    const firstSentence = seg.narrative.split(/(?<=\.)\s/)[0] ?? seg.narrative;
    const lines: LogLine[] = [
      { time, kind: 'segment', text: `Membaca segmen ${VANTAGE_LABEL[seg.vantage]}` },
      { time, kind: 'seen', text: firstSentence },
    ];
    if (seg.not_visible) lines.push({ time, kind: 'missing', text: seg.not_visible });
    if (seg.confidence === 'tidak_pasti')
      lines.push({ time, kind: 'zone', text: 'Kurang yakin di bagian ini, akan ditandai untuk kamu cek.' });
    return lines;
  });
}

const LINE_STYLE: Record<LogLine['kind'], { icon: LucideIcon; tone: string; label: string }> = {
  segment: { icon: FileText, tone: 'bg-primary-10 text-primary-40', label: 'Segmen' },
  seen: { icon: Eye, tone: 'bg-impact-10 text-impact', label: 'Terlihat' },
  missing: { icon: EyeOff, tone: 'bg-soft text-ink-soft', label: 'Tidak terlihat' },
  zone: { icon: ShieldCheck, tone: 'bg-friction-10 text-friction', label: 'Perlu dicek' },
};

type StageStatus = 'done' | 'running' | 'waiting';

function StageRow({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  status: StageStatus;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md border border-line px-4 py-3">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-md ${
          status === 'done' ? 'bg-impact-10 text-impact' : status === 'running' ? 'bg-primary-10 text-primary-40' : 'bg-soft text-subtle'
        }`}
      >
        {status === 'done' ? <Check size={16} strokeWidth={2.5} /> : status === 'running' ? <LoaderCircle size={16} className="animate-spin" /> : <Icon size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[12px] text-muted">{description}</p>
      </div>
      <Badge variant={status === 'done' ? 'impact' : status === 'running' ? 'primary' : 'neutral'}>
        {status === 'done' ? 'Selesai' : status === 'running' ? 'Berjalan' : 'Menunggu'}
      </Badge>
    </li>
  );
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

function ProsesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('analysisId') || 'selasar-kopi';
  const businessId = searchParams.get('businessId');
  const querySuffix = `?analysisId=${encodeURIComponent(analysisId)}${
    businessId ? `&businessId=${encodeURIComponent(businessId)}` : ''
  }`;

  const [segments, setSegments] = useState<TranscriptSegment[]>(MOCK_TRANSCRIPT);
  useEffect(() => {
    void fetchTranscriptSegments(analysisId).then((list) => {
      if (list.length > 0) setSegments(list);
    });
  }, [analysisId]);

  const log = useMemo(() => buildLog(segments), [segments]);
  const [shown, setShown] = useState(0);
  const logBoxRef = useRef<HTMLDivElement>(null);

  // Tampilkan log satu per satu, seolah-olah AI sedang membaca video.
  useEffect(() => {
    if (shown >= log.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), LINE_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [shown, log.length]);

  // Gulir kotak log saja (bukan seluruh halaman) ke baris terbaru.
  useEffect(() => {
    const box = logBoxRef.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [shown]);

  const transcriptDone = log.length > 0 && shown >= log.length;
  const progress = log.length > 0 ? Math.round((shown / log.length) * 100) : 100;
  const segmentsRead = log.slice(0, shown).filter((l) => l.kind === 'segment').length;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          {/* Judul halaman */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Memproses video</h1>
              <p className="mt-1 text-[13px] text-muted">
                AI membaca videomu menjadi catatan per segmen. Visual Twin 3D dibangun bersamaan di latar belakang.
              </p>
            </div>
            <Badge variant={transcriptDone ? 'impact' : 'primary'} size="md">
              {transcriptDone ? 'Transkrip siap dicek' : 'Sedang membaca video'}
            </Badge>
          </div>

          <div className="rounded-md border border-line bg-white">
            <div className="space-y-12 p-6 sm:p-10">
              {/* 1. Tahapan */}
              <section>
                <SectionTitle n={1} title="Tahapan" description="Transkrip dan Visual Twin berjalan paralel; kamu tidak perlu menunggu 3D selesai." />
                <ul className="space-y-2">
                  <StageRow icon={ShieldCheck} title="Blur privasi" description="Wajah dan plat nomor diburamkan di perangkatmu." status="done" />
                  <StageRow
                    icon={FileText}
                    title="Transkrip video"
                    description={`${segmentsRead} dari ${segments.length} segmen dibaca, lengkap dengan frame bukti.`}
                    status={transcriptDone ? 'done' : 'running'}
                  />
                  <StageRow
                    icon={Box}
                    title="Visual Twin 3D"
                    description="Membangun peta 3D dari jalur kamera. Hasilnya menyusul di dasbor."
                    status="running"
                  />
                </ul>
              </section>

              {/* 2. Log pembacaan */}
              <section>
                <SectionTitle n={2} title="Yang sedang dibaca AI" description="Catatan muncul per segmen video, dari jalan sampai titik pesan." />

                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <SekilasMascot size={22} />
                      {transcriptDone ? 'Selesai membaca video' : 'Membaca video…'}
                    </span>
                    <span className="tabular-nums text-muted">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft">
                    <div className="h-full rounded-full bg-primary-40 transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div ref={logBoxRef} className="max-h-[420px] overflow-y-auto rounded-md border border-line bg-panel p-2">
                  <ol className="space-y-1">
                    {log.slice(0, shown).map((line, i) => {
                      const style = LINE_STYLE[line.kind];
                      const Icon = style.icon;
                      const isSegment = line.kind === 'segment';
                      return (
                        <li
                          key={i}
                          className={`flex animate-[fadeIn_300ms_ease-out] items-start gap-3 rounded-md px-3 py-2.5 ${isSegment ? 'mt-2 bg-white first:mt-0' : ''}`}
                        >
                          <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ${style.tone}`}>
                            <Icon size={13} />
                          </span>
                          <div className="min-w-0 flex-1">
                            {isSegment ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-medium text-ink">{line.text}</span>
                                <Badge>{line.time}</Badge>
                              </div>
                            ) : (
                              <p className="text-[13px] leading-relaxed text-ink-soft">
                                <span className="font-medium text-ink">{style.label}: </span>
                                {line.text}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {!transcriptDone && (
                      <li className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-muted">
                        <LoaderCircle size={14} className="animate-spin text-primary-40" />
                        Membaca frame berikutnya…
                      </li>
                    )}
                  </ol>
                </div>
              </section>
            </div>

            {/* Kaki container */}
            <div className="flex flex-col-reverse gap-3 rounded-b-md bg-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push(`/business/analysis/video${querySuffix}`)}
                className="justify-center !rounded-md"
              >
                <ArrowLeftIcon size={16} /> Kembali ke rekam video
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={!transcriptDone}
                onClick={() => transcriptDone && router.push(`/business/analysis/verifikasi${querySuffix}`)}
                className="justify-center !rounded-md"
              >
                Cek transkrip <ArrowRightIcon size={16} />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProsesPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <ProsesInner />
    </Suspense>
  );
}
