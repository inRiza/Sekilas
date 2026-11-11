# PRD Final: Sekilas, Simulator Calon Pelanggan untuk UMKM Makanan

**Versi:** 1.1 (final 1.0 ditambah detail yang masih relevan dari v0.2 dan temuan uji lokal)
**Tanggal:** 11 November 2026
**Status:** Acuan pembangunan hackathon

**Keputusan yang mengikat dokumen ini:**

1. Keputusan agen diambil penuh oleh LLM (GPT-6 Luna), bukan model matematika terpisah, karena tujuan utamanya mensimulasikan calon pembeli.
2. Corong konversi memakai versi v0.2 (5 tahap).
3. Rekomendasi dihitung lewat ablasi: transkrip diubah, 500 agen yang sama dijalankan ulang, hasil diagregasi ulang.
4. Skenario lingkungan (hujan, jam ramai, dst.) dikeluarkan dari demo. Variasi konteks dibawa oleh persona.
5. Gemini 3.8 Flash menghasilkan transkrip tak terstruktur: deskripsi bebas yang sedetail mungkin per segmen video, dengan frame pendukung.
6. 500 agen GPT-6 Luna melihat tempat usaha hanya lewat transkrip tersebut.
7. Parameter video (durasi, resolusi, jumlah frame) ditetapkan belakangan; nilai awal dicatat sebagai usulan, diperbarui dengan data uji lokal (F2).
8. **Simulasi tidak menunggu Visual Twin.** Transkrip dan 3D berjalan paralel dan baru digabung di agregasi dan dasbor lewat stempel waktu (bagian 4.3).

**Perubahan 1.1 terhadap 1.0:** perbaikan diagram arsitektur (3D bergabung di agregasi, bukan masukan simulasi), penyimpanan dan model data, orkestrasi job, kunci penggabung berbasis waktu, kontrak API, halaman Riwayat, komponen bersama dan tata letak dasbor (dari v0.2), gerbang kualitas 3D, detail penyelarasan 3D, mode lokal, parameter video berdasarkan uji, dan lampiran video uji.

---

## 1. Tujuan Utama Produk

**Sekilas mensimulasikan calon pelanggan yang melihat tempat usaha dari luar, supaya pemilik UMKM makanan tahu di titik mana dan karena apa calon pelanggan ragu lalu pergi, serta perubahan kecil apa yang paling layak dicoba lebih dulu.**

Versi satu kalimat untuk pemilik: *Tahu di mana pelanggan ragu, dari satu video.*

### Cara kerja inti

1. Pemilik merekam satu video dari sisi jalan sampai titik pesan, dan mengisi konteks singkat.
2. Video diburamkan di browser (wajah dan plat nomor), lalu dibaca Gemini 3.8 Flash menjadi transkrip deretan kejadian: teks bebas yang detail, berpasangan dengan frame bukti.
3. Pemilik memeriksa dan mengoreksi transkrip.
4. 500 agen GPT-6 Luna, masing-masing dengan persona tetap yang berbeda, membaca transkrip, bermonolog, memutuskan, dan berhenti di satu titik.
5. Hasil agen diagregasi menjadi corong, peta panas pada Visual Twin (model 3D sederhana dari jalur yang direkam), dan rekomendasi bergaya Pareto 80/20.
6. Pemilik membuktikan hipotesis dengan tally manual.

### Klaim yang dibuat

- Menemukan titik gesekan sebagai **hipotesis**.
- Menunjukkan letaknya secara visual dan menjelaskan alasannya lewat monolog agen.

### Klaim yang tidak dibuat

- Memprediksi jumlah pelanggan atau omzet nyata.
- Model 3D yang akurat ukurannya.
- Hasil yang identik pada setiap pengulangan (karena keputusan dari LLM). Yang dijanjikan adalah rentang dan kestabilan arah temuan.

---

## 2. Masalah dan Pengguna

### Masalah

- Pemilik hanya melihat pelanggan yang berhasil masuk, bukan keputusan tidak jadi masuk. Ia tidak bisa membedakan masalah visibilitas, harga, atau kebiasaan pelanggan.
- Yang dilakukan sekarang: menebak, mengganti papan atau harga tanpa pengukuran, atau menyalahkan lokasi.
- Mengumpulkan data corong kunjungan secara manual terlalu berat untuk usaha yang sibuk.
- Laporan teks dan grafik sulit dihubungkan ke tempat fisik. Pemilik perlu melihat di mana persisnya masalah itu ada.

### Pengguna utama

Pemilik atau pengelola tempat makan kecil (warung, kedai, kafe, resto ruko) yang pelanggannya datang langsung. Tidak teknis, memakai ponsel, waktunya sedikit, butuh bahasa sehari-hari.

---

## 3. Tujuan dan Non-Tujuan

### Tujuan

1. Pemilik cukup merekam satu video dan mengisi konteks singkat.
2. Transkrip bisa diperiksa dan diperbaiki pemilik sebelum simulasi.
3. Setiap temuan bisa dilacak ke frame bukti, ke monolog agen, dan ke lokasinya di Visual Twin.
4. Rekomendasi diurutkan menurut dampak besar dan usaha kecil (Pareto), hanya jika efeknya melampaui noise simulasi.
5. Semua panggilan model dicatat sehingga hasil dapat diaudit.
6. Hasil diperlakukan sebagai hipotesis yang bisa diuji lewat tally manual.

### Non-tujuan (versi demo)

- Bukan prediksi jumlah pelanggan atau omzet.
- Hanya satu jenis usaha: tempat makan.
- Tidak ada skenario lingkungan (hujan, jam ramai, tetangga penuh) dan tidak ada pemilih skenario.
- Tidak membuat video sebelum dan sesudah, dan tidak menggambar ulang perbaikan di model 3D.
- Tidak mendukung banyak lokasi atau akun tim.
- Tidak menyimpan video mentah setelah pemrosesan.
- Visual Twin hanya pada tingkat visual twin (tampilan realistis). Bukan geometric twin (skala metrik, bisa diukur) dan bukan semantic twin (BIM/IFC). Skalanya perkiraan, tidak dipakai untuk ukuran atau renovasi.
- Tidak memakai LiDAR, dan hanya jalur yang direkam yang dimodelkan.
- Tidak menjamin reproduksi identik (lihat F5).

---

## 4. Arsitektur Sistem

```
[Kamera ponsel / unggah video]
        |
        v
[Worker ingesti di browser]
  - peringatan gerak (giroskop/akselerometer)
  - stempel waktu tiap checkpoint (dasar zona, 4.3)
  - blur wajah dan plat (MediaPipe)
  - buang frame buram (variansi Laplacian)
        |
        +---------------------------+
        | (frame terburam)          | (video terburam)
        v                           v
[Visual Twin - worker 3D]      [VLM: Gemini 3.8 Flash]
  - masking SAM 2                - transkrip tak terstruktur
  - pose: COLMAP / VGGT            per segmen + frame bukti
  - transforms.json              - tulis juga yang TIDAK terlihat
  - pilih model terbesar               |
  - orientasi + lantai                 v
  - awan titik / splat         [Verifikasi pemilik]
  - gerbang kualitas                   |
        |                              v
        |                     [Simulasi 500 agen - GPT-6 Luna]
        |                       - 500 persona tetap, dibagi ke batch
        |                       - monolog, keputusan, titik berhenti, faktor
        |                              |
        |  (camera_path + up +         | (keputusan tersimpan)
        |   kualitas, per stempel      |
        |   waktu)                     |
        +-------------+----------------+
                      v
        [Agregasi]  <- penggabung: stempel waktu segmen -> pose kamera
          - corong 5 tahap
          - bobot friksi per segmen (peta panas di jalur)
          - pelabelan faktor ke katalog isyarat
          - ablasi berpasangan, Pareto
                      |
                      v
        [Dasbor Analitik - Next.js]
          - Visual Twin 3D (React Three Fiber), atau tampilan cadangan
          - corong, matriks dampak vs usaha (Recharts / Visx)
          - bus peristiwa Zustand: pin 3D, transkrip, agen, rekomendasi
```

