'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppNavbar } from '@/components/layout/app-navbar';
import { MOCK_BUSINESSES } from '@/lib/mock/business';

export default function ProfilPage() {
  const [activeBiz, setActiveBiz] = useState(MOCK_BUSINESSES[0]);
  const [name, setName] = useState(activeBiz.name);
  const [branchName, setBranchName] = useState(activeBiz.branch_name);
  const [location, setLocation] = useState(activeBiz.address);
  const [desc, setDesc] = useState(activeBiz.context.location_description);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="global" businessName={name} branchName={branchName} />

      <main className="section flex-1 py-8 sm:py-12">
        <div className="col max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/proyek" className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 mb-2 font-mono">
                ← Kembali ke Daftar Analisis
              </Link>
              <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
                Profil Tempat Usaha (F1)
              </h1>
              <p className="text-xs text-muted mt-1">
                Konteks usaha ini akan otomatis mengisi formulir saat kamu membuat analisis video baru.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="rounded-[10px] border border-line bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold text-ink border-b border-hairline pb-3">
                Informasi Dasar Tempat Usaha
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Nama Usaha
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink focus:border-primary-40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Nama Cabang
                  </label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink focus:border-primary-40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Alamat Lengkap / Titik Peta
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink focus:border-primary-40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Deskripsi Letak & Akses Fisik
                </label>
                <textarea
                  rows={3}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Misal: Lantai 2 ruko warna abu-abu, tangga naik persis di sebelah minimarket."
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink focus:border-primary-40 focus:outline-none leading-relaxed"
                />
                <p className="text-[11px] text-subtle mt-1 font-mono">
                  Isyarat ini membantu agen simulasi memahami konteks akses yang terekam di video.
                </p>
              </div>

              <div className="pt-3 border-t border-hairline flex items-center justify-between">
                {isSaved ? (
                  <span className="font-mono text-xs text-impact font-medium">
                    ✓ Profil usaha berhasil disimpan
                  </span>
                ) : (
                  <span className="text-[11px] text-subtle font-mono">
                    Tersimpan otomatis di profil bisnis
                  </span>
                )}
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 rounded-md text-xs font-medium text-white shadow-xs transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </form>
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
