# PRD Final: Sekilas, Simulator Calon Pelanggan untuk UMKM Makanan

**Versi:** 1.4 (hierarki bisnis -> analisis, kontrak API bertingkat dengan job asinkron, proyeksi dua tingkat, checkpoint dari AI dengan konfirmasi titik kasir, F1 satu kolom dengan unggah menu)
**Tanggal:** 14 November 2026
**Status:** Acuan pembangunan hackathon

**Keputusan yang mengikat dokumen ini:**

1. Keputusan agen diambil penuh oleh LLM (GPT-6 Luna), bukan model matematika terpisah, karena tujuan utamanya mensimulasikan calon pembeli.
2. Corong konversi memakai 4 tahap: Melihat -> Berhenti -> Masuk -> Memesan ("Kembali" dihapus).
3. Rekomendasi diurutkan dari skor atribusi hipotesis (F6-C): alasan bebas agen dipetakan ke katalog hipotesis, lalu dihitung kode. Ablasi (transkrip diubah, agen yang sama dijalankan ulang) tidak masuk alur standar dan hanya tersedia sebagai uji lanjutan opsional (F6-D).
4. Skenario lingkungan (hujan, jam ramai, dst.) dikeluarkan dari demo. Variasi konteks dibawa oleh persona.
5. Gemini 3.8 Flash menghasilkan transkrip tak terstruktur: deskripsi bebas yang sedetail mungkin per segmen video, dengan frame pendukung.
6. 500 agen GPT-6 Luna melihat tempat usaha hanya lewat transkrip tersebut dan konteks usaha yang diizinkan (berpenanda `diketahui_agen`).
7. Parameter video (durasi, resolusi, jumlah frame) ditetapkan belakangan; nilai awal dicatat sebagai usulan, diperbarui dengan data uji lokal (F2).
8. **Simulasi tidak menunggu Visual Twin.** Transkrip dan 3D berjalan paralel dan baru digabung di agregasi dan dasbor lewat stempel waktu (bagian 4.3).
9. **Sifat/persona agen ditentukan oleh model diskret dari data input, bukan oleh LLM.**
10. **VLM hanya menerima video, data form tidak dikirim ke VLM** (pengecualian: satu kalimat jenis usaha di prompt VLM, F3).
11. **Keputusan dulu, katalog kemudian.** Agen memutuskan tanpa melihat katalog hipotesis. Setelah keputusannya terkunci, pesan kedua di percakapan yang sama meminta agen menilai hipotesis dari katalog yang sudah disaring sesuai bagian jalur yang ia lewati (F5).
12. **Satu run dasar, tanpa evaluasi noise antar-run.** Demi biaya, simulasi dijalankan sekali per analisis. Hasil dibaca sebagai hipotesis yang diuji lewat tally manual, bukan sebagai angka yang sudah teruji kestabilannya.
13. **Bisnis -> analisis.** Akun punya beberapa bisnis; tiap bisnis punya beberapa analisis. Konteks usaha **disalin (snapshot)** ke tiap analisis saat dibuat, bukan dirujuk ke bisnis, agar hasil lama tetap bisa diaudit. Bisnis menyimpan `primary_analysis_id` yang dibuka dari daftar bisnis (4.1).
14. **Proyeksi dua tingkat.** Mencentang perbaikan langsung memberi `perkiraan_cepat` (estimator, tanpa LLM). Hasil `terverifikasi_simulasi` hanya dari run ablasi berpasangan (F6-D), dicache, dan dijalankan atas permintaan (4.4.4).
15. **Checkpoint dipilih AI, pemilik hanya mengonfirmasi titik kasir.** Pemilik tidak mengetuk checkpoint saat merekam. VLM menandai checkpoint jalur (terlihat dari jalan, pintu atau tangga, penanda atau papan, menu dan harga, titik pesan) beserta stempel waktunya saat menyusun transkrip; pemilik hanya mengisi atau mengonfirmasi menit titik pesan/kasir, yang menjadi akhir jalur (4.3).

**Perubahan 1.4 terhadap 1.3:**
- Model data bertingkat akun -> bisnis -> analisis, dengan konteks snapshot per analisis dan `primary_analysis_id` di bisnis (4.1).
- Tabel 4.4 diganti kontrak API lengkap: rute bisnis, analisis dan wizard, hasil, jelajah agen, proyeksi, mode demo, status dan `next_action`, serta aturan lintas endpoint (202 + job, `Idempotency-Key`, galat 409 berkode, versi di setiap respons, paginasi kursor, kuota, kepemilikan) (4.2, 4.4).
- Checkpoint tidak lagi diketuk pemilik: VLM menandai checkpoint dari video, pemilik hanya mengonfirmasi titik kasir; zona dari checkpoint AI (F2, F3, 4.3, F7).
- F1 menjadi satu container satu kolom; menu lewat unggah Excel atau foto menu (VLM); isian tetangga terdekat dan opsi "lainnya" dihapus.
- Proyeksi what-if di dasbor dipisah menjadi perkiraan cepat dan hasil terverifikasi simulasi yang dicache (F6-D, 4.4.4).
- Halaman 10 menjadi Daftar bisnis dan riwayat analisis per bisnis (5.2, 5.3).

**Perubahan 1.3 terhadap 1.2:**
- Pelabelan faktor oleh LLM terpisah diganti **atribusi oleh agen sendiri** lewat pesan kedua: pertanyaan disesuaikan dengan stance (lewat, berhenti lalu pergi, masuk tanpa memesan, memesan), katalog disaring menurut sudut pandang (`vantage`) yang sudah dilewati agen, skala 0 sampai 3, kutipan wajib diverifikasi kode (F5, F6-C).
- Katalog isyarat (8 butir) diperluas menjadi **katalog hipotesis** H1 sampai H10 ditambah H0 "lainnya", masing-masing dengan definisi, batasan, dan sudut pandang terkait (F6-C).
- Agregasi baru: **share** (porsi kehilangan), **lift** (pembeda agen gagal vs agen memesan), dan **gesekan yang ditoleransi** (F6-C).
- Penyusunan daftar prioritas perbaikan tanpa VLM tambahan: katalog tindakan menjadi wajib, satu panggilan LLM teks memilih tindakan dari katalog dan menulisnya spesifik untuk toko dengan aturan anti-karangan, lalu kode menyaring dan mengurutkan (F6-D).
- Run dasar 3 kali dan ambang noise dihapus; ablasi menjadi uji lanjutan opsional; target metrik, risiko, biaya, dan milestone disesuaikan.

**Perubahan 1.2 terhadap 1.1:**
- Corong konversi disederhanakan dari 5 tahap menjadi 4 tahap: Melihat -> Berhenti -> Masuk -> Memesan (tahap "Kembali" dan field `will_return` dihapus). KPI dan dampak ablasi (bila dijalankan) dihitung dari konversi ke "Memesan".
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
- Hasil yang identik pada setiap pengulangan (karena keputusan dari LLM). Kestabilan antar-run tidak diukur pada versi ini; yang dijanjikan adalah arah dan peringkat temuan sebagai hipotesis yang bisa diuji lewat tally.
- Bukti sebab-akibat. Skor atribusi mengukur alasan yang diakui agen, bukan penyebab yang terbukti; pembuktian sebab-akibat lewat ablasi opsional (F6-D).

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
4. Rekomendasi diurutkan menurut porsi kehilangan yang dijelaskan (share) dan usaha kecil (Pareto), hanya untuk hipotesis yang membedakan agen gagal dari agen yang memesan (lift > 1).
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
  - konfirmasi stempel waktu titik kasir (akhir jalur, 4.3)
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
                    - pesan 1: monolog, keputusan, titik berhenti, faktor
                      (tanpa katalog), berhenti di salah satu dari 4 tahap
                    - pesan 2: nilai katalog hipotesis 0-3 + kutipan
                      (katalog disaring sesuai jalur yang dilewati)
                    - 1 run dasar per analisis
                            |
        (camera_path + up + | (keputusan tersimpan)
         kualitas, per      |
         stempel waktu)     v
        +-------------+-----+
                      v
        [Agregasi]  <- penggabung: stempel waktu segmen -> pose kamera
          - corong 4 tahap (Melihat -> Berhenti -> Masuk -> Memesan)
          - bobot friksi per segmen (peta panas di jalur)
          - atribusi alasan ke katalog hipotesis: share, lift (F6-C)
          - prioritas perbaikan: katalog tindakan + 1 panggilan LLM teks
            (spesifik toko, tanpa VLM), Pareto (filter "tidak bisa diubah")
          - ablasi berpasangan: opsional, atas permintaan
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

### 4.1 Hierarki dan model data

