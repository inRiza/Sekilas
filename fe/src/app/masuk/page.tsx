'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { SekilasLogo } from '@/components/brand/logo';
import { SekilasMascot } from '@/components/brand/mascot';
import {
  setDemoUserSession,
  signInWithEmailPassword,
  signInWithGoogleOAuth,
} from '@/lib/auth/use-auth';
import { CURRENT_USER } from '@/lib/mock/business';

const HIGHLIGHTS = [
  'Temukan titik pelanggan ragu dan pergi',
  'Lihat bukti di setiap temuan lewat frame video',
  'Dapat saran perbaikan yang diurutkan berdasarkan dampak',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { error } = await signInWithEmailPassword(email, password);
      if (error) {
        setErrorMessage(error);
        return;
      }
      router.push('/businesses');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const { error } = await signInWithGoogleOAuth();
    if (error) {
      setErrorMessage(error);
    }
  };

  const handleDemoLogin = () => {
    setDemoUserSession(CURRENT_USER);
    router.push('/businesses');
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
          <Link href="/" aria-label="Sekilas" className="mb-10 hidden w-fit transition hover:opacity-90 lg:inline-block">
            <SekilasLogo size={28} />
          </Link>

          <h1 className="text-[30px] font-normal tracking-[-0.03em] text-ink">Masuk ke akun Anda</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Lanjutkan analisis tempat usaha Anda.</p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 rounded-md border border-friction/30 bg-friction-10 px-3.5 py-2.5 text-xs leading-relaxed text-friction"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                Email
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
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-[13px] font-medium text-ink-soft">
                  Kata sandi
                </label>
                <span className="text-xs text-muted">Minimal 8 karakter</span>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink shadow-xs transition placeholder:text-subtle focus:border-primary-40 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-2 flex h-11 w-full items-center justify-center rounded-md text-sm font-medium text-white shadow-xs transition disabled:opacity-70"
            >
              {isLoading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hairline" />
            </div>
            <span className="relative bg-white px-3 font-mono text-[11px] text-subtle">atau lanjutkan dengan</span>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink shadow-xs transition hover:bg-panel"
            >
              <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Lanjutkan dengan Google
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="flex h-10 w-full items-center justify-center rounded-md border border-dashed border-line bg-panel/60 px-4 text-xs font-medium text-muted transition hover:bg-panel hover:text-ink"
            >
              Masuk cepat sebagai Akun Demo (Selasar Kopi)
            </button>
          </div>

          <p className="mt-8 text-center text-[13px] text-muted">
            Belum punya akun?{' '}
            <Link href="/daftar" className="font-medium text-primary-40 hover:underline">
              Daftar sekarang
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
            Insight untuk usahamu
          </p>

          <div className="relative">
            <SekilasMascot size={220} className="-ml-3" />
            <h2 className="mt-6 max-w-md text-[40px] leading-[1.08] font-normal tracking-[-0.04em] xl:text-[46px]">
              Tahu di mana pelanggan ragu, dari satu video.
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

          <p className="relative text-xs text-primary-20">Simulator pengunjung untuk UMKM makanan</p>
        </div>
      </div>
    </div>
  );
}
