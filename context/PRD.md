# PRD Final: Sekilas, Simulator Calon Pelanggan untuk UMKM Makanan

**Versi:** 1.2 (pembaruan corong 4 tahap, alur model persona diskret, F1 dua kolom Pelanggan & Tujuan, mitigasi asumsi W, dan ruang lingkup demo 20 agen)
**Tanggal:** 13 November 2026
**Status:** Acuan pembangunan hackathon

**Keputusan yang mengikat dokumen ini:**

1. Keputusan agen diambil penuh oleh LLM (GPT-6 Luna), bukan model matematika terpisah, karena tujuan utamanya mensimulasikan calon pembeli.
2. Corong konversi memakai 4 tahap: Melihat -> Berhenti -> Masuk -> Memesan ("Kembali" dihapus).
3. Rekomendasi dihitung lewat ablasi: transkrip diubah, 500 agen yang sama dijalankan ulang, hasil diagregasi ulang.
4. Skenario lingkungan (hujan, jam ramai, dst.) dikeluarkan dari demo. Variasi konteks dibawa oleh persona.
5. Gemini 3.8 Flash menghasilkan transkrip tak terstruktur: deskripsi bebas yang sedetail mungkin per segmen video, dengan frame pendukung.
6. 500 agen GPT-6 Luna melihat tempat usaha hanya lewat transkrip tersebut dan konteks usaha yang diizinkan (berpenanda `diketahui_agen`).
7. Parameter video (durasi, resolusi, jumlah frame) ditetapkan belakangan; nilai awal dicatat sebagai usulan, diperbarui dengan data uji lokal (F2).
8. **Simulasi tidak menunggu Visual Twin.** Transkrip dan 3D berjalan paralel dan baru digabung di agregasi dan dasbor lewat stempel waktu (bagian 4.3).
9. **Sifat/persona agen ditentukan oleh model diskret dari data input, bukan oleh LLM.**
10. **VLM hanya menerima video, data form tidak dikirim ke VLM** (pengecualian: satu kalimat jenis usaha di prompt VLM, F3).

**Perubahan 1.2 terhadap 1.1:**
- Corong konversi disederhanakan dari 5 tahap menjadi 4 tahap: Melihat -> Berhenti -> Masuk -> Memesan (tahap "Kembali" dan field `will_return` dihapus). KPI peluang naik dan dampak ablasi dihitung dari konversi ke "Memesan".
- Alur data baru: data input F1 diproses model diskret berbasis multinomial logit (matriks $W$ ditulis tangan tanpa training), sifat bersyarat per segmen, IPF, dan sampling terstratifikasi seed tetap untuk menghasilkan 500 `PersonaSpec`.
- Pembatasan masukan VLM: VLM hanya menerima video terburam; data form tidak dikirim ke VLM, kecuali satu kalimat jenis usaha pada prompt VLM (F3).
- Penulisan ulang F1 (Konteks Usaha) dan Halaman 2 sesuai desain Figma: tata letak 2 kolom (mobile 1 kolom); Kartu 1 (Informasi Dasar), Kartu 2 (Pelanggan dan Tujuan), Kartu 3 (Menu, Harga, dan Jam); aturan penanda `diketahui_agen`, perhitungan otomatis level harga, pembacaan foto menu, dan pencocokan menu form vs transkrip.
- Prinsip arsitektur diperbarui: model diskret menentukan siapa agennya; LLM menentukan keputusannya.
- Pemecahan milestone M4 menjadi M4a (Model persona) dan M4b (Mesin agen).
- Penambahan uji manipulasi sifat dan uji sensitivitas bobot $W$ pada milestone M5; rekomendasi berlabel Prioritas disyaratkan memiliki peringkat stabil di seluruh variasi bobot $W$.
- Penambahan risiko asumsi sebaran persona pada Bagian 8.A beserta strategi mitigasinya.
- Penyimpanan dan auditabilitas (4.1 & 7): pencatatan fitur input, versi $W$, versi tabel segmen, seed, dan template prompt di Postgres/Langfuse; pengubahan F1 menandai persona dan hasil kedaluwarsa.
- Penyesuaian ruang lingkup demo (Bagian 9 & F5): jumlah agen demo dikecilkan menjadi 20 agen (2 panggilan x 10 agen), disertai pencatatan konsekuensi statistik dan opsi pre-run 500 agen atau 50–100 agen.
- Pembaruan rincian perkiraan biaya token (Bagian 7): tarif resmi GPT-6 Luna, Gemini 3.8 Flash, diskon cache read/batch API, estimasi biaya run penuh vs demo 20 agen, pembatasan token output, dan penurunan mode thinking.
- Pembaruan pertanyaan terbuka (Bagian 13): pemanfaatan input "tidak bisa diubah" sebagai batasan saran, tata kelola kurasi tabel segmen/W, kontrol slider segmen oleh pemilik, dan pemisahan input simulasi vs rekomendasi.

---

## 1. Tujuan Utama Produk

**Sekilas mensimulasikan calon pelanggan yang melihat tempat usaha dari luar, supaya pemilik UMKM makanan tahu di titik mana dan karena apa calon pelanggan ragu lalu pergi, serta perubahan kecil apa yang paling layak dicoba lebih dulu.**

Versi satu kalimat untuk pemilik: *Tahu di mana pelanggan ragu, dari satu video.*

### Cara kerja inti

1. Pemilik merekam satu video dari sisi jalan sampai titik pesan, dan mengisi konteks singkat (F1).
2. Video diburamkan di browser (wajah dan plat nomor), lalu dibaca Gemini 3.8 Flash menjadi transkrip deretan kejadian: teks bebas yang detail, berpasangan dengan frame bukti. VLM hanya menerima video dan satu kalimat jenis usaha, tanpa data form lain.
3. Pemilik memeriksa dan mengoreksi transkrip.
4. Data input diproses oleh model diskret menjadi 500 `PersonaSpec`. Agen GPT-6 Luna membaca transkrip sesuai persona masing-masing, bermonolog, memutuskan, dan berhenti di salah satu dari 4 tahap corong.
5. Hasil agen diagregasi menjadi corong 4 tahap, peta panas pada Visual Twin (model 3D sederhana dari jalur yang direkam), dan rekomendasi bergaya Pareto 80/20.
6. Pemilik membuktikan hipotesis dengan tally manual.

### Klaim yang dibuat

- Menemukan titik gesekan sebagai **hipotesis**.
- Menunjukkan letaknya secara visual dan menjelaskan alasannya lewat monolog agen.
- Menekankan peringkat dan lokasi titik gesekan, bukan angka konversi absolut.

### Klaim yang tidak dibuat

- Memprediksi jumlah pelanggan atau omzet nyata.
- Menghitung angka konversi absolut yang pasti.
- Model 3D yang akurat ukurannya.
- Hasil yang identik pada setiap pengulangan (karena keputusan dari LLM). Yang dijanjikan adalah rentang dan kestabilan arah serta peringkat temuan.

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
4. Rekomendasi diurutkan menurut dampak besar dan usaha kecil (Pareto), hanya jika efeknya melampaui noise simulasi dan stabil dalam uji sensitivitas bobot persona.
5. Semua panggilan model, parameter diskret, dan data input dicatat sehingga hasil dapat diaudit.
6. Hasil diperlakukan sebagai hipotesis yang bisa diuji lewat tally manual.

### Non-tujuan (versi demo)