```
akun
 └─ bisnis (profil tetap: jenis, lokasi, menu bawaan)        primary_analysis_id
     └─ analisis (satu siklus: konteks + video + transkrip + hasil)
         ├─ konteks (snapshot saat analisis dibuat)
         ├─ video (terburam), transkrip (segmen berversi), persona (PersonaSpec berversi)
         ├─ run (baseline | ablasi) -> keputusan agen
         ├─ dasbor (agregasi run dasar yang valid)
         ├─ rekomendasi, proyeksi (perkiraan cepat | terverifikasi simulasi)
         ├─ twin (aset 3D)
         └─ rencana pengukuran
```

Dua keputusan struktural:

- **Konteks disalin (snapshot) ke tiap analisis**, bukan dirujuk ke bisnis. Harga menu bulan ini bisa berbeda dari bulan lalu, dan hasil lama harus tetap bisa diaudit. Profil bisnis hanya mengisi nilai awal saat analisis baru dibuat.
- **`primary_analysis_id` di bisnis** menunjuk analisis yang dibuka dari daftar bisnis. Bawaannya analisis `siap` terbaru; pemilik boleh menyematkan yang lain.

| Data | Tempat | Catatan |
| --- | --- | --- |
| Akun | Postgres | pemilik semua bisnis; batas kuota (4.4.6) |
| Bisnis | Postgres | profil tetap (jenis, lokasi, menu bawaan), `primary_analysis_id` |
| Analisis | Postgres | status wizard, `stale` + alasan, `is_demo`, nomor versi transkrip dan persona |
| Konteks usaha (snapshot), menu | Postgres | F1; disalin dari bisnis saat analisis dibuat; perubahan menandai persona dan hasil kedaluwarsa |
| Fitur input kategorikal F1 | Postgres | hasil ekstraksi/kategorisasi fitur F1 |
| Versi $W$ dan versi tabel segmen | Postgres | parameter model diskret yang digunakan |
| Seed per analisis | Postgres | seed tetap untuk sampling persona terstratifikasi |
| PersonaSpec (500 per analisis, 20 pada demo) | Postgres | dipakai ulang di semua run; `persona_version` naik saat konteks atau slider berubah |
| Frame bukti terburam | object storage | dirujuk lewat `frame_keys` |
| Segmen transkrip + jejak audit edit | Postgres | F3, F4; `transcript_version` naik di setiap perubahan pemilik |
| Stempel waktu kasir | Postgres | satu nilai per video (F2), dasar akhir jalur (4.3) |
| Run (baseline, ablasi), versi model dan prompt | Postgres | status, biaya, `catalog_version`, `model_version`, `prompt_version` |
| Keputusan dan atribusi agen | Postgres | satu baris per agen per run (pesan 1 dan pesan 2, F5) |
| Hasil agregasi dan rekomendasi | Postgres | dihitung ulang dari keputusan, bisa dicache |
| Proyeksi | Postgres | label, basis versi, `spec_hash`, hasil; kunci cache di 4.4.4 |
| Aset 3D (PLY, splat, `camera_path.json`, metadata `up` dan kualitas) | object storage | dibangun sekali per video |
| Log panggilan model dan template prompt | Langfuse | auditabilitas |

Video mentah tidak disimpan. Mengubah transkrip atau konteks F1 menaikkan versi dan menandai persona serta hasil run lama `stale`, tetapi aset 3D tetap dipakai. Menghapus bisnis menghapus semua analisis dan asetnya (frame, 3D, keputusan agen).

### 4.2 Orkestrasi job

- Setiap pekerjaan berat (transkrip, 3D, run agen, ablasi/proyeksi terverifikasi) adalah job di antrean dengan status `antre`, `berjalan`, `selesai`, `gagal`, dan progres.
- Endpoint yang memicu job membalas **`202 Accepted`** dengan `job_id` dan header `Location` ke sumber dayanya.
- **Idempoten** lewat header `Idempotency-Key`: kunci yang sama tidak menjalankan job kedua. Secara isi, transkrip yang sama tidak memicu ulang 3D; video yang sama tidak memicu ulang transkrip kecuali diminta.
- Job 3D berjalan di antrean terpisah (GPU atau mode lokal), job LLM di antrean dengan konkurensi terbatas dan retry per batch.
- UI membaca progres lewat **SSE** (`GET /analyses/{aid}/events`) dengan polling `GET /analyses/{aid}/jobs` sebagai cadangan. Halaman 4 dan 6 hanya menampilkan status job.

### 4.3 Kunci penggabung: zona dan segmen berbasis waktu

- **Checkpoint ditandai AI.** Saat menyusun transkrip (F3), VLM menandai checkpoint jalur beserta stempel waktunya: terlihat dari jalan, pintu atau tangga, penanda atau papan, menu dan harga, dan titik pesan. Checkpoint yang tidak ditemukan dibiarkan kosong, bukan ditebak.
- **Pemilik hanya mengonfirmasi titik kasir** (F2): satu stempel waktu, bawaannya akhir video. Bila berbeda dengan titik pesan pilihan VLM, nilai pemilik yang dipakai. Titik ini menetapkan akhir jalur dan tahap Memesan.
- **Zona** adalah rentang waktu antar-checkpoint (misal Pintu atau tangga = detik 18 sampai 26), bukan posisi 3D. Zona terakhir berakhir di titik kasir.
- Segmen transkrip punya `timestamp_start` dan `timestamp_end`; jalur kamera 3D punya posisi per stempel waktu frame.
- Penggabungan di agregasi cukup mencari pose kamera pada stempel waktu segmen. Dengan begitu transkrip, simulasi, dan 3D bisa berjalan tanpa saling menunggu, dan menambah atau menghapus segmen tidak perlu membangun ulang 3D.

### 4.4 Kontrak API

Prinsip: **bisnis -> analisis -> (run, proyeksi, agen)** sebagai sumber daya bertingkat, dan pekerjaan berat selalu berupa job asinkron (4.2). Setelah dibuat, analisis diakses lewat rute datar `/analyses/{aid}/...` (bukan `/businesses/{bid}/analyses/{aid}/...`) agar URL pendek. Setiap permintaan tetap memeriksa rantai kepemilikan akun -> bisnis -> analisis.

#### 4.4.1 Bisnis

| Metode dan jalur | Fungsi |
| --- | --- |
| `GET /businesses` | daftar bisnis akun, dengan `primary_analysis` dan `next_action` ringkas |
| `POST /businesses` | buat bisnis |
| `GET`, `PATCH`, `DELETE /businesses/{bid}` | baca, ubah (termasuk menyematkan `primary_analysis_id`), hapus |
| `GET /businesses/{bid}/analyses` | riwayat analisis bisnis (status, label kualitas 3D, ringkasan temuan) |
| `POST /businesses/{bid}/analyses` | buat analisis baru, menyalin konteks dari profil bisnis |

#### 4.4.2 Analisis dan wizard

| Metode dan jalur | Fungsi |
| --- | --- |
| `GET /analyses/{aid}` | status, versi, `stale`, dan `next_action` |
| `PUT /analyses/{aid}/context` | simpan konteks (F1); menghasilkan fitur kategorikal dan PersonaSpec |
| `POST /analyses/{aid}/menu` | unggah file menu (Excel/CSV) atau foto menu; foto dibaca VLM menjadi daftar yang bisa dikoreksi |
| `POST /analyses/{aid}/video` | minta URL unggah untuk video terburam |
| `POST /analyses/{aid}/video/complete` | kirim `cashier_at_s` (stempel waktu kasir), memicu job transkrip dan 3D |
| `GET /analyses/{aid}/jobs` | status semua job |
| `GET /analyses/{aid}/events` | SSE untuk progres (polling sebagai cadangan) |
| `GET /analyses/{aid}/transcript` | baca segmen |
| `PATCH`, `POST`, `DELETE /analyses/{aid}/transcript/segments/{sid}` | edit, tambah, hapus segmen |
| `POST /analyses/{aid}/transcript/confirm` | tandai verifikasi selesai |
| `GET /analyses/{aid}/persona` | ringkasan sebaran persona (untuk layar konfirmasi) |
| `PUT /analyses/{aid}/persona/overrides` | slider sebaran segmen oleh pemilik (opsional, pertanyaan terbuka 14) |

#### 4.4.3 Hasil dan Jelajah Agen

| Metode dan jalur | Fungsi |
| --- | --- |
| `POST /analyses/{aid}/runs` | jalankan simulasi dasar (`202`, mengembalikan job) |
| `GET /analyses/{aid}/runs`, `GET /runs/{rid}` | daftar dan detail run |
| `GET /analyses/{aid}/dashboard` | agregasi run dasar yang valid, sudah lolos verifier (F6) |
| `GET /analyses/{aid}/recommendations` | rekomendasi, tindakan dari katalog, perkiraan biaya (F6-D) |
| `GET /analyses/{aid}/twin` | aset 3D, mode tampilan (putar, jalan, tur), label kualitas (F7) |
| `POST /analyses/{aid}/measurement-plan` | buat rencana pengukuran (F6-G) |
| `GET /analyses/{aid}/agents` | daftar agen dengan filter `run`, `decision`, `stage`, `segment`, `hypothesis`, `q`, dan `cursor` |
| `GET /analyses/{aid}/agents/{agent_id}` | persona, monolog, keputusan, atribusi ke katalog dengan kutipan |
| `GET /analyses/{aid}/agents/{agent_id}/journey` | pose kamera per langkah untuk diputar di Visual Twin |

