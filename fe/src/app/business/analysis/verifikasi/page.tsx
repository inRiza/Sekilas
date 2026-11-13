'use client';

import { Check, EyeOff, ImageIcon, PencilLine, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { Suspense, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';
import { MOCK_TRANSCRIPT } from '@/lib/mock/transcript';
import { TranscriptSegment } from '@/types/api';

const VANTAGE_LABEL: Record<TranscriptSegment['vantage'], string> = {
  jalan: 'Dari jalan',
  pintu: 'Di pintu / tangga',
  dalam: 'Di dalam',
};

function mmss(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function SegmentItem({
  seg,
  onConfirm,
  onSave,
  onDelete,
}: {
  seg: TranscriptSegment;
  onConfirm: () => void;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(seg.narrative);
  const needsAction = seg.confidence === 'tidak_pasti' && !seg.is_confirmed_by_owner;

  return (
    <li
      className={`rounded-md border p-4 transition-colors sm:p-5 ${
        needsAction ? 'border-friction/40 bg-friction-10/40' : 'border-line bg-white'
      }`}
    >
      {/* Kepala: waktu, sudut pandang, status */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{`${mmss(seg.timestamp_start)} – ${mmss(seg.timestamp_end)}`}</Badge>
        <Badge>{VANTAGE_LABEL[seg.vantage]}</Badge>
        <span className="flex-1" />
        {needsAction ? (
          <Badge variant="friction">Perlu dicek</Badge>
        ) : (
          <Badge variant="impact">
            <Check size={11} strokeWidth={2.5} /> Terverifikasi
          </Badge>
        )}
      </div>

      {/* Isi: frame bukti + narasi */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="flex h-24 w-full shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-panel text-muted sm:w-40">
          <ImageIcon size={18} />
          <span className="text-[11px]">Frame bukti</span>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-3">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="!border-primary-40" />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="!rounded-md"
                  onClick={() => {
                    setText(seg.narrative);
                    setEditing(false);
                  }}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="!rounded-md"
                  onClick={() => {
                    onSave(text);
                    setEditing(false);
                  }}
                >
                  Simpan koreksi
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-ink">{seg.narrative}</p>
              {seg.not_visible && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-panel px-3 py-2.5">
                  <EyeOff size={14} className="mt-0.5 shrink-0 text-muted" />
                  <p className="text-[12px] leading-relaxed text-ink-soft">
                    <span className="font-medium text-ink">Tidak terlihat: </span>
                    {seg.not_visible}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Aksi */}
      {!editing && (
        <div className="mt-4 flex items-center gap-2">
          {needsAction && (
            <Button variant="primary" size="sm" className="!rounded-md" onClick={onConfirm}>
              <Check size={14} /> Sudah benar
            </Button>
          )}
          <Button variant="secondary" size="sm" className="!rounded-md" onClick={() => setEditing(true)}>
            <PencilLine size={14} /> Koreksi
          </Button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] text-muted transition-colors hover:bg-friction-10 hover:text-friction"
          >
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      )}
    </li>
  );
}

function VerifikasiTranskripInner() {
  const router = useRouter();
  const [segments, setSegments] = useState<TranscriptSegment[]>(MOCK_TRANSCRIPT);

  const update = (id: string, patch: Partial<TranscriptSegment>) =>
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const pending = segments.filter((s) => s.confidence === 'tidak_pasti' && !s.is_confirmed_by_owner).length;
  const verified = segments.length - pending;
  const ready = pending === 0;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          {/* Judul halaman */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Verifikasi transkrip</h1>
              <p className="mt-1 text-[13px] text-muted">
                Agen hanya melihat tokomu lewat catatan ini. Pastikan isinya sesuai kondisi sebenarnya.
              </p>
            </div>
            <Badge variant={ready ? 'impact' : 'friction'} size="md">
              {ready ? 'Semua segmen terverifikasi' : `${pending} segmen perlu dicek`}
            </Badge>
          </div>

          <div className="rounded-md border border-line bg-white">
            <div className="space-y-6 p-6 sm:p-10">
              {/* Ringkasan progres */}
              <div>
                <div className="mb-2 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-ink">Segmen video</span>
                  <span className="tabular-nums text-muted">
                    {verified} dari {segments.length} terverifikasi
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft">
                  <div
                    className="h-full rounded-full bg-impact transition-[width] duration-500"
                    style={{ width: `${segments.length ? (verified / segments.length) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  Segmen bertanda <span className="font-medium text-friction">Perlu dicek</span> wajib dikonfirmasi atau
                  dikoreksi sebelum simulasi dijalankan. Segmen lain cukup ditinjau.
                </p>
              </div>

              <ol className="space-y-3">
                {segments.map((seg) => (
                  <SegmentItem
                    key={seg.id}
                    seg={seg}
                    onConfirm={() => update(seg.id, { is_confirmed_by_owner: true })}
                    onSave={(text) => update(seg.id, { narrative: text, is_confirmed_by_owner: true })}
                    onDelete={() => setSegments((prev) => prev.filter((s) => s.id !== seg.id))}
                  />
                ))}
              </ol>
            </div>

            {/* Kaki container */}
            <div className="flex flex-col-reverse gap-3 rounded-b-md bg-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/business/analysis/proses')}
                className="justify-center !rounded-md"
              >
                <ArrowLeftIcon size={16} /> Kembali ke pemrosesan
              </Button>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!ready}
                  onClick={() => ready && router.push('/business/analysis/simulasi')}
                  className="justify-center !rounded-md"
                >
                  Jalankan simulasi agen <ArrowRightIcon size={16} />
                </Button>
                {!ready && <span className="text-[12px] text-muted">Cek {pending} segmen dulu untuk melanjutkan</span>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifikasiTranskripPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <VerifikasiTranskripInner />
    </Suspense>
  );
}
