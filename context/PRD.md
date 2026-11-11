# PRD: Sekilas, Simulator Pengunjung untuk UMKM Makanan

**Versi:** 0.2 (draft hackathon)
**Tanggal:** 11 November 2026
**Status:** Acuan pembangunan
**Perubahan dari 0.1:** tambah Visual Twin (video menjadi peta 3D) yang dibangun dengan pendekatan reverse engineering (REA) dari repo open source, tambah basis pengetahuan RAG sebagai pendamping, dan Laporan berubah bentuk menjadi Dasbor Analitik dengan Visual Twin. Alur pengguna dan urutan halaman tidak berubah.

---

## 1. Ringkasan

Pemilik usaha makan kecil hanya melihat pelanggan yang berhasil masuk, bukan yang ragu lalu pergi. Sekilas membantu mereka melihat **di titik mana** dan **karena isyarat apa** calon pelanggan ragu, lalu menyarankan perubahan yang paling berdampak dengan usaha paling kecil.

Cara kerjanya: pemilik merekam satu video dari pintu masuk. Sistem mengubah video itu menjadi dua hal sekaligus:

1. **Transkrip kejadian** yang bisa dikoreksi pemilik.
2. **Visual Twin**, yaitu model 3D sederhana dari jalur yang direkam (jalan, pintu, tangga, papan, kasir), tempat setiap kejadian ditandai di posisinya.

Setelah itu 500 agen sintetis "mengunjungi" tempat itu. Hasilnya tampil sebagai **dasbor analitik**: Visual Twin di tengah dengan peta titik gesekan, dikelilingi funnel, rekomendasi bergaya Pareto 80/20, dan catatan kepercayaan. Basis pengetahuan (RAG) membantu menjelaskan cara menjalankan rekomendasi dan menjawab pertanyaan pemilik, dengan sumber yang bisa dilacak.

**Klaim yang dibuat:** menemukan titik gesekan sebagai hipotesis, dan menunjukkan letaknya secara visual.
**Klaim yang tidak dibuat:** memprediksi jumlah pelanggan nyata, atau membuat model 3D yang akurat secara ukuran.

---



## 2. Masalah

- Pemilik tidak melihat keputusan "tidak jadi masuk", sehingga tidak bisa membedakan masalah visibilitas, harga, atau kebiasaan pelanggan.
- Yang dilakukan sekarang: menebak, ganti papan atau harga tanpa pengukuran, atau menyalahkan lokasi.
- Mengumpulkan data corong kunjungan secara manual terlalu berat untuk usaha yang sibuk.
- Laporan berbentuk teks dan grafik saja sulit dihubungkan ke tempat fisiknya. Pemilik perlu melihat **di mana persisnya** masalah itu ada di tokonya.



## 3. Target Pengguna

**Utama:** pemilik atau pengelola tempat makan kecil (warung, kedai, kafe, resto ruko) yang pelanggannya datang langsung.

**Karakter:** tidak teknis, memakai ponsel, waktunya sedikit, butuh bahasa sehari-hari.

## 4. Tujuan dan Non-Tujuan



### Tujuan

1. Pemilik cukup merekam satu video dan mengisi konteks singkat.
2. Hasil transkrip video bisa diperiksa dan diperbaiki pemilik sebelum simulasi.
3. Laporan menunjuk titik gesekan terbesar dengan bukti yang bisa dilacak ke frame video **dan ke lokasinya di Visual Twin**.
4. Rekomendasi diurutkan menurut dampak besar dan usaha kecil (prinsip Pareto 20/80).
5. Setiap angka di laporan bisa diaudit dan direproduksi.
6. Hasil disajikan sebagai dasbor yang bisa dijelajahi: klik titik di model 3D, lihat kejadian, agen, dan rekomendasi yang terkait.



### Non-tujuan (versi demo)

- Bukan prediksi jumlah pelanggan atau omzet.
- Hanya satu jenis usaha: tempat makan.
- Tidak membuat video "sebelum dan sesudah".
- Tidak mendukung banyak lokasi atau akun tim.
- Tidak menyimpan video mentah setelah pemrosesan selesai (lihat bagian Privasi).
- Visual Twin hanya di tingkat **visual twin** (tampilan realistis). Bukan **geometric twin** (mesh bersih, skala metrik, bisa diukur) dan bukan **semantic twin** (BIM/IFC). Tidak dipakai untuk ukuran atau renovasi; skalanya perkiraan.
- Tidak memakai LiDAR. Kedalaman hanya diperkirakan dari video.
- Tidak membuat model 3D seluruh bangunan, hanya jalur yang direkam.
- Tidak menampilkan "sesudah perbaikan" di dalam model 3D (misal papan baru yang digambar ulang).

---



## 5. Alur Pengguna dan Halaman



### 5.1 Alur Ringkas

Alur sama dengan versi 0.1. Visual Twin dibangun di dalam langkah yang sudah ada, tanpa langkah baru bagi pemilik.

```
Input konteks + video  ->  Cek kualitas & privasi  ->  Transkrip kejadian (+ Visual Twin, paralel)
   ->  Verifikasi & edit transkrip oleh pemilik  ->  Simulasi 500 agen
   ->  Dasbor Analitik dengan Visual Twin  ->  Rencana pengukuran
```



### 5.2 Peta Halaman

Aplikasi berbentuk **wizard satu arah** (Beranda sampai Dasbor), lalu dua halaman lanjutan yang dibuka dari Dasbor.

```
[1 Beranda]
    |
[2 Konteks Usaha]
    |
[3 Rekam Video]  -- video ditolak --> (rekam ulang, kembali ke 3)
    |
[4 Memproses Transkrip & Visual Twin]
    |
[5 Verifikasi Transkrip]  <-->  (Modal Bukti Frame)
    |
[6 Menjalankan Simulasi]
    |
[7 Dasbor Analitik]  <-->  (Modal Bukti Frame)  <-->  (Panel Tanya Sekilas)
    |-----> [8 Jelajah Agen]
    |-----> [9 Rencana Pengukuran]
```

Navigasi: pemilik boleh kembali ke langkah sebelumnya dari penanda langkah di bagian atas layar. Mengubah transkrip (halaman 5) setelah dasbor jadi akan menandai dasbor lama "kedaluwarsa" dan menawarkan simulasi ulang. Visual Twin tidak perlu dibangun ulang kecuali video diganti.

### 5.3 Daftar Halaman