#### 4.4.4 Proyeksi (mencentang perbaikan)

| Metode dan jalur | Perilaku | Label |
| --- | --- | --- |
| `POST /analyses/{aid}/projections/estimate` | sinkron, milidetik, tanpa LLM | `perkiraan_cepat` |
| `POST /analyses/{aid}/projections` | cache lebih dulu; jika tidak ada, `202` dan job ablasi berpasangan (F6-D) | `terverifikasi_simulasi` |
| `GET /projections/{pid}` | status dan hasil | sesuai pembuatnya |

**Estimator `perkiraan_cepat`:** dihitung kode dari atribusi run dasar (F6-C). Agen yang tidak memesan dengan hipotesis `primary` yang ditangani perbaikan terpilih dihitung berpotensi naik satu tahap corong; hasilnya ditampilkan sebagai rentang dengan label jelas *perkiraan*, bukan hasil simulasi.

Badan permintaan sama untuk keduanya:

```json
{
  "recommendation_ids": ["rec_1", "rec_2", "rec_3"],
  "spec_overrides": { "rec_1": { "tinggi_huruf_cm": 6 } }
}
```

Contoh respons:

```json
{
  "projection_id": "prj_91",
  "label": "terverifikasi_simulasi",
  "status": "selesai",
  "cache_hit": false,
  "basis": {
    "baseline_run_id": "run_1",
    "transcript_version": 7,
    "persona_version": 2,
    "catalog_version": 3,
    "spec_hash": "a91f..."
  },
  "funnel": {
    "sebelum": { "melihat": 20, "berhenti": 6, "masuk": 4, "memesan": 2 },
    "sesudah": { "melihat": 20, "berhenti": 12, "masuk": 8, "memesan": 5 }
  },
  "efek": { "memesan_agen": 3, "agen_berubah_keputusan": ["a_042", "a_108", "a_340"] },
  "biaya": { "min_rp": 200000, "maks_rp": 350000 }
}
```

Sesuai keputusan 12, tidak ada evaluasi noise antar-run: `basis` merujuk satu run dasar, dan `efek` melaporkan jumlah agen yang berubah keputusan apa adanya, tanpa penanda "melewati noise".

**Kunci cache:** `hash(analysis_id, transcript_version, persona_version, sorted(recommendation_ids), spec_hash)`. Kombinasi yang sama langsung dikembalikan tanpa menjalankan agen. Mengubah transkrip atau persona menaikkan versi, sehingga cache lama otomatis tidak terpakai.

#### 4.4.5 Mode demo

- Satu **bisnis demo** milik akun demo dengan analisis `is_demo: true` yang sudah lengkap: run dasar dan proyeksi terverifikasi yang sudah disimpan (bisa dari 500 agen, opsi pre-run di Bagian 9).
- `projections/estimate` bekerja normal, sehingga centang terasa hidup.
- `POST /projections` pada analisis demo hanya mengembalikan hasil cache untuk kombinasi yang sudah disiapkan (tiap perbaikan sendiri dan "semua"). Kombinasi lain dijawab `409 verified_unavailable_in_demo` beserta estimasinya, dan UI menampilkan *Perkiraan cepat* saja.
- Analisis demo bersifat baca-saja (tidak ada `POST /runs`), jadi tidak ada biaya API saat demo.

#### 4.4.6 Status, `next_action`, dan aturan lintas endpoint

`GET /analyses/{aid}` dan item di `GET /businesses/{bid}/analyses` memuat `status` dan `next_action`, supaya klien tidak menebak:

```json
{
  "id": "ana_12",
  "status": "verifikasi",
  "stale": false,
  "next_action": { "route": "/analyses/ana_12/verify", "label": "Lanjut verifikasi" }
}
```

- **Status:** `draft` -> `konteks` -> `video` -> `memproses` -> `verifikasi` -> `simulasi` -> `siap`. Kedaluwarsa adalah penanda `stale` (dengan alasan `transcript_changed`, `context_changed`, `persona_changed`), bukan status baru; data lama tetap bisa dibaca dan UI menawarkan simulasi ulang.
- Untuk analisis `siap`, `next_action` menuju dasbor. Klik kartu bisnis memakai `primary_analysis.next_action`.
- **Prasyarat (`409`):** run ditolak jika antrean segmen tidak pasti belum kosong atau job transkrip belum selesai. Bodi galat memuat kode (`transcript_unconfirmed`, `context_incomplete`, `cashier_missing`), bukan hanya teks.
- **Versi di setiap respons hasil:** `transcript_version`, `persona_version`, `catalog_version`, `model_version`, dan `prompt_version` (audit, Bagian 7).
- **Paginasi kursor** untuk daftar agen. Nilai filter `stage`, `segment`, dan `hypothesis` memakai kode tetap, bukan teks tampilan.
- **Kuota:** batasi `POST /projections` dan `POST /runs` per analisis dan per akun (misal 10 proyeksi terverifikasi per analisis per hari) untuk mencegah loop atau penyalahgunaan.
- **Kepemilikan:** ID opak (bukan urut). Setiap rute `/analyses/{aid}` memeriksa rantai akun -> bisnis -> analisis; `/runs/{rid}` dan `/projections/{pid}` memeriksa lewat analisis induknya.
- **Penghapusan:** menghapus bisnis menghapus analisis dan asetnya. Video mentah memang tidak pernah disimpan.

---

## 5. Alur Pengguna dan Halaman

### 5.1 Alur

```
Konteks + video -> Cek kualitas & privasi -> Transkrip (+ Visual Twin, paralel)
  -> Verifikasi pemilik -> Simulasi 500 agen (atau 20 agen demo) -> Dasbor Analitik -> Rencana pengukuran
```

Aplikasi berbentuk wizard satu arah (halaman 1 sampai 7), dengan dua halaman lanjutan dari Dasbor (8 dan 9) dan satu halaman Daftar bisnis dan riwayat (10). Pemilik boleh kembali ke langkah sebelumnya dari penanda langkah. Mengubah transkrip atau isian konteks F1 setelah dasbor jadi menandai persona dan dasbor lama kedaluwarsa serta menawarkan simulasi ulang. Visual Twin tidak dibangun ulang kecuali video diganti.

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
| 10 | Daftar bisnis & riwayat | Daftar bisnis; tiap bisnis membuka analisis utamanya, plus riwayat analisis per bisnis | - |

### 5.3 Ringkasan per halaman

**1. Beranda.** Satu kalimat nilai, tombol Mulai Analisis, tautan ke Riwayat.

**2. Konteks Usaha.** Satu container satu kolom dengan empat bagian bernomor (Informasi dasar, Pelanggan & tujuan, Menu & harga, Jam operasional), target selesai di bawah 3 menit. Menu diisi lewat unggah file Excel atau foto menu yang dibaca otomatis menjadi daftar yang bisa dikoreksi. Label memakai badge Wajib/Opsional; status isian wajib dan tombol lanjut ada di kaki container. Semua isian mengalir ke konteks agen dan model persona diskret, tidak dikirim ke VLM (kecuali satu kalimat jenis usaha pada prompt VLM). Detail di F1.

**3. Rekam Video.** Rekam atau unggah video, cek kualitas otomatis, dan pratinjau hasil blur. Checkpoint jalur dipilih AI saat transkripsi; pemilik hanya menjawab satu pertanyaan: di menit berapa titik pesan/kasir terlihat (bawaan akhir video). Indikator gerak saat merekam: terlalu cepat, atau jangan hanya berputar tapi sambil berjalan. Video terlalu gelap, goyang, atau pendek ditolak dengan pesan jelas. Otomatis berhenti di durasi maksimum.

**4. Memproses.** Progres bertahap (mengunggah, membaca video, menyusun kejadian, membangun tampilan 3D). Transkrip dan Visual Twin berjalan paralel; halaman 5 terbuka begitu transkrip siap. Jika transkrip gagal, ada tombol Coba lagi tanpa kehilangan video. Jika Visual Twin gagal, alur lanjut dengan tampilan cadangan.

**5. Verifikasi Transkrip.** Pemutar video dengan garis waktu segmen, dan daftar segmen berpasangan dengan frame bukti. Aksi per segmen: Benar, Ubah, Hapus, Tambah. Edit via LLM (instruksi singkat, hasil sebelum/sesudah, berlaku setelah Terima). Segmen berkeyakinan rendah masuk antrean wajib konfirmasi. Tombol Jalankan Simulasi nonaktif sampai antrean itu kosong. Peta mini Visual Twin tampil jika sudah siap.

