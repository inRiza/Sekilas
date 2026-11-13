import Link from "next/link";
import type { ReactNode } from "react";

import { SekilasLogo } from "@/components/brand/logo";
import { FunnelCard } from "./funnel-card";
import { Reveal } from "./reveal";
import { TwinPreview } from "./twin-preview";

const START_HREF = "/analisis/selasar-kopi/konteks";
const EXAMPLE_HREF = "/analisis/selasar-kopi";

/* ---------- Primitif ---------- */

function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className="section">
      <div className={`col ${className}`}>{children}</div>
    </section>
  );
}

function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="btn-primary inline-flex h-11 min-w-40 items-center justify-center rounded-md px-6 text-[15px] font-medium text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-40"
    >
      {children}
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 min-w-40 items-center justify-center rounded-md border border-line bg-white px-6 text-[15px] text-ink transition hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-40"
    >
      {children}
    </Link>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">{children}</p>;
}

function Heading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`text-[32px] leading-[1.1] font-normal tracking-[-0.035em] text-ink sm:text-[44px] ${className}`}
    >
      {children}
    </h2>
  );
}

function Chip({ children, dot }: { children: ReactNode; dot?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[13px] text-ink">
      {dot && <span className={`size-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  );
}

/* ---------- Navbar ---------- */

const NAV = [
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#dasbor", label: "Dasbor" },
  { href: "#rekomendasi", label: "Rekomendasi" },
  { href: EXAMPLE_HREF, label: "Contoh Analisis" },
];

export function Logo() {
  return (
    <Link href="/" className="hover:opacity-90 transition">
      <SekilasLogo size={24} />
    </Link>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-white/85 backdrop-blur-md">
      <nav className="col flex h-14 items-center justify-between">
        <Logo />
        <ul className="hidden items-center gap-7 text-[15px] text-ink-soft md:flex">
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="transition hover:text-ink">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <Link
            href="/masuk"
            className="text-sm font-medium text-ink-soft hover:text-ink px-2 py-1 transition hidden sm:inline-block"
          >
            Masuk
          </Link>
          <Link
            href={START_HREF}
            className="btn-primary inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white shadow-xs"
          >
            Mulai Analisis
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ---------- Hero ---------- */

const PIPELINE = [
  { label: "1 video", dot: "bg-primary-40" },
  { label: "Transkrip kejadian" },
  { label: "20 agen demo" },
  { label: "Dasbor + Visual Twin" },
];

export function Hero() {
  return (
    <Section className="pb-16 pt-12 sm:pb-20 sm:pt-16">
      <Reveal className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[13px] text-muted">
          Untuk UMKM makanan
          <span className="h-3 w-px bg-line" />
          <span className="text-ink">Simulasi 20 agen demo</span>
        </span>
        <h1 className="mt-6 max-w-[15ch] text-[44px] leading-[1.02] font-normal tracking-[-0.045em] text-ink sm:text-[72px]">
          Tahu di mana pelanggan ragu, dari satu video.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-7 text-muted sm:text-xl">
          Rekam sekali dari depan tempatmu. Sekilas menunjukkan titik gesekan dan perbaikan paling berdampak.
        </p>
        <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <PrimaryButton href={START_HREF}>Mulai Analisis</PrimaryButton>
          <SecondaryButton href={EXAMPLE_HREF}>Lihat Contoh Analisis</SecondaryButton>
        </div>
      </Reveal>

      <Reveal delay={150} className="mt-16 overflow-hidden rounded-[10px] border border-line bg-white">
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-hairline px-4 py-3">
          {PIPELINE.map((step, i) => (
            <span key={step.label} className="flex items-center gap-2">
              {i > 0 && <span className="font-mono text-[12px] text-subtle">→</span>}
              <Chip dot={step.dot}>{step.label}</Chip>
            </span>
          ))}
        </div>
        <TwinPreview uid="hero" className="px-2 py-4 sm:px-6" />
      </Reveal>
    </Section>
  );
}

/* ---------- Pernyataan masalah ---------- */

export function Statement() {
  return (
    <Section className="py-20 sm:py-24">
      <Reveal>
        <p className="max-w-3xl text-[26px] leading-[1.25] tracking-[-0.03em] text-ink sm:text-[34px]">
          Pemilik hanya melihat pelanggan yang masuk.
          <br />
          Yang ragu lalu pergi tidak pernah tercatat.
          <br />
          <span className="text-muted">Padahal di situlah omzet hilang.</span>
        </p>
      </Reveal>
    </Section>
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
    body: "Jalan pelan dari sisi jalan sampai kasir. Titik periksa muncul di layar, wajah diburamkan otomatis.",
  },
  {
    title: "Periksa transkrip",
    body: "Setiap kejadian punya bukti frame video. Kamu yang memastikan sebelum simulasi berjalan.",
  },
  {
    title: "Dapatkan insight",
    body: "20 agen demo sintetis mengunjungi tempatmu. Hasilnya dasbor titik gesekan dan saran perbaikan.",
  },
];

export function HowItWorks() {
  return (
    <Section id="cara-kerja" className="py-20 sm:py-24">
      <Reveal>
        <Label>Cara kerja</Label>
        <Heading className="mt-4">Dari video ke keputusan.</Heading>
      </Reveal>

      <div className="mt-14 grid items-start gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <ol className="relative">
          <span aria-hidden className="absolute bottom-8 left-[4px] top-2 border-l border-dashed border-line" />
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 90} className="relative pb-10 pl-8 last:pb-0">
              <span className="absolute left-0 top-[7px] size-[9px] border border-subtle bg-white" />
              <p className="font-mono text-[11px] text-subtle">0{i + 1}</p>
              <h3 className="mt-1 text-xl tracking-[-0.02em] text-ink">{step.title}</h3>
              <p className="mt-2 max-w-sm text-[15px] leading-6 text-muted">{step.body}</p>
            </Reveal>
          ))}
        </ol>

        <div className="lg:sticky lg:top-24 lg:mt-2">
          <FunnelCard />
        </div>
      </div>
    </Section>
  );
}

/* ---------- Dasbor ---------- */

const FINDINGS = [
  "Keraguan terbesar terjadi di dasar tangga karena plang menu dan jam buka tidak terlihat dari jalan.",
  "Calon pengunjung mengira lantai 2 bukan untuk umum atau sedang tutup.",
  "Kepastian kisaran harga sebelum masuk membuat pengunjung lebih yakin naik.",
];

const KPIS = [
  { label: "Agen Membeli", value: "4 agen", sub: "20% dari 20 agen demo", tone: "text-impact" },
  { label: "Penurunan Terbesar", value: "v 65,5%", sub: "Dari Berhenti ke Masuk", tone: "text-friction" },
  { label: "Penyebab Utama Batal", value: "Menu & Harga", sub: "Peringkat #1 Isyarat", tone: "text-friction" },
  { label: "Potensi Omzet Lepas", value: "Rp 4,8 Jt", sub: "Estimasi lepas / bln", tone: "text-friction" },
];

export function DashboardShowcase() {
  return (
    <Section id="dasbor" className="py-20 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Heading>Lihat masalahnya tepat di lokasinya.</Heading>
        <p className="mt-5 text-[17px] leading-7 text-muted">
          Video diubah menjadi Visual Twin, peta 3D sederhana dari jalur yang kamu rekam. Titik ragu pengunjung tampil di
          tempat terjadinya.
        </p>
      </Reveal>

      <Reveal delay={120} className="mt-14 overflow-hidden rounded-[10px] border border-line bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-ink">Ringkasan Dasbor Analisis</p>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="hidden text-muted sm:inline">Skenario</span>
            <Chip dot="bg-primary-40">Normal (20 Agen)</Chip>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-hairline border-b border-hairline">
          {KPIS.map((k) => (
            <div key={k.label} className="p-4 sm:p-4.5 flex flex-col justify-between">
              <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted font-medium">{k.label}</dt>
              <dd className={`mt-1.5 text-xl sm:text-2xl font-bold font-mono tracking-tight ${k.tone}`}>{k.value}</dd>
              <p className="font-mono text-[11px] text-muted mt-1">{k.sub}</p>
            </div>
          ))}
        </dl>

        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="border-b border-hairline bg-panel/60 p-3 lg:border-b-0 lg:border-r">
            <TwinPreview uid="dash" />
          </div>
          <div className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-subtle">3 temuan utama</p>
            <ol className="mt-4 divide-y divide-hairline">
              {FINDINGS.map((f, i) => (
                <li key={f} className="flex gap-3 py-3.5 first:pt-0">
                  <span className="font-mono text-[12px] text-primary-40">0{i + 1}</span>
                  <p className="text-[14px] leading-[1.55] text-ink-soft">{f}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Reveal>
      <div className="mt-8 flex flex-col items-center justify-center gap-2">
        <Link
          href={EXAMPLE_HREF}
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-panel shadow-xs"
        >
          <span>Buka Contoh Analisis Lengkap (Selasar Kopi)</span>
          <span className="font-mono text-xs text-primary-40">→</span>
        </Link>
        <p className="font-mono text-[11px] text-subtle">
          Contoh nyata pemetaan video 48 detik dan simulasi 20 agen demo
        </p>
      </div>
    </Section>
  );
}

/* ---------- Rekomendasi ---------- */

const RECS = [
  {
    tag: "Prioritas",
    title: "Standing banner menu dan jam buka di dasar tangga",
    body: "Harga dan status buka terlihat sebelum pengunjung memutuskan naik.",
    impact: "+32% naik tangga",
    effort: "Rendah · ±Rp150rb",
  },
  {
    tag: "Prioritas",
    title: "Buka pintu tangga dan nyalakan lampu",
    body: "Menghilangkan kesan lantai 2 tertutup atau kantor pribadi.",
    impact: "+18% trafik masuk",
    effort: "Sangat rendah · nol",
  },
  {
    tag: "Nanti",
    title: "Papan 'Buka di Lantai 2' setinggi mata",
    body: "Membantu pejalan kaki di trotoar menemukan pintu masuk.",
    impact: "+14% navigasi",
    effort: "Rendah",
  },
];

export function Recommendations() {
  return (
    <Section id="rekomendasi" className="py-20 sm:py-24">
      <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
        <div>
          <Label>Rekomendasi 80/20</Label>
          <Heading className="mt-4">Kerjakan yang paling berdampak dulu.</Heading>
        </div>
        <p className="max-w-md text-[17px] leading-7 text-muted lg:justify-self-end">
          Setiap saran diuji ulang lewat simulasi, bukan opini. Prioritas mencakup sekitar 80% dampak dengan usaha
          paling kecil.
        </p>
      </Reveal>

      <div className="mt-14 grid overflow-hidden rounded-[10px] border border-line md:grid-cols-3">
        {RECS.map((rec, i) => (
          <Reveal
            key={rec.title}
            delay={i * 90}
            className="flex flex-col border-line p-6 not-last:border-b md:not-last:border-r md:not-last:border-b-0"
          >
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.06em]">
              <span className={rec.tag === "Prioritas" ? "text-primary-40" : "text-subtle"}>{rec.tag}</span>
              <span className="text-subtle">#{i + 1}</span>
            </div>
            <h3 className="mt-5 text-lg leading-snug tracking-[-0.02em] text-ink">{rec.title}</h3>
            <p className="mt-2 flex-1 text-[14px] leading-6 text-muted">{rec.body}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4 text-[13px]">
              <div>
                <dt className="text-subtle">Dampak</dt>
                <dd className="mt-0.5 text-impact">{rec.impact}</dd>
              </div>
              <div>
                <dt className="text-subtle">Usaha</dt>
                <dd className="mt-0.5 text-ink">{rec.effort}</dd>
              </div>
            </dl>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Kepercayaan ---------- */

const TRUST = [
  { title: "Bukti di setiap temuan", body: "Setiap temuan tertaut ke frame video dan lokasinya di Visual Twin." },
  { title: "Kamu yang memegang kendali", body: "Transkrip diperiksa pemilik sebelum simulasi berjalan." },
  { title: "Privasi dijaga", body: "Wajah dan plat nomor diburamkan di ponselmu sebelum diunggah." },
];

export function Trust() {
  return (
    <Section className="py-20 sm:py-24">
      <div className="grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-hairline">
        {TRUST.map((t, i) => (
          <Reveal key={t.title} delay={i * 80} className="md:px-8 md:first:pl-0 md:last:pr-0">
            <p className="font-mono text-[11px] text-subtle">0{i + 1}</p>
            <h3 className="mt-3 text-xl tracking-[-0.02em] text-ink">{t.title}</h3>
            <p className="mt-2 text-[15px] leading-6 text-muted">{t.body}</p>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-14 rounded-[10px] border border-line bg-panel px-5 py-4 text-[14px] leading-6 text-ink-soft">
        <span className="font-medium text-ink">Catatan.</span> Hasil Sekilas adalah simulasi agen sintetis berbasis probabilitas sebagai hipotesis titik gesekan fisik, bukan janji omzet. Dasbor dilengkapi simulator hipotesis perbaikan tata letak sebelum kamu renovasi toko.
      </Reveal>
    </Section>
  );
}

/* ---------- CTA + Footer ---------- */

export function CtaBand() {
  return (
    <Section className="py-24 sm:py-28">
      <Reveal className="flex flex-col items-center text-center">
        <Heading className="max-w-[18ch]">Cukup satu video untuk mulai.</Heading>
        <p className="mt-5 max-w-md text-[17px] leading-7 text-muted">
          Temukan titik gesekan dan peluang perbaikan tempat usahamu dalam kurang dari 15 menit.
        </p>
        <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <PrimaryButton href={START_HREF}>Mulai Analisis Tempat Usaha</PrimaryButton>
          <SecondaryButton href={EXAMPLE_HREF}>Lihat Contoh Hasil</SecondaryButton>
        </div>
      </Reveal>
    </Section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="col flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p className="font-mono text-[12px]">Simulator pengunjung untuk UMKM makanan</p>
      </div>
    </footer>
  );
}
