# E-ARSIP AL-HICAM - Digital Arsip SMP Al-Hikam

Aplikasi Sistem Informasi Manajemen E-Arsip Digital resmi SMP Al-Hikam berbasis React, TypeScript, Tailwind CSS, dan Chart.js.

## Fitur Utama

- **Dashboard Executive**:
  - Live clock (WIB)
  - Hero Insight Card (Upload hari ini, Kategori terbesar %, Storage Drive, Arsip terbaru)
  - 4 Kartu KPI (Total Arsip, Siswa, Guru, Lainnya)
  - Visualisasi Grafik (Donut Chart Kategori & Bar Chart Siswa per Angkatan)
- **Modul Upload Dokumen**:
  - Mode Individual & Kolektif
  - Dropzone drag & drop (PDF, Word, Gambar)
  - Otomatis deteksi Siswa (MasterSiswa) & Guru (Master_Guru) beserta auto-fill NISN/NUPTK
  - Animasi progress bar & notifikasi berhasil
- **Modul Unduh Dokumen**:
  - Filter bertingkat (Tahun & Kategori)
  - Smart Search pencarian instan
  - Preview dokumen (Dark Mode Modal)
  - Cetak dokumen langsung
  - Direct download berkas
- **Matriks Rekap Kelengkapan**:
  - Pemantauan status kelengkapan berkas siswa (8 kategori) dan guru (14 kategori)
  - Indikator status `✅` dan `❌`
  - Pencarian nama instan
- **Statistik & Laporan**:
  - Filter riwayat pengarsipan
  - Export CSV / Excel
  - Cetak laporan PDF

## Menjalankan Proyek Secara Lokal

```bash
# 1. Install dependensi
npm install

# 2. Jalankan server dev
npm run dev

# 3. Build untuk produksi
npm run build
```

## Struktur Database & Penyimpanan

- **Google Spreadsheet Database**: `1ew4gfR53zeBdAcf57wWNdOmE9NiZjsvZikXgSxNHwEQ`
- **Google Drive Root Folder**: `1M_Ry_o-q7JGeXRfYdlpE8E2AuF_aOE8f`