Prinsip arsitektur:

- **Agen hanya tahu apa yang ada di transkrip dan konteks usaha.** Kualitas simulasi dibatasi kualitas transkrip, sehingga verifikasi pemilik adalah tahap wajib.
- **LLM memutuskan, kode menghitung.** Corong, bobot friksi, dan Pareto dihitung secara deterministik dari keputusan agen yang sudah tersimpan.
- **Visual Twin hanya menampilkan hasil dan tidak menahan simulasi.** Ia tidak ikut menentukan keputusan agen dan baru digabung di agregasi. Jika 3D belum siap atau gagal, dasbor tetap tampil dengan tampilan cadangan, lalu Visual Twin menyusul.
- **`transforms.json` adalah batas antar tahap 3D.** Tahap pose (COLMAP atau VGGT) bisa diganti tanpa mengubah tahap sesudahnya.

### 4.1 Penyimpanan dan model data

| Data | Tempat | Catatan |
| --- | --- | --- |
| Analisis (status wizard, flag kedaluwarsa) | Postgres | satu baris per video |
| Konteks usaha, menu | Postgres | F1 |
| Frame bukti terburam | object storage | dirujuk lewat `frame_keys` |
| Segmen transkrip + jejak audit edit | Postgres | F3, F4; perubahan pemilik bertanda dan berversi |
| Persona (500, tetap per analisis) | Postgres | dipakai ulang di semua run dan ablasi |
| Run (dasar dan ablasi), versi model dan prompt | Postgres | nomor run, status, biaya |
| Keputusan agen | Postgres | satu baris per agen per run |
| Hasil agregasi dan ablasi | Postgres | dihitung ulang dari keputusan, bisa dicache |
| Aset 3D (PLY, splat, `camera_path.json`, metadata `up` dan kualitas) | object storage | dibangun sekali per video |
| Log panggilan model | Langfuse | auditabilitas |

Video mentah tidak disimpan. Mengubah transkrip menandai hasil run lama kedaluwarsa, tetapi aset 3D tetap dipakai.

### 4.2 Orkestrasi job

- Setiap pekerjaan berat (transkrip, 3D, run agen, ablasi) adalah job di antrean dengan status `antre`, `berjalan`, `selesai`, `gagal`, dan progres.
- Job 3D berjalan di antrean terpisah (GPU atau mode lokal), job LLM di antrean dengan konkurensi terbatas dan retry per batch.
- Job idempoten per masukan: transkrip yang sama tidak memicu ulang 3D; video yang sama tidak memicu ulang transkrip kecuali diminta.
- UI membaca status lewat polling atau server-sent events. Halaman 4 dan 6 hanya menampilkan status job.

### 4.3 Kunci penggabung: zona dan segmen berbasis waktu

- Saat merekam, setiap ketukan checkpoint (F2) menyimpan **stempel waktu**. Zona adalah rentang waktu antar-checkpoint (misal Dasar tangga = detik 18 sampai 26), bukan posisi 3D.
- Segmen transkrip punya `timestamp_start` dan `timestamp_end`; jalur kamera 3D punya posisi per stempel waktu frame.
- Penggabungan di agregasi cukup mencari pose kamera pada stempel waktu segmen. Dengan begitu transkrip, simulasi, dan 3D bisa berjalan tanpa saling menunggu, dan menambah atau menghapus segmen tidak perlu membangun ulang 3D.

### 4.4 Kontrak API (ringkas)

| Metode dan jalur | Fungsi |
| --- | --- |
| `POST /analyses` | membuat analisis |
| `PUT /analyses/{id}/context` | menyimpan konteks usaha (F1) |
| `POST /analyses/{id}/video` | unggah video terburam + stempel waktu checkpoint, memicu job transkrip dan 3D |
| `GET /analyses/{id}/jobs` | status semua job |
| `GET`, `PATCH`, `POST /analyses/{id}/transcript/...` | membaca dan mengedit segmen (F4) |
| `POST /analyses/{id}/runs` | menjalankan simulasi (ditolak jika antrean tidak pasti belum kosong) |
| `GET /analyses/{id}/agents` | daftar agen dengan filter (halaman 8) |
| `GET /analyses/{id}/dashboard` | hasil agregasi, sudah lolos verifier |
| `GET /analyses/{id}/twin` | aset 3D, mode tampilan, kualitas |
| `POST /analyses/{id}/measurement-plan` | rencana pengukuran (F6-G) |
| `GET /analyses` | daftar analisis untuk halaman Riwayat |

---

## 5. Alur Pengguna dan Halaman

### 5.1 Alur

```
Konteks + video -> Cek kualitas & privasi -> Transkrip (+ Visual Twin, paralel)
  -> Verifikasi pemilik -> Simulasi 500 agen -> Dasbor Analitik -> Rencana pengukuran
```

Aplikasi berbentuk wizard satu arah (halaman 1 sampai 7), dengan dua halaman lanjutan dari Dasbor (8 dan 9) dan satu halaman Riwayat (10). Pemilik boleh kembali ke langkah sebelumnya dari penanda langkah. Mengubah transkrip setelah dasbor jadi menandai dasbor lama kedaluwarsa dan menawarkan simulasi ulang. Visual Twin tidak dibangun ulang kecuali video diganti.

### 5.2 Daftar halaman

| # | Halaman | Tujuan | Fitur |
| --- | --- | --- | --- |
| 1 | Beranda | Menjelaskan produk, memulai analisis, membuka Riwayat | - |
| 2 | Konteks Usaha | Mengumpulkan data yang tidak terlihat dari video | F1 |
| 3 | Rekam Video | Merekam atau mengunggah video berpanduan | F2 |
| 4 | Memproses | Menunggu transkrip dan Visual Twin | F3, F7 |
| 5 | Verifikasi Transkrip | Memeriksa dan memperbaiki transkrip | F4 |
| 6 | Menjalankan Simulasi | Menunggu 500 agen selesai | F5 |
| 7 | Dasbor Analitik | Temuan, Visual Twin, rekomendasi | F6, F7 |
| 8 | Jelajah Agen | Membaca monolog, keputusan, dan jalur tiap agen | F5, F6 |
| 9 | Rencana Pengukuran | Rencana pembuktian lewat tally manual | F6 |
| 10 | Riwayat | Daftar analisis sebelumnya dan pintu masuk ke dasbornya | - |

### 5.3 Ringkasan per halaman

**1. Beranda.** Satu kalimat nilai, tombol Mulai Analisis, tautan ke Riwayat.

**2. Konteks Usaha.** Form lima isian wajib (jenis usaha, lokasi dan deskripsi letak, menu dan harga, jam buka, jam ramai) plus tetangga (opsional). Menu bisa diketik atau dari foto; hasil baca tampil sebagai tabel yang bisa dikoreksi. Jika foto tidak terbaca, beralih ke input manual.

**3. Rekam Video.** Kamera, pengatur waktu, daftar checkpoint (terlihat dari jalan, pintu atau tangga, penanda atau papan, menu dan harga, titik pesan), satu kalimat panduan, opsi unggah. Indikator gerak: terlalu cepat, atau jangan hanya berputar tapi sambil berjalan. Setelah rekam: cek kualitas dan pratinjau hasil blur. Video terlalu gelap, goyang, atau pendek ditolak dengan pesan jelas. Otomatis berhenti di durasi maksimum.

**4. Memproses.** Progres bertahap (mengunggah, membaca video, menyusun kejadian, membangun tampilan 3D). Transkrip dan Visual Twin berjalan paralel; halaman 5 terbuka begitu transkrip siap. Jika transkrip gagal, ada tombol Coba lagi tanpa kehilangan video. Jika Visual Twin gagal, alur lanjut dengan tampilan cadangan.

**5. Verifikasi Transkrip.** Pemutar video dengan garis waktu segmen, dan daftar segmen berpasangan dengan frame bukti. Aksi per segmen: Benar, Ubah, Hapus, Tambah. Edit via LLM (instruksi singkat, hasil sebelum/sesudah, berlaku setelah Terima). Segmen berkeyakinan rendah masuk antrean wajib konfirmasi. Tombol Jalankan Simulasi nonaktif sampai antrean itu kosong. Peta mini Visual Twin tampil jika sudah siap.

