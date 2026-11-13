'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SekilasLogo } from '@/components/brand/logo';
import { SekilasMascot } from '@/components/brand/mascot';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('budi.selasar@gmail.com');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      router.push('/proyek');
    }, 400);
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
            href="/daftar"
            className="text-xs font-medium text-muted hover:text-ink transition"
          >
            Belum punya akun? <span className="text-primary-40 underline">Daftar</span>
          </Link>
        </div>
      </header>

      {/* Main Form Section */}
      <main className="section py-12 sm:py-16">
        <div className="col max-w-[460px] mx-auto">
          <div className="flex flex-col items-center text-center mb-8">
            <SekilasMascot size={76} pose="waving" className="mb-4" />
            <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
              Masuk ke Sekilas
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-1.5 max-w-xs">
              Akses hasil simulasi 500 calon pelanggan dan kelola tempat usahamu.
            </p>
          </div>

          <div className="rounded-[10px] border border-line bg-white p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@usaha.com"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-ink-soft">
                    Kata Sandi
                  </label>
                  <a href="#" className="text-[11px] text-muted hover:text-ink">
                    Lupa sandi?
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full h-10 rounded-md text-sm font-medium text-white shadow-xs flex items-center justify-center transition disabled:opacity-70"
                >
                  {isLoading ? 'Memproses...' : 'Masuk ke Dashboard'}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-hairline text-center">
              <p className="text-[11px] text-muted">
                Atau langsung coba tanpa login:{' '}
                <Link
                  href="/analisis/selasar-kopi"
                  className="text-primary-40 font-medium hover:underline"
                >
                  Buka Contoh Analisis
                </Link>
              </p>
            </div>
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
