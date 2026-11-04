import React, { useState, useMemo, useEffect, useTransition } from 'react';
import { 
  Search, 
  ChevronDown, 
  X, 
  Check, 
  Printer, 
  Copy, 
  Eye, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  ArsipItem, 
  getStoredArsip, 
  getSanitizedMasterData, 
  getActiveKategoriSiswa, 
  getActiveKategoriGuru, 
  getActiveKategoriLainnya 
} from '../data/mockDatabase';

interface RekapDokumenProps {
  onPreview?: (item: ArsipItem) => void;
  onNavigateToUpload?: (kategori: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya', nama: string) => void;
}

// Ultra-fast inline SVG icons (renders in <0.001ms instead of heavy React Lucide wrappers)
function IconCheck() {
  return (
    <svg className="w-5 h-5 text-emerald-600 inline-block pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCross() {
  return (
    <svg className="w-5 h-5 text-rose-500 inline-block opacity-90 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function RekapDokumen({ onPreview, onNavigateToUpload }: RekapDokumenProps) {
  // State matching image exact UI
  const [targetKelompok, setTargetKelompok] = useState<'Siswa' | 'Guru' | 'Lainnya'>('Siswa');
  const [selectedTahun, setSelectedTahun] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30); // 30 per page for blazing fast 0ms renders

  // Auto sync listeners
  useEffect(() => {
    const handleUpdate = () => setDataVersion(v => v + 1);
    window.addEventListener('earsip:cloud-synced', handleUpdate);
    window.addEventListener('earsip:categories-updated', handleUpdate);
    return () => {
      window.removeEventListener('earsip:cloud-synced', handleUpdate);
      window.removeEventListener('earsip:categories-updated', handleUpdate);
    };
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [targetKelompok, selectedTahun, searchQuery, pageSize]);

  // Master data and Archives (cached per version)
  const masterData = useMemo(() => getSanitizedMasterData(), [dataVersion]);
  const arsipList = useMemo(() => getStoredArsip(), [dataVersion]);

  // Categories directly synchronized with real master category configs and real uploaded archives
  const kategoriSiswaList = useMemo(() => {
    const list = [...getActiveKategoriSiswa()];
    const seen = new Set(list.map(k => k.trim().toLowerCase()));
    arsipList.forEach(item => {
      if (item.kategoriUtama === 'Arsip Siswa' && item.kategori && item.kategori.trim() && !item.isTrash) {
        const catTrim = item.kategori.trim();
        if (!seen.has(catTrim.toLowerCase())) {
          seen.add(catTrim.toLowerCase());
          list.push(catTrim);
        }
      }
    });
    return list;
  }, [dataVersion, arsipList]);

  const kategoriGuruList = useMemo(() => {
    const list = [...getActiveKategoriGuru()];
    const seen = new Set(list.map(k => k.trim().toLowerCase()));
    arsipList.forEach(item => {
      if (item.kategoriUtama === 'Arsip Guru' && item.kategori && item.kategori.trim() && !item.isTrash) {
        const catTrim = item.kategori.trim();
        if (!seen.has(catTrim.toLowerCase())) {
          seen.add(catTrim.toLowerCase());
          list.push(catTrim);
        }
      }
    });
    return list;
  }, [dataVersion, arsipList]);

  // Available graduation years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    masterData.siswa.forEach(s => {
      const t = (s.tahun || '').trim();
      if (t) years.add(t);
    });
    arsipList.forEach(a => {
      if (a.kategoriUtama === 'Arsip Siswa' && a.tahun && !a.isTrash) {
        years.add(a.tahun.trim());
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [masterData.siswa, arsipList]);

  // Pre-indexed map for O(1) matching by Subjek (Nama) or Identitas (NISN / NUPTK)
  const arsipMapSiswa = useMemo(() => {
    const map = new Map<string, Map<string, ArsipItem>>();
    const addToMap = (key: string, katKey: string, item: ArsipItem) => {
      if (!key || key === '-') return;
      if (!map.has(key)) map.set(key, new Map());
      map.get(key)!.set(katKey, item);
    };

    arsipList.forEach(item => {
      if (item.kategoriUtama !== 'Arsip Siswa' || item.isTrash) return;
      const subjekKey = (item.subjek || '').trim().toLowerCase();
      const identitasKey = (item.identitas || '').trim().toLowerCase();
      const katKey = (item.kategori || '').trim().toLowerCase();
      if (!katKey) return;

      if (subjekKey) addToMap(subjekKey, katKey, item);
      if (identitasKey && identitasKey !== subjekKey) addToMap(identitasKey, katKey, item);
    });
    return map;
  }, [arsipList]);

  const arsipMapGuru = useMemo(() => {
    const map = new Map<string, Map<string, ArsipItem>>();
    const addToMap = (key: string, katKey: string, item: ArsipItem) => {
      if (!key || key === '-') return;
      if (!map.has(key)) map.set(key, new Map());
      map.get(key)!.set(katKey, item);
    };

    arsipList.forEach(item => {
      if (item.kategoriUtama !== 'Arsip Guru' || item.isTrash) return;
      const subjekKey = (item.subjek || '').trim().toLowerCase();
      const identitasKey = (item.identitas || '').trim().toLowerCase();
      const katKey = (item.kategori || '').trim().toLowerCase();
      if (!katKey) return;

      if (subjekKey) addToMap(subjekKey, katKey, item);
      if (identitasKey && identitasKey !== subjekKey) addToMap(identitasKey, katKey, item);
    });
    return map;
  }, [arsipList]);

  // 1. FAST FILTERING: Filter students FIRST to avoid unnecessary category loops
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const categories = kategoriSiswaList;

    const matchedSiswa = masterData.siswa.filter(s => {
      if (selectedTahun !== 'SEMUA') {
        const rowYear = (s.tahun || '').toString().trim();
        if (rowYear !== selectedTahun) return false;
      }
      if (q) {
        const matchNama = (s.nama || '').toLowerCase().includes(q);
        const matchNisn = (s.nisn || '').toLowerCase().includes(q);
        if (!matchNama && !matchNisn) return false;
      }
      return true;
    });

    return matchedSiswa.map(siswa => {
      const nameKey = (siswa.nama || '').trim().toLowerCase();
      const nisnKey = (siswa.nisn || '').trim().toLowerCase();
      const uploadedMapName = arsipMapSiswa.get(nameKey);
      const uploadedMapNisn = nisnKey && nisnKey !== '-' ? arsipMapSiswa.get(nisnKey) : null;

      const statusPerCategory = categories.map(cat => {
        const catKey = cat.trim().toLowerCase();
        const found = uploadedMapName?.get(catKey) || uploadedMapNisn?.get(catKey) || null;
        return {
          categoryName: cat,
          isUploaded: !!found,
          arsipItem: found
        };
      });

      const uploadedCount = statusPerCategory.filter(s => s.isUploaded).length;

      return {
        id: siswa.id,
        nama: siswa.nama,
        tahun: siswa.tahun || '-',
        nisn: siswa.nisn || '-',
        statusPerCategory,
        uploadedCount,
        totalCount: categories.length,
        isComplete: uploadedCount === categories.length && categories.length > 0
      };
    });
  }, [masterData.siswa, selectedTahun, searchQuery, arsipMapSiswa, kategoriSiswaList]);

  // 2. FAST FILTERING: Filter teachers FIRST
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const categories = kategoriGuruList;

    const matchedGuru = masterData.guru.filter(g => {
      if (q) {
        const matchNama = (g.nama || '').toLowerCase().includes(q);
        const matchNuptk = (g.nuptk || '').toLowerCase().includes(q);
        const matchJabatan = (g.jabatan || '').toLowerCase().includes(q);
        if (!matchNama && !matchNuptk && !matchJabatan) return false;
      }
      return true;
    });

    return matchedGuru.map(guru => {
      const nameKey = (guru.nama || '').trim().toLowerCase();
      const nuptkKey = (guru.nuptk || '').trim().toLowerCase();
      const uploadedMapName = arsipMapGuru.get(nameKey);
      const uploadedMapNuptk = nuptkKey && nuptkKey !== '-' ? arsipMapGuru.get(nuptkKey) : null;

      const statusPerCategory = categories.map(cat => {
        const catKey = cat.trim().toLowerCase();
        const found = uploadedMapName?.get(catKey) || uploadedMapNuptk?.get(catKey) || null;
        return {
          categoryName: cat,
          isUploaded: !!found,
          arsipItem: found
        };
      });

      const uploadedCount = statusPerCategory.filter(s => s.isUploaded).length;

      return {
        id: guru.id,
        nama: guru.nama,
        nuptk: guru.nuptk || '-',
        jabatan: guru.jabatan || 'Guru Pengajar',
        statusPerCategory,
        uploadedCount,
        totalCount: categories.length,
        isComplete: uploadedCount === categories.length && categories.length > 0
      };
    });
  }, [masterData.guru, searchQuery, arsipMapGuru, kategoriGuruList]);

  // Filtered lainnya
  const filteredLainnya = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return arsipList.filter(a => {
      if (a.kategoriUtama !== 'Arsip Lainnya' || a.isTrash) return false;
      if (q) {
        const matchSubjek = (a.subjek || '').toLowerCase().includes(q);
        const matchKat = (a.kategori || '').toLowerCase().includes(q);
        const matchTahun = (a.tahun || '').toLowerCase().includes(q);
        if (!matchSubjek && !matchKat && !matchTahun) return false;
      }
      return true;
    });
  }, [arsipList, searchQuery]);

  // Paged slice to ensure instant 0ms DOM painting
  const totalItems = targetKelompok === 'Siswa' 
    ? filteredStudents.length 
    : targetKelompok === 'Guru' 
    ? filteredTeachers.length 
    : filteredLainnya.length;

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    if (pageSize <= 0) return filteredStudents;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, safeCurrentPage, pageSize]);

  const paginatedTeachers = useMemo(() => {
    if (pageSize <= 0) return filteredTeachers;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, safeCurrentPage, pageSize]);

  const paginatedLainnya = useMemo(() => {
    if (pageSize <= 0) return filteredLainnya;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredLainnya.slice(start, start + pageSize);
  }, [filteredLainnya, safeCurrentPage, pageSize]);

  // Helper copy summary
  const handleCopySummary = () => {
    let text = `*REKAPITULASI KELENGKAPAN DOKUMEN (${targetKelompok.toUpperCase()})*\n`;
    if (targetKelompok === 'Siswa') {
      text += `Tahun: ${selectedTahun === 'SEMUA' ? 'Semua Angkatan' : selectedTahun}\n`;
      text += `Total Siswa: ${filteredStudents.length}\n\n`;
      filteredStudents.forEach((s, idx) => {
        const missing = s.statusPerCategory.filter(sc => !sc.isUploaded).map(sc => sc.categoryName);
        text += `${idx + 1}. ${s.nama} (${s.tahun}): ${missing.length === 0 ? 'LENGKAP (✓)' : `Belum: ${missing.join(', ')} (✗)`}\n`;
      });
    } else if (targetKelompok === 'Guru') {
      text += `Total Guru: ${filteredTeachers.length}\n\n`;
      filteredTeachers.forEach((g, idx) => {
        const missing = g.statusPerCategory.filter(gc => !gc.isUploaded).map(gc => gc.categoryName);
        text += `${idx + 1}. ${g.nama}: ${missing.length === 0 ? 'LENGKAP (✓)' : `Belum: ${missing.join(', ')} (✗)`}\n`;
      });
    }
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  return (
    <div className="w-full max-w-full space-y-6 pb-20">
      {/* Outer White Card Container matching Image Exactly */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        
        {/* Title Header matching Image */}
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Matriks Rekap Kelengkapan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau status kelengkapan dokumen yang sudah dan belum diunggah.
          </p>
        </div>

        {/* Filter Controls Card matching Image */}
        <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            
            {/* Filter Target Kelompok */}
            <div className="lg:col-span-6 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Filter Target Kelompok
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {/* Select Kelompok (Siswa / Guru / Lainnya) */}
                <div className="relative flex-1 min-w-[140px]">
                  <select
                    value={targetKelompok}
                    onChange={(e) => {
                      setTargetKelompok(e.target.value as any);
                    }}
                    className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Siswa">Siswa</option>
                    <option value="Guru">Guru & PTK</option>
                    <option value="Lainnya">Dokumen Lainnya</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Filter Tahun Angkatan (Khusus Siswa) */}
                {targetKelompok === 'Siswa' && (
                  <div className="relative flex-1 min-w-[140px]">
                    <select
                      value={selectedTahun}
                      onChange={(e) => setSelectedTahun(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                      title="Filter Tahun Angkatan Siswa"
                    >
                      <option value="SEMUA">Semua Tahun</option>
                      {availableYears.map(yr => (
                        <option key={yr} value={yr}>
                          Tahun {yr}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}

                {/* Tombol "Tampilkan Matriks" exactly as in screenshot */}
                <button
                  type="button"
                  onClick={() => {
                    setDataVersion(v => v + 1);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  Tampilkan Matriks
                </button>
              </div>
            </div>

            {/* Cari Nama Siswa/Guru */}
            <div className="lg:col-span-6 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {targetKelompok === 'Siswa' ? 'Cari Nama Siswa' : targetKelompok === 'Guru' ? 'Cari Nama Guru' : 'Cari Dokumen'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama di sini..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Quick Bar: Total Count, Pagination Option & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-200/60 text-xs text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Total Data: <strong className="text-slate-900 font-bold">{totalItems}</strong> {targetKelompok}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                Tanda: <span className="font-bold text-rose-500">✖ (Belum Diunggah)</span> / <span className="font-bold text-emerald-600">✔ (Sudah Diunggah)</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-slate-400 text-[11px]">Tampil:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value={30}>30 per hal</option>
                  <option value={50}>50 per hal</option>
                  <option value={100}>100 per hal</option>
                  <option value={0}>Semua Data</option>
                </select>
              </div>

              <button
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all cursor-pointer shadow-xs"
                title="Salin rekap ringkasan teks"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>{copiedNotice ? 'Tersalin!' : 'Salin Rekap'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all cursor-pointer shadow-xs"
                title="Cetak tabel matriks"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MATRIKS TABLE VIEW (EXACTLY AS IN SCREENSHOT - HIGH PERFORMANCE) */}
        {/* ============================================================== */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="w-full overflow-x-auto">

            {/* 1. SISWA TABLE */}
            {targetKelompok === 'Siswa' && (
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#FAFBFD]">
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider w-12">
                      NO
                    </th>
                    <th className="py-4 px-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider min-w-[200px]">
                      NAMA SISWA
                    </th>
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider min-w-[90px]">
                      TAHUN LULUS
                    </th>
                    {kategoriSiswaList.map((kat, kIdx) => (
                      <th 
                        key={kIdx} 
                        className="py-4 px-2 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider max-w-[110px]"
                      >
                        <div className="leading-tight break-words">
                          {kat}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={3 + kategoriSiswaList.length} className="py-12 text-center text-slate-400">
                        Tidak ada data siswa ditemukan untuk kriteria pencarian ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((siswa, idx) => {
                      const absoluteIndex = pageSize > 0 ? (safeCurrentPage - 1) * pageSize + idx + 1 : idx + 1;
                      return (
                        <tr 
                          key={siswa.id || idx}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* NO */}
                          <td className="py-4 px-3 text-center font-semibold text-slate-600">
                            {absoluteIndex}
                          </td>

                          {/* NAMA SISWA */}
                          <td className="py-4 px-4 text-left font-bold text-slate-800 tracking-tight">
                            {siswa.nama}
                          </td>

                          {/* TAHUN LULUS */}
                          <td className="py-4 px-3 text-center font-medium text-slate-600">
                            {siswa.tahun}
                          </td>

                          {/* STATUS TIAP KATEGORI */}
                          {siswa.statusPerCategory.map((sc, sIdx) => (
                            <td key={sIdx} className="py-4 px-2 text-center align-middle">
                              {sc.isUploaded && sc.arsipItem ? (
                                <button
                                  type="button"
                                  onClick={() => onPreview && onPreview(sc.arsipItem!)}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-transform active:scale-95 cursor-pointer"
                                  title={`Sudah diunggah: ${sc.categoryName} (${sc.arsipItem.namaFileAsli}). Klik untuk melihat.`}
                                >
                                  <IconCheck />
                                </button>
                              ) : (
                                <span 
                                  className="inline-flex items-center justify-center w-7 h-7 text-rose-500"
                                  title={`Belum diunggah: ${sc.categoryName}`}
                                >
                                  <IconCross />
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 2. GURU TABLE */}
            {targetKelompok === 'Guru' && (
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#FAFBFD]">
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider w-12">
                      NO
                    </th>
                    <th className="py-4 px-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider min-w-[200px]">
                      NAMA GURU
                    </th>
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider min-w-[130px]">
                      JABATAN / NUPTK
                    </th>
                    {kategoriGuruList.map((kat, kIdx) => (
                      <th 
                        key={kIdx} 
                        className="py-4 px-2 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider max-w-[120px]"
                      >
                        <div className="leading-tight break-words">
                          {kat}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={3 + kategoriGuruList.length} className="py-12 text-center text-slate-400">
                        Tidak ada data guru ditemukan untuk kriteria pencarian ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedTeachers.map((guru, idx) => {
                      const absoluteIndex = pageSize > 0 ? (safeCurrentPage - 1) * pageSize + idx + 1 : idx + 1;
                      return (
                        <tr 
                          key={guru.id || idx}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-4 px-3 text-center font-semibold text-slate-600">
                            {absoluteIndex}
                          </td>
                          <td className="py-4 px-4 text-left font-bold text-slate-800 tracking-tight">
                            {guru.nama}
                          </td>
                          <td className="py-4 px-3 text-center font-medium text-slate-600 text-xs">
                            {guru.jabatan}
                            {guru.nuptk && guru.nuptk !== '-' && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{guru.nuptk}</div>
                            )}
                          </td>
                          {guru.statusPerCategory.map((gc, gIdx) => (
                            <td key={gIdx} className="py-4 px-2 text-center align-middle">
                              {gc.isUploaded && gc.arsipItem ? (
                                <button
                                  type="button"
                                  onClick={() => onPreview && onPreview(gc.arsipItem!)}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-transform active:scale-95 cursor-pointer"
                                  title={`Sudah diunggah: ${gc.categoryName}. Klik untuk melihat.`}
                                >
                                  <IconCheck />
                                </button>
                              ) : (
                                <span 
                                  className="inline-flex items-center justify-center w-7 h-7 text-rose-500"
                                  title={`Belum diunggah: ${gc.categoryName}`}
                                >
                                  <IconCross />
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 3. LAINNYA TABLE */}
            {targetKelompok === 'Lainnya' && (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#FAFBFD]">
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider w-12">
                      NO
                    </th>
                    <th className="py-4 px-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      SUBJEK / NAMA BERKAS
                    </th>
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      KATEGORI
                    </th>
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      TAHUN
                    </th>
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="py-4 px-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      AKSI
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedLainnya.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Tidak ada arsip dokumen lainnya tersimpan.
                      </td>
                    </tr>
                  ) : (
                    paginatedLainnya.map((item, idx) => {
                      const absoluteIndex = pageSize > 0 ? (safeCurrentPage - 1) * pageSize + idx + 1 : idx + 1;
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-3 text-center font-semibold text-slate-600">
                            {absoluteIndex}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-800">
                            {item.subjek || item.identitas}
                            <div className="text-xs font-normal text-slate-500 mt-0.5">{item.namaFileAsli}</div>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs">
                              {item.kategori}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-center font-medium text-slate-600">
                            {item.tahun || '-'}
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Terunggah
                            </span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            {onPreview && (
                              <button
                                onClick={() => onPreview(item)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Buka
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

          </div>

          {/* Pagination Navigation Bar */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#FAFBFD] border-t border-slate-200 text-xs text-slate-600">
              <div>
                Menampilkan halaman <strong className="text-slate-800">{safeCurrentPage}</strong> dari <strong className="text-slate-800">{totalPages}</strong> (Total {totalItems} data)
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (safeCurrentPage <= 3) {
                    pageNum = i + 1;
                  } else if (safeCurrentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = safeCurrentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        safeCurrentPage === pageNum 
                          ? 'bg-blue-600 text-white' 
                          : 'border border-slate-200 hover:bg-white text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