**6. Menjalankan Simulasi.** Progres agen (misal 320 dari 500), dengan tahap menjalankan agen, mengagregasi, dan menyusun dasbor. Jika sebagian batch gagal, batch itu diulang otomatis; jika tetap gagal, dasbor memberi penanda jumlah agen yang berhasil.

**7. Dasbor Analitik.** Visual Twin di pusat, dikelilingi tiga poin utama, corong, rekomendasi Pareto, matriks dampak vs usaha, dan catatan kepercayaan. Detail di F6, F7, dan tata letak di 5.5.

**8. Jelajah Agen.** Daftar agen dengan persona, monolog, keputusan, dan alasan; filter menurut keputusan, tahap corong, dan titik berhenti. Memilih agen memutar perjalanannya di Visual Twin. Boleh dibuat sebagai panel samping Dasbor.

**9. Rencana Pengukuran.** Apa yang dihitung, berapa lama, data minimum, lembar tally yang bisa dicetak, dan tangkapan Visual Twin dengan tanda titik berdiri pemilik. Bagian ini menutup celah bahwa simulasi bersifat hipotesis (lihat F6-G).

**10. Riwayat.** Kartu per analisis: nama, tanggal, status (memproses, siap, kedaluwarsa), label kualitas 3D (F7), dan ringkasan temuan jika sudah ada. Klik kartu membuka dasbornya. Kartu "Analisis baru" menuju halaman 2. Sesuai tab Riwayat di desain Figma.

### 5.4 Komponen bersama dan status galat

- **Modal Bukti Frame:** snapshot diperbesar, stempel waktu, tombol Lompat ke video dan Lihat di 3D. Dipakai di halaman 5, 7, dan 8.
- **Penanda langkah:** posisi wizard di bagian atas halaman 2 sampai 7.
- **Banner catatan kepercayaan:** tampil di halaman 7 dan 9 (F6-H).
- **Status galat** selalu dalam bahasa sehari-hari dengan satu tindakan jelas: foto menu tidak terbaca (beralih ke input manual), video ditolak (rekam ulang), transkrip gagal (Coba lagi tanpa kehilangan video), 3D gagal (tampilan cadangan dengan catatan singkat), batch agen gagal (diulang otomatis, lalu penanda jumlah agen berhasil).

### 5.5 Tata letak dasbor

Desktop dan tablet:

```
+----------------------------------------------------------------------+
| Banner catatan kepercayaan  |  status: terbaru / kedaluwarsa          |
+----------------------------------------------------------------------+
| [KPI] Tahap gesekan terbesar | Faktor utama | Peluang naik (rentang)  |
+--------------------------------------------+-------------------------+
|                                            | Tiga poin utama         |
|        VISUAL TWIN (3D)                    |-------------------------|
|  - jalur kamera berwarna (friksi)          | Corong 5 tahap          |
|  - pin per segmen transkrip                | (tahap terburuk disorot)|
|  - lapisan: Kejadian | Gesekan | Agen      |-------------------------|
|  - label kualitas 3D                       | Rekomendasi Pareto      |
|                                            | (Prioritas / Nanti)     |
+--------------------------------------------+-------------------------+
| Matriks dampak vs usaha  |  Segmen tidak pasti  |  Jumlah run         |
+----------------------------------------------------------------------+
| [Buat Rencana Pengukuran]  [Lihat monolog agen]                       |
+----------------------------------------------------------------------+
```

Ponsel: banner, KPI (geser), Visual Twin setinggi sekitar setengah layar (bisa layar penuh), tiga poin, corong, rekomendasi, catatan kepercayaan.

### 5.6 Prioritas jika waktu mepet

| Prioritas | Isi |
| --- | --- |
| **Wajib** | Halaman 2, 3, 5, 7: konteks, rekam, verifikasi, dasbor (KPI, corong, peta panas, rekomendasi) |
| **Versi sederhana** | Halaman 1 satu tombol; halaman 4 dan 6 layar tunggu; halaman 10 daftar sederhana; Visual Twin berupa awan titik dan jalur kamera tanpa Gaussian Splatting |
| **Boleh ditunda** | Halaman 8 (jadi panel), halaman 9 (jadi bagian akhir dasbor), lapisan agen beranimasi, peta mini di halaman 5, Panel Tanya Sekilas (RAG), edit via LLM |

---

## 6. Kebutuhan Fungsional

### F1. Konteks Usaha

Form meminta konteks yang tidak terlihat dari video, dibatasi agar selesai di bawah 3 menit.

| Isian | Tipe | Wajib |
| --- | --- | --- |
| Jenis usaha | pilihan | ya |
| Lokasi (alamat atau pin) dan deskripsi letak, misal lantai 2 ruko | teks + peta | ya |
| Menu dan harga (manual atau foto menu) | daftar / gambar | ya |
| Jam buka | rentang jam | ya |
| Jam ramai | rentang jam | ya |
| Tetangga atau pesaing terdekat | teks | tidak |

**Kriteria penerimaan:**

- Foto menu dibaca otomatis menjadi daftar menu dan harga yang bisa dikoreksi.
- Konteks disuntikkan ke masukan agen sebagai informasi yang agen ketahui atau tidak ketahui, tergantung apakah terlihat dari jalan. Contoh: harga baru diketahui agen jika menu terbaca di transkrip.

### F2. Video

Pemilik merekam satu video dari sisi jalan, tempat calon pelanggan pertama kali melihat usaha, sampai titik pesan.

- **Berhenti:** saat sampai titik pesan, atau saat durasi maksimum tercapai.
- **Checkpoint di layar:** terlihat dari jalan, pintu atau tangga, penanda atau papan, menu dan harga, titik pesan. Setiap ketukan checkpoint menyimpan stempel waktu (dasar zona, 4.3). Tombol Selesai aktif setelah minimal checkpoint menu dan harga atau titik pesan terpenuhi.
- **Panduan:** rekam seperti pelanggan baru yang mencari tempat makan, pelan dan tegak, sambil berjalan. Gunakan lensa utama, bukan ultra-wide. Rekam saat terang dan di luar jam ramai.
- **Sensor gerak:** peringatan real-time jika rotasi kamera terlalu cepat atau jika hanya berputar di tempat. Rekonstruksi 3D butuh perpindahan posisi dan gambar yang tidak buram.
- **Privasi:** wajah dan plat nomor diburamkan di browser sebelum data keluar dari perangkat, dengan pratinjau hasil blur.
- **Unggah:** sarankan file asli dari galeri. Video yang sudah lewat WhatsApp atau media sosial biasanya terkompres (misal 576×1024).

**Parameter (usulan, diperbarui dari uji lokal; dikunci setelah M7):**

| Parameter | Nilai |
| --- | --- |
| Format | MP4 atau WebM |
| Resolusi | dinilai dari **sisi terpendek** (portrait dan landscape sama): di bawah 480 px ditolak, 480 sampai 719 px diterima dengan peringatan, 720 px ke atas baik; ideal 1080 |
| Durasi | minimal 20 detik, ideal 60 sampai 120 detik, maksimum 180 detik |
| Ekstraksi frame untuk 3D | 2 sampai 3 fps, sekitar 120 sampai 300 frame setelah frame buram dibuang |
| Ambang rotasi | peringatan jika lebih dari 60 derajat per detik |
| Blur | gaussian, radius 15 px |

**Kriteria penerimaan:** video terlalu gelap, terlalu goyang, atau terlalu pendek ditolak dengan pesan jelas dan saran rekam ulang.

### F3. Video menjadi Transkrip Tak Terstruktur

Gemini 3.8 Flash membaca video terburam dan menulis **transkrip deretan kejadian** berbentuk teks bebas, sedetail mungkin, per segmen waktu. Transkrip ini adalah satu-satunya mata bagi 500 agen, jadi isinya harus menjawab apa yang akan dilihat dan dipikirkan calon pelanggan di titik itu.

