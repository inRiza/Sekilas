'use client';

import { FileSpreadsheet, ImageIcon, Keyboard, Plus, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { Suspense, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip, Input, Label, Textarea } from '@/components/ui/form';
import { ArrowRightIcon } from '@/components/ui/icons';
import { TimeSelect, isWithinHours, toMinutes } from '@/components/ui/time-select';
import { MOCK_CONTEXT } from '@/lib/mock/context';
import { BusinessGoal, BusinessType, FixedConstraint, PasserbyType } from '@/types/api';

/* ---------------- Menu ---------------- */

type MenuSource = 'manual' | 'excel' | 'foto';
type MenuRow = { id: string; name: string; price: string };
type MenuFile = { name: string; previewUrl?: string };

const MENU_SOURCES: Record<MenuSource, { label: string; icon: typeof Keyboard; accept?: string; hint?: string }> = {
  manual: { label: 'Ketik manual', icon: Keyboard },
  excel: {
    label: 'File Excel',
    icon: FileSpreadsheet,
    accept: '.xlsx,.xls,.csv',
    hint: 'Kolom: nama menu, harga porsi. Format .xlsx, .xls, atau .csv.',
  },
  foto: {
    label: 'Foto menu',
    icon: ImageIcon,
    accept: 'image/*',
    hint: 'Foto papan atau buku menu yang jelas. Nama dan harga dibaca otomatis.',
  },
};

let rowSeq = 0;
const newRow = (name = '', price = ''): MenuRow => ({ id: `r${++rowSeq}`, name, price });

/** Contoh "hasil baca" file/foto (UI saja, belum terhubung ke backend). */
const SAMPLE_READ = MOCK_CONTEXT.menu_items.map((m) => ({ name: m.name, price: String(m.price) }));

const formatRupiah = (digits: string) => (digits ? Number(digits).toLocaleString('id-ID') : '');
const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 9);

/** Tabel menu yang bisa diedit: dipakai untuk ketik manual dan untuk mengoreksi hasil baca file/foto. */
function MenuTable({ rows, onChange }: { rows: MenuRow[]; onChange: (rows: MenuRow[]) => void }) {
  const update = (id: string, patch: Partial<MenuRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_9rem_2rem] gap-2 px-1 text-[12px] font-medium text-muted">
        <span>Nama menu</span>
        <span>Harga porsi</span>
        <span />
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[1fr_9rem_2rem] items-center gap-2">
          <Input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} placeholder="Contoh: Es kopi susu" aria-label="Nama menu" />
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[13px] text-muted">Rp</span>
            <Input
              value={formatRupiah(r.price)}
              onChange={(e) => update(r.id, { price: onlyDigits(e.target.value) })}
              inputMode="numeric"
              placeholder="18.000"
              aria-label="Harga porsi"
              className="pl-9 tabular-nums"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
            aria-label="Hapus baris"
            className="grid size-8 place-items-center rounded-md text-subtle transition-colors hover:bg-friction-10 hover:text-friction"
          >
            <X size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, newRow()])}
        className="inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-primary-40 transition-colors hover:bg-primary-10"
      >
        <Plus size={15} /> Tambah menu
      </button>
    </div>
  );
}