| #   | Halaman                           | Tujuan                                                 | Terkait    |
| --- | --------------------------------- | ------------------------------------------------------ | ---------- |
| 1   | Beranda                           | Menjelaskan produk dan memulai analisis                | -          |
| 2   | Konteks Usaha                     | Mengumpulkan data yang tidak terlihat dari video       | F1         |
| 3   | Rekam Video                       | Merekam atau mengunggah video berpanduan               | F2         |
| 4   | Memproses Transkrip & Visual Twin | Menunggu video diubah menjadi transkrip dan model 3D   | F3, F7     |
| 5   | Verifikasi Transkrip              | Memeriksa dan memperbaiki transkrip                    | F4, F7     |
| 6   | Menjalankan Simulasi              | Menunggu 500 agen selesai                              | F5         |
| 7   | Dasbor Analitik                   | Menampilkan temuan, Visual Twin, dan rekomendasi       | F6, F7, F8 |
| 8   | Jelajah Agen                      | Membaca narasi, keputusan, alasan, dan jalur tiap agen | F5, F6, F7 |
| 9   | Rencana Pengukuran                | Memberi rencana pembuktian lewat tally manual          | F6         |




### 5.4 Detail per Halaman



#### Halaman 1: Beranda

- **Isi:** satu kalimat nilai ("Tahu di mana pelanggan ragu, dari satu video"), tombol **Mulai Analisis**, daftar analisis sebelumnya (opsional untuk demo).
- **Aksi:** Mulai Analisis menuju halaman 2.



#### Halaman 2: Konteks Usaha

- **Isi:** form lima isian utama (jenis usaha, lokasi dan deskripsi letak, menu dan harga, jam buka, jam ramai) plus tetangga (opsional).
- **Menu:** input manual atau unggah foto menu. Hasil baca otomatis tampil sebagai tabel yang bisa dikoreksi.
- **Aksi:** **Lanjut** (aktif jika isian wajib terisi) menuju halaman 3.
- **Status kosong/galat:** foto menu tidak terbaca memunculkan pesan dan beralih ke input manual.



#### Halaman 3: Rekam Video

- **Isi:** tampilan kamera, pengatur waktu, daftar checkpoint (terlihat dari jalan, pintu atau tangga, penanda, menu dan harga, titik pesan), panduan satu kalimat, tombol **Selesai**, opsi **Unggah video**.
- **Panduan gerak (untuk Visual Twin):** indikator kecil "terlalu cepat" muncul jika pemilik memutar kamera terlalu cepat, dan "jangan hanya berputar, sambil berjalan" jika kamera berputar di tempat. Pemilik tidak perlu tahu soal 3D; cukup rekam pelan sambil berjalan.
- **Setelah rekam:** hasil cek kualitas dan pratinjau wajah yang sudah diburamkan.
- **Aksi:** **Pakai video ini** menuju halaman 4, atau **Rekam ulang**.
- **Status galat:** video terlalu gelap, goyang, atau di bawah 20 detik ditolak dengan pesan jelas ("Video terlalu gelap, coba ulangi").
- **Aturan:** otomatis berhenti di 3 menit; tombol Selesai aktif setelah checkpoint minimal terpenuhi.



#### Halaman 4: Memproses Transkrip & Visual Twin

- **Isi:** progress bar dengan status bertahap ("Mengunggah", "Membaca video", "Menyusun kejadian", "Membangun tampilan 3D").
- **Aturan:** transkrip dan Visual Twin diproses paralel. Halaman 5 terbuka begitu **transkrip** siap; Visual Twin boleh menyusul di latar belakang.
- **Aksi:** otomatis menuju halaman 5 saat transkrip selesai.
- **Status galat:** jika transkrip gagal, tampil tombol **Coba lagi** tanpa kehilangan video. Jika Visual Twin gagal, alur tetap lanjut dan dasbor memakai tampilan cadangan (lihat F7).



#### Halaman 5: Verifikasi Transkrip

- **Isi:** pemutar video dengan garis waktu kejadian; daftar entri (stempel waktu, snapshot frame, deskripsi, kategori isyarat, tingkat keyakinan); antrean isyarat tidak pasti.
- **Peta mini (jika Visual Twin sudah siap):** tampilan 3D kecil dengan pin tiap kejadian. Klik pin memilih entri yang sama. Peta mini bersifat bantuan, tidak wajib dipakai.
- **Aksi per entri:** **Benar**, **Ubah** (edit langsung), **Hapus**, **Tambah kejadian**.
- **Edit via LLM:** kotak instruksi singkat, hasil tampil sebagai sebelum/sesudah dengan tombol **Terima** atau **Tolak**.
- **Interaksi:** klik entri melompat ke posisi video dan menyorot pin di peta mini; klik snapshot membuka Modal Bukti Frame.
- **Aturan:** tombol **Jalankan Simulasi** nonaktif sampai semua entri tidak pasti dikonfirmasi atau dihapus.
- **Aksi utama:** Jalankan Simulasi menuju halaman 6.



#### Halaman 6: Menjalankan Simulasi

- **Isi:** progress agen ("320 dari 500 agen selesai"), tahap (menghitung keputusan, menulis narasi, menyusun dasbor).
- **Aksi:** otomatis menuju halaman 7.
- **Status galat:** jika narasi gagal, keputusan tetap tersimpan dan dasbor tetap bisa dibuat dengan penanda "narasi sebagian".



#### Halaman 7: Dasbor Analitik

Halaman Laporan versi 0.1 diubah menjadi dasbor. Isinya tetap sama (tiga poin, funnel, rekomendasi Pareto, peluang dan ancaman, catatan kepercayaan, aksi akhir), tetapi disusun di sekitar Visual Twin.

**Tata letak desktop / tablet:**

```
+----------------------------------------------------------------------+
| Banner catatan kepercayaan  |  status: terbaru / kedaluwarsa          |
+----------------------------------------------------------------------+
| [KPI] Tahap gesekan terbesar | Faktor utama | Peluang naik (rentang)  |
+--------------------------------------------+-------------------------+
|                                            | Tiga poin utama         |
|        VISUAL TWIN (3D)                    |-------------------------|
|  - jalur kunjungan                         | Funnel bertahap         |
|  - pin kejadian per isyarat                | (tahap gesekan disorot) |
|  - peta panas titik ragu / berhenti        |-------------------------|
|  - lapisan: Kejadian | Gesekan | Agen      | Rekomendasi Pareto      |
|  - slider skenario (normal, hujan, ...)    | (Prioritas / Nanti)     |
|                                            |                         |
+--------------------------------------------+-------------------------+
| Matriks dampak vs usaha | Peluang & Ancaman | Isyarat tidak pasti      |
+----------------------------------------------------------------------+
| [Buat Rencana Pengukuran]  [Lihat narasi agen]  [Tanya Sekilas]       |
+----------------------------------------------------------------------+
```

**Tata letak ponsel (tumpuk):** banner → KPI (geser horizontal) → Visual Twin (tinggi ±50% layar, bisa layar penuh) → tiga poin → funnel → rekomendasi → peluang dan ancaman → catatan kepercayaan → aksi akhir.

**Komponen dasbor:**

