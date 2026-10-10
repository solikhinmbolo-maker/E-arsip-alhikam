# E-ARSIP AL-HICAM - Digital Arsip SMP Al-Hikam

Aplikasi Sistem Informasi Manajemen E-Arsip Digital resmi SMP Al-Hikam berbasis React 19, TypeScript, Tailwind CSS, Chart.js, dan Capacitor Android.

## Status Sistem & Kunci Stabilitas (Locked Baseline)

Semua modul tampilan (Desktop & Mobile) serta fungsi inti telah dikunci dan diverifikasi 100% stabil:
- **Zero Build & Lint Errors**: TypeScript compilation & strict type safety aktif.
- **Responsif Desktop & Mobile**: Layout adaptif terisolasi (Desktop 2-kolom sejajar, Mobile segmented tabs anti-jolt).
- **Animasi Grafik Halus & Anti-Macet**:
  - Donut Chart & Bar Chart menggunakan explicit property animators (`from: 0`, durasi 2,6s, `easeOutQuart`).
  - Dilengkapi *Intersection Observer* sehingga animasi hanya berputar saat masuk bidang pandang (viewport) layar pengguna.
- **Android Immersive Fullscreen**: Mendukung `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` menembus punch hole / takik kamera depan tanpa garis hitam.
- **GitHub Actions Build Pipeline**: `.github/workflows/build-apk.yml` dengan Node.js 22 & JDK 21 untuk build APK otomatis tanpa error.

---

## Fitur Utama yang Terkunci & Aktif

1. **Dashboard Executive**:
   - Jam digital realtime WIB (terisolasi tanpa re-render berlebihan).
   - Executive Hero Insight (Status storage, ringkasan arsip, persentase kategori).
   - 4 Kartu KPI Metric (Total Arsip, Arsip Siswa, Arsip Guru, Lainnya).
   - Visualisasi Grafik Interaktif:
     - Donut Chart: Distribusi Kategori Dokumen (Mekar & berputar 360° dari nol).
     - Bar Chart: Distribusi Siswa per Angkatan (Ombak bertahap dari kiri ke kanan).
2. **Modul Upload Dokumen**:
   - Mode Individual & Kolektif.
   - Drag & Drop Dropzone (PDF, Word DOCX, Gambar JPEG/PNG).
   - Auto-detect Nama Siswa (Master Siswa) & Guru (Master Guru) serta auto-fill NISN/NUPTK.
   - Progress bar, status preview, dan konfirmasi sukses.
3. **Modul Unduh Dokumen**:
   - Filter bertingkat (Tahun Ajaran, Kategori Utama, Subkategori).
   - Smart Instant Search pencarian nama & berkas.
   - Dark Mode Preview Modal untuk PDF & Gambar.
   - Tombol Cetak Dokumen & Unduh Berkas Langsung.
4. **Matriks Buku Induk / Rekap Kelengkapan**:
   - Pemantauan status kelengkapan berkas siswa (8 kategori) dan guru (14 kategori SK).
   - Indikator status visual terverifikasi (`✓` hijau dan badge merah).
5. **Statistik & Laporan**:
   - Filter riwayat arsip per periode dan kategori.
   - Export Data ke format CSV / Excel.
   - Cetak laporan PDF resmi sekolah.
6. **Manajemen Sampah & Audit Log**:
   - Pemulihan berkas terhapus (Restore) dan Hapus Permanen.
   - Log aktivitas histori sistem.

---

## Prinsip Penambahan Fitur Baru (Regression Protection Rules)

Untuk memastikan fitur yang sudah berjalan tidak berubah atau rusak saat ada penambahan fitur di kemudian hari:

1. **Modularitas Komponen**:
   - Setiap fitur baru harus ditambahkan dalam komponen terpisah di `src/components/` atau sebagai modul mandiri.
   - Hindari mengubah struktur kontrak data `ArsipItem` yang sudah digunakan oleh Dashboard, Unduh, dan Laporan.
2. **Isolasi State & Event**:
   - Komunikasi antar modul menggunakan custom event `earsip:cloud-synced` atau props reaktif tanpa memicu unmount paksa pada modul yang sedang aktif.
3. **Konservasi UI Mobile & Desktop**:
   - Pertahankan breakpoint Tailwind `sm:` dan `block sm:hidden` / `hidden sm:block` agar tata letak mobile tetap ringkas dan tidak memengaruhi tata letak desktop.
4. **Proteksi Build**:
   - Selalu jalankan `npm run lint` dan `npm run build` sebelum merilis perubahan baru ke repositori GitHub.