**6. Menjalankan Simulasi.** Progres agen (misal 320 dari 500 agen, atau 10 dari 20 pada demo), dengan tahap menjalankan agen, mengagregasi, dan menyusun dasbor. Jika sebagian batch gagal, batch itu diulang otomatis; jika tetap gagal, dasbor memberi penanda jumlah agen yang berhasil.

**7. Dasbor Analitik.** Visual Twin di pusat, dikelilingi tiga poin utama, corong 4 tahap (Melihat, Berhenti, Masuk, Memesan), rekomendasi Pareto, matriks dampak vs usaha, dan catatan kepercayaan. Dasbor menekankan peringkat dan lokasi titik gesekan, bukan angka konversi absolut. Detail di F6, F7, dan tata letak di 5.5.

**8. Jelajah Agen.** Daftar agen dengan persona, monolog, keputusan, dan alasan; filter menurut keputusan, tahap corong 4 tahap, dan titik berhenti. Memilih agen memutar perjalanannya di Visual Twin. Boleh dibuat sebagai panel samping Dasbor.

**9. Rencana Pengukuran.** Apa yang dihitung, berapa lama, data minimum, lembar tally yang bisa dicetak, dan tangkapan Visual Twin dengan tanda titik berdiri pemilik (ditentukan dari jam ramai dan lokasi gesekan terbesar). Bagian ini menutup celah bahwa simulasi bersifat hipotesis (lihat F6-G).

**10. Daftar bisnis & riwayat.** Kartu per bisnis (nama, cabang, jenis, status analisis utama). Klik kartu mengikuti `primary_analysis.next_action` (dasbor bila siap, atau langkah wizard berikutnya). Riwayat per bisnis berisi kartu analisis: nama, tanggal, status (memproses, siap, kedaluwarsa), label kualitas 3D (F7), dan ringkasan temuan jika ada; pemilik bisa menyematkan analisis utama. Tambah bisnis lewat modal (nama, cabang, jenis, alamat).

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
| [KPI] Tahap gesekan terbesar | Hipotesis utama | Porsi dijelaskan       |
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

Catatan KPI: Hipotesis utama dan porsi dijelaskan diambil dari skor atribusi (F6-C): porsi agen yang hilang yang alasannya dijelaskan oleh rekomendasi Prioritas. Dasbor menekankan perbandingan peringkat rekomendasi dan letak friksi fisik, bukan kepastian angka absolut.

### 5.6 Prioritas jika waktu mepet

| Prioritas | Isi |
| --- | --- |
| **Wajib** | Halaman 2, 3, 5, 7: konteks, rekam, verifikasi, dasbor (KPI, corong 4 tahap, peta panas, rekomendasi) |
| **Versi sederhana** | Halaman 1 satu tombol; halaman 4 dan 6 layar tunggu; halaman 10 daftar sederhana; Visual Twin berupa awan titik dan jalur kamera tanpa Gaussian Splatting |
| **Boleh ditunda** | Halaman 8 (jadi panel), halaman 9 (jadi bagian akhir dasbor), lapisan agen beranimasi, peta mini di halaman 5, Panel Tanya Sekilas (RAG), edit via LLM |

---

## 6. Kebutuhan Fungsional

### F1. Konteks Usaha

Form mengumpulkan konteks usaha yang tidak terlihat dari video, dengan target pengisian di bawah 3 menit. Tata letaknya **satu container satu kolom**: empat bagian bernomor dipisah judul bagian, setiap isian selebar penuh, label memakai badge Wajib/Opsional, tanpa petunjuk teks di pojok kanan. Pilihan satu tampil sebagai tombol yang disorot, pilihan banyak sebagai tombol dengan kotak centang; tidak ada opsi "lainnya" dan label tidak memakai pasangan bergaris miring. Semua isian mengalir ke konteks agen dan model persona diskret, tidak dikirim ke VLM (kecuali satu kalimat jenis usaha di prompt VLM). Nilai awal disalin dari profil bisnis (4.1).

#### Bagian 1: Informasi dasar

| Isian | Tipe | Wajib | Mengalir ke |
| --- | --- | --- | --- |
| Jenis usaha | pilih satu: warung makan, kedai kopi, kafe santai, restoran ruko | ya | model diskret; satu kalimat di prompt VLM |
| Nama tempat usaha | teks pendek | ya | konteks agen |
| Lokasi usaha | alamat atau titik di peta | ya | model diskret (fitur lokasi); konteks agen |
| Deskripsi letak fisik | teks (misal "lantai 2 ruko, sebelah minimarket"), tinggi tetap | ya | konteks agen (diketahui atau tidak diketahui) |

#### Bagian 2: Pelanggan & tujuan (semua pilihan punya nilai bawaan)

| Isian | Tipe | Wajib | Mengalir ke |
| --- | --- | --- | --- |
| Tipe lingkungan sekitar | pilih satu: dekat kampus, kawasan perkantoran, permukiman warga, jalan utama | ya | model diskret (fitur utama) |
| Siapa yang biasa melintas | pilih banyak: mahasiswa, pekerja kantor, warga sekitar, keluarga, pengendara lewat | tidak | model diskret (menggeser bobot segmen) |
| Tujuan utama | pilih satu: lebih banyak pembeli baru, naikkan belanja rata-rata, ramaikan jam-jam sepi | tidak | lapisan rekomendasi (urutan dan penilaian dampak), bukan simulasi |
| Hal yang tidak bisa diubah | pilih banyak: lokasi toko, fasad bangunan, konsep menu inti, standar harga pokok | tidak | lapisan rekomendasi (menyaring saran mustahil dan menyesuaikan penilaian usaha) |

#### Bagian 3: Menu & harga

| Isian | Tipe | Wajib | Mengalir ke |
| --- | --- | --- | --- |
| Daftar menu & harga porsi | unggah **file Excel** (.xlsx, .xls, .csv; kolom nama menu dan harga porsi) **atau foto menu** yang dibaca VLM | ya | model diskret (level harga); konteks agen; pencocokan dengan transkrip |

Unggahan dikirim lewat `POST /analyses/{aid}/menu` (4.4.2). File Excel diparse kode; foto menu dibaca VLM menjadi daftar nama dan harga. Hasilnya ditampilkan sebagai daftar yang bisa dikoreksi sebelum dipakai. Level harga dihitung kode dari harga menu (median per porsi) dan dikategorikan, bukan ditebak model, sehingga baru tersedia setelah menu terbaca.

#### Bagian 4: Jam operasional

| Isian | Tipe | Wajib | Mengalir ke |
| --- | --- | --- | --- |
| Jam operasional | rentang jam buka sampai tutup | ya | konteks agen (diketahui atau tidak) |
| Jam paling ramai | rentang jam | ya | konteks agen; rencana pengukuran (F6-G) |

Isian "tetangga terdekat" dihapus; keberadaan pesaing tidak lagi menjadi fitur model diskret.

#### Perilaku

- Foto menu yang tidak terbaca memberi pilihan unggah ulang atau beralih ke file Excel.
- Placeholder harus tampil lebih terang daripada teks yang sudah diisi; textarea tidak bisa diubah ukurannya.
- Validasi: jam buka harus mendahului jam tutup; jam ramai harus berada dalam jam buka; harga hasil bacaan berupa bilangan bulat positif.
- Status "x dari 7 isian wajib terisi" tampil di atas form; tombol lanjut aktif setelah ketujuh isian wajib terpenuhi.
- Isian disimpan per analisis (`PUT /analyses/{aid}/context`). Mengubah isian setelah simulasi menandai persona dan hasil lama `stale` serta menawarkan simulasi ulang.

#### Aturan pengetahuan agen (kriteria penerimaan)

- Setiap isian punya penanda `diketahui_agen`: `selalu`, `jika_terlihat`, atau `tidak`.
- Menu dan harga: `jika_terlihat`. Agen hanya tahu harga jika menu terbaca di transkrip.
- Jam buka: `jika_terlihat`. Agen hanya tahu jika ada papan atau tanda buka di transkrip.
- Deskripsi letak: `jika_terlihat`.
- Jam ramai, tujuan, hal yang tidak bisa diubah: `tidak`. Hanya dipakai kode (jam ramai untuk rencana pengukuran F6-G; tujuan dan hal yang tidak bisa diubah untuk lapisan rekomendasi Pareto).
- Tipe sekitar dan siapa yang biasa lewat: `tidak` (tidak masuk sebagai pengetahuan agen, tetapi membentuk persona lewat model diskret).
- Pencocokan menu: setelah transkrip jadi, kode membandingkan menu form dengan harga yang terbaca di transkrip dan menandai "menu terisi tetapi tidak terbaca dari jalan" sebagai temuan awal.
- Semua versi isian, versi tabel segmen model diskret, dan seed dicatat di jejak audit.

### F2. Video

Pemilik merekam satu video dari sisi jalan, tempat calon pelanggan pertama kali melihat usaha, sampai titik pesan.