- Bukan prediksi jumlah pelanggan atau omzet.
- Bukan jaminan angka konversi absolut.
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
        +----------------------------------------+
        | (frame terburam)                       | (video terburam)
        v                                        v
[Visual Twin - worker 3D]               [VLM: Gemini 3.8 Flash]
  - masking SAM 2                         - transkrip tak terstruktur
  - pose: COLMAP / VGGT                     per segmen + frame bukti
  - transforms.json                       - tulis juga yang TIDAK terlihat
  - pilih model terbesar                  - (prompt: hanya +1 kalimat jenis usaha;
  - orientasi + lantai                       TIDAK menerima data form F1)
  - awan titik / splat                           |
  - gerbang kualitas                             v
        |                               [Verifikasi pemilik]
        |                                        |
        |                                        v (transkrip terverifikasi)
[Data input (F1)]                                |
  (Konteks usaha:                                |
   Informasi Dasar,                              |
   Pelanggan & Tujuan,                           |
   Menu, Harga, Jam)                             |
        |                                        |
        v                                        |
[Model persona (diskret)]                        |
  - fitur kategorikal (F1)                       |
  - segmen pelanggan diskret                     |
  - multinomial logit (W tangan)                 |
  - sifat bersyarat + IPF                        |
  - 500 PersonaSpec (seed tetap)                 |
        |                                        |
        +-------------------+                    |
                            v                    v
                  [Simulasi 500 agen - GPT-6 Luna]
                    - slot-fill template dari PersonaSpec
                    - monolog, keputusan, titik berhenti, faktor
                    - berhenti di salah satu dari 4 tahap
                            |
        (camera_path + up + | (keputusan tersimpan)
         kualitas, per      |
         stempel waktu)     v
        +-------------+-----+
                      v
        [Agregasi]  <- penggabung: stempel waktu segmen -> pose kamera
          - corong 4 tahap (Melihat -> Berhenti -> Masuk -> Memesan)
          - bobot friksi per segmen (peta panas di jalur)
          - pelabelan faktor ke katalog isyarat
          - ablasi berpasangan, Pareto (filter batasan "tidak bisa diubah")
                      |
                      v
        [Dasbor Analitik - Next.js]
          - Visual Twin 3D (React Three Fiber), atau tampilan cadangan
          - corong 4 tahap, matriks dampak vs usaha (Recharts / Visx)
          - bus peristiwa Zustand: pin 3D, transkrip, agen, rekomendasi
```

Prinsip arsitektur:

- **Model diskret menentukan siapa agennya; LLM menentukan keputusannya. Model diskret tidak dilatih; parameternya ditulis tangan, terlihat, dan bisa diubah.**
- **Agen hanya tahu apa yang ada di transkrip dan konteks usaha yang diizinkan (berpenanda `diketahui_agen`).** VLM tidak menerima data form (hanya satu kalimat jenis usaha di prompt F3). Kualitas simulasi dibatasi kualitas transkrip, sehingga verifikasi pemilik adalah tahap wajib.
- **LLM memutuskan, kode menghitung.** Corong 4 tahap, bobot friksi, level harga, dan Pareto dihitung secara deterministik dari keputusan agen yang sudah tersimpan. Dasbor menekankan peringkat dan lokasi gesekan, bukan angka konversi absolut.
- **Visual Twin hanya menampilkan hasil dan tidak menahan simulasi.** Ia tidak ikut menentukan keputusan agen dan baru digabung di agregasi. Jika 3D belum siap atau gagal, dasbor tetap tampil dengan tampilan cadangan, lalu Visual Twin menyusul.
- **`transforms.json` adalah batas antar tahap 3D.** Tahap pose (COLMAP atau VGGT) bisa diganti tanpa mengubah tahap sesudahnya.

### 4.1 Penyimpanan dan model data

| Data | Tempat | Catatan |
| --- | --- | --- |
| Analisis (status wizard, flag kedaluwarsa) | Postgres | satu baris per video |
| Konteks usaha, menu | Postgres | F1; perubahan menandai persona dan hasil kedaluwarsa |
| Fitur input kategorikal F1 | Postgres | hasil ekstraksi/kategorisasi fitur F1 |
| Versi $W$ dan versi tabel segmen | Postgres | parameter model diskret yang digunakan |
| Seed per analisis | Postgres | seed tetap untuk sampling persona terstratifikasi |
| PersonaSpec (500 per analisis) | Postgres | skema JSON lengkap per agen, dipakai ulang di semua run dan ablasi |
| Frame bukti terburam | object storage | dirujuk lewat `frame_keys` |
| Segmen transkrip + jejak audit edit | Postgres | F3, F4; perubahan pemilik bertanda dan berversi |
| Run (dasar dan ablasi), versi model dan prompt | Postgres | nomor run, status, biaya |
| Keputusan agen | Postgres | satu baris per agen per run (skema 4 tahap, tanpa `will_return`) |
| Hasil agregasi dan ablasi | Postgres | dihitung ulang dari keputusan, bisa dicache |
| Aset 3D (PLY, splat, `camera_path.json`, metadata `up` dan kualitas) | object storage | dibangun sekali per video |
| Log panggilan model dan template prompt | Langfuse | auditabilitas |

Video mentah tidak disimpan. Mengubah transkrip atau data konteks F1 menandai persona dan hasil run lama kedaluwarsa, tetapi aset 3D tetap dipakai.

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
| `PUT /analyses/{id}/context` | menyimpan konteks usaha (F1), menghasilkan fitur kategorikal dan 500 PersonaSpec |
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
  -> Verifikasi pemilik -> Simulasi 500 agen (atau 20 agen demo) -> Dasbor Analitik -> Rencana pengukuran
```

Aplikasi berbentuk wizard satu arah (halaman 1 sampai 7), dengan dua halaman lanjutan dari Dasbor (8 dan 9) dan satu halaman Riwayat (10). Pemilik boleh kembali ke langkah sebelumnya dari penanda langkah. Mengubah transkrip atau isian konteks F1 setelah dasbor jadi menandai persona dan dasbor lama kedaluwarsa serta menawarkan simulasi ulang. Visual Twin tidak dibangun ulang kecuali video diganti.

### 5.2 Daftar halaman

| # | Halaman | Tujuan | Fitur |
| --- | --- | --- | --- |
| 1 | Beranda | Menjelaskan produk, memulai analisis, membuka Riwayat | - |
2 | Konteks Usaha | Mengumpulkan data yang tidak terlihat dari video | F1 |
| 3 | Rekam Video | Merekam atau mengunggah video berpanduan | F2 |
| 4 | Memproses | Menunggu transkrip dan Visual Twin | F3, F7 |
| 5 | Verifikasi Transkrip | Memeriksa dan memperbaiki transkrip | F4 |
| 6 | Menjalankan Simulasi | Menunggu agen selesai | F5 |
| 7 | Dasbor Analitik | Temuan, Visual Twin, rekomendasi | F6, F7 |
| 8 | Jelajah Agen | Membaca monolog, keputusan, dan jalur tiap agen | F5, F6 |
| 9 | Rencana Pengukuran | Rencana pembuktian lewat tally manual | F6 |
| 10 | Riwayat | Daftar analisis sebelumnya dan pintu masuk ke dasbornya | - |

### 5.3 Ringkasan per halaman

**1. Beranda.** Satu kalimat nilai, tombol Mulai Analisis, tautan ke Riwayat.

