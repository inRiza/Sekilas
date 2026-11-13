'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { MOCK_BUSINESSES } from '@/lib/mock/business';
import { MOCK_ANALYSES } from '@/lib/mock/analyses';
import { Business, BusinessType } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/form';
import { Select, type SelectOption } from '@/components/ui/select';
import { StoreIcon, PlusIcon, FileTextIcon, SettingsIcon, ArrowRightIcon } from '@/components/ui/icons';

const CATEGORY_OPTIONS: SelectOption<BusinessType>[] = [
  { value: 'warung', label: 'Warung makan' },
  { value: 'kedai', label: 'Kedai kopi' },
  { value: 'kafe', label: 'Kafe santai' },
  { value: 'resto_ruko', label: 'Restoran ruko' },
];

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState<BusinessType>('kedai');

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewBizName('');
    setNewBranchName('');
    setNewAddress('');
    setNewCategory('kedai');
  }, []);

  const handleAddBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;

    const newBiz: Business = {
      id: `biz_${Date.now()}`,
      user_id: 'usr_01',
      name: newBizName,
      branch_name: newBranchName || 'Pusat',
      category: newCategory,
      address: newAddress || 'Alamat tempat usaha baru',
      context: {
        business_name: newBizName,
        business_type: newCategory,
        location_name: newAddress || 'Alamat tempat usaha baru',
        location_description: 'Akses masuk dari jalan raya',
        surroundings_type: 'jalan_utama',
        passersby: ['mahasiswa', 'pekerja_kantor'],
        business_goal: 'lebih_banyak_pembeli_baru',
        calculated_price_level: 'hemat',
        fixed_constraints: [],
        menu_items: [],
        opening_hours: { open: '08:00', close: '22:00' },
        rush_hours: [{ start: '12:00', end: '14:00' }],
      },
      created_at: new Date().toISOString(),
    };

    setBusinesses([...businesses, newBiz]);
    closeAddModal();
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
              const bizAnalyses = MOCK_ANALYSES.filter((a) => a.business_id === biz.id);

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
                      <span className="font-mono text-[11px] text-subtle">
                        {bizAnalyses.length} Analisis Video
                      </span>
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
                      <span className="text-muted">Konteks Usaha</span>
                      <span className="font-mono text-[11px] font-medium text-impact">
                        Lengkap (7/7 terisi)
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href="/businesses/analyses"
                      className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-panel transition"
                    >
                      <FileTextIcon size={13} className="text-muted" />
                      <span>Lihat Analisis</span>
                      <ArrowRightIcon size={13} className="text-muted" />
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/business/analysis/konteks"
                        className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-xs font-medium text-muted hover:text-ink hover:bg-panel transition"
                        title="Edit Konteks Usaha"
                      >
                        <SettingsIcon size={13} />
                        <span>Konteks</span>
                      </Link>

                      <Link
                        href="/business/analysis/video"
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
    </div>
  );
}
