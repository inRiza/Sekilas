# Sekilas Front-End Design Guide (Anti-AI Slop)

Panduan arsitektur antarmuka dan sistem desain untuk frontend `fe/` (Next.js 15, Tailwind CSS v4, runtime Bun).  
Dokumen ini mengadopsi estetika **Modern, Approachable, Pillowy SaaS** (terinspirasi dari referensi Youcare: kartu mengambang ber-radius besar, kanvas latar lembut, *hero card* aksen biru elektrik, komponen serba pil, dan visualisasi data yang bernapas), dipadukan dengan struktur konten ketat dari Figma dan PRD.

---

## 1. Hirarki Kebenaran & Aturan Utama

Jika terdapat perbedaan atau pertentangan detail:
$$\text{PRD.md (v1.2)} > \text{Figma (bagian "CONTENT NYA IKUT INI")} > \text{Dokumen ini (fe/design.md)} > \text{Kode lama}$$

1. **Struktur & Konten Dasbor:** Wajib mengikuti bagian **"CONTENT NYA IKUT INI"** di halaman **Desktop** Figma (KPI metrik, 3D Visual Twin viewport, Corong 4 Tahap, Pelabelan Faktor, Rekomendasi Pareto, dan Daftar Monolog Agen).
2. **Kaidah Simulasi PRD v1.2:** Corong strictly **4 tahap** (Melihat → Berhenti → Masuk → Memesan; tahap "Kembali" dihapus). Jumlah agen dinamis: **500 agen** untuk analisis penuh, **20 agen** untuk mode demo (bukan angka dummy Figma 340).
3. **Bahasa Visual:** Menggunakan kanvas latar lembut bertekstur empuk, kartu-kartu putih mengambang (*floating cards* `rounded-2xl`), tombol dan navigasi pil kapsul (`rounded-full`), serta *visual anchor* yang jelas.

---

## 2. Peta Halaman & Rute Aplikasi

| Halaman | Rute Usulan | Mode Layout | Fungsi Utama |
| --- | --- | --- | --- |
| Masuk & Daftar | `/masuk`, `/daftar` | App Shell | Autentikasi UMKM, tata letak kartu bersih terpusat |
| Riwayat Proyek | `/proyek` | App Shell | Daftar analisis tempat usaha & status (*Siap*, *Memproses*, *Kedaluwarsa*) |
| Profil Usaha | `/profil` | App Shell | Data default UMKM (nama, alamat, jenis usaha) untuk *prefill* form |
| Wizard 1: Konteks Usaha (F1) | `/analisis/[id]/konteks` | Wizard Shell | Form 2 kolom (Info Dasar, Pelanggan & Tujuan, Menu/Harga/Jam) |
| Wizard 2: Rekam Video (F2) | `/analisis/[id]/video` | Wizard Shell | Panduan rekam, sensor gerak, blur wajah/plat di browser, cek kualitas |
| Wizard 3: Memproses | `/analisis/[id]/proses` | Wizard Shell | Layar tunggu ekstraksi transkrip VLM & rekonstruksi 3D (paralel) |
| Wizard 4: Verifikasi (F4) | `/analisis/[id]/verifikasi` | Wizard Shell | **Gerbang wajib:** Sinkronisasi video-segmen & konfirmasi segmen `tidak_pasti` |
| Wizard 5: Simulasi (F5) | `/analisis/[id]/simulasi` | Wizard Shell | Layar tunggu 500 agen GPT-6 Luna bermonolog per batch |
| Dasbor Hasil (F6 & F7) | `/analisis/[id]` | Dashboard Shell | Viewport Visual Twin 3D, Corong 4 tahap, Pareto, Tiga poin utama |
| Jelajah Agen | `/analisis/[id]/agen` | Dashboard Shell | Filter monolog, titik berhenti, dan skor keraguan per segmen |
| Detail Agen | `/analisis/[id]/agen/[agentId]` | Dashboard Shell | Monolog internal lengkap dan playback jalur kamera agen terpilih |
| Rencana Pengukuran (F6-G) | `/analisis/[id]/rencana` | Print Mode | Format A4 cetak (794×1123px) lembar tally fisik dengan titik observasi |

---

## 3. Sistem Desain Visual & Token

### A. Palet Warna Semantik (`@theme` di `fe/src/app/globals.css`)