**2. Konteks Usaha.** Tampilan dua kolom (mobile satu kolom) dengan target selesai di bawah 3 menit. Kolom kiri: Kartu 1 (Informasi Dasar: jenis usaha, lokasi peta/pin, deskripsi letak) lalu Kartu 2 (Pelanggan dan Tujuan, berbasis chip dengan nilai bawaan: tipe sekitar, siapa yang biasa lewat, tujuan, tidak bisa diubah). Kolom kanan: Kartu 3 (Menu, Harga, dan Jam: daftar baris menu dan harga dengan tombol Tambah dan Unggah foto menu yang dibaca otomatis menjadi daftar yang bisa dikoreksi atau manual jika gagal, jam buka, jam ramai, dan tetangga terdekat). Placeholder tampil lebih terang daripada teks terisi. Semua isian mengalir ke konteks agen dan model persona diskret, tidak dikirim ke VLM (kecuali satu kalimat jenis usaha pada prompt VLM).

**3. Rekam Video.** Kamera, pengatur waktu, daftar checkpoint (terlihat dari jalan, pintu atau tangga, penanda atau papan, menu dan harga, titik pesan), satu kalimat panduan, opsi unggah. Indikator gerak: terlalu cepat, atau jangan hanya berputar tapi sambil berjalan. Setelah rekam: cek kualitas dan pratinjau hasil blur. Video terlalu gelap, goyang, atau pendek ditolak dengan pesan jelas. Otomatis berhenti di durasi maksimum.

**4. Memproses.** Progres bertahap (mengunggah, membaca video, menyusun kejadian, membangun tampilan 3D). Transkrip dan Visual Twin berjalan paralel; halaman 5 terbuka begitu transkrip siap. Jika transkrip gagal, ada tombol Coba lagi tanpa kehilangan video. Jika Visual Twin gagal, alur lanjut dengan tampilan cadangan.

**5. Verifikasi Transkrip.** Pemutar video dengan garis waktu segmen, dan daftar segmen berpasangan dengan frame bukti. Aksi per segmen: Benar, Ubah, Hapus, Tambah. Edit via LLM (instruksi singkat, hasil sebelum/sesudah, berlaku setelah Terima). Segmen berkeyakinan rendah masuk antrean wajib konfirmasi. Tombol Jalankan Simulasi nonaktif sampai antrean itu kosong. Peta mini Visual Twin tampil jika sudah siap.

**6. Menjalankan Simulasi.** Progres agen (misal 320 dari 500 agen, atau 10 dari 20 pada demo), dengan tahap menjalankan agen, mengagregasi, dan menyusun dasbor. Jika sebagian batch gagal, batch itu diulang otomatis; jika tetap gagal, dasbor memberi penanda jumlah agen yang berhasil.

**7. Dasbor Analitik.** Visual Twin di pusat, dikelilingi tiga poin utama, corong 4 tahap (Melihat, Berhenti, Masuk, Memesan), rekomendasi Pareto, matriks dampak vs usaha, dan catatan kepercayaan. Dasbor menekankan peringkat dan lokasi titik gesekan, bukan angka konversi absolut. Detail di F6, F7, dan tata letak di 5.5.

**8. Jelajah Agen.** Daftar agen dengan persona, monolog, keputusan, dan alasan; filter menurut keputusan, tahap corong 4 tahap, dan titik berhenti. Memilih agen memutar perjalanannya di Visual Twin. Boleh dibuat sebagai panel samping Dasbor.

**9. Rencana Pengukuran.** Apa yang dihitung, berapa lama, data minimum, lembar tally yang bisa dicetak, dan tangkapan Visual Twin dengan tanda titik berdiri pemilik (ditentukan dari jam ramai dan lokasi gesekan terbesar). Bagian ini menutup celah bahwa simulasi bersifat hipotesis (lihat F6-G).

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
|  - jalur kamera berwarna (friksi)          | Corong 4 tahap          |
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

Ponsel: banner, KPI (geser), Visual Twin setinggi sekitar setengah layar (bisa layar penuh), tiga poin, corong 4 tahap, rekomendasi, catatan kepercayaan.

Catatan KPI: Peluang naik dihitung dari konversi ke tahap "Memesan" jika rekomendasi Prioritas dijalankan. Dasbor menekankan perbandingan peringkat rekomendasi dan letak friksi fisik, bukan kepastian angka absolut.

### 5.6 Prioritas jika waktu mepet

| Prioritas | Isi |
| --- | --- |
| **Wajib** | Halaman 2, 3, 5, 7: konteks, rekam, verifikasi, dasbor (KPI, corong 4 tahap, peta panas, rekomendasi) |
| **Versi sederhana** | Halaman 1 satu tombol; halaman 4 dan 6 layar tunggu; halaman 10 daftar sederhana; Visual Twin berupa awan titik dan jalur kamera tanpa Gaussian Splatting |
| **Boleh ditunda** | Halaman 8 (jadi panel), halaman 9 (jadi bagian akhir dasbor), lapisan agen beranimasi, peta mini di halaman 5, Panel Tanya Sekilas (RAG), edit via LLM |

---

## 6. Kebutuhan Fungsional

### F1. Konteks Usaha

Form mengumpulkan konteks usaha yang tidak terlihat dari video, dirancang sesuai desain Figma dengan tata letak dua kolom (mobile satu kolom) dan target pengisian di bawah 3 menit. Semua isian mengalir ke konteks agen dan model persona diskret, tidak dikirim ke VLM (kecuali satu kalimat jenis usaha di prompt VLM).

#### Kartu 1: Informasi Dasar

| Isian | Tipe | Wajib | Mengalir ke |
| --- | --- | --- | --- |
| Jenis usaha | pilihan: warung, kedai, kafe, resto ruko, lainnya | ya | model diskret; satu kalimat di prompt VLM |
| Lokasi usaha | pencarian peta atau pin | ya | model diskret (fitur lokasi); konteks agen |
| Deskripsi letak | teks pendek (misal "lantai 2 ruko, sebelah minimarket") | ya | konteks agen (diketahui atau tidak diketahui) |

#### Kartu 2: Pelanggan dan Tujuan (semua chip dengan nilai bawaan)

| Isian | Tipe | Wajib | Mengalir ke |
| --- | --- | --- | --- |
| Tipe sekitar | pilihan satu: dekat kampus, perkantoran, permukiman, jalan utama, lainnya | ya | model diskret (fitur utama) |
| Siapa yang biasa lewat | chip pilih banyak: mahasiswa, pekerja kantor, warga sekitar, keluarga, pengendara | tidak | model diskret (menggeser bobot segmen) |
| Tujuan | chip pilih satu: lebih banyak pembeli baru, naikkan belanja rata-rata, ramaikan jam sepi | tidak | lapisan rekomendasi (urutan dan penilaian dampak), bukan simulasi |
| Tidak bisa diubah | chip pilih banyak: lokasi, fasad, menu, harga | tidak | lapisan rekomendasi (menyaring saran yang mustahil dan menyesuaikan penilaian usaha) |

#### Kartu 3: Menu, Harga, dan Jam

| Isian | Tipe | Wajib | Mengalir ke |
| --- | --- | --- | --- |
| Menu dan harga | daftar baris (nama, harga) dengan tombol Tambah dan Unggah foto menu | ya | model diskret (level harga); konteks agen; pencocokan dengan transkrip |
| Jam buka | satu rentang jam | ya | konteks agen (diketahui atau tidak) |
| Jam ramai | satu atau lebih rentang jam | ya | konteks agen; rencana pengukuran (F6-G) |
| Tetangga terdekat | teks bebas | tidak | konteks agen; bila diisi, diekstrak LLM teks ke fitur pesaing untuk model diskret |

