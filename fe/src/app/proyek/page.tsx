'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppNavbar } from '@/components/layout/app-navbar';
import { SekilasMascot } from '@/components/brand/mascot';
import { MOCK_ANALYSES } from '@/lib/mock/analyses';
import { MOCK_BUSINESSES } from '@/lib/mock/business';
import { Analysis, Business } from '@/types/api';

export default function ProyekPage() {
  const [analyses] = useState<Analysis[]>(MOCK_ANALYSES);
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [activeBizId, setActiveBizId] = useState<string>(MOCK_BUSINESSES[0].id);
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);

  // New branch form state
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [copyFromBizId, setCopyFromBizId] = useState<string>(MOCK_BUSINESSES[0].id);

  const activeBiz = businesses.find((b) => b.id === activeBizId) || businesses[0];
  const filteredAnalyses = analyses.filter((a) => a.business_id === activeBizId || !a.business_id);

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const sourceBiz = businesses.find((b) => b.id === copyFromBizId) || activeBiz;
    const newBiz: Business = {
      id: `biz_${Date.now()}`,
      user_id: 'usr_01',
      name: sourceBiz.name,
      branch_name: newBranchName,
      category: sourceBiz.category,
      address: newBranchAddress || 'Alamat cabang baru',
      context: {
        ...sourceBiz.context,
        location_name: newBranchAddress || 'Alamat cabang baru',
        location_description: 'Akses cabang baru',
      },
      created_at: new Date().toISOString(),
    };

    setBusinesses([...businesses, newBiz]);
    setActiveBizId(newBiz.id);
    setShowNewBranchModal(false);
    setNewBranchName('');
    setNewBranchAddress('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="global" businessName={activeBiz.name} branchName={activeBiz.branch_name} />

      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-8">
          {/* Active Business Info Card */}
          <div className="rounded-[10px] border border-line bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-primary-40 bg-primary-10 px-2 py-0.5 rounded-full font-semibold">
                  Tempat Usaha Aktif
                </span>
                <span className="font-mono text-[11px] text-subtle capitalize">
                  {activeBiz.category}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-ink mt-1.5">
                {activeBiz.name}{' '}
                <span className="text-muted font-normal">· {activeBiz.branch_name}</span>
              </h1>
              <p className="text-xs text-muted mt-1">
                {activeBiz.address}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowNewBranchModal(true)}
                className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-panel transition shadow-xs"
              >
                + Tambah Cabang Baru
              </button>
              <Link
                href={`/analisis/selasar-kopi/konteks`}
                className="btn-primary inline-flex h-9 items-center rounded-md px-4 text-xs font-medium text-white shadow-xs transition"
              >
                + Rekam Video Baru
              </Link>
            </div>
          </div>

          {/* Section: Daftar Analisis Video */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-normal tracking-[-0.02em] text-ink">
                  Riwayat Analisis Video & Simulasi
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Setiap analisis memetakan satu video tempat usahamu dengan 500 agen calon pelanggan.
                </p>
              </div>
              <span className="font-mono text-[11px] text-subtle">
                {filteredAnalyses.length} analisis tercatat
              </span>
            </div>

            {/* Grid Kartu Analisis */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAnalyses.map((item) => {
                const isReady = item.status === 'ready';
                const isProcessing = item.status === 'processing';

                return (
                  <div
                    key={item.id}
                    className="rounded-[10px] border border-line bg-white p-5 flex flex-col justify-between hover:border-subtle hover:shadow-xs transition"
                  >
                    <div>
                      {/* Status pill & date */}
                      <div className="flex items-center justify-between mb-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium ${
                            isReady
                              ? 'bg-impact/10 text-impact border border-impact/20'
                              : isProcessing
                              ? 'bg-primary-10 text-primary-40 border border-primary-20 animate-pulse'
                              : 'bg-friction-10 text-friction border border-friction/20'
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${isReady ? 'bg-impact' : isProcessing ? 'bg-primary-40' : 'bg-friction'}`} />
                          {isReady ? 'Siap Dilihat' : isProcessing ? 'Sedang Memproses' : 'Kedaluwarsa'}
                        </span>
                        <span className="font-mono text-[11px] text-subtle">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-2">
                        <Link href={`/analisis/${item.id}`} className="hover:text-primary-40 transition">
                          {item.name}
                        </Link>
                      </h3>
                      <p className="text-[11px] font-mono text-muted mt-1">
                        n = {item.total_agents} agen · {item.quality_label || 'Kualitas video baik'}
                      </p>

                      {/* Temuan Ringkas */}
                      {isReady && (
                        <div className="mt-3.5 pt-3 border-t border-hairline space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-subtle font-mono text-[11px]">Titik Gesekan:</span>
                            <span className="font-medium text-friction">Tangga (v 65,5%)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-subtle font-mono text-[11px]">Peluang Kenaikan:</span>
                            <span className="font-medium text-impact">^ 14% – 22%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted">ID: {item.id}</span>
                      <Link
                        href={`/analisis/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-40 hover:underline"
                      >
                        <span>Buka Dasbor</span>
                        <span className="font-mono">→</span>
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Card Tambah Analisis Baru */}
              <Link
                href="/analisis/selasar-kopi/konteks"
                className="rounded-[10px] border border-dashed border-line bg-panel/40 p-5 flex flex-col items-center justify-center text-center hover:bg-panel hover:border-subtle transition min-h-[220px]"
              >
                <SekilasMascot size={52} className="opacity-75 mb-2" />
                <p className="text-xs font-semibold text-ink">Rekam Video Tempat Usaha Baru</p>
                <p className="text-[11px] text-muted max-w-[200px] mt-1">
                  Ambil 48 detik video untuk melihat titik ragu pembelimu.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-40">
                  <span>Mulai Wizard</span> <span className="font-mono">→</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Tambah Cabang Baru */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-[10px] border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-hairline mb-4">
              <h3 className="text-base font-semibold text-ink">Tambah Cabang / Usaha Baru</h3>
              <button
                type="button"
                onClick={() => setShowNewBranchModal(false)}
                className="text-subtle hover:text-ink font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Nama Cabang / Lokasi
                </label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Misal: Dago Atas / Cabang Sudirman"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink focus:border-primary-40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Alamat Lengkap Cabang
                </label>
                <input
                  type="text"
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="Misal: Jl. Ir. H. Juanda No. 185, Bandung"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink focus:border-primary-40 focus:outline-none"
                />
              </div>

              {/* Opsi Salin Data Konteks F1 */}
              <div className="rounded-md border border-line bg-panel p-3 text-xs">
                <label className="block font-medium text-ink mb-1.5">
                  Salin Data Menu & Konteks Usaha (F1)
                </label>
                <p className="text-[11px] text-muted mb-2">
                  Daftar menu, harga, jam buka, dan target pembeli akan otomatis disalin sehingga kamu tidak perlu mengetik ulang.
                </p>
                <select
                  value={copyFromBizId}
                  onChange={(e) => setCopyFromBizId(e.target.value)}
                  className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-xs text-ink focus:border-primary-40 focus:outline-none"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      Salin dari: {b.name} ({b.branch_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="px-3 py-1.5 rounded-md border border-line text-xs font-medium text-ink hover:bg-panel transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-1.5 rounded-md text-xs font-medium text-white shadow-xs transition"
                >
                  Simpan Cabang Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-hairline py-6 text-center text-xs text-subtle">
        <div className="col">
          Sekilas © 2026 · Simulator Calon Pelanggan untuk UMKM Makanan
        </div>
      </footer>
    </div>
  );
}