- **Berhenti:** saat sampai titik pesan, atau saat durasi maksimum tercapai.
- **Checkpoint dan titik kasir:** pemilik tidak mengetuk checkpoint saat merekam; checkpoint jalur dipilih VLM saat transkripsi (F3, 4.3). Pemilik hanya mengisi atau mengonfirmasi menit titik pesan/kasir (bawaan akhir video, format mm:dd, tidak melebihi durasi), dikirim sebagai `cashier_at_s` (4.4.2).
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
  zone_id?: string;            // zona dari checkpoint pilihan VLM, berakhir di titik kasir (4.3)
  narrative: string;           // deskripsi bebas, sedetail mungkin
  not_visible: string;         // apa yang TIDAK terlihat atau tidak terbaca di titik ini
  confidence: 'stabil' | 'tidak_pasti';
  camera_pose?: {              // diisi saat penggabungan dari camera_path (F7)
    position: [number, number, number];
    look_vector: [number, number, number];
  };
}

interface TranscriptCheckpoint {          // dipilih VLM saat transkripsi (4.3)
  kind: 'terlihat_dari_jalan' | 'pintu_atau_tangga' | 'penanda_atau_papan' | 'menu_dan_harga' | 'titik_pesan';
  timestamp: number;                       // detik relatif video
  segment_id: string;                      // segmen tempat checkpoint terlihat
}
// titik_pesan dari VLM digantikan nilai cashier_at_s bila pemilik mengisinya (F2).

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

1. **Fitur kategorikal dari F1:** tipe sekitar lokasi, siapa yang biasa lewat, level harga (kategori hasil hitung kode dari median menu), dan jam ramai.
2. **Segmen pelanggan diskret:** 6 sampai 10 segmen (misal: mahasiswa, pekerja kantor, warga sekitar, keluarga, pengendara/ojol lewat) (usulan).
3. **Bobot segmen:** dihitung dengan multinomial logit:
   $$P(\text{segmen}) = \text{softmax}(W \cdot \text{fitur})$$
   Matriks bobot $W$ ditulis tangan oleh tim berdasarkan penilaian domain dan rujukan kasar BPS, **TANPA training**. Training baru dipertimbangkan setelah M12 bila data tally manual terkumpul cukup banyak, itupun hanya untuk menyetel sedikit parameter (usulan).
4. **Sifat bersyarat per segmen:** sensitivitas anggaran, kemalasan fisik, konteks makan, familiar dengan area, dan niat datang, sehingga kombinasi sifat yang terbentuk realistis (misal mahasiswa lebih peka anggaran dan lebih santai; pengendara lewat lebih terburu-buru). Dimensi baru "familiar dengan area" dan "niat datang" ditambahkan ke model (usulan).
5. **Penyesuaian marginal (IPF):** bila perlu menyesuaikan proporsi marginal dari input pemilik (chip "siapa yang biasa lewat"), digunakan Iterative Proportional Fitting (IPF) agar struktur korelasi antar-sifat tetap terjaga (usulan).
6. **Sampling terstratifikasi:** kode menjalankan sampling terstratifikasi dengan seed tetap untuk menghasilkan 500 spesifikasi agen (`PersonaSpec`). Hasilnya disimpan per analisis di Postgres dan dipakai ulang di seluruh run dasar dan ablasi.
7. **Sumber tabel dan transparansi:** sumber isi tabel dan parameter $W$ dicatat per baris (misal data publik BPS sebagai rujukan kasar plus penilaian tim) dan diberi label tegas sebagai asumsi di sistem dan UI, bukan angka ilmiah.
8. **Teks bebas:** tidak ada isian teks bebas yang menjadi fitur model diskret; LLM tidak menentukan sebaran probabilitas persona.

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
  - *Konsekuensi demo 20 agen:* granularitas sangat kasar (1 agen = 5% pergerakan corong), satu agen bisa menggeser peringkat hipotesis, dan stratifikasi segmen menjadi sangat tipis. Karena kestabilan antar-run tidak diukur, dasbor demo menampilkan jumlah agen apa adanya (misal 6 dari 20), bukan persen yang terkesan presisi.
  - *Opsi demo (usulan):* simulasi demo dijalankan lebih dulu pada 500 agen lalu disimpan (*pre-computed/cached*), atau ukuran demo memakai 50 sampai 100 agen.

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

#### Pesan Kedua: Atribusi ke Katalog Hipotesis

Pesan 1 di atas dijalankan **tanpa katalog hipotesis**, agar agen tetap berperan sebagai calon pelanggan, bukan auditor yang mencari-cari masalah dari daftar. Setelah keputusan pesan 1 tervalidasi dan disimpan, pesan 2 dikirim di **percakapan batch yang sama** (konteks pesan 1 terbaca dari cache, sehingga murah). Keputusan pesan 1 tidak boleh diubah oleh pesan 2.

**Pertanyaan per stance** (satu batch boleh berisi stance campuran; tiap agen mendapat pertanyaan dan katalognya sendiri):

| `final_decision` | Pertanyaan | Dipakai untuk |
| --- | --- | --- |
| `lewat` | Apa yang membuatmu tidak berhenti? | penyebab kehilangan Melihat -> Berhenti |
| `berhenti_lalu_pergi` | Apa yang membuatmu tidak jadi masuk? | penyebab kehilangan Berhenti -> Masuk |
| `masuk_tanpa_memesan` | Apa yang membuatmu tidak jadi memesan? | penyebab kehilangan Masuk -> Memesan |
| `memesan` | Apa yang hampir membuatmu batal? Boleh jawab tidak ada. | gesekan yang ditoleransi dan pembanding (lift) |

**Penyaringan katalog oleh kode:** agen hanya menerima hipotesis yang `vantage`-nya sudah ia lewati sampai `stopped_at_segment_id` (atau seluruh jalur bila memesan), ditambah H0. Agen yang pergi dari jalan tidak bisa menyalahkan menu di dalam yang belum pernah ia lihat; ini konsisten dengan aturan bahwa agen tidak memakai informasi dari segmen yang belum dicapai.

**Aturan pesan 2:**
- Skala ordinal 0 sampai 3: 0 tidak berpengaruh, 1 sedikit, 2 cukup, 3 penentu. Bukan skor 0 sampai 100, karena angka bebas dari LLM tidak terkalibrasi dan cenderung bergerombol.
- Tepat satu hipotesis berlabel `primary` untuk agen yang tidak memesan (boleh H0). Untuk agen yang memesan, `primary` boleh kosong.
- Setiap nilai di atas 0 wajib menyertakan kutipan persis dari monolog pesan 1. Kutipan yang tidak ditemukan di monolog dibuang oleh kode beserta nilainya.
- Urutan katalog diacak per batch untuk mengurangi bias posisi. Hanya hipotesis bernilai di atas 0 yang ditulis, untuk menghemat token keluaran.

```typescript
interface AgentAttributionResponse {
  batch_id: number;
  results: Array<{
    agent_id: number;
    attributions: Array<{
      hypothesis_id: string;          // 'H1'..'H10' atau 'H0' (lainnya)
      strength: 1 | 2 | 3;            // hanya yang di atas 0 yang ditulis
      evidence: string;               // kutipan persis dari monolog pesan 1
    }>;
    primary: string | null;           // satu hypothesis_id; null hanya untuk 'memesan'
    other_reason?: string;            // wajib jika H0 dipilih, bahasa bebas
  }>;
}
```

#### Kestabilan Hasil

- Suhu rendah, persona tetap dari model diskret, versi model dikunci, semua panggilan dan prompt dicatat.
- **Run dasar dijalankan satu kali.** Noise antar-run tidak diukur demi biaya; konsekuensinya dicatat di catatan kepercayaan dasbor (F6-H), dan hasil diperlakukan sebagai hipotesis yang diuji lewat tally manual (F6-G).

**Kriteria penerimaan:**
- 500 agen selesai dalam target di bawah 3 menit untuk satu run (atau <30 detik untuk demo 20 agen).
- Setiap agen memiliki monolog, keputusan, dan alasan yang tersimpan dan dapat ditelusuri.
- Setiap atribusi yang tersimpan punya kutipan yang benar-benar ada di monolog agen tersebut (diperiksa kode).
- Tidak ada atribusi ke hipotesis dari sudut pandang yang belum dilewati agen.
- Distribusi keputusan pada sampel kecil dibandingkan antara 1, 5, dan 10 agen per panggilan di M5.

### F6. Agregasi dan Isi Dasbor

Semua angka dihitung oleh kode dari keluaran agen yang sudah tersimpan. LLM hanya dipakai di dalam simulasi agen (termasuk pesan 2 atribusi, F5) dan untuk menulis ringkasan; share, lift, dan peringkat dihitung kode.

#### A. Corong (4 tahap)

1. **Melihat:** 500 agen (atau 20 agen pada demo).
2. **Berhenti (tertarik):** tahap 1 dikurangi jumlah agen dengan keputusan `lewat`.
3. **Masuk (naik atau masuk):** tahap 2 dikurangi jumlah agen dengan keputusan `berhenti_lalu_pergi`.
4. **Memesan:** tahap 3 dikurangi jumlah agen dengan keputusan `masuk_tanpa_memesan`.

