'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/app-navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Chip } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, ArrowRightIcon } from '@/components/ui/icons';
import { MOCK_CONTEXT } from '@/lib/mock/context';
import {
  BusinessType,
  SurroundingsType,
  PasserbyType,
  BusinessGoal,
  FixedConstraint,
  MenuItem,
} from '@/types/api';

function KonteksUsahaInner() {
  const params = useParams();
  const router = useRouter();
  const analysisId = (params?.id as string) || 'selasar-kopi';

  // State Form F1
  const [businessType, setBusinessType] = useState<BusinessType>(MOCK_CONTEXT.business_type);
  const [businessName, setBusinessName] = useState(MOCK_CONTEXT.business_name);
  const [locationName, setLocationName] = useState(MOCK_CONTEXT.location_name);
  const [locationDescription, setLocationDescription] = useState(MOCK_CONTEXT.location_description);

  const [surroundingsType, setSurroundingsType] = useState<SurroundingsType>(MOCK_CONTEXT.surroundings_type);
  const [passersby, setPassersby] = useState<PasserbyType[]>(MOCK_CONTEXT.passersby);
  const [businessGoal, setBusinessGoal] = useState<BusinessGoal>(MOCK_CONTEXT.business_goal);
  const [fixedConstraints, setFixedConstraints] = useState<FixedConstraint[]>(MOCK_CONTEXT.fixed_constraints);

  const [menuItems, setMenuItems] = useState<MenuItem[]>(MOCK_CONTEXT.menu_items);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');

  const [openHour, setOpenHour] = useState(MOCK_CONTEXT.opening_hours.open);
  const [closeHour, setCloseHour] = useState(MOCK_CONTEXT.opening_hours.close);
  const [rushStart, setRushStart] = useState(MOCK_CONTEXT.rush_hours[0]?.start || '12:00');
  const [rushEnd, setRushEnd] = useState(MOCK_CONTEXT.rush_hours[0]?.end || '14:00');
  const [nearbyCompetitors, setNearbyCompetitors] = useState(MOCK_CONTEXT.nearby_competitors || '');

  // Hitung Level Harga Otomatis dari Median Menu
  const priceLevel = useMemo(() => {
    if (menuItems.length === 0) return 'hemat';
    const sorted = [...menuItems].map((m) => m.price).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    if (median < 20000) return 'hemat';
    if (median <= 40000) return 'sedang';
    return 'premium';
  }, [menuItems]);

  // Validasi 7 Isian Wajib PRD v1.2:
  // 1. Jenis Usaha, 2. Lokasi Usaha, 3. Deskripsi Letak, 4. Tipe Sekitar, 5. Menu Items (>0), 6. Jam Buka, 7. Jam Ramai
  const validChecklist = useMemo(() => {
    return [
      Boolean(businessType),
      Boolean(locationName.trim()),
      Boolean(locationDescription.trim()),
      Boolean(surroundingsType),
      menuItems.length > 0,
      Boolean(openHour && closeHour && openHour < closeHour),
      Boolean(rushStart && rushEnd && rushStart >= openHour && rushEnd <= closeHour),
    ];
  }, [businessType, locationName, locationDescription, surroundingsType, menuItems, openHour, closeHour, rushStart, rushEnd]);

  const filledRequiredCount = validChecklist.filter(Boolean).length;
  const isAllValid = filledRequiredCount === 7;

  // Toggle Helpers
  const togglePasserby = (val: PasserbyType) => {
    setPassersby((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const toggleConstraint = (val: FixedConstraint) => {
    setFixedConstraints((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  const handleAddMenuItem = () => {
    const priceNum = parseInt(newMenuPrice.replace(/\D/g, ''), 10);
    if (!newMenuName.trim() || isNaN(priceNum) || priceNum <= 0) return;
    setMenuItems((prev) => [
      ...prev,
      { id: `m_${Date.now()}`, name: newMenuName.trim(), price: priceNum },
    ]);
    setNewMenuName('');
    setNewMenuPrice('');
  };

  const handleRemoveMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
  };

  const handleNext = () => {
    if (!isAllValid) return;
    router.push(`/business/analysis/video`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <AppNavbar mode="wizard" currentStep={1} analysisId={analysisId} businessName={businessName} />

      <main className="section flex-1 py-8 sm:py-12">
        <div className="col space-y-6">
        {/* Title & Progress Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 pb-3 border-b border-hairline">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-normal tracking-[-0.03em] text-ink">
              Konteks Usaha (F1)
            </h1>
            <p className="text-xs sm:text-[13px] text-muted mt-1">
              Data ini membantu model diskret membentuk 500 persona agen yang relevan dengan lokasimu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-semibold px-3 py-1 rounded-full ${
                isAllValid
                  ? 'bg-impact/10 text-impact border border-impact/20'
                  : 'bg-primary-10 text-primary-40 border border-primary-20'
              }`}
            >
              {filledRequiredCount} dari 7 isian wajib terisi
            </span>
          </div>
        </div>

        {/* Layout 2 Kolom (Desktop) / 1 Kolom (Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Kartu 1 & Kartu 2 (7 Kolom) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Kartu 1: Informasi Dasar */}
            <Card>
              <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
                <h2 className="text-base font-semibold text-ink">Kartu 1: Informasi Dasar</h2>
                <Badge variant="primary" size="sm">Wajib</Badge>
              </div>

              <div className="space-y-4">
                {/* Jenis Usaha */}
                <div>
                  <Label requiredText="wajib">Jenis Usaha</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['warung', 'Warung Makan'],
                        ['kedai', 'Kedai / Coffee Shop'],
                        ['kafe', 'Kafe Santai'],
                        ['resto_ruko', 'Restoran Ruko'],
                        ['lainnya', 'Lainnya'],
                      ] as const
                    ).map(([val, label]) => (
                      <Chip
                        key={val}
                        label={label}
                        role="radio"
                        selected={businessType === val}
                        onClick={() => setBusinessType(val)}
                      />
                    ))}
                  </div>
                </div>

                {/* Nama Tempat Usaha */}
                <div>
                  <Label requiredText="wajib">Nama Tempat Usaha</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Contoh: Kedai Selasar Kopi"
                  />
                </div>

                {/* Lokasi Usaha (Peta / Pin) */}
                <div>
                  <Label requiredText="wajib" hint="Pencarian Peta / Pin">
                    Lokasi Usaha
                  </Label>
                  <Input
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Contoh: Jl. Kaliurang KM 5, Sleman"
                  />
                </div>

                {/* Deskripsi Letak */}
                <div>
                  <Label requiredText="wajib" hint="Terlihat atau tersembunyi?">
                    Deskripsi Letak Fisik
                  </Label>
                  <Textarea
                    value={locationDescription}
                    onChange={(e) => setLocationDescription(e.target.value)}
                    placeholder="Contoh: Berada di lantai 2 ruko warna abu-abu, tangga naik berada persis di samping minimarket."
                  />
                </div>
              </div>
            </Card>

            {/* Kartu 2: Pelanggan dan Tujuan */}
            <Card>
              <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">Kartu 2: Pelanggan & Tujuan</h2>
                  <p className="text-xs text-muted">Semua chip memiliki nilai bawaan yang dapat kamu sesuaikan.</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Tipe Sekitar */}
                <div>
                  <Label requiredText="wajib">Tipe Lingkungan Sekitar Toko</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['dekat_kampus', 'Dekat Kampus'],
                        ['perkantoran', 'Kawasan Perkantoran'],
                        ['permukiman', 'Permukiman Warga'],
                        ['jalan_utama', 'Jalan Utama / Protokol'],
                        ['lainnya', 'Lainnya'],
                      ] as const
                    ).map(([val, label]) => (
                      <Chip
                        key={val}
                        label={label}
                        role="radio"
                        selected={surroundingsType === val}
                        onClick={() => setSurroundingsType(val)}
                      />
                    ))}
                  </div>
                </div>

                {/* Siapa yang biasa lewat */}
                <div>
                  <Label requiredText="opsional" hint="Pilih semua yang sesuai">
                    Siapa yang Biasa Melintas di Depan Toko?
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['mahasiswa', 'Mahasiswa'],
                        ['pekerja_kantor', 'Pekerja Kantor'],
                        ['warga_sekitar', 'Warga Sekitar'],
                        ['keluarga', 'Keluarga'],
                        ['pengendara', 'Pengendara / Ojol Lewat'],
                      ] as const
                    ).map(([val, label]) => (
                      <Chip
                        key={val}
                        label={label}
                        role="checkbox"
                        selected={passersby.includes(val)}
                        onClick={() => togglePasserby(val)}
                      />
                    ))}
                  </div>
                </div>

                {/* Tujuan Bisnis */}
                <div>
                  <Label requiredText="opsional" hint="Membantu urutan rekomendasi">
                    Tujuan Utama Saat Ini
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['lebih_banyak_pembeli_baru', 'Lebih banyak pembeli baru'],
                        ['naikkan_belanja_rata_rata', 'Naikkan belanja rata-rata'],
                        ['ramaikan_jam_sepi', 'Ramaikan jam-jam sepi'],
                      ] as const
                    ).map(([val, label]) => (
                      <Chip
                        key={val}
                        label={label}
                        role="radio"
                        selected={businessGoal === val}
                        onClick={() => setBusinessGoal(val)}
                      />
                    ))}
                  </div>
                </div>

                {/* Hal yang Tidak Bisa Diubah */}
                <div>
                  <Label requiredText="opsional" hint="Menyaring saran yang mustahil">
                    Hal yang Tidak Bisa Diubah (Batasan)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['lokasi', 'Lokasi Toko'],
                        ['fasad', 'Struktur Fasad / Bangunan'],
                        ['menu', 'Konsep Menu Inti'],
                        ['harga', 'Standar Harga Pokok'],
                      ] as const
                    ).map(([val, label]) => (
                      <Chip
                        key={val}
                        label={label}
                        role="checkbox"
                        selected={fixedConstraints.includes(val)}
                        onClick={() => toggleConstraint(val)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Kolom Kanan: Kartu 3 (Menu, Harga, Jam) (5 Kolom) */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">Kartu 3: Menu, Harga & Jam</h2>
                  <p className="text-xs text-muted">Agen mencocokkan harga ini dengan daya belinya.</p>
                </div>
                <Badge variant={priceLevel === 'hemat' ? 'impact' : 'primary'} size="sm">
                  Level {priceLevel}
                </Badge>
              </div>

              {/* Daftar Menu & Harga */}
              <div className="space-y-3">
                <Label requiredText="wajib" hint="Minimal 1 menu terdaftar">
                  Daftar Menu & Harga Porsi
                </Label>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-panel border border-hairline px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-ink truncate max-w-[200px]">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-ink">Rp {item.price.toLocaleString('id-ID')}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMenuItem(item.id)}
                          className="text-subtle hover:text-friction font-bold px-1"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tambah Menu Input */}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Nama menu..."
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Harga (Rp)..."
                    value={newMenuPrice}
                    onChange={(e) => setNewMenuPrice(e.target.value)}
                    className="w-28 font-mono"
                  />
                  <Button variant="secondary" size="md" onClick={handleAddMenuItem} className="shrink-0">
                    <PlusIcon size={14} /> Tambah
                  </Button>
                </div>
              </div>

              {/* Jam Buka & Jam Ramai */}
              <div className="mt-6 pt-5 border-t border-hairline space-y-4">
                <div>
                  <Label requiredText="wajib">Jam Operasional (Buka – Tutup)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="time"
                      value={openHour}
                      onChange={(e) => setOpenHour(e.target.value)}
                      className="font-mono"
                    />
                    <Input
                      type="time"
                      value={closeHour}
                      onChange={(e) => setCloseHour(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label requiredText="wajib" hint="Untuk jadwal rencana tally F6-G">
                    Jam Paling Ramai
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="time"
                      value={rushStart}
                      onChange={(e) => setRushStart(e.target.value)}
                      className="font-mono"
                    />
                    <Input
                      type="time"
                      value={rushEnd}
                      onChange={(e) => setRushEnd(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Tetangga Terdekat */}
                <div>
                  <Label requiredText="opsional">Pesaing / Tetangga Terdekat</Label>
                  <Textarea
                    value={nearbyCompetitors}
                    onChange={(e) => setNearbyCompetitors(e.target.value)}
                    placeholder="Contoh: Sebelah kiri minimarket ramai, seberang ada kafe kopi susu besar."
                    className="min-h-[72px]"
                  />
                </div>
              </div>
            </Card>

            {/* Bottom Navigation Box */}
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Status formulir:</span>
                <span className={`font-medium ${isAllValid ? 'text-impact' : 'text-friction'}`}>
                  {isAllValid ? 'Semua isian wajib lengkap' : `${7 - filledRequiredCount} isian wajib belum terisi`}
                </span>
              </div>
              <Button
                variant="primary"
                size="lg"
                disabled={!isAllValid}
                onClick={handleNext}
                className="w-full justify-center"
              >
                Lanjut ke Rekam Video (F2) <ArrowRightIcon size={16} />
              </Button>
            </Card>
          </div>
        </div>
        </div>
      </main>

      <footer className="border-t border-hairline py-6 text-center text-xs text-subtle">
        <div className="col">
          Sekilas © 2026 · Simulator Calon Pelanggan untuk UMKM Makanan
        </div>
      </footer>
    </div>
  );
}

export default function KonteksUsahaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <KonteksUsahaInner />
    </Suspense>
  );
}