1. **Kartu KPI:** tahap funnel dengan gesekan terbesar, faktor utama, dan rentang kenaikan peluang jika rekomendasi Prioritas dijalankan. Semua angka berupa rentang.
2. **Visual Twin (pusat dasbor):** lihat F7. Lapisan yang bisa dinyalakan/dimatikan:
  - **Kejadian:** pin tiap entri transkrip, warna menurut kategori isyarat.
  - **Gesekan:** peta panas di sepanjang jalur, makin merah makin banyak agen yang berhenti atau berbalik di titik itu.
  - **Agen:** animasi titik-titik agen bergerak sepanjang jalur dan berhenti sesuai keputusan masing-masing (sampel, bukan 500 sekaligus di ponsel).
  - **Rekomendasi:** penanda di lokasi tempat rekomendasi berlaku (misal "papan jam buka di sini").
3. **Pemilih skenario:** mengganti skenario lingkungan (normal, jam ramai, hujan, tetangga penuh, dst.). Peta panas, funnel, dan KPI ikut berubah.
4. **Tiga poin utama**, **Funnel**, **Rekomendasi Pareto**, **Peluang dan Ancaman**, **Catatan kepercayaan**: isi sama seperti F6.
5. **Panel Tanya Sekilas (RAG):** lihat F8.

**Interaksi silang (semua komponen saling terhubung):**

- Klik pin atau area panas di Visual Twin → sorot entri transkrip, tahap funnel, dan rekomendasi terkait; tombol **Lihat bukti** membuka Modal Bukti Frame.
- Klik tahap funnel → kamera Visual Twin terbang ke lokasi gesekan tahap itu.
- Klik rekomendasi → kamera terbang ke lokasinya, tampil kartu cara menjalankan (dari RAG, dengan sumber).
- Klik poin utama → sorot lokasi dan contoh agen terkait.

**Status:**

- Dasbor berlabel "kedaluwarsa" jika transkrip diubah setelahnya.
- Jika Visual Twin tidak tersedia, area tengah memakai **tampilan cadangan** (denah jalur 2D atau pita frame), interaksi silang tetap jalan.



#### Halaman 8: Jelajah Agen

- **Isi:** daftar 500 agen, setiap kartu menampilkan sifat singkat, narasi rencana, keputusan, dan alasan.
- **Jalur agen:** pilih satu agen untuk memutar perjalanannya di Visual Twin (di mana ia berhenti, melihat apa, lalu memutuskan apa).
- **Filter:** keputusan (lewat, naik, memesan, kembali), skenario, tahap funnel, faktor utama.
- **Aksi:** klik alasan membuka Modal Bukti Frame dari entri transkrip terkait.
- **Catatan:** bisa dibuat sebagai panel samping dari Dasbor untuk menghemat waktu bangun.



#### Halaman 9: Rencana Pengukuran

- **Isi:** apa yang dihitung (misal jumlah orang lewat vs masuk per jam), berapa lama, data minimum, langkah singkat dan lembar tally.
- **Tambahan:** gambar tangkapan Visual Twin dengan tanda "berdiri di sini saat menghitung".
- **Aksi:** **Unduh / Cetak**.



#### Komponen Bersama

- **Modal Bukti Frame:** snapshot diperbesar, stempel waktu, tombol **Lompat ke video**, dan tombol **Lihat di 3D** (jika Visual Twin tersedia). Dipakai di halaman 5, 7, dan 8.
- **Penampil Visual Twin:** satu komponen yang sama untuk peta mini (halaman 5), pusat dasbor (halaman 7), dan pemutar jalur agen (halaman 8).
- **Penanda langkah:** indikator posisi wizard di bagian atas halaman 2 sampai 7.
- **Banner catatan kepercayaan:** tampil di halaman 7 dan 9.



### 5.5 Prioritas Jika Waktu Mepet


| Prioritas           | Halaman / Fitur                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wajib**           | 2 Konteks, 3 Rekam Video, 5 Verifikasi, 7 Dasbor (KPI, funnel, rekomendasi, Visual Twin dengan lapisan Kejadian dan Gesekan)                                   |
| **Versi sederhana** | 1 Beranda (satu tombol), 4 dan 6 (layar tunggu dengan progress), Visual Twin berupa awan titik (point cloud) + jalur kamera tanpa Gaussian Splatting           |
| **Boleh ditunda**   | 8 Jelajah Agen (jadi panel dari Dasbor), 9 Rencana Pengukuran (jadi bagian akhir Dasbor), lapisan Agen beranimasi, peta mini di halaman 5, Panel Tanya Sekilas |


---



## 6. Kebutuhan Fungsional



### F1. Input: Konteks Usaha (website)

Website meminta konteks yang tidak bisa dilihat dari video. Dibatasi agar cepat diisi.


| Isian                                                                             | Tipe            | Wajib |
| --------------------------------------------------------------------------------- | --------------- | ----- |
| Jenis usaha                                                                       | pilihan         | ya    |
| Lokasi (alamat atau pin peta) dan deskripsi singkat letak (misal "lantai 2 ruko") | teks + peta     | ya    |
| Menu dan harga (input manual daftar menu, atau unggah foto menu)                  | daftar / gambar | ya    |
| Jam buka                                                                          | rentang jam     | ya    |
| Jam ramai                                                                         | rentang jam     | ya    |
| Tetangga / pesaing terdekat (misal "ada resto ramai di lantai 1")                 | teks            | tidak |


**Kriteria penerimaan:**

- Form bisa diselesaikan di bawah 3 menit.
- Foto menu dibaca otomatis menjadi daftar menu dan harga, lalu ditampilkan agar pemilik bisa mengoreksi.
- Data konteks ini ikut menjadi masukan agen (sebagai informasi yang agen "ketahui" atau "tidak ketahui" tergantung apakah terlihat dari jalan).



### F2. Input: Video

Pemilik merekam satu video **dari pintu masuk dan area sekitarnya**. Tantangan utama: pemilik tidak tahu kapan berhenti merekam.

**Solusi: rekaman berpanduan dengan titik periksa (checkpoint).**

Aturan perekaman:

- **Mulai:** dari sisi jalan, tempat calon pelanggan pertama kali melihat usaha, atau dari pintu masuk jika tidak ada area depan.
- **Berhenti:** saat sampai di titik pesan (kasir atau meja), **atau** setelah durasi maksimum tercapai.
- Durasi ideal 1 sampai 2 menit, maksimum 3 menit (otomatis berhenti dan menawarkan simpan).

Panduan di layar saat merekam:

- Pengatur waktu terlihat.
- Daftar checkpoint yang dicentang otomatis atau manual oleh pemilik: **Terlihat dari jalan, Pintu atau tangga, Penanda atau papan, Menu dan harga, Titik pesan atau meja**.
- Tombol **Selesai** menyala setelah checkpoint minimal terpenuhi (minimal: "Menu dan harga" atau "Titik pesan").
- Satu kalimat panduan: "Rekam seperti pelanggan baru yang mencari tempat makan, pelan dan tegak, sambil berjalan."
- Indikator dari sensor gerak ponsel (giroskop/akselerometer): "terlalu cepat" saat kamera diputar cepat, dan "sambil berjalan" saat kamera hanya berputar di tempat. Rekonstruksi 3D butuh perpindahan posisi (paralaks) dan gambar yang tidak buram.
- Rekam dengan lensa utama (bukan ultra-wide), karena lensa lebar tanpa parameter kamera yang benar membuat pose kamera melenceng.