Level harga dihitung kode dari harga menu (misal rata-rata atau median per porsi) dan dikategorikan, bukan ditebak model.

#### Perilaku

- Foto menu dibaca otomatis menjadi daftar yang bisa dikoreksi. Jika tidak terbaca, beralih ke isian manual (sesuai catatan di footer halaman).
- Placeholder harus tampil lebih terang daripada teks yang sudah diisi.
- Validasi: jam buka harus mendahului jam tutup; jam ramai harus berada dalam jam buka; harga bilangan bulat positif.
- Isian disimpan otomatis per analisis. Mengubah isian setelah simulasi menandai persona dan hasil lama kedaluwarsa serta menawarkan simulasi ulang.

#### Aturan pengetahuan agen (kriteria penerimaan)

- Setiap isian punya penanda `diketahui_agen`: `selalu`, `jika_terlihat`, atau `tidak`.
- Menu dan harga: `jika_terlihat`. Agen hanya tahu harga jika menu terbaca di transkrip.
- Jam buka: `jika_terlihat`. Agen hanya tahu jika ada papan atau tanda buka di transkrip.
- Deskripsi letak, tetangga: `jika_terlihat`.
- Jam ramai, tujuan, hal yang tidak bisa diubah: `tidak`. Hanya dipakai kode (jam ramai untuk rencana pengukuran F6-G; tujuan dan hal yang tidak bisa diubah untuk lapisan rekomendasi Pareto).
- Tipe sekitar dan siapa yang biasa lewat: `tidak` (tidak masuk sebagai pengetahuan agen, tetapi membentuk persona lewat model diskret).
- Pencocokan menu: setelah transkrip jadi, kode membandingkan menu form dengan harga yang terbaca di transkrip dan menandai "menu terisi tetapi tidak terbaca dari jalan" sebagai temuan awal.
- Semua versi isian, versi tabel segmen model diskret, dan seed dicatat di jejak audit.

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

**Batasan input VLM:** VLM hanya menerima video terburam. Data form F1 tidak dikirim ke VLM, dengan satu-satunya pengecualian: satu kalimat jenis usaha ("Ini tempat makan berjenis [jenis usaha]") disertakan pada prompt VLM untuk memandu fokus pengamatan.

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

### F5. Simulasi Agen (GPT-6 Luna)

Setiap agen adalah persona yang melihat tempat usaha lewat transkrip terverifikasi dan konteks usaha yang diizinkan, lalu memutuskan dengan bermonolog. Simulasi tidak menunggu Visual Twin (keputusan 8).

#### Model Persona Diskret

Sifat dan profil 500 agen ditentukan sepenuhnya oleh model diskret berbasis data input F1, bukan ditebak oleh LLM (keputusan 9).

1. **Fitur kategorikal dari F1:** tipe sekitar lokasi, siapa yang biasa lewat, level harga (kategori hasil hitung kode dari median menu), keberadaan pesaing (hasil ekstraksi teks tetangga), dan jam ramai.
2. **Segmen pelanggan diskret:** 6 sampai 10 segmen (misal: mahasiswa, pekerja kantor, warga sekitar, keluarga, pengendara/ojol lewat) (usulan).
3. **Bobot segmen:** dihitung dengan multinomial logit:
   $$P(\text{segmen}) = \text{softmax}(W \cdot \text{fitur})$$
   Matriks bobot $W$ ditulis tangan oleh tim berdasarkan penilaian domain dan rujukan kasar BPS, **TANPA training**. Training baru dipertimbangkan setelah M12 bila data tally manual terkumpul cukup banyak, itupun hanya untuk menyetel sedikit parameter (usulan).
4. **Sifat bersyarat per segmen:** sensitivitas anggaran, kemalasan fisik, konteks makan, familiar dengan area, dan niat datang, sehingga kombinasi sifat yang terbentuk realistis (misal mahasiswa lebih peka anggaran dan lebih santai; pengendara lewat lebih terburu-buru). Dimensi baru "familiar dengan area" dan "niat datang" ditambahkan ke model (usulan).
5. **Penyesuaian marginal (IPF):** bila perlu menyesuaikan proporsi marginal dari input pemilik (chip "siapa yang biasa lewat"), digunakan Iterative Proportional Fitting (IPF) agar struktur korelasi antar-sifat tetap terjaga (usulan).
6. **Sampling terstratifikasi:** kode menjalankan sampling terstratifikasi dengan seed tetap untuk menghasilkan 500 spesifikasi agen (`PersonaSpec`). Hasilnya disimpan per analisis di Postgres dan dipakai ulang di seluruh run dasar dan ablasi.
7. **Sumber tabel dan transparansi:** sumber isi tabel dan parameter $W$ dicatat per baris (misal data publik BPS sebagai rujukan kasar plus penilaian tim) dan diberi label tegas sebagai asumsi di sistem dan UI, bukan angka ilmiah.
8. **Teks bebas:** isian teks bebas (tetangga terdekat) hanya boleh diekstrak oleh LLM teks menjadi fitur kategorikal diskret; LLM tidak menentukan sebaran probabilitas persona.

#### Skema PersonaSpec

Disimpan dalam format JSON per agen di database:

```typescript
interface PersonaSpec {
  agent_id: number;
  segment: string;                     // misal: 'pekerja_kantor', 'mahasiswa', 'warga_sekitar'
  discrete_traits: {
    budget_sensitivity: 'hemat' | 'sedang' | 'fleksibel';
    physical_laziness: 'malas' | 'normal' | 'eksploratif';
    dining_context: 'sendiri_buru_buru' | 'santai' | 'rombongan';
    area_familiarity: 'baru_pertama' | 'cukup_tahu' | 'warga_lokal';
    visit_intent: 'mencari_makan' | 'lewat_saja' | 'spesifik_tujuan';
  };
  concrete_facts: {
    meal_budget: number;               // nominal uang makan rupiah, misal 25000
    break_time_minutes: number;        // alokasi waktu luang/istirahat dalam menit, misal 30
  };
  context_around: string;              // alasan konkret berada di sekitar lokasi
  daily_mood: string;                  // suasana hati hari itu dari katalog kecil
  seed: number;
  table_version: string;               // versi tabel segmen & matriks W
}
```

#### Template Prompt Agen

- `PersonaSpec` dimasukkan ke prompt agen lewat template terstruktur (slot-fill). Jika spesifikasi diubah, prompt otomatis ikut berubah.
- Memakai fakta konkret dan angka (misal uang makan Rp25.000, waktu istirahat 30 menit), bukan sifat abstrak belaka.
- Tiap sifat disertai **satu kalimat aturan perilaku** yang menyatakan secara eksplisit bagaimana sifat itu memengaruhi pertimbangan agen (misal: "Jika harga menu melebihi uang makan Rp25.000, batalkan niat dan pergi").
- Persona hanya memengaruhi cara agen menimbang dan mengevaluasi, bukan menambah pengetahuan. Pengetahuan agen tetap dibatasi ketat oleh apa yang tertulis di transkrip dan segmen video yang sudah dilewati (serta isian F1 berpenanda `diketahui_agen: jika_terlihat`).
- Kartu persona ditulis sekali (template slot-fill dulu; pembentukan variasi via LLM bila ada waktu), lalu dibekukan.
- Variasi situasional (suasana hati, alasan di sekitar) diambil dari katalog kecil lewat seed tetap, agar reprodusibel dan agen berhak memutuskan pergi karena alasan sepele.

