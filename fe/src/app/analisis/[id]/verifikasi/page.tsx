'use client';

import React, { useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, ArrowRightIcon } from '@/components/ui/icons';
import { MOCK_TRANSCRIPT } from '@/lib/mock/transcript';
import { TranscriptSegment } from '@/types/api';

function VerifikasiTranskripInner() {
  const params = useParams();
  const router = useRouter();
  const analysisId = (params?.id as string) || 'selasar-kopi';

  const [segments, setSegments] = useState<TranscriptSegment[]>(MOCK_TRANSCRIPT);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(MOCK_TRANSCRIPT[1].id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Antrean Wajib Konfirmasi (hanya segmen tidak_pasti yang belum confirmed)
  const unconfirmedUncertainCount = segments.filter(
    (s) => s.confidence === 'tidak_pasti' && !s.is_confirmed_by_owner
  ).length;

  const handleConfirm = (id: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_confirmed_by_owner: true } : s))
    );
  };

  const handleDelete = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStartEdit = (seg: TranscriptSegment) => {
    setEditingId(seg.id);
    setEditText(seg.narrative);
  };

  const handleSaveEdit = (id: string) => {
    setSegments((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, narrative: editText, is_confirmed_by_owner: true }
          : s
      )
    );
    setEditingId(null);
  };

  const activeSegment = segments.find((s) => s.id === selectedSegmentId) || segments[0];

  const handleNext = () => {
    if (unconfirmedUncertainCount > 0) return;
    router.push(`/analisis/${analysisId}/simulasi`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="wizard" currentStep={4} analysisId={analysisId} />

      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-6">
        {/* Banner Gerbang Wajib */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 pb-3 border-b border-hairline">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
              Verifikasi Transkrip (F4)
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-1">
              Transkrip adalah satu-satunya mata bagi 500 agen. Pastikan catatan visual akurat dengan kondisi tokomu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-semibold px-3 py-1 rounded-full ${
                unconfirmedUncertainCount === 0
                  ? 'bg-impact/10 text-impact border border-impact/20'
                  : 'bg-friction-10 text-friction border border-friction/20 animate-pulse'
              }`}
            >
              {unconfirmedUncertainCount === 0
                ? 'Semua Segmen Terverifikasi'
                : `${unconfirmedUncertainCount} Segmen Wajib Konfirmasi`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Pemutar Video & Frame Snapshot (5 Kolom) */}
          <div className="lg:col-span-5 space-y-4">
            <Card padded={false} className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-hairline bg-surface">
                <span className="text-xs font-semibold text-ink">
                  Frame Bukti: {activeSegment?.id}
                </span>
                <span className="font-mono text-[11px] text-subtle">
                  Detik {activeSegment?.timestamp_start} – {activeSegment?.timestamp_end}
                </span>
              </div>
              <div className="w-full h-64 bg-panel flex flex-col items-center justify-center p-4 text-center border-b border-hairline">
                <div className="w-12 h-12 rounded-full bg-primary-10 text-primary-40 flex items-center justify-center mb-2 font-mono text-xs font-bold">
                  IMG
                </div>
                <p className="text-xs font-medium text-ink">Snapshot Frame Terburam</p>
                <p className="font-mono text-[11px] text-muted mt-0.5">
                  Zona: {activeSegment?.zone_id?.replace('_', ' ')}
                </p>
              </div>
              <div className="p-3 bg-surface flex items-center justify-between text-xs">
                <span className="text-muted">Sudut pandang:</span>
                <span className="font-mono uppercase font-semibold text-primary-40 bg-primary-10 px-2 py-0.5 rounded">
                  {activeSegment?.vantage}
                </span>
              </div>
            </Card>

            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Status gerbang simulasi:</span>
                <span className={unconfirmedUncertainCount === 0 ? 'text-impact font-medium' : 'text-friction font-medium'}>
                  {unconfirmedUncertainCount === 0 ? 'Siap Jalankan' : 'Tertahan Konfirmasi'}
                </span>
              </div>
              <Button
                variant="primary"
                size="lg"
                disabled={unconfirmedUncertainCount > 0}
                onClick={handleNext}
                className="w-full justify-center"
              >
                Jalankan Simulasi 500 Agen (F5) <ArrowRightIcon size={16} />
              </Button>
              {unconfirmedUncertainCount > 0 && (
                <p className="text-[11px] text-muted text-center leading-relaxed">
                  Tombol akan aktif setelah kamu mengonfirmasi atau memperbaiki segmen bertanda "Perlu Konfirmasi".
                </p>
              )}
            </Card>
          </div>

          {/* Kolom Kanan: Daftar Segmen Transkrip (7 Kolom) */}
          <div className="lg:col-span-7 space-y-4">
            {segments.map((seg) => {
              const isSelected = seg.id === selectedSegmentId;
              const isUncertain = seg.confidence === 'tidak_pasti';
              const needsAction = isUncertain && !seg.is_confirmed_by_owner;
              const isEditing = editingId === seg.id;

              return (
                <Card
                  key={seg.id}
                  onClick={() => setSelectedSegmentId(seg.id)}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary-40/30 border-primary-40' : 'hover:border-subtle'
                  } ${needsAction ? 'bg-friction-10/40 border-friction/30' : ''}`}
                >
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-ink">{seg.id}</span>
                      <span className="font-mono text-[11px] text-subtle">
                        {seg.timestamp_start}s – {seg.timestamp_end}s
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {needsAction ? (
                        <span className="font-mono text-[10px] uppercase font-bold text-friction bg-friction-10 px-2 py-0.5 rounded-full border border-friction/30 animate-pulse">
                          Perlu Konfirmasi
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase text-impact bg-impact-10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckIcon size={10} /> Terverifikasi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Isi Narasi VLM */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-xl border border-primary-40 bg-white p-3 text-xs text-ink focus:outline-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                          Batal
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleSaveEdit(seg.id)}>
                          Simpan Koreksi
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-ink leading-relaxed font-normal">{seg.narrative}</p>
                      {seg.not_visible && (
                        <div className="mt-2.5 rounded-lg bg-panel p-2.5 border border-hairline text-[11px] text-muted">
                          <strong className="text-ink-soft font-medium">TIDAK Terlihat / Terbaca:</strong>{' '}
                          {seg.not_visible}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aksi Per Segmen */}
                  {!isEditing && (
                    <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {needsAction ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirm(seg.id);
                            }}
                          >
                            <CheckIcon size={12} /> Konfirmasi Benar
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(seg);
                            }}
                          >
                            Ubah Teks
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(seg);
                          }}
                        >
                          Koreksi
                        </Button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(seg.id);
                        }}
                        className="text-xs text-subtle hover:text-friction font-medium px-2 py-1"
                      >
                        Hapus Segmen
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
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

export default function VerifikasiTranskripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VerifikasiTranskripInner />
    </Suspense>
  );
}
