'use client';

import { Pencil, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/form';
import { ArrowRightIcon, PlusIcon, StoreIcon } from '@/components/ui/icons';
import {
  cloneAnalysisWithTranscript,
  createAnalysis,
  deleteAnalysis,
  fetchAnalyses,
  fetchBusinesses,
  getLocalAnalyses,
  getLocalBusinesses,
  subscribeCrudChanges,
  updateAnalysis,
} from '@/lib/api/crud';
import { Analysis, Business } from '@/types/api';

function BusinessAnalysesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBizId = searchParams.get('businessId');

  const [businesses, setBusinesses] = useState<Business[]>(() => getLocalBusinesses());
  const [analyses, setAnalyses] = useState<Analysis[]>(() => getLocalAnalyses());

  // Modal Buat Analisis Baru
  const [showNewModal, setShowNewModal] = useState(false);
  const [newAnalysisName, setNewAnalysisName] = useState('');

  // Modal Rename Analisis
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [editName, setEditName] = useState('');

  // Modal Hapus Analisis
  const [deletingAnalysis, setDeletingAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchBusinesses(), fetchAnalyses()]).then(([bizList, anlList]) => {
      if (!active) return;
      setBusinesses(bizList);
      setAnalyses(anlList);
    });
    const unsubscribe = subscribeCrudChanges(() => {
      setBusinesses(getLocalBusinesses());
      setAnalyses(getLocalAnalyses());
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const activeBiz = businesses.find((b) => b.id === requestedBizId) || businesses[0];
  const filteredAnalyses = activeBiz
    ? analyses.filter((a) => a.business_id === activeBiz.id)
    : analyses;

  const handleCreateAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBiz) return;
    const created = await createAnalysis({
      business_id: activeBiz.id,
      name: newAnalysisName.trim() || `Analisis ${activeBiz.name} (${activeBiz.branch_name})`,
      status: 'draft',
    });
    setShowNewModal(false);
    setNewAnalysisName('');
    router.push(`/business/analysis/konteks?analysisId=${encodeURIComponent(created.id)}&businessId=${encodeURIComponent(activeBiz.id)}`);
  };

  const handleRenameAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnalysis || !editName.trim()) return;
    await updateAnalysis(editingAnalysis.id, { name: editName.trim() });
    setEditingAnalysis(null);
  };

  const handleSetPrimary = async (analysis: Analysis) => {
    await updateAnalysis(analysis.id, { set_as_primary: true });
  };

  const handleConfirmDelete = async () => {
    if (!deletingAnalysis) return;
    await deleteAnalysis(deletingAnalysis.id);
    setDeletingAnalysis(null);
  };

  if (!activeBiz) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-white p-8 text-center">
        <p className="text-sm text-muted">Belum ada tempat usaha terdaftar.</p>
        <Link href="/businesses" className="btn-primary mt-4 inline-flex h-9 items-center rounded-md px-4 text-xs font-semibold text-white">
          Tambah Tempat Usaha
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-between bg-white">
      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-8">
          {/* Active Business Info Card */}
          <div className="rounded-xl border border-line bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-primary-40 bg-primary-10 px-2 py-0.5 rounded-full font-semibold">
                  Tempat Usaha Aktif
                </span>
                <span className="font-mono text-[11px] text-subtle capitalize">
                  {activeBiz.category}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-ink mt-1.5 flex items-center gap-2">
                <StoreIcon size={20} className="text-muted shrink-0" />
                <span>{activeBiz.name}</span>
                <Badge size="md">{activeBiz.branch_name}</Badge>
              </h1>
              <p className="text-xs text-muted mt-1">
                {activeBiz.address}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/businesses"
                className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-panel transition"
              >
                Ganti Tempat Usaha
              </Link>
              <button
                type="button"
                onClick={() => {
                  setNewAnalysisName('');
                  setShowNewModal(true);
                }}
                className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white shadow-xs transition"
              >
                <PlusIcon size={14} />
                <span>Buat Analisis Baru</span>
              </button>
            </div>
          </div>

          {/* Section: Riwayat Analisis Video */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-normal tracking-[-0.02em] text-ink">
                  Daftar Analisis Video & Simulasi
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Daftar rekaman video dan hasil proyeksi titik gesekan untuk {activeBiz.name}.
                </p>
              </div>

              <span className="font-mono text-[11px] text-subtle">
                {filteredAnalyses.length} Analisis Terdaftar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnalyses.map((analysis) => {
                const isReady = analysis.status === 'ready';
                const isPrimary = activeBiz.primary_analysis_id === analysis.id;

                return (
                  <div
                    key={analysis.id}
                    className="group rounded-xl border border-line bg-white p-4 flex flex-col justify-between hover:!border-[#d3d7dd] transition"
                  >
                    <div>
                      {/* Status Tag & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                              isReady
                                ? 'bg-impact/10 text-impact'
                                : 'bg-primary-10 text-primary-40'
                            }`}
                          >
                            {isReady ? 'Siap Ditinjau' : analysis.status === 'draft' ? 'Draf' : 'Memproses'}
                          </span>
                          {isPrimary && (
                            <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Utama
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(analysis)}
                              title="Jadikan analisis utama"
                              aria-label="Jadikan analisis utama"
                              className="grid size-7 place-items-center rounded-md text-muted hover:bg-panel hover:text-amber-600 transition"
                            >
                              <Star size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAnalysis(analysis);
                              setEditName(analysis.name);
                            }}
                            title="Ubah nama analisis"
                            aria-label="Ubah nama analisis"
                            className="grid size-7 place-items-center rounded-md text-muted hover:bg-panel hover:text-ink transition"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAnalysis(analysis)}
                            title="Hapus analisis"
                            aria-label="Hapus analisis"
                            className="grid size-7 place-items-center rounded-md text-muted hover:bg-friction-10 hover:text-friction transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-ink line-clamp-2 leading-snug group-hover:text-primary-40 transition">
                        {analysis.name}
                      </h3>

                      <div className="mt-3 py-2 flex items-center justify-between text-xs text-muted">
                        <span className="font-mono text-[11px]">
                          {analysis.total_agents} Agen Demo
                        </span>
                        <span className="font-mono text-[11px] text-subtle">
                          {new Date(analysis.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/business/analysis/konteks?analysisId=${encodeURIComponent(analysis.id)}&businessId=${encodeURIComponent(activeBiz.id)}`}
                        className="h-8.5 px-3 rounded-md border border-line bg-white text-xs font-medium text-muted hover:text-ink hover:bg-panel flex items-center justify-center transition"
                      >
                        Konteks
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const cloned = await cloneAnalysisWithTranscript(analysis.id);
                            router.push(
                              `/business/analysis/verifikasi?analysisId=${encodeURIComponent(cloned.id)}&businessId=${encodeURIComponent(activeBiz.id)}`,
                            );
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Gagal menyalin analisis.');
                          }
                        }}
                        className="h-8.5 px-3 rounded-md border border-line bg-white text-xs font-medium text-muted hover:text-ink hover:bg-panel flex items-center justify-center transition"
                      >
                        Salin transkrip
                      </button>
                      {isReady ? (
                        <Link
                          href={`/business/analysis?analysisId=${encodeURIComponent(analysis.id)}`}
                          className="btn-primary flex-1 h-8.5 rounded-md text-xs font-semibold text-white shadow-2xs flex items-center justify-center gap-1.5 transition"
                        >
                          <span>Buka Dasbor Hasil</span>
                          <ArrowRightIcon size={13} />
                        </Link>
                      ) : (
                        <Link
                          href={`/business/analysis/proses?analysisId=${encodeURIComponent(analysis.id)}`}
                          className="flex-1 h-8.5 rounded-md border border-line bg-panel text-xs font-medium text-ink flex items-center justify-center gap-1.5 hover:bg-white transition"
                        >
                          <span>Lihat Status Proses AI</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Buat Analisis Baru */}
      <Dialog
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Buat analisis baru"
        description={`Analisis baru untuk ${activeBiz.name} (${activeBiz.branch_name}). Konteks akan diisi otomatis dari profil cabang.`}
        footer={
          <>
            <Button type="button" variant="secondary" size="md" className="!rounded-md" onClick={() => setShowNewModal(false)}>
              Batal
            </Button>
            <Button type="submit" form="create-analysis-form" variant="primary" size="md" className="!rounded-md">
              Buat & Isi Konteks
            </Button>
          </>
        }
      >
        <form id="create-analysis-form" onSubmit={handleCreateAnalysis} className="space-y-4">
          <div>
            <Label requiredText="opsional" htmlFor="new-analysis-name">Nama siklus analisis</Label>
            <Input
              id="new-analysis-name"
              autoFocus
              placeholder={`Contoh: Evaluasi Fasad & Papan Menu Sore`}
              value={newAnalysisName}
              onChange={(e) => setNewAnalysisName(e.target.value)}
            />
          </div>
        </form>
      </Dialog>

      {/* Modal Ubah Nama Analisis */}
      <Dialog
        open={Boolean(editingAnalysis)}
        onClose={() => setEditingAnalysis(null)}
        title="Ubah nama analisis"
        description="Perbarui judul siklus analisis agar mudah dikenali di riwayat."
        footer={
          <>
            <Button type="button" variant="secondary" size="md" className="!rounded-md" onClick={() => setEditingAnalysis(null)}>
              Batal
            </Button>
            <Button type="submit" form="rename-analysis-form" variant="primary" size="md" className="!rounded-md" disabled={!editName.trim()}>
              Simpan
            </Button>
          </>
        }
      >
        <form id="rename-analysis-form" onSubmit={handleRenameAnalysis} className="space-y-4">
          <div>
            <Label requiredText="wajib" htmlFor="rename-analysis-input">Nama analisis</Label>
            <Input
              id="rename-analysis-input"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
        </form>
      </Dialog>

      {/* Modal Hapus Analisis */}
      <Dialog
        open={Boolean(deletingAnalysis)}
        onClose={() => setDeletingAnalysis(null)}
        title="Hapus analisis?"
        description={
          deletingAnalysis
            ? `Analisis "${deletingAnalysis.name}" akan dihapus permanen dari ${activeBiz.name}.`
            : ''
        }
        footer={
          <>
            <Button type="button" variant="secondary" size="md" className="!rounded-md" onClick={() => setDeletingAnalysis(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="!rounded-md !bg-friction hover:!bg-friction/90"
              onClick={handleConfirmDelete}
            >
              Ya, Hapus
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted leading-relaxed">
          Data transkrip, persona, dan proyeksi pada siklus analisis ini akan ikut terhapus.
        </p>
      </Dialog>
    </div>
  );
}

export default function BusinessAnalysesPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <BusinessAnalysesInner />
    </Suspense>
  );
}