Opsi unggah: pemilik juga bisa mengunggah video yang sudah ada.

Metadata tambahan yang disimpan (jika tersedia di browser): orientasi dan data sensor gerak per detik, untuk membantu rekonstruksi 3D.

**Kriteria penerimaan:**

- Video yang terlalu gelap, terlalu goyang, atau terlalu pendek (< 20 detik) ditolak dengan pesan yang jelas dan saran rekam ulang.
- Wajah dan plat nomor diburamkan di browser sebelum unggah, dengan pratinjau hasil blur.



### F3. Proses: Video menjadi Transkrip Kejadian

Model bahasa-visi mengubah video menjadi **transkrip teks berbasis kejadian (event)**. Bukan narasi bebas, tetapi daftar kejadian berstempel waktu.

Setiap entri transkrip berisi:

- **Stempel waktu** (mm:ss)
- **Snapshot frame** yang menjadi bukti
- **Deskripsi kejadian** (misal "Papan 'BUKA' terlihat di dasar tangga, tulisan kecil")
- **Kategori isyarat** (jam buka terlihat, penanda, menu/harga terbaca, hambatan fisik, keramaian tetangga, dst.)
- **Tingkat keyakinan** (stabil atau tidak pasti)
- **Posisi 3D** (diisi otomatis dari F7: posisi kamera pada tempel waktu itu, plus titik yang dilihat jika bisa diperkirakan). Kosong jika Visual Twin gagal.

Aturan anti-halusinasi:

- Isyarat **tanpa frame bukti dibuang**.
- Sistem boleh menjawab "tidak terlihat jelas".
- Isyarat berkeyakinan rendah ditandai "tidak pasti" dan masuk antrean konfirmasi pemilik.

**Kriteria penerimaan:**

- Setiap entri menampilkan snapshot frame yang bisa diperbesar.
- Klik entri melompat ke posisi yang sama di pemutar video.



### F4. Verifikasi Transkrip oleh Pemilik

Pemilik harus bisa menilai apakah transkrip sudah sesuai video.

**Tampilan:** dua kolom (atau tumpuk di ponsel): pemutar video dengan garis waktu kejadian, dan daftar entri transkrip dengan snapshot. Sorot sinkron antara video dan entri. Peta mini Visual Twin tampil jika sudah siap.

**Aksi per entri:**

- **Benar** (konfirmasi)
- **Salah / Ubah** (masuk mode edit)
- **Hapus**
- **Tambah kejadian** (untuk hal yang terlewat, dengan memilih titik waktu; posisi 3D diambil otomatis dari titik waktu itu)

**Metode edit: dua-duanya disediakan, dengan peran berbeda.**


| Metode                    | Status                     | Cara kerja                                                                                                                                                                                                                   |
| ------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edit langsung**         | **Wajib, selalu tersedia** | Pemilik mengetik ulang isi entri atau mengubah kategori. Ini jalur dasar yang pasti berfungsi tanpa bergantung LLM.                                                                                                          |
| **Minta LLM memperbaiki** | **Tambahan, opsional**     | Pemilik menulis instruksi singkat (misal "ini bukan papan buka, ini papan promo"). LLM mengusulkan perbaikan, ditampilkan sebagai perbandingan **sebelum dan sesudah**, dan baru berlaku setelah pemilik menekan **Terima**. |


Alasan: edit langsung menjamin pemilik selalu memegang kendali; edit via LLM mempercepat bagi yang malas mengetik. LLM tidak pernah mengubah transkrip tanpa persetujuan.

**Kriteria penerimaan:**

- Simulasi tidak bisa dijalankan sebelum semua entri berstatus "tidak pasti" dikonfirmasi atau dihapus.
- Setiap perubahan disimpan dengan penanda "diubah pemilik" dan masuk ke jejak audit.
- Perubahan oleh pemilik selalu dianggap lebih benar daripada keluaran model.
- Entri yang dihapus juga hilang dari Visual Twin; entri yang ditambah muncul sebagai pin baru.



### F5. Simulasi 500 Agen

Transkrip yang sudah diverifikasi, ditambah konteks usaha (F1), menjadi masukan untuk **500 agen sintetis**. Agen memiliki sifat berbeda (sensitivitas harga, kesabaran, kebiasaan makan siang, rombongan atau sendiri, dll.) dan dijalankan pada beberapa skenario lingkungan (misal jam ramai, hujan, tetangga penuh).

Agen "berjalan" mengikuti urutan isyarat di transkrip. Karena tiap isyarat punya posisi 3D, perjalanan agen bisa ditampilkan sebagai jalur di Visual Twin.

**Keluaran per agen (wajib ketiganya):**

1. **Narasi rencana**: cerita singkat apa yang agen lakukan dan lihat saat tiba (urut menurut isyarat di transkrip).
2. **Keputusan**: salah satu dari *berhenti/lewat, naik/masuk, memesan, kembali lagi*.
3. **Alasan keputusan**: faktor yang paling memengaruhi, dirujuk ke entri transkrip.

**Keluaran tambahan untuk dasbor (dihitung, bukan dari LLM):**

- **Titik berhenti**: entri transkrip terakhir yang "dilihat" agen sebelum keputusan akhirnya. Ini sumber peta panas gesekan.
- **Jejak per isyarat**: kontribusi tiap isyarat terhadap keputusan agen.

**Prinsip rancangan: keputusan dihitung, narasi dihasilkan.**

- Keputusan ditentukan oleh **model pilihan diskret** (multinomial logit) yang bisa direproduksi dengan seed tetap.
- LLM menulis narasi dan alasan **berdasarkan keputusan dan kontribusi faktor yang sudah dihitung**, bukan menentukan keputusan itu sendiri.
- Alasan di narasi wajib konsisten dengan kontribusi faktor dari model; yang tidak konsisten dibuat ulang atau dibuang.
- Visual Twin hanya menampilkan hasil; tidak ikut menentukan keputusan agen. (Pengembangan lanjut: fitur geometris seperti jarak pandang papan atau jumlah anak tangga bisa menjadi isyarat tambahan, setelah dikalibrasi.)

**Kriteria penerimaan:**

- 500 agen selesai dalam waktu yang wajar untuk demo (target di bawah 3 menit, narasi diproses paralel atau batch).
- Hasil yang sama untuk seed yang sama.
- Setiap agen punya tiga keluaran di atas yang tersimpan dan bisa dibuka.



### F6. Isi Analitik Dasbor

Dasbor merangkum hasil 500 agen. Bahasa sehari-hari, angka berupa **rentang**, bukan satu angka. Isi di bawah ini sama dengan Laporan versi 0.1; tata letaknya mengikuti Halaman 7.

