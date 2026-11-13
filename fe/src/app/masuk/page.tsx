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
      router.push('/businesses');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Sisi Kiri: Form Login (~50% width) */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto lg:mx-0 w-full">
        <div>
          <Link href="/" className="inline-block hover:opacity-90 transition mb-10">
            <SekilasLogo size={26} />
          </Link>

          <div className="max-w-sm">
            <h1 className="text-2xl sm:text-[30px] font-normal tracking-[-0.03em] text-ink">
              Masuk ke akun Anda
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-1.5 leading-relaxed">
              Lanjutkan analisis simulasi tata letak bisnis Anda.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Email
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-ink-soft">
                    Kata sandi
                  </label>
                  <a href="#" className="text-[11px] text-muted hover:text-ink">
                    Lupa kata sandi?
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-xs sm:text-sm text-ink placeholder:text-subtle focus:border-primary-40 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full h-10 rounded-md text-xs sm:text-sm font-semibold text-white shadow-xs flex items-center justify-center transition disabled:opacity-70"
                >
                  {isLoading ? 'Memproses...' : 'Masuk'}
                </button>
              </div>
            </form>

            {/* Social Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-hairline" />
              </div>
              <span className="relative bg-white px-3 text-[11px] text-subtle font-mono">
                atau lanjutkan dengan
              </span>
            </div>

            {/* Social Login Button */}
            <button
              type="button"
              onClick={() => router.push('/businesses')}
              className="w-full h-10 rounded-md border border-line bg-white px-4 text-xs font-medium text-ink hover:bg-panel transition shadow-xs flex items-center justify-center gap-2"
            >
              <svg className="size-4" viewBox="0 0 24 24">
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
              <span>Lanjutkan dengan Google</span>
            </button>

            <p className="mt-8 text-xs text-muted">
              Belum punya akun?{' '}
              <Link href="/daftar" className="text-primary-40 font-semibold hover:underline">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>

        <div className="pt-8 text-[11px] text-subtle font-mono">
          Sekilas © 2026 · Simulator Calon Pelanggan F&B
        </div>
      </div>

      {/* Sisi Kanan: Showcase Split-Screen (~50% width, Visual Netral Figma) */}
      <div className="hidden lg:flex flex-1 bg-panel border-l border-line p-12 lg:p-16 flex-col justify-between items-center relative overflow-hidden">
        <div className="w-full max-w-md my-auto space-y-6">
          <SekilasMascot size={90} pose="happy" className="mb-2" />

          <div className="rounded-[10px] border border-line bg-white p-6 shadow-sm space-y-3">
            <span className="font-mono text-[10px] uppercase font-semibold text-impact bg-impact/10 px-2 py-0.5 rounded-full">
              Akurasi Simulasi Ruang
            </span>
            <p className="text-base font-semibold text-ink leading-snug">
              "96% akurasi estimasi kebocoran pelanggan fisik sebelum renovasi toko."
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Model diskret dan agen GPT-6 Luna memetakan hambatan visibilitas trotoar langsung dari 1 rekaman video 48 detik.
            </p>
          </div>

          <div className="rounded-[10px] border border-line bg-white/70 p-4 flex items-center justify-between text-xs">
            <span className="text-muted">Simulasi demo saat ini:</span>
            <span className="font-mono font-semibold text-primary-40">20 Agen Sintetis</span>
          </div>
        </div>

        <div className="text-[11px] text-muted font-mono">
          Teknologi simulasi agen berbasis rekaman fisik nyata
        </div>
      </div>
    </div>
  );
}