**Kontrak data.** Hanya metadata kecil yang terstruktur; isi utamanya teks bebas. VLM tidak mengisi kategori isyarat atau tingkat gesekan, karena penilaian itu adalah tugas agen.

```typescript
interface TranscriptSegment {
  id: string;                  // misal seg_03
  timestamp_start: number;     // detik relatif video
  timestamp_end: number;
  frame_keys: string[];        // satu atau lebih frame bukti terburam
  vantage: 'jalan' | 'pintu' | 'dalam';   // posisi pandang pelanggan
  zone_id?: string;            // zona dari checkpoint (4.3)
  narrative: string;           // deskripsi bebas, sedetail mungkin
  not_visible: string;         // apa yang TIDAK terlihat atau tidak terbaca di titik ini
  confidence: 'stabil' | 'tidak_pasti';
  camera_pose?: {              // diisi saat penggabungan dari camera_path (F7)
    position: [number, number, number];
    look_vector: [number, number, number];
  };
}
```

**Aturan penulisan untuk VLM:**

- Tulis urut menurut yang dilihat pelanggan dari jauh ke dekat, dan pecah segmen menurut sudut pandang (jalan, pintu, dalam) agar agen bisa berhenti lebih awal.
- Wajib mengisi `not_visible`, misal tidak ada papan jam buka dari sisi jalan. Hal yang tidak ditulis akan dianggap tidak ada oleh agen.
- Tuliskan detail yang menentukan keputusan: ukuran dan keterbacaan tulisan, jarak, kemiringan tangga, pencahayaan, tanda buka atau tutup, suasana, harga yang terbaca.
- Tidak menulis ciri pribadi orang (wajah, nama). Orang hanya disebut sebagai keramaian.
- Segmen tanpa frame bukti dibuang. Boleh menjawab tidak terlihat jelas. Keyakinan rendah ditandai `tidak_pasti`.

**Kriteria penerimaan:** setiap segmen menampilkan frame yang bisa diperbesar, dan klik segmen melompat ke posisi yang sama di pemutar video.

### F4. Verifikasi Transkrip oleh Pemilik

Transkrip diperiksa pemilik sebelum simulasi, karena satu salah baca akan terduplikasi di 500 agen.

- **Tampilan:** pemutar video dan daftar segmen berpasangan dengan frame, tersinkron.
- **Aksi per segmen:** Benar, Ubah (edit teks langsung, selalu tersedia dan tidak bergantung LLM), Hapus, Tambah segmen.
- **Edit via LLM (tambahan):** pemilik menulis instruksi singkat, LLM mengusulkan perbaikan sebagai sebelum dan sesudah, berlaku hanya setelah Terima.
- **Beban minimal:** hanya segmen `tidak_pasti` yang wajib dikonfirmasi atau dihapus; sisanya cukup ditinjau.

**Kriteria penerimaan:**

- Simulasi tidak bisa dijalankan sebelum antrean tidak pasti kosong.
- Setiap perubahan bertanda diubah pemilik dan masuk jejak audit. Perubahan pemilik selalu dianggap lebih benar daripada keluaran model.
- Segmen yang dihapus hilang dari Visual Twin; segmen yang ditambah muncul sebagai pin baru (posisi dari stempel waktu, tanpa membangun ulang 3D).

### F5. Simulasi 500 Agen (GPT-6 Luna)

Setiap agen adalah persona yang melihat tempat usaha lewat transkrip terverifikasi dan konteks usaha, lalu memutuskan dengan bermonolog. Simulasi tidak menunggu Visual Twin (keputusan 8).

**Persona tetap.** 500 persona dibuat sekali per analisis dengan sampling terstratifikasi, lalu disimpan dan dipakai ulang pada setiap run dan setiap ablasi. Persona tidak diacak ulang.

| Dimensi | Sebaran |
| --- | --- |
| Sensitivitas anggaran | mahasiswa pas-pasan 40%, pekerja rata-rata 40%, konsumen fleksibel 20% |
| Kesabaran dan kemalasan fisik | malas jalan atau naik tangga 35%, normal 45%, rela eksplorasi 20% |
| Konteks makan | sendiri terburu-buru 30%, pasangan santai 40%, rombongan keluarga atau teman 30% |

Setiap persona diberi kartu singkat yang konkret (kebiasaan, mood hari itu, alasan ada di sekitar situ) dan boleh memutuskan pergi karena alasan sepele. Ini menjawab risiko agen yang terlalu rasional dan seragam.

**Batching.** Bawaan: 50 panggilan, masing-masing 10 persona, dengan prompt caching untuk sistem pesan (konteks toko, transkrip, aturan evaluasi). Urutan persona dalam batch diacak. Ukuran batch bukan angka final: lihat spike di M5.

**Cara agen berjalan.** Agen membaca segmen berurutan. Di setiap segmen ia menulis monolog singkat lalu memilih lanjut atau berhenti. Ia tidak boleh memakai informasi dari segmen yang belum ia capai.

**Skema keluaran per batch (divalidasi skema, batch gagal diulang):**

```typescript
interface AgentDecisionResponse {
  batch_id: number;
  results: Array<{
    agent_id: number;
    monologue: string;               // monolog internal per segmen yang dilewati, ringkas
    final_decision:
      | 'lewat'                      // tidak berhenti dari jalan
      | 'berhenti_lalu_pergi'        // berhenti atau mendekat, tidak naik atau masuk
      | 'masuk_tanpa_memesan'        // naik atau masuk, tidak memesan
      | 'memesan';
    will_return?: boolean;           // hanya jika memesan: niat kembali
    stopped_at_segment_id: string | null;   // null jika memesan
    deciding_factor: string;         // 1-2 kalimat, bahasa bebas
    factor_segment_ids: string[];    // segmen yang menjadi dasar alasan
    hesitation_score: number;        // 1 (yakin) sampai 5 (sangat ragu)
  }>;
}
```

**Kestabilan hasil (pengganti klaim seed tetap).**

- Suhu rendah, persona tetap, versi model dikunci, semua panggilan dan prompt dicatat.
- Run dasar dijalankan 3 kali untuk mengukur noise antar-run. Angka ditampilkan sebagai rentang.
- Hasil yang tidak stabil antar-run tidak ditampilkan sebagai temuan.

**Kriteria penerimaan:**

- 500 agen selesai dalam target di bawah 3 menit untuk satu run, dengan antrean berkonkurensi terbatas dan retry.
- Setiap agen punya monolog, keputusan, dan alasan yang tersimpan dan bisa dibuka.
- Distribusi keputusan pada sampel kecil dibandingkan antara 1, 5, dan 10 agen per panggilan; ukuran batch dipilih berdasarkan uji itu.

### F6. Agregasi dan Isi Dasbor

Semua angka dihitung oleh kode dari keluaran agen yang sudah tersimpan. LLM hanya dipakai untuk melabeli alasan dan menulis ringkasan.

**A. Corong (5 tahap).**

1. Melihat: 500 agen.
2. Berhenti (tertarik): 500 dikurangi jumlah `lewat`.
3. Naik atau masuk: tahap 2 dikurangi jumlah `berhenti_lalu_pergi`.
4. Memesan: tahap 3 dikurangi jumlah `masuk_tanpa_memesan`.
5. Kembali: jumlah `memesan` dengan `will_return` benar. Tahap ini adalah niat yang dinyatakan agen, bukan perilaku, dan diberi label itu di UI.

Tahap dengan penurunan terbesar disorot, disertai faktor utamanya.

**B. Bobot friksi dan peta panas.** Untuk setiap segmen: jumlah agen dengan `stopped_at_segment_id` sama dengan id segmen, dibagi 500. Nilai ini diikatkan ke pose kamera pada stempel waktu segmen itu (4.3) dan dirender sebagai gradien hijau ke merah di sepanjang jalur Visual Twin. Intensitas bersifat relatif, bukan persentase pelanggan nyata. Tanpa 3D, peta panas yang sama tampil di pita frame per zona.