**A. Tiga poin utama.**
Tiga temuan paling penting yang dirangkum dari 500 narasi agen, ditulis dalam satu kalimat tiap poin, misalnya: "Keraguan terbesar terjadi di dasar tangga karena jam buka tidak terlihat." Setiap poin punya lokasi di Visual Twin.

**B. Funnel (corong).**
Bar bertahap dengan rentang: *Melihat → Tertarik berhenti → Naik/masuk → Memesan → Kembali*. Tahap dengan gesekan terbesar disorot, disertai **faktor utama dan terbesar** yang membuat usaha tersendat di tahap itu.

**C. Rekomendasi tindakan (prioritas Pareto 20/80).**

- Setiap perubahan dihitung dampaknya lewat **ablasi isyarat** (simulasi ulang dengan satu isyarat diperbaiki).
- Setiap rekomendasi dinilai: **dampak** (kenaikan peluang pada tahap gesekan, dalam rentang) dan **usaha** (rendah / sedang / tinggi, termasuk perkiraan biaya kasar).
- Ditampilkan sebagai urutan dengan **batas potong (cut-off)**: hanya rekomendasi yang mencakup sekitar 80% total dampak yang tersedia ditandai **Prioritas**, dengan mengutamakan **dampak besar dan usaha kecil** (kuadran "Kerjakan dulu"). Sisanya masuk "Nanti".
- Matriks dampak vs usaha ditampilkan di dasbor.
- Setiap rekomendasi ditandai lokasinya di Visual Twin.
- Kartu **cara menjalankan** dan perkiraan biaya diambil dari basis pengetahuan (F8), dengan sumber.

**D. Peluang dan ancaman.**
Dua kartu dari skenario ekstrem (misal hujan lebat, tetangga penuh), masing-masing dengan tindakan pencegah. Memilih kartu mengganti skenario di Visual Twin.

**E. Catatan kepercayaan (selalu terlihat).**

- Isyarat yang tidak pasti.
- Kalimat tetap: "Ini hasil simulasi, bukan jumlah pelanggan nyata."
- Kalimat tetap di Visual Twin: "Tampilan 3D adalah perkiraan dari video, bukan ukuran sebenarnya."

**F. Rencana pengukuran.**
Tombol **Buat Rencana Pengukuran** menghasilkan: apa yang dihitung (misal jumlah orang lewat vs masuk di jam tertentu), berapa lama, dan data minimum, supaya pemilik bisa membuktikan temuan dengan tally manual.

**Kriteria penerimaan:**

- Setiap poin dan titik gesekan bisa diklik sampai ke frame bukti, lokasi di Visual Twin, dan contoh narasi agen.
- **Setiap angka di teks diperiksa secara programatik terhadap keluaran mesin** sebelum ditampilkan; teks yang tidak cocok dibuat ulang atau dibuang.
- Rekomendasi hanya muncul jika didukung hasil ablasi, tidak dibuat dari opini LLM atau dari hasil RAG.
- Peta panas di Visual Twin dihitung dari data titik berhenti agen yang sama dengan funnel, sehingga keduanya selalu konsisten.



### F7. Visual Twin: Video menjadi Peta 3D

Visual Twin adalah representasi 3D dari jalur yang direkam pemilik, dibangun dari video yang sama (sudah diburamkan). Tujuannya **menunjukkan lokasi**, bukan mengukur.

**Tingkat twin yang dipakai:**


| Tingkat                 | Isi                                                                 | Dari video?                               | Dipakai di Sekilas?         |
| ----------------------- | ------------------------------------------------------------------- | ----------------------------------------- | --------------------------- |
| Visual twin             | Tampilan realistis (Gaussian splat atau awan titik/mesh bertekstur) | Ya, otomatis                              | **Ya**                      |
| Geometric twin          | Mesh bersih, skala metrik, bisa diukur                              | Ya, perlu referensi skala dan pembersihan | Tidak (pengembangan lanjut) |
| Semantic twin (BIM/IFC) | Objek terstruktur (dinding, pintu, lantai)                          | Tidak otomatis, semi-manual               | Tidak                       |


**Pipeline (berbasis nerfstudio, lihat bagian 11.1):**

```
Video terburam
  -> Ekstraksi frame (ns-process-data video, target ±150-400 frame, buang frame buram)
  -> Masking objek bergerak (orang, motor, mobil) dengan SAM 2 agar tidak jadi "hantu"
  -> Pose kamera -> transforms.json (intrinsik + pose per frame)
       jalur baseline: COLMAP
       jalur cepat   : VGGT (feed-forward), hasilnya ditulis ke transforms.json yang sama
  -> Model 3D:
       standar : awan titik (ns-export pointcloud)
       opsional: Gaussian Splatting (ns-train splatfacto -> ns-export gaussian-splat)
  -> Penyelarasan: lantai horizontal, arah jalan, skala perkiraan
  -> Penjangkaran kejadian: tiap entri transkrip -> pose kamera di stempel waktunya
  -> Ekspor: file 3D terkompresi + JSON jalur kamera + JSON pin kejadian
```

**Kontrak data:** `transforms.json` menjadi batas antar tahap. Tahap pose bisa diganti (COLMAP ke VGGT, atau sebaliknya) tanpa mengubah tahap berikutnya, selama keluarannya tetap berformat `transforms.json`. Jalur kamera untuk dasbor dan penjangkaran pin juga dibaca dari file ini.

**Unsur yang ditampilkan:**

- **Jalur kunjungan:** garis dari posisi kamera sepanjang video (jalan → pintu/tangga → kasir).
- **Zona:** jalur dibagi menjadi zona yang selaras dengan tahap funnel (misal "Jalan depan", "Pintu/tangga", "Area menu", "Kasir"). Zona dibuat dari checkpoint F2 dan bisa diubah namanya oleh pemilik.
- **Pin kejadian:** satu pin per entri transkrip.
- **Peta panas gesekan:** dari titik berhenti agen (F5), dipetakan ke zona/posisi.

**Tampilan cadangan (wajib ada):**
Jika rekonstruksi gagal atau perangkat terlalu lemah untuk menampilkan 3D:

1. **Denah jalur 2D:** jalur kamera dilihat dari atas, dengan pin dan peta panas (masih memakai pose kamera jika tersedia).
2. **Pita frame:** jika pose kamera juga gagal, zona ditampilkan sebagai deretan snapshot berurutan dengan peta panas per zona.

Semua interaksi silang di dasbor tetap berjalan pada tampilan cadangan.

**Kriteria penerimaan:**

