import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { FunnelCard } from "./funnel-card";
import { Reveal } from "./reveal";
import { TwinPreview } from "./twin-preview";

const START_HREF = "/analisis/baru";

/* ---------- Primitif ---------- */

function ArrowRight({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M4 10h12m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrimaryButton({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-primary-45 bg-[linear-gradient(180deg,rgb(255_255_255/0.12),transparent)] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[var(--shadow-button)] transition hover:bg-primary-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-40 ${className}`}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function GhostButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-semibold text-primary-50 ring-1 ring-primary-20 transition hover:bg-primary-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-40"
    >
      {children}
    </Link>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold text-primary-50">{children}</p>;
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-[28px] font-semibold leading-10 text-gray-70 sm:text-4xl sm:leading-[48px]">{title}</h2>
      {body && <p className="mt-4 text-base leading-7 text-gray-50 sm:text-lg">{body}</p>}
    </Reveal>
  );
}

/* ---------- Navbar ---------- */

const NAV = [
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#dasbor", label: "Dasbor" },
  { href: "#rekomendasi", label: "Rekomendasi" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-20/70 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold text-primary-50">
          <span className="grid size-7 place-items-center rounded-lg bg-primary-40 text-xs font-bold text-white">S</span>
          Sekilas
        </Link>
        <ul className="hidden items-center gap-8 text-sm font-medium text-gray-50 md:flex">
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="transition hover:text-gray-70">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href={START_HREF}
          className="rounded-full bg-primary-40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-50"
        >
          Mulai Analisis
        </Link>
      </nav>
    </header>
  );
}

/* ---------- Hero ---------- */

const HERO_POINTS = [
  "Satu video dari pintu masuk, dengan panduan titik periksa",
  "Transkrip kejadian yang bisa kamu periksa dulu",
  "Laporan singkat: mana yang perlu diperbaiki dulu",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_70%_30%,var(--color-primary-10),transparent)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-20">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-10 px-3 py-1 text-xs font-semibold text-primary-50">
            <span className="size-1.5 rounded-full bg-primary-40" />
            Untuk UMKM makanan
          </span>
          <h1 className="mt-5 text-[34px] font-bold leading-[42px] tracking-tight text-gray-70 sm:text-5xl sm:leading-[58px]">
            Tahu di mana pelanggan ragu, dari satu video
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-gray-50">
            Rekam satu kali dari depan tempatmu. Kami membantu menemukan titik gesekan dan saran perubahan
            yang paling berdampak, dengan bahasa sehari-hari dan tanpa istilah rumit.
          </p>
          <ul className="mt-6 space-y-3">
            {HERO_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-base leading-6 text-gray-60">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-40" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton href={START_HREF}>Mulai Analisis</PrimaryButton>
            <GhostButton href="#cara-kerja">Lihat cara kerja</GhostButton>
          </div>
          <p className="mt-4 text-xs text-gray-30">Ini hasil simulasi, bukan jumlah pelanggan nyata.</p>
        </Reveal>

        <div className="relative">
          <Reveal delay={120}>
            <TwinPreview className="shadow-[var(--shadow-card)] ring-1 ring-primary-20" />
          </Reveal>
          <FunnelCard className="relative z-10 -mt-10 ml-auto w-[88%] sm:-mt-16 sm:w-[70%]" />
        </div>
      </div>
    </section>
  );
}

/* ---------- Angka ringkas ---------- */

const STATS = [
  { value: "1", unit: "video", label: "Rekam 1–2 menit dari jalan sampai kasir" },
  { value: "500", unit: "agen", label: "Pengunjung sintetis dengan sifat berbeda" },
  { value: "<15", unit: "menit", label: "Dari rekam video sampai dasbor siap" },
  { value: "80/20", unit: "", label: "Rekomendasi diurutkan dampak terbesar dulu" },
];

export function Stats() {
  return (
    <section className="border-y border-gray-20 bg-gray-10/60">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 sm:px-8 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 80} className="px-2 py-8 sm:px-6">
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <p className="text-3xl font-bold tracking-tight text-gray-70">
                {s.value}
                {s.unit && <span className="ml-1 text-base font-semibold text-primary-40">{s.unit}</span>}
              </p>
              <p className="mt-1.5 text-sm leading-5 text-gray-50">{s.label}</p>
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

/* ---------- Cara kerja ---------- */

const STEPS = [
  {
    title: "Isi konteks usaha",
    body: "Jenis usaha, menu dan harga, jam buka, jam ramai. Foto menu bisa dibaca otomatis.",
  },
  {
    title: "Rekam tempat usaha",
    body: "Jalan pelan dari sisi jalan sampai kasir. Panduan titik periksa muncul di layar, wajah otomatis diburamkan.",
  },
  {
    title: "Periksa transkrip",
    body: "Setiap kejadian punya bukti frame video. Kamu yang memutuskan mana yang benar sebelum simulasi.",
  },
  {
    title: "Dapatkan insight",
    body: "500 agen sintetis mengunjungi tempatmu. Hasilnya dasbor dengan titik gesekan dan saran perbaikan.",
  },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
        <Reveal className="order-last flex justify-center rounded-3xl bg-primary-10 p-10 lg:order-first">
          <Image
            src="/illustrations/asking-question.svg"
            alt="Ilustrasi pemilik usaha bertanya-tanya kenapa pelanggan ragu"
            width={220}
            height={164}
            className="h-auto w-full max-w-[320px]"
          />
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>Cara kerja</Eyebrow>
            <h2 className="mt-3 text-[28px] font-semibold leading-10 text-gray-70 sm:text-4xl sm:leading-[48px]">
              Kenali alasan pelanggan ragu datang ke tokomu
            </h2>
          </Reveal>

          <ol className="relative mt-8 space-y-3">
            <span aria-hidden className="absolute bottom-6 left-[5px] top-6 w-px bg-primary-20" />
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 90} className="relative flex items-center gap-4">
                <span className="relative z-10 size-3 shrink-0 rounded-full border-2 border-primary-40 bg-white" />
                <div className="flex-1 rounded-lg bg-white p-4 shadow-[var(--shadow-card)]">
                  <p className="text-sm font-semibold text-gray-70">
                    <span className="mr-2 text-primary-40">0{i + 1}</span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-gray-50">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- Dasbor + Visual Twin ---------- */

const FINDINGS = [
  "Keraguan terbesar terjadi di dasar tangga karena plang menu dan jam buka tidak terlihat dari jalan.",
  "Calon pengunjung mengira lantai 2 bukan untuk umum atau sedang tutup.",
  "Pengunjung terbantu saat ada kepastian kisaran harga sebelum melangkah masuk.",
];

const LAYERS = ["Kejadian", "Gesekan", "Agen", "Rekomendasi"];

export function DashboardShowcase() {
  return (
    <section id="dasbor" className="bg-gray-10/60 py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Dasbor analitik"
          title="Lihat masalahnya tepat di lokasinya"
          body="Video diubah menjadi Visual Twin, peta 3D sederhana dari jalur yang kamu rekam. Titik ragu pengunjung tampil langsung di tempat terjadinya."
        />

        <Reveal className="mt-14 overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-gray-20">
          {/* Toolbar dasbor */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-20 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-gray-20" />
              <span className="size-2.5 rounded-full bg-gray-20" />
              <span className="size-2.5 rounded-full bg-gray-20" />
              <p className="ml-3 text-sm font-semibold text-gray-70">Laporan Analisis</p>
            </div>
            <div className="flex gap-1 rounded-full bg-gray-10 p-1 text-xs font-medium">
              {["Normal", "Jam ramai", "Hujan"].map((s, i) => (
                <span
                  key={s}
                  className={`rounded-full px-3 py-1 ${i === 0 ? "bg-white text-gray-70 shadow-sm" : "text-gray-50"}`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 divide-y divide-gray-20 border-b border-gray-20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Kpi label="Tahap gesekan terbesar" value="Naik tangga" tone="friction" />
            <Kpi label="Faktor utama" value="Jam buka tak terlihat" />
            <Kpi label="Peluang naik jika diperbaiki" value="+25–39%" tone="impact" />
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_1fr] lg:p-6">
            <div>
              <TwinPreview />
              <div className="mt-3 flex flex-wrap gap-2">
                {LAYERS.map((layer, i) => (
                  <span
                    key={layer}
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                      i < 2 ? "bg-primary-10 text-primary-50 ring-primary-20" : "text-gray-50 ring-gray-20"
                    }`}
                  >
                    {layer}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-70">3 temuan utama</p>
              <ol className="mt-3 space-y-2.5">
                {FINDINGS.map((f, i) => (
                  <li key={f} className="flex gap-3 rounded-xl p-3 ring-1 ring-gray-20">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-10 text-xs font-semibold text-primary-50">
                      {i + 1}
                    </span>
                    <p className="text-[13px] leading-5 text-gray-60">{f}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>
        <p className="mt-4 text-center text-xs text-gray-30">Contoh tampilan. Angka berupa rentang hasil simulasi.</p>
      </div>
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "friction" | "impact" }) {
  const color = tone === "friction" ? "text-friction" : tone === "impact" ? "text-impact" : "text-gray-70";
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-gray-50">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

/* ---------- Rekomendasi Pareto ---------- */

const RECS = [
  {
    rank: 1,
    tag: "Prioritas tinggi · dampak besar, usaha kecil",
    tagTone: "impact",
    title: "Pasang standing banner menu dan jam buka di dasar tangga",
    body: "Menunjukkan harga dan status buka sebelum pengunjung memutuskan naik.",
    impact: "+32% naik tangga",
    effort: "Rendah (±Rp150rb)",
  },
  {
    rank: 2,
    tag: "Prioritas tinggi · tanpa biaya",
    tagTone: "primary",
    title: "Buka pintu tangga dan nyalakan lampu",
    body: "Menghilangkan kesan lantai 2 tertutup atau kantor pribadi.",
    impact: "+18% trafik masuk",
    effort: "Sangat rendah (nol)",
  },
  {
    rank: 3,
    tag: "Nanti",
    tagTone: "muted",
    title: "Papan petunjuk 'Buka di Lantai 2' setinggi mata",
    body: "Membantu pejalan kaki di trotoar depan menemukan pintu masuk.",
    impact: "+14% navigasi",
    effort: "Rendah",
  },
] as const;

const TAG = {
  impact: "bg-impact-10 text-impact ring-impact/20",
  primary: "bg-primary-10 text-primary-50 ring-primary-20",
  muted: "bg-gray-10 text-gray-50 ring-gray-20",
} as const;

export function Recommendations() {
  return (
    <section id="rekomendasi" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <SectionHeading
        eyebrow="Rekomendasi Pareto 80/20"
        title="Kerjakan yang paling berdampak dulu"
        body="Setiap saran diuji ulang lewat simulasi, bukan opini. Yang ditandai Prioritas mencakup sekitar 80% dampak dengan usaha paling kecil."
      />

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {RECS.map((rec, i) => (
          <Reveal
            key={rec.rank}
            delay={i * 100}
            className="flex flex-col rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-gray-20 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${TAG[rec.tagTone]}`}>
                {rec.tag}
              </span>
              <span className="text-sm font-semibold text-primary-40">#{rec.rank}</span>
            </div>
            <h3 className="mt-4 text-base font-semibold leading-6 text-gray-70">{rec.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-5 text-gray-50">{rec.body}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-gray-10 p-3">
                <p className="text-[11px] text-gray-50">Prediksi dampak</p>
                <p className="mt-0.5 text-sm font-semibold text-impact">{rec.impact}</p>
              </div>
              <div className="rounded-lg bg-gray-10 p-3">
                <p className="text-[11px] text-gray-50">Estimasi usaha</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-70">{rec.effort}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Kepercayaan ---------- */

const TRUST = [
  { title: "Bukti di setiap temuan", body: "Klik temuan, langsung lihat frame video dan lokasinya di Visual Twin." },
  { title: "Kamu yang memegang kendali", body: "Transkrip diperiksa dan dikoreksi pemilik sebelum simulasi berjalan." },
  { title: "Privasi dijaga", body: "Wajah dan plat nomor diburamkan di ponselmu sebelum video diunggah." },
];

export function Trust() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <div className="grid gap-5 md:grid-cols-3">
        {TRUST.map((t, i) => (
          <Reveal key={t.title} delay={i * 80} className="rounded-2xl p-6 ring-1 ring-gray-20">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-10 text-primary-40">
              <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
                <path d="m5 10.5 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="mt-4 text-base font-semibold text-gray-70">{t.title}</h3>
            <p className="mt-1.5 text-sm leading-5 text-gray-50">{t.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-6 flex items-start gap-3 rounded-2xl bg-gray-10 p-5 text-sm leading-5 text-gray-60">
        <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 size-4 shrink-0 text-gray-50" aria-hidden>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 9v5M10 6.5v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <p>
          <b className="font-semibold text-gray-70">Catatan:</b> hasil Sekilas adalah simulasi 500 agen sintetis sebagai
          hipotesis titik gesekan, bukan prediksi jumlah pelanggan atau omzet. Dasbor juga memberi rencana pengukuran
          sederhana supaya kamu bisa membuktikannya sendiri.
        </p>
      </Reveal>
    </section>
  );
}

/* ---------- CTA + Footer ---------- */

export function CtaBand() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
      <Reveal className="relative grid items-center gap-8 overflow-hidden rounded-3xl bg-primary-45 px-8 py-12 text-white sm:px-12 md:grid-cols-[1fr_auto]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative">
          <h2 className="text-[28px] font-semibold leading-10 sm:text-4xl sm:leading-[48px]">
            Cukup satu video untuk mulai
          </h2>
          <p className="mt-3 max-w-lg text-base leading-6 text-white/80">
            Temukan titik gesekan dan peluang perbaikan pada tempat usahamu dalam kurang dari 15 menit.
          </p>
        </div>
        <div className="relative flex items-center gap-6">
          <Image
            src="/illustrations/video-check.svg"
            alt=""
            width={200}
            height={167}
            className="hidden h-auto w-28 rounded-2xl bg-white p-3 lg:block"
          />
          <Link
            href={START_HREF}
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-primary-50 transition hover:bg-primary-10"
          >
            Analisis Sekarang
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-gray-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-semibold text-primary-50">Sekilas</p>
        <p>Simulator pengunjung untuk UMKM makanan.</p>
      </div>
    </footer>
  );
}