**C. Pelabelan faktor.** Satu langkah LLM terpisah memetakan `deciding_factor` tiap agen ke katalog isyarat (sekitar 8 isyarat): visibilitas dari jalan, hambatan masuk (tangga, pintu), status buka atau tutup, keterbacaan menu dan harga, keramaian sekitar, hambatan titik pesan, kesan kebersihan dan penerangan, lainnya. Langkah ini hanya melabeli; ia tidak mengubah keputusan.

**D. Ablasi berpasangan dan Pareto.**

1. Ambil 3 sampai 5 isyarat teratas dari pelabelan faktor.
2. Untuk tiap isyarat, tulis ulang segmen terkait menjadi versi sudah diperbaiki (misal papan jam buka kini terbaca dari jalan), lalu jalankan ulang 500 persona yang sama.
3. Dampak adalah selisih tingkat konversi per persona (berpasangan), dalam rentang.
4. Hanya isyarat yang dampaknya melampaui noise antar-run (usulan: dua kali simpangan baku garis dasar) yang boleh menjadi rekomendasi.
5. Rekomendasi dinilai dampak (rentang) dan usaha (rendah, sedang, tinggi, perkiraan awal otomatis yang bisa diubah pemilik), lalu diurutkan. Tanda **Prioritas** diberikan pada rekomendasi yang menutup sekitar 80% dampak kumulatif, maksimum 5 item, dengan mengutamakan dampak besar dan usaha kecil. Sisanya masuk Nanti.
6. Tiap rekomendasi ditandai lokasinya di Visual Twin.

Biaya perkiraan: 3 run dasar ditambah 5 ablasi sama dengan sekitar 400 panggilan per analisis. Untuk pengembangan, jumlah agen boleh diturunkan ke 200.

**E. Tata letak dasbor.** Lihat 5.5. Kartu KPI: tahap gesekan terbesar, faktor utama, rentang peluang naik jika rekomendasi Prioritas dijalankan.

**F. Interaksi silang (bus peristiwa Zustand, tanpa reload).**

- Klik pin atau area panas: sorot segmen transkrip, tahap corong, dan rekomendasi terkait; tampilkan 3 sampai 5 monolog agen yang berhenti di titik itu; tombol Lihat bukti membuka frame.
- Klik tahap corong: kamera berpindah mulus (lerp) ke lokasi drop-off terbesar tahap itu.
- Klik rekomendasi: kamera ke lokasinya.
- Klik poin utama: sorot lokasi dan contoh agen.

**G. Rencana pengukuran.** Tombol Buat Rencana Pengukuran menghasilkan lembar tally yang bisa dicetak. Titik berdiri pemilik ditentukan dari koordinat kamera di segmen dengan friksi terbesar (misal berdiri di bawah tangga selama 30 menit saat jam makan siang). Metrik yang dihitung: jumlah orang yang menoleh, lalu yang mendekat, lalu yang membatalkan niat setelah melihat papan atau tangga.

**H. Catatan kepercayaan (selalu terlihat).**

- Kalimat tetap: Ini hasil simulasi, bukan jumlah pelanggan nyata.
- Kalimat tetap di Visual Twin: Tampilan 3D adalah perkiraan dari video, bukan ukuran sebenarnya.
- Daftar segmen tidak pasti, jumlah run yang dipakai untuk rentang, dan label kualitas 3D.

**Kriteria penerimaan:**

- Setiap angka di teks dasbor diperiksa programatik terhadap keluaran agregasi sebelum ditampilkan; yang tidak cocok dibuat ulang atau dibuang.
- Peta panas dan corong dihitung dari data titik berhenti yang sama, sehingga selalu konsisten.
- Rekomendasi hanya muncul jika didukung hasil ablasi yang melampaui noise.

### F7. Visual Twin: Video menjadi Peta 3D

Representasi 3D sederhana dari jalur yang direkam, dibangun dari frame terburam yang sama. Tujuannya menunjukkan lokasi, bukan mengukur.

**Pipeline (berbasis nerfstudio di GPU; mode lokal di 11.2):**

```
Frame terburam
  -> masking objek bergerak (orang, motor, mobil) dengan SAM 2
  -> pose kamera ke transforms.json
       baseline: COLMAP (sequential matching untuk video; exhaustive untuk video sulit)
       jalur cepat: VGGT (ditulis ke format transforms.json yang sama)
  -> pilih model terbesar (lihat Penyelarasan)
  -> model 3D: awan titik (standar), Gaussian Splatting (opsional)
  -> penyelarasan: arah atas, lantai, skala perkiraan
  -> gerbang kualitas
  -> ekspor: file 3D terkompresi + camera_path.json + metadata (up, kualitas)
```

Penjangkaran pin ke segmen transkrip terjadi saat agregasi (4.3), bukan di pipeline 3D, sehingga transkrip boleh berubah tanpa membangun ulang 3D.

**Kontrak `transforms.json`** (kompatibel ekosistem Nerfstudio): berisi `w`, `h`, intrinsik kamera (`fl_x`, `fl_y`, `cx`, `cy`), dan daftar `frames` dengan `file_path`, `timestamp`, dan `transform_matrix` 4x4. Kamera untuk dasbor dan penjangkaran pin dibaca dari file ini.

**Penyelarasan (dari uji lokal):**

- **Model terbesar.** COLMAP bisa memecah satu video menjadi beberapa model bila jejak kamera terputus. Pakai model dengan frame teregistrasi terbanyak (pada uji, model pertama hanya berisi 2 frame sementara model terbesar berisi 102 dari 120).
- **Arah atas.** COLMAP tidak mengetahui gravitasi. Arah atas dunia diambil dari rata-rata arah atas kamera tiap frame (ponsel dipegang tegak), disimpan sebagai `up` di metadata. Tanpa ini model tampil miring atau terbalik.
- **Lantai.** Setelah ditegakkan, model diangkat sehingga titik terendahnya (persentil 2%, mengabaikan titik nyasar) berada di lantai grid. Tanpa ini separuh model tampak terbenam.
- **Titik nyasar.** Saat ditampilkan, titik di luar sekitar 95% jarak terdekat dari median dibuang agar kamera membingkai objek, bukan noise.
- **Konvensi splat.** Format `.splat` (antimatter15) dirender sebagai (x, -y, -z). Viewer membatalkannya dengan rotasi 180 derajat di sumbu X agar splat dan awan titik berada di sistem koordinat yang sama.

**Gerbang kualitas.** Porsi frame yang berhasil teregistrasi menentukan label yang tampil di Riwayat dan dasbor:

| Porsi frame teregistrasi | Label | Tindakan |
| --- | --- | --- |
| 80% atau lebih | Kualitas baik | tampilkan 3D |
| 50% sampai 79% | Kualitas cukup | tampilkan 3D dengan catatan sebagian area bisa bolong |
| di bawah 50% | Kualitas rendah | sarankan rekam ulang (lebih terang, lebih pelan, tegak, di luar jam ramai); dasbor memakai tampilan cadangan |

Hasil uji: drone mengitari rumah 97,5%, deretan foto gedung 100%, jalan kaki di jalan berkios 85%, warung gelap dan ramai 18% (exhaustive matching hanya menaikkan jumlah titik, bukan porsinya). Kualitas 3D terutama ditentukan cara merekam.

**Tampilan di browser (React Three Fiber):**

- **Layer 1:** awan titik PLY terdesimasi (sekitar 250 ribu titik atau kurang), dimuat bertahap lewat worker; ukuran titik mengikuti besar model.
- **Layer 2:** jalur dari posisi kamera setiap frame dibentuk menjadi kurva Catmull-Rom; tiap segmen kurva diwarnai menurut bobot friksi di zona itu.
- **Layer 3:** pin interaktif pada stempel waktu tiap segmen transkrip.
- **Zona:** jalur dibagi menurut rentang waktu checkpoint F2 (jalan depan, pintu atau tangga, area menu, kasir), nama bisa diubah pemilik.
- **Kamera** dibingkai langsung dari ukuran model, tanpa animasi.

