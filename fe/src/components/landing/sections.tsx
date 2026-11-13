import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Basket, Drawer, Loupe, Padlock } from "@lucasmarkes/hairline/react";

import { SekilasLogo } from "@/components/brand/logo";
import { MacbookScroll } from "@/components/ui/macbook-scroll";
import { FunnelCard } from "./funnel-card";
import { Reveal } from "./reveal";

const START_HREF = "/masuk";
const EXAMPLE_HREF = "#contoh";

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
      className="btn-primary group inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-md px-6 text-[15px] font-medium text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-40"
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
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

/* ---------- Navbar ---------- */

const NAV = [
  { href: "#cara-kerja", label: "Cara kerja" },
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
        <Link
          href={START_HREF}
          className="btn-primary group inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white shadow-xs"
        >
          Mulai Analisis
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </header>
  );
}

/* ---------- Hero ---------- */

export function Hero() {
  return (
    <Section className="overflow-clip">
      <MacbookScroll
        src="/landing/hero-dashboard.png"
        title={
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center rounded-full border border-line bg-white px-3 py-1 text-[13px] text-muted">
              Insight untuk usahamu
            </span>
            <h1 className="mt-6 max-w-5xl text-balance text-[44px] leading-[1.04] font-normal tracking-[-0.045em] sm:text-[60px] xl:text-[72px]">
              <span className="block text-ink">Tahu di mana pelanggan ragu,</span>
              <span className="block text-muted">dari satu video.</span>
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-7 text-muted">
              Rekam tempat usahamu. Sekilas menganalisis, menemukan hambatan, dan menunjukkan potensi perbaikan.
            </p>
            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <PrimaryButton href={START_HREF}>Mulai Analisis</PrimaryButton>
              <SecondaryButton href={EXAMPLE_HREF}>Lihat Contoh Analisis</SecondaryButton>
            </div>
          </div>
        }
      />
    </Section>
  );
}

/* ---------- Pernyataan masalah ---------- */

export function Statement() {
  return (
    <Section className="py-20 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <Reveal>
          <p className="max-w-3xl text-[26px] leading-[1.25] tracking-[-0.03em] text-ink sm:text-[34px]">
            Pemilik hanya melihat pelanggan yang masuk.
            <br />
            Yang tertarik, yang ragu, dan yang pergi.
            <br />
            <span className="text-muted">Padahal di situlah peluang omzet sebenarnya.</span>
          </p>
        </Reveal>
        <Reveal delay={120} className="hairline-sekilas mx-auto w-full max-w-sm">
          <Basket play intensity={0.6} label="Keranjang belanja kosong, pelanggan pergi tanpa membeli" />
        </Reveal>
      </div>
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

/* ---------- Contoh analisis ---------- */

export function ExampleAnalysis() {
  return (
    <Section id="contoh" className="py-20 sm:py-24">
      <Reveal>
        <Label>Contoh analisis</Label>
        <Heading className="mt-4">Seperti ini hasilnya.</Heading>
      </Reveal>
      <Reveal
        delay={100}
        className="mt-10 flex aspect-video items-center justify-center rounded-[10px] border border-dashed border-line bg-panel"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-subtle">Gambar contoh analisis</p>
      </Reveal>
    </Section>
  );
}

/* ---------- Kepercayaan ---------- */

const TRUST = [
  { title: "Bukti di setiap temuan", body: "Setiap temuan tertaut ke frame video dan lokasinya di Visual Twin.", Figure: Loupe, alt: "Kaca pembesar di atas lembar bukti" },
  { title: "Kamu yang memegang kendali", body: "Transkrip diperiksa pemilik sebelum simulasi berjalan.", Figure: Drawer, alt: "Laci yang dibuka satu per satu" },
  { title: "Privasi dijaga", body: "Wajah dan plat nomor diburamkan di ponselmu sebelum diunggah.", Figure: Padlock, alt: "Gembok yang terkunci" },
];

export function Trust() {
  return (
    <Section className="py-20 sm:py-24">
      <div className="grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-hairline">
        {TRUST.map((t, i) => (
          <Reveal key={t.title} delay={i * 80} className="md:px-8 md:first:pl-0 md:last:pr-0">
            <div className="hairline-sekilas mb-6 w-full max-w-[220px]">
              <t.Figure intensity={0.5} label={t.alt} />
            </div>
            <p className="font-mono text-[11px] text-subtle">0{i + 1}</p>
            <h3 className="mt-3 text-xl tracking-[-0.02em] text-ink">{t.title}</h3>
            <p className="mt-2 text-[15px] leading-6 text-muted">{t.body}</p>
          </Reveal>
        ))}
      </div>

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
