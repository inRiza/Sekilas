'use client';

import { FileSpreadsheet, ImageIcon, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { Suspense, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip, Input, Label, Textarea } from '@/components/ui/form';
import { ArrowRightIcon } from '@/components/ui/icons';
import { MOCK_CONTEXT } from '@/lib/mock/context';
import { BusinessGoal, BusinessType, FixedConstraint, PasserbyType, SurroundingsType } from '@/types/api';

type MenuSource = 'excel' | 'foto';
type MenuFile = { name: string; size: number; previewUrl?: string };

const MENU_SOURCES: Record<MenuSource, { label: string; accept: string; hint: string }> = {
  excel: {
    label: 'File Excel / CSV',
    accept: '.xlsx,.xls,.csv',
    hint: 'Kolom: nama menu, harga porsi. Format .xlsx, .xls, atau .csv.',
  },
  foto: {
    label: 'Foto menu',
    accept: 'image/*',
    hint: 'Foto papan atau buku menu yang jelas. Nama dan harga dibaca otomatis oleh AI.',
  },
};

function formatSize(bytes: number) {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** Unggah daftar menu: file Excel/CSV atau foto menu (dibaca VLM). Hanya UI, belum terhubung ke backend. */
function MenuUpload({ file, onChange }: { file: MenuFile | null; onChange: (file: MenuFile | null) => void }) {
  const [source, setSource] = useState<MenuSource>('excel');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = MENU_SOURCES[source];

  const accept = (f: File | undefined) => {
    if (!f) return;
    onChange({
      name: f.name,
      size: f.size,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    });
  };

  const clear = () => {
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Pilihan sumber */}
      <div className="inline-flex rounded-md bg-soft p-1">
        {(Object.keys(MENU_SOURCES) as MenuSource[]).map((key) => {
          const Icon = key === 'excel' ? FileSpreadsheet : ImageIcon;
          const active = source === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key !== source) clear();
                setSource(key);
              }}
              className={`inline-flex h-8 items-center gap-2 rounded-[5px] px-3 text-[13px] transition-colors ${
                active ? 'bg-white font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={14} />
              {MENU_SOURCES[key].label}
            </button>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-md border border-line bg-white p-3">
          {file.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal dari blob URL
            <img src={file.previewUrl} alt="" className="size-12 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-md bg-impact-10 text-impact">
              <FileSpreadsheet size={20} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{file.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge>{formatSize(file.size)}</Badge>
              <Badge variant="primary">
                {source === 'foto' ? 'Dibaca AI saat analisis dimulai' : 'Siap dibaca saat analisis dimulai'}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            aria-label="Hapus file"
            className="grid size-8 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-friction-10 hover:text-friction"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? 'border-primary-40 bg-primary-10' : 'border-[#c9ced6] bg-panel hover:bg-hover'
          }`}
        >
          <span className="grid size-10 place-items-center rounded-md bg-white text-primary-40">
            <Upload size={18} />
          </span>
          <span className="text-[13px] font-medium text-ink">
            Tarik file ke sini atau <span className="text-primary-40">pilih file</span>
          </span>
          <span className="max-w-md text-[12px] text-muted">{config.hint}</span>
        </button>
      )}
    </div>
  );
}

/** Judul bagian di dalam satu container formulir (pemisah antar-bagian). */
function SectionTitle({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-10 text-[12px] font-semibold text-primary-40">
        {n}
      </span>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      </div>
    </div>
  );
}