/** Menu: ketik manual, atau unggah file Excel/foto lalu koreksi hasil bacanya di tabel yang sama. */
function MenuInput({ rows, onRows }: { rows: MenuRow[]; onRows: (rows: MenuRow[]) => void }) {
  const [source, setSource] = useState<MenuSource>('manual');
  const [file, setFile] = useState<MenuFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = MENU_SOURCES[source];

  const clearFile = () => {
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile({ name: f.name, previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined });
    onRows(SAMPLE_READ.map((r) => newRow(r.name, r.price)));
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md bg-soft p-1">
        {(Object.keys(MENU_SOURCES) as MenuSource[]).map((key) => {
          const Icon = MENU_SOURCES[key].icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key !== source) clearFile();
                setSource(key);
              }}
              className={`inline-flex h-8 items-center gap-2 rounded-[5px] px-3 text-[13px] transition-colors ${
                source === key ? 'bg-white font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={14} />
              {MENU_SOURCES[key].label}
            </button>
          );
        })}
      </div>

      {source === 'manual' && <MenuTable rows={rows} onChange={onRows} />}

      {source !== 'manual' && !file && (
        <>
          <input ref={inputRef} type="file" accept={config.accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
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
              pick(e.dataTransfer.files?.[0]);
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
        </>
      )}

      {source !== 'manual' && file && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-line p-3">
            {file.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal dari blob URL
              <img src={file.previewUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-impact-10 text-impact">
                <FileSpreadsheet size={18} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{file.name}</p>
              <p className="mt-0.5 text-[12px] text-muted">Hasil baca ada di tabel di bawah. Periksa dan koreksi bila perlu.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearFile();
                onRows([newRow()]);
              }}
              aria-label="Hapus file"
              className="grid size-8 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-friction-10 hover:text-friction"
            >
              <X size={16} />
            </button>
          </div>
          <MenuTable rows={rows} onChange={onRows} />
        </div>
      )}

      {source === 'foto' && (
        <p className="text-[12px] text-muted">
          Foto tidak terbaca?{' '}
          <button type="button" onClick={() => setSource('manual')} className="font-medium text-primary-40 hover:underline">
            Ketik manual saja
          </button>
        </p>
      )}
    </div>
  );
}

/* ---------------- Tata letak ---------------- */

function SectionTitle({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-10 text-[12px] font-semibold text-primary-40">{n}</span>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      </div>
    </div>
  );
}

/** Pembungkus isian wajib: id untuk digulir saat kosong, dan pesan "wajib diisi" bila perlu. */
function Field({ id, missing, children }: { id: string; missing?: boolean; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24">
      {children}
      {missing && <p className="mt-1.5 text-[12px] text-friction">Bagian ini wajib diisi.</p>}
    </div>
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[12px] leading-relaxed text-muted">{children}</p>;
}

type Range = { id: string; start: string; end: string };
let rangeSeq = 0;
const newRange = (start = '12:00', end = '14:00'): Range => ({ id: `t${++rangeSeq}`, start, end });

type Parking = 'motor' | 'mobil' | 'tidak_ada';

/* ---------------- Halaman ---------------- */

function KonteksUsahaInner() {
  const router = useRouter();

  // 1. Informasi dasar
  const [businessType, setBusinessType] = useState<BusinessType | null>(MOCK_CONTEXT.business_type);
  const [businessName, setBusinessName] = useState(MOCK_CONTEXT.business_name);
  const [locationName, setLocationName] = useState(MOCK_CONTEXT.location_name);
  const [locationDescription, setLocationDescription] = useState(MOCK_CONTEXT.location_description);

  // 2. Pelanggan & tujuan
  const [surroundings, setSurroundings] = useState<string[]>(['dekat_kampus', 'jalan_utama']);
  const [surroundingsOther, setSurroundingsOther] = useState('');
  const [passersby, setPassersby] = useState<PasserbyType[]>(MOCK_CONTEXT.passersby);
  const [businessGoal, setBusinessGoal] = useState<BusinessGoal>(MOCK_CONTEXT.business_goal);
  const [fixedConstraints, setFixedConstraints] = useState<FixedConstraint[]>(MOCK_CONTEXT.fixed_constraints);

  // 3. Menu & harga
  const [menuRows, setMenuRows] = useState<MenuRow[]>(() => MOCK_CONTEXT.menu_items.map((m) => newRow(m.name, String(m.price))));

  // 4. Jam operasional
  const [openHour, setOpenHour] = useState(MOCK_CONTEXT.opening_hours.open);
  const [closeHour, setCloseHour] = useState(MOCK_CONTEXT.opening_hours.close);
  const [rushRanges, setRushRanges] = useState<Range[]>(() => MOCK_CONTEXT.rush_hours.map((r) => newRange(r.start, r.end)));

  // 5. Penjualan & fasilitas (opsional)
  const [dailySales, setDailySales] = useState('');
  const [dailyVisitors, setDailyVisitors] = useState('');
  const [parking, setParking] = useState<Parking[]>([]);

  const [showErrors, setShowErrors] = useState(false);

  const toggle = <T,>(list: T[], val: T) => (list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);

  const open = toMinutes(openHour);
  const close = toMinutes(closeHour);
  const overnight = close < open;
  const hoursValid = open !== close;
  const validMenu = menuRows.some((r) => r.name.trim() && Number(r.price) > 0);

  const rushValid = (r: Range) =>
    toMinutes(r.start) !== toMinutes(r.end) && isWithinHours(toMinutes(r.start), open, close) && isWithinHours(toMinutes(r.end), open, close);

  // Isian wajib, berurutan sesuai posisinya di form (untuk digulir ke yang pertama kosong).
  const required = [
      { id: 'f-jenis', ok: Boolean(businessType) },
      { id: 'f-nama', ok: Boolean(businessName.trim()) },
      { id: 'f-lokasi', ok: Boolean(locationName.trim()) },
      { id: 'f-deskripsi', ok: Boolean(locationDescription.trim()) },
      { id: 'f-lingkungan', ok: surroundings.length > 0 && (!surroundings.includes('lainnya') || Boolean(surroundingsOther.trim())) },
      { id: 'f-menu', ok: validMenu },
      { id: 'f-jam', ok: hoursValid },
    { id: 'f-ramai', ok: rushRanges.length > 0 && rushRanges.every(rushValid) },
  ];

  const missing = new Set(required.filter((r) => !r.ok).map((r) => r.id));
  const filled = required.length - missing.size;
  const isAllValid = missing.size === 0;
  const err = (id: string) => showErrors && missing.has(id);

  const handleNext = () => {
    if (isAllValid) {
      router.push('/business/analysis/video');
      return;
    }
    setShowErrors(true);
    const first = required.find((r) => !r.ok);
    if (first) document.getElementById(first.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.03em] text-ink sm:text-[28px]">Konteks usaha</h1>
              <p className="mt-1 text-[13px] text-muted">Data ini membantu model membentuk persona calon pelanggan yang relevan dengan lokasimu.</p>
            </div>
            <Badge variant={isAllValid ? 'impact' : 'primary'} size="md">{`${filled} dari ${required.length} bidang wajib terisi`}</Badge>
          </div>

          <div className="rounded-md border border-line bg-white">
            <div className="space-y-12 p-6 sm:p-10">
              {/* 1. Informasi dasar */}
              <section>
                <SectionTitle n={1} title="Informasi dasar" description="Identitas dan letak fisik tempat usaha." />
                <div className="space-y-7">
                  <Field id="f-jenis" missing={err('f-jenis')}>
                    <Label requiredText="wajib">Jenis usaha</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['warung', 'Warung makan'],
                          ['kedai', 'Kedai kopi'],
                          ['kafe', 'Kafe santai'],
                          ['resto_ruko', 'Restoran ruko'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip key={val} label={label} role="radio" selected={businessType === val} onClick={() => setBusinessType(val)} />
                      ))}
                    </div>
                  </Field>
                  <Field id="f-nama" missing={err('f-nama')}>
                    <Label requiredText="wajib">Nama tempat usaha</Label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Contoh: Kedai Selasar Kopi" />
                  </Field>
                  <Field id="f-lokasi" missing={err('f-lokasi')}>
                    <Label requiredText="wajib">Lokasi usaha</Label>
                    <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Contoh: Jl. Kaliurang KM 5, Sleman" />
                  </Field>
                  <Field id="f-deskripsi" missing={err('f-deskripsi')}>
                    <Label requiredText="wajib">Deskripsi letak fisik</Label>
                    <Textarea
                      value={locationDescription}
                      onChange={(e) => setLocationDescription(e.target.value)}
                      placeholder="Contoh: Lantai 2 ruko warna abu-abu, tangga naik persis di samping minimarket."
                    />
                  </Field>
                </div>
              </section>

              {/* 2. Pelanggan & tujuan */}
              <section>
                <SectionTitle n={2} title="Pelanggan & tujuan" description="Siapa yang lewat di depan toko dan apa yang ingin kamu capai." />
                <div className="space-y-7">
                  <Field id="f-lingkungan" missing={err('f-lingkungan')}>
                    <Label requiredText="wajib">Lingkungan sekitar toko</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['dekat_kampus', 'Dekat kampus'],
                          ['perkantoran', 'Kawasan perkantoran'],
                          ['permukiman', 'Permukiman warga'],
                          ['jalan_utama', 'Jalan utama'],
                          ['lainnya', 'Lainnya'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip key={val} label={label} role="checkbox" selected={surroundings.includes(val)} onClick={() => setSurroundings((p) => toggle(p, val))} />
                      ))}
                    </div>
                    {surroundings.includes('lainnya') && (
                      <div className="mt-3">
                        <Input
                          value={surroundingsOther}
                          onChange={(e) => setSurroundingsOther(e.target.value)}
                          placeholder="Sebutkan lingkungan lainnya, misal dekat rumah sakit"
                        />
                      </div>
                    )}
                    <Helper>Boleh pilih lebih dari satu, misal dekat kampus sekaligus di jalan utama.</Helper>
                  </Field>
                  <div>
                    <Label requiredText="opsional">Siapa yang biasa melintas di depan toko?</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['mahasiswa', 'Mahasiswa'],
                          ['pekerja_kantor', 'Pekerja kantor'],
                          ['warga_sekitar', 'Warga sekitar'],
                          ['keluarga', 'Keluarga'],
                          ['pengendara', 'Pengendara lewat'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip key={val} label={label} role="checkbox" selected={passersby.includes(val)} onClick={() => setPassersby((p) => toggle(p, val))} />
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
                          ['fasad', 'Struktur bangunan'],
                          ['menu', 'Konsep menu inti'],
                          ['harga', 'Standar harga pokok'],
                        ] as const
                      ).map(([val, label]) => (
                        <Chip
                          key={val}
                          label={label}
                          role="checkbox"
                          selected={fixedConstraints.includes(val)}
                          onClick={() => setFixedConstraints((p) => toggle(p, val))}
                        />
                      ))}
                    </div>
                    <Helper>Struktur bangunan berarti dinding, tangga, dan tata ruang. Papan, plang, dan spanduk tetap boleh diubah.</Helper>
                  </div>
                </div>
              </section>

              {/* 3. Menu & harga */}
              <section>
                <SectionTitle n={3} title="Menu & harga" description="Agen mencocokkan harga menu dengan daya belinya." />
                <Field id="f-menu" missing={err('f-menu')}>
                  <Label requiredText="wajib">Daftar menu & harga porsi</Label>
                  <MenuInput rows={menuRows} onRows={setMenuRows} />
                </Field>
              </section>

              {/* 4. Jam operasional */}
              <section>
                <SectionTitle n={4} title="Jam operasional" description="Kapan toko buka dan kapan paling ramai. Format 24 jam." />
                <div className="space-y-7">
                  <Field id="f-jam" missing={err('f-jam')}>
                    <Label requiredText="wajib">Jam buka</Label>
                    <div className="flex items-center gap-3">
                      <TimeSelect aria-label="Jam buka" value={openHour} onChange={setOpenHour} />
                      <span className="shrink-0 text-[13px] text-muted">sampai</span>
                      <TimeSelect aria-label="Jam tutup" value={closeHour} onChange={setCloseHour} />
                    </div>
                    {overnight && <Helper>{`Tutup melewati tengah malam, pukul ${closeHour.replace(':', '.')} keesokan harinya.`}</Helper>}
                    {!hoursValid && <p className="mt-2 text-[12px] text-friction">Jam buka dan jam tutup tidak boleh sama.</p>}
                  </Field>
                  <Field id="f-ramai" missing={err('f-ramai')}>
                    <Label requiredText="wajib">Jam paling ramai</Label>
                    <div className="space-y-2">
                      {rushRanges.map((r) => (
                        <div key={r.id}>
                          <div className="flex items-center gap-3">
                            <TimeSelect
                              aria-label="Mulai ramai"
                              value={r.start}
                              onChange={(v) => setRushRanges((p) => p.map((x) => (x.id === r.id ? { ...x, start: v } : x)))}
                            />
                            <span className="shrink-0 text-[13px] text-muted">sampai</span>
                            <TimeSelect
                              aria-label="Selesai ramai"
                              value={r.end}
                              onChange={(v) => setRushRanges((p) => p.map((x) => (x.id === r.id ? { ...x, end: v } : x)))}
                            />
                            <button
                              type="button"
                              disabled={rushRanges.length === 1}
                              onClick={() => setRushRanges((p) => p.filter((x) => x.id !== r.id))}
                              aria-label="Hapus rentang"
                              className="grid size-8 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-friction-10 hover:text-friction disabled:invisible"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          {!rushValid(r) && <p className="mt-1.5 text-[12px] text-friction">Rentang ini harus berada di dalam jam buka.</p>}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRushRanges((p) => [...p, newRange('18:00', '20:00')])}
                      className="mt-2 inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-primary-40 transition-colors hover:bg-primary-10"
                    >
                      <Plus size={15} /> Tambah rentang
                    </button>
                  </Field>
                </div>
              </section>

              {/* 5. Penjualan & fasilitas (opsional) */}
              <section>
                <SectionTitle
                  n={5}
                  title="Penjualan & fasilitas"
                  description="Opsional. Dipakai untuk menaksir omzet yang hilang dan menyesuaikan persona pengendara."
                />
                <div className="space-y-7">
                  <div>
                    <Label requiredText="opsional">Rata-rata penjualan per hari</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[13px] text-muted">Rp</span>
                      <Input
                        value={formatRupiah(dailySales)}
                        onChange={(e) => setDailySales(onlyDigits(e.target.value))}
                        inputMode="numeric"
                        placeholder="1.500.000"
                        className="pl-9 tabular-nums"
                      />
                    </div>
                    <Helper>Tanpa isian ini, dasbor tidak menampilkan perkiraan omzet.</Helper>
                  </div>
                  <div>
                    <Label requiredText="opsional">Jumlah pengunjung per hari</Label>
                    <div className="relative">
                      <Input
                        value={dailyVisitors ? Number(dailyVisitors).toLocaleString('id-ID') : ''}
                        onChange={(e) => setDailyVisitors(onlyDigits(e.target.value).slice(0, 6))}
                        inputMode="numeric"
                        placeholder="80"
                        className="pr-16 tabular-nums"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[13px] text-muted">orang</span>
                    </div>
                  </div>
                  <div>
                    <Label requiredText="opsional">Parkir</Label>
                    <div className="flex flex-wrap gap-2">
                      <Chip
                        label="Ada untuk motor"
                        role="checkbox"
                        selected={parking.includes('motor')}
                        onClick={() => setParking((p) => toggle(p.filter((x) => x !== 'tidak_ada'), 'motor'))}
                      />
                      <Chip
                        label="Ada untuk mobil"
                        role="checkbox"
                        selected={parking.includes('mobil')}
                        onClick={() => setParking((p) => toggle(p.filter((x) => x !== 'tidak_ada'), 'mobil'))}
                      />
                      <Chip
                        label="Tidak ada"
                        role="checkbox"
                        selected={parking.includes('tidak_ada')}
                        onClick={() => setParking((p) => (p.includes('tidak_ada') ? [] : ['tidak_ada']))}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3 rounded-b-md bg-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <span className={`text-[13px] ${isAllValid ? 'text-impact' : 'text-muted'}`}>
                {isAllValid ? 'Semua bidang wajib lengkap' : `${missing.size} bidang wajib belum terisi`}
              </span>
              <Button variant="primary" size="lg" onClick={handleNext} className="justify-center !rounded-md">
                {isAllValid ? 'Lanjut ke rekam video' : 'Lengkapi bidang wajib'} <ArrowRightIcon size={16} />
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