Tahap dengan penurunan terbesar disorot, disertai faktor penyebab utamanya. Tahap kelima ("Kembali") dan label niat yang dinyatakan agen telah dihapus sepenuhnya dari corong.

#### B. Bobot Friksi dan Peta Panas

Untuk setiap segmen: jumlah agen dengan `stopped_at_segment_id` sama dengan id segmen, dibagi total agen. Nilai ini diikatkan ke pose kamera pada stempel waktu segmen itu (4.3) dan dirender sebagai gradien hijau ke merah di sepanjang jalur Visual Twin. Intensitas bersifat relatif, bukan persentase pelanggan nyata. Tanpa 3D, peta panas yang sama tampil di pita frame per zona.

#### C. Atribusi ke Katalog Hipotesis dan Skor

**Katalog hipotesis.** Daftar tetap masalah yang mungkin terjadi pada tempat makan. Satu katalog dipakai bersama oleh pesan 2 agen (F5), rekomendasi, dan RAG (F8). Setiap butir berisi definisi, kapan termasuk, kapan tidak termasuk (dengan 1 sampai 2 contoh kalimat), sudut pandang terkait (`vantage` dari F3), dan tindakan perbaikan dari katalog tindakan. Isi awal (usulan, dikurasi tim):

| ID | Hipotesis | `vantage` terkait |
| --- | --- | --- |
| H1 | Tempat tidak terlihat atau tidak dikenali dari jalan (papan nama kecil, tertutup, tidak terbaca) | jalan |
| H2 | Status buka atau tutup tidak jelas | jalan, pintu |
| H3 | Jenis makanan tidak jelas dari luar | jalan, pintu |
| H4 | Tidak ada tempat berhenti atau parkir yang jelas | jalan |
| H5 | Hambatan masuk (tangga, pintu tertutup, jalur sempit) | pintu |
| H6 | Kesan kebersihan atau penerangan kurang | pintu, dalam |
| H7 | Suasana terlalu sepi atau terlalu ramai sehingga ragu | jalan, pintu, dalam |
| H8 | Menu dan harga tidak terlihat atau tidak terbaca | pintu, dalam |
| H9 | Harga terkesan tidak sesuai anggaran | pintu, dalam |
| H10 | Titik pesan membingungkan (tidak jelas pesan di mana, antre tidak teratur) | dalam |
| H0 | Lainnya, atau tidak ada di daftar | semua |

Hipotesis yang jelas tidak berlaku untuk toko itu (misal H5 bila tidak ada tangga atau pintu) tetap boleh dinilai agen; nilainya akan rendah dengan sendirinya. Alasan H0 dikumpulkan dan ditinjau tim sebagai usulan butir katalog baru.

**Perhitungan (semua oleh kode, tanpa LLM):**

1. **Bobot per agen.** Untuk agen yang tidak memesan, nilai atribusinya dinormalisasi agar total per agen = 1: `a(i,H) = strength(i,H) / jumlah strength agen i`. Setiap agen yang hilang menyumbang tepat "satu suara" yang dibagi ke alasannya.
2. **Share (porsi kehilangan).** `share(H) = jumlah a(i,H) / jumlah agen yang tidak memesan`. Total semua H = 100%, sehingga bisa langsung dibuat Pareto. Bisa dipecah per tahap corong (lewat, berhenti lalu pergi, masuk tanpa memesan) dan per segmen persona.
3. **Lift (pembeda).** `lift(H) = % agen tidak memesan yang menyebut H / % agen memesan yang menyebut H` (penyebut diberi koreksi kecil agar tidak nol). Lift di atas 1 berarti H lebih sering dialami agen yang hilang. Lift sekitar 1 atau kurang berarti keluhan umum yang tidak membedakan.
4. **Gesekan yang ditoleransi.** Hipotesis yang disebut agen yang memesan, ditampilkan terpisah sebagai catatan ("dikeluhkan, tapi tidak menghentikan orang").
5. **Peringkat.** Hipotesis diurutkan menurut share, hanya untuk yang lift-nya di atas 1. Pada demo 20 agen, share ditampilkan sebagai jumlah agen (misal 6 dari 14 agen yang hilang).
6. **Lokasi.** Setiap atribusi membawa `factor_segment_ids` dan `stopped_at_segment_id`, sehingga setiap hipotesis punya lokasi di jalur Visual Twin (4.3). Memilih hipotesis menyorot bagian jalurnya beserta kutipan agen yang hilang di situ.

#### D. Rekomendasi, Pareto, dan Ablasi Opsional

Daftar prioritas perbaikan disusun **tanpa VLM tambahan**. Semua bahannya sudah tersedia setelah simulasi:

| Bahan | Sumber |
| --- | --- |
| Peringkat masalah (share, lift) | pesan 2 agen dan perhitungan kode (C) |
| Bukti visual | transkrip VLM yang sudah diverifikasi pemilik: `narrative`, `not_visible`, frame bukti per segmen (F3, F4) |
| Suara pelanggan | kutipan monolog agen yang lolos verifikasi (F5) |
| Batasan pemilik | chip "tujuan" dan "tidak bisa diubah" dari F1 |
| Lokasi | pose kamera segmen terkait (4.3, F7) |

**Katalog tindakan (wajib, bukan bagian RAG opsional).** Untuk setiap hipotesis H1 sampai H10 tersedia 2 sampai 4 tindakan baku yang dikurasi tim, masing-masing dengan id, judul, usaha (rendah, sedang, tinggi), perkiraan biaya kasar, dan bagian toko yang diubah (dipakai untuk mencocokkan chip "tidak bisa diubah"). Contoh: H2 -> `A2.1` pasang papan jam buka yang terbaca dari jalan (rendah), `A2.2` lampu atau tanda BUKA yang menyala (rendah); H5 -> `A5.1` penunjuk arah dan info di kaki tangga (rendah), `A5.2` perbaikan akses masuk (tinggi).

**Alur penyusunan:**

1. **Urutkan masalah (kode).** Ambil hipotesis yang lolos peringkat C.5, maksimal 5 teratas.
2. **Ambil kandidat tindakan (kode).** Untuk tiap hipotesis, ambil tindakannya dari katalog tindakan, lalu buang yang melanggar chip "tidak bisa diubah" (atau naikkan usahanya satu tingkat, sesuai keputusan pertanyaan terbuka 4).
3. **Sesuaikan dengan toko (satu panggilan LLM teks, GPT-6 Luna).** Masukan: hipotesis teratas beserta share dan lift, segmen transkrip terkait (`narrative`, `not_visible`), 3 sampai 5 kutipan agen per hipotesis, chip "tujuan", dan kandidat tindakan dari langkah 2. Keluaran per hipotesis: satu `action_id` terpilih dan satu sampai dua kalimat yang spesifik untuk toko itu (misal *Pasang papan jam buka di dinding kanan kaki tangga; dari trotoar tidak terlihat info jam buka, dan 6 agen menyebut takut sudah tutup.*). Aturan:
   - `action_id` wajib salah satu kandidat dari langkah 2; tindakan di luar katalog ditolak.
   - Wajib menyebut `segment_ids` sumber; id yang tidak ada di transkrip ditolak.
   - Detail fisik hanya boleh diambil dari teks segmen. Jika lokasi pemasangan tidak tertulis di transkrip, kalimat tetap umum (misal *di area yang terlihat dari jalan*), tidak menebak.
   - Semua angka di kalimat diperiksa verifier F6 terhadap hasil agregasi; yang tidak cocok dibuat ulang atau dibuang.
4. **Saring dan urutkan (kode).** Urutan disesuaikan dengan prioritas tujuan usaha pemilik. Pareto: share besar dan usaha kecil di atas. Tanda **Prioritas** diberikan pada rekomendasi yang menutup sekitar 80% share kumulatif (maksimum 5 item). Sisanya masuk kategori Nanti.
5. **Tampilkan.** Setiap kartu rekomendasi berisi tindakan spesifik, usaha dan biaya kasar dari katalog, alasan (kutipan agen), tombol *Lihat bukti* ke frame segmen, dan lokasinya di Visual Twin.

```typescript
interface RecommendationDraft {        // keluaran langkah 3, divalidasi skema
  hypothesis_id: string;               // dari peringkat C.5
  action_id: string;                   // wajib salah satu kandidat langkah 2
  text: string;                        // 1-2 kalimat spesifik untuk toko ini
  segment_ids: string[];               // segmen sumber, wajib ada di transkrip
  quote_agent_ids: number[];           // agen yang kutipannya dipakai
}
```

**VLM tambahan hanya opsional.** Jika di kemudian hari rekomendasi butuh detail fisik yang tidak tertulis di transkrip (misal di mana ada ruang dinding kosong untuk papan), cukup kirim 1 sampai 3 frame bukti dari segmen terkait ke VLM, tanpa membaca ulang video. Tidak dikerjakan untuk demo.