**Tampilan cadangan (wajib):** jika rekonstruksi gagal, kualitas rendah, atau perangkat lemah, tampilkan denah jalur 2D dari atas; jika pose kamera juga gagal, tampilkan pita frame berurutan dengan peta panas per zona. Semua interaksi silang tetap berjalan, dan pemilik hanya melihat catatan Tampilan 3D tidak tersedia untuk video ini, tanpa pesan galat teknis.

**Kriteria penerimaan:**

- Siap dalam kurang dari 5 menit untuk video 2 menit di GPU, paralel dengan transkrip dan tidak menghalangi halaman 5.
- Lancar di ponsel kelas menengah (target 30 fps atau lebih, model 30 MB atau kurang setelah kompresi, atau dimuat bertahap).
- Pin berada di posisi kamera yang benar untuk stempel waktunya (uji manual pada video kalibrasi).
- Model tampil tegak dan berdiri di lantai grid.
- Tidak ada wajah atau plat terbaca di model, karena hanya dibangun dari frame terburam.

### F8. Basis Pengetahuan Pendamping (RAG), opsional dan ditunda

Basis pengetahuan hanya membantu menjelaskan, tidak menghitung.

- **Isi:** katalog isyarat (dipakai juga oleh prompt VLM dan pelabelan faktor), katalog tindakan (cara menjalankan, perkiraan biaya kasar), panduan praktik UMKM makanan, riwayat analisis toko yang sama.
- **Penggunaan:** kartu cara menjalankan untuk rekomendasi yang sudah lolos ablasi, dan Panel Tanya Sekilas.
- **Aturan:** setiap jawaban menampilkan sumber atau menjawab Belum ada panduan untuk ini. RAG tidak boleh menambah rekomendasi Prioritas atau mengubah angka dampak. Angka di jawaban lewat verifier yang sama dengan F6.

---

## 7. Kebutuhan Non-Fungsional

| Area | Kebutuhan |
| --- | --- |
| **Privasi** | Wajah dan plat diburamkan di browser sebelum unggah. Hanya video terburam yang dikirim ke vendor model. Video mentah dihapus setelah ekstraksi frame; yang disimpan hanya frame bukti terburam, transkrip, dan model 3D dari frame terburam. Orang dan kendaraan di-masking dari model 3D. VLM dilarang menulis ciri pribadi orang. Mengacu UU Pelindungan Data Pribadi (UU 27/2022). |
| **Kinerja** | Transkrip siap dalam kurang dari 2 menit untuk video 2 menit. Visual Twin kurang dari 5 menit di GPU (paralel). Satu run 500 agen kurang dari 3 menit. Ablasi berjalan di latar belakang dan hasilnya muncul bertahap di dasbor. |
| **Kinerja tampilan** | Dasbor interaktif di ponsel kelas menengah. Visual Twin dimuat bertahap dan beralih ke tampilan cadangan otomatis. |
| **Keterbacaan** | Mobile-first, bahasa Indonesia, tanpa istilah teknis di layar pemilik (tidak ada kata point cloud, splat, RAG, ablasi). |
| **Auditabilitas** | Persona, versi prompt, versi model, semua panggilan LLM, perubahan transkrip oleh pemilik, parameter rekonstruksi 3D, dan nomor run tercatat (misal lewat Langfuse). Versi model dikunci per analisis. |
| **Keandalan** | Output JSON divalidasi skema; batch yang gagal diulang tanpa menjalankan ulang batch lain. Jika LLM gagal, edit langsung tetap bisa dipakai. Jika rekonstruksi 3D gagal atau kualitas rendah, dasbor tetap utuh dengan tampilan cadangan. |
| **Biaya** | Prompt caching untuk sistem pesan, antrean berkonkurensi terbatas, jumlah ablasi dibatasi 3 sampai 5, jumlah agen bisa diturunkan saat pengembangan. Rekonstruksi 3D dijalankan sekali per video dan di-cache. |
| **Infrastruktur 3D** | Produksi: GPU NVIDIA (CUDA) sebagai antrean pekerjaan terpisah dari API utama. Pengembangan: mode lokal CPU/Metal (11.2). |
| **Lisensi** | Hanya komponen berlisensi yang mengizinkan pemakaian komersial yang masuk jalur produksi (lihat 11.1). Video uji berlisensi Creative Commons dicantumkan atribusinya (Lampiran A). |

---

## 8. Risiko

### A. Validitas simulasi (paling kritis)

| Risiko | Mitigasi |
| --- | --- |
| **Agen terlalu rasional dan seragam**, corong terlalu optimis | Persona konkret dan kontras, boleh pergi karena alasan sepele, hasil dibaca sebagai hipotesis dan divalidasi tally |
| **Batch 10 agen saling mempengaruhi**, jawaban menyebar rata | Uji 1 vs 5 vs 10 agen per panggilan di M5; turunkan ukuran batch jika distribusi berbeda jauh; urutan persona diacak |
| **Hasil tidak reproduktif** antar-run | Persona tetap, suhu rendah, versi model dikunci, 3 run dasar, tampilkan rentang |
| **Noise lebih besar dari efek ablasi** | Perbandingan berpasangan dengan persona identik; hanya rekomendasi yang melampaui noise ditampilkan |
| **Hasil terlihat lebih pasti dari sebenarnya** | Catatan kepercayaan selalu tampil, intensitas relatif, tanpa angka tunggal di KPI |
| **Urutan atau panjang transkrip mempengaruhi keputusan** | Uji sensitivitas terhadap panjang deskripsi; segmen dibuat setara tingkat detailnya |

### B. Kualitas transkrip VLM

| Risiko | Mitigasi |
| --- | --- |
| **Satu sumber kesalahan untuk 500 agen**: salah baca terduplikasi dan tampak seperti temuan | Frame bukti wajib, opsi tidak terlihat jelas, verifikasi pemilik |
| **Agen hanya tahu yang ditulis VLM**, papan kecil yang terlewat dianggap tidak ada | Kolom `not_visible` wajib diisi; pemilik bisa menambah segmen |
| **Sudut pandang tidak sama dengan pelanggan** | Rekam dari sisi jalan; segmen dipecah menurut sudut pandang agar agen bisa berhenti lebih awal |
| **Transkrip panjang sulit diverifikasi** | Tampilan berpasangan dengan frame; hanya segmen tidak pasti yang wajib |
| **Konteks non-visual hilang** (harga, jam buka, tetangga) | Form konteks usaha disuntikkan ke agen |

### C. Biaya dan teknis LLM

| Risiko | Mitigasi |
| --- | --- |
| Biaya membengkak lewat ablasi (sekitar 400 panggilan per analisis) | Batasi 3 sampai 5 isyarat, prompt caching, turunkan jumlah agen saat pengembangan |
| Rate limit dan latensi | Antrean konkurensi terbatas, retry, progres di UI |
| JSON rusak atau tidak lengkap | Validasi skema, ulang per batch |
| Konteks transkrip besar di tiap panggilan | Prompt caching, transkrip dipadatkan tanpa membuang detail kunci |
| Ketergantungan dua vendor model dan pergeseran antar-versi | Kunci versi, catat semua panggilan, simpan hasil |

### D. Visual Twin 3D

| Risiko | Mitigasi |
| --- | --- |
| Rekonstruksi gagal (gelap, kaca, dinding polos, gerak cepat, hanya berputar, ramai) | Panduan rekam, indikator gerak, dua jalur pose (COLMAP dan VGGT), gerbang kualitas, tampilan cadangan |
| Model terpecah, yang dipakai hanya potongan kecil | Pilih model dengan frame teregistrasi terbanyak |
| Model miring, terbalik, atau terbenam | Arah atas dari orientasi kamera, lantai dari persentil bawah, koreksi konvensi splat |
| Pin tidak tepat (pose melenceng, lensa lebar) | Panduan lensa utama, simpan parameter kamera, uji manual pada video kalibrasi |
| Model penuh hantu dari orang dan kendaraan | Masking SAM 2 |
| Model berat di ponsel | Kompresi, batas titik, pemuatan bertahap, fallback otomatis |
| Pemilik mengira ukuran 3D akurat | Kalimat tetap, tanpa angka jarak |
| Lisensi non-komersial | Cek lisensi sebelum produksi |
| Biaya dan cold start GPU | Ukur di M7, cache hasil |
| Build COLMAP tertentu crash (Homebrew 4.2.1 di macOS arm64, matcher CPU) | Pakai binary resmi COLMAP, dipasang lewat skrip dengan checksum |
| Tim terlalu lama mempelajari nerfstudio | Pendekatan bertahap: jalankan baseline dulu, ubah satu komponen per percobaan |

