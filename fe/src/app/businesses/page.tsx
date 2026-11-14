'use client';

import { ArrowRight, CircleAlert, LoaderCircle, Plus, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/form';
import { Select, type SelectOption } from '@/components/ui/select';
import { ApiError, backend, type BusinessSummary } from '@/lib/backend';

type Category = BusinessSummary['category'];

const CATEGORY_OPTIONS: SelectOption<Category>[] = [
  { value: 'warung', label: 'Warung makan' },
  { value: 'kedai', label: 'Kedai kopi' },
  { value: 'kafe', label: 'Kafe santai' },
  { value: 'resto_ruko', label: 'Restoran ruko' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label])) as Record<Category, string>;

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draf',
  konteks: 'Isi konteks',
  video: 'Menunggu video',
  memproses: 'Diproses',
  verifikasi: 'Verifikasi',
  simulasi: 'Simulasi',
  siap: 'Siap',
};

export default function BusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('kedai');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBusinesses(await backend.listBusinesses());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Gagal memuat daftar bisnis.');
    }
  }, []);

  useEffect(() => {
    // Muat sekali saat halaman dibuka; setState terjadi setelah fetch selesai.
    void (async () => {
      await load();
    })();
  }, [load]);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewBizName('');
    setNewBranchName('');
    setNewAddress('');
    setNewCategory('kedai');
    setSaveError(null);
  }, []);

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;
    setSaving(true);
    try {
      await backend.createBusiness({
        name: newBizName.trim(),
        branch_name: newBranchName.trim(),
        category: newCategory,
        address: newAddress.trim(),
      });
      closeAddModal();
      await load();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const startAnalysis = async (bid: string) => {
    setCreatingFor(bid);
    try {
      const analysis = await backend.createAnalysis(bid);
      router.push(analysis.next_action.route);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Gagal membuat analisis.');
      setCreatingFor(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Daftar bisnis</h1>
              <p className="mt-1 text-[13px] text-muted">Pilih tempat usaha untuk membuka analisis utamanya, atau mulai analisis baru.</p>
            </div>
            <Button variant="primary" size="md" className="!rounded-md" onClick={() => setShowAddModal(true)}>
              <Plus size={15} /> Tambah tempat usaha
            </Button>
          </div>

          {loadError && (
            <div className="flex items-start gap-3 rounded-md bg-friction-10 p-4 text-[13px] text-friction">
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1">{loadError}</div>
              <button type="button" onClick={load} className="font-medium underline">
                Coba lagi
              </button>
            </div>
          )}

          {businesses === null && !loadError ? (
            <div className="flex h-40 items-center justify-center">
              <LoaderCircle size={20} className="animate-spin text-subtle" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(businesses ?? []).map((biz) => {
                const primary = biz.primary_analysis;
                return (
                  <article key={biz.id} className="flex flex-col rounded-md border border-line bg-white transition-colors hover:border-[#d3d7dd]">
                    <button type="button" onClick={() => router.push(biz.next_action.route)} className="flex-1 p-5 text-left">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-10 text-primary-40">
                          <Store size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-[15px] font-semibold text-ink">{biz.name}</h2>
                          <p className="mt-0.5 truncate text-[13px] text-muted">{biz.address || 'Alamat belum diisi'}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        <Badge>{biz.branch_name}</Badge>
                        <Badge>{CATEGORY_LABEL[biz.category] ?? biz.category}</Badge>
                        <Badge>{`${biz.analysis_count} analisis`}</Badge>
                        {primary && (
                          <Badge variant={primary.status === 'siap' ? 'impact' : 'primary'}>{STATUS_LABEL[primary.status] ?? primary.status}</Badge>
                        )}
                        {primary?.is_demo && <Badge>Demo</Badge>}
                      </div>
                      {primary && (
                        <p className="mt-3 text-[13px] text-ink-soft">
                          Analisis utama: <span className="font-medium text-ink">{primary.name}</span>
                          {primary.quality_label ? `, Visual Twin ${primary.quality_label.toLowerCase()}` : ''}
                        </p>
                      )}
                    </button>
                    <div className="flex items-center justify-between gap-2 rounded-b-md bg-panel px-5 py-3">
                      <button
                        type="button"
                        onClick={() => router.push(biz.next_action.route)}
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary-40 hover:underline"
                      >
                        {biz.next_action.label} <ArrowRight size={14} />
                      </button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="!rounded-md"
                        disabled={creatingFor === biz.id}
                        onClick={() => startAnalysis(biz.id)}
                      >
                        {creatingFor === biz.id ? <LoaderCircle size={13} className="animate-spin" /> : <Plus size={13} />}
                        Analisis baru
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={showAddModal}
        onClose={closeAddModal}
        title="Tambah tempat usaha"
        description="Daftarkan usaha atau cabang baru untuk dianalisis."
        footer={
          <>
            <Button type="button" variant="secondary" size="md" className="!rounded-md" onClick={closeAddModal}>
              Batal
            </Button>
            <Button
              type="submit"
              form="add-business-form"
              variant="primary"
              size="md"
              className="!rounded-md"
              disabled={!newBizName.trim() || saving}
            >
              Simpan
            </Button>
          </>
        }
      >
        <form id="add-business-form" onSubmit={handleAddBusiness} className="space-y-5">
          <div>
            <Label requiredText="wajib" htmlFor="biz-name">
              Nama tempat usaha
            </Label>
            <Input id="biz-name" autoFocus placeholder="Contoh: Kopi Toko Djawa" value={newBizName} onChange={(e) => setNewBizName(e.target.value)} />
          </div>
          <div>
            <Label requiredText="opsional" htmlFor="biz-branch">
              Nama cabang
            </Label>
            <Input id="biz-branch" placeholder="Contoh: Braga" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
          </div>
          <div>
            <Label requiredText="wajib" htmlFor="biz-category">
              Jenis usaha
            </Label>
            <Select id="biz-category" value={newCategory} onChange={setNewCategory} options={CATEGORY_OPTIONS} />
          </div>
          <div>
            <Label requiredText="opsional" htmlFor="biz-address">
              Alamat
            </Label>
            <Input id="biz-address" placeholder="Contoh: Jl. Braga No. 12, Bandung" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
          </div>
          {saveError && <p className="text-[12px] text-friction">{saveError}</p>}
        </form>
      </Dialog>
    </div>
  );
}
