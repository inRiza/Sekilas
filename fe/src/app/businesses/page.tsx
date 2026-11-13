'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppNavbar } from '@/components/layout/app-navbar';
import { MOCK_BUSINESSES } from '@/lib/mock/business';
import { MOCK_ANALYSES } from '@/lib/mock/analyses';
import { Business, BusinessType } from '@/types/api';
import { StoreIcon, PlusIcon, FileTextIcon, SettingsIcon, ArrowRightIcon } from '@/components/ui/icons';

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState<BusinessType>('kedai');

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
        nearby_competitors: '',
      },
      created_at: new Date().toISOString(),
    };

    setBusinesses([...businesses, newBiz]);
    setShowAddModal(false);
    setNewBizName('');
    setNewBranchName('');
    setNewAddress('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="global" />

      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-8">
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-hairline">
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
                  className="rounded-[10px] border border-line bg-white p-5 sm:p-6 shadow-xs hover:border-subtle transition flex flex-col justify-between"
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

                    <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs">
                      <span className="text-muted">Konteks Usaha (F1):</span>
                      <span className="font-mono text-[11px] font-medium text-impact">
                        Lengkap (7/7 terisi)
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-hairline flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href="/businesses/analyses"
                      className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-panel transition shadow-2xs"
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
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowAddModal(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md rounded-[10px] border border-line bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-semibold text-ink">Tambah Tempat Usaha Baru</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Daftarkan unit usaha atau cabang fisik baru untuk dianalisis simulasinya.
            </p>

            <form onSubmit={handleAddBusiness} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Nama Tempat Usaha</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Toko Djawa"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-2 text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Nama Cabang</label>
                <input
                  type="text"
                  placeholder="Contoh: Braga / Dago / Pusat"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-2 text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Kategori Usaha</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as BusinessType)}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-ink focus:border-primary-40 focus:outline-none shadow-2xs"
                >
                  <option value="kedai">Kedai Kopi / Teh</option>
                  <option value="kafe">Kafe / Bakery</option>
                  <option value="warung">Warung Makan / Kelontong</option>
                  <option value="resto_ruko">Restoran Ruko</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Alamat Fisik</label>
                <input
                  type="text"
                  placeholder="Jl. Braga No. 12, Bandung"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-2 text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none shadow-2xs"
                />
              </div>

              <div className="pt-3 border-t border-hairline flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md border border-line px-3 py-2 font-medium text-ink hover:bg-panel transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary rounded-md px-4 py-2 font-semibold text-white shadow-xs transition"
                >
                  Simpan Tempat Usaha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-hairline py-6 text-center text-xs text-subtle">
        <div className="w-full px-4 sm:px-8">
          Sekilas © 2026 · Simulator Calon Pelanggan untuk UMKM Makanan
        </div>
      </footer>
    </div>
  );
}