**Ablasi (opsional, atas permintaan, tidak masuk alur standar; diakses lewat `POST /analyses/{aid}/projections` dengan label `terverifikasi_simulasi` dan cache, 4.4.4).** Untuk menguji sebab-akibat satu hipotesis: tulis ulang hanya segmen terkait menjadi versi sudah diperbaiki dengan templat kalimat tetap (misal papan jam buka kini terbaca jelas dari jalan), jalankan ulang persona yang sama satu kali, lalu tampilkan jumlah agen yang berubah menjadi **Memesan** apa adanya, tanpa ambang noise. Hasilnya menandai rekomendasi sebagai "sudah diuji" dan mengisi matriks disebut x terbukti: sering disebut dan berdampak (penyebab utama), sering disebut tapi tidak berdampak (keluhan saja), jarang disebut tapi berdampak (penyebab tersembunyi).

#### E. Tata Letak Dasbor

Lihat 5.5. Kartu KPI: tahap gesekan terbesar, hipotesis utama (share dan lift), dan porsi kehilangan yang dijelaskan rekomendasi Prioritas. Dasbor menekankan perbandingan peringkat rekomendasi dan lokasi titik gesekan fisik, bukan angka konversi absolut.

#### F. Interaksi Silang (bus peristiwa Zustand, tanpa reload)

- Klik pin atau area panas: sorot segmen transkrip, tahap corong, dan rekomendasi terkait; tampilkan 3 sampai 5 monolog agen yang berhenti di titik itu; tombol Lihat bukti membuka frame.
- Klik tahap corong: kamera berpindah mulus (lerp) ke lokasi drop-off terbesar tahap itu.
- Klik rekomendasi: kamera bergerak ke lokasi fisiknya di Visual Twin.
- Klik poin utama: sorot lokasi dan contoh monolog agen.

#### G. Rencana Pengukuran

Tombol Buat Rencana Pengukuran menghasilkan lembar tally yang bisa dicetak. Titik berdiri pemilik ditentukan dari koordinat kamera di segmen dengan friksi terbesar, mengacu pada isian jam paling ramai di Bagian 4 F1 (misal berdiri di bawah tangga selama 30 menit saat jam makan siang). Metrik yang dihitung: jumlah orang yang menoleh (Melihat), lalu yang mendekat (Berhenti), lalu yang membatalkan niat sebelum masuk atau memesan.

#### H. Catatan Kepercayaan (selalu terlihat)

- Kalimat tetap: *Ini hasil simulasi, bukan jumlah pelanggan nyata.*
- Kalimat tetap di Visual Twin: *Tampilan 3D adalah perkiraan dari video, bukan ukuran sebenarnya.*
- Kalimat tetap untuk peringkat hipotesis: *Alasan di bawah adalah alasan yang diakui calon pelanggan simulasi dari satu kali simulasi. Uji dengan tally sebelum mengambil keputusan besar.*
- Daftar segmen tidak pasti, label kualitas 3D, dan penanda bahwa sebaran persona adalah asumsi tim dari data input F1.

**Kriteria penerimaan:**
- Setiap angka di teks dasbor diperiksa programatik terhadap keluaran agregasi sebelum ditampilkan; yang tidak cocok dibuat ulang atau dibuang.
- Peta panas dan corong dihitung dari data titik berhenti yang sama, sehingga selalu konsisten.
- Peringkat hipotesis, share, dan lift dapat dihitung ulang dari atribusi yang tersimpan dan selalu menghasilkan angka yang sama.
- Rekomendasi hanya muncul untuk hipotesis dengan lift di atas 1, dan setiap rekomendasi menampilkan minimal satu kutipan agen sebagai bukti.

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
- **Zona:** jalur dibagi menurut checkpoint pilihan VLM (jalan depan, pintu atau tangga, area menu) dan berakhir di titik kasir yang dikonfirmasi pemilik (4.3); nama bisa diubah pemilik.
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

- **Isi:** katalog hipotesis (F6-C, dipakai juga oleh pesan 2 agen dan rekomendasi), katalog tindakan (cara menjalankan, perkiraan biaya kasar), panduan praktik UMKM makanan, riwayat analisis toko yang sama.
- **Penggunaan:** kartu cara menjalankan untuk rekomendasi yang sudah lolos peringkat (F6-C), dan Panel Tanya Sekilas.
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
| **Biaya (PERKIRAAN)** | *Perkiraan biaya berdasarkan asumsi token, bukan hasil ukur pasti:*<br>- **Tarif GPT-6 Luna:** \$0,10 input / \$0,50 output per juta token (cache read \$0,01 per juta token; Batch API \$0,05 input / \$0,25 output).<br>- **Tarif Gemini 3.8 Flash:** \$0,75 input / \$3,75 output per juta token (harga perkenalan s.d. 31 Des 2026, setelahnya \$1,50 / \$7,50).<br>- **Biaya agen per analisis (1 run dasar, pesan 1 + pesan 2):** per batch 10 agen, pesan 1 sekitar \$0,003 (input ±8 ribu token, sebagian dari cache; output ±5 ribu token) dan pesan 2 sekitar \$0,001 (konteks dari cache, output ±1,5 ribu token).<br>- **Analisis penuh 500 agen:** 50 batch x 2 pesan = 100 panggilan, sekitar \$0,2 (±Rp3.600).<br>- **Demo 20 agen:** 2 batch x 2 pesan = 4 panggilan ditambah ringkasan, sekitar \$0,01 sampai \$0,015 (±Rp200 sampai Rp300).<br>- **Penyusunan rekomendasi (F6-D langkah 3):** 1 panggilan LLM teks per analisis, sekitar \$0,002 (±Rp40).<br>- **Ablasi opsional:** per hipotesis yang diuji bertambah satu run pesan 1, sekitar \$0,15 (500 agen) atau \$0,006 (20 agen).<br>- **Di luar biaya agen:** VLM Gemini dan Visual Twin (GPU atau mode lokal gratis) dihitung terpisah; perkiraan sebelumnya untuk komponen ini tidak berubah.<br>- **Kurs acuan:** Rp18.096 per US\$ (JISDOR, 10 November 2026).<br>- **Optimasi biaya:** Sebagian besar biaya ada pada token output agen. Langkah penghematan: batasi `max_output_tokens`, turunkan kedalaman mode `thinking`, gunakan prompt caching untuk sistem pesan/transkrip, hanya tulis hipotesis bernilai di atas 0 di pesan 2, serta alihkan run ablasi opsional ke Batch API (diskon 50%). |
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
| **Hasil tidak reproduktif** antar-run, dan noise tidak diukur karena hanya 1 run | Persona tetap dari model diskret, seed tetap, suhu rendah, versi model dikunci; kalimat tetap di catatan kepercayaan; demo menampilkan jumlah agen, bukan persen presisi; tally manual sebagai pembuktian |
| **Agen menjadi auditor** dan keputusannya bias karena melihat daftar masalah | Katalog baru diberikan di pesan 2 setelah keputusan terkunci; keputusan pesan 1 tidak boleh berubah |
| **Rasionalisasi setelah keputusan dan atribusi karangan** | Kutipan wajib dan diverifikasi kode; katalog disaring menurut sudut pandang yang dilewati; skala ordinal 0 sampai 3; urutan katalog diacak; lift membandingkan dengan agen yang memesan |
| **Hasil terlihat lebih pasti dari sebenarnya** | Catatan kepercayaan selalu tampil, intensitas relatif, tanpa angka tunggal di KPI, dasbor menekankan peringkat dan titik gesekan fisik |
| **Urutan atau panjang transkrip mempengaruhi keputusan** | Uji sensitivitas terhadap panjang deskripsi; segmen dibuat setara tingkat detailnya |

### B. Kualitas transkrip VLM

| Risiko | Mitigasi |
| --- | --- |
| **Satu sumber kesalahan untuk semua agen**: salah baca terduplikasi dan tampak seperti temuan | Frame bukti wajib, opsi tidak terlihat jelas, verifikasi pemilik |
| **Agen hanya tahu yang ditulis VLM**, papan kecil yang terlewat dianggap tidak ada | Kolom `not_visible` wajib diisi; pemilik bisa menambah segmen |
| **Sudut pandang tidak sama dengan pelanggan** | Rekam dari sisi jalan; segmen dipecah menurut sudut pandang agar agen bisa berhenti lebih awal |
| **Transkrip panjang sulit diverifikasi** | Tampilan berpasangan dengan frame; hanya segmen tidak pasti yang wajib |
| **Konteks non-visual hilang** (harga, jam buka) | Form konteks usaha F1 disuntikkan ke agen (sesuai aturan `diketahui_agen`) |

### C. Biaya dan teknis LLM