```css
@theme {
  /* Canvas Background & Surfaces */
  --color-bg: #f3f5f8;           /* Latar belakang kanvas aplikasi yang lembut */
  --color-surface: #ffffff;      /* Kartu putih mengambang */
  --color-panel: #fafbfc;        /* Area viewport sekunder di dalam kartu (3D/map) */

  /* Tipografi Netral */
  --color-ink: #18181b;          /* Judul, angka metrik utama, teks tegas (zinc-900) */
  --color-ink-soft: #3f3f46;     /* Label form, teks isi utama (zinc-700) */
  --color-muted: #71717a;        /* Paragraf penjelas, deskripsi bantuan (zinc-500) */
  --color-subtle: #a1a1aa;       /* Placeholder, border nonaktif, timestamp (zinc-400) */

  /* Garis & Pemisah */
  --color-line: #e4e7ec;         /* Border kartu mengambang halus */
  --color-hairline: #f0f2f5;     /* Garis pemisah internal, track progress bar */

  /* Aksen Utama (Electric Blue SaaS) */
  --color-primary-40: #2f65f6;   /* Aksi utama, tombol aktif, kartu hero, link */
  --color-primary-50: #1e4fd8;   /* Hover aksi utama */
  --color-primary-20: #dbe5fe;   /* Border badge/chip aktif */
  --color-primary-10: #eff4fe;   /* Latar chip terpilih, callout info lembut */

  /* Status Semantik */
  --color-friction: #ef4444;     /* Titik gesekan, drop-off terbesar, status galat */
  --color-friction-10: #fef2f2;  /* Latar badge gesekan */
  --color-impact: #10b981;       /* Peluang naik, rekomendasi prioritas, status siap */
  --color-impact-10: #ecfdf5;    /* Latar badge dampak positif */

  /* Font */
  --font-sans: var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, monospace;
}
```

### B. Tipografi & Skala Teks

- **Greeting / Halaman Utama:** `text-[28px] sm:text-[32px] font-semibold tracking-[-0.03em] text-ink`
- **Angka Stat / Metrik Kunci:** `text-2xl sm:text-[28px] font-bold tracking-[-0.03em] text-ink` (angka selalu tebal dan percaya diri)
- **Judul Kartu:** `text-sm sm:text-base font-semibold tracking-[-0.015em] text-ink`
- **Body / Paragraf:** `text-[13px] leading-5 text-muted`
- **Label Form:** `text-xs font-medium text-ink-soft`
- **Pills / Chips:** `text-xs font-medium`
- **Tabular Data / Stempel Waktu / ID Agen:** `font-mono text-[11px] text-subtle`

> **Aturan Tipografi:** Monospace (`font-mono`) **HANYA** digunakan untuk data tabular, stempel video (`00:35`), ID agen (`#AG-042`), dan hitungan metrik teknis. Jangan gunakan font monospace untuk judul atau paragraf deskripsi!

### C. Elevasi & Bentuk Komponen

- **Kanvas Luar:** `min-h-screen bg-bg p-4 sm:p-8`
- **Kartu Mengambang (*Floating Cards*):** `bg-surface rounded-2xl border border-line shadow-[0_4px_20px_rgb(0_0_0/0.03)] p-5 sm:p-6`
- **Tombol & Tab Navigasi:** Bentuk pil kapsul penuh (`rounded-full`)
- **Input Form:** `rounded-xl border border-line bg-surface h-10 px-3.5 text-[13px] focus:border-primary-40 focus:ring-2 focus:ring-primary-10`

---

## 4. Komponen Kunci Antarmuka

### 1. Top Navigation Bar Mengambang
Navigasi ditaruh dalam kontainer putih ber-radius tinggi yang bersih:
```tsx
<header className="sticky top-4 z-40 mx-auto max-w-[1240px] px-4">
  <div className="flex h-14 items-center justify-between rounded-full border border-line bg-surface/90 px-5 shadow-[0_4px_20px_rgb(0_0_0/0.04)] backdrop-blur-md">
    <div className="flex items-center gap-3">
      <Logo />
      <span className="text-line">/</span>
      <span className="text-xs font-medium text-ink-soft">Kedai Selasar Kopi</span>
      <span className="rounded-full bg-impact-10 px-2 py-0.5 font-mono text-[10px] font-semibold text-impact">SIAP</span>
    </div>
    <nav className="flex items-center gap-1.5 rounded-full bg-bg p-1">
      <button className="rounded-full bg-primary-40 px-4 py-1.5 text-xs font-medium text-white shadow-sm">Dasbor</button>
      <button className="rounded-full px-4 py-1.5 text-xs font-medium text-muted hover:text-ink">Monolog Agen</button>
      <button className="rounded-full px-4 py-1.5 text-xs font-medium text-muted hover:text-ink">Rencana Tally</button>
    </nav>
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-subtle">n = 500 agen</span>
    </div>
  </div>
</header>
```