### E. Privasi dan produk

| Risiko | Mitigasi |
| --- | --- |
| Wajah atau plat lolos blur | Pratinjau hasil blur, blur sebelum unggah, uji pada video nyata |
| Pemilik menganggap simulasi sebagai ramalan omzet | Kalimat tetap, rentang, tally sebagai langkah berikutnya |
| Pemilik malas verifikasi | Hanya segmen tidak pasti yang wajib |
| Video terlalu panjang atau berhenti sembarang | Checkpoint dan batas durasi otomatis |
| Video terkompres (WhatsApp, media sosial) | Cek resolusi sisi terpendek, sarankan file asli dari galeri |
| Rekomendasi generik atau biaya karangan | Rekomendasi hanya dari ablasi; RAG hanya mengisi cara menjalankan dengan sumber |
| 3 sampai 5 video kalibrasi tidak cukup untuk klaim statistik | Klaim dibatasi pada hipotesis titik gesekan |
| Waktu hackathon tidak cukup | Ikuti prioritas 5.6 |

**Tiga risiko paling menentukan:** (1) batch 10 agen merusak independensi persona, (2) noise antar-run melampaui efek ablasi, (3) satu sumber kesalahan transkrip untuk semua agen. Ketiganya diuji lebih awal di M5.

---

## 9. Ruang Lingkup Demo

- 1 jenis usaha: tempat makan.
- 500 agen (boleh diturunkan ke 200 saat pengembangan atau demo lambat).
- Tanpa skenario lingkungan.
- Sekitar 8 isyarat dalam katalog pelabelan; ablasi pada 3 sampai 5 isyarat teratas.
- Kalibrasi pada 3 sampai 5 video dengan tally manual.
- Visual Twin: satu jalur per video, awan titik sebagai standar, Gaussian Splatting opsional.
- RAG: opsional; jika dikerjakan, katalog isyarat dan tindakan plus 10 sampai 20 dokumen panduan.

---

## 10. Metrik Keberhasilan

| Metrik | Target demo |
| --- | --- |
| Alur dari video sampai dasbor selesai | di bawah 15 menit total |
| Segmen transkrip yang perlu dikoreksi pemilik | di bawah 30% |
| Angka di dasbor yang lolos verifier | 100% (yang gagal tidak ditampilkan) |
| Kestabilan antar-run: segmen friksi terbesar sama pada 3 run dasar | minimal 2 dari 3 run |
| Rekomendasi Prioritas yang efeknya melampaui noise | 100% |
| Uji arah efek: memperbaiki isyarat tidak menurunkan konversi | semua lolos |
| Visual Twin berhasil dibangun dengan kualitas baik atau cukup (bukan tampilan cadangan) | minimal 4 dari 5 video kalibrasi |
| Pin kejadian di lokasi yang benar (cek manual) | minimal 90% |
| Pemilik bisa menunjuk lokasi gesekan terbesar di tokonya | minimal 4 dari 5 pemilik uji |
| Pemilik bisa menyebut tindakan pertama yang akan dilakukan | minimal 4 dari 5 pemilik uji |
| Kecocokan arah antara temuan simulasi dan hasil tally manual | dicatat sebagai hasil kalibrasi, tanpa klaim statistik |

---

## 11. Tech Stack (usulan)

| Lapisan | Pilihan |
| --- | --- |
| Frontend dan dasbor | Next.js, Zustand (bus peristiwa) |
| Penampil 3D | Three.js lewat React Three Fiber; splat lewat drei `<Splat>` atau `mkkellogg/GaussianSplats3D` (MIT) |
| Grafik | Recharts atau Visx (corong, matriks dampak vs usaha) |
| Orkestrasi simulasi dan agregasi | lihat pertanyaan terbuka 7 (TypeScript + Zod, atau Python + Pydantic yang sudah ada di `be/`) |
| VLM (video ke transkrip) | Gemini 3.8 Flash |
| Agen dan pelabelan | GPT-6 Luna dengan prompt caching |
| Blur wajah dan cek kualitas | MediaPipe di browser (Web Worker) |
| Pipeline 3D produksi | nerfstudio (Apache-2.0), SAM 2 (Apache-2.0), COLMAP (BSD), VGGT (cek lisensi varian), di GPU serverless (misal Modal atau RunPod), Python |
| Pipeline 3D lokal | ffmpeg, COLMAP resmi (CPU), Brush (Apache-2.0, Metal) |
| Format 3D | `transforms.json` antar tahap; PLY terdesimasi (atau SPZ/`.splat` untuk splat); JSON untuk jalur dan metadata |
| Data | Postgres, object storage untuk frame dan aset 3D |
| Observabilitas | Langfuse |
| RAG (opsional) | Postgres dengan pgvector atau Chroma, embedding multibahasa |

### 11.1 Visual Twin: pendekatan reverse engineering dan lisensi

Visual Twin tidak dibangun dari nol. Tim menjalankan repo yang sudah matang (nerfstudio), mempelajari alur datanya, lalu mengganti satu komponen per percobaan. Kode sumbernya dibaca dan dijalankan langsung; plugin REA (Reverse Engineer Anything) hanya relevan untuk bagian yang sudah terkompilasi (misal kernel CUDA gsplat).

| Tahap | Repo | Lisensi | Status |
| --- | --- | --- | --- |
| Kerangka pipeline | `nerfstudio-project/nerfstudio` | Apache-2.0 | Produksi |
| Pose kamera | `colmap/colmap` | BSD | Produksi (baseline) dan lokal |
| Pose cepat (feed-forward) | `facebookresearch/vggt` | cek varian | Produksi jika lisensi lolos |
| Masking | `facebookresearch/sam2` | Apache-2.0 | Produksi |
| Rasterizer splat | `nerfstudio-project/gsplat` | Apache-2.0 | Produksi (opsional) |
| Splat di Mac | `ArthurBrussee/brush` | Apache-2.0 | Lokal (pengembangan) |
| Viewer splat web | `mkkellogg/GaussianSplats3D` | MIT | Produksi (opsional) |
| Editor splat | `playcanvas/supersplat` | MIT | Alat internal |
| DUSt3R, MASt3R, Gaussian Splatting asli (graphdeco) | `naver/*`, `graphdeco-inria/*` | non-komersial | Riset saja |
| OpenSplat | `pierotofy/OpenSplat` | AGPL | Bahan belajar saja |

Setiap lisensi dicek ulang sebelum komponen masuk produksi.

**Peta kode nerfstudio** (dibaca sesuai urutan alur data): `scripts/process_data.py`, `process_data/video_to_nerfstudio_dataset.py`, `process_data/colmap_utils.py`, `data/dataparsers/`, `models/splatfacto.py`, `engine/trainer.py`, `scripts/exporter.py`.

**Baseline:**

```bash
ns-process-data video --data "$video" --output-dir "data/$name" --num-frames-target 300
ns-train splatfacto --data "data/$name" --output-dir outputs --experiment-name "$name" \
  --viewer.quit-on-train-completion True
config=$(ls -t outputs/"$name"/splatfacto/*/config.yml | head -n 1)
ns-export gaussian-splat --load-config "$config" --output-dir "exports/$name"
ns-export pointcloud     --load-config "$config" --output-dir "exports/$name"
```

**Langkah:**

