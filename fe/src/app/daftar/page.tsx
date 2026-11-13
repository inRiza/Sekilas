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
  const [agreed, setAgreed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setIsLoading(true);
    setTimeout(() => {
      router.push('/businesses?baru=1');
    }, 450);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Sisi Kiri: Form Register Split-screen (~50% width) */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto lg:mx-0 w-full">
        <div>
          <Link href="/" className="inline-block hover:opacity-90 transition mb-8">
            <SekilasLogo size={26} />
          </Link>

          <div className="max-w-sm">
            <h1 className="text-2xl sm:text-[30px] font-normal tracking-[-0.03em] text-ink">
              Mulai analisis gratis
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-1 leading-relaxed">
              Simulasikan perilaku pelanggan di ruang fisik usaha Anda.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Nama lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi Pratama"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs sm:text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Nama usaha
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Kopi Sejahtera, Toko Berkah..."
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs sm:text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Email kerja
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@usaha.com"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs sm:text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Kata sandi
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs sm:text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-primary-40 focus:ring-primary-40 size-3.5 cursor-pointer"
                />
                <label htmlFor="terms" className="text-[11px] text-muted leading-tight cursor-pointer">
                  Saya menyetujui Syarat & Ketentuan serta Kebijakan Privasi Sekilas (termasuk pemburaman otomatis wajah & plat nomor).
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !agreed}
                  className="btn-primary w-full h-10 rounded-md text-xs sm:text-sm font-semibold text-white shadow-xs flex items-center justify-center transition disabled:opacity-70"
                >
                  {isLoading ? 'Menyiapkan akun...' : 'Buat Akun'}
                </button>
              </div>
            </form>

            <p className="mt-6 text-xs text-muted">
              Sudah punya akun?{' '}
              <Link href="/masuk" className="text-primary-40 font-semibold hover:underline">
                Masuk
              </Link>
            </p>
          </div>
        </div>

        <div className="pt-6 text-[11px] text-subtle font-mono">
          Sekilas © 2026 · Simulator Calon Pelanggan F&B
        </div>
      </div>

      {/* Sisi Kanan: Showcase Split-screen */}
      <div className="hidden lg:flex flex-1 bg-panel border-l border-line p-12 lg:p-16 flex-col justify-between items-center relative overflow-hidden">
        <div className="w-full max-w-md my-auto space-y-6">
          <SekilasMascot size={90} pose="waving" className="mb-2" />

          <div className="rounded-[10px] border border-line bg-white p-6 shadow-sm space-y-3">
            <span className="font-mono text-[10px] uppercase font-semibold text-primary-40 bg-primary-10 px-2 py-0.5 rounded-full">
              Satu Video · 20 Agen Demo
            </span>
            <p className="text-base font-semibold text-ink leading-snug">
              Temukan di titik mana calon pembeli Anda ragu lalu putar balik.
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Cukup rekam trotoar depan hingga kasir sekali saja. Tanpa sensor mahal, tanpa wawancara manual yang melelahkan.
            </p>
          </div>

          <div className="rounded-[10px] border border-line bg-white/70 p-4 flex items-center justify-between text-xs">
            <span className="text-muted">Target jenis usaha:</span>
            <span className="font-mono font-medium text-ink">Warung, Kafe, Kedai, Resto Ruko</span>
          </div>
        </div>

        <div className="text-[11px] text-muted font-mono">
          Privasi terjamin: Wajah & plat nomor diburamkan di perangkat Anda
        </div>
      </div>
    </div>
  );
}