#### Batching dan Ruang Lingkup Demo

- **Analisis Penuh:** 500 agen dibagi ke dalam 50 panggilan batch (masing-masing 10 agen), memanfaatkan prompt caching untuk sistem pesan (konteks toko, transkrip, aturan evaluasi). Urutan persona dalam batch diacak.
- **Ruang Lingkup Demo:** untuk pengujian dan demo cepat, jumlah agen dikecilkan menjadi **20 agen** (2 panggilan batch @ 10 agen per run).
  - *Konsekuensi demo 20 agen:* granularitas sangat kasar (1 agen = 5% pergerakan corong), noise antar-run besar sehingga banyak rekomendasi berisiko gugur dari ambang noise statistik, dan stratifikasi segmen menjadi sangat tipis.
  - *Opsi demo (usulan):* hasil ablasi dan simulasi demo dijalankan lebih dulu pada 500 agen lalu disimpan (*pre-computed/cached*), atau ukuran demo memakai 50 sampai 100 agen.

#### Cara Agen Berjalan

Agen membaca segmen berurutan. Di setiap segmen ia menulis monolog singkat lalu memilih lanjut atau berhenti. Ia tidak boleh memakai informasi dari segmen yang belum ia capai.

#### Skema Keluaran per Batch (divalidasi skema, batch gagal diulang)