- Visual Twin siap dalam kurang dari 5 menit untuk video 2 menit (paralel dengan transkrip; tidak menghalangi halaman 5).
- Tampil lancar di ponsel kelas menengah (target ≥ 30 fps; file model ≤ 30 MB setelah kompresi, atau dimuat bertahap).
- Setiap pin kejadian berada di posisi kamera yang benar untuk stempel waktunya (diuji manual pada video kalibrasi).
- Tidak ada wajah atau plat terbaca di model 3D (karena dibangun hanya dari frame terburam).
- Jika rekonstruksi gagal, pemilik tidak melihat pesan galat teknis; dasbor langsung memakai tampilan cadangan dengan catatan singkat "Tampilan 3D tidak tersedia untuk video ini".



### F8. Basis Pengetahuan Pendamping (RAG)

Basis pengetahuan dipakai untuk **membantu menjelaskan**, bukan untuk menghitung. Keputusan agen, funnel, dan dampak rekomendasi tetap dari mesin simulasi.

**Isi basis pengetahuan (dikurasi tim):**

- **Katalog isyarat:** definisi tiap kategori isyarat, contoh foto, cara membaca dari video. Dipakai juga oleh F3 untuk mengurangi salah baca.
- **Katalog tindakan:** cara menjalankan tiap jenis perbaikan (misal papan jam buka, daftar harga di depan, penerangan tangga), perkiraan biaya kasar dan lama pengerjaan.
- **Panduan praktik UMKM makanan:** materi singkat tentang tata letak, penanda, dan display menu.
- **Riwayat analisis toko yang sama** (jika ada): transkrip, hasil, dan catatan pengukuran sebelumnya.

**Penggunaan:**


| Tempat              | Fungsi RAG                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| F3 Transkrip        | Memberi definisi kategori isyarat dan contoh ke model bahasa-visi                                                                         |
| F6 Rekomendasi      | Mengisi kartu "cara menjalankan" dan perkiraan biaya untuk rekomendasi yang **sudah lolos ablasi**                                        |
| Panel Tanya Sekilas | Pemilik bertanya bebas ("Papan seperti apa yang cocok untuk tangga sempit?"); jawaban memakai hasil analisis toko ini + basis pengetahuan |


**Aturan:**

- Setiap jawaban RAG menampilkan sumbernya (judul dokumen atau entri katalog).
- Jika tidak ada sumber yang cocok, sistem menjawab "Belum ada panduan untuk ini" dan tidak mengarang.
- RAG tidak boleh menambah rekomendasi baru ke daftar Prioritas atau mengubah angka dampak. Angka di jawaban Tanya Sekilas lewat verifier yang sama dengan F6.
- Jawaban yang merujuk lokasi menampilkan tombol **Lihat di 3D**.

**Kriteria penerimaan:**

- 100% jawaban menampilkan minimal satu sumber, atau pernyataan "belum ada panduan".
- Kartu "cara menjalankan" tersedia untuk semua jenis tindakan di katalog demo (±8 isyarat).

---



## 7. Kebutuhan Non-Fungsional


| Area                 | Kebutuhan                                                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Privasi**          | Wajah dan plat diburamkan di browser sebelum unggah. Video mentah dihapus setelah ekstraksi frame; yang disimpan hanya frame bukti terburam, transkrip, dan model 3D yang dibangun dari frame terburam. Orang dan kendaraan di-masking dari model 3D.            |
| **Kinerja**          | Transkrip siap dalam kurang dari 2 menit untuk video 2 menit; Visual Twin kurang dari 5 menit (paralel); simulasi dan dasbor di bawah 3 menit.                                                                                                                   |
| **Kinerja tampilan** | Dasbor interaktif di ponsel kelas menengah; Visual Twin dimuat bertahap dan bisa beralih ke tampilan cadangan otomatis.                                                                                                                                          |
| **Keterbacaan**      | Mobile-first, bahasa Indonesia, tanpa istilah teknis di layar pemilik (tidak ada kata "point cloud", "splat", "RAG" di UI).                                                                                                                                      |
| **Auditabilitas**    | Seed agen, versi prompt, panggilan LLM, dan dokumen yang diambil RAG tercatat (misal lewat Langfuse). Versi pipeline 3D dan parameter rekonstruksi disimpan bersama model.                                                                                       |
| **Keandalan**        | Jika LLM gagal, edit langsung tetap bisa dipakai; simulasi mesin tidak bergantung LLM untuk keputusan. Jika rekonstruksi 3D gagal, dasbor tetap utuh dengan tampilan cadangan. Jika RAG gagal, kartu "cara menjalankan" disembunyikan, rekomendasi tetap tampil. |
| **Biaya**            | Panggilan LLM dibatasi (narasi 500 agen diproses batch, ringkasan di-cache). Rekonstruksi 3D dijalankan sekali per video di GPU sewaan/serverless, hasil di-cache.                                                                                               |
| **Infrastruktur 3D** | Rekonstruksi butuh GPU NVIDIA (CUDA). Pekerjaan 3D berjalan sebagai antrean terpisah dari API utama.                                                                                                                                                             |
| **Lisensi**          | Hanya komponen berlisensi yang mengizinkan pemakaian komersial yang masuk jalur produksi (lihat 11.1). Komponen non-komersial hanya untuk riset internal.                                                                                                        |


---



## 8. Ruang Lingkup Demo (Batas)

- 1 jenis usaha: tempat makan
- sekitar 8 isyarat
- 500 agen (rentang 200 sampai 500, bisa diturunkan saat demo lambat)
- 6 skenario lingkungan
- Kalibrasi pada 3 sampai 5 video dengan tally manual
- Tanpa generasi video sebelum dan sesudah
- Visual Twin: satu jalur per video, awan titik sebagai standar, Gaussian Splatting opsional
- Basis pengetahuan: katalog isyarat dan katalog tindakan untuk ±8 isyarat, plus 10 sampai 20 dokumen panduan

---



## 9. Metrik Keberhasilan


| Metrik                                                                                        | Target demo                         |
| --------------------------------------------------------------------------------------------- | ----------------------------------- |
| Pemilik menyelesaikan alur dari video sampai dasbor                                           | di bawah 15 menit total             |
| Transkrip yang perlu dikoreksi pemilik                                                        | di bawah 30% entri                  |
| Angka di dasbor yang lolos verifier                                                           | 100% (yang gagal tidak ditampilkan) |
| Uji arah efek lolos (tetangga ramai menurunkan peluang naik; isyarat buka jelas menaikkannya) | semua lolos                         |
| Visual Twin berhasil dibangun (bukan tampilan cadangan)                                       | minimal 4 dari 5 video kalibrasi    |
| Pin kejadian berada di lokasi yang benar (cek manual)                                         | minimal 90% pin                     |
| Pemilik bisa menunjuk lokasi gesekan terbesar di tokonya setelah melihat dasbor               | minimal 4 dari 5 pemilik uji        |
| Pemilik bisa menyebut tindakan pertama yang akan dilakukan setelah melihat dasbor             | minimal 4 dari 5 pemilik uji        |
| Jawaban Tanya Sekilas yang menyertakan sumber                                                 | 100%                                |


---



## 10. Risiko