### 2. Hero Action Card (Visual Anchor Biru Elektrik)
Salah satu kartu sorotan utama (misal Rekomendasi Prioritas #1 atau Gesekan Terbesar) menggunakan latar belakang biru elektrik pekat untuk menjadi jangkar visual halaman:
```tsx
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-40 to-primary-50 p-6 text-white shadow-[0_8px_24px_rgb(47_101_246/0.25)]">
  <div className="flex items-center justify-between">
    <span className="rounded-full bg-white/20 px-3 py-1 font-mono text-[11px] font-medium text-white backdrop-blur-sm">
      TEMUAN UTAMA
    </span>
    <span className="font-mono text-xs text-white/80">Akurasi 88%</span>
  </div>
  <h3 className="mt-4 text-xl font-semibold leading-snug">
    224 dari 342 Calon Pembeli Ragu & Berbalik di Kaki Tangga
  </h3>
  <p className="mt-2 text-[13px] text-white/85 leading-relaxed">
    Penyebab utama: Daftar menu dan jam buka tidak terbaca dari sisi jalan. Memasang standing banner di bawah tangga diperkirakan menaikkan konversi hingga +18%.
  </p>
  <div className="mt-5 flex items-center gap-3">
    <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary-40 shadow hover:bg-white/95">
      Lihat Rekomendasi Pareto
    </button>
  </div>
</div>
```

### 3. Corong 4 Tahap dengan Soft Pill Progress
Corong ditampilkan dengan bar melengkung penuh (*pill bars*) dan penanda persentase yang jelas:
```tsx
<div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
  <div className="flex items-center justify-between border-b border-hairline pb-4">
    <div>
      <h3 className="text-sm font-semibold text-ink">Corong Pengunjung</h3>
      <p className="text-xs text-muted">Perjalanan 500 agen simulasi dari luar toko</p>
    </div>
    <span className="rounded-full bg-primary-10 px-2.5 py-1 font-mono text-[11px] font-medium text-primary-40">4 Tahap</span>
  </div>
  <div className="mt-5 space-y-4">
    {/* Tahap Normal */}
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-medium">
        <span className="text-ink">1. Melihat dari jalan</span>
        <span className="font-mono text-ink">500 <span className="text-subtle">[100%]</span></span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-hairline overflow-hidden">
        <div className="h-full rounded-full bg-primary-40" style={{ width: '100%' }} />
      </div>
    </div>
    {/* Tahap Gesekan Terbesar (Merah) */}
    <div className="rounded-xl bg-friction-10 p-3 border border-friction/20">
      <div className="mb-1.5 flex justify-between text-xs font-medium">
        <span className="text-friction flex items-center gap-1.5">
          3. Naik tangga / Masuk
          <span className="rounded-full bg-friction px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">Drop Terbesar</span>
        </span>
        <span className="font-mono text-friction font-bold">118 <span className="text-friction/80">[23,6%]</span></span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-white overflow-hidden">
        <div className="h-full rounded-full bg-friction" style={{ width: '23.6%' }} />
      </div>
    </div>
  </div>
</div>
```

### 4. Viewport Visual Twin (3D & Fallback)
- Kontainer kartu `rounded-2xl border border-line p-5 bg-surface`.
- Layar viewer 3D menggunakan latar belakang canvas lembut `bg-panel rounded-xl min-h-[400px] relative overflow-hidden border border-hairline`.
- Overlay status kualitas 3D di pojok kanan atas: badge pil `rounded-full bg-surface/90 px-3 py-1 font-mono text-[11px] text-impact border border-line`.
- Jika WebGL gagal atau perangkat lemah, beralih mulus ke denah jalur 2D / pita frame tanpa memunculkan pesan error teknis.

---

## 5. Kompilasi Lengkap: DAFTAR DON'TS ANTI-AI SLOP

Agar hasil implementasi frontend tidak terjebak ke dalam pola-pola generik buatan AI (*AI Slop*), seluruh kode komponen di `fe/` **DIWAJIBKAN** mematuhi larangan-larangan berikut:

### 1. Warna, Tema & Estetika Visual
- ❌ **DILARANG** menggunakan gradasi ungu-biru (`purple-to-blue`) atau *glowing ambient orbs* di belakang teks hero.
- ❌ **DILARANG** memakai kombinasi latar gelap pekat (`#0A0A0A` / `zinc-950`) + teks hijau neon (`emerald-400`) untuk memberi kesan teknis/canggih.
- ❌ **DILARANG** memasang *glassmorphism* (`backdrop-blur`) dan *gradient border* 1px di setiap elemen tanpa alasan fungsional.
- ❌ **DILARANG** memakai *colored drop-shadow* berlebihan (`shadow-lg shadow-indigo-500/20`) pada tombol atau kartu biasa.
- ❌ **DILARANG** menggunakan estetika klise "Second-Order AI" (latar krem hangat + aksen terakota + font serif editorial) yang tidak relevan dengan produk analisis praktis UMKM.
- ❌ **DILARANG** memakai ilustrasi 3D abstrak mengambang (bola kaca melayang, gelombang 3D) atau foto stok AI dengan pencahayaan studio yang terlalu mulus.

### 2. Tipografi & Hierarki Teks
- ❌ **DILARANG** menggunakan font monospace (`JetBrains Mono`, `Fira Code`, `Plex Mono`) untuk paragraf panjang atau judul utama. Monospace strictly hanya untuk kode, ID, timestamp, dan tabular numbers.
- ❌ **DILARANG** hanya memakai satu font sans-serif default (`Inter` mentah) tanpa variasi bobot dan skala kontras.
- ❌ **DILARANG** menaruh *eyebrow label* (`ALL CAPS` kecil berjarak renggang) di atas setiap judul ketika judul di bawahnya sudah sangat jelas.
- ❌ **DILARANG** memberi efek gradasi warna pada sebagian kata di dalam judul (misal: *"Analisis toko dengan **AI-Powered** [warna pelangi]"*).

### 3. Emoji & Ikonografi
- ❌ **DILARANG** menyisipkan emoji di mana pun dalam antarmuka aplikasi—baik di dalam tombol (`🚀 Mulai`), badge (`✨ Baru`), bullet list fitur, maupun pesan error (`Oops 😅`).
- ❌ **DILARANG** menggunakan ikon klise AI secara berulang: `Sparkles`, `Rocket`, `Zap`, `ShieldCheck`, `Bot`, dan `BrainCircuit`.
- ❌ **DILARANG** membungkus ikon dengan kotak persegi bulat berlatar transparan (`p-3 rounded-lg bg-primary/10 text-primary`) di pojok kiri atas setiap kartu fitur.
- ❌ **DILARANG** memasang ikon dekoratif tanpa fungsi di samping setiap label input, judul section, atau teks navigasi.
- ❌ **DILARANG** mencampur ketebalan garis (`stroke-width`) antar ikon. Gunakan standar `stroke-[1.5]` konsisten.

### 4. Tata Letak (*Layout*) & Struktur Halaman
- ❌ **DILARANG** membuat seluruh bagian halaman rata tengah (*center-aligned*). Gunakan *left-aligned grid*, hirarki asimetris, dan tata letak bertingkat.
- ❌ **DILARANG** mengikuti urutan template kaku AI: *Hero rata tengah* $\rightarrow$ *Barisan logo abu-abu* $\rightarrow$ *3 kartu fitur sejajar* $\rightarrow$ *Bento grid* $\rightarrow$ *FAQ accordion*.
- ❌ **DILARANG** menyeragamkan ukuran, tinggi, dan padding (`p-6`) pada semua elemen. Gunakan kontras skala (elemen hero besar vs kartu metrik kompak) untuk menciptakan ritme visual.
- ❌ **DILARANG** menampilkan daftar data padat dalam bentuk kartu bertumpuk (*stacked cards*) yang diperluas penuh. Gunakan tabel data, pola *master-detail*, atau list kompak agar tidak menjadi dinding teks (*wall of text*).
- ❌ **DILARANG** memasang animasi *fade-in-up* yang lambat dan serempak di setiap elemen saat di-scroll.

### 5. Komponen Mikro (*Micro-UI* & Tailwind Mentah)
- ❌ **DILARANG** membiarkan komponen UI library (Shadcn/UI) tampil mentah dengan styling bawaan pabrik tanpa penyesuaian token.
- ❌ **DILARANG** menempelkan badge kategori (`ALL CAPS` kecil) persis di sebelah kanan judul pada setiap baris (`[Judul] [BADGE]`), karena merusak kerapian teks.
- ❌ **DILARANG** memakai badge berbentuk pil di setiap sudut untuk label status yang tidak penting.
- ❌ **DILARANG** menggunakan *nested callout box* (`border-l-2` + teks *italic*) secara berulang di dalam kartu untuk menampilkan ringkasan.
- ❌ **DILARANG** meletakkan lingkaran skor (`92`) mengambang sendirian di pojok kanan atas kartu tanpa konteks pendukung.
- ❌ **DILARANG** memakai placeholder inisial avatar generik (`JD`, `AS`) atau foto stok yang kontrasnya pecah dari tema halaman.
- ❌ **DILARANG** membuat chart grafik dummy dengan garis linear kaku (`10, 20, 30, 40`) tanpa formatting sumbu angka, satuan rupiah, dan tooltip interaktif yang realistis.
- ❌ **DILARANG** menggunakan pemisah garis dengan teks di tengah (`--- ATAU ---`) di luar form autentikasi.

### 6. *Copywriting* & Teks Antarmuka
- ❌ **DILARANG** menggunakan headline abstrak klise yang tidak menjelaskan fungsi (misal: *"Revolusikan tokomu"*, *"Kekuatan AI tanpa batas"*). Tulis langsung fungsinya: *"Tahu di mana pembeli ragu, dari satu video."*
- ❌ **DILARANG** menggunakan tanda baca *em-dash* (`—`) secara berlebihan dan pola kalimat dramatis (*"Ini bukan sekadar data. Ini adalah masa depan tokomu."*).
- ❌ **DILARANG** mengulang pola kalimat pembuka yang identik di setiap kartu ringkasan.
- ❌ **DILARANG** memasang angka metrik palsu atau klise (*"99.9% Akurat | 10.000+ Toko"*) tanpa dasar data riil.
- ❌ **DILARANG** memaksakan terjemahan bahasa Indonesia yang terdengar kaku, aneh, atau tidak wajar untuk istilah UI/teknis yang sudah umum dalam bahasa Inggris.

#### Aturan Bahasa & Istilah Copywriting:
- **Bahasa Utama:** Gunakan **Bahasa Indonesia** yang praktis, santai, dan bersahabat untuk pemilik UMKM dengan sapaan *"kamu"*.
- **Pengecualian Istilah Inggris (Prinsip Kelaziman):** Tetap gunakan istilah bahasa Inggris jika istilah tersebut **jauh lebih umum dan terdengar janggal/kaku jika dipaksakan diterjemahkan**.
  - *Gunakan Inggris (karena lebih lazim):* `Dashboard`, `Login`, `Register`, `Upload`, `Download`, `Filter`, `Checkpoint`, `Viewport`, `Batch`, `Drop-off`, `Tooltip`, `Live preview`.
  - *Gunakan Indonesia (karena jelas dan natural):* `Mulai Analisis`, `Konteks Usaha`, `Verifikasi Transkrip`, `Tersimpan otomatis`, `Peluang Naik`, `Gesekan Terbesar`, `Rencana Pengukuran`, `Simulasi Ulang`, `Coba Lagi`.
  - *Hindari terjemahan aneh:* Jangan gunakan istilah yang tidak lazim di telinga pengguna sehari-hari (misal: memaksakan "turun muat" untuk *download*, "pembelokan" untuk *dropdown*, dsb.).

---

## 6. Ringkasan Prompt Anti-Slop (Untuk Implementasi Kode FE)

Gunakan pegangan ringkas ini saat menyusun atau memvalidasi komponen React:

> **ANTI-SLOP FE RULES:**
> 1. **Zero Emojis:** Tidak ada emoji di tombol, badge, card, atau pesan error.
> 2. **No Cliché Icons:** Hindari ikon `Sparkles`, `Rocket`, `Zap`, `Bot`. Gunakan inline SVG `stroke-[1.5]` fungsional.
> 3. **Typography Balance:** Geist Sans untuk UI judul/isi, IBM Plex Mono HANYA untuk angka, timestamp, dan tabular metrics.
> 4. **Modern Pillowy SaaS Aesthetic:** Kanvas lembut (`bg-[#f3f5f8]`), floating cards putih (`rounded-2xl shadow-sm border border-line`), tombol & chip serba pil kapsul (`rounded-full`), dan satu *Hero Card* aksen biru elektrik sebagai *visual anchor*.
> 5. **Smooth Data Viz:** Grafik area lengkung halus, corong 4 tahap dengan *pill bars*, dan tooltip gelap interaktif melayang.
> 6. **Natural Copy:** Bahasa Indonesia santai dan praktis (sapaan "kamu"), angka simulasi selalu berstatus hipotesis. Tetap gunakan istilah bahasa Inggris jika jauh lebih umum dan aneh jika dipaksakan ke bahasa Indonesia (misal: *Dashboard*, *Upload*, *Filter*, *Drop-off*, *Checkpoint*).
