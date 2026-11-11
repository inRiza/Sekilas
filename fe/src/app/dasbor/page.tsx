import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { TwinWorkbench } from "@/components/dashboard/twin-workbench";
import { Logo } from "@/components/landing/sections";

export const metadata: Metadata = {
  title: "Dasbor — Sekilas",
};

async function WorkbenchFromUrl({ searchParams }: { searchParams: PageProps<"/dasbor">["searchParams"] }) {
  const { src } = await searchParams;
  return <TwinWorkbench initialSrc={typeof src === "string" ? src : undefined} />;
}

export default function DashboardPage({ searchParams }: PageProps<"/dasbor">) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-hairline bg-white/85 backdrop-blur-md">
        <div className="col flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-line">/</span>
            <span className="text-sm text-muted">Analisis baru</span>
          </div>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Kembali
          </Link>
        </div>
      </header>

      <main className="section flex-1">
        <div className="col py-10 sm:py-12">
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">Dasbor · placeholder</p>
          <h1 className="mt-3 text-[32px] leading-[1.1] tracking-[-0.035em] text-ink sm:text-[40px]">
            Video ke Visual Twin
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-muted">
            Unggah video tempat usaha di kiri. Hasil pemetaan 3D tampil di kanan. Untuk sekarang viewer memakai scene
            contoh; file <code className="font-mono text-[13px] text-ink">.ply</code> dari COLMAP atau{" "}
            <code className="font-mono text-[13px] text-ink">ns-export</code> dan{" "}
            <code className="font-mono text-[13px] text-ink">.splat</code> bisa dimuat langsung.
          </p>
          <div className="mt-10">
            <Suspense fallback={<TwinWorkbench />}>
              <WorkbenchFromUrl searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
