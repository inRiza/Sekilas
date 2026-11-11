import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/landing/sections";
import { listTwinResults, type TwinResult } from "@/lib/twin-results";

export const metadata: Metadata = {
  title: "Hasil — Sekilas",
};

function formatDuration(s: number) {
  return s >= 60 ? `${Math.floor(s / 60)} mnt ${s % 60} dtk` : `${s} dtk`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function ResultCard({ result }: { result: TwinResult }) {
  const href = (file: string) => `/dasbor?src=${encodeURIComponent(`/samples/${file}`)}`;
  const ply = result.files.find((f) => f.endsWith(".ply"));
  const splat = result.files.find((f) => f.endsWith(".splat"));
  const main = splat ?? ply!;

  return (
    <article className="flex flex-col rounded-[10px] border border-line bg-white">
      <Link href={href(main)} className="group block flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg tracking-[-0.02em] text-ink group-hover:text-primary-40">{result.name}</h2>
          <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-muted">
            {splat ? "splat + titik" : "awan titik"}
          </span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-subtle">
          {result.video} · {formatDate(result.created_at)}
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4 text-[13px]">
          <div>
            <dt className="text-subtle">Frame</dt>
            <dd className="mt-0.5 text-ink">
              {result.registered}/{result.frames}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Titik</dt>
            <dd className="mt-0.5 text-ink">{result.points.toLocaleString("id-ID")}</dd>
          </div>
          <div>
            <dt className="text-subtle">Waktu</dt>
            <dd className="mt-0.5 text-ink">{formatDuration(result.seconds)}</dd>
          </div>
        </dl>
      </Link>
      <div className="flex gap-2 border-t border-hairline px-5 py-3 text-[13px]">
        {ply && (
          <Link href={href(ply)} className="rounded-md border border-line px-3 py-1.5 text-ink hover:bg-panel">
            Buka awan titik
          </Link>
        )}
        {splat && (
          <Link href={href(splat)} className="btn-primary rounded-md px-3 py-1.5 font-medium text-white">
            Buka splat
          </Link>
        )}
      </div>
    </article>
  );
}

async function ResultList() {
  await connection(); // baca ulang folder setiap request agar hasil baru langsung muncul
  const results = await listTwinResults();

  if (results.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-line bg-panel p-8 text-[14px] leading-6 text-muted md:col-span-2">
        Belum ada hasil. Jalankan pipeline lokal:
        <pre className="mt-3 overflow-x-auto rounded-md bg-white p-3 font-mono text-[12px] text-ink">
          cd twin{"\n"}./scripts/local_twin.sh testdata/south-building.mp4 south-building --fps 3
        </pre>
      </div>
    );
  }
  return results.map((r) => <ResultCard key={r.name} result={r} />);
}

export default function ResultsPage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-hairline bg-white/85 backdrop-blur-md">
        <div className="col flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-line">/</span>
            <span className="text-sm text-muted">Hasil</span>
          </div>
          <Link href="/dasbor" className="btn-primary rounded-md px-4 py-2 text-sm font-medium text-white">
            Analisis baru
          </Link>
        </div>
      </header>

      <main className="section flex-1">
        <div className="col py-10 sm:py-12">
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">Visual Twin</p>
          <h1 className="mt-3 text-[32px] leading-[1.1] tracking-[-0.035em] text-ink sm:text-[40px]">
            Pilih hasil untuk dibuka
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-muted">
            Setiap video yang selesai diproses muncul di sini. Klik kartu untuk membukanya di dasbor visualisasi.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dasbor"
              className="flex min-h-48 flex-col justify-between rounded-[10px] border border-dashed border-line p-5 transition hover:border-primary-40 hover:bg-primary-10/40"
            >
              <span className="grid size-9 place-items-center rounded-md border border-line bg-white text-lg text-primary-40">
                +
              </span>
              <div>
                <h2 className="text-lg tracking-[-0.02em] text-ink">Analisis baru</h2>
                <p className="mt-1 text-[13px] text-muted">Unggah video tempat usaha, lihat contoh scene.</p>
              </div>
            </Link>
            <Suspense
              fallback={<div className="min-h-48 animate-pulse rounded-[10px] border border-line bg-panel" />}
            >
              <ResultList />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