| Risiko                                                                                                  | Mitigasi                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Agen LLM terlalu rasional dan seragam                                                                   | Keputusan dari model pilihan diskret dengan distribusi sifat; hasil hanya dibaca sebagai hipotesis                                        |
| Model bahasa-visi salah membaca atau mengarang isyarat                                                  | Wajib frame bukti, verifikasi pemilik, opsi "tidak terlihat jelas", definisi isyarat dari katalog RAG                                     |
| Narasi agen tidak konsisten dengan keputusan                                                            | Narasi dibuat setelah keputusan dihitung, dicek terhadap kontribusi faktor                                                                |
| Pemilik malas memverifikasi transkrip                                                                   | Verifikasi dipermudah (Benar/Salah satu klik), hanya yang tidak pasti yang wajib                                                          |
| Video terlalu panjang atau berhenti sembarang                                                           | Checkpoint di layar rekam, batas durasi otomatis                                                                                          |
| 3 sampai 5 video tidak cukup untuk klaim statistik                                                      | Klaim dibatasi pada hipotesis titik gesekan, ditulis jelas di dasbor                                                                      |
| Rekonstruksi 3D gagal (video gelap, kaca, dinding polos, gerak terlalu cepat, hanya berputar di tempat) | Indikator gerak saat rekam, jalur pose kedua (VGGT ↔ COLMAP), tampilan cadangan 2D / pita frame                                           |
| Pose kamera melenceng karena lensa lebar                                                                | Panduan pakai lensa utama, simpan parameter kamera dari metadata jika ada                                                                 |
| Lisensi repo tidak mengizinkan pemakaian komersial                                                      | Daftar lisensi di 11.1 diperiksa sebelum komponen masuk produksi; DUSt3R/MASt3R dan Gaussian Splatting asli (graphdeco) hanya untuk riset |
| Tim terlalu lama mempelajari nerfstudio                                                                 | Pendekatan REA bertahap (11.1): jalankan baseline dulu, ubah satu komponen per percobaan                                                  |
| Model 3D penuh "hantu" dari orang dan kendaraan lewat                                                   | Masking objek bergerak sebelum rekonstruksi                                                                                               |
| Pemilik mengira model 3D akurat ukurannya                                                               | Kalimat tetap di Visual Twin, tidak menampilkan angka jarak                                                                               |
| Visual Twin membuat hasil terlihat lebih pasti dari sebenarnya                                          | Peta panas memakai rentang/intensitas relatif, banner catatan kepercayaan selalu tampil                                                   |
| Model 3D berat di ponsel                                                                                | Kompresi, pemuatan bertahap, batas jumlah titik, fallback otomatis                                                                        |
| RAG mengarang saran atau biaya                                                                          | Wajib sumber, jawaban "belum ada panduan", RAG tidak bisa mengubah daftar Prioritas atau angka                                            |
| Waktu bangun bertambah karena 3D dan RAG                                                                | Prioritas di 5.5: awan titik + lapisan Kejadian/Gesekan dulu, sisanya boleh ditunda                                                       |


---



## 11. Rekomendasi Tech Stack


| Lapisan                              | Pilihan                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Frontend / dasbor                    | Next.js                                                                                                                        |
| Penampil 3D                          | Three.js lewat React Three Fiber; `mkkellogg/GaussianSplats3D` (MIT) untuk Gaussian Splatting                                  |
| Grafik dasbor                        | Recharts atau Visx (funnel, matriks dampak vs usaha)                                                                           |
| Backend simulasi                     | FastAPI (Python)                                                                                                               |
| Video ke transkrip                   | Gemini API (video understanding) atau Claude API (ekstraksi terstruktur dari frame)                                            |
| Blur wajah dan cek kualitas          | MediaPipe di browser                                                                                                           |
| Pipeline 3D (kerangka)               | nerfstudio (Apache-2.0): `ns-process-data`, `ns-train`, `ns-export`                                                            |
| Masking objek bergerak               | SAM 2 (Apache-2.0)                                                                                                             |
| Pose kamera                          | COLMAP (BSD) sebagai baseline; VGGT sebagai jalur cepat (cek lisensi varian model)                                             |
| Gaussian Splatting (opsional)        | splatfacto di nerfstudio, rasterizer gsplat (Apache-2.0), di GPU NVIDIA serverless (misal Modal atau RunPod)                   |
| Pembersihan manual (riset/kalibrasi) | SuperSplat (MIT), CloudCompare, Blender                                                                                        |
| Format 3D                            | `transforms.json` antar tahap; PLY/SPZ terkompresi untuk splat, PLY/GLB terdesimasi untuk awan titik, JSON untuk jalur dan pin |
| Basis pengetahuan (RAG)              | Postgres + pgvector (atau Chroma untuk demo), embedding multibahasa, LLM untuk jawaban bersumber                               |
| Model pilihan diskret                | Python (numpy / statsmodels)                                                                                                   |
| Analisis sensitivitas / ablasi       | SALib                                                                                                                          |
| Interval hasil                       | MAPIE (conformal prediction), jika waktu cukup                                                                                 |
| Observabilitas                       | Langfuse                                                                                                                       |




### 11.1 Visual Twin: Pendekatan Reverse Engineering (REA)

Visual Twin tidak dibangun dari nol. Tim memakai repo open source yang sudah matang, mempelajari alur datanya, lalu mengganti atau memodifikasi komponen yang perlu.

**Repo utama:** `nerfstudio-project/nerfstudio` **(Apache-2.0).** Mencakup ekstraksi frame, pose kamera (COLMAP), training, viewer, dan ekspor. Peta kode yang dibaca sesuai urutan alur data:

```
nerfstudio/
  scripts/process_data.py                       # ns-process-data
  process_data/video_to_nerfstudio_dataset.py   # ekstraksi frame dari video
  process_data/colmap_utils.py                  # wrapper COLMAP, parsing pose
  data/dataparsers/                             # parsing transforms.json
  data/datamanagers/                            # batching ray/gambar
  models/splatfacto.py                          # Gaussian Splatting (pakai gsplat)
  engine/trainer.py                             # loop training
  configs/method_configs.py                     # registry metode dan hyperparameter
  scripts/exporter.py                           # ns-export (pointcloud, gaussian-splat, poisson)
```

**Repo pendukung dan lisensi:**


