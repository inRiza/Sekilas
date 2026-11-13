'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SekilasLogo } from '@/components/brand/logo';
import { SekilasMascot } from '@/components/brand/mascot';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      router.push('/proyek?baru=1');
    }, 450);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-hairline py-4">
        <div className="col flex items-center justify-between">
          <Link href="/">
            <SekilasLogo size={24} />
          </Link>
          <Link
            href="/masuk"
            className="text-xs font-medium text-muted hover:text-ink transition"
          >
            Sudah punya akun? <span className="text-primary-40 underline">Masuk</span>
          </Link>
        </div>
      </header>

      {/* Main Form Section */}
      <main className="section py-10 sm:py-14">
        <div className="col max-w-[480px] mx-auto">
          <div className="flex flex-col items-center text-center mb-7">
            <SekilasMascot size={74} pose="happy" className="mb-3.5" />
            <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
              Buat Akun Pemilik Usaha
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-1 max-w-sm">
              Satu akun untuk mengelola banyak tempat usaha dan cabang F&B milikmu.
            </p>
          </div>

          <div className="rounded-[10px] border border-line bg-white p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Nama Lengkap Pemilik
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Budi Santoso"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Nama Tempat Usaha Pertama
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Misal: Selasar Kopi & Roti"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition"
                />
                <p className="text-[11px] text-subtle mt-1">
                  Kamu bisa menambahkan cabang lain kapan saja nanti.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full h-10 rounded-md text-sm font-medium text-white shadow-xs flex items-center justify-center transition disabled:opacity-70"
                >
                  {isLoading ? 'Menyiapkan akun...' : 'Daftar & Lanjut ke Analisis'}
                </button>
              </div>
            </form>

            <p className="mt-5 text-[11px] text-center text-muted">
              Dengan mendaftar, kamu menyetujui privasi pemburaman otomatis wajah & plat nomor pada video.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline py-6 text-center text-xs text-subtle">
        <div className="col">
          Sekilas © 2026 · Simulator Calon Pelanggan untuk UMKM Makanan
        </div>
      </footer>
    </div>
  );
}
