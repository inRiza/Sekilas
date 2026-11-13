'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SekilasLogo } from '@/components/brand/logo';
import { SekilasMascot } from '@/components/brand/mascot';

const HIGHLIGHTS = [
  'Cukup rekam trotoar depan hingga kasir, sekali saja',
  'Tanpa sensor mahal dan wawancara manual',
  'Wajah dan plat nomor diburamkan di perangkat Anda',
];

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
      router.push('/proyek?baru=1');
    }, 450);
  };

  return (
    <div className="grid min-h-screen bg-white lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      {/* kiri: form, scroll sendiri agar panel kanan tidak bergeser oleh scrollbar */}
      <div className="flex min-h-screen flex-col px-6 py-6 sm:px-12 lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:px-16">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md py-1 text-[13px] text-muted transition hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Kembali ke beranda
          </Link>
          <Link href="/" aria-label="Sekilas" className="transition hover:opacity-90 lg:hidden">
            <SekilasLogo size={22} />
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <Link href="/" aria-label="Sekilas" className="mb-8 hidden w-fit transition hover:opacity-90 lg:inline-block">
            <SekilasLogo size={28} />
          </Link>

          <h1 className="text-[30px] font-normal tracking-[-0.03em] text-ink">Mulai analisis gratis</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Simulasikan perilaku pelanggan di ruang fisik usaha Anda.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                Nama lengkap
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Budi Pratama"
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-xs transition placeholder:text-subtle focus:border-primary-40 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="business" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                Nama usaha
              </label>
              <input
                id="business"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Kopi Sejahtera, Toko Berkah..."
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-xs transition placeholder:text-subtle focus:border-primary-40 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                Email kerja
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@usaha.com"
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-xs transition placeholder:text-subtle focus:border-primary-40 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                Kata sandi
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-xs transition placeholder:text-subtle focus:border-primary-40 focus:outline-none"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 size-4 cursor-pointer rounded accent-primary-40"
              />
              <label htmlFor="terms" className="cursor-pointer text-xs leading-5 text-muted">
                Saya menyetujui Syarat & Ketentuan serta Kebijakan Privasi Sekilas (termasuk pemburaman otomatis wajah
                & plat nomor).
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !agreed}
              className="btn-primary flex h-11 w-full items-center justify-center rounded-md text-sm font-medium text-white shadow-xs transition disabled:opacity-70"
            >
              {isLoading ? 'Menyiapkan akun...' : 'Buat Akun'}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] text-muted">
            Sudah punya akun?{' '}
            <Link href="/masuk" className="font-medium text-primary-40 hover:underline">
              Masuk
            </Link>
          </p>
        </div>

        <p className="font-mono text-[11px] text-subtle">Sekilas © 2026</p>
      </div>

      {/* kanan: panel biru */}
      <div className="hidden p-3 lg:block">
        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-linear-to-br from-primary-40 to-primary-50 p-12 text-white xl:p-16">
          <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full border border-white/15" />
          <div aria-hidden className="absolute -right-4 -top-4 size-96 rounded-full border border-white/10" />

          <p className="relative font-mono text-[11px] uppercase tracking-[0.08em] text-primary-20">
            Satu video untuk mulai
          </p>

          <div className="relative">
            <SekilasMascot size={220} className="-ml-3" />
            <h2 className="mt-6 max-w-md text-[40px] leading-[1.08] font-normal tracking-[-0.04em] xl:text-[46px]">
              Temukan di titik mana calon pembeli ragu.
            </h2>
            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-6 text-primary-10">
                  <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-white" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-primary-20">Cocok untuk warung, kafe, kedai, dan resto ruko</p>
        </div>
      </div>
    </div>
  );
}