| Tahap                           | Repo                                        | Lisensi       | Status di Sekilas           |
| ------------------------------- | ------------------------------------------- | ------------- | --------------------------- |
| Pose kamera (SfM)               | `colmap/colmap`                             | BSD           | Produksi (baseline)         |
| Rasterizer splat                | `nerfstudio-project/gsplat`                 | Apache-2.0    | Produksi (opsional)         |
| Rekonstruksi feed-forward       | `facebookresearch/vggt`                     | cek varian    | Produksi jika lisensi lolos |
| Segmentasi / masking            | `facebookresearch/sam2`                     | Apache-2.0    | Produksi                    |
| Viewer web                      | `mkkellogg/GaussianSplats3D`                | MIT           | Produksi                    |
| Editor splat                    | `playcanvas/supersplat`                     | MIT           | Alat internal               |
| Rekonstruksi feed-forward       | `naver/dust3r`, `naver/mast3r`              | non-komersial | Riset saja                  |
| Gaussian Splatting asli         | `graphdeco-inria/gaussian-splatting`        | non-komersial | Riset saja                  |
| SLAM real-time                  | `rmurai0610/MASt3R-SLAM`, `muskie82/MonoGS` | cek           | Riset saja                  |
| Splatting C++ yang mudah dibaca | `pierotofy/OpenSplat`                       | AGPL          | Bahan belajar saja          |


Setiap lisensi wajib dicek ulang sebelum komponen masuk produksi.

**Pipeline baseline (titik awal REA):**

```bash
#!/usr/bin/env bash
set -euo pipefail

video="${1:?usage: $0 <video.mp4> <project_name>}"
name="${2:?usage: $0 <video.mp4> <project_name>}"

ns-process-data video \
  --data "$video" \
  --output-dir "data/$name" \
  --num-frames-target 300

ns-train splatfacto \
  --data "data/$name" \
  --output-dir outputs \
  --experiment-name "$name" \
  --viewer.quit-on-train-completion True

config=$(ls -t outputs/"$name"/splatfacto/*/config.yml | head -n 1)

ns-export gaussian-splat --load-config "$config" --output-dir "exports/$name"
ns-export pointcloud     --load-config "$config" --output-dir "exports/$name"
```

**Langkah REA:**

1. Jalankan baseline pada klip pendek (30 sampai 60 detik) dari video kalibrasi, periksa isi `data/`, `outputs/`, `exports/` per tahap.
2. Pasang breakpoint di `train.py` dan `splatfacto.py` untuk melihat tensor dan loss.
3. Baca `gsplat` terpisah untuk memahami rasterizer (proyeksi, pengurutan tile, alpha blending), sebagai bekal optimasi tampilan di ponsel.
4. Ubah satu komponen per percobaan dan bandingkan hasil. Urutan yang direncanakan:
  - mask SAM 2 untuk orang/kendaraan sebelum training,
  - ganti tahap pose COLMAP dengan VGGT (cukup menghasilkan `transforms.json` yang sama),
  - kurangi jumlah frame dan iterasi sampai waktu bangun masuk target F7.
5. Bungkus hasil akhirnya sebagai satu pekerjaan antrean di backend: masukan video terburam, keluaran file 3D + JSON jalur + JSON pin.

**Batasan yang diketahui:**

- Tidak ada repo yang mengubah video menjadi BIM/IFC secara otomatis. Semantic twin tidak masuk lingkup.
- Skala metrik butuh referensi (misal lebar pintu diukur manual lalu model diskalakan). Tidak dipakai untuk demo.
- Dinding polos dan kaca menghasilkan lubang di model; diterima, ditutup dengan tampilan cadangan jika terlalu parah.

---



## 12. Milestone Pembangunan

- [ ] **M1:** Form konteks usaha + upload menu, tersimpan lokal
- [ ] **M2:** Rekam/unggah video dengan checkpoint, cek kualitas, blur wajah di browser, indikator "terlalu cepat"
- [ ] **M3:** Video menjadi transkrip kejadian berbukti frame
- [ ] **M4:** Layar verifikasi: sinkron video-transkrip, edit langsung, konfirmasi isyarat tidak pasti
- [ ] **M5:** Edit via LLM dengan tampilan sebelum/sesudah dan tombol Terima
- [ ] **M6:** Model pilihan diskret + populasi agen + skenario (tanpa narasi dulu), termasuk titik berhenti per agen
- [ ] **M7:** Narasi, keputusan, dan alasan per agen
- [ ] **M8a:** REA spike: jalankan baseline nerfstudio pada 1 video kalibrasi, petakan keluaran tiap tahap, catat waktu dan kebutuhan GPU
- [ ] **M8b:** Visual Twin dasar: masking SAM 2, pose kamera ke `transforms.json`, awan titik, jalur, zona, penjangkaran pin kejadian, dibungkus sebagai pekerjaan antrean
- [ ] **M9:** Dasbor Analitik: tata letak, KPI, 3 poin, funnel, ablasi, rekomendasi Pareto dengan cut-off, verifier angka
- [ ] **M10:** Integrasi dasbor dengan Visual Twin: lapisan Kejadian dan Gesekan, interaksi silang, pemilih skenario, tampilan cadangan
- [ ] **M11:** Basis pengetahuan RAG: katalog isyarat dan tindakan, kartu "cara menjalankan", Panel Tanya Sekilas
- [ ] **M12:** Peluang/ancaman, catatan kepercayaan, rencana pengukuran (dengan tangkapan Visual Twin)
- [ ] **M13 (opsional):** Gaussian Splatting, lapisan Agen beranimasi, jalur agen di Jelajah Agen, peta mini di halaman 5
- [ ] **M14:** Kalibrasi dengan 3 sampai 5 video, uji arah efek, dan uji ketepatan pin di Visual Twin

---



## 13. Pertanyaan Terbuka

1. Narasi 500 agen ditampilkan semua (bisa dicari dan difilter) atau hanya dikelompokkan menjadi beberapa tipe cerita? Usul: ditampilkan sebagai kelompok, dengan akses ke contoh per kelompok.
2. Batas potong Pareto memakai 80% kumulatif dampak, atau jumlah tetap (misal 3 teratas)? Usul: 80% kumulatif, dengan maksimum 5 item.
3. Apakah skala usaha ("dampak" dan "usaha") dinilai otomatis oleh sistem atau dikoreksi pemilik? Usul: otomatis sebagai tebakan awal, boleh diubah pemilik.
4. Seberapa kasar perkiraan biaya yang aman ditampilkan tanpa terkesan klaim pasti?
5. Gaussian Splatting atau cukup awan titik untuk demo? Usul: awan titik + jalur sebagai standar, splat hanya jika M1 sampai M12 selesai.
6. Apakah zona di Visual Twin dibuat otomatis dari checkpoint, atau pemilik menandai sendiri? Usul: otomatis dari checkpoint, nama zona bisa diubah.
7. Rekonstruksi 3D dijalankan di GPU serverless atau server sendiri, dan spesifikasi GPU apa? Perlu cek biaya per video dan waktu cold start (diukur di M8a).
8. VGGT lolos lisensi untuk pemakaian komersial? Jika tidak, jalur produksi tetap COLMAP.
9. Apakah fitur geometris dari Visual Twin (jarak pandang papan, jumlah anak tangga, lebar pintu) nanti dijadikan isyarat simulasi? Usul: tidak untuk demo; dicatat sebagai pengembangan lanjut setelah kalibrasi.
10. Siapa yang mengkurasi isi basis pengetahuan RAG, dan seberapa sering diperbarui?