1. Jalankan baseline pada klip 30 sampai 60 detik dari video kalibrasi; periksa keluaran tiap tahap, catat waktu dan kebutuhan GPU.
2. Ubah satu komponen per percobaan: tambahkan mask SAM 2, ganti pose COLMAP dengan VGGT (cukup menghasilkan `transforms.json` yang sama), kurangi frame dan iterasi sampai masuk target waktu F7. Catat tiap percobaan di `research/rea/experiments/`.
3. Bungkus hasil akhir sebagai satu pekerjaan antrean: masukan video terburam, keluaran file 3D, `camera_path.json`, dan metadata.

**Batasan yang diketahui:** tidak ada repo yang mengubah video menjadi BIM atau IFC secara otomatis; skala metrik butuh referensi dan tidak dipakai di demo; dinding polos dan kaca menghasilkan lubang di model, diterima dan ditutup dengan tampilan cadangan jika terlalu parah.

### 11.2 Mode lokal (pengembangan tanpa GPU NVIDIA)

Untuk pengembangan dan demo di Mac Apple Silicon, pipeline 3D bisa dijalankan lokal tanpa nerfstudio:

```
video -> ffmpeg (2-3 fps) -> COLMAP resmi, CPU:
           feature_extractor -> sequential_matcher (tanpa loop detection)
           atau exhaustive_matcher (video sulit) -> mapper
       -> model terbesar -> awan titik PLY + camera_path.json + up
       -> (opsional) Brush, Metal -> splat -> konversi .splat
```

- Dipasang lewat `twin/scripts/setup_local.sh` (COLMAP 4.2.1 resmi dan Brush 0.3.0, dengan checksum). COLMAP dari Homebrew 4.2.1 crash di matcher CPU dan tidak dipakai.
- Dijalankan lewat `twin/scripts/local_twin.sh <video> <nama> [--fps N] [--splat] [--matcher exhaustive] [--reuse]`. Hasil terbit otomatis ke halaman Riwayat.
- Waktu terukur di Apple M1 16 GB: awan titik sekitar 5 sampai 7 menit untuk 120 sampai 160 frame; dengan splat 2.000 sampai 3.000 langkah total sekitar 13 sampai 16 menit.
- Bentuk keluaran sama dengan mode GPU, sehingga dasbor tidak perlu tahu mode mana yang dipakai.

---

## 12. Milestone Pembangunan

Urutan sengaja menempatkan uji validitas (M5) tepat setelah mesin agen pertama jalan, karena hasilnya bisa mengubah arsitektur batching.

- [ ] **M1: Ingesti.** Form konteks, rekam atau unggah video dengan checkpoint berstempel waktu, indikator gerak, blur wajah dan plat di browser, pembuangan frame buram.
- [ ] **M2: Transkrip VLM.** Gemini 3.8 Flash menghasilkan `TranscriptSegment[]` tak terstruktur dengan frame bukti dan kolom `not_visible`.
- [ ] **M3: Verifikasi.** Sinkron video dan segmen, edit langsung, konfirmasi segmen tidak pasti. Edit via LLM menyusul jika ada waktu.
- [ ] **M4: Mesin agen.** Pembuatan 500 persona tetap, batching GPT-6 Luna dengan prompt caching, validasi skema, penyimpanan monolog dan keputusan.
- [ ] **M5: Spike validitas.** Bandingkan 1 vs 5 vs 10 agen per panggilan; ukur noise antar-run (3 run dasar); uji sensitivitas terhadap panjang transkrip. Putuskan ukuran batch final.
- [ ] **M6: Agregasi.** Corong 5 tahap, bobot friksi per segmen, pelabelan faktor ke katalog isyarat, verifier angka, penggabung stempel waktu ke pose kamera.
- [ ] **M7: Spike Visual Twin.** Baseline nerfstudio pada 1 video kalibrasi di GPU; petakan keluaran tiap tahap, catat waktu dan kebutuhan GPU. *Status: mode lokal (11.2) sudah jalan dan teruji pada 4 video; spike GPU belum.*
- [ ] **M8: Visual Twin dasar.** Masking SAM 2, pose ke `transforms.json`, awan titik, jalur, zona, penyelarasan, gerbang kualitas, dibungkus sebagai pekerjaan antrean. *Status: pemilihan model terbesar, arah atas, lantai, dan gerbang kualitas sudah ada di mode lokal; SAM 2 dan antrean belum.*
- [ ] **M9: Dasbor dan integrasi.** Tata letak, KPI, tiga poin, corong, lapisan Kejadian dan Gesekan, interaksi silang lewat Zustand, tampilan cadangan, halaman Riwayat. *Status: placeholder dasbor dengan viewer 3D dan halaman Riwayat sudah ada.*
- [ ] **M10: Ablasi dan Pareto.** Penulisan ulang segmen, run berpasangan, ambang noise, matriks dampak vs usaha, tanda Prioritas.
- [ ] **M11: Rencana pengukuran.** Lembar tally cetak dengan titik berdiri dari Visual Twin, catatan kepercayaan.
- [ ] **M12: Kalibrasi.** 3 sampai 5 video dengan tally manual, uji arah efek, uji ketepatan pin.
- [ ] **M13 (opsional):** Gaussian Splatting di produksi, lapisan Agen beranimasi, Jelajah Agen dengan jalur agen, peta mini di halaman 5, edit via LLM, RAG dan Panel Tanya Sekilas.

---

## 13. Pertanyaan Terbuka

1. **Parameter video** (durasi, resolusi, jumlah frame, ambang rotasi): nilai di F2 sudah diperbarui dari uji lokal; kunci setelah M7.
2. **Ukuran batch final** (10 agen per panggilan atau lebih kecil): ditentukan oleh hasil M5.
3. **Ambang noise** untuk rekomendasi (usulan dua kali simpangan baku garis dasar): perlu dikonfirmasi setelah data M5.
4. **Penilaian usaha dan dampak:** otomatis sebagai tebakan awal dan boleh diubah pemilik, atau murni oleh pemilik?
5. **Seberapa kasar perkiraan biaya** yang aman ditampilkan tanpa terkesan klaim pasti?
6. **Narasi 500 agen:** ditampilkan semua (bisa dicari dan difilter) atau dikelompokkan menjadi beberapa tipe cerita? Usul: kelompok dengan akses ke contoh.
7. **Stack backend:** TypeScript + Zod untuk orkestrasi LLM, atau seluruhnya Python (FastAPI + Pydantic)? Kerangka `be/` di repo saat ini sudah FastAPI; perlu diputuskan sebelum M4.
8. **GPU serverless atau server sendiri**, dan spesifikasi apa? Ukur biaya per video dan cold start di M7.
9. **VGGT lolos lisensi** untuk pemakaian komersial? Jika tidak, jalur produksi tetap COLMAP.
10. **Apakah fitur geometris** (jarak pandang papan, jumlah anak tangga) nanti dijadikan isyarat simulasi? Usul: tidak untuk demo.
11. **Skenario lingkungan** (hujan, jam ramai): dikeluarkan dari demo; dievaluasi lagi setelah kalibrasi.
12. **RAG:** jika dikerjakan, siapa yang mengkurasi isinya dan seberapa sering diperbarui?

---

## Lampiran A. Video uji

Disimpan lokal di `twin/testdata/` (tidak masuk repo). Atribusi wajib jika dipublikasikan.

| File | Sumber | Pembuat | Lisensi | Hasil uji lokal |
| --- | --- | --- | --- | --- |
| `south-building.mp4` | dataset resmi COLMAP (128 foto dirangkai jadi video) | COLMAP | rilis COLMAP | 128/128 frame, kualitas baik |
| `addison-house.mp4` | Wikimedia Commons: Addison, VT Home (aerial drone footage) | Herrick Spencer | CC BY 3.0 | 156/160 frame, kualitas baik |
| `stegna-street.mp4` | Wikimedia Commons: Stegna - Poland, walking in Stegna - 4K | Kondel Walking Tours | CC BY 3.0 | 102/120 frame, kualitas baik |
| `warung-pecel.mp4` | Wikimedia Commons: Warung Nasi Pecel Yu Sri ngisor Talok | YT Arty | CC BY-SA 4.0 | 20/113 frame, kualitas rendah (gelap, ramai) |
