'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { MOCK_ANALYSES } from '@/lib/mock/analyses';
import { MOCK_BUSINESSES } from '@/lib/mock/business';
import { Analysis, Business } from '@/types/api';
import { PlusIcon, ArrowRightIcon, StoreIcon } from '@/components/ui/icons';

export default function BusinessAnalysesPage() {
  const [analyses] = useState<Analysis[]>(MOCK_ANALYSES);
  const [businesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [activeBizId] = useState<string>(MOCK_BUSINESSES[0].id);

  const activeBiz = businesses.find((b) => b.id === activeBizId) || businesses[0];
  const filteredAnalyses = analyses.filter((a) => a.business_id === activeBizId || !a.business_id);

  return (
    <div className="flex min-h-full flex-col justify-between bg-white">
      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-8">
          {/* Active Business Info Card */}
          <div className="rounded-xl border border-line bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-primary-40 bg-primary-10 px-2 py-0.5 rounded-full font-semibold">
                  Tempat Usaha Aktif
                </span>
                <span className="font-mono text-[11px] text-subtle capitalize">
                  {activeBiz.category}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-normal tracking-[-0.03em] text-ink mt-1.5 flex items-center gap-2">
                <StoreIcon size={20} className="text-muted shrink-0" />
                <span>{activeBiz.name}</span>
                <Badge size="md">{activeBiz.branch_name}</Badge>
              </h1>
              <p className="text-xs text-muted mt-1">
                {activeBiz.address}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/businesses"
                className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3.5 text-xs font-medium text-ink hover:bg-panel transition"
              >
                Ganti Tempat Usaha
              </Link>
              <Link
                href="/business/analysis/video"
                className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white shadow-xs transition"
              >
                <PlusIcon size={14} />
                <span>Buat Analisis Baru</span>
              </Link>
            </div>
          </div>

          {/* Section: Riwayat Analisis Video */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-normal tracking-[-0.02em] text-ink">
                  Daftar Analisis Video & Simulasi
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Daftar rekaman video dan hasil proyeksi titik gesekan untuk {activeBiz.name}.
                </p>
              </div>

              <span className="font-mono text-[11px] text-subtle">
                {filteredAnalyses.length} Analisis Terdaftar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnalyses.map((analysis) => {
                const isReady = analysis.status === 'ready';

                return (
                  <div
                    key={analysis.id}
                    className="group rounded-xl border border-line bg-white p-4 flex flex-col justify-between hover:!border-[#d3d7dd] transition"
                  >
                    <div>
                      {/* Status Tag & Date */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                            isReady
                              ? 'bg-impact/10 text-impact'
                              : 'bg-primary-10 text-primary-40'
                          }`}
                        >
                          {isReady ? 'Siap Ditinjau' : 'Memproses'}
                        </span>
                        <span className="font-mono text-[11px] text-subtle">
                          {new Date(analysis.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-ink line-clamp-2 leading-snug group-hover:text-primary-40 transition">
                        {analysis.name}
                      </h3>

                      <div className="mt-3 py-2 flex items-center justify-between text-xs text-muted">
                        <span className="font-mono text-[11px]">
                          {analysis.total_agents} Agen Demo
                        </span>
                        <span className="font-mono text-[11px] text-subtle">
                          {analysis.quality_label || 'Kualitas video baik'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 flex items-center justify-between">
                      {isReady ? (
                        <Link
                          href="/business/analysis"
                          className="btn-primary w-full h-8.5 rounded-md text-xs font-semibold text-white shadow-2xs flex items-center justify-center gap-1.5 transition"
                        >
                          <span>Buka Dasbor Hasil</span>
                          <ArrowRightIcon size={13} />
                        </Link>
                      ) : (
                        <Link
                          href="/business/analysis/proses"
                          className="w-full h-8.5 rounded-md border border-line bg-panel text-xs font-medium text-ink flex items-center justify-center gap-1.5 hover:bg-white transition"
                        >
                          <span>Lihat Status Proses AI</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