function KonteksUsahaInner() {
  const router = useRouter();

  // State Form F1
  const [businessType, setBusinessType] = useState<BusinessType>(MOCK_CONTEXT.business_type);
  const [businessName, setBusinessName] = useState(MOCK_CONTEXT.business_name);
  const [locationName, setLocationName] = useState(MOCK_CONTEXT.location_name);
  const [locationDescription, setLocationDescription] = useState(MOCK_CONTEXT.location_description);

  const [surroundingsType, setSurroundingsType] = useState<SurroundingsType>(MOCK_CONTEXT.surroundings_type);
  const [passersby, setPassersby] = useState<PasserbyType[]>(MOCK_CONTEXT.passersby);
  const [businessGoal, setBusinessGoal] = useState<BusinessGoal>(MOCK_CONTEXT.business_goal);
  const [fixedConstraints, setFixedConstraints] = useState<FixedConstraint[]>(MOCK_CONTEXT.fixed_constraints);

  const [menuFile, setMenuFile] = useState<MenuFile | null>(null);

  const [openHour, setOpenHour] = useState(MOCK_CONTEXT.opening_hours.open);
  const [closeHour, setCloseHour] = useState(MOCK_CONTEXT.opening_hours.close);
  const [rushStart, setRushStart] = useState(MOCK_CONTEXT.rush_hours[0]?.start || '12:00');
  const [rushEnd, setRushEnd] = useState(MOCK_CONTEXT.rush_hours[0]?.end || '14:00');

  // 7 isian wajib (PRD F1): jenis usaha, lokasi, deskripsi letak, tipe sekitar, menu, jam buka, jam ramai
  const validChecklist = useMemo(
    () => [
      Boolean(businessType),
      Boolean(locationName.trim()),
      Boolean(locationDescription.trim()),
      Boolean(surroundingsType),
      menuFile !== null,
      Boolean(openHour && closeHour && openHour < closeHour),
      Boolean(rushStart && rushEnd && rushStart >= openHour && rushEnd <= closeHour),
    ],
    [businessType, locationName, locationDescription, surroundingsType, menuFile, openHour, closeHour, rushStart, rushEnd],
  );

  const filledRequiredCount = validChecklist.filter(Boolean).length;
  const isAllValid = filledRequiredCount === 7;

  const toggle = <T,>(list: T[], val: T) => (list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          {/* Judul halaman */}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Konteks usaha</h1>
              <p className="mt-1 text-[13px] text-muted">
                Data ini membantu model membentuk persona calon pelanggan yang relevan dengan lokasimu.
              </p>
            </div>
            <Badge variant={isAllValid ? 'impact' : 'primary'} size="md">
              {`${filledRequiredCount} dari 7 isian wajib terisi`}
            </Badge>
          </div>

          {/* Satu container formulir; bagian dipisah oleh judul */}
          <div className="rounded-md border border-line bg-white">
            <div className="space-y-12 p-6 sm:p-10">
              {/* 1. Informasi dasar */}
              <section>
                <SectionTitle n={1} title="Informasi dasar" description="Identitas dan letak fisik tempat usaha." />
                <div className="space-y-7">
                  <div>
                    <Label requiredText="wajib">Jenis usaha</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['warung', 'Warung makan'],
                          ['kedai', 'Kedai / coffee shop'],
                          ['kafe', 'Kafe santai'],
                          ['resto_ruko', 'Restoran ruko'],
                          ['lainnya', 'Lainnya'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip key={val} label={label} role="radio" selected={businessType === val} onClick={() => setBusinessType(val)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label requiredText="wajib">Nama tempat usaha</Label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Contoh: Kedai Selasar Kopi" />
                  </div>
                  <div>
                    <Label requiredText="wajib">Lokasi usaha</Label>
                    <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Contoh: Jl. Kaliurang KM 5, Sleman" />
                  </div>
                  <div>
                    <Label requiredText="wajib">Deskripsi letak fisik</Label>
                    <Textarea
                      value={locationDescription}
                      onChange={(e) => setLocationDescription(e.target.value)}
                      placeholder="Contoh: Lantai 2 ruko warna abu-abu, tangga naik persis di samping minimarket."
                    />
                  </div>
                </div>
              </section>

              {/* 2. Pelanggan & tujuan */}
              <section>
                <SectionTitle
                  n={2}
                  title="Pelanggan & tujuan"
                  description="Siapa yang lewat di depan toko dan apa yang ingin kamu capai."
                />
                <div className="space-y-7">
                  <div>
                    <Label requiredText="wajib">Tipe lingkungan sekitar toko</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['dekat_kampus', 'Dekat kampus'],
                          ['perkantoran', 'Kawasan perkantoran'],
                          ['permukiman', 'Permukiman warga'],
                          ['jalan_utama', 'Jalan utama / protokol'],
                          ['lainnya', 'Lainnya'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip key={val} label={label} role="radio" selected={surroundingsType === val} onClick={() => setSurroundingsType(val)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label requiredText="opsional">Siapa yang biasa melintas di depan toko?</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['mahasiswa', 'Mahasiswa'],
                          ['pekerja_kantor', 'Pekerja kantor'],
                          ['warga_sekitar', 'Warga sekitar'],
                          ['keluarga', 'Keluarga'],
                          ['pengendara', 'Pengendara / ojol lewat'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip
                          key={val}
                          label={label}
                          role="checkbox"
                          selected={passersby.includes(val)}
                          onClick={() => setPassersby((prev) => toggle(prev, val))}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label requiredText="opsional">Tujuan utama saat ini</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['lebih_banyak_pembeli_baru', 'Lebih banyak pembeli baru'],
                          ['naikkan_belanja_rata_rata', 'Naikkan belanja rata-rata'],
                          ['ramaikan_jam_sepi', 'Ramaikan jam-jam sepi'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip key={val} label={label} role="radio" selected={businessGoal === val} onClick={() => setBusinessGoal(val)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label requiredText="opsional">Hal yang tidak bisa diubah</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['lokasi', 'Lokasi toko'],
                          ['fasad', 'Struktur fasad / bangunan'],
                          ['menu', 'Konsep menu inti'],
                          ['harga', 'Standar harga pokok'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip
                          key={val}
                          label={label}
                          role="checkbox"
                          selected={fixedConstraints.includes(val)}
                          onClick={() => setFixedConstraints((prev) => toggle(prev, val))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Menu & harga */}
              <section>
                <SectionTitle
                  n={3}
                  title="Menu & harga"
                  description="Agen mencocokkan harga menu dengan daya belinya. Unggah file atau foto menu."
                />
                <Label requiredText="wajib">Daftar menu & harga porsi</Label>
                <MenuUpload file={menuFile} onChange={setMenuFile} />
              </section>

              {/* 4. Jam & sekitar */}
              <section>
                <SectionTitle n={4} title="Jam operasional" description="Kapan toko buka dan kapan paling ramai." />
                <div className="space-y-7">
                  <div>
                    <Label requiredText="wajib">Jam operasional</Label>
                    <div className="flex items-center gap-3">
                      <Input type="time" aria-label="Jam buka" value={openHour} onChange={(e) => setOpenHour(e.target.value)} />
                      <span className="shrink-0 text-[13px] text-muted">-</span>
                      <Input type="time" aria-label="Jam tutup" value={closeHour} onChange={(e) => setCloseHour(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label requiredText="wajib">Jam paling ramai</Label>
                    <div className="flex items-center gap-3">
                      <Input type="time" aria-label="Mulai ramai" value={rushStart} onChange={(e) => setRushStart(e.target.value)} />
                      <span className="shrink-0 text-[13px] text-muted">-</span>
                      <Input type="time" aria-label="Selesai ramai" value={rushEnd} onChange={(e) => setRushEnd(e.target.value)} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Kaki container: status & lanjut */}
            <div className="flex flex-col gap-3 rounded-b-md bg-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <span className={`text-[13px] ${isAllValid ? 'text-impact' : 'text-muted'}`}>
                {isAllValid ? 'Semua isian wajib lengkap' : `${7 - filledRequiredCount} isian wajib belum terisi`}
              </span>
              <Button
                variant="primary"
                size="lg"
                disabled={!isAllValid}
                onClick={() => isAllValid && router.push('/business/analysis/video')}
                className="justify-center !rounded-md"
              >
                Lanjut ke rekam video <ArrowRightIcon size={16} />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function KonteksUsahaPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-white" />}>
      <KonteksUsahaInner />
    </Suspense>
  );
}
