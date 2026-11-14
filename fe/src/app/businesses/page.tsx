'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/form';
import { ArrowRightIcon, FileTextIcon, PlusIcon, SettingsIcon, StoreIcon } from '@/components/ui/icons';
import { Select, type SelectOption } from '@/components/ui/select';
import {
  createBusiness,
  deleteBusiness,
  fetchAnalyses,
  fetchBusinesses,
  getLocalAnalyses,
  getLocalBusinesses,
  subscribeCrudChanges,
  updateBusiness,
} from '@/lib/api/crud';
import { Analysis, Business, BusinessType } from '@/types/api';

const CATEGORY_OPTIONS: SelectOption<BusinessType>[] = [
  { value: 'warung', label: 'Warung makan' },
  { value: 'kedai', label: 'Kedai kopi' },
  { value: 'kafe', label: 'Kafe santai' },
  { value: 'resto_ruko', label: 'Restoran ruko' },
];

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>(() => getLocalBusinesses());
  const [analyses, setAnalyses] = useState<Analysis[]>(() => getLocalAnalyses());

  // Modal Tambah Bisnis
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState<BusinessType>('kedai');

  // Modal Edit Bisnis
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [editName, setEditName] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCategory, setEditCategory] = useState<BusinessType>('kedai');

  // Modal Hapus Bisnis
  const [deletingBiz, setDeletingBiz] = useState<Business | null>(null);

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

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewBizName('');
    setNewBranchName('');
    setNewAddress('');
    setNewCategory('kedai');
  }, []);

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;
    await createBusiness({
      name: newBizName.trim(),
      branch_name: newBranchName.trim() || 'Pusat',
      category: newCategory,
      address: newAddress.trim(),
    });
    closeAddModal();
  };

  const openEditModal = (biz: Business) => {
    setEditingBiz(biz);
    setEditName(biz.name);
    setEditBranch(biz.branch_name);
    setEditCategory(biz.category);
    setEditAddress(biz.address);
  };

  const handleEditBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz || !editName.trim()) return;
    await updateBusiness(editingBiz.id, {
      name: editName,
      branch_name: editBranch || 'Pusat',
      category: editCategory,
      address: editAddress,
    });
    setEditingBiz(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBiz) return;
    await deleteBusiness(deletingBiz.id);
    setDeletingBiz(null);
  };

  return (
    <div className="flex min-h-full flex-col justify-between bg-white">
      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-8">
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-semibold">
                Manajemen Bisnis
              </span>
              <h1 className="text-2xl sm:text-[32px] font-normal tracking-[-0.035em] text-ink mt-1">
                Daftar Tempat Usaha
              </h1>
              <p className="text-xs sm:text-[13px] text-muted mt-1">
                Kelola unit bisnis, cabang fisik, dan konteks profil usaha untuk simulasi agen.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex h-9 items-center gap-2 rounded-md px-4 text-xs font-semibold text-white shadow-xs transition shrink-0"
            >
              <PlusIcon size={14} />
              <span>Tambah Tempat Usaha Baru</span>
            </button>
          </div>

          {/* Business Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {businesses.map((biz) => {
              const bizAnalyses = analyses.filter((a) => a.business_id === biz.id);
              const primaryAnl = bizAnalyses.find((a) => a.id === biz.primary_analysis_id) ?? bizAnalyses[0];

              return (
                <div
                  key={biz.id}
                  className="rounded-xl border border-line bg-white p-5 sm:p-6 hover:!border-[#d3d7dd] transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-primary-40 bg-primary-10 px-2 py-0.5 rounded-full font-semibold">
                        {biz.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-subtle mr-1">
                          {bizAnalyses.length} Analisis Video
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditModal(biz)}
                          title="Edit tempat usaha"
                          aria-label={`Edit ${biz.name}`}
                          className="grid size-7 place-items-center rounded-md text-muted hover:bg-panel hover:text-ink transition"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBiz(biz)}
                          title="Hapus tempat usaha"
                          aria-label={`Hapus ${biz.name}`}
                          className="grid size-7 place-items-center rounded-md text-muted hover:bg-friction-10 hover:text-friction transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h2 className="text-lg sm:text-xl font-semibold text-ink flex items-center gap-2">
                      <StoreIcon size={18} className="text-muted shrink-0" />
                      <span>{biz.name}</span>
                    </h2>
                    <p className="text-xs font-medium text-muted mt-0.5">
                      Cabang: {biz.branch_name}
                    </p>
                    <p className="text-xs text-subtle mt-1.5 leading-relaxed">
                      {biz.address}
                    </p>

                    <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                      <span className="text-muted">Analisis Utama</span>
                      <span className="font-mono text-[11px] font-medium text-impact truncate max-w-[220px]">
                        {primaryAnl ? primaryAnl.name : 'Belum ada analisis'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/businesses/analyses?businessId=${encodeURIComponent(biz.id)}`}
                      className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-panel transition"
                    >
                      <FileTextIcon size={13} className="text-muted" />
                      <span>Lihat Analisis</span>
                      <ArrowRightIcon size={13} className="text-muted" />
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/business/analysis/konteks?businessId=${encodeURIComponent(biz.id)}${
                          primaryAnl ? `&analysisId=${encodeURIComponent(primaryAnl.id)}` : ''
                        }`}
                        className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-xs font-medium text-muted hover:text-ink hover:bg-panel transition"
                        title="Edit Konteks Usaha"
                      >
                        <SettingsIcon size={13} />
                        <span>Konteks</span>
                      </Link>

                      <Link
                        href={`/business/analysis/konteks?businessId=${encodeURIComponent(biz.id)}&mode=new`}
                        className="btn-primary inline-flex h-8.5 items-center gap-1 rounded-md px-3 text-xs font-semibold text-white shadow-2xs transition"
                      >
                        <PlusIcon size={13} />
                        <span>Analisis Baru</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal Tambah Bisnis Baru */}
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
            <Button type="submit" form="add-business-form" variant="primary" size="md" className="!rounded-md" disabled={!newBizName.trim()}>
              Simpan
            </Button>
          </>
        }
      >
        <form id="add-business-form" onSubmit={handleAddBusiness} className="space-y-5">
          <div>
            <Label requiredText="wajib" htmlFor="biz-name">Nama tempat usaha</Label>
            <Input id="biz-name" autoFocus placeholder="Contoh: Kopi Toko Djawa" value={newBizName} onChange={(e) => setNewBizName(e.target.value)} />
          </div>
          <div>
            <Label requiredText="opsional" htmlFor="biz-branch">Nama cabang</Label>
            <Input id="biz-branch" placeholder="Contoh: Braga" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
          </div>
          <div>
            <Label requiredText="wajib" htmlFor="biz-category">Jenis usaha</Label>
            <Select id="biz-category" value={newCategory} onChange={setNewCategory} options={CATEGORY_OPTIONS} />
          </div>
          <div>
            <Label requiredText="opsional" htmlFor="biz-address">Alamat</Label>
            <Input id="biz-address" placeholder="Contoh: Jl. Braga No. 12, Bandung" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
          </div>
        </form>
      </Dialog>

      {/* Modal Edit Bisnis */}
      <Dialog
        open={Boolean(editingBiz)}
        onClose={() => setEditingBiz(null)}
        title="Edit tempat usaha"
        description="Perbarui identitas tempat usaha atau cabang."
        footer={
          <>
            <Button type="button" variant="secondary" size="md" className="!rounded-md" onClick={() => setEditingBiz(null)}>
              Batal
            </Button>
            <Button type="submit" form="edit-business-form" variant="primary" size="md" className="!rounded-md" disabled={!editName.trim()}>
              Simpan Perubahan
            </Button>
          </>
        }
      >
        <form id="edit-business-form" onSubmit={handleEditBusiness} className="space-y-5">
          <div>
            <Label requiredText="wajib" htmlFor="edit-biz-name">Nama tempat usaha</Label>
            <Input id="edit-biz-name" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <Label requiredText="opsional" htmlFor="edit-biz-branch">Nama cabang</Label>
            <Input id="edit-biz-branch" value={editBranch} onChange={(e) => setEditBranch(e.target.value)} />
          </div>
          <div>
            <Label requiredText="wajib" htmlFor="edit-biz-category">Jenis usaha</Label>
            <Select id="edit-biz-category" value={editCategory} onChange={setEditCategory} options={CATEGORY_OPTIONS} />
          </div>
          <div>
            <Label requiredText="opsional" htmlFor="edit-biz-address">Alamat</Label>
            <Input id="edit-biz-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
          </div>
        </form>
      </Dialog>

      {/* Modal Konfirmasi Hapus Bisnis */}
      <Dialog
        open={Boolean(deletingBiz)}
        onClose={() => setDeletingBiz(null)}
        title="Hapus tempat usaha?"
        description={
          deletingBiz
            ? `Tempat usaha "${deletingBiz.name} (${deletingBiz.branch_name})" beserta seluruh riwayat analisisnya akan dihapus permanen.`
            : ''
        }
        footer={
          <>
            <Button type="button" variant="secondary" size="md" className="!rounded-md" onClick={() => setDeletingBiz(null)}>
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
          Tindakan ini tidak dapat dibatalkan. Pastikan kamu sudah mengunduh lembar pengukuran atau laporan yang diperlukan.
        </p>
      </Dialog>
    </div>
  );
}