| Risiko | Mitigasi |
| --- | --- |
| Biaya membengkak lewat ablasi | Ablasi tidak masuk alur standar dan hanya dijalankan atas permintaan; prompt caching, batasi `max_output_tokens`, turunkan thinking, gunakan Batch API, turunkan agen ke 20 saat demo |
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
| Pemilik menganggap simulasi sebagai ramalan omzet | Kalimat tetap, jumlah agen bukan persen presisi, tally sebagai langkah berikutnya |
| Pemilik malas verifikasi | Hanya segmen tidak pasti yang wajib |
| Video terlalu panjang atau berhenti sembarang | Isian titik kasir dan batas durasi otomatis |
| Video terkompres (WhatsApp, media sosial) | Cek resolusi sisi terpendek, sarankan file asli dari galeri |
| Rekomendasi generik atau biaya karangan | Rekomendasi hanya dari hipotesis yang lolos peringkat dan disertai kutipan agen; RAG hanya mengisi cara menjalankan dengan sumber; filter batasan "tidak bisa diubah" dari F1 |
| 3 sampai 5 video kalibrasi tidak cukup untuk klaim statistik | Klaim dibatasi pada hipotesis titik gesekan dan perbandingan peringkat |
| Waktu hackathon tidak cukup | Ikuti prioritas 5.6 |

**Tiga risiko paling menentukan:** (1) batch 10 agen merusak independensi persona, (2) atribusi pesan 2 tidak mencerminkan alasan di monolog pesan 1, (3) satu sumber kesalahan transkrip untuk semua agen. Ketiganya diuji lebih awal di M5.

---

## 9. Ruang Lingkup Demo

- 1 jenis usaha: tempat makan.
- **Jumlah agen demo:** 20 agen (2 panggilan batch @ 10 persona per run).
  - *Konsekuensi statistik:* granularitas kasar (1 agen = 5% corong), satu agen bisa menggeser peringkat hipotesis, serta stratifikasi segmen tipis. Noise antar-run tidak diukur (1 run).
  - *Opsi penanganan (usulan):* simulasi demo dijalankan lebih dulu pada 500 agen lalu disimpan (*pre-computed*), atau demo memakai 50 sampai 100 agen.
- Corong konversi 4 tahap: Melihat -> Berhenti -> Masuk -> Memesan.
- Tanpa skenario lingkungan (hujan, jam ramai ditiadakan).
- Katalog hipotesis H1 sampai H10 ditambah H0; 1 run dasar; ablasi opsional atas permintaan (disaring dengan batasan "tidak bisa diubah" dari F1).
- Kalibrasi pada 3 sampai 5 video dengan tally manual.
- Visual Twin: satu jalur per video, awan titik sebagai standar, Gaussian Splatting opsional.
- RAG: opsional; jika dikerjakan, katalog hipotesis dan tindakan plus 10 sampai 20 dokumen panduan.

---

## 10. Metrik Keberhasilan

| Metrik | Target demo |
| --- | --- |
| Alur dari video sampai dasbor selesai | di bawah 15 menit total (demo 20 agen <8 menit) |
| Segmen transkrip yang perlu dikoreksi pemilik | di bawah 30% |
| Angka di dasbor yang lolos verifier | 100% (yang gagal tidak ditampilkan) |
| Atribusi pesan 2 dengan kutipan yang benar-benar ada di monolog | minimal 95% sebelum penyaringan kode |
| Kecocokan hipotesis utama (`primary`) dengan penilaian manual tim pada 50 sampai 100 monolog | minimal 80% |
| Rekomendasi Prioritas yang disertai kutipan agen dan lift di atas 1 | 100% |
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

- [ ] **M1: Ingesti.** Form konteks F1 satu kolom (Informasi dasar, Pelanggan & tujuan, Menu & harga lewat unggah Excel atau foto, Jam operasional), rekam atau unggah video dengan isian stempel waktu kasir, indikator gerak, blur wajah dan plat di browser, pembuangan frame buram.
- [ ] **M2: Transkrip VLM.** Gemini 3.8 Flash menghasilkan `TranscriptSegment[]` tak terstruktur dengan frame bukti dan kolom `not_visible` (prompt VLM hanya menerima satu kalimat jenis usaha, tanpa data form lain).
- [ ] **M3: Verifikasi.** Sinkron video dan segmen, edit langsung, konfirmasi segmen tidak pasti. Edit via LLM menyusul jika ada waktu.
- [ ] **M4a: Model persona.** Pembuatan tabel segmen diskret, penulisan tangan matriks $W$, implementasi penyesuaian marginal IPF, generator `PersonaSpec` berbasis seed tetap, pengujian stratifikasi dari input F1.
- [ ] **M4b: Mesin agen.** Template prompt slot-fill dari `PersonaSpec`, batching GPT-6 Luna dengan prompt caching, validasi skema keluaran 4 tahap (tanpa `will_return`), penyimpanan monolog dan keputusan agen di Postgres.
- [ ] **M5: Spike validitas.**
  - Bandingkan 1 vs 5 vs 10 agen per panggilan; uji sensitivitas terhadap panjang transkrip. Putuskan ukuran batch final.
  - **Uji pesan 2:** bandingkan distribusi keputusan dengan dan tanpa pesan 2 (harus sama, karena keputusan sudah terkunci); nilai 50 sampai 100 monolog secara manual oleh tim dan ukur kecocokannya dengan `primary`; ukur porsi kutipan yang lolos verifikasi.
  - **(a) Uji manipulasi sifat:** pada transkrip yang sama, ubah satu sifat persona secara sistematis (misal anggaran dinaikkan drastis atau kemalasan fisik diubah); keputusan agen harus bergeser ke arah yang diharapkan. Jika tidak bergeser, persona tidak bekerja efektif di prompt.
  - **(b) Uji sensitivitas terhadap $W$ (sekali saat pengembangan, bukan per analisis):** jalankan simulasi pada 2 sampai 3 matriks $W$ alternatif (bawaan, digeser moderat, dan ekstrem) dan catat apakah peringkat hipotesis teratas bergeser. Hasilnya dipakai untuk menyetel $W$ dan menulis catatan kepercayaan.
- [ ] **M6: Agregasi.** Corong 4 tahap, bobot friksi per segmen, pesan 2 atribusi dengan katalog tersaring dan verifikasi kutipan, share, lift, gesekan yang ditoleransi, verifier angka, penggabung stempel waktu ke pose kamera.
- [ ] **M7: Spike Visual Twin.** Baseline nerfstudio pada 1 video kalibrasi di GPU; petakan keluaran tiap tahap, catat waktu dan kebutuhan GPU. *Status: mode lokal (11.2) sudah jalan dan teruji pada 4 video; spike GPU belum.*
- [ ] **M8: Visual Twin dasar.** Masking SAM 2, pose ke `transforms.json`, awan titik, jalur, zona, penyelarasan, gerbang kualitas, dibungkus sebagai pekerjaan antrean. *Status: pemilihan model terbesar, arah atas, lantai, dan gerbang kualitas sudah ada di mode lokal; SAM 2 dan antrean belum.*
- [ ] **M9: Dasbor dan integrasi.** Tata letak, KPI, tiga poin, corong 4 tahap, lapisan Kejadian dan Gesekan, interaksi silang lewat Zustand, tampilan cadangan, halaman Riwayat. *Status: placeholder dasbor dengan viewer 3D dan halaman Riwayat sudah ada.*
- [ ] **M10: Rekomendasi dan Pareto.** Kurasi katalog tindakan (2 sampai 4 tindakan per hipotesis), panggilan LLM penyesuaian dengan validasi `action_id` dan `segment_ids`, Pareto dari share, filter batasan "tidak bisa diubah", tanda Prioritas. Ablasi opsional (penulisan ulang segmen dengan templat, run berpasangan, matriks disebut x terbukti) bila ada waktu.
- [ ] **M11: Rencana pengukuran.** Lembar tally cetak dengan titik berdiri dari Visual Twin, jadwal observasi dari jam ramai F1, catatan kepercayaan.
- [ ] **M12: Kalibrasi.** 3 sampai 5 video dengan tally manual, uji arah efek, uji ketepatan pin.
- [ ] **M13 (opsional):** Gaussian Splatting di produksi, lapisan Agen beranimasi, Jelajah Agen dengan jalur agen, peta mini di halaman 5, edit via LLM, RAG dan Panel Tanya Sekilas.

---

## 13. Pertanyaan Terbuka

1. **Parameter video** (durasi, resolusi, jumlah frame, ambang rotasi): nilai di F2 sudah diperbarui dari uji lokal; kunci setelah M7.
2. **Ukuran batch final** (10 agen per panggilan atau lebih kecil): ditentukan oleh hasil M5.
3. **Isi katalog hipotesis:** apakah H1 sampai H10 (F6-C) sudah mewakili masalah tempat makan, dan siapa yang mengkurasi definisi serta contoh kalimatnya? Kapan butir H0 yang sering muncul dinaikkan menjadi hipotesis baru?
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