Field `will_return` dihapus. Empat nilai `final_decision` tetap:

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
      | 'memesan';                   // memutuskan memesan makanan
    stopped_at_segment_id: string | null;   // null jika memesan
    deciding_factor: string;         // 1-2 kalimat, bahasa bebas
    factor_segment_ids: string[];    // segmen yang menjadi dasar alasan
    hesitation_score: number;        // 1 (yakin) sampai 5 (sangat ragu)
  }>;
}
```

#### Kestabilan Hasil

- Suhu rendah, persona tetap dari model diskret, versi model dikunci, semua panggilan dan prompt dicatat.
- Run dasar dijalankan 3 kali untuk mengukur noise antar-run. Angka ditampilkan sebagai rentang.
- Hasil yang tidak stabil antar-run tidak ditampilkan sebagai temuan.

**Kriteria penerimaan:**
- 500 agen selesai dalam target di bawah 3 menit untuk satu run (atau <30 detik untuk demo 20 agen).
- Setiap agen memiliki monolog, keputusan, dan alasan yang tersimpan dan dapat ditelusuri.
- Distribusi keputusan pada sampel kecil dibandingkan antara 1, 5, dan 10 agen per panggilan di M5.

### F6. Agregasi dan Isi Dasbor

Semua angka dihitung oleh kode dari keluaran agen yang sudah tersimpan. LLM hanya dipakai untuk melabeli alasan dan menulis ringkasan.

#### A. Corong (4 tahap)

1. **Melihat:** 500 agen (atau 20 agen pada demo).
2. **Berhenti (tertarik):** tahap 1 dikurangi jumlah agen dengan keputusan `lewat`.
3. **Masuk (naik atau masuk):** tahap 2 dikurangi jumlah agen dengan keputusan `berhenti_lalu_pergi`.
4. **Memesan:** tahap 3 dikurangi jumlah agen dengan keputusan `masuk_tanpa_memesan`.

Tahap dengan penurunan terbesar disorot, disertai faktor penyebab utamanya. Tahap kelima ("Kembali") dan label niat yang dinyatakan agen telah dihapus sepenuhnya dari corong.

#### B. Bobot Friksi dan Peta Panas

Untuk setiap segmen: jumlah agen dengan `stopped_at_segment_id` sama dengan id segmen, dibagi total agen. Nilai ini diikatkan ke pose kamera pada stempel waktu segmen itu (4.3) dan dirender sebagai gradien hijau ke merah di sepanjang jalur Visual Twin. Intensitas bersifat relatif, bukan persentase pelanggan nyata. Tanpa 3D, peta panas yang sama tampil di pita frame per zona.

#### C. Pelabelan Faktor

Satu langkah LLM terpisah memetakan `deciding_factor` tiap agen ke katalog isyarat (sekitar 8 isyarat): visibilitas dari jalan, hambatan masuk (tangga, pintu), status buka atau tutup, keterbacaan menu dan harga, keramaian sekitar, hambatan titik pesan, kesan kebersihan dan penerangan, lainnya. Langkah ini hanya melabeli; ia tidak mengubah keputusan agen.

#### D. Ablasi Berpasangan dan Pareto

1. Ambil 3 sampai 5 isyarat teratas dari pelabelan faktor.
2. Untuk tiap isyarat, tulis ulang segmen terkait menjadi versi sudah diperbaiki (misal papan jam buka kini terbaca jelas dari jalan), lalu jalankan ulang 500 persona yang sama.
3. Dampak dihitung dari selisih tingkat konversi per persona (berpasangan) ke tahap **Memesan**, disajikan dalam rentang.
4. Hanya isyarat yang dampaknya melampaui noise antar-run (usulan: dua kali simpangan baku garis dasar) yang boleh menjadi rekomendasi.
5. Rekomendasi dinilai menurut dampak (rentang kenaikan konversi ke Memesan) dan usaha (rendah, sedang, tinggi). Lapisan rekomendasi membaca chip "tujuan" dan chip "tidak bisa diubah" dari F1:
   - Saran yang melanggar batasan "tidak bisa diubah" (misal merombak fasad padahal fasad tidak bisa diubah) disaring atau dinaikkan skor usahanya.
   - Urutan saran disesuaikan dengan prioritas tujuan usaha pemilik.
6. Tanda **Prioritas** diberikan pada rekomendasi yang menutup sekitar 80% dampak kumulatif (maksimum 5 item, mengutamakan dampak besar dan usaha kecil) serta terbukti stabil peringkatnya pada uji sensitivitas bobot $W$ (M5). Sisanya masuk kategori Nanti.
7. Tiap rekomendasi ditandai lokasinya di Visual Twin.

#### E. Tata Letak Dasbor

Lihat 5.5. Kartu KPI: tahap gesekan terbesar, faktor utama, rentang peluang naik konversi ke tahap **Memesan** jika rekomendasi Prioritas dijalankan. Dasbor menekankan perbandingan peringkat rekomendasi dan lokasi titik gesekan fisik, bukan angka konversi absolut.

#### F. Interaksi Silang (bus peristiwa Zustand, tanpa reload)

- Klik pin atau area panas: sorot segmen transkrip, tahap corong, dan rekomendasi terkait; tampilkan 3 sampai 5 monolog agen yang berhenti di titik itu; tombol Lihat bukti membuka frame.
- Klik tahap corong: kamera berpindah mulus (lerp) ke lokasi drop-off terbesar tahap itu.
- Klik rekomendasi: kamera bergerak ke lokasi fisiknya di Visual Twin.
- Klik poin utama: sorot lokasi dan contoh monolog agen.

#### G. Rencana Pengukuran

Tombol Buat Rencana Pengukuran menghasilkan lembar tally yang bisa dicetak. Titik berdiri pemilik ditentukan dari koordinat kamera di segmen dengan friksi terbesar, mengacu pada isian jam ramai di Kartu 3 F1 (misal berdiri di bawah tangga selama 30 menit saat jam makan siang). Metrik yang dihitung: jumlah orang yang menoleh (Melihat), lalu yang mendekat (Berhenti), lalu yang membatalkan niat sebelum masuk atau memesan.

#### H. Catatan Kepercayaan (selalu terlihat)

- Kalimat tetap: *Ini hasil simulasi, bukan jumlah pelanggan nyata.*
- Kalimat tetap di Visual Twin: *Tampilan 3D adalah perkiraan dari video, bukan ukuran sebenarnya.*
- Daftar segmen tidak pasti, jumlah run yang dipakai untuk rentang, label kualitas 3D, dan penanda bahwa sebaran persona adalah asumsi tim dari data input F1.

**Kriteria penerimaan:**
- Setiap angka di teks dasbor diperiksa programatik terhadap keluaran agregasi sebelum ditampilkan; yang tidak cocok dibuat ulang atau dibuang.
- Peta panas dan corong dihitung dari data titik berhenti yang sama, sehingga selalu konsisten.
- Rekomendasi hanya muncul jika didukung hasil ablasi yang melampaui noise dan stabil di berbagai variasi bobot persona.

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

**Tampilan di browser (React Three Fiber):**
- **Layer 1:** awan titik PLY terdesimasi (sekitar 250 ribu titik atau kurang), dimuat bertahap lewat worker; ukuran titik mengikuti besar model.
- **Layer 2:** jalur dari posisi kamera setiap frame dibentuk menjadi kurva Catmull-Rom; tiap segmen kurva diwarnai menurut bobot friksi di zona itu.
- **Layer 3:** pin interaktif pada stempel waktu tiap segmen transkrip.
- **Zona:** jalur dibagi menurut rentang waktu checkpoint F2 (jalan depan, pintu atau tangga, area menu, kasir), nama bisa diubah pemilik.
- **Kamera** dibingkai langsung dari ukuran model, tanpa animasi.

**Tampilan cadangan (wajib):** jika rekonstruksi gagal, kualitas rendah, atau perangkat lemah, tampilkan denah jalur 2D dari atas; jika pose kamera juga gagal, tampilkan pita frame berurutan dengan peta panas per zona. Semua interaksi silang tetap berjalan, dan pemilik hanya melihat catatan *Tampilan 3D tidak tersedia untuk video ini*, tanpa pesan galat teknis.

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
- **Aturan:** setiap jawaban menampilkan sumber atau menjawab *Belum ada panduan untuk ini*. RAG tidak boleh menambah rekomendasi Prioritas atau mengubah angka dampak. Angka di jawaban lewat verifier yang sama dengan F6.

---

## 7. Kebutuhan Non-Fungsional

| Area | Kebutuhan |
| --- | --- |
| **Privasi** | Wajah dan plat diburamkan di browser sebelum unggah. Hanya video terburam yang dikirim ke vendor model. Video mentah dihapus setelah ekstraksi frame; yang disimpan hanya frame bukti terburam, transkrip, dan model 3D dari frame terburam. Orang dan kendaraan di-masking dari model 3D. VLM dilarang menulis ciri pribadi orang. Mengacu UU Pelindungan Data Pribadi (UU 27/2022). |
| **Kinerja** | Transkrip siap dalam kurang dari 2 menit untuk video 2 menit. Visual Twin kurang dari 5 menit di GPU (paralel). Satu run 500 agen kurang dari 3 menit (demo 20 agen <30 detik). Ablasi berjalan di latar belakang dan hasilnya muncul bertahap di dasbor. |
| **Kinerja tampilan** | Dasbor interaktif di ponsel kelas menengah. Visual Twin dimuat bertahap dan beralih ke tampilan cadangan otomatis. |
| **Keterbacaan** | Mobile-first, bahasa Indonesia, tanpa istilah teknis di layar pemilik (tidak ada kata point cloud, splat, RAG, ablasi). |
| **Auditabilitas** | Fitur input F1, versi matriks $W$, seed, versi tabel segmen, versi template prompt, daftar `PersonaSpec`, versi model LLM/VLM, semua panggilan model, perubahan transkrip oleh pemilik, parameter rekonstruksi 3D, dan nomor run tercatat (misal lewat Postgres dan Langfuse). Versi model dikunci per analisis. Mengubah isian F1 menandai persona dan hasil kedaluwarsa. |
| **Keandalan** | Output JSON divalidasi skema; batch yang gagal diulang tanpa menjalankan ulang batch lain. Jika LLM gagal, edit langsung tetap bisa dipakai. Jika rekonstruksi 3D gagal atau kualitas rendah, dasbor tetap utuh dengan tampilan cadangan. |
| **Biaya (PERKIRAAN)** | *Perkiraan biaya berdasarkan asumsi token, bukan hasil ukur pasti:*<br>- **Tarif GPT-6 Luna:** \$0,10 input / \$0,50 output per juta token (cache read \$0,01 per juta token; Batch API \$0,05 input / \$0,25 output).<br>- **Tarif Gemini 3.8 Flash:** \$0,75 input / \$3,75 output per juta token (harga perkenalan s.d. 31 Des 2026, setelahnya \$1,50 / \$7,50).<br>- **Analisis penuh 500 agen:** 3 run dasar + sampai 5 ablasi = 8 run $\times$ 50 batch = 400 panggilan; diperkirakan menelan biaya \$1 sampai \$2,5.<br>- **Demo 20 agen:** 2 batch per run; diperkirakan menelan biaya \$0,3 sampai \$0,7 (atau \$0,1 sampai \$0,2 bila Visual Twin dijalankan di mode lokal).<br>- **Optimasi biaya:** Sebagian besar biaya ada pada token output agen. Langkah penghematan: batasi `max_output_tokens`, turunkan kedalaman mode `thinking`, gunakan prompt caching untuk sistem pesan/transkrip, serta alihkan run ablasi dan run dasar tambahan ke Batch API (diskon 50%). |
| **Infrastruktur 3D** | Produksi: GPU NVIDIA (CUDA) sebagai antrean pekerjaan terpisah dari API utama. Pengembangan: mode lokal CPU/Metal (11.2). |
| **Lisensi** | Hanya komponen berlisensi yang mengizinkan pemakaian komersial yang masuk jalur produksi (lihat 11.1). Video uji berlisensi Creative Commons dicantumkan atribusinya (Lampiran A). |

---

## 8. Risiko

### A. Validitas simulasi (paling kritis)

| Risiko | Mitigasi |
| --- | --- |
| **Sebaran persona adalah asumsi tim** (parameter $W$ dan sebaran segmen belum tentu mencerminkan demografi nyata) | Parameter model diskret eksplisit, terlihat, dan bisa diubah; sumber data dicatat per baris (BPS/asumsi); uji sensitivitas terhadap $W$ di M5; label transparan bahwa sebaran adalah asumsi tim pada UI dasbor |
| **Agen terlalu rasional dan seragam**, corong terlalu optimis | Persona konkret dan kontras, fakta konkret uang makan/waktu istirahat, boleh pergi karena alasan sepele, hasil dibaca sebagai hipotesis dan divalidasi tally |
| **Batch 10 agen saling mempengaruhi**, jawaban menyebar rata | Uji 1 vs 5 vs 10 agen per panggilan di M5; turunkan ukuran batch jika distribusi berbeda jauh; urutan persona diacak |
| **Hasil tidak reproduktif** antar-run | Persona tetap dari model diskret, seed tetap, suhu rendah, versi model dikunci, 3 run dasar, tampilkan rentang |
| **Noise lebih besar dari efek ablasi** | Perbandingan berpasangan dengan persona identik; hanya rekomendasi yang melampaui noise ditampilkan; peringatan noise tinggi pada demo 20 agen |
| **Hasil terlihat lebih pasti dari sebenarnya** | Catatan kepercayaan selalu tampil, intensitas relatif, tanpa angka tunggal di KPI, dasbor menekankan peringkat dan titik gesekan fisik |
| **Urutan atau panjang transkrip mempengaruhi keputusan** | Uji sensitivitas terhadap panjang deskripsi; segmen dibuat setara tingkat detailnya |

### B. Kualitas transkrip VLM

| Risiko | Mitigasi |
| --- | --- |
| **Satu sumber kesalahan untuk semua agen**: salah baca terduplikasi dan tampak seperti temuan | Frame bukti wajib, opsi tidak terlihat jelas, verifikasi pemilik |
| **Agen hanya tahu yang ditulis VLM**, papan kecil yang terlewat dianggap tidak ada | Kolom `not_visible` wajib diisi; pemilik bisa menambah segmen |
| **Sudut pandang tidak sama dengan pelanggan** | Rekam dari sisi jalan; segmen dipecah menurut sudut pandang agar agen bisa berhenti lebih awal |
| **Transkrip panjang sulit diverifikasi** | Tampilan berpasangan dengan frame; hanya segmen tidak pasti yang wajib |
| **Konteks non-visual hilang** (harga, jam buka, tetangga) | Form konteks usaha F1 disuntikkan ke agen (sesuai aturan `diketahui_agen`) |

### C. Biaya dan teknis LLM

| Risiko | Mitigasi |
| --- | --- |
| Biaya membengkak lewat ablasi (sekitar 400 panggilan per analisis penuh) | Batasi 3 sampai 5 isyarat, prompt caching, batasi `max_output_tokens`, turunkan thinking, gunakan Batch API, turunkan agen ke 20 saat demo |
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
| Rekomendasi generik atau biaya karangan | Rekomendasi hanya dari ablasi; RAG hanya mengisi cara menjalankan dengan sumber; filter batasan "tidak bisa diubah" dari F1 |
| 3 sampai 5 video kalibrasi tidak cukup untuk klaim statistik | Klaim dibatasi pada hipotesis titik gesekan dan perbandingan peringkat |
| Waktu hackathon tidak cukup | Ikuti prioritas 5.6 |

**Tiga risiko paling menentukan:** (1) batch 10 agen merusak independensi persona, (2) noise antar-run melampaui efek ablasi, (3) satu sumber kesalahan transkrip untuk semua agen. Ketiganya diuji lebih awal di M5.

---

## 9. Ruang Lingkup Demo

- 1 jenis usaha: tempat makan.
- **Jumlah agen demo:** 20 agen (2 panggilan batch @ 10 persona per run).
  - *Konsekuensi statistik:* granularitas kasar (1 agen = 5% corong), noise antar-run besar sehingga banyak rekomendasi bisa gugur dari ambang noise, serta stratifikasi segmen tipis.
  - *Opsi penanganan (usulan):* hasil ablasi dan simulasi demo dijalankan lebih dulu pada 500 agen lalu disimpan (*pre-computed*), atau demo memakai 50 sampai 100 agen.
- Corong konversi 4 tahap: Melihat -> Berhenti -> Masuk -> Memesan.
- Tanpa skenario lingkungan (hujan, jam ramai ditiadakan).
- Sekitar 8 isyarat dalam katalog pelabelan; ablasi pada 3 sampai 5 isyarat teratas (disaring dengan batasan "tidak bisa diubah" dari F1).
- Kalibrasi pada 3 sampai 5 video dengan tally manual.
- Visual Twin: satu jalur per video, awan titik sebagai standar, Gaussian Splatting opsional.
- RAG: opsional; jika dikerjakan, katalog isyarat dan tindakan plus 10 sampai 20 dokumen panduan.

---

## 10. Metrik Keberhasilan

| Metrik | Target demo |
| --- | --- |
| Alur dari video sampai dasbor selesai | di bawah 15 menit total (demo 20 agen <8 menit) |
| Segmen transkrip yang perlu dikoreksi pemilik | di bawah 30% |
| Angka di dasbor yang lolos verifier | 100% (yang gagal tidak ditampilkan) |
| Kestabilan antar-run: segmen friksi terbesar sama pada 3 run dasar | minimal 2 dari 3 run |
| Rekomendasi Prioritas yang efeknya melampaui noise | 100% |
| Uji arah efek: memperbaiki isyarat tidak menurunkan konversi ke Memesan | semua lolos |
| Visual Twin berhasil dibangun dengan kualitas baik atau cukup (bukan tampilan cadangan) | minimal 4 dari 5 video kalibrasi |
| Pin kejadian di lokasi yang benar (cek manual) | minimal 90% |
| Pemilik bisa menunjuk lokasi gesekan terbesar di tokonya | minimal 4 dari 5 pemilik uji |
| Pemilik bisa menyebut tindakan pertama yang akan dilakukan | minimal 4 dari 5 pemilik uji |
| Kecocokan arah dan peringkat antara temuan simulasi dan hasil tally manual | dicatat sebagai hasil kalibrasi, tanpa klaim statistik |

---

## 11. Tech Stack (usulan)

| Lapisan | Pilihan |
| --- | --- |
| Frontend dan dasbor | Next.js, Zustand (bus peristiwa) |
| Penampil 3D | Three.js lewat React Three Fiber; splat lewat drei `<Splat>` atau `mkkellogg/GaussianSplats3D` (MIT) |
| Grafik | Recharts atau Visx (corong 4 tahap, matriks dampak vs usaha) |
| Orkestrasi simulasi dan agregasi | lihat pertanyaan terbuka 7 (TypeScript + Zod, atau Python + Pydantic yang sudah ada di `be/`) |
| VLM (video ke transkrip) | Gemini 3.8 Flash (hanya video + 1 kalimat jenis usaha) |
| Agen dan pelabelan | GPT-6 Luna dengan prompt caching, batas token output, dan thinking rendah |
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

Urutan sengaja menempatkan pemodelan persona diskret (M4a) dan uji validitas persona/sensitivitas bobot (M5) tepat setelah ingesti dan transkrip selesai, karena hasilnya menentukan kestabilan simulasi.

- [ ] **M1: Ingesti.** Form konteks F1 dua kolom (Informasi Dasar, Pelanggan & Tujuan, Menu/Harga/Jam), rekam atau unggah video dengan checkpoint berstempel waktu, indikator gerak, blur wajah dan plat di browser, pembuangan frame buram.
- [ ] **M2: Transkrip VLM.** Gemini 3.8 Flash menghasilkan `TranscriptSegment[]` tak terstruktur dengan frame bukti dan kolom `not_visible` (prompt VLM hanya menerima satu kalimat jenis usaha, tanpa data form lain).
- [ ] **M3: Verifikasi.** Sinkron video dan segmen, edit langsung, konfirmasi segmen tidak pasti. Edit via LLM menyusul jika ada waktu.
- [ ] **M4a: Model persona.** Pembuatan tabel segmen diskret, penulisan tangan matriks $W$, implementasi penyesuaian marginal IPF, generator `PersonaSpec` berbasis seed tetap, pengujian stratifikasi dari input F1.
- [ ] **M4b: Mesin agen.** Template prompt slot-fill dari `PersonaSpec`, batching GPT-6 Luna dengan prompt caching, validasi skema keluaran 4 tahap (tanpa `will_return`), penyimpanan monolog dan keputusan agen di Postgres.
- [ ] **M5: Spike validitas.**
  - Bandingkan 1 vs 5 vs 10 agen per panggilan; ukur noise antar-run (3 run dasar); uji sensitivitas terhadap panjang transkrip. Putuskan ukuran batch final.
  - **(a) Uji manipulasi sifat:** pada transkrip yang sama, ubah satu sifat persona secara sistematis (misal anggaran dinaikkan drastis atau kemalasan fisik diubah); keputusan agen harus bergeser ke arah yang diharapkan. Jika tidak bergeser, persona tidak bekerja efektif di prompt.
  - **(b) Uji sensitivitas terhadap $W$:** jalankan ablasi pada 2 sampai 3 matriks $W$ alternatif (bawaan, digeser moderat, dan ekstrem). Tanda **Prioritas** hanya diberikan untuk rekomendasi yang urutan peringkatnya stabil di seluruh alternatif bobot tersebut.
- [ ] **M6: Agregasi.** Corong 4 tahap, bobot friksi per segmen, pelabelan faktor ke katalog isyarat, verifier angka, penggabung stempel waktu ke pose kamera.
- [ ] **M7: Spike Visual Twin.** Baseline nerfstudio pada 1 video kalibrasi di GPU; petakan keluaran tiap tahap, catat waktu dan kebutuhan GPU. *Status: mode lokal (11.2) sudah jalan dan teruji pada 4 video; spike GPU belum.*
- [ ] **M8: Visual Twin dasar.** Masking SAM 2, pose ke `transforms.json`, awan titik, jalur, zona, penyelarasan, gerbang kualitas, dibungkus sebagai pekerjaan antrean. *Status: pemilihan model terbesar, arah atas, lantai, dan gerbang kualitas sudah ada di mode lokal; SAM 2 dan antrean belum.*
- [ ] **M9: Dasbor dan integrasi.** Tata letak, KPI, tiga poin, corong 4 tahap, lapisan Kejadian dan Gesekan, interaksi silang lewat Zustand, tampilan cadangan, halaman Riwayat. *Status: placeholder dasbor dengan viewer 3D dan halaman Riwayat sudah ada.*
- [ ] **M10: Ablasi dan Pareto.** Penulisan ulang segmen, run berpasangan, ambang noise, matriks dampak vs usaha, filter batasan "tidak bisa diubah", tanda Prioritas yang stabil di variasi $W$.
- [ ] **M11: Rencana pengukuran.** Lembar tally cetak dengan titik berdiri dari Visual Twin, jadwal observasi dari jam ramai F1, catatan kepercayaan.
- [ ] **M12: Kalibrasi.** 3 sampai 5 video dengan tally manual, uji arah efek, uji ketepatan pin.
- [ ] **M13 (opsional):** Gaussian Splatting di produksi, lapisan Agen beranimasi, Jelajah Agen dengan jalur agen, peta mini di halaman 5, edit via LLM, RAG dan Panel Tanya Sekilas.

---

## 13. Pertanyaan Terbuka

1. **Parameter video** (durasi, resolusi, jumlah frame, ambang rotasi): nilai di F2 sudah diperbarui dari uji lokal; kunci setelah M7.
2. **Ukuran batch final** (10 agen per panggilan atau lebih kecil): ditentukan oleh hasil M5.
3. **Ambang noise** untuk rekomendasi (usulan dua kali simpangan baku garis dasar): perlu dikonfirmasi setelah data M5.
4. **Penilaian usaha dan dampak dengan batasan "tidak bisa diubah":** Otomatis sebagai tebakan awal dan boleh diubah pemilik, dengan input chip "tidak bisa diubah" (F1) sebagai batasan penyaring saran mustahil atau penambah penalti skor usaha? Bagaimana rumus penyesuaiannya?
5. **Seberapa kasar perkiraan biaya** yang aman ditampilkan tanpa terkesan klaim pasti?
6. **Narasi agen:** ditampilkan semua (bisa dicari dan difilter) atau dikelompokkan menjadi beberapa tipe cerita? Usul: kelompok dengan akses ke contoh.
7. **Stack backend:** TypeScript + Zod untuk orkestrasi LLM, atau seluruhnya Python (FastAPI + Pydantic)? Kerangka `be/` di repo saat ini sudah FastAPI; perlu diputuskan sebelum M4b.
8. **GPU serverless atau server sendiri**, dan spesifikasi apa? Ukur biaya per video dan cold start di M7.
9. **VGGT lolos lisensi** untuk pemakaian komersial? Jika tidak, jalur produksi tetap COLMAP.
10. **Apakah fitur geometris** (jarak pandang papan, jumlah anak tangga) nanti dijadikan isyarat simulasi? Usul: tidak untuk demo.
11. **Skenario lingkungan** (hujan, jam ramai): dikeluarkan dari demo; dievaluasi lagi setelah kalibrasi.
12. **RAG:** jika dikerjakan, siapa yang mengkurasi isinya dan seberapa sering diperbarui?
13. **Kurasi tabel segmen dan matriks $W$:** Siapa yang bertanggung jawab mengisi dan mengurasi tabel segmen dan parameter bobot $W$, serta apa sumber data rujukannya (misal data BPS per kecamatan, survei demografi, atau konsensus tim)? Kapan jadwal peninjauan ulangnya?
14. **Kontrol slider segmen oleh pemilik:** Apakah pemilik usaha diizinkan mengubah sebaran proporsi segmen secara manual lewat slider (misal pada layar konfirmasi "Siapa yang biasanya lewat?") atau sebaran dibiarkan terkunci murni dari model diskret? (usulan)
15. **Batas masukan prompt agen:** Apakah input tambahan F1 selain tipe sekitar dan profil pelanggan (misalnya tujuan bisnis UMKM atau batasan tidak bisa diubah) perlu dimasukkan ke prompt penalaran agen? Saat ini diputuskan TIDAK (hanya digunakan pada lapisan rekomendasi Pareto).

---

## Lampiran A. Video uji

Disimpan lokal di `twin/testdata/` (tidak masuk repo). Atribusi wajib jika dipublikasikan.

| File | Sumber | Pembuat | Lisensi | Hasil uji lokal |
| --- | --- | --- | --- | --- |
| `south-building.mp4` | dataset resmi COLMAP (128 foto dirangkai jadi video) | COLMAP | rilis COLMAP | 128/128 frame, kualitas baik |
| `addison-house.mp4` | Wikimedia Commons: Addison, VT Home (aerial drone footage) | Herrick Spencer | CC BY 3.0 | 156/160 frame, kualitas baik |
| `stegna-street.mp4` | Wikimedia Commons: Stegna - Poland, walking in Stegna - 4K | Kondel Walking Tours | CC BY 3.0 | 102/120 frame, kualitas baik |
| `warung-pecel.mp4` | Wikimedia Commons: Warung Nasi Pecel Yu Sri ngisor Talok | YT Arty | CC BY-SA 4.0 | 20/113 frame, kualitas rendah (gelap, ramai) |
